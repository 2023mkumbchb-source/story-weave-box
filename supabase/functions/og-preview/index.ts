import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_SITE_URL = "https://ompath.azaniispproject.co.ke";
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

function normalizeArticleId(value: string | null): string | null {
  if (!value) return null;
  if (UUID_REGEX.test(value)) return value;
  const match = value.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:-|$)/i);
  return match?.[1] || null;
}

function normalizeBaseUrl(url: string | null | undefined): string {
  const trimmed = String(url || "").trim();
  if (!trimmed) return DEFAULT_SITE_URL;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, "");
}

async function resolveSiteUrl(sb: ReturnType<typeof createClient>): Promise<string> {
  const { data } = await sb.from("app_settings").select("value").eq("key", "site_url").maybeSingle();
  return normalizeBaseUrl(data?.value);
}

function escapeHtml(str: string): string {
  return String(str || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildOgHtml(options: {
  title: string,
  description: string,
  image: string,
  canonical: string,
  isCrawler: boolean,
  content?: string,
  publishedAt?: string,
  author?: string,
  type?: string
}): string {
  const { title, description, image, canonical, isCrawler, content, publishedAt, author, type = "article" } = options;
  const ogImage = image || `${DEFAULT_SITE_URL}/og-default.jpg`;
  const redirectMarkup = isCrawler ? "" : `<meta http-equiv="refresh" content="0;url=${escapeHtml(canonical)}">\n  <script>window.location.replace(${JSON.stringify(canonical)});</script>`;

  // JSON-LD Structured Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": type === "article" ? "Article" : "WebPage",
    "headline": title,
    "description": description,
    "image": ogImage,
    "url": canonical,
    ...(publishedAt ? { "datePublished": publishedAt } : {}),
    "author": {
      "@type": "Organization",
      "name": author || "OMPATH"
    },
    "publisher": {
      "@type": "Organization",
      "name": "OMPATH",
      "logo": {
        "@type": "ImageObject",
        "url": `${DEFAULT_SITE_URL}/icon-512.png`
      }
    }
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)} | OMPATH</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="${escapeHtml(type === 'article' ? 'article' : 'website')}">
  <meta property="og:site_name" content="OMPATH">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  ${redirectMarkup}
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 2rem; color: #1a1a1a; }
    h1 { font-size: 2.5rem; margin-bottom: 1rem; }
    img.hero { width: 100%; height: auto; border-radius: 8px; margin-bottom: 2rem; }
    .content { font-size: 1.125rem; }
    .meta { color: #666; margin-bottom: 2rem; font-size: 0.875rem; }
    .list-item { margin-bottom: 1rem; border-bottom: 1px solid #eee; padding-bottom: 1rem; }
    .list-item h3 { margin: 0 0 0.5rem 0; }
  </style>
</head>
<body>
  <article>
    <header>
      <h1>${escapeHtml(title)}</h1>
      <div class="meta">
        ${publishedAt ? `Published on ${new Date(publishedAt).toLocaleDateString()} · ` : ""}
        By ${author || "OMPATH"}
      </div>
      ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" class="hero">` : ""}
    </header>
    <div class="content">
      ${content || `<p>${escapeHtml(description)}</p>`}
    </div>
    <footer>
      <hr>
      <p>Read more and interact with this content at <a href="${escapeHtml(canonical)}">${escapeHtml(canonical)}</a></p>
    </footer>
  </article>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slugParam = decodeURIComponent(url.searchParams.get("slug")?.trim() || "");
    const storyParam = url.searchParams.get("story");
    const mcqParam = url.searchParams.get("mcq");
    const flashcardParam = url.searchParams.get("flashcard");
    const essayParam = url.searchParams.get("essay");
    const prerenderParam = url.searchParams.get("prerender");
    const yearParam = url.searchParams.get("year");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const siteUrl = await resolveSiteUrl(supabase);
    const userAgent = (req.headers.get("user-agent") || "").toLowerCase();
    const isCrawler = /(bot|crawl|spider|facebookexternalhit|whatsapp|twitterbot|slackbot|telegrambot|discordbot|linkedinbot)/i.test(userAgent);

    let title = "", description = "", image = "", canonicalPath = "", content = "", publishedAt = "", type = "article";

    // Handle Year Hubs
    if (yearParam) {
      title = `Year ${yearParam} Medical Study Hub`;
      description = `Study materials for Year ${yearParam} MBChB students. Pathology, Pharmacology, Anatomy, and clinical notes for medical school in Kenya.`;
      canonicalPath = `/year/${yearParam}`;
      type = "website";
      
      const { data: arts } = await supabase.from("articles").select("title").ilike("category", `Year ${yearParam}%`).limit(10);
      if (arts?.length) {
        content = `<h2>Top Topics for Year ${yearParam}</h2><ul>` + arts.map(a => `<li>${escapeHtml(a.title)}</li>`).join('') + `</ul>`;
      }
    } 
    // Handle Prerendered Static Routes (Lists)
    else if (prerenderParam) {
      type = "website";
      if (prerenderParam === "blog") {
        title = "Medical Study Notes & Articles";
        description = "A library of medical articles covering General Pathology, Cardiovascular Physiology, Pharmacology, and more for Kenyan MBChB students.";
        canonicalPath = "/blog";
        const { data } = await supabase.from("articles").select("title, meta_description").eq("published", true).limit(10).order("created_at", { ascending: false });
        content = (data || []).map(a => `<div class="list-item"><h3>${escapeHtml(a.title)}</h3><p>${escapeHtml(a.meta_description || "")}</p></div>`).join("");
      } else if (prerenderParam === "mcqs") {
        title = "Medical MCQ Practice Quizzes";
        description = "Interactive medical multiple choice questions for exam revision. Practice Pathology and Pharmacology MCQs.";
        canonicalPath = "/mcqs";
        const { data } = await supabase.from("mcq_sets").select("title").eq("published", true).limit(10);
        content = `<ul>` + (data || []).map(m => `<li>${escapeHtml(m.title)}</li>`).join("") + `</ul>`;
      } else if (prerenderParam === "flashcards") {
        title = "Medical Study Flashcards";
        description = "Active recall medical flashcards for Pathology, Pharmacology, and Physiology students in Kenya.";
        canonicalPath = "/flashcards";
        const { data } = await supabase.from("flashcard_sets").select("title").eq("published", true).limit(10);
        content = `<ul>` + (data || []).map(f => `<li>${escapeHtml(f.title)}</li>`).join("") + `</ul>`;
      } else if (prerenderParam === "essays") {
        title = "Medical Essay Questions (SAQs & LAQs)";
        description = "Structured medical essay questions and answers for Kenyan medical school exams.";
        canonicalPath = "/essays";
        const { data } = await supabase.from("essays").select("title").eq("published", true).limit(10);
        content = `<ul>` + (data || []).map(e => `<li>${escapeHtml(e.title)}</li>`).join("") + `</ul>`;
      } else if (prerenderParam === "stories") {
        title = "Medical School Stories & Community";
        description = "Personal stories, experiences, and advice from medical students and doctors in Kenya.";
        canonicalPath = "/stories";
        const { data } = await supabase.from("stories").select("title").eq("published", true).limit(10);
        content = `<ul>` + (data || []).map(s => `<li>${escapeHtml(s.title)}</li>`).join("") + `</ul>`;
      } else if (prerenderParam === "exams") {
        title = "Timed Medical Exams & Revision";
        description = "Timed medical examinations for students at MKU, UoN, KU, and other Kenyan medical schools.";
        canonicalPath = "/exams";
      }
    }
    // Handle Single Content Items
    else if (storyParam) {
      const storyId = normalizeStoryId(storyParam);
      if (!storyId) return new Response(JSON.stringify({ error: "Invalid story id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data: story } = await supabase.from("stories").select("title, content, cover_image_url, id, created_at").eq("id", storyId).eq("published", true).is("deleted_at", null).maybeSingle();
      if (!story) return new Response(JSON.stringify({ error: "Story not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      title = story.title;
      description = stripRichText(story.content || "") || `Read ${story.title} on OMPATH.`;
      image = story.cover_image_url || extractFirstImage(story.content || "") || "";
      content = stripRichText(story.content || "", 4000).split('\n').map(p => p.trim() ? `<p>${escapeHtml(p)}</p>` : '').join('\n');
      publishedAt = story.created_at;
      canonicalPath = `/stories/${story.id}-${slugify(story.title) || "story"}`;

    } else if (mcqParam && UUID_REGEX.test(mcqParam)) {
      const { data: mcq } = await supabase.from("mcq_sets").select("title, category, questions, created_at").eq("id", mcqParam).eq("published", true).is("deleted_at", null).maybeSingle();
      if (!mcq) return new Response(JSON.stringify({ error: "MCQ not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      title = mcq.title;
      description = `Practice MCQ quiz: ${mcq.title}. Test your ${mcq.category || "medical"} knowledge on OMPATH.`;
      publishedAt = mcq.created_at;
      type = "website";
      content = Array.isArray(mcq.questions) 
        ? mcq.questions.map((q: any, i: number) => `<p><strong>Q${i+1}: ${escapeHtml(q.question || q.text)}</strong></p>`).join('\n')
        : description;
      canonicalPath = `/mcqs/${mcqParam}`;

    } else if (flashcardParam && UUID_REGEX.test(flashcardParam)) {
      const { data: fc } = await supabase.from("flashcard_sets").select("title, category, cards, created_at").eq("id", flashcardParam).eq("published", true).is("deleted_at", null).maybeSingle();
      if (!fc) return new Response(JSON.stringify({ error: "Flashcard set not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      title = fc.title;
      description = `Study flashcards: ${fc.title}. Review ${fc.category || "medical"} concepts on OMPATH.`;
      publishedAt = fc.created_at;
      type = "website";
      content = Array.isArray(fc.cards)
        ? fc.cards.map((c: any) => `<p>Q: ${escapeHtml(c.question)}<br>A: ${escapeHtml(c.answer)}</p>`).join('\n')
        : description;
      canonicalPath = `/flashcards/${flashcardParam}`;

    } else if (essayParam && UUID_REGEX.test(essayParam)) {
      const { data: essay } = await supabase.from("essays").select("title, category, created_at").eq("id", essayParam).eq("published", true).is("deleted_at", null).maybeSingle();
      if (!essay) return new Response(JSON.stringify({ error: "Essay not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      title = essay.title;
      description = `Essay questions: ${essay.title}. Practice ${essay.category || "medical"} SAQs and LAQs on OMPATH.`;
      publishedAt = essay.created_at;
      type = "website";
      canonicalPath = `/essays/${essayParam}`;

    } else if (slugParam) {
      const articleId = normalizeArticleId(slugParam);
      let article: any = null;

      if (articleId) {
        const byId = await supabase
          .from("articles")
          .select("title, content, meta_title, meta_description, og_image_url, slug, id, created_at")
          .eq("id", articleId)
          .eq("published", true)
          .is("deleted_at", null)
          .maybeSingle();
        article = byId.data;
      }

      if (!article) {
        const bySlug = await supabase
          .from("articles")
          .select("title, content, meta_title, meta_description, og_image_url, slug, id, created_at")
          .eq("slug", slugParam.toLowerCase())
          .eq("published", true)
          .is("deleted_at", null)
          .maybeSingle();
        article = bySlug.data;
      }

      if (!article) {
        const { data: candidates } = await supabase
          .from("articles")
          .select("id, title, content, meta_title, meta_description, og_image_url, slug, created_at")
          .eq("published", true)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(500);

        article = (candidates || []).find((row: any) => slugify(row.title) === slugParam.toLowerCase()) || null;
      }

      if (!article) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const articleSlug = article.slug || slugify(article.title) || "article";
      title = article.meta_title || article.title;
      description = article.meta_description || stripRichText(article.content || "") || `Study ${article.title} on OMPATH.`;
      image = article.og_image_url || extractFirstImage(article.content || "") || "";
      content = stripRichText(article.content || "", 8000).split('\n').map(p => p.trim() ? `<p>${escapeHtml(p)}</p>` : '').join('\n');
      publishedAt = article.created_at;
      canonicalPath = `/blog/${article.id}-${articleSlug}`;
    } else {
      // Root fallback
      title = "OMPATH – Medical Study Platform";
      description = "Free articles, flashcards, MCQ quizzes, and timed exams for medical students in Kenya.";
      canonicalPath = "/";
      type = "website";
    }

    const canonical = `${siteUrl}${canonicalPath}`;
    const html = buildOgHtml({
      title,
      description,
      image,
      canonical,
      isCrawler,
      content,
      publishedAt,
      type
    });

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400", ...corsHeaders },
    });
  } catch (error) {
    console.error("OG preview error:", error);
    return new Response("Error", { status: 500, headers: corsHeaders });
  }
});
