import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://medicine.kenyaadverts.co.ke";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function slugify(value: string): string {
  return (value || "").toLowerCase().trim().replace(/&/g, " and ").replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function stripRichText(input: string, maxLength = 160): string {
  return (input || "").replace(/<[^>]*>/g, " ").replace(/!\[[^\]]*\]\((.*?)\)/g, " ").replace(/\[[^\]]+\]\((.*?)\)/g, "$1").replace(/^#+\s+/gm, "").replace(/[\*_`>|]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function extractFirstImage(content: string): string | null {
  if (!content) return null;
  const md = content.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+|data:image\/[^\s)]+)\)/i)?.[1];
  if (md) return md;
  const html = content.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i)?.[1];
  return html || null;
}

function normalizeStoryId(value: string | null): string | null {
  if (!value) return null;
  if (UUID_REGEX.test(value)) return value;
  const match = value.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:-|$)/i);
  return match?.[1] || null;
}

function escapeHtml(str: string): string {
  return String(str || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildOgHtml(title: string, description: string, image: string, canonical: string, isCrawler: boolean): string {
  const ogImage = image || `${SITE_URL}/icon-512.png`;
  const redirectMarkup = isCrawler ? "" : `<meta http-equiv="refresh" content="0;url=${escapeHtml(canonical)}">\n  <script>window.location.replace(${JSON.stringify(canonical)});</script>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)} | Ompath Study</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Ompath Study">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  ${redirectMarkup}
</head>
<body>
  <p>Open: <a href="${escapeHtml(canonical)}">${escapeHtml(title)}</a></p>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug")?.trim() || "";
    const storyParam = url.searchParams.get("story");
    const mcqParam = url.searchParams.get("mcq");
    const flashcardParam = url.searchParams.get("flashcard");
    const essayParam = url.searchParams.get("essay");

    if (!slug && !storyParam && !mcqParam && !flashcardParam && !essayParam) {
      return new Response(JSON.stringify({ error: "Missing param" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const userAgent = (req.headers.get("user-agent") || "").toLowerCase();
    const isCrawler = /(bot|crawl|spider|facebookexternalhit|whatsapp|twitterbot|slackbot|telegrambot|discordbot|linkedinbot)/i.test(userAgent);

    let title = "", description = "", image = "", canonicalPath = "";

    if (storyParam) {
      const storyId = normalizeStoryId(storyParam);
      if (!storyId) return new Response(JSON.stringify({ error: "Invalid story id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data: story } = await supabase.from("stories").select("title, content, cover_image_url, id").eq("id", storyId).eq("published", true).is("deleted_at", null).maybeSingle();
      if (!story) return new Response(JSON.stringify({ error: "Story not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      title = story.title;
      description = stripRichText(story.content || "") || `Read ${story.title} on Ompath Study.`;
      image = story.cover_image_url || extractFirstImage(story.content || "") || "";
      canonicalPath = `/stories/${story.id}-${slugify(story.title) || "story"}`;

    } else if (mcqParam && UUID_REGEX.test(mcqParam)) {
      const { data: mcq } = await supabase.from("mcq_sets").select("title, category").eq("id", mcqParam).eq("published", true).is("deleted_at", null).maybeSingle();
      if (!mcq) return new Response(JSON.stringify({ error: "MCQ not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      title = mcq.title;
      description = `Practice MCQ quiz: ${mcq.title}. Test your ${mcq.category || "medical"} knowledge on Ompath Study.`;
      canonicalPath = `/mcqs/${mcqParam}`;

    } else if (flashcardParam && UUID_REGEX.test(flashcardParam)) {
      const { data: fc } = await supabase.from("flashcard_sets").select("title, category").eq("id", flashcardParam).eq("published", true).is("deleted_at", null).maybeSingle();
      if (!fc) return new Response(JSON.stringify({ error: "Flashcard set not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      title = fc.title;
      description = `Study flashcards: ${fc.title}. Review ${fc.category || "medical"} concepts on Ompath Study.`;
      canonicalPath = `/flashcards/${flashcardParam}`;

    } else if (essayParam && UUID_REGEX.test(essayParam)) {
      const { data: essay } = await supabase.from("essays").select("title, category").eq("id", essayParam).eq("published", true).is("deleted_at", null).maybeSingle();
      if (!essay) return new Response(JSON.stringify({ error: "Essay not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      title = essay.title;
      description = `Essay questions: ${essay.title}. Practice ${essay.category || "medical"} SAQs and LAQs on Ompath Study.`;
      canonicalPath = `/essays/${essayParam}`;

    } else {
      // Article by slug or ID
      let { data: article } = await supabase.from("articles").select("title, content, meta_title, meta_description, og_image_url, slug, id").eq("slug", slug).eq("published", true).is("deleted_at", null).maybeSingle();
      if (!article) {
        const { data: byId } = await supabase.from("articles").select("title, content, meta_title, meta_description, og_image_url, slug, id").eq("id", slug).eq("published", true).is("deleted_at", null).maybeSingle();
        article = byId;
      }
      if (!article) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const articleSlug = article.slug || slugify(article.title) || article.id;
      title = article.meta_title || article.title;
      description = article.meta_description || stripRichText(article.content || "") || `Study ${article.title} on Ompath Study.`;
      image = article.og_image_url || extractFirstImage(article.content || "") || "";
      canonicalPath = `/blog/${articleSlug}`;
    }

    const canonical = `${SITE_URL}${canonicalPath}`;
    const html = buildOgHtml(title, description, image, canonical, isCrawler);

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400", ...corsHeaders },
    });
  } catch (error) {
    console.error("OG preview error:", error);
    return new Response("Error", { status: 500, headers: corsHeaders });
  }
});
