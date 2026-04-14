import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_SITE_URL = "https://www.ompathstudy.com";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function slugify(value: string): string {
  return (value || "").toLowerCase().trim().replace(/&/g, " and ").replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function stripRichText(input: string, maxLength = 160): string {
  return (input || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]+\]\([^)]*\)/g, " ")
    .replace(/^#+\s+/gm, "")
    .replace(/[*_`>|#]/g, " ")
    .replace(/data:image\/[^\s)]+/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function extractFirstImage(content: string): string | null {
  if (!content) return null;
  const md = content.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/i)?.[1];
  if (md) return md;
  const html = content.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["'][^>]*>/i)?.[1];
  return html || null;
}

function extractUuid(value: string | null): string | null {
  if (!value) return null;
  if (UUID_REGEX.test(value)) return value;
  const match = value.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:-|$)/i);
  return match?.[1] || null;
}

async function resolveSiteUrl(sb: any): Promise<string> {
  const { data } = await sb.from("app_settings").select("value").eq("key", "site_url").maybeSingle();
  const raw = String((data as any)?.value || "").trim();
  if (!raw) return DEFAULT_SITE_URL;
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProto.replace(/\/+$/, "");
}

function esc(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Build clean body text for crawlers - plain text paragraphs only, NO html tags in content */
function buildBodyText(text: string): string {
  if (!text) return "";
  // Split into paragraphs, escape each, wrap in <p> tags
  return text
    .split(/\n+/)
    .map(p => p.trim())
    .filter(Boolean)
    .slice(0, 30)
    .map(p => `<p>${esc(p)}</p>`)
    .join("\n");
}

function buildOgHtml(options: {
  title: string;
  description: string;
  image: string;
  canonical: string;
  isCrawler: boolean;
  bodyText?: string;
  publishedAt?: string;
  author?: string;
  type?: string;
  noindex?: boolean;
}): string {
  const { title, description, image, canonical, isCrawler, bodyText, publishedAt, author, type = "article", noindex = false } = options;
  const ogImage = image || `${DEFAULT_SITE_URL}/og-default.png`;
  const redirectMarkup = isCrawler ? "" : `<meta http-equiv="refresh" content="0;url=${esc(canonical)}">\n  <script>window.location.replace(${JSON.stringify(canonical)});</script>`;
  const robotsTag = noindex ? '<meta name="robots" content="noindex, nofollow">' : '<meta name="robots" content="index, follow">';

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": type === "article" ? "Article" : "WebPage",
    "headline": title,
    "description": description,
    "image": ogImage,
    "url": canonical,
    ...(publishedAt ? { "datePublished": publishedAt } : {}),
    "author": { "@type": "Organization", "name": author || "OmpathStudy" },
    "publisher": { "@type": "Organization", "name": "OmpathStudy", "logo": { "@type": "ImageObject", "url": `${DEFAULT_SITE_URL}/icon-512.png` } },
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  ${robotsTag}
  <meta property="og:type" content="${type === 'article' ? 'article' : 'website'}">
  <meta property="og:site_name" content="OmpathStudy">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${esc(ogImage)}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${esc(ogImage)}">
  <link rel="canonical" href="${esc(canonical)}">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  ${redirectMarkup}
</head>
<body>
  <h1>${esc(title)}</h1>
  <p>${esc(description)}</p>
  ${bodyText || ""}
  <p><a href="${esc(canonical)}">View on OmpathStudy</a></p>
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

    let title = "", description = "", image = "", canonicalPath = "", bodyText = "", publishedAt = "", type = "article";

    // ── Year Hubs ──
    if (yearParam) {
      title = `Year ${yearParam} Study Materials | OmpathStudy Kenya`;
      description = `Browse Year ${yearParam} medical study notes, flashcards, MCQs, and exams on OmpathStudy for Kenyan health students.`;
      canonicalPath = `/year/${yearParam}`;
      type = "website";
      const { data: arts } = await supabase.from("articles").select("title").ilike("category", `Year ${yearParam}%`).limit(10);
      if (arts?.length) {
        bodyText = `<h2>Topics for Year ${yearParam}</h2><ul>` + arts.map(a => `<li>${esc(a.title)}</li>`).join("") + `</ul>`;
      }
    }
    // ── Listing Pages ──
    else if (prerenderParam) {
      type = "website";
      const configs: Record<string, { title: string; desc: string; path: string; table?: string }> = {
        blog: { title: "Medical Study Notes & Articles | OmpathStudy Kenya", desc: "Browse medical study notes covering Pathology, Pharmacology, Anatomy and more for Kenyan MBChB students.", path: "/blog", table: "articles" },
        mcqs: { title: "Medical MCQ Practice Quizzes | OmpathStudy Kenya", desc: "Practice interactive medical MCQs with answers and explanations for Kenyan medical students.", path: "/mcqs", table: "mcq_sets" },
        flashcards: { title: "Medical Study Flashcards | OmpathStudy Kenya", desc: "Active recall medical flashcards for Pathology, Pharmacology and Physiology revision.", path: "/flashcards", table: "flashcard_sets" },
        stories: { title: "Medical School Stories | OmpathStudy Kenya", desc: "Personal stories and experiences from medical students and doctors in Kenya.", path: "/stories", table: "stories" },
        exams: { title: "Timed Medical Exams | OmpathStudy Kenya", desc: "Timed medical examinations for students at Kenyan medical schools.", path: "/exams" },
      };
      // Redirect essay requests to blog
      if (prerenderParam === "essays") {
        const canonical = `${siteUrl}/blog`;
        const html = buildOgHtml({ title: "Medical Study Notes | OmpathStudy Kenya", description: "Browse study notes on OmpathStudy.", image: "", canonical, isCrawler, noindex: true });
        return new Response(html, { status: 301, headers: { "Content-Type": "text/html; charset=utf-8", "Location": canonical, ...corsHeaders } });
      }
      const cfg = configs[prerenderParam];
      if (cfg) {
        title = cfg.title;
        description = cfg.desc;
        canonicalPath = cfg.path;
        if (cfg.table) {
          const { data } = await supabase.from(cfg.table).select("title").eq("published", true).limit(15).order("created_at", { ascending: false });
          if (data?.length) bodyText = `<ul>` + data.map((r: any) => `<li>${esc(r.title)}</li>`).join("") + `</ul>`;
        }
      }
    }
    // ── Single Story ──
    else if (storyParam) {
      const storyId = extractUuid(storyParam);
      if (!storyId) return notFoundResponse(siteUrl, `/stories/${storyParam}`, isCrawler);
      const { data: story } = await supabase.from("stories").select("title, content, cover_image_url, id, created_at").eq("id", storyId).eq("published", true).is("deleted_at", null).maybeSingle();
      if (!story) return notFoundResponse(siteUrl, `/stories/${storyParam}`, isCrawler);
      title = `${story.title} | OmpathStudy Kenya`;
      description = stripRichText(story.content || "", 155) || `Read ${story.title} on OmpathStudy.`;
      image = story.cover_image_url || extractFirstImage(story.content || "") || "";
      bodyText = buildBodyText(stripRichText(story.content || "", 3000));
      publishedAt = story.created_at;
      canonicalPath = `/stories/${story.id}-${slugify(story.title) || "story"}`;
    }
    // ── Single MCQ ──
    else if (mcqParam) {
      const mcqId = extractUuid(mcqParam);
      let mcq: any = null;
      if (mcqId) {
        const { data } = await supabase.from("mcq_sets").select("title, category, questions, created_at, slug, id").eq("id", mcqId).eq("published", true).is("deleted_at", null).maybeSingle();
        mcq = data;
      }
      if (!mcq) {
        const { data } = await supabase.from("mcq_sets").select("title, category, questions, created_at, slug, id").eq("slug", mcqParam).eq("published", true).is("deleted_at", null).maybeSingle();
        mcq = data;
      }
      if (!mcq) return notFoundResponse(siteUrl, `/mcqs/${mcqParam}`, isCrawler);
      const qCount = Array.isArray(mcq.questions) ? mcq.questions.length : 0;
      title = `${mcq.title} | MCQ Quiz | OmpathStudy Kenya`;
      description = `Practice ${qCount} MCQs on ${mcq.title} with OmpathStudy. Built for Kenyan medical and health students to revise key concepts and prepare for exams.`;
      publishedAt = mcq.created_at;
      type = "website";
      // Clean body text - just question text, no raw HTML
      if (Array.isArray(mcq.questions)) {
        bodyText = mcq.questions.slice(0, 20).map((q: any, i: number) => 
          `<p><strong>Q${i+1}:</strong> ${esc(stripRichText(q.question || q.text || "", 200))}</p>`
        ).join("\n");
      }
      canonicalPath = `/mcqs/${mcq.id}`;
    }
    // ── Single Flashcard ──
    else if (flashcardParam) {
      const fcId = extractUuid(flashcardParam);
      let fc: any = null;
      if (fcId) {
        const { data } = await supabase.from("flashcard_sets").select("title, category, cards, created_at, slug, id").eq("id", fcId).eq("published", true).is("deleted_at", null).maybeSingle();
        fc = data;
      }
      if (!fc) {
        const { data } = await supabase.from("flashcard_sets").select("title, category, cards, created_at, slug, id").eq("slug", flashcardParam).eq("published", true).is("deleted_at", null).maybeSingle();
        fc = data;
      }
      if (!fc) return notFoundResponse(siteUrl, `/flashcards/${flashcardParam}`, isCrawler);
      const cardCount = Array.isArray(fc.cards) ? fc.cards.length : 0;
      title = `${fc.title} | Flashcards | OmpathStudy Kenya`;
      description = `Study ${cardCount} flashcards on ${fc.title}. Review ${fc.category || "medical"} concepts on OmpathStudy.`;
      publishedAt = fc.created_at;
      type = "website";
      if (Array.isArray(fc.cards)) {
        bodyText = fc.cards.slice(0, 15).map((c: any) => 
          `<p><strong>Q:</strong> ${esc(stripRichText(c.question || "", 150))}</p>`
        ).join("\n");
      }
      canonicalPath = `/flashcards/${fc.id}`;
    }
    // ── Single Essay (redirect to blog) ──
    else if (essayParam) {
      const canonical = `${siteUrl}/blog`;
      const html = buildOgHtml({ title: "OmpathStudy Kenya", description: "Medical study platform for Kenyan students.", image: "", canonical, isCrawler, noindex: true });
      return new Response(html, { status: 301, headers: { "Content-Type": "text/html; charset=utf-8", "Location": canonical, ...corsHeaders } });
    }
    // ── Single Article ──
    else if (slugParam) {
      const articleId = extractUuid(slugParam);
      let article: any = null;

      if (articleId) {
        const { data } = await supabase.from("articles").select("title, content, meta_title, meta_description, og_image_url, slug, id, created_at, category").eq("id", articleId).eq("published", true).is("deleted_at", null).maybeSingle();
        article = data;
      }
      if (!article) {
        const { data } = await supabase.from("articles").select("title, content, meta_title, meta_description, og_image_url, slug, id, created_at, category").eq("slug", slugParam.toLowerCase()).eq("published", true).is("deleted_at", null).maybeSingle();
        article = data;
      }
      if (!article) {
        const { data: candidates } = await supabase.from("articles").select("id, title, content, meta_title, meta_description, og_image_url, slug, created_at, category").eq("published", true).is("deleted_at", null).order("created_at", { ascending: false }).limit(500);
        article = (candidates || []).find((row: any) => slugify(row.title) === slugParam.toLowerCase()) || null;
      }

      if (!article) return notFoundResponse(siteUrl, `/blog/${slugParam}`, isCrawler);

      const articleSlug = article.slug || slugify(article.title) || "article";
      title = article.meta_title || `${article.title} | OmpathStudy Kenya`;
      description = article.meta_description || stripRichText(article.content || "", 155) || `Study ${article.title} on OmpathStudy.`;
      image = article.og_image_url || extractFirstImage(article.content || "") || "";
      // Clean body: strip all markdown/HTML, just plain text paragraphs
      bodyText = buildBodyText(stripRichText(article.content || "", 6000));
      publishedAt = article.created_at;
      canonicalPath = `/blog/${article.id}-${articleSlug}`;
    }
    // ── Root fallback ──
    else {
      title = "OMPATH – Free Medical Study Platform for Kenyan Students";
      description = "Comprehensive medical study notes, flashcards, MCQs, and exam preparation for Kenyan medical students. Organized by year and unit.";
      canonicalPath = "/";
      type = "website";
    }

    const canonical = `${siteUrl}${canonicalPath}`;
    const html = buildOgHtml({ title, description, image, canonical, isCrawler, bodyText, publishedAt, type });
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400", ...corsHeaders },
    });
  } catch (error) {
    console.error("OG preview error:", error);
    return new Response("Error", { status: 500, headers: corsHeaders });
  }
});

function notFoundResponse(siteUrl: string, path: string, isCrawler: boolean): Response {
  const html = buildOgHtml({
    title: "Page Not Found",
    description: "This page may have been removed or the link is incorrect.",
    image: "",
    canonical: `${siteUrl}${path}`,
    isCrawler,
    noindex: true,
  });
  return new Response(html, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache", "Access-Control-Allow-Origin": "*" },
  });
}
