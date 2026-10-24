export default async function handler(req, res) {
  try {
    const file = typeof req.query?.file === "string" ? req.query.file : "all.xml";
    const upstream = await fetch(`https://lkgfzjwhmfjvntzphbsh.supabase.co/functions/v1/generate-sitemap?file=${encodeURIComponent(file)}`, {
      method: "GET",
      headers: { Accept: "application/xml,text/xml;q=0.9,*/*;q=0.8" },
    });

    const rawXml = await upstream.text();
    const excluded = [
      "https://www.ompathstudy.com/sitemap.xml",
      "https://www.ompathstudy.com/sitemap-dynamic.xml",
      "https://www.ompathstudy.com/blog/victory-school-club-membership-system-project-guide",
    ];
    let xml = excluded.reduce((body, loc) => {
      const escaped = loc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return body.replace(new RegExp(`\\s*<url>\\s*<loc>${escaped}<\\/loc>[\\s\\S]*?<\\/url>`, "g"), "");
    }, rawXml);

    const isSectionFile = file !== "all.xml";
    // Keep these intentionally unlinked public landing pages discoverable via the sitemap.
    if ((file === "all.xml" || file === "pages.xml") && xml.includes("</urlset>")) {
      const hiddenPublicPages = [
        ["/looking-for-a-friend-in-thika", "0.6"],
        ["/medical-student-support-kenya", "0.7"],
      ];
      const additions = hiddenPublicPages
        .filter(([path]) => !xml.includes("https://www.ompathstudy.com" + path))
        .map(([path, priority]) => "  <url><loc>https://www.ompathstudy.com" + path + "</loc><priority>" + priority + "</priority><changefreq>monthly</changefreq></url>")
        .join("\n");
      if (additions) xml = xml.replace("</urlset>", additions + "\n</urlset>");
    }

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    if (!upstream.ok || (!isSectionFile && !xml.includes("<url>"))) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(502).send("<?xml version=\"1.0\" encoding=\"UTF-8\"?><error>Sitemap source unavailable</error>");
    }
    return res.status(200).send(xml);
  } catch {
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).send("<?xml version=\"1.0\" encoding=\"UTF-8\"?><error>Sitemap source unavailable</error>");
  }
}
