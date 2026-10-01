// Moves material to the year the MKU timetable / unit list says it belongs to, then writes the final library files.
// usage: node relocate.cjs <outDir>   (reads the four base library JSONs from this folder)
const fs = require("fs");
const dir = __dirname;
const outDir = process.argv[2];
const SRC = { 1: "year1-library.new.json", 2: "year2-library.json", 3: "year3-library.json", 4: "year4-library.new.json" };
const lib = {};
for (const y of [1, 2, 3, 4]) lib[y] = JSON.parse(fs.readFileSync(`${dir}/${SRC[y]}`, "utf8"));

const norm = (n) => n.toLowerCase().replace(/\.[a-z0-9]{1,5}$/, "").replace(/\s*\(\d+\)\s*$/, "").replace(/[\s_\-.]+/g, " ").trim();

// ---- routing rules: where does a file in Year 1 really belong? ----
const TOPIC_Y2_BIOCHEM = /endocrin|microb|neurochem|clinical biochem/i;
const TOPIC_Y2_PHYSIO = /endocrin|\bgit\b|git i|gitphys|neurophysiology ii|renal/i;
const BOOK_PHARM = /^(brs )?pharmacology|principles of pharmacology/i;
function route(year, path, file) {
  // Year 3: pharmacology files that were filed under Pathology (e.g. a stray MCQ file) go to Pharmacology
  if (year === 3 && path[0] !== "Pharmacology" && /pharmac/i.test(file[1])) return { year: 3, path: ["Pharmacology", path[1] || "Notes & Handouts"] };
  if (year !== 1) return null;
  const [subject, type, a, b] = path;
  const topic = path.length > 2 ? path[path.length - 1] : "";
  if (BOOK_PHARM.test(file[1])) return { year: 3, path: ["Pharmacology", "Textbooks & Reference"] };
  if (subject === "Immunology") return { year: 2, path };
  if (subject === "Microbiology") return { year: 2, path };
  if (subject === "Biochemistry" && TOPIC_Y2_BIOCHEM.test(topic)) return { year: 2, path };
  if (subject === "Physiology" && TOPIC_Y2_PHYSIO.test(topic)) return { year: 2, path };
  if (BOOK_PHARM.test(file[1])) return { year: 3, path: ["Pharmacology", "Textbooks & Reference"] };
  return null;
}

// ---- tree helpers ----
function flatten(tree) {
  const out = [];
  (function w(nodes, p) { for (const n of nodes) { const here = [...p, n.n]; (n.f || []).forEach((f) => out.push({ path: here, file: f })); if (n.d) w(n.d, here); } })(tree.d, []);
  return out;
}
function prune(nodes, ids) {
  return nodes.map((n) => {
    const f = (n.f || []).filter((x) => !ids.has(x[0]));
    const d = n.d ? prune(n.d, ids) : undefined;
    const o = { ...n };
    if (f.length) o.f = f; else delete o.f;
    if (d && d.length) o.d = d; else delete o.d;
    return (o.f && o.f.length) || (o.d && o.d.length) ? o : null;
  }).filter(Boolean);
}
function ensure(list, name) { let n = list.find((x) => x.n === name); if (!n) { n = { n: name }; list.push(n); } return n; }
function insert(tree, path, file) {
  let level = tree.d, node = null;
  for (const name of path) { node = ensure(level, name); node.d = node.d || []; level = node.d; }
  // the leaf is the last path element; files live in node.f
  node.f = node.f || [];
  if (!node.f.some((x) => x[0] === file[0] || norm(x[1]) === norm(file[1]))) node.f.push(file);
  if (node.d && !node.d.length) delete node.d;
}

const moved = [];
for (const y of [1, 3]) {
  const ids = new Set();
  const pending = [];
  for (const { path, file } of flatten(lib[y])) {
    const r = route(y, path, file);
    if (!r) continue;
    ids.add(file[0]);
    pending.push({ r, file });
    moved.push(`Year ${y} → Year ${r.year}: ${r.path.join(" > ")} | ${file[1].slice(0, 46)}`);
  }
  lib[y].d = prune(lib[y].d, ids);
  for (const { r, file } of pending) insert(lib[r.year], r.path, file);
}

// ---- tidy-ups ----
const ict = lib[1].d.find((s) => s.n === "ICT");
if (ict) ict.n = "Common Units (ICT & Digital Literacy)";
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
for (const y of [2, 3]) for (const s of lib[y].d) for (const t of s.d || []) { if (t.f) t.f.sort((a, b) => collator.compare(a[1], b[1])); (t.d || []).forEach((x) => x.f && x.f.sort((a, b) => collator.compare(a[1], b[1]))); }

const count = (n) => (n.f?.length || 0) + (n.d || []).reduce((s, c) => s + count(c), 0);
fs.mkdirSync(outDir, { recursive: true });
for (const y of [1, 2, 3, 4]) {
  lib[y].updated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(`${outDir}/year${y}-library.json`, JSON.stringify(lib[y]));
  console.log(`Year ${y}: ${lib[y].d.reduce((s, n) => s + count(n), 0)} files | ${lib[y].d.map((s) => `${s.n} ${count(s)}`).join(" · ")}`);
}
console.log(`\nmoved ${moved.length} files between years:`);
const by = {}; moved.forEach((m) => { const k = m.split(" | ")[0].split(" > ").slice(0, 2).join(" > "); by[k] = (by[k] || 0) + 1; });
Object.entries(by).forEach(([k, v]) => console.log("  ", v, k));
