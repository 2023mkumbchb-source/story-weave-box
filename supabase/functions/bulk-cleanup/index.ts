import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_ANALYZE_CHARS = 40000;
const MAX_MCQ_EXTRACT_CHARS = 120000;
const OVERSIZED_ARTICLE_CHARS = 130000;
const CPU_BUDGET_MS = 1600;
const AI_MAX_CONTENT_CHARS = 18000;
const AI_MODEL = "google/gemini-3-flash-preview";

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Year 1: Anatomy": ["anatomy", "limb", "dissection", "histology", "upper limb", "lower limb", "head and neck", "thorax", "abdomen", "pelvis", "musculoskeletal", "osteology", "myology", "brachial plexus", "femoral", "gluteal"],
  "Year 1: Embryology": ["embryology", "embryo", "fetal", "teratogen", "organogenesis", "gastrulation"],
  "Year 1: Enzymes, Vitamins and Minerals": ["enzyme", "vitamin", "mineral", "cofactor", "coenzyme"],
  "Year 1: Biochemical Techniques and Instrumentation": ["spectrophotometry", "chromatography", "electrophoresis", "centrifug"],
  "Year 1: Cardiovascular Physiology": ["cardiac output", "heart rate", "blood pressure physiology", "ecg physiology", "cardiovascular physiology"],
  "Year 2: Molecular Biology": ["molecular biology", "dna replication", "transcription", "translation", "gene expression", "pcr", "recombinant dna"],
  "Year 2: Molecular Genetics and Cytogenetics": ["genetics", "cytogenetics", "chromosome", "karyotype", "mutation", "genetic disorder", "inheritance", "autosomal"],
  "Year 2: Clinical Biochemistry": ["clinical biochemistry", "clinical chemistry", "liver function test", "renal function", "electrolyte", "acid-base"],
  "Year 2: Physiology": ["physiology", "renal physiology", "genito-urinary", "neurophysiology", "endocrine physiology"],
  "Year 2: GIT Physiology": ["git physiology", "gastrointestinal physiology", "gastric acid", "digestion", "absorption physiology"],
  "Year 2: Parasitology": ["parasitology", "parasite", "helminth", "protozoa", "malaria", "entomology", "vector", "plasmodium", "schistosom", "trypanosoma", "leishmania"],
  "Year 2: Cellular Immunology": ["immunology", "immune", "antibod", "antigen", "lymphocyte", "t-cell", "b-cell", "cytokine"],
  "Year 2: Microbiology": ["microbiology", "bacteriology", "bacteria", "gram-positive", "gram-negative", "staphylococ", "streptococ", "antibiotic"],
  "Year 2: Epidemiology and Statistics": ["epidemiology", "statistics", "prevalence", "incidence", "study design", "odds ratio"],
  "Year 2: Human Communication Skills": ["communication skill", "doctor-patient", "breaking bad news", "counseling"],
  "Year 3: Basic Pharmacology II": ["pharmacology", "pharmacokinetic", "pharmacodynamic", "drug", "receptor", "agonist", "antagonist"],
  "Year 3: Hematopathology": ["hematopathology", "lymphoma", "leukemia", "anemia", "hemoglobin", "coagulation", "platelet", "hodgkin", "non-hodgkin", "myeloma"],
  "Year 3: Endocrine and Metabolic Pathology": ["endocrine", "thyroid", "adrenal", "pituitary", "diabetes", "insulin", "metabolic", "cushing", "addison", "pheochromocytoma", "parathyroid"],
  "Year 3: Chemical Pathology": ["chemical pathology", "clinical chemistry exam", "quality control", "siadh", "hyponatremia"],
  "Year 3: Respiratory System Pathology": ["respiratory pathology", "lung pathology", "pneumonia", "tuberculosis pathology", "lung tumour", "lung cancer", "copd pathology", "asthma pathology", "pleural"],
  "Year 3: Gastrointestinal Pathology": ["gastrointestinal pathology", "git pathology", "liver pathology", "hepatitis pathology", "pancrea", "liver histology", "cirrhosis", "hepatocellular", "colorectal", "gastric cancer", "esophag"],
  "Year 3: Female Reproductive System Pathology": ["female reproductive", "cervical", "ovarian", "uterine", "endometri", "breast pathology", "vagina pathology"],
  "Year 3: Cardiovascular System Pathology": ["cardiovascular pathology", "congenital heart", "heart disease pathology", "atherosclerosis", "myocardial infarction pathology", "valvular heart"],
  "Year 3: General Pathology": ["general pathology", "inflammation", "neoplasia", "oncopathology", "cell injury", "wound healing", "thrombosis", "embolism"],
  "Year 3: Nutrition and Dietetics": ["nutrition", "dietetics", "malnutrition", "kwashiorkor", "marasmus"],
  "Year 3: Research Methodology and Proposal Writing": ["research methodology", "proposal writing", "research design"],
  "Year 3: Junior Clerkship/Practicals in General Pathology I": ["junior clerkship pathology", "practicals in pathology"],
};

