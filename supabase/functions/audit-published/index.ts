import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { reviewWithGemini } from "../_shared/gemini-review.ts";

const isProtectedClinicalSection = (section: string) => /management|classif|dose|drug|medication/i.test(section);
serve(async (req) => {
  const expected = Deno.env.get("AUDIT_CRON_SECRET");
  if (!expected || req.headers.get("Authorization") !== `Bearer ${expected}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: articles, error } = await db.from("articles")
      .select("id,title,content,ai_checked_at,ai_check_status")
      .eq("published", true).eq("ai_check_status", "ai_checked")
      .is("deleted_at", null).order("ai_checked_at", { ascending: true, nullsFirst: true }).limit(20);
    if (error) throw error;
    let audited = 0;
    for (const article of articles || []) {
      const review = await reviewWithGemini({ title: article.title, content: article.content });
      const { data: savedReview, error: reviewError } = await db.from("article_ai_reviews").insert({
        article_id: article.id, provider: "gemini", model: Deno.env.get("GEMINI_REVIEW_MODEL") || "gemini-2.5-flash",
        verdict: review.verdict, overall_confidence: review.overall_confidence,
        findings: review.findings, missing_sections: review.missing_sections, loop_count: 0,
      }).select("id").single();
      if (reviewError) throw reviewError;
      for (const finding of review.findings) {
        const { error: findingError } = await db.from("audit_findings").insert({
          article_id: article.id, section: finding.section, claim: finding.claim,
          verdict: finding.verdict, severity: finding.severity, reference: finding.reference,
          suggested_fix: finding.suggested_fix,
        });
        if (findingError) throw findingError;
      }
      const needsHuman = review.findings.some((f) => f.severity === "medium" || f.severity === "high") || review.verdict !== "approved";
      if (needsHuman) {
        const { error: downgradeError } = await db.from("articles").update({
          requires_review: true, ai_check_status: "needs_review", ai_checked_at: null, ai_review_id: savedReview?.id || null,
        }).eq("id", article.id);
        if (downgradeError) throw downgradeError;
      } else {
        // Only deterministic low-risk formatting corrections are eligible for automation.
        // Clinical sections, medication details, doses and classifications are never edited.
        let revised = article.content || "";
        for (const finding of review.findings.filter((f) => f.severity === "low" && f.suggested_fix && !isProtectedClinicalSection(f.section))) {
          if (/format|spacing|punctuation|heading|typo/i.test(finding.claim) && revised.includes(finding.claim)) {
            revised = revised.replace(finding.claim, finding.suggested_fix);
          }
        }
        if (revised !== article.content) {
          const { error: revisionError } = await db.from("article_revisions").insert({
            article_id: article.id, old_content: article.content || "", new_content: revised,
            reason: "Nightly low-severity formatting audit", source: "gemini_fix",
          });
          if (revisionError) throw revisionError;
          const { error: updateError } = await db.from("articles").update({ content: revised }).eq("id", article.id);
          if (updateError) throw updateError;
        }
        const { error: stampError } = await db.from("articles").update({ ai_checked_at: new Date().toISOString(), ai_review_id: savedReview.id }).eq("id", article.id);
        if (stampError) throw stampError;
      }
      audited++;
    }
    return Response.json({ ok: true, audited });
  } catch (error) {
    console.error("audit-published failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Audit failed" }, { status: 500 });
  }
});
