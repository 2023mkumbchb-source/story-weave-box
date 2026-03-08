import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-pro",
];

async function callGemini(apiKey: string, prompt: string, maxTokens = 8000): Promise<string> {
  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 40_000);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      if (!res.ok) continue;

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text.trim();
    } catch {
      continue;
    }
  }
  throw new Error("All Gemini models failed");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action } = await req.json();
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) throw new Error("GEMINI_API_KEY not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    if (action === "scan") {
      // Scan articles for issues and return upgrade suggestions
      const { data: articles } = await sb
        .from("articles")
        .select("id, title, content, category, is_raw")
        .eq("published", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!articles || articles.length === 0) {
        return new Response(JSON.stringify({ suggestions: [], message: "No articles to scan" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Summarize article issues for Gemini
      const summaries = articles.map((a: any, i: number) => {
        const hasTable = a.content?.includes("|---") || a.content?.includes("| ---");
        const wordCount = a.content?.split(/\s+/).length || 0;
        const bulletCount = (a.content?.match(/^- /gm) || []).length;
        const headingCount = (a.content?.match(/^#{2,3}\s/gm) || []).length;
        const isRaw = a.is_raw;
        return `${i + 1}. "${a.title}" (${a.category}) – ${wordCount} words, ${headingCount} headings, ${bulletCount} bullets, raw=${isRaw}, hasTable=${hasTable}`;
      }).join("\n");

      const scanPrompt = `You are a medical content quality reviewer. Review these articles and suggest improvements.

Articles:
${summaries}

For each article that needs improvement, suggest ONE specific upgrade. Focus on:
- Articles that are too short (< 500 words) → suggest "expand content"
- Articles with too many bullet points and few paragraphs → suggest "improve formatting"  
- Raw/unformatted articles → suggest "format with AI"
- Articles missing key sections → suggest "add missing sections"
- Articles with poor category assignment → suggest "fix category"

Return ONLY a JSON array (max 10 items), each with: {"id": "...", "title": "...", "suggestion": "...", "type": "format|expand|category|sections", "priority": "high|medium|low", "auto_safe": true/false}

auto_safe=true means the upgrade won't delete content, only improve formatting or add details.
auto_safe=false means it could change meaning or structure significantly.

Return ONLY the JSON array, no markdown.`;

      const result = await callGemini(geminiKey, scanPrompt);
      let suggestions;
      try {
        const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        suggestions = JSON.parse(cleaned);
      } catch {
        suggestions = [];
      }

      return new Response(JSON.stringify({ suggestions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "upgrade") {
      const { id, type } = await req.json().catch(() => ({ id: null, type: null }));
      // Re-parse body properly
      const body = JSON.parse(await new Request(req.url, { method: "POST", body: req.body }).text().catch(() => "{}"));

      // Get article
      const { data: article } = await sb
        .from("articles")
        .select("*")
        .eq("id", id || body?.id)
        .single();

      if (!article) throw new Error("Article not found");

      const upgradeType = type || body?.type || "format";
      let prompt = "";

      if (upgradeType === "format") {
        prompt = `You are a medical content formatter. Take this article and improve its formatting for both mobile and desktop readability.

Rules:
- Use ## for major sections, ### for subsections
- Write in clear paragraphs, NOT excessive bullet points
- Keep ALL existing information — do NOT remove anything
- Preserve any tables in proper markdown format
- Bold key terms with **term**
- Keep medical accuracy

Article title: ${article.title}
Content:
${article.content}

Return ONLY the improved content (no title, no explanations).`;
      } else if (upgradeType === "expand") {
        prompt = `You are a medical content expert. Expand this article with additional relevant details while keeping all existing content.

Rules:
- Keep ALL existing content
- Add more clinical details, pathophysiology, diagnosis, treatment where relevant
- Add a summary table at the end if appropriate
- Maintain the same formatting style
- Target at least 800 words total

Article title: ${article.title}
Category: ${article.category}
Content:
${article.content}

Return ONLY the expanded content.`;
      } else {
        prompt = `Review and improve this medical article. Fix any formatting issues, add missing details, and ensure it reads well on both mobile and desktop.

Article: ${article.title}
Content:
${article.content}

Return ONLY the improved content.`;
      }

      const improved = await callGemini(geminiKey, prompt, 12000);

      return new Response(JSON.stringify({
        id: article.id,
        title: article.title,
        original_length: article.content.length,
        improved_length: improved.length,
        improved_content: improved,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "apply") {
      const body = await req.json().catch(() => ({}));
      const articleId = body?.id;
      const content = body?.content;

      if (!articleId || !content) throw new Error("Missing id or content");

      const { error } = await sb
        .from("articles")
        .update({ content })
        .eq("id", articleId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
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
