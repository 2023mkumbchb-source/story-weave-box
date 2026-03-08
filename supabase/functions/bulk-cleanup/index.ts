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

function normalizeTitle(title: string): string {
  const trimmed = title.replace(/\s+/g, " ").trim();
  const withoutNoise = trimmed
    .replace(/^\d{4}\s+(end\s+year|mid\s+year|supplementary)\s+/i, "")
    .replace(/^yr\s*\d+\s+/i, "")
    .replace(/\s*\|\s*complete\s*set$/i, "")
    .trim();

  const likelyAllCaps = withoutNoise.length > 10 && withoutNoise === withoutNoise.toUpperCase();
  if (!likelyAllCaps) return withoutNoise || trimmed;

  return (withoutNoise || trimmed)
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\bMcq\b/g, "MCQ")
    .replace(/\bMcu\b/g, "MCU")
    .replace(/\bCvs\b/g, "CVS");
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
  const mcqPatterns = [
    /\bA\)\s/g, /\bB\)\s/g, /\bC\)\s/g, /\bD\)\s/g,
    /\*\*Answer:\s*[A-E]\)/gi,
    /correct answer/gi,
  ];
  let mcqSignals = 0;
  for (const pat of mcqPatterns) {
    const matches = content.match(pat);
    if (matches && matches.length >= 3) mcqSignals++;
  }

  const hasQuestionNumbers = (content.match(/\*\*Question \d+/g) || []).length >= 5;
  return mcqSignals >= 2 || hasQuestionNumbers;
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
    if (ansMatch) {
      correctAnswer = ansMatch[1].charCodeAt(0) - 65;
    }

    const expMatch = block.match(/\*\*Explanation:\*\*\s*(.+?)(?=\n\n|\*\*Question|$)/s);
    const explanation = expMatch ? expMatch[1].trim() : undefined;

    questions.push({ question: questionText, options, correct_answer: correctAnswer, explanation });
  }

  return questions;
}

function cleanContent(content: string): string {
  let cleaned = content;

  cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2702}-\u{27B0}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{200D}]|[\u{20E3}]|[\u{FE0F}]/gu, "");

  cleaned = cleaned.replace(/Mount Kenya University/gi, "");
  cleaned = cleaned.replace(/MKU\s+/gi, "");

  cleaned = cleaned.replace(/([A-E]\))\s*([^\n]{3,}?)(?=\s*[B-E]\))/g, "$1 $2\n");

  cleaned = cleaned.replace(/\n{4,}/g, "\n\n\n");

  cleaned = cleaned.replace(/[ \t]+$/gm, "");

  return cleaned.trim();
}

