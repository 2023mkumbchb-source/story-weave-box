const SUPABASE_URL = "https://lkgfzjwhmfjvntzphbsh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrZ2Z6andobWZqdm50enBoYnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3Nzk5MjIsImV4cCI6MjA4NzM1NTkyMn0.a2QY6TxzKNM2AhuuoDkgdKifI3XhSGhYRlhpqZpvAwo";

async function fetchFromSupabase(table, field, value) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${field}=eq.${encodeURIComponent(value)}&select=*&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  const data = await res.json();
  return data?.[0] || null;
}

function buildHTML({ title, description, content, url, image }) {
  const safeTitle = (title || "Kenya Meds").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeDesc = (description || "Medical study platform for Kenyan students").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeContent = (content || "").replace(/</g, "&lt;").replace(/>/g, "&gt;").slice(0, 5000);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}"/>
  <meta property="og:title" content="${safeTitle}"/>
  <meta property="og:description" content="${safeDesc}"/>
  <meta property="og:type" content="article"/>
  <meta property="og:url" content="${url || "https://medicine.kenyaadverts.co.ke"}"/>
  ${image ? `<meta property="og:image" content="${image}"/>` : ""}
  <meta name="robots" content="index, follow"/>
</head>
<body>
  <h1>${safeTitle}</h1>
  <p>${safeDesc}</p>
  <div>${safeContent}</div>
</body>
</html>`;
}

export default async function handler(req, res) {
  const { slug, story, mcq, flashcard, essay, prerender, year } = req.query;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");

  try {
    let record = null;
    let pageUrl = "https://medicine.kenyaadverts.co.ke";

    if (slug) {
      // Try matching full slug first, then strip UUID prefix (first segment if it looks like a UUID)
      record = await fetchFromSupabase("articles", "slug", slug);
      if (!record) {
        // Strip UUID prefix: fd8be49b-6be4-4563-b157-23efe7ba3be8-basic-pharmacology → basic-pharmacology
        const stripped = slug.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-?/, "");
        record = await fetchFromSupabase("articles", "slug", stripped);
      }
      if (!record) {
        // Try matching by id (UUID part only)
        const uuidMatch = slug.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/);
        if (uuidMatch) record = await fetchFromSupabase("articles", "id", uuidMatch[1]);
      }
      pageUrl = `https://medicine.kenyaadverts.co.ke/blog/${slug}`;
      if (record) {
        return res.status(200).send(buildHTML({
          title: record.title,
          description: record.excerpt || record.meta_description || `${record.title} - Kenya Meds`,
          content: record.content,
          url: pageUrl,
          image: record.cover_image || record.image_url,
        }));
      }
    }

    if (mcq) {
      record = await fetchFromSupabase("mcq_sets", "id", mcq);
      if (!record) record = await fetchFromSupabase("mcq_sets", "slug", mcq);
      pageUrl = `https://medicine.kenyaadverts.co.ke/mcqs/${mcq}`;
      if (record) {
        return res.status(200).send(buildHTML({
          title: record.title,
          description: record.description || `${record.title} MCQs - Kenya Meds`,
          content: record.description,
          url: pageUrl,
        }));
      }
    }

    if (flashcard) {
      record = await fetchFromSupabase("flashcard_sets", "id", flashcard);
      pageUrl = `https://medicine.kenyaadverts.co.ke/flashcards/${flashcard}`;
      if (record) {
        return res.status(200).send(buildHTML({
          title: record.title,
          description: record.description || `${record.title} Flashcards - Kenya Meds`,
          content: record.description,
          url: pageUrl,
        }));
      }
    }

    if (essay) {
      record = await fetchFromSupabase("essays", "id", essay);
      pageUrl = `https://medicine.kenyaadverts.co.ke/essays/${essay}`;
      if (record) {
        return res.status(200).send(buildHTML({
          title: record.title,
          description: record.description || `${record.title} - Kenya Meds`,
          content: record.content,
          url: pageUrl,
        }));
      }
    }

    if (story) {
      record = await fetchFromSupabase("stories", "id", story);
      pageUrl = `https://medicine.kenyaadverts.co.ke/stories/${story}`;
      if (record) {
        return res.status(200).send(buildHTML({
          title: record.title,
          description: record.description || `${record.title} - Kenya Meds`,
          content: record.content,
          url: pageUrl,
        }));
      }
    }

    // Prerender listing pages
    const pageTitles = {
      blog: "Medical Blog Posts - Kenya Meds",
      mcqs: "Medical MCQs - Kenya Meds",
      flashcards: "Medical Flashcards - Kenya Meds",
      essays: "Medical Essays - Kenya Meds",
      stories: "Medical Stories - Kenya Meds",
      exams: "Medical Exams - Kenya Meds",
    };
    if (prerender && pageTitles[prerender]) {
      return res.status(200).send(buildHTML({
        title: pageTitles[prerender],
        description: `Study ${prerender} for Kenyan medical students on Kenya Meds`,
        url: `https://medicine.kenyaadverts.co.ke/${prerender}`,
      }));
    }

    // Fallback
    return res.status(200).send(buildHTML({
      title: "Kenya Meds – Medical Study Platform",
      description: "Medical study platform for Kenyan students",
      url: "https://medicine.kenyaadverts.co.ke",
    }));

  } catch (error) {
    console.error("OG Proxy Error:", error);
    return res.status(500).send(buildHTML({
      title: "Kenya Meds",
      description: "Medical study platform",
    }));
  }
}