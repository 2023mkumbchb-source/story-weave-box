export const config = {
  runtime: "edge",
};

const OG_FALLBACK_IMAGE = "https://ompath.azaniispproject.co.ke/og-default.png";

function isCrawler(userAgent: string | null): boolean {
  const ua = (userAgent || "").toLowerCase();
  if (!ua) return false;
  return (
    ua.includes("bot") ||
    ua.includes("crawl") ||
    ua.includes("spider") ||
    ua.includes("facebookexternalhit") ||
    ua.includes("whatsapp") ||
    ua.includes("telegram") ||
    ua.includes("discord") ||
    ua.includes("slack") ||
    ua.includes("linkedin") ||
    ua.includes("twitter") ||
    ua.includes("prerender") ||
    ua.includes("google") ||
    ua.includes("bing") ||
    ua.includes("semrush") ||
    ua.includes("ahrefs")
  );
}

function cleanForMetaSnippet(input: string): string {
  if (!input) return "";
  return input
    .replace(/^#+\s+/gm, "")
    .replace(/[*_`>|]/g, " ")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]+\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function to160(input: string): string {
  const s = cleanForMetaSnippet(input);
  if (!s) return "";
  return s.length <= 160 ? s : s.slice(0, 157).trimEnd() + "...";
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

function getSupabaseConfig() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      `Missing Supabase env vars. URL: ${url ? "SET" : "MISSING"}, KEY: ${key ? "SET" : "MISSING"}`
    );
  }
  return { url, key };
}

async function sbFetch(table: string, params: string) {
  const { url, key } = getSupabaseConfig();
  const res = await fetch(`${url}/rest/v1/${table}?${params}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Supabase error on ${table}: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function fetchArticleBySlug(slug: string) {
  const normalized = encodeURIComponent(decodeURIComponent(slug).trim().toLowerCase());
  const cols =
    "id,title,content,slug,published,deleted_at,meta_title,meta_description,excerpt,cover_image,image,og_image_url,created_at,updated_at,category";
  const rows = await sbFetch(
    "articles",
    `select=${cols}&slug=eq.${normalized}&published=eq.true&deleted_at=is.null&limit=1`
  );
  return rows && rows.length > 0 ? rows[0] : null;
}

async function fetchMcqSetById(id: string) {
  const cols = "id,title,category,questions,created_at,cover_image,image";
  const rows = await sbFetch(
    "mcq_sets",
    `select=${cols}&id=eq.${encodeURIComponent(id)}&published=eq.true&deleted_at=is.null&limit=1`
  );
  return rows && rows.length > 0 ? rows[0] : null;
}

async function fetchFlashcardSetById(id: string) {
  const cols = "id,title,category,cards,created_at,cover_image,image";
  const rows = await sbFetch(
    "flashcard_sets",
    `select=${cols}&id=eq.${encodeURIComponent(id)}&published=eq.true&deleted_at=is.null&limit=1`
  );
  return rows && rows.length > 0 ? rows[0] : null;
}

async function fetchEssayByIdOrSlug(param: string) {
  const decoded = encodeURIComponent(decodeURIComponent(param).trim());
  const cols =
    "id,slug,title,category,short_answer_questions,long_answer_questions,created_at,cover_image,image";
  const bySlug = await sbFetch(
    "essays",
    `select=${cols}&slug=eq.${decoded}&published=eq.true&deleted_at=is.null&limit=1`
  );
  if (bySlug && bySlug.length > 0) return bySlug[0];
  const byId = await sbFetch(
    "essays",
    `select=${cols}&id=eq.${decoded}&published=eq.true&deleted_at=is.null&limit=1`
  );
  return byId && byId.length > 0 ? byId[0] : null;
}

async function fetchStoryByParam(param: string) {
  const storyId = extractUuidFromParam(param);
  if (!storyId) return null;
  const cols = "id,title,content,category,cover_image_url,created_at";
  const rows = await sbFetch(
    "stories",
    `select=${cols}&id=eq.${encodeURIComponent(storyId)}&published=eq.true&deleted_at=is.null&limit=1`
  );
  return rows && rows.length > 0 ? rows[0] : null;
}

function buildHtml(opts: {
  title: string;
  description: string;
  url: string;
  ogImage: string;
  keywords?: string;
  type?: string;
  schemaJson?: string;
}) {
  const title = htmlEscape(opts.title);
  const desc = htmlEscape(opts.description);
  const url = htmlEscape(opts.url);
  const img = htmlEscape(opts.ogImage);
  const keywords = opts.keywords ? htmlEscape(opts.keywords) : "";
  const type = opts.type || "website";

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
    <meta property="og:type" content="${type}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${img}" />
    <meta property="og:site_name" content="OmpathStudy" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${desc}" />
    <meta name="twitter:image" content="${img}" />
    ${opts.schemaJson ? `<script type="application/ld+json">${opts.schemaJson}</script>` : ""}
  </head>
  <body>
    <h1>${title}</h1>
    <p>${desc}</p>
    <a href="${url}">View on OmpathStudy</a>
  </body>
</html>`;
}

export default async function handler(req: Request): Promise<Response> {
  const ua = req.headers.get("user-agent");
  const url = new URL(req.url);
  const originalPath = url.searchParams.get("path") || "/";

  if (!isCrawler(ua)) {
    return Response.redirect(new URL(originalPath, url.origin).toString(), 307);
  }

  try {
    const origin = url.origin;
    const absoluteUrl = new URL(originalPath, origin).toString();
    const parts = originalPath.split("?")[0].split("/").filter(Boolean);
    const section = parts[0] || "";
    const param = parts[1] || "";

    let title = "OmpathStudy | Kenyan Medical Education Platform";
    let description =
      "OmpathStudy helps medical and health students in Kenya study smarter with notes, flashcards, MCQs, essays and exams by year and unit.";
    let ogImage = OG_FALLBACK_IMAGE;
    let keywords =
      "OmpathStudy, medical students Kenya, nursing students Kenya, clinical notes, MCQs, flashcards, exam preparation, medical education Kenya";
    let type = "website";
    let schemaJson = "";

    if (section === "blog" && param) {
      const article = await fetchArticleBySlug(param);
      if (!article) {
        return new Response(
          `<html><body><h1>DEBUG: article not found</h1><p>slug: "${param}"</p><p>URL: ${process.env.VITE_SUPABASE_URL ? "SET" : "MISSING"}</p><p>KEY: ${process.env.VITE_SUPABASE_PUBLISHABLE_KEY ? "SET" : "MISSING"}</p></body></html>`,
          { status: 200, headers: { "content-type": "text/html" } }
        );
      }
      const rawTitle = article.meta_title || article.title;
      const rawDesc =
        article.meta_description ||
        article.summary ||
        article.excerpt ||
        article.content ||
        "";
      const cleanDesc =
        to160(rawDesc) ||
        `Study ${article.title} with OmpathStudy — medical notes and practice questions for students in Kenya.`;

      title = cleanForMetaSnippet(rawTitle);
      description = cleanDesc;
      ogImage =
        article.cover_image || article.image || article.og_image_url || OG_FALLBACK_IMAGE;
      keywords = `OmpathStudy, study notes Kenya, medical notes, ${article.category || ""}, clinical revision, exam prep, medical education Kenya`;
      type = "article";
      schemaJson = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title,
        description,
        image: ogImage,
        url: absoluteUrl,
        datePublished: article.created_at,
        dateModified: article.updated_at || article.created_at,
        author: { "@type": "Organization", name: "OmpathStudy" },
        publisher: { "@type": "Organization", name: "OmpathStudy" },
      });
    } else if (section === "mcqs" && param) {
      const id = extractUuidFromParam(param) || decodeURIComponent(param);
      const mcq = await fetchMcqSetById(id);
      if (mcq) {
        title = `${mcq.title} | MCQ Quiz | OmpathStudy Kenya`;
        description = to160(
          `Practice MCQs on ${mcq.title} with OmpathStudy. Built for Kenyan medical and health students to revise key concepts and prepare for exams.`
        );
        ogImage = mcq.cover_image || mcq.image || OG_FALLBACK_IMAGE;
        keywords = `OmpathStudy, MCQs Kenya, ${mcq.category || ""}, medical quizzes, nursing quizzes, exam practice, medical education Kenya`;
        type = "article";
        schemaJson = JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Quiz",
          name: title,
          description,
          url: absoluteUrl,
          datePublished: mcq.created_at,
          provider: { "@type": "Organization", name: "OmpathStudy" },
        });
      }
    } else if (section === "flashcards" && param) {
      const id = extractUuidFromParam(param) || decodeURIComponent(param);
      const set = await fetchFlashcardSetById(id);
      if (set) {
        title = `${set.title} | Flashcards | OmpathStudy Kenya`;
        description = to160(
          `Study flashcards on ${set.title} with OmpathStudy. Quick, focused revision for Kenyan medical and health students by unit and year.`
        );
        ogImage = set.cover_image || set.image || OG_FALLBACK_IMAGE;
        keywords = `OmpathStudy, flashcards Kenya, ${set.category || ""}, medical revision, nursing revision, exam prep, medical education Kenya`;
        type = "article";
      }
    } else if (section === "essays" && param) {
      const essay = await fetchEssayByIdOrSlug(param);
      if (essay) {
        title = `${essay.title} | Essays | OmpathStudy Kenya`;
        description = to160(
          `Practice SAQs and LAQs on ${essay.title} with OmpathStudy. Improve structured answering for Kenyan medical and health students.`
        );
        ogImage = essay.cover_image || essay.image || OG_FALLBACK_IMAGE;
        keywords = `OmpathStudy, essays Kenya, SAQ, LAQ, ${essay.category || ""}, written questions, exam technique, medical education Kenya`;
        type = "article";
      }
    } else if (section === "stories" && param) {
      const story = await fetchStoryByParam(param);
      if (story) {
        title = `${story.title} | Story | OmpathStudy Kenya`;
        description =
          to160(story.content || "") ||
          "Read a medical story on OmpathStudy — built for Kenyan medical and health students to learn, reflect, and grow.";
        ogImage = story.cover_image_url || OG_FALLBACK_IMAGE;
        keywords = `OmpathStudy, medical stories, reflective practice, ${story.category || ""}, medical students Kenya`;
        type = "article";
      }
    } else if (section === "year" && param) {
      const yr = param.replace(/[^0-9]/g, "");
      title = `Year ${yr} Study Materials | OmpathStudy Kenya`;
      description = `Browse Year ${yr} medical study notes, flashcards, MCQs, and essays on OmpathStudy for Kenyan health students.`;
      keywords = `OmpathStudy, Year ${yr} medical, Kenya medical students, clinical notes Year ${yr}`;
    }

    const html = buildHtml({
      title,
      description,
      url: absoluteUrl,
      ogImage,
      keywords,
      type,
      schemaJson,
    });
    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return new Response(
      `<html><body><h1>DEBUG ERROR</h1><pre>${errMsg}</pre></body></html>`,
      { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }
}
