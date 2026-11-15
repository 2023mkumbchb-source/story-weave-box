import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { groqJson, groqModel } from "./groq.ts";
import { geminiReviewModel, reviewWithGemini, type ReviewResult } from "./gemini-review.ts";
import { isReviewApproved, TOPIC_SECTIONS, validateTopicPage, type TopicPage, type TopicSectionName } from "./topic-schema.ts";

const GENERATOR_PROMPT = `You are a careful clinical medical educator writing for Kenyan MBChB students.
Return ONLY JSON with shape {"title":"...","sections":{SECTION:{"applicable":true,"content":"...","confidence":"high|medium|low"}}}.
Include every required section: definition, classification, causes_risk_factors, presentation, investigations, red_flags_complications, management, follow_up_prevention, differentials, pitfalls, examiner_questions, common_questions, epidemiology, references.
Each section must be {"applicable":boolean,"content":string,"confidence":"high"|"medium"|"low"}.
For examiner_questions and common_questions, content must contain each question followed by its complete, visible answer. Do not output unanswered headings.
Never invent classifications, staging systems, doses, statistics or guideline recommendations. If no standard classification exists, return applicable:false.
Cite the guideline body for management (e.g. RCOG, WHO, NICE, Kenya MoH) in references. If unsure, omit the claim.
Distinguish established facts from uncertainty. Do not fabricate references. Use British English.
For umbilical cord prolapse, classification must be applicable:false unless a recognised formal classification is verifiably established. In management, NEVER advise pushing, replacing or attempting to return the prolapsed cord into the uterus. Minimise cord handling and follow emergency obstetric guidance.
Do not invent practice questions to fill space. Return a valid JSON object only.`;

const FIX_PROMPT = `You are correcting a clinical education page. Change ONLY the named affected sections. Do not rewrite unaffected sections. Apply each finding conservatively; omit claims that cannot be verified. Never invent classifications, doses, statistics or guideline recommendations. If a section has no standard classification, mark applicable:false with empty content. Return ONLY JSON object {"sections":{...}} using the required section object schema.`;

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export type PipelineResult = {
  page: TopicPage;
  review: ReviewResult | null;
  status: "ai_checked" | "needs_review";
  loopCount: number;
  attempts: Array<{ page: TopicPage; review: ReviewResult | null; reason: string }>;
};

function parseJson(raw: string): any {
  const clean = raw.trim().replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\`\`\`$/, "");
  return JSON.parse(clean);
}

function sectionPatch(page: TopicPage, review: ReviewResult, missing: string[]): Record<string, any> {
  const affected = new Set<string>([
    ...missing,
    ...review.findings.map((finding) => finding.section).filter((section) => TOPIC_SECTIONS.includes(section as any)),
  ]);
  const sections: Record<string, any> = {};
  for (const name of affected) sections[name] = page.sections[name as TopicSectionName];
  return sections;
}

export async function generateAndReviewTopic(topic: string, context = "", maxLoops = 2): Promise<PipelineResult> {
  const generation = await groqJson([
    { role: "system", content: GENERATOR_PROMPT },
    { role: "user", content: `Topic: ${topic}\n\nSource notes/context (treat as supplied context, not proof):\n${context.slice(0, 28000)}` },
  ]);
  let page: TopicPage;
  try {
    const parsed = parseJson(generation);
    page = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? {
          ...parsed,
          title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title : topic,
          sections: parsed.sections && typeof parsed.sections === "object" && !Array.isArray(parsed.sections) ? parsed.sections : {},
        } as TopicPage
      : { title: topic, sections: {} as TopicPage["sections"] };
  } catch {
    // Persist an incomplete draft for review rather than losing the failed generation attempt.
    page = { title: topic, sections: {} as TopicPage["sections"] };
  }
  const attempts: PipelineResult["attempts"] = [];
  let lastReview: ReviewResult | null = null;
  let loopCount = 0;

  for (let pass = 0; pass <= maxLoops; pass++) {
    const validation = validateTopicPage(page);
    let review: ReviewResult;
    try {
      // Gemini independently reviews every generated page, including pages
      // that already failed deterministic schema or safety validation.
      review = await reviewWithGemini(page);
    } catch (error) {
      review = {
        provider: "validator", verdict: "needs_fix", overall_confidence: 0,
        findings: [{
          section: "review_service", claim: error instanceof Error ? error.message : "Gemini review unavailable",
          verdict: "unverifiable", severity: "high", reference: "Gemini reviewer unavailable",
          suggested_fix: "Retry independent Gemini review before publication.",
        }],
        missing_sections: [],
      };
    }
    if (!validation.valid) {
      const validationFindings = validation.errors.map((claim) => ({
        section: claim.split(".")[0] || "schema", claim, verdict: "unverifiable" as const,
        severity: "high" as const, reference: "Deterministic schema and safety validation",
        suggested_fix: "Regenerate this section to satisfy the required schema.",
      }));
      review = {
        ...review,
        verdict: "needs_fix",
        findings: [...review.findings, ...validationFindings],
        missing_sections: [...new Set([...review.missing_sections, ...validation.missing])],
      };
    }
    lastReview = review;
    attempts.push({ page: structuredClone(page), review, reason: pass === 0 ? "initial_generation" : "targeted_regeneration" });
    if (validation.valid && review && isReviewApproved(review)) {
      return { page, review, status: "ai_checked", loopCount, attempts };
    }
    if (pass === maxLoops) break;

    const affected = sectionPatch(page, review, validation.missing);
    let patch: any;
    try {
      const fixes = await groqJson([
        { role: "system", content: FIX_PROMPT },
        { role: "user", content: JSON.stringify({
          topic, affected_sections: affected, findings: review.findings,
          missing_sections: [...new Set([...validation.missing, ...review.missing_sections])],
          required_schema: "Each section: applicable:boolean, content:string, confidence:high|medium|low",
        }) },
      ], 9000);
      patch = parseJson(fixes);
    } catch (error) {
      lastReview = {
        ...review, verdict: "needs_fix",
        findings: [...review.findings, {
          section: "regeneration", claim: error instanceof Error ? error.message : "Groq targeted regeneration failed",
          verdict: "unverifiable", severity: "high", reference: "Generation pipeline",
          suggested_fix: "Regenerate affected sections before publication.",
        }],
      };
      break;
    }
    if (!patch?.sections || typeof patch.sections !== "object") {
      lastReview = { ...review, verdict: "needs_fix" };
      break;
    }
    page = { ...page, sections: { ...page.sections, ...patch.sections } };
    loopCount++;
  }
  return { page, review: lastReview, status: "needs_review", loopCount, attempts };
}

export function renderTopicMarkdown(page: TopicPage): string {
  return TOPIC_SECTIONS.map((name) => {
    const section = page?.sections?.[name];
    if (!section?.applicable || !section.content?.trim()) return "";
    const heading = name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return `## ${heading}\n\n${section.content.trim()}`;
  }).filter(Boolean).join("\n\n");
}

