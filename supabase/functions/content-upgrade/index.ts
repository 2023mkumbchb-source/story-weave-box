import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"];

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

async function generateArticleImage(prompt: string): Promise<string> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) throw new Error("LOVABLE_API_KEY not set");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Rate limit reached. Try again in a moment.");
    if (response.status === 402) throw new Error("AI credits exhausted. Please top up workspace usage.");
    throw new Error("Failed to generate image");
  }

  const data = await response.json();
  const imageUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!imageUrl) throw new Error("No image returned by Gemini image model");

  return imageUrl;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const geminiKey = typeof body?.geminiKey === "string" && body.geminiKey.trim()
      ? body.geminiKey.trim()
      : Deno.env.get("GEMINI_API_KEY");

    if (action === "scan") {
      if (!geminiKey) throw new Error("GEMINI_API_KEY not set");

      const { data: articles } = await sb
        .from("articles")
        .select("id, title, content, category, is_raw")
        .eq("published", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!articles?.length) return json({ suggestions: [], message: "No articles to scan" });

      const summaries = articles
        .map((a: any, i: number) => {
          const hasTable = a.content?.includes("|---") || a.content?.includes("| ---");
          const wordCount = a.content?.split(/\s+/).length || 0;
          const bulletCount = (a.content?.match(/^- /gm) || []).length;
          const headingCount = (a.content?.match(/^#{2,3}\s/gm) || []).length;
          return `${i + 1}. id=${a.id} | "${a.title}" (${a.category}) – ${wordCount} words, ${headingCount} headings, ${bulletCount} bullets, raw=${a.is_raw}, hasTable=${hasTable}`;
        })
        .join("\n");

      const scanPrompt = `You are a medical content quality reviewer. Review these articles and suggest improvements.

Articles:
${summaries}

For each article that needs improvement, suggest ONE specific upgrade. Focus on:
- Articles that are too short (< 500 words) → suggest "expand content"
- Articles with too many bullet points and few paragraphs → suggest "improve formatting"
- Raw/unformatted articles → suggest "format with AI"
- Articles missing key sections → suggest "add missing sections"
- Articles with poor category assignment → suggest "fix category"

Return ONLY a JSON array (max 10 items), each with: {"id": "<real article id>", "title": "...", "suggestion": "...", "type": "format|expand|category|sections", "priority": "high|medium|low", "auto_safe": true/false}
Return ONLY the JSON array, no markdown.`;

      const result = await callGemini(geminiKey, scanPrompt);
      try {
        const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        return json({ suggestions: JSON.parse(cleaned) });
      } catch {
        return json({ suggestions: [] });
      }
    }

    if (action === "upgrade") {
      if (!geminiKey) throw new Error("GEMINI_API_KEY not set");

      const id = body?.id;
      const upgradeType = body?.type || "format";
      if (!id) throw new Error("Missing article id");

      const { data: article } = await sb.from("articles").select("*").eq("id", id).single();
      if (!article) throw new Error("Article not found");

      let prompt = "";
      if (upgradeType === "format") {
        prompt = `You are a medical content formatter. Take this article and improve readability for mobile and desktop.

Rules:
- Use ## for major sections and ### for subsections
- Prefer clear paragraphs over excessive bullets
- Keep ALL existing information
- Preserve any markdown tables
- Bold key terms with **term**
- Keep medical accuracy

Article title: ${article.title}
Content:
${article.content}

Return ONLY the improved content.`;
      } else if (upgradeType === "expand") {
        prompt = `You are a medical content expert. Expand this article while keeping all existing content.

Rules:
- Keep ALL existing content
- Add clinical details, pathophysiology, diagnosis, and treatment where relevant
- Add a summary table at the end if appropriate
- Keep formatting clean and consistent
- Target at least 800 words total

Article title: ${article.title}
Category: ${article.category}
Content:
${article.content}

Return ONLY the expanded content.`;
      } else {
        prompt = `Review and improve this medical article. Fix formatting issues and add missing details without removing core information.

Article: ${article.title}
Content:
${article.content}

Return ONLY the improved content.`;
      }

      const improved = await callGemini(geminiKey, prompt, 12_000);
      return json({
        id: article.id,
        title: article.title,
        original_length: article.content.length,
        improved_length: improved.length,
        improved_content: improved,
      });
    }

    if (action === "generate_image") {
      const id = body?.id;
      if (!id) throw new Error("Missing article id");

      const { data: article } = await sb
        .from("articles")
        .select("id, title, category, content")
        .eq("id", id)
        .single();

      if (!article) throw new Error("Article not found");

      const imagePrompt = `Create a clean educational medical illustration for a study blog article.

Title: ${article.title}
Category: ${article.category}

Style requirements:
- medical textbook style
- simple, clear anatomy/clinical concept
- no logos, no text labels, no watermark
- white or very light background
- high clarity and professional look
- suitable as a hero image for an education article`;

      const imageDataUrl = await generateArticleImage(imagePrompt);
      return json({ image_data_url: imageDataUrl });
    }

    if (action === "apply") {
      const articleId = body?.id;
      const content = body?.content;
      const title = typeof body?.title === "string" ? body.title.trim() : null;

      if (!articleId || !content) throw new Error("Missing id or content");

      const updatePayload: Record<string, string> = { content };
      if (title) updatePayload.title = title;

      const { error } = await sb.from("articles").update(updatePayload).eq("id", articleId);
      if (error) throw error;

      return json({ success: true });
    }

    throw new Error("Unknown action");
  } catch (e: any) {
    return json({ error: e?.message || "Unknown error" }, 500);
  }
});
