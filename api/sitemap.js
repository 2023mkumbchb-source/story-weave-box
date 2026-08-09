export default async function handler(req, res) {
  try {
    const file = typeof req.query?.file === "string" ? req.query.file : "all.xml";
    const upstream = await fetch(`https://dekyjrfwvavtoivqivno.supabase.co/functions/v1/generate-sitemap?file=${encodeURIComponent(file)}`, {
      method: "GET",
      headers: { Accept: "application/xml,text/xml;q=0.9,*/*;q=0.8" },
    });

    const rawXml = await upstream.text();
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.ompathstudy.com/</loc><priority>1.0</priority><changefreq>daily</changefreq></url>
  <url><loc>https://www.ompathstudy.com/blog</loc><priority>0.9</priority><changefreq>daily</changefreq></url>
  <url><loc>https://www.ompathstudy.com/mcqs</loc><priority>0.8</priority><changefreq>daily</changefreq></url>
  <url><loc>https://www.ompathstudy.com/flashcards</loc><priority>0.8</priority><changefreq>daily</changefreq></url>
  <url><loc>https://www.ompathstudy.com/exams</loc><priority>0.8</priority><changefreq>weekly</changefreq></url>
  <url><loc>https://www.ompathstudy.com/stories</loc><priority>0.8</priority><changefreq>daily</changefreq></url>
  <url><loc>https://www.ompathstudy.com/year/1</loc><priority>0.8</priority><changefreq>weekly</changefreq></url>
  <url><loc>https://www.ompathstudy.com/year/2</loc><priority>0.8</priority><changefreq>weekly</changefreq></url>
  <url><loc>https://www.ompathstudy.com/year/3</loc><priority>0.8</priority><changefreq>weekly</changefreq></url>
  <url><loc>https://www.ompathstudy.com/year/4</loc><priority>0.8</priority><changefreq>weekly</changefreq></url>
  <url><loc>https://www.ompathstudy.com/year/5</loc><priority>0.8</priority><changefreq>weekly</changefreq></url>
  <url><loc>https://www.ompathstudy.com/year/6</loc><priority>0.8</priority><changefreq>weekly</changefreq></url>
</urlset>`;
    const excluded = [
      "https://www.ompathstudy.com/sitemap.xml",
      "https://www.ompathstudy.com/sitemap-dynamic.xml",
      "https://www.ompathstudy.com/blog/victory-school-club-membership-system-project-guide",
    ];
    const xml = excluded.reduce((body, loc) => {
      const escaped = loc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return body.replace(new RegExp(`\\s*<url>\\s*<loc>${escaped}<\\/loc>[\\s\\S]*?<\\/url>`, "g"), "");
    }, rawXml);

    const isSectionFile = file !== "all.xml";

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).send(upstream.ok && (isSectionFile || xml.includes("<url>")) ? xml : fallbackXml);
  } catch {
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.ompathstudy.com/</loc><priority>1.0</priority><changefreq>daily</changefreq></url>
  <url><loc>https://www.ompathstudy.com/blog</loc><priority>0.9</priority><changefreq>daily</changefreq></url>
  <url><loc>https://www.ompathstudy.com/mcqs</loc><priority>0.8</priority><changefreq>daily</changefreq></url>
  <url><loc>https://www.ompathstudy.com/flashcards</loc><priority>0.8</priority><changefreq>daily</changefreq></url>
  <url><loc>https://www.ompathstudy.com/exams</loc><priority>0.8</priority><changefreq>weekly</changefreq></url>
  <url><loc>https://www.ompathstudy.com/stories</loc><priority>0.8</priority><changefreq>daily</changefreq></url>
  <url><loc>https://www.ompathstudy.com/year/1</loc><priority>0.8</priority><changefreq>weekly</changefreq></url>
  <url><loc>https://www.ompathstudy.com/year/2</loc><priority>0.8</priority><changefreq>weekly</changefreq></url>
  <url><loc>https://www.ompathstudy.com/year/3</loc><priority>0.8</priority><changefreq>weekly</changefreq></url>
  <url><loc>https://www.ompathstudy.com/year/4</loc><priority>0.8</priority><changefreq>weekly</changefreq></url>
  <url><loc>https://www.ompathstudy.com/year/5</loc><priority>0.8</priority><changefreq>weekly</changefreq></url>
  <url><loc>https://www.ompathstudy.com/year/6</loc><priority>0.8</priority><changefreq>weekly</changefreq></url>
</urlset>`;
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=3600");
    return res.status(200).send(fallbackXml);
  }
}