export async function persistVerifiedArticle(input: {
  page: TopicPage; result: PipelineResult; articleId?: string | null; category?: string; originalNotes?: string;
}): Promise<{ id: string; published: false; ai_check_status: string }> {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("Supabase server credentials are not configured");
  const db = createClient(url, serviceKey);
  const content = renderTopicMarkdown(input.page);
  const title = String(input.page?.title || "Untitled medical topic");
  let articleId = input.articleId || null;

  if (!articleId) {
    const { data, error } = await db.from("articles").insert({
      title, content: "", published: false, requires_review: true,
      verification_status: "ai_generated", ai_check_status: "unchecked",
      ai_generator_model: groqModel(), ai_check_model: geminiReviewModel(),
      review_loop_count: input.result.loopCount, category: input.category || "Uncategorized",
      original_notes: input.originalNotes || "",
    }).select("id").single();
    if (error) throw error;
    articleId = data.id;
  }

  const { data: existing, error: readError } = await db.from("articles").select("content,title").eq("id", articleId).single();
  if (readError) throw readError;
  for (let index = 0; index < input.result.attempts.length; index++) {
    const attempt = input.result.attempts[index];
    const newContent = renderTopicMarkdown(attempt.page);
    const { error: revisionError } = await db.from("article_revisions").insert({
      article_id: articleId, old_content: index === 0 ? existing.content : renderTopicMarkdown(input.result.attempts[index - 1].page),
      new_content: newContent, reason: attempt.reason, source: index === 0 ? "groq" : "gemini_fix",
    });
    if (revisionError) throw revisionError;
  }

  for (let attemptIndex = 0; attemptIndex < input.result.attempts.length; attemptIndex++) {
    const attemptReview = input.result.attempts[attemptIndex].review;
    if (!attemptReview) continue;
    for (const finding of attemptReview.findings) {
      const { error } = await db.from("audit_findings").insert({
        article_id: articleId, section: finding.section, claim: finding.claim,
        verdict: finding.verdict, severity: finding.severity, reference: finding.reference,
        suggested_fix: finding.suggested_fix, review_loop: attemptIndex,
      });
      if (error) throw error;
    }
  }

  if (input.result.review) {
    const { data: savedReview, error: reviewError } = await db.from("article_ai_reviews").insert({
      article_id: articleId, provider: "gemini", model: geminiReviewModel(),
      verdict: input.result.review.verdict, overall_confidence: input.result.review.overall_confidence,
      findings: input.result.review.findings, missing_sections: input.result.review.missing_sections,
      loop_count: input.result.loopCount,
    }).select("id").single();
    if (reviewError) throw reviewError;
    const approved = input.result.status === "ai_checked" && input.result.review.provider === "gemini" && savedReview?.id;
    const { error: updateError } = await db.from("articles").update({
      title, content, published: false, requires_review: !approved,
      ai_check_status: approved ? "ai_checked" : "needs_review",
      ai_checked_at: approved ? new Date().toISOString() : null,
      ai_check_model: geminiReviewModel(), ai_generator_model: groqModel(), ai_review_id: savedReview?.id || null,
      ai_confidence: input.result.review.overall_confidence,
      review_loop_count: input.result.loopCount,
      verification_status: approved ? "ai_checked" : "needs_review",
    }).eq("id", articleId);
    if (updateError) throw updateError;
  } else {
    const { error } = await db.from("articles").update({
      title, content, published: false, requires_review: true, ai_check_status: "needs_review",
      verification_status: "needs_review", review_loop_count: input.result.loopCount,
    }).eq("id", articleId);
    if (error) throw error;
  }
  return { id: articleId, published: false, ai_check_status: input.result.status === "ai_checked" && input.result.review?.provider === "gemini" ? "ai_checked" : "needs_review" };
}
