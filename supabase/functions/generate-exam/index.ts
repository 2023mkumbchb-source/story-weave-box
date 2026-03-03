import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callGemini(prompt: string): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];
  for (const model of MODELS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);
      if (response.ok) {
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
      if (response.status === 429) continue;
      await response.text();
    } catch { continue; }
  }
  throw new Error("Gemini unavailable");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all published MCQ sets to extract content
    const { data: mcqSets } = await supabase
      .from("mcq_sets")
      .select("title, questions, category")
      .eq("published", true);

    const { data: articles } = await supabase
      .from("articles")
      .select("title, content, category")
      .eq("published", true);

    if ((!mcqSets || mcqSets.length === 0) && (!articles || articles.length === 0)) {
      return new Response(JSON.stringify({ error: "No published content to generate exam from" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather all categories and sample content
    const allCategories = new Set<string>();
    const contentSummary: string[] = [];

    (mcqSets || []).forEach((s: any) => {
      if (s.category) allCategories.add(s.category);
      const qs = s.questions as any[];
      // Sample some questions for context
      qs.slice(0, 3).forEach((q: any) => {
        contentSummary.push(`[MCQ - ${s.category}] ${q.question}`);
      });
    });

    (articles || []).forEach((a: any) => {
      if (a.category) allCategories.add(a.category);
      contentSummary.push(`[Article - ${a.category}] ${a.title}: ${(a.content || "").slice(0, 200)}`);
    });

    const categories = [...allCategories].filter(c => c !== "Uncategorized");
    const contextStr = contentSummary.slice(0, 50).join("\n");

    // Generate 60 MCQs
    const mcqPrompt = `You are a senior medical exam writer. Generate EXACTLY 60 high-quality MCQs for a comprehensive weekly exam covering these medical units: ${categories.join(", ")}.

Here is sample content from the study materials:
${contextStr}

REQUIREMENTS:
- Return ONLY a valid JSON array
- Schema: {"question": "...", "options": ["A", "B", "C", "D"], "correct_answer": 0, "explanation": "..."}
- correct_answer is 0-based index
- Mix all categories evenly
- Prioritize challenging, clinically-applied vignette-style questions
- Focus on commonly tested exam topics
- Include tricky distractors that test deep understanding
- No duplicates
- No markdown, no code blocks`;

    const mcqText = await callGemini(mcqPrompt);
    const mcqMatch = mcqText.match(/\[[\s\S]*\]/);
    let examMcqs: any[] = [];
    if (mcqMatch) {
      try {
        const parsed = JSON.parse(mcqMatch[0]);
        examMcqs = parsed.filter((q: any) => q?.question && Array.isArray(q?.options) && q.options.length === 4)
          .map((q: any) => ({
            question: String(q.question).trim(),
            options: q.options.map((o: any) => String(o).trim()),
            correct_answer: Number.isInteger(q.correct_answer) ? Math.min(Math.max(q.correct_answer, 0), 3) : 0,
            explanation: q.explanation ? String(q.explanation).trim() : "",
          }));
      } catch {}
    }

    // Generate SAQs and LAQs
    const essayPrompt = `You are a senior medical exam writer. Generate exam questions for a comprehensive weekly exam.

Units covered: ${categories.join(", ")}

Generate:
1. SECTION B - 8 Short Answer Questions (SAQs): Each should require 2-4 sentence answers on key concepts.
2. SECTION C - 4 Long Answer Questions (LAQs): Each should require detailed essay-style answers (pathophysiology, diagnosis, management).

Return ONLY valid JSON:
{
  "saqs": [{"question": "...", "model_answer": "...", "marks": 5}],
  "laqs": [{"question": "...", "model_answer": "...", "marks": 15}]
}

Focus on clinically relevant, exam-worthy topics. No markdown, no code blocks.`;

    const essayText = await callGemini(essayPrompt);
    let saqs: any[] = [];
    let laqs: any[] = [];
    try {
      const jsonMatch = essayText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        saqs = (parsed.saqs || []).filter((q: any) => q?.question);
        laqs = (parsed.laqs || []).filter((q: any) => q?.question);
      }
    } catch {}

    // Get default exam password
    const { data: passwordSetting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "exam_password")
      .maybeSingle();
    const examPassword = passwordSetting?.value || "";

    // Save the exam as a special MCQ set with exam metadata
    const now = new Date();
    const examTitle = `Weekly Exam - ${now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;

    // Save MCQ section
    if (examMcqs.length > 0) {
      await supabase.from("mcq_sets").insert({
        title: `${examTitle} (Section A: MCQs)`,
        questions: examMcqs,
        published: true,
        original_notes: JSON.stringify({ type: "weekly_exam", saqs, laqs, generated_at: now.toISOString() }),
        category: "Weekly Exam",
        access_password: examPassword,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      title: examTitle,
      mcq_count: examMcqs.length,
      saq_count: saqs.length,
      laq_count: laqs.length,
      saqs,
      laqs,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Exam generation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