type ArticleLite = {
  id: string;
  title: string;
  content: string;
  category: string;
  is_raw?: boolean | null;
};

type AiCleanupOutput = {
  title?: string;
  category?: string;
  content_type?: "article" | "mcq" | "essay" | "delete";
  clean_content?: string;
  reason?: string;
};

function normalizeTitle(title: string): string {
  const trimmed = (title || "").replace(/\s+/g, " ").trim();
  const withoutNoise = trimmed
    .replace(/^\d{4}\s+(end\s+year|mid\s+year|supplementary)\s+/i, "")
    .replace(/^yr\s*\d+\s+/i, "")
    .replace(/\s*\|\s*complete\s*set$/i, "")
    .trim();

  const likelyAllCaps = withoutNoise.length > 10 && withoutNoise === withoutNoise.toUpperCase();
  if (!likelyAllCaps) return withoutNoise || trimmed || "Untitled Study Note";

  return (withoutNoise || trimmed)
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\bMcq\b/g, "MCQ")
    .replace(/\bMcu\b/g, "MCU")
    .replace(/\bCvs\b/g, "CVS");
}

function inferTitleFromContent(content: string): string {
  const firstLine = (content || "")
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  const cleaned = (firstLine || "Untitled Study Note")
    .replace(/^#+\s*/, "")
    .replace(/^[\-*\d.)\s]+/, "")
    .replace(/\*\*/g, "")
    .slice(0, 90)
    .trim();
  return normalizeTitle(cleaned || "Untitled Study Note");
}

function detectBestCategory(title: string, content: string): string | null {
  const text = `${title} ${content.slice(0, 3000)}`.toLowerCase();
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = category;
    }
  }

  return bestScore >= 2 ? bestMatch : null;
}

function isMcqContent(content: string): boolean {
  const mcqPatterns = [/\bA\)\s/g, /\bB\)\s/g, /\bC\)\s/g, /\bD\)\s/g, /\*\*Answer:\s*[A-E]\)/gi, /correct answer/gi];
  let mcqSignals = 0;
  for (const pat of mcqPatterns) {
    const matches = content.match(pat);
    if (matches && matches.length >= 3) mcqSignals++;
  }
  const hasQuestionNumbers = (content.match(/\*\*Question \d+/g) || []).length >= 5;
  return mcqSignals >= 2 || hasQuestionNumbers;
}

function looksLikeEssayContent(content: string): boolean {
  const text = (content || "").toLowerCase();
  const hasEssayHeaders = /(short answer|long answer|saq|laq|essay question|section a|section b)/i.test(text);
  const numberedQuestions = (content.match(/^\s*(?:question\s*)?\d+[.)\-:]/gim) || []).length;
  return hasEssayHeaders && numberedQuestions >= 3;
}

