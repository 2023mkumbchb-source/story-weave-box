// Crawl a public Google Drive folder tree via embeddedfolderview (not capped at 50 items/folder).
const fs = require("fs");
const [ROOT, OUT] = process.argv.slice(2);
const dec = (s) => s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
let requests = 0;

async function list(id, attempt = 0) {
  try {
    const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${id}`, { headers: { "user-agent": "Mozilla/5.0" } });
    requests++;
    if (!res.ok) throw new Error("HTTP " + res.status);
    const h = await res.text();
    const title = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const items = [];
    const parts = h.split('<div class="flip-entry" id="entry-').slice(1);
    for (const p of parts) {
      const eid = p.slice(0, p.indexOf('"'));
      const isFolder = /href="https:\/\/drive\.google\.com\/drive\/folders\//.test(p.slice(0, 400));
      const name = dec(((p.match(/class="flip-entry-title">([^<]*)</) || [])[1] || "").trim());
      const mime = isFolder ? "folder" : decodeURIComponent((p.match(/drive-thirdparty\.googleusercontent\.com\/\d+\/type\/([^"]+)"/) || [])[1] || "application/octet-stream");
      items.push({ id: eid, name, mime });
    }
    return { title: dec(title), items };
  } catch (e) {
    if (attempt < 3) { await new Promise((r) => setTimeout(r, 1000 * (attempt + 1))); return list(id, attempt + 1); }
    throw e;
  }
}

async function crawl(id, name, depth) {
  const { title, items } = await list(id);
  const node = { id, name: name || title, folders: [], files: [] };
  for (const it of items) {
    if (it.mime === "folder") {
      await new Promise((r) => setTimeout(r, 150));
      node.folders.push(await crawl(it.id, it.name, depth + 1));
    } else node.files.push(it);
  }
  if (depth <= 2) console.log(`${"  ".repeat(depth)}${node.name}: ${node.files.length} files, ${node.folders.length} folders`);
  return node;
}

(async () => {
  const tree = await crawl(ROOT, "", 0);
  fs.writeFileSync(OUT, JSON.stringify(tree));
  const count = (n) => n.files.length + n.folders.reduce((s, f) => s + count(f), 0);
  const maxDirect = (n) => Math.max(n.files.length, ...n.folders.map(maxDirect), 0);
  console.log("TOTAL files:", count(tree), "| requests:", requests, "| largest single folder:", maxDirect(tree));
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
