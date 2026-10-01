// Runs after `vite build`. Writes a real HTML page for every library folder and course outline, so that
//   * Google can index every folder and file title (the app itself is a single-page app), and
//   * WhatsApp / Telegram / Facebook show the right title, description and thumbnail when a link is shared
//     (they do not run JavaScript).
// Output: dist/library/<year>/<folder>/.../index.html, dist/course-outlines/..., dist/library-sitemap.xml
// This step never fails the build: if anything goes wrong the site still deploys, just without the extra pages.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { countFiles, fileBlurb, folderMeta, libraryPath, outlineMeta, prettyTitle, timetableMeta } from "../../src/lib/libraryMeta.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dist = path.join(root, "dist");

try {
  const registry = JSON.parse(fs.readFileSync(path.join(root, "src/data/libraries.json"), "utf8"));
  const template = fs.readFileSync(path.join(dist, "index.html"), "utf8");
  const outlines = JSON.parse(fs.readFileSync(path.join(root, "src/data/courseOutlines.json"), "utf8"));
  const site = registry.siteUrl;

  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const setTag = (html, re, tag) => (re.test(html) ? html.replace(re, tag) : html.replace("</head>", `    ${tag}\n  </head>`));

  function render({ title, description, path: pagePath, image, keywords, body, jsonLd }) {
    const url = `${site}${pagePath}`;
    const img = `${site}${image}`;
    let html = template;
    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
    html = setTag(html, /<meta name="description"[^>]*>/, `<meta name="description" content="${esc(description)}" />`);
    html = setTag(html, /<meta name="keywords"[^>]*>/, `<meta name="keywords" content="${esc(keywords.join(", "))}">`);
    html = setTag(html, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}" />`);
    html = setTag(html, /<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}" />`);
    html = setTag(html, /<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(title)}" />`);
    html = setTag(html, /<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(description)}" />`);
    html = setTag(html, /<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${img}">`);
    html = setTag(html, /<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${esc(title)}" />`);
    html = setTag(html, /<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${esc(description)}" />`);
    html = setTag(html, /<meta name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${img}">`);
    const extra = [
      `<meta property="og:site_name" content="${esc(registry.brand)}" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta property="og:image:alt" content="${esc(title)}" />`,
      `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`,
    ].join("\n    ");
    html = html.replace("</head>", `    ${extra}\n  </head>`);
    html = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
    return html;
  }

  const shell = (inner) =>
    `<main style="max-width:960px;margin:0 auto;padding:24px 20px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.55;color:#14302b">${inner}</main>`;
  const crumbs = (items) => `<nav aria-label="Breadcrumb" style="font-size:14px;margin-bottom:12px">${items.map(([label, href]) => (href ? `<a href="${href}">${esc(label)}</a>` : esc(label))).join(" › ")}</nav>`;
  const credit = `<p style="margin-top:28px;font-size:14px"><strong>${esc(registry.credit)}</strong> · ${esc(registry.brand)} · shared for ${esc(registry.audience)}.</p>`;

  const written = [];
  const write = (urlPath, html, lastmod) => {
    const dir = path.join(dist, urlPath.replace(/^\//, ""));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), html);
    written.push({ urlPath, lastmod });
  };

  // ---------------- library folders ----------------
  for (const def of registry.libraries) {
    const data = JSON.parse(fs.readFileSync(path.join(root, "public/data", def.dataFile), "utf8"));
    const total = data.d.reduce((s, n) => s + countFiles(n), 0);

    const visit = (nodes, chain) => {
      const meta = folderMeta(registry, def, chain, total);
      const slugs = chain.map((n) => n.s);
      const trail = [["Home", "/"], [def.label, `/year/${def.year}`], [def.title, libraryPath(def)]];
      chain.forEach((n, i) => trail.push([n.n, i === chain.length - 1 ? null : libraryPath(def, slugs.slice(0, i + 1))]));
      const folders = nodes.map((n) => `<li><a href="${libraryPath(def, [...slugs, n.s])}">${esc(n.n)}</a> — ${countFiles(n).toLocaleString("en")} files</li>`).join("");
      const here = chain.length ? chain[chain.length - 1] : null;
      const trailNames = [def.label, ...chain.map((n) => n.n)];
      const files = (here?.f ?? []).map((f) => `<li>${esc(prettyTitle(f[1]))} — ${esc(fileBlurb(f[2], trailNames))}</li>`).join("");
      const body = shell(
        crumbs(trail) +
        `<h1>${esc(meta.h1)}</h1><p>${esc(meta.description)}</p>` +
        (folders ? `<h2>Folders</h2><ul>${folders}</ul>` : "") +
        (files ? `<h2>Files in this folder</h2><ul>${files}</ul>` : "") +
        credit,
      );
      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: meta.h1,
        description: meta.description,
        url: `${site}${meta.path}`,
        isPartOf: { "@type": "WebSite", name: registry.brand, url: site },
        author: { "@type": "Person", name: "Abongo" },
        educationalLevel: `${def.label} MBChB`,
        audience: { "@type": "EducationalAudience", educationalRole: "student" },
        inLanguage: "en",
        ...(here?.f?.length ? { hasPart: here.f.slice(0, 150).map((f) => ({ "@type": "CreativeWork", name: prettyTitle(f[1]), description: `${fileBlurb(f[2], trailNames)}. ${registry.credit}.`, educationalLevel: `${def.label} MBChB`, author: { "@type": "Person", name: "Abongo" } })) } : {}),
      };
      write(meta.path, render({ title: meta.title, description: meta.description, path: meta.path, image: meta.ogImage, keywords: meta.keywords, body, jsonLd }), data.updated);
      for (const n of nodes) visit(n.d ?? [], [...chain, n]);
    };
    // root page, then every folder below it
    const walk = (nodes, chain) => {
      visit(nodes, chain);
    };
    walk(data.d, []);
  }

  // ---------------- course outlines ----------------
  const idx = registry.outlines.map((o) => `<li><a href="/course-outlines/${o.slug}">${esc(o.title)}</a> — ${esc(o.tagline)}</li>`).join("");
  const allMeta = {
    title: `Year 4 Course Outlines & Progress Tracker | ${registry.brand}`,
    description: `Year 4 MBChB course outlines for Psychiatry, Internal Medicine and Clinical Pharmacology with a tick-off checklist. For ${registry.audience}. ${registry.credit}.`,
    path: "/course-outlines",
    image: "/og/library/outline-all.jpg",
    keywords: ["Year 4 course outline", "MBChB course outline", "MKU psychiatry course outline", "internal medicine course outline", "pharmacology course outline"],
  };
  write(allMeta.path, render({ ...allMeta, body: shell(crumbs([["Home", "/"], ["Year 4", "/year/4"], ["Course outlines", null]]) + `<h1>Year 4 course outlines &amp; progress tracker</h1><p>${esc(allMeta.description)}</p><ul>${idx}</ul>${credit}`), jsonLd: { "@context": "https://schema.org", "@type": "CollectionPage", name: allMeta.title, url: `${site}${allMeta.path}`, author: { "@type": "Person", name: "Abongo" } } }), undefined);

  for (const reg of registry.outlines) {
    const meta = outlineMeta(registry, reg);
    const outline = outlines.find((o) => o.id === reg.slug);
    if (!outline) continue;
    const sections = outline.sections.map((s) => `<h2>${esc(s.title)}</h2>${s.note ? `<p>${esc(s.note)}</p>` : ""}<ul>${s.items.map((i) => `<li>${i.week ? `<strong>${esc(i.week)}</strong> ` : ""}${esc(i.title)}${i.detail ? ` — ${esc(i.detail)}` : ""}</li>`).join("")}</ul>`).join("");
    const body = shell(crumbs([["Home", "/"], ["Year 4", "/year/4"], ["Course outlines", "/course-outlines"], [reg.department, null]]) + `<h1>${esc(outline.title)}</h1><p>${esc(outline.summary)}</p>${sections}${credit}`);
    write(meta.path, render({ title: meta.title, description: meta.description, path: meta.path, image: meta.ogImage, keywords: [`${reg.department} course outline`, "Year 4 MBChB", "MKU course outline"], body, jsonLd: { "@context": "https://schema.org", "@type": "Course", name: outline.title, description: meta.description, provider: { "@type": "CollegeOrUniversity", name: "Mount Kenya University" }, author: { "@type": "Person", name: "Abongo" }, url: `${site}${meta.path}` } }), undefined);
  }


  // ---------------- timetables ----------------
  const ttData = JSON.parse(fs.readFileSync(path.join(root, "src/data/timetable2026.json"), "utf8"));
  for (const tt of registry.timetables.years) {
    const meta = timetableMeta(registry, tt);
    const t = registry.timetables;
    const tables = (ttData.schedules[tt.year] ?? []).map((table) =>
      `<h2>${esc(table.label)}</h2><table border="1" cellpadding="6" style="border-collapse:collapse;font-size:14px"><thead><tr><th>Day</th><th>Group</th><th>Sessions</th></tr></thead><tbody>${table.rows.map((r) => `<tr><td>${esc(r.day)}</td><td>${esc(r.group || "All")}</td><td>${r.entries.map(esc).join("; ")}</td></tr>`).join("")}</tbody></table>`).join("");
    const staff = (ttData.staff[tt.year] ?? []).length ? `<h2>Teaching staff</h2><p>${ttData.staff[tt.year].map(esc).join(", ")}</p>` : "";
    const dates = `<ul>${t.dates.map((d) => `<li><strong>${esc(d.label)}:</strong> ${esc(d.value)}</li>`).join("")}</ul>`;
    const body = shell(
      crumbs([["Home", "/"], [`Year ${tt.year}`, `/year/${tt.year}`], ["Timetable", null]]) +
      `<h1>${esc(meta.h1)}</h1><p>${esc(meta.description)}</p>${dates}${tables}${staff}` +
      `<p><a href="/library/year-${tt.year}">Year ${tt.year} notes and past papers</a></p>` + credit,
    );
    write(meta.path, render({ title: meta.title, description: meta.description, path: meta.path, image: meta.ogImage, keywords: meta.keywords, body, jsonLd: { "@context": "https://schema.org", "@type": "Event", name: meta.title, description: meta.description, url: `${site}${meta.path}`, startDate: "2026-09-07", endDate: "2026-12-04", location: { "@type": "Place", name: "Mount Kenya University School of Medicine" }, organizer: { "@type": "Organization", name: "Mount Kenya University" } } }), undefined);
  }

  // ---------------- sitemap ----------------
  const today = new Date().toISOString().slice(0, 10);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${written
    .map((w) => `  <url><loc>${site}${w.urlPath}</loc><lastmod>${w.lastmod ?? today}</lastmod><changefreq>monthly</changefreq><priority>${w.urlPath.split("/").length <= 3 ? "0.8" : "0.6"}</priority></url>`)
    .join("\n")}\n</urlset>\n`;
  fs.writeFileSync(path.join(dist, "library-sitemap.xml"), xml);

  console.log(`prerendered ${written.length} pages + library-sitemap.xml`);
} catch (err) {
  console.warn("[prerender-library] skipped:", err instanceof Error ? err.message : err);
}