function extractMcqsFromContent(content: string): { question: string; options: string[]; correct_answer: number; explanation?: string }[] {
  const questions: any[] = [];
  const qBlocks = content.split(/(?=\*\*Question \d+|###\s*Question \d+|\d+\.\s*\*\*)/);

  for (const block of qBlocks) {
    if (block.trim().length < 20) continue;

    const qMatch = block.match(/(?:\*\*Question \d+\*\*[\s\n]*)?(.+?)(?=\n\s*[A-E]\))/s);
    if (!qMatch) continue;

    const questionText = qMatch[1].replace(/\*\*/g, "").replace(/^[\d.]+\s*/, "").trim();
    if (questionText.length < 10) continue;

    const optionMatches = block.match(/([A-E])\)\s*([^\n]+)/g);
    if (!optionMatches || optionMatches.length < 3) continue;

    const options = optionMatches.map((o) => o.replace(/^[A-E]\)\s*/, "").trim());
    const ansMatch = block.match(/\*\*Answer:\s*([A-E])\)/i) || block.match(/correct.*?([A-E])\)/i);
    let correctAnswer = 0;
    if (ansMatch) correctAnswer = ansMatch[1].charCodeAt(0) - 65;

    const expMatch = block.match(/\*\*Explanation:\*\*\s*(.+?)(?=\n\n|\*\*Question|$)/s);
    const explanation = expMatch ? expMatch[1].trim() : undefined;

    questions.push({ question: questionText, options, correct_answer: correctAnswer, explanation });
  }

  return questions;
}

function extractEssayQuestions(content: string): { saqs: any[]; laqs: any[] } {
  const blocks = content
    .replace(/\r/g, "")
    .split(/(?=^\s*(?:question\s*)?\d+[.)\-:])/gim)
    .map((b) => b.trim())
    .filter((b) => b.length > 20);

  const saqs: any[] = [];
  const laqs: any[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const q = lines[0].replace(/^question\s*/i, "").replace(/^\d+[.)\-:]\s*/, "").trim();
    const answer = lines.slice(1).join(" ").trim();
    const marksMatch = block.match(/(\d+)\s*marks?/i);
    const marks = marksMatch ? Number(marksMatch[1]) : 5;

    const longSignal = /(long answer|essay|discuss|describe in detail|explain in detail)/i.test(block);
    if (longSignal || marks >= 12) {
      laqs.push({ question: q, answer: answer || "Model answer pending", marks: marks || 20 });
    } else {
      saqs.push({ question: q, answer: answer || "Model answer pending", marks: marks || 5 });
    }
  }

  return { saqs: saqs.slice(0, 20), laqs: laqs.slice(0, 10) };
}

function cleanContent(content: string): string {
  let cleaned = content || "";
  cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2702}-\u{27B0}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{200D}]|[\u{20E3}]|[\u{FE0F}]/gu, "");
  cleaned = cleaned.replace(/Mount Kenya University/gi, "");
  cleaned = cleaned.replace(/\bMKU\b\s*/gi, "");
  cleaned = cleaned.replace(/([A-E]\))\s*([^\n]{3,}?)(?=\s*[B-E]\))/g, "$1 $2\n");
  cleaned = cleaned.replace(/\n{4,}/g, "\n\n\n");
  cleaned = cleaned.replace(/[ \t]+$/gm, "");
  return cleaned.trim();
}

