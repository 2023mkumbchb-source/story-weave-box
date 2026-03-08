import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

function detectBestCategory(title: string, content: string, currentCategory: string): string | null {
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
  
  // Split by question patterns
  const qBlocks = content.split(/(?=\*\*Question \d+|###\s*Question \d+|\d+\.\s*\*\*)/);
  
  for (const block of qBlocks) {
    if (block.trim().length < 20) continue;
    
    // Extract question text
    const qMatch = block.match(/(?:\*\*Question \d+\*\*[\s\n]*)?(.+?)(?=\n\s*[A-E]\))/s);
    if (!qMatch) continue;
    
    let questionText = qMatch[1].replace(/\*\*/g, '').replace(/^[\d.]+\s*/, '').trim();
    if (questionText.length < 10) continue;
    
    // Extract options
    const optionMatches = block.match(/([A-E])\)\s*([^\n]+)/g);
    if (!optionMatches || optionMatches.length < 3) continue;
    
    const options = optionMatches.map(o => o.replace(/^[A-E]\)\s*/, '').trim());
    
    // Extract answer
    const ansMatch = block.match(/\*\*Answer:\s*([A-E])\)/i) || block.match(/correct.*?([A-E])\)/i);
    let correctAnswer = 0;
    if (ansMatch) {
      correctAnswer = ansMatch[1].charCodeAt(0) - 65;
    }
    
    // Extract explanation
    const expMatch = block.match(/\*\*Explanation:\*\*\s*(.+?)(?=\n\n|\*\*Question|$)/s);
    const explanation = expMatch ? expMatch[1].trim() : undefined;
    
    questions.push({ question: questionText, options, correct_answer: correctAnswer, explanation });
  }
  
  return questions;
}

