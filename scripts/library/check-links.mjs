// Checks that every Drive file in the library still exists and is shared, and records the dead ones in
// public/data/broken-links.json. The site reads that file to show "unavailable" instead of a blank viewer.
// usage: node scripts/library/check-links.mjs [--sample 40]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const registry = JSON.parse(fs.readFileSync(path.join(root, "src/data/libraries.json"), "utf8"));
const sampleArg = process.argv.indexOf("--sample");
const SAMPLE = sampleArg > -1 ? Number(process.argv[sampleArg + 1]) : 0;
const CONCURRENCY = 24;

const ids = new Map(); // id -> "Year 1 > Anatomy ... > file name"
for (const lib of registry.libraries) {
  const data = JSON.parse(fs.readFileSync(path.join(root, "public/data", lib.dataFile), "utf8"));
  (function walk(nodes, trail) {
    for (const n of nodes) {
      for (const f of n.f ?? []) ids.set(f[0], `${lib.label} > ${[...trail, n.n].join(" > ")} > ${f[1]}`);
      if (n.d) walk(n.d, [...trail, n.n]);
    }
  })(data.d, []);
}
let list = [...ids.keys()];
if (SAMPLE) list = list.filter((_, i) => i % Math.max(1, Math.floor(list.length / SAMPLE)) === 0).slice(0, SAMPLE);

async function check(id, attempt = 0) {
  try {
    const r = await fetch(`https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`, { headers: { range: "bytes=0-0" }, redirect: "follow" });
    const type = r.headers.get("content-type") || "";
    try { await r.body.cancel(); } catch { /* ignore */ }
    if (r.status === 200 || r.status === 206) return type.startsWith("text/html") ? "broken" : "ok";
    if (r.status === 404 || r.status === 403 || r.status === 410) return "broken";
    if (attempt < 2) { await new Promise((res) => setTimeout(res, 1500 * (attempt + 1))); return check(id, attempt + 1); }
    return "unknown";
  } catch {
    if (attempt < 2) { await new Promise((res) => setTimeout(res, 1000)); return check(id, attempt + 1); }
    return "unknown";
  }
}

const result = { ok: 0, broken: [], unknown: 0 };
let next = 0, done = 0;
const started = Date.now();
async function worker() {
  while (next < list.length) {
    const id = list[next++];
    const s = await check(id);
    if (s === "ok") result.ok++; else if (s === "broken") result.broken.push(id); else result.unknown++;
    if (++done % 250 === 0) console.log(`  ${done}/${list.length} checked · ${result.broken.length} broken · ${Math.round((Date.now() - started) / 1000)}s`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

console.log(`checked ${list.length} files in ${Math.round((Date.now() - started) / 1000)}s: ok ${result.ok}, broken ${result.broken.length}, could not tell ${result.unknown}`);
result.broken.slice(0, 10).forEach((id) => console.log("  broken:", ids.get(id)));
if (!SAMPLE) {
  fs.writeFileSync(path.join(root, "public/data/broken-links.json"), JSON.stringify({ checked: new Date().toISOString().slice(0, 10), total: list.length, broken: result.broken }));
  console.log("wrote public/data/broken-links.json");
}