async function fetchArticleBatch(
  sb: ReturnType<typeof createClient>,
  batchSize: number,
  cursor: string | null,
): Promise<ArticleLite[]> {
  let query = sb
    .from("articles")
    .select("id, title, content, category, is_raw")
    .eq("published", true)
    .is("deleted_at", null)
    .order("id", { ascending: true })
    .limit(batchSize);

  if (cursor) {
    query = query.gt("id", cursor);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as ArticleLite[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action } = body;
    const batchSize = Math.min(Math.max(Number(body?.batch_size || 6), 1), 25);
    const cursor = typeof body?.cursor === "string" && body.cursor.length ? body.cursor : null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    if (action === "scan") {
      const articles = await fetchArticleBatch(sb, batchSize, cursor);
      if (articles.length === 0) {
        return new Response(JSON.stringify({ results: [], done: true, processed: 0, next_cursor: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results = [];
      for (const article of articles) {
        const issues: string[] = [];
        const fixes: Record<string, any> = {};

        const analysisContent = article.content.slice(0, MAX_ANALYZE_CHARS);

        if (article.content.length > OVERSIZED_ARTICLE_CHARS) {
          issues.push("Very large article - open in editor for manual review");
          fixes.manual_review = true;
        }

        if (isMcqContent(analysisContent)) {
          const mcqs = extractMcqsFromContent(analysisContent);
          if (mcqs.length >= 3) {
            issues.push(`Contains ${mcqs.length} MCQs - should migrate to MCQ section`);
            fixes.migrate_mcqs = true;
            fixes.mcq_count = mcqs.length;
          }
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

        const hasMKU = /Mount Kenya University|MKU\s/i.test(analysisContent);
        if (hasMKU) {
          issues.push("Contains university references");
          fixes.clean_mku = true;
        }

        const brokenOptions = (analysisContent.match(/[A-E]\)\s*[^\n]{3,}[B-E]\)/g) || []).length;
        if (brokenOptions > 2) {
          issues.push("Broken option formatting (options on same line)");
          fixes.fix_formatting = true;
        }

        const wordCount = article.content.split(/\s+/).length;
        if (wordCount < 100) {
          issues.push(`Very short article (${wordCount} words)`);
          fixes.too_short = true;
        }

        if ((analysisContent.match(/\n{4,}/g) || []).length > 3) {
          issues.push("Excessive blank lines");
          fixes.fix_formatting = true;
        }

        if (issues.length > 0) {
          results.push({
            id: article.id,
            title: article.title,
            category: article.category,
            issues,
            fixes,
            word_count: wordCount,
          });
        }
      }

      return new Response(JSON.stringify({
        results,
        done: articles.length < batchSize,
        processed: articles.length,
        next_cursor: articles[articles.length - 1]?.id ?? null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "fix") {
      const { article_id, fixes = {} } = body;

      const { data: article, error } = await sb
        .from("articles")
        .select("*")
        .eq("id", article_id)
        .single();

      if (error || !article) throw new Error("Article not found");

      let content = article.content;
      let category = article.category;
      let title = article.title;
      const changes: string[] = [];

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
            title: title.replace(/MCQ.*$/i, "MCQs").replace(/Question.*$/i, "MCQs"),
            questions: mcqs,
            published: true,
            original_notes: "",
            category,
            access_password: "",
          });

          if (!mcqError) {
            changes.push(`Migrated ${mcqs.length} MCQs to MCQ section`);
            await sb.from("articles").update({ deleted_at: new Date().toISOString() }).eq("id", article_id);
            return new Response(JSON.stringify({
              success: true,
              changes,
              migrated_mcqs: mcqs.length,
              deleted_article: true,
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }

      if (content !== article.content || category !== article.category || title !== article.title) {
        const { error: updateError } = await sb
          .from("articles")
          .update({ content, category, title })
          .eq("id", article_id);

        if (updateError) throw updateError;
      }

      return new Response(JSON.stringify({ success: true, changes }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "fix_all_safe") {
      const articles = await fetchArticleBatch(sb, batchSize, cursor);
      if (articles.length === 0) {
        return new Response(JSON.stringify({ fixed: 0, failed: 0, skipped: 0, done: true, processed: 0, next_cursor: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let fixed = 0;
      let failed = 0;
      let skipped = 0;

      for (const article of articles) {
        try {
          const cleaned = cleanContent(article.content);
          const betterCat = detectBestCategory(article.title, article.content.slice(0, MAX_ANALYZE_CHARS));
          const betterTitle = normalizeTitle(article.title);

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

          if (article.content.length > OVERSIZED_ARTICLE_CHARS && !needsUpdate) {
            skipped++;
            continue;
          }

          if (needsUpdate) {
            const { error: updateErr } = await sb.from("articles").update(updates).eq("id", article.id);
            if (updateErr) throw updateErr;
            fixed++;
          }
        } catch {
          failed++;
        }
      }

      return new Response(JSON.stringify({
        fixed,
        failed,
        skipped,
        done: articles.length < batchSize,
        processed: articles.length,
        next_cursor: articles[articles.length - 1]?.id ?? null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "migrate_mcqs") {
      const articles = await fetchArticleBatch(sb, batchSize, cursor);
      if (articles.length === 0) {
        return new Response(JSON.stringify({ migrated: 0, done: true, processed: 0, next_cursor: null, migratedArticles: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let migrated = 0;
      const migratedArticles: string[] = [];

      for (const article of articles) {
        const mcqSource = article.content.length > MAX_MCQ_EXTRACT_CHARS ? article.content.slice(0, MAX_MCQ_EXTRACT_CHARS) : article.content;
        if (!isMcqContent(mcqSource)) continue;

        const mcqs = extractMcqsFromContent(mcqSource);
        if (mcqs.length < 5) continue;

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
      }

      return new Response(JSON.stringify({
        migrated,
        migratedArticles,
        done: articles.length < batchSize,
        processed: articles.length,
        next_cursor: articles[articles.length - 1]?.id ?? null,
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
