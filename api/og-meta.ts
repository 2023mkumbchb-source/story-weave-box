export const config = {
  runtime: "edge",
};

const OG_FALLBACK_IMAGE = "https://www.ompathstudy.com/og-default.png";

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
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^(summary|introduction|overview|note)[:\s]*/i, "")
    .replace(/[*_`>|]/g, " ")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]+\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanQuestionStem(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^Question\s+\d+[\s:\-]*/i, "")
    .replace(/\s*-\s*\(\s*$/, "")
    .replace(/[*_`>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanOption(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/^[A-E][.)]\s*/i, "")
    .replace(/\s*-\s*\(\s*$/, "")
    .replace(/\s*\(\s*$/, "")
    .replace(/\s*-\s*$/, "")
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
    "id,title,content,slug,published,deleted_at,meta_title,meta_description,og_image_url,created_at,updated_at,category";
  const rows = await sbFetch(
    "articles",
    `select=${cols}&slug=eq.${normalized}&published=eq.true&deleted_at=is.null&limit=1`
  );
  return rows && rows.length > 0 ? rows[0] : null;
}

async function fetchMcqSetBySlugOrId(param: string) {
  const cols = "id,title,category,questions,slug,created_at";
  const decoded = decodeURIComponent(param).trim();

  const bySlug = await sbFetch(
    "mcq_sets",
    `select=${cols}&slug=eq.${encodeURIComponent(decoded)}&published=eq.true&deleted_at=is.null&limit=1`
  );
  if (bySlug && bySlug.length > 0) return bySlug[0];

  const id = extractUuidFromParam(param);
  if (!id) return null;
  const byId = await sbFetch(
    "mcq_sets",
    `select=${cols}&id=eq.${encodeURIComponent(id)}&published=eq.true&deleted_at=is.null&limit=1`
  );
  return byId && byId.length > 0 ? byId[0] : null;
}

async function fetchFlashcardSetBySlugOrId(param: string) {
  const cols = "id,title,category,cards,slug,created_at";
  const decoded = decodeURIComponent(param).trim();

  const bySlug = await sbFetch(
    "flashcard_sets",
    `select=${cols}&slug=eq.${encodeURIComponent(decoded)}&published=eq.true&deleted_at=is.null&limit=1`
  );
  if (bySlug && bySlug.length > 0) return bySlug[0];

  const id = extractUuidFromParam(param);
  if (!id) return null;
  const byId = await sbFetch(
    "flashcard_sets",
    `select=${cols}&id=eq.${encodeURIComponent(id)}&published=eq.true&deleted_at=is.null&limit=1`
  );
  return byId && byId.length > 0 ? byId[0] : null;
}

async function fetchEssayByIdOrSlug(param: string) {
  const cols = "id,slug,title,category,created_at";
  const decoded = decodeURIComponent(param).trim();

  const bySlug = await sbFetch(
    "essays",
    `select=${cols}&slug=eq.${encodeURIComponent(decoded)}&published=eq.true&deleted_at=is.null&limit=1`
  );
  if (bySlug && bySlug.length > 0) return bySlug[0];

  const byId = await sbFetch(
    "essays",
    `select=${cols}&id=eq.${encodeURIComponent(decoded)}&published=eq.true&deleted_at=is.null&limit=1`
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

interface ParsedQuestion {
  stem: string;
  options: string[];
  correctText: string;
  explanation: string;
}

function parseQuestion(q: unknown): ParsedQuestion | null {
  if (!q || typeof q !== "object") return null;
  const obj = q as Record<string, unknown>;

  const rawStem =
    (typeof obj.question === "string" ? obj.question : "") ||
    (typeof obj.stem === "string" ? obj.stem : "") ||
    (typeof obj.text === "string" ? obj.text : "") ||
    (typeof obj.q === "string" ? obj.q : "");
  const stem = cleanQuestionStem(rawStem);
  if (!stem) return null;

  const rawExplanation =
    typeof obj.explanation === "string" ? obj.explanation.trim() : "";
  const explanationPrefix = rawExplanation.slice(0, 30).toLowerCase();

  const options: string[] = [];
  if (Array.isArray(obj.options)) {
    for (const o of obj.options) {
      let raw = "";
      if (typeof o === "string") raw = o;
      else if (o && typeof o === "object") {
        const oo = o as Record<string, unknown>;
        raw =
          (typeof oo.text === "string" ? oo.text : "") ||
          (typeof oo.label === "string" ? oo.label : "");
      }
      if (!raw) continue;
      if (explanationPrefix && raw.trim().toLowerCase().startsWith(explanationPrefix)) continue;
      const cleaned = cleanOption(raw);
      if (!cleaned || cleaned.length < 3) continue;
      options.push(cleaned);
    }
  }

  const correctIdx =
    typeof obj.correct_answer === "number"
      ? obj.correct_answer
      : typeof obj.correct === "number"
      ? obj.correct
      : typeof obj.correctIndex === "number"
      ? obj.correctIndex
      : typeof obj.answer === "number"
      ? obj.answer
      : -1;

  const correctText =
    typeof obj.correctAnswer === "string"
      ? cleanOption(obj.correctAnswer)
      : correctIdx >= 0 && options[correctIdx]
      ? options[correctIdx]
      : options[0] || "";

  const explanation =
    typeof obj.explanation === "string"
      ? cleanForMetaSnippet(obj.explanation)
      : "";

  return { stem, options, correctText, explanation };
}

function getCardFront(c: unknown): string {
  if (!c || typeof c !== "object") return "";
  const obj = c as Record<string, unknown>;
  const raw =
    (typeof obj.front === "string" ? obj.front : "") ||
    (typeof obj.question === "string" ? obj.question : "") ||
    (typeof obj.term === "string" ? obj.term : "") ||
    (typeof obj.q === "string" ? obj.q : "");
  return cleanForMetaSnippet(raw);
}

function getCardBack(c: unknown): string {
  if (!c || typeof c !== "object") return "";
  const obj = c as Record<string, unknown>;
  const raw =
    (typeof obj.back === "string" ? obj.back : "") ||
    (typeof obj.answer === "string" ? obj.answer : "") ||
    (typeof obj.definition === "string" ? obj.definition : "") ||
    (typeof obj.a === "string" ? obj.a : "");
  return cleanForMetaSnippet(raw);
}

function buildHtml(opts: {
  title: string;
  description: string;
  url: string;
  ogImage: string;
  keywords?: string;
  type?: string;
  schemaJson?: string;
  bodyExtra?: string;
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
    ${opts.bodyExtra || ""}
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
    const origin = "https://www.ompathstudy.com";
    const absoluteUrl = `${origin}${originalPath.split("?")[0]}`;
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
    let bodyExtra = "";

    if (section === "blog" && param) {
      const article = await fetchArticleBySlug(param);
      if (!article) {
        return new Response(
          `<html><body><h1>Page not found</h1><p>This article does not exist.</p></body></html>`,
          { status: 404, headers: { "content-type": "text/html" } }
        );
      }
      const rawTitle = article.meta_title || article.title;
      const rawDesc = article.meta_description || article.content || "";
      const cleanDesc =
        to160(rawDesc) ||
        `Study ${article.title} with OmpathStudy — medical notes and practice questions for students in Kenya.`;

      title = cleanForMetaSnippet(rawTitle) + " | OmpathStudy Kenya";
      description = cleanDesc;
      ogImage = article.og_image_url || OG_FALLBACK_IMAGE;
      keywords = `OmpathStudy, study notes Kenya, medical notes, ${article.category || ""}, clinical revision, exam prep, medical education Kenya`;
      type = "article";
      schemaJson = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        headline: cleanForMetaSnippet(rawTitle),
        description,
        image: ogImage,
        url: absoluteUrl,
        datePublished: article.created_at,
        dateModified: article.updated_at || article.created_at,
        author: { "@type": "Organization", name: "OmpathStudy" },
        publisher: { "@type": "Organization", name: "OmpathStudy" },
      });
      if (article.content) {
        bodyExtra = `<div>${htmlEscape(cleanForMetaSnippet(article.content).slice(0, 5000))}</div>`;
      }

    } else if (section === "mcqs" && param) {
      const mcq = await fetchMcqSetBySlugOrId(param);
      if (!mcq) {
        return new Response(
          `<html><body><h1>Page not found</h1><p>This MCQ set does not exist.</p></body></html>`,
          { status: 404, headers: { "content-type": "text/html" } }
        );
      }
      const rawQuestions: unknown[] = Array.isArray(mcq.questions) ? mcq.questions : [];
      const parsed = rawQuestions.map(parseQuestion).filter((p): p is ParsedQuestion => p !== null);
      const qCount = rawQuestions.length;

      title = `${mcq.title} | MCQ Quiz | OmpathStudy Kenya`;
      description = to160(
        `Practice ${qCount > 0 ? qCount + " " : ""}MCQs on ${mcq.title} with OmpathStudy. Built for Kenyan medical and health students to revise key concepts and prepare for exams.`
      );
      ogImage = OG_FALLBACK_IMAGE;
      keywords = `OmpathStudy, MCQs Kenya, ${mcq.category || ""}, medical quizzes, nursing quizzes, exam practice, medical education Kenya`;
      type = "article";

      if (parsed.length > 0) {
        const items = parsed.map((p, i) => {
          const optionsList = p.options.length > 0
            ? `<ul>${p.options.map(o => `<li>${htmlEscape(o)}</li>`).join("")}</ul>`
            : "";
          const answerLine = p.correctText
            ? `<p><strong>Answer:</strong> ${htmlEscape(p.correctText)}</p>`
            : "";
          const explanationLine = p.explanation
            ? `<p><strong>Explanation:</strong> ${htmlEscape(p.explanation)}</p>`
            : "";
          return `<li>
<p><strong>Q${i + 1}.</strong> ${htmlEscape(p.stem)}</p>
${optionsList}
${answerLine}
${explanationLine}
</li>`;
        });
        bodyExtra = `<h2>Questions, Answers &amp; Explanations</h2>\n<ol>\n${items.join("\n")}\n</ol>`;
      }

      const schemaQuestions = parsed.slice(0, 50).map((p) => {
        const item: Record<string, unknown> = {
          "@type": "Question",
          name: p.stem,
        };
        if (p.correctText) {
          item.acceptedAnswer = {
            "@type": "Answer",
            text: p.correctText + (p.explanation ? " — " + p.explanation : ""),
          };
        }
        return item;
      });

      schemaJson = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Quiz",
        name: title,
        description,
        url: absoluteUrl,
        datePublished: mcq.created_at,
        provider: { "@type": "Organization", name: "OmpathStudy" },
        ...(schemaQuestions.length > 0 ? { hasPart: schemaQuestions } : {}),
      });

    } else if (section === "flashcards" && param) {
      const set = await fetchFlashcardSetBySlugOrId(param);
      if (!set) {
        return new Response(
          `<html><body><h1>Page not found</h1><p>This flashcard set does not exist.</p></body></html>`,
          { status: 404, headers: { "content-type": "text/html" } }
        );
      }
      const cards: unknown[] = Array.isArray(set.cards) ? set.cards : [];
      const cardCount = cards.length;

      title = `${set.title} | Flashcards | OmpathStudy Kenya`;
      description = to160(
        `Study ${cardCount > 0 ? cardCount + " " : ""}flashcards on ${set.title} with OmpathStudy. Quick, focused revision for Kenyan medical and health students by unit and year.`
      );
      ogImage = OG_FALLBACK_IMAGE;
      keywords = `OmpathStudy, flashcards Kenya, ${set.category || ""}, medical revision, nursing revision, exam prep, medical education Kenya`;
      type = "article";

      const cardItems = cards.map((c, i) => {
        const front = getCardFront(c);
        const back = getCardBack(c);
        if (!front) return "";
        const backLine = back ? `<p><strong>Answer:</strong> ${htmlEscape(back)}</p>` : "";
        return `<li><p><strong>Q${i + 1}.</strong> ${htmlEscape(front)}</p>${backLine}</li>`;
      }).filter(Boolean);

      if (cardItems.length > 0) {
        bodyExtra = `<h2>Flashcards</h2>\n<ol>\n${cardItems.join("\n")}\n</ol>`;
      }

    } else if (section === "exams" && param) {
      const examId = param.replace(/\/start$/, "");
      const exam = await fetchMcqSetBySlugOrId(examId);
      if (exam) {
        const qCount = Array.isArray(exam.questions) ? exam.questions.length : 0;
        title = `${exam.title} | Timed Exam | OmpathStudy Kenya`;
        description = `Take a timed ${qCount}-question MCQ exam on ${exam.title} with OmpathStudy. Built for Kenyan medical and health students.`;
        keywords = `OmpathStudy, timed exam Kenya, MCQ exam, ${exam.category || ""}, medical exams Kenya, exam preparation`;
        schemaJson = JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Quiz",
          name: title,
          description,
          url: absoluteUrl,
          provider: { "@type": "Organization", name: "OmpathStudy" },
        });
        bodyExtra = `<p>Timed exam with ${qCount} MCQs. Unit: ${exam.category || "General"}. Available to Kenyan health students on OmpathStudy.</p>`;
      }

    } else if (section === "essays" && param) {
      const essay = await fetchEssayByIdOrSlug(param);
      if (!essay) {
        return new Response(
          `<html><body><h1>Page not found</h1><p>This essay does not exist.</p></body></html>`,
          { status: 404, headers: { "content-type": "text/html" } }
        );
      }
      title = `${essay.title} | Essays | OmpathStudy Kenya`;
      description = to160(
        `Practice SAQs and LAQs on ${essay.title} with OmpathStudy. Improve structured answering for Kenyan medical and health students.`
      );
      ogImage = OG_FALLBACK_IMAGE;
      keywords = `OmpathStudy, essays Kenya, SAQ, LAQ, ${essay.category || ""}, written questions, exam technique, medical education Kenya`;
      type = "article";

    } else if (section === "stories" && param) {
      const story = await fetchStoryByParam(param);
      if (!story) {
        return new Response(
          `<html><body><h1>Page not found</h1><p>This story does not exist.</p></body></html>`,
          { status: 404, headers: { "content-type": "text/html" } }
        );
      }
      title = `${story.title} | Story | OmpathStudy Kenya`;
      description =
        to160(story.content || "") ||
        "Read a medical story on OmpathStudy — built for Kenyan medical and health students to learn, reflect, and grow.";
      ogImage = story.cover_image_url || OG_FALLBACK_IMAGE;
      keywords = `OmpathStudy, medical stories, reflective practice, ${story.category || ""}, medical students Kenya`;
      type = "article";

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
      bodyExtra,
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
      `<html><body><h1>Error</h1><pre>${htmlEscape(errMsg)}</pre></body></html>`,
      { status: 500, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }
}