function extractFirstJsonObject(text: string): any | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function callLovableAiCleanup(article: ArticleLite): Promise<AiCleanupOutput | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;

  const allowedCategories = Object.keys(CATEGORY_KEYWORDS).join("\n");
  const contentForAi = article.content.slice(0, AI_MAX_CONTENT_CHARS);

  const payload = {
    model: AI_MODEL,
    messages: [
      {
        role: "system",
        content: `You clean and classify MBChB study notes. Return ONLY valid JSON with this exact schema:
{"title":"string","category":"string","content_type":"article|mcq|essay|delete","clean_content":"string","reason":"string"}
Rules:
- title must be concise, no emojis, no university names.
- category must be one of the allowed categories below.
- content_type = mcq if mostly MCQ exam items; essay if SAQ/LAQ style; delete only if empty/garbage.
- clean_content must preserve content but improve formatting and remove emojis/university mentions.
Allowed categories:\n${allowedCategories}`,
      },
      {
        role: "user",
        content: `Current title: ${article.title}\nCurrent category: ${article.category}\n\nContent:\n${contentForAi}`,
      },
    ],
    temperature: 0.1,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (response.status === 429) throw new Error("Lovable AI rate-limited (429)");
    if (response.status === 402) throw new Error("Lovable AI credits exhausted (402)");
    if (!response.ok) throw new Error(`Lovable AI failed (${response.status})`);

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "";
    return extractFirstJsonObject(content);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchArticleBatch(
  sb: ReturnType<typeof createClient>,
  batchSize: number,
  cursor: string | null,
  yearFilter: string | null,
): Promise<ArticleLite[]> {
  let query = sb
    .from("articles")
    .select("id, title, content, category, is_raw")
    .eq("published", true)
    .is("deleted_at", null)
    .order("id", { ascending: true })
    .limit(batchSize);

  if (yearFilter) query = query.like("category", `${yearFilter}:%`);
  if (cursor) query = query.gt("id", cursor);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as ArticleLite[];
}

function normalizeYearFilter(rawYear: unknown): string | null {
  if (typeof rawYear !== "string") return null;
  const trimmed = rawYear.trim();
  if (/^Year [1-5]$/.test(trimmed)) return trimmed;
  return null;
}

type ProcessNonAiResult = {
  id: string;
  title: string;
  action: "updated" | "migrated_mcq" | "migrated_essay" | "deleted" | "no_change";
  details?: string;
};

async function processNonAiArticle(
  sb: ReturnType<typeof createClient>,
  article: ArticleLite,
): Promise<ProcessNonAiResult> {
  const baseContent = cleanContent(article.content || "");
  let newTitle = normalizeTitle(article.title || inferTitleFromContent(baseContent));
  if (!newTitle) newTitle = inferTitleFromContent(baseContent);

  const detectedCategory = detectBestCategory(newTitle, baseContent.slice(0, MAX_ANALYZE_CHARS));
  const newCategory = detectedCategory || article.category;

  if (baseContent.replace(/\s+/g, "").length < 40) {
    await sb.from("articles").update({ deleted_at: new Date().toISOString() }).eq("id", article.id);
    return { id: article.id, title: newTitle, action: "deleted", details: "empty_or_too_short" };
  }

  const mcqs = extractMcqsFromContent(baseContent.slice(0, MAX_MCQ_EXTRACT_CHARS));
  if (mcqs.length >= 5) {
    const { error: mcqError } = await sb.from("mcq_sets").insert({
      title: normalizeTitle(newTitle),
      questions: mcqs,
      published: true,
      original_notes: "",
      category: newCategory,
      access_password: "",
    });

    if (!mcqError) {
      await sb.from("articles").update({ deleted_at: new Date().toISOString() }).eq("id", article.id);
      return { id: article.id, title: newTitle, action: "migrated_mcq", details: `${mcqs.length} MCQs` };
    }
  }

  const essays = extractEssayQuestions(baseContent);
  if (essays.saqs.length + essays.laqs.length >= 3) {
    const { error: essayErr } = await sb.from("essays").insert({
      title: normalizeTitle(newTitle),
      short_answer_questions: essays.saqs,
      long_answer_questions: essays.laqs,
      category: newCategory,
      published: true,
      article_id: article.id,
    });

    if (!essayErr) {
      await sb.from("articles").update({ deleted_at: new Date().toISOString() }).eq("id", article.id);
      return {
        id: article.id,
        title: newTitle,
        action: "migrated_essay",
        details: `${essays.saqs.length} SAQs · ${essays.laqs.length} LAQs`,
      };
    }
  }

  const updates: Record<string, any> = {};
  if (baseContent !== article.content) updates.content = baseContent;
  if (newCategory !== article.category) updates.category = newCategory;
  if (newTitle !== article.title) updates.title = newTitle;

  if (Object.keys(updates).length > 0) {
    const { error: updateErr } = await sb.from("articles").update(updates).eq("id", article.id);
    if (updateErr) throw updateErr;
    return { id: article.id, title: newTitle, action: "updated" };
  }

  return { id: article.id, title: article.title, action: "no_change" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action } = body;
    const batchSize = Math.min(Math.max(Number(body?.batch_size || 6), 1), 25);
    const cursor = typeof body?.cursor === "string" && body.cursor.length ? body.cursor : null;
    const yearFilter = normalizeYearFilter(body?.year);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);
    const startedAt = Date.now();

    if (action === "scan") {
      const articles = await fetchArticleBatch(sb, batchSize, cursor, yearFilter);
      if (articles.length === 0) {
        return new Response(JSON.stringify({ results: [], done: true, processed: 0, next_cursor: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results = [];
      let processed = 0;
      let lastCursor: string | null = cursor;
      let timedOut = false;

      for (const article of articles) {
        processed++;
        lastCursor = article.id;

        const issues: string[] = [];
        const fixes: Record<string, any> = {};
        const analysisContent = article.content.slice(0, MAX_ANALYZE_CHARS);

        if (article.content.length > OVERSIZED_ARTICLE_CHARS) {
          issues.push("Very large article - open in editor for manual review");
          fixes.manual_review = true;
        }

        if (!article.title?.trim()) {
          issues.push("Missing title");
          fixes.new_title = inferTitleFromContent(article.content);
        }

        if (analysisContent.replace(/\s+/g, "").length < 40) {
          issues.push("Content is empty or too short");
          fixes.delete_empty = true;
        }

        if (isMcqContent(analysisContent)) {
          const mcqs = extractMcqsFromContent(analysisContent);
          if (mcqs.length >= 3) {
            issues.push(`Contains ${mcqs.length} MCQs - should migrate to MCQ section`);
            fixes.migrate_mcqs = true;
            fixes.mcq_count = mcqs.length;
          }
        }

        if (looksLikeEssayContent(analysisContent)) {
          issues.push("Contains SAQ/LAQ style content - should migrate to Essays section");
          fixes.migrate_essays = true;
        }

        const betterCategory = detectBestCategory(article.title, analysisContent);
        if (betterCategory && betterCategory !== article.category) {
          issues.push(`Category mismatch: "${article.category}" → "${betterCategory}"`);
          fixes.new_category = betterCategory;
        }

        const normalizedTitle = normalizeTitle(article.title);
        if (normalizedTitle !== article.title) {
          issues.push("Title formatting can be improved");
          fixes.new_title = normalizedTitle;
        }

        const hasEmojis = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/u.test(analysisContent);
        if (hasEmojis) {
          issues.push("Contains emojis");
          fixes.clean_emojis = true;
        }

        const hasMKU = /Mount Kenya University|\bMKU\b\s/i.test(analysisContent);
        if (hasMKU) {
          issues.push("Contains university references");
          fixes.clean_mku = true;
        }

        const brokenOptions = (analysisContent.match(/[A-E]\)\s*[^\n]{3,}[B-E]\)/g) || []).length;
        if (brokenOptions > 2) {
          issues.push("Broken option formatting");
          fixes.fix_formatting = true;
        }

        if ((analysisContent.match(/\n{4,}/g) || []).length > 3) {
          issues.push("Excessive blank lines");
          fixes.fix_formatting = true;
        }

        const wordCount = article.content.split(/\s+/).length;
        if (wordCount < 100) {
          issues.push(`Very short article (${wordCount} words)`);
          fixes.too_short = true;
        }

        if (issues.length > 0) {
          results.push({ id: article.id, title: article.title, category: article.category, issues, fixes, word_count: wordCount });
        }

        if (Date.now() - startedAt > CPU_BUDGET_MS) {
          timedOut = true;
          break;
        }
      }

      return new Response(JSON.stringify({
        results,
        done: articles.length < batchSize && !timedOut,
        processed,
        next_cursor: lastCursor,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "fix") {
      const { article_id, fixes = {} } = body;
      const { data: article, error } = await sb.from("articles").select("*").eq("id", article_id).single();
      if (error || !article) throw new Error("Article not found");

      let content = article.content;
      let category = article.category;
      let title = article.title;
      const changes: string[] = [];

      if (fixes.delete_empty || content.replace(/\s+/g, "").length < 40) {
        await sb.from("articles").update({ deleted_at: new Date().toISOString() }).eq("id", article_id);
        return new Response(JSON.stringify({ success: true, changes: ["Deleted empty article"], deleted_article: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (fixes.clean_emojis || fixes.clean_mku || fixes.fix_formatting) {
        content = cleanContent(content);
        changes.push("Cleaned formatting");
      }

      if (fixes.new_category) {
        category = fixes.new_category;
        changes.push(`Category: ${article.category} → ${category}`);
      }

      if (fixes.new_title) {
        title = fixes.new_title;
        changes.push("Updated title formatting");
      }

      if (fixes.migrate_mcqs) {
        const mcqSource = content.length > MAX_MCQ_EXTRACT_CHARS ? content.slice(0, MAX_MCQ_EXTRACT_CHARS) : content;
        const mcqs = extractMcqsFromContent(mcqSource);
        if (mcqs.length >= 3) {
          const { error: mcqError } = await sb.from("mcq_sets").insert({
            title: normalizeTitle(title.replace(/MCQ.*$/i, "MCQs").replace(/Question.*$/i, "MCQs")),
            questions: mcqs,
            published: true,
            original_notes: "",
            category,
            access_password: "",
          });

          if (!mcqError) {
            changes.push(`Migrated ${mcqs.length} MCQs to MCQ section`);
            await sb.from("articles").update({ deleted_at: new Date().toISOString() }).eq("id", article_id);
            return new Response(JSON.stringify({ success: true, changes, migrated_mcqs: mcqs.length, deleted_article: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }

      if (fixes.migrate_essays) {
        const essays = extractEssayQuestions(content);
        if (essays.saqs.length + essays.laqs.length >= 3) {
          const { error: essayErr } = await sb.from("essays").insert({
            title: normalizeTitle(title),
            short_answer_questions: essays.saqs,
            long_answer_questions: essays.laqs,
            category,
            published: true,
            article_id: article_id,
          });

          if (!essayErr) {
            changes.push(`Migrated to Essays (${essays.saqs.length} SAQs, ${essays.laqs.length} LAQs)`);
            await sb.from("articles").update({ deleted_at: new Date().toISOString() }).eq("id", article_id);
            return new Response(JSON.stringify({ success: true, changes, migrated_essays: true, deleted_article: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }

      if (content !== article.content || category !== article.category || title !== article.title) {
        const { error: updateError } = await sb.from("articles").update({ content, category, title }).eq("id", article_id);
        if (updateError) throw updateError;
      }

      return new Response(JSON.stringify({ success: true, changes }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "fix_all_safe" || action === "migrate_mcqs") {
      const articles = await fetchArticleBatch(sb, batchSize, cursor, yearFilter);
      if (articles.length === 0) {
        return new Response(JSON.stringify({ fixed: 0, failed: 0, skipped: 0, migrated: 0, done: true, processed: 0, next_cursor: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let fixed = 0;
      let failed = 0;
      let skipped = 0;
      let migrated = 0;
      let processed = 0;
      let lastCursor: string | null = cursor;
      const migratedArticles: string[] = [];
      const processedTitles: string[] = [];
      let timedOut = false;

      for (const article of articles) {
        processed++;
        lastCursor = article.id;

        try {
          if (action === "migrate_mcqs") {
            const mcqSource = article.content.length > MAX_MCQ_EXTRACT_CHARS ? article.content.slice(0, MAX_MCQ_EXTRACT_CHARS) : article.content;
            if (!isMcqContent(mcqSource)) {
              skipped++;
            } else {
              const mcqs = extractMcqsFromContent(mcqSource);
              if (mcqs.length >= 5) {
                const { error: mcqError } = await sb.from("mcq_sets").insert({
                  title: normalizeTitle(article.title),
                  questions: mcqs,
                  published: true,
                  original_notes: "",
                  category: article.category,
                  access_password: "",
                });

                if (!mcqError) {
                  await sb.from("articles").update({ deleted_at: new Date().toISOString() }).eq("id", article.id);
                  migrated++;
                  migratedArticles.push(`${article.title} (${mcqs.length} MCQs)`);
                }
              } else {
                skipped++;
              }
            }
          } else {
            const cleaned = cleanContent(article.content);
            const betterCat = detectBestCategory(article.title, article.content.slice(0, MAX_ANALYZE_CHARS));
            const betterTitle = normalizeTitle(article.title || inferTitleFromContent(article.content));

            let needsUpdate = cleaned !== article.content;
            const updates: Record<string, any> = {};

            if (needsUpdate) updates.content = cleaned;
            if (betterCat && betterCat !== article.category) {
              updates.category = betterCat;
              needsUpdate = true;
            }
            if (betterTitle !== article.title) {
              updates.title = betterTitle;
              needsUpdate = true;
            }

            if (cleaned.replace(/\s+/g, "").length < 40) {
              await sb.from("articles").update({ deleted_at: new Date().toISOString() }).eq("id", article.id);
              fixed++;
              processedTitles.push(`${article.title || "(untitled)"} → deleted empty`);
            } else if (needsUpdate) {
              const { error: updateErr } = await sb.from("articles").update(updates).eq("id", article.id);
              if (updateErr) throw updateErr;
              fixed++;
              processedTitles.push(article.title || "(untitled)");
            } else {
              skipped++;
            }
          }
        } catch {
          failed++;
        }

        if (Date.now() - startedAt > CPU_BUDGET_MS) {
          timedOut = true;
          break;
        }
      }

      return new Response(JSON.stringify({
        fixed,
        failed,
        skipped,
        migrated,
        migratedArticles,
        processed_titles: processedTitles,
        done: articles.length < batchSize && !timedOut,
        processed,
        next_cursor: lastCursor,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "cleanup_non_ai_batch") {
      const nonAiBatchSize = Math.min(Math.max(Number(body?.batch_size || 6), 1), 12);
      const articles = await fetchArticleBatch(sb, nonAiBatchSize, cursor, yearFilter);

      if (articles.length === 0) {
        return new Response(JSON.stringify({
          updated: 0,
          migrated_mcqs: 0,
          migrated_essays: 0,
          deleted: 0,
          failed: 0,
          skipped: 0,
          processed: 0,
          done: true,
          next_cursor: null,
          processed_articles: [],
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let updated = 0;
      let migrated_mcqs = 0;
      let migrated_essays = 0;
      let deleted = 0;
      let failed = 0;
      let skipped = 0;
      let processed = 0;
      let lastCursor: string | null = cursor;
      const processedArticles: Array<{ id: string; title: string; action: string; details?: string }> = [];
      let timedOut = false;

      for (const article of articles) {
        processed++;
        lastCursor = article.id;

        try {
          const result = await processNonAiArticle(sb, article);
          processedArticles.push(result);

          if (result.action === "updated") updated++;
          else if (result.action === "migrated_mcq") migrated_mcqs++;
          else if (result.action === "migrated_essay") migrated_essays++;
          else if (result.action === "deleted") deleted++;
          else skipped++;
        } catch (err: any) {
          failed++;
          processedArticles.push({
            id: article.id,
            title: article.title,
            action: "failed",
            details: err?.message || "Unknown",
          });
        }

        if (Date.now() - startedAt > CPU_BUDGET_MS) {
          timedOut = true;
          break;
        }
      }

      return new Response(JSON.stringify({
        updated,
        migrated_mcqs,
        migrated_essays,
        deleted,
        failed,
        skipped,
        processed,
        processed_articles: processedArticles,
        done: articles.length < nonAiBatchSize && !timedOut,
        next_cursor: lastCursor,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "ai_fix_batch") {
      const aiBatchSize = Math.min(Math.max(Number(body?.batch_size || 1), 1), 2);
      const articles = await fetchArticleBatch(sb, aiBatchSize, cursor, yearFilter);

      if (articles.length === 0) {
        return new Response(JSON.stringify({ fixed: 0, migrated_mcqs: 0, migrated_essays: 0, deleted: 0, failed: 0, processed: 0, done: true, next_cursor: null, processed_articles: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let fixed = 0;
      let migrated_mcqs = 0;
      let migrated_essays = 0;
      let deleted = 0;
      let failed = 0;
      let processed = 0;
      let lastCursor: string | null = cursor;
      const processedArticles: any[] = [];
      let timedOut = false;

      for (const article of articles) {
        processed++;
        lastCursor = article.id;

        try {
          const baseContent = cleanContent(article.content);
          const ai = await callLovableAiCleanup({ ...article, content: baseContent });

          let newTitle = normalizeTitle(ai?.title || article.title || inferTitleFromContent(baseContent));
          if (!newTitle) newTitle = inferTitleFromContent(baseContent);

          const suggestedCat = ai?.category && CATEGORY_KEYWORDS[ai.category] ? ai.category : null;
          const detectedCat = detectBestCategory(newTitle, baseContent);
          const newCategory = suggestedCat || detectedCat || article.category;
          const contentType = ai?.content_type || (isMcqContent(baseContent) ? "mcq" : looksLikeEssayContent(baseContent) ? "essay" : "article");
          const newContent = cleanContent(ai?.clean_content || baseContent);

          if (contentType === "delete" || newContent.replace(/\s+/g, "").length < 40) {
            await sb.from("articles").update({ deleted_at: new Date().toISOString() }).eq("id", article.id);
            deleted++;
            processedArticles.push({ id: article.id, title: newTitle, action: "deleted", reason: ai?.reason || "empty/garbage" });
            continue;
          }

          if (contentType === "mcq") {
            const mcqs = extractMcqsFromContent(newContent.slice(0, MAX_MCQ_EXTRACT_CHARS));
            if (mcqs.length >= 5) {
              const { error: mcqError } = await sb.from("mcq_sets").insert({
                title: normalizeTitle(newTitle),
                questions: mcqs,
                published: true,
                original_notes: "",
                category: newCategory,
                access_password: "",
              });

              if (!mcqError) {
                await sb.from("articles").update({ deleted_at: new Date().toISOString() }).eq("id", article.id);
                migrated_mcqs++;
                processedArticles.push({ id: article.id, title: newTitle, action: "migrated_mcq", count: mcqs.length });
                continue;
              }
            }
          }

          if (contentType === "essay") {
            const essays = extractEssayQuestions(newContent);
            if (essays.saqs.length + essays.laqs.length >= 3) {
              const { error: essayErr } = await sb.from("essays").insert({
                title: normalizeTitle(newTitle),
                short_answer_questions: essays.saqs,
                long_answer_questions: essays.laqs,
                category: newCategory,
                published: true,
                article_id: article.id,
              });

              if (!essayErr) {
                await sb.from("articles").update({ deleted_at: new Date().toISOString() }).eq("id", article.id);
                migrated_essays++;
                processedArticles.push({ id: article.id, title: newTitle, action: "migrated_essay", saqs: essays.saqs.length, laqs: essays.laqs.length });
                continue;
              }
            }
          }

          const updates: Record<string, any> = {};
          if (newContent !== article.content) updates.content = newContent;
          if (newCategory !== article.category) updates.category = newCategory;
          if (newTitle !== article.title) updates.title = newTitle;

          if (Object.keys(updates).length > 0) {
            const { error: updateErr } = await sb.from("articles").update(updates).eq("id", article.id);
            if (updateErr) throw updateErr;
            fixed++;
            processedArticles.push({ id: article.id, title: newTitle, action: "updated", category: newCategory });
          } else {
            processedArticles.push({ id: article.id, title: article.title, action: "no_change" });
          }
        } catch (err: any) {
          failed++;
          processedArticles.push({ id: article.id, title: article.title, action: "failed", error: err?.message || "Unknown" });
        }

        if (Date.now() - startedAt > CPU_BUDGET_MS) {
          timedOut = true;
          break;
        }
      }

      return new Response(JSON.stringify({
        fixed,
        migrated_mcqs,
        migrated_essays,
        deleted,
        failed,
        processed,
        processed_ids: processedArticles.map((a) => a.id),
        processed_articles: processedArticles,
        done: articles.length < aiBatchSize && !timedOut,
        next_cursor: lastCursor,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action");
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
