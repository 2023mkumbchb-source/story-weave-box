export default async function handler(req, res) {
  try {
    const upstream = await fetch("https://lkgfzjwhmfjvntzphbsh.supabase.co/functions/v1/generate-sitemap", {
      method: "GET",
      headers: { Accept: "application/xml,text/xml;q=0.9,*/*;q=0.8" },
    });

    const xml = await upstream.text();

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
    return res.status(upstream.ok ? 200 : 502).send(xml || "<?xml version=\"1.0\" encoding=\"UTF-8\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"></urlset>");
  } catch {
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    return res.status(500).send("<?xml version=\"1.0\" encoding=\"UTF-8\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"></urlset>");
  }
}