function cleanContent(content: string): string {
  let cleaned = content;
  
  // Remove emojis
  cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2702}-\u{27B0}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{200D}]|[\u{20E3}]|[\u{FE0F}]/gu, '');
  
  // Remove "Mount Kenya University" references
  cleaned = cleaned.replace(/Mount Kenya University/gi, '');
  cleaned = cleaned.replace(/MKU\s+/gi, '');
  
  // Fix broken option formatting (A) B) C) D) on same line)
  cleaned = cleaned.replace(/([A-E]\))\s*([^\n]{3,}?)(?=\s*[B-E]\))/g, '$1 $2\n');
  
  // Remove excessive blank lines
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');
  
  // Remove trailing spaces
  cleaned = cleaned.replace(/[ \t]+$/gm, '');
  
  return cleaned.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, batch_size = 10, offset = 0 } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    if (action === "scan") {
      // Get all published articles
      const { data: articles, error } = await sb
        .from("articles")
        .select("id, title, content, category, is_raw")
        .eq("published", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(offset, offset + batch_size - 1);

      if (error) throw error;
      if (!articles || articles.length === 0) {
        return new Response(JSON.stringify({ results: [], done: true, processed: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results = [];
      for (const article of articles) {
        const issues: string[] = [];
        const fixes: Record<string, any> = {};
        
        // Check if MCQ content
        if (isMcqContent(article.content)) {
          const mcqs = extractMcqsFromContent(article.content);
          if (mcqs.length >= 3) {
            issues.push(`Contains ${mcqs.length} MCQs - should migrate to MCQ section`);
            fixes.migrate_mcqs = true;
            fixes.mcq_count = mcqs.length;
          }
        }
        
        // Check category
        const betterCategory = detectBestCategory(article.title, article.content, article.category);
        if (betterCategory && betterCategory !== article.category) {
          issues.push(`Category mismatch: "${article.category}" → "${betterCategory}"`);
          fixes.new_category = betterCategory;
        }
        
        // Check formatting
        const hasEmojis = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/u.test(article.content);
        if (hasEmojis) {
          issues.push("Contains emojis");
          fixes.clean_emojis = true;
        }
        
        const hasMKU = /Mount Kenya University|MKU\s/i.test(article.content);
        if (hasMKU) {
          issues.push("Contains university references");
          fixes.clean_mku = true;
        }
        
        // Check broken formatting
        const brokenOptions = (article.content.match(/[A-E]\)\s*[^\n]{3,}[B-E]\)/g) || []).length;
        if (brokenOptions > 2) {
          issues.push("Broken option formatting (options on same line)");
          fixes.fix_formatting = true;
        }
        
        // Check if too short
        const wordCount = article.content.split(/\s+/).length;
        if (wordCount < 100) {
          issues.push(`Very short article (${wordCount} words)`);
          fixes.too_short = true;
        }
        
        // Check for excessive blank lines
        if ((article.content.match(/\n{4,}/g) || []).length > 3) {
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
        done: articles.length < batch_size,
        processed: articles.length,
        offset,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "fix") {
      const { article_id, fixes } = body;
      
      const { data: article, error } = await sb
        .from("articles")
        .select("*")
        .eq("id", article_id)
        .single();
      
      if (error || !article) throw new Error("Article not found");
      
      let content = article.content;
      let category = article.category;
      const changes: string[] = [];
      
      // Apply fixes
      if (fixes.clean_emojis || fixes.clean_mku || fixes.fix_formatting) {
        content = cleanContent(content);
        changes.push("Cleaned formatting");
      }
      
      if (fixes.new_category) {
        category = fixes.new_category;
        changes.push(`Category: ${article.category} → ${category}`);
      }
      
      // Migrate MCQs
      if (fixes.migrate_mcqs) {
        const mcqs = extractMcqsFromContent(content);
        if (mcqs.length >= 3) {
          // Create MCQ set
          const { error: mcqError } = await sb.from("mcq_sets").insert({
            title: article.title.replace(/MCQ.*$/i, 'MCQs').replace(/Question.*$/i, 'MCQs'),
            questions: mcqs,
            published: true,
            original_notes: '',
            category: category,
            access_password: '',
          });
          
          if (!mcqError) {
            changes.push(`Migrated ${mcqs.length} MCQs to MCQ section`);
            // Soft-delete the article since it's now an MCQ set
            await sb.from("articles").update({ deleted_at: new Date().toISOString() }).eq("id", article_id);
            return new Response(JSON.stringify({ 
              success: true, 
              changes,
              migrated_mcqs: mcqs.length,
              deleted_article: true 
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }
      
      // Update article
      if (content !== article.content || category !== article.category) {
        const { error: updateError } = await sb
          .from("articles")
          .update({ content, category })
          .eq("id", article_id);
        
        if (updateError) throw updateError;
      }
      
      return new Response(JSON.stringify({ success: true, changes }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "fix_all_safe") {
      // Auto-fix all safe issues (formatting, emojis, MKU references)
      const { data: articles, error } = await sb
        .from("articles")
        .select("id, title, content, category")
        .eq("published", true)
        .is("deleted_at", null)
        .range(offset, offset + batch_size - 1);

      if (error) throw error;
      if (!articles || articles.length === 0) {
        return new Response(JSON.stringify({ fixed: 0, done: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let fixed = 0;
      for (const article of articles) {
        const cleaned = cleanContent(article.content);
        const betterCat = detectBestCategory(article.title, article.content, article.category);
        
        let needsUpdate = cleaned !== article.content;
        const updates: Record<string, any> = {};
        
        if (needsUpdate) updates.content = cleaned;
        if (betterCat && betterCat !== article.category) {
          updates.category = betterCat;
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          await sb.from("articles").update(updates).eq("id", article.id);
          fixed++;
        }
      }

      return new Response(JSON.stringify({ 
        fixed, 
        done: articles.length < batch_size,
        processed: articles.length,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "migrate_mcqs") {
      // Find and migrate all MCQ articles
      const { data: articles, error } = await sb
        .from("articles")
        .select("id, title, content, category")
        .eq("published", true)
        .is("deleted_at", null)
        .range(offset, offset + batch_size - 1);

      if (error) throw error;
      
      let migrated = 0;
      const migratedArticles: string[] = [];
      
      for (const article of articles || []) {
        if (!isMcqContent(article.content)) continue;
        
        const mcqs = extractMcqsFromContent(article.content);
        if (mcqs.length < 5) continue;
        
        const { error: mcqError } = await sb.from("mcq_sets").insert({
          title: article.title,
          questions: mcqs,
          published: true,
          original_notes: '',
          category: article.category,
          access_password: '',
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
        done: (articles || []).length < batch_size,
        processed: (articles || []).length,
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
