// Vercel Serverless Function to proxy crawler requests to Supabase og-preview
// This allows bot indexing without modifying Supabase directly.

export default async function handler(req, res) {
  const { slug, story, mcq, flashcard, essay, prerender, year } = req.query;
  const SUPABASE_URL = "https://lkgfzjwhmfjvntzphbsh.supabase.co/functions/v1/og-preview";
  
  // Construct the target URL with original query params
  const targetUrl = new URL(SUPABASE_URL);
  if (slug) targetUrl.searchParams.set("slug", slug);
  if (story) targetUrl.searchParams.set("story", story);
  if (mcq) targetUrl.searchParams.set("mcq", mcq);
  if (flashcard) targetUrl.searchParams.set("flashcard", flashcard);
  if (essay) targetUrl.searchParams.set("essay", essay);
  if (prerender) targetUrl.searchParams.set("prerender", prerender);
  if (year) targetUrl.searchParams.set("year", year);

  try {
    const response = await fetch(targetUrl.toString(), {
      headers: {
        "user-agent": req.headers["user-agent"] || "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      },
    });

    const html = await response.text();
    
    // Set headers for indexing
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    
    return res.status(response.ok ? 200 : 502).send(html || "Error fetching preview");
  } catch (error) {
    console.error("OG Proxy Error:", error);
    return res.status(500).send("Internal Server Error");
  }
}
