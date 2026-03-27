import { createClient } from "@supabase/supabase-js";

export const config = {
  runtime: "edge",
};

const OG_FALLBACK_IMAGE = "https://ompath.azaniispproject.co.ke/og-default.png";

function isCrawler(userAgent: string | null): boolean {
  const ua = (userAgent || "").toLowerCase();
  if (!ua) return false;
  return (
    ua.includes("googlebot") ||
    ua.includes("facebookexternalhit") ||
    ua.includes("twitterbot") ||
    ua.includes("linkedinbot")
  );
}

function cleanForMetaSnippet(input: string): string {
  if (!input) return "";
  return input
    .replace(/[#*_`>]+/g, " ")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function to160(input: string): string {
  const s = cleanForMetaSnippet(input);
  if (!s) return "";
  return s.length <= 160 ? s : s.slice(0, 160).trimEnd();
}

function htmlEscape(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function extractUuidFromParam(value?: string | null): string | null {
  const v = String(value || "").trim();
  if (!v) return null;
  if (UUID_REGEX.test(v)) return v;
  const match = v.match(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:-|$)/i,
  );
  return match?.[1] || null;
}

function getSupabase() {
  // These should already exist in your Vercel env vars (same ones used by the SPA build).
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function fetchArticleBySlug(slug: string) {
  const supabase = getSupabase();
  const normalized = decodeURIComponent(slug).trim().toLowerCase();
  const { data } = await supabase
    .from("articles")
    .select(
      "id,title,content,slug,published,deleted_at,meta_title,meta_description,summary,excerpt,cover_image,image,og_image_url,created_at,updated_at",
    )
    .or(`slug.eq.${normalized},slug.ilike.%-${normalized}`)
    .eq("published", true)
    .is("deleted_at", null)
    .maybeSingle();
  return data ?? null;
}

async function fetchMcqSetById(id: string) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("mcq_sets")
    .select("id,title,category,questions,created_at,cover_image,image")
    .eq("id", id)
    .eq("published", true)
    .is("deleted_at", null)
    .maybeSingle();
  return data ?? null;
}

async function fetchFlashcardSetById(id: string) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("flashcard_sets")
    .select("id,title,category,cards,created_at,cover_image,image")
    .eq("id", id)
    .eq("published", true)
    .is("deleted_at", null)
    .maybeSingle();
  return data ?? null;
}

async function fetchEssayByIdOrSlug(param: string) {
  const supabase = getSupabase();
  const decoded = decodeURIComponent(param).trim();
  // try slug match first, then id (covers legacy links)
  const { data: bySlug } = await supabase
    .from("essays")
    .select("id,slug,title,category,short_answer_questions,long_answer_questions,created_at,cover_image,image")
    .eq("slug", decoded)
    .eq("published", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (bySlug) return bySlug;

  const { data: byId } = await supabase
    .from("essays")
    .select("id,slug,title,category,short_answer_questions,long_answer_questions,created_at,cover_image,image")
    .eq("id", decoded)
    .eq("published", true)
    .is("deleted_at", null)
    .maybeSingle();
  return byId ?? null;
}

async function fetchStoryByParam(param: string) {
  const supabase = getSupabase();
  const storyId = extractUuidFromParam(param);
  if (!storyId) return null;
  const { data } = await supabase
    .from("stories")
    .select("id,title,content,category,cover_image_url,created_at")
    .eq("id", storyId)
    .eq("published", true)
    .is("deleted_at", null)
    .maybeSingle();
  return data ?? null;
}

function buildHtml(opts: {
  title: string;
  description: string;
  url: string;
  ogImage: string;
  keywords?: string;
}) {
  const title = htmlEscape(opts.title);
  const desc = htmlEscape(opts.description);
  const url = htmlEscape(opts.url);
  const img = htmlEscape(opts.ogImage);
  const keywords = opts.keywords ? htmlEscape(opts.keywords) : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${desc}" />
    ${keywords ? `<meta name="keywords" content="${keywords}" />` : ""}
    <link rel="canonical" href="${url}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${img}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${desc}" />
    <meta name="twitter:image" content="${img}" />
  </head>
  <body>
    <p>${title}</p>
  </body>
</html>`;
}

export default async function handler(req: Request): Promise<Response> {
  const ua = req.headers.get("user-agent");
  const url = new URL(req.url);

  // Original path is passed in via vercel.json rewrite (query param).
  const originalPath = url.searchParams.get("path") || "/";

  if (!isCrawler(ua)) {
    // For normal users, bounce back to the SPA route (no crawler rewrite will apply).
    return Response.redirect(new URL(originalPath, url.origin).toString(), 307);
  }

  try {
    const origin = url.origin;
    const absoluteUrl = new URL(originalPath, origin).toString();

    const parts = originalPath.split("?")[0].split("/").filter(Boolean);
    const section = parts[0] || "";
    const param = parts[1] || "";

    // Defaults (in case content is missing)
    let title = "OmpathStudy | Kenyan Medical Education Platform";
    let description =
      "OmpathStudy helps medical and health students in Kenya study smarter with notes, flashcards, MCQs, essays and exams by year and unit.";
    let ogImage = OG_FALLBACK_IMAGE;
    let keywords =
      "OmpathStudy, medical students Kenya, nursing students Kenya, clinical notes, MCQs, flashcards, exam preparation, medical education Kenya";

    if (section === "blog" && param) {
      const article = await fetchArticleBySlug(param);
      if (article) {
        const metaTitle = article.meta_title || article.title;
        const sumOrEx = article.summary || article.excerpt || "";
        const fallback = to160(article.content || "");
        const metaDesc =
          article.meta_description ||
          to160(sumOrEx) ||
          fallback ||
          `Study ${article.title} with OmpathStudy—medical notes and practice questions for students in Kenya.`;

        title = metaTitle;
        description = metaDesc;
        ogImage = article.cover_image || article.image || article.og_image_url || OG_FALLBACK_IMAGE;
        keywords = `OmpathStudy, study notes Kenya, medical notes, ${article.category || ""}, clinical revision, exam prep, medical education Kenya`;
      }
    } else if (section === "mcqs" && param) {
      const id = extractUuidFromParam(param) || decodeURIComponent(param);
      const mcq = await fetchMcqSetById(id);
      if (mcq) {
        title = `${mcq.title} | MCQ Quiz | OmpathStudy Kenya`;
        description = to160(
          `Practice MCQs on ${mcq.title} with OmpathStudy. Built for Kenyan medical and health students to revise key concepts and prepare for exams.`,
        );
        ogImage = mcq.cover_image || mcq.image || OG_FALLBACK_IMAGE;
        keywords = `OmpathStudy, MCQs Kenya, ${mcq.category || ""}, medical quizzes, nursing quizzes, exam practice, medical education Kenya`;
      }
    } else if (section === "flashcards" && param) {
      const id = extractUuidFromParam(param) || decodeURIComponent(param);
      const set = await fetchFlashcardSetById(id);
      if (set) {
        title = `${set.title} | Flashcards | OmpathStudy Kenya`;
        description = to160(
          `Study flashcards on ${set.title} with OmpathStudy. Quick, focused revision for Kenyan medical and health students by unit and year.`,
        );
        ogImage = set.cover_image || set.image || OG_FALLBACK_IMAGE;
        keywords = `OmpathStudy, flashcards Kenya, ${set.category || ""}, medical revision, nursing revision, exam prep, medical education Kenya`;
      }
    } else if (section === "essays" && param) {
      const essay = await fetchEssayByIdOrSlug(param);
      if (essay) {
        title = `${essay.title} | Essays | OmpathStudy Kenya`;
        description = to160(
          `Practice SAQs and LAQs on ${essay.title} with OmpathStudy. Improve structured answering for Kenyan medical and health students.`,
        );
        ogImage = essay.cover_image || essay.image || OG_FALLBACK_IMAGE;
        keywords = `OmpathStudy, essays Kenya, SAQ, LAQ, ${essay.category || ""}, written questions, exam technique, medical education Kenya`;
      }
    } else if (section === "stories" && param) {
      const story = await fetchStoryByParam(param);
      if (story) {
        title = `${story.title} | Story | OmpathStudy Kenya`;
        description =
          to160(story.content || "") ||
          "Read a medical story on OmpathStudy—built for Kenyan medical and health students to learn, reflect, and grow.";
        ogImage = story.cover_image_url || OG_FALLBACK_IMAGE;
        keywords = `OmpathStudy, medical stories, reflective practice, ${story.category || ""}, medical students Kenya, nursing students Kenya`;
      }
    }

    const html = buildHtml({ title, description, url: absoluteUrl, ogImage, keywords });
    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        // short cache; content may change
        "cache-control": "public, max-age=60",
      },
    });
  } catch {
    // Fail closed with basic meta so crawlers still get something.
    const fallbackUrl = new URL(originalPath, url.origin).toString();
    const html = buildHtml({
      title: "OmpathStudy | Kenyan Medical Education Platform",
      description:
        "OmpathStudy helps medical and health students in Kenya study smarter with notes, flashcards, MCQs, essays and exams by year and unit.",
      url: fallbackUrl,
      ogImage: OG_FALLBACK_IMAGE,
    });
    return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  }
}

