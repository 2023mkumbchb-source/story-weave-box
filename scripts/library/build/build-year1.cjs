// Merge, audit and categorise the Year 1 Drive sources into one library tree.
const fs = require("fs");
const dir = __dirname;
const OUT = process.argv[2];
const load = (f, source) => { const t = JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8")); const out = []; (function w(n, p) { n.files.forEach((x) => out.push({ ...x, path: p, source })); n.folders.forEach((c) => w(c, [...p, c.name])); })(t, []); return out; };
// priority: organised AE folder first, then BRS books, then the larger BDS dump
let files = [...load("y1-ae2.json", 1), ...load("x1.json", 1.5), ...load("y1-brs2.json", 2), ...load("y1-bds2.json", 3)];
const stats = { raw: files.length };

const ext = (n) => (n.match(/\.([A-Za-z0-9]{1,5})$/) || [])[1]?.toLowerCase() || "";
const isJunk = (f) =>
  /shortcut|ms-shortcut/.test(f.mime) || ["lnk", "ini", "db", "tmp", "ds_store", "url"].includes(ext(f.name)) ||
  /^(thumbs\.db|desktop\.ini|\.ds_store)$/i.test(f.name) || f.path.some((p) => /_files$/i.test(p)) ||
  /\.(css|js|woff2?|ttf|map|xml|htm|html)$/i.test(f.name);
stats.junk = files.filter(isJunk).length;
files = files.filter((f) => !isJunk(f));

// ---- subject (deepest anchor folder wins; then filename) ----
const ANCHORS = [
  ["Oral Biology & Dental (BDS)", null, /oral biology|dental|dentist|\bbds\b|tooth|teeth/i],
  ["Anatomy", "Neuroanatomy", /neuro ?anatomy/i],
  ["Anatomy", "Embryology", /embryo|congenital/i],
  ["Anatomy", "Histology", /histolog/i],
  ["Immunology", null, /immuno/i],
  ["Microbiology", null, /microbio|bacteriolog|virolog|mycolog|parasitolog/i],
  ["Physiology", null, /physiolog/i],
  ["Biochemistry", null, /bio ?chem|bchem|metabolism/i],
  ["Behavioural Sciences", null, /behaviou?ral|behavior/i],
  ["ICT", null, /^ict$|information (and|&) comm|computer/i],
  ["Anatomy", "Gross Anatomy", /gross anat|acland|3d anatomy|^anatomy$|anatomy review|regional review|upper limb|lower limb|thorax|abdomen|pelvis|head (and|&) neck|skeletal/i],
];
const TOPIC_HINTS = [
  ["Anatomy", "Neuroanatomy", /neuro(?!phys)|brain ?stem|spinal cord|cranial nerve|\bcns\b anat/i],
  ["Anatomy", "Embryology", /emb?ryo|emryo|limb development|fetal|foetal|gastrulation|neurulation|\bweek \d+ embryo/i],
  ["Anatomy", "Histology", /histo|nervous tissue|epitheli|connective tissue|cartilage|bone tissue|\bcell\b structure|cytology|slides? ?\d/i],
  ["Anatomy", "Gross Anatomy", /anat|axilla|fore ?arm|\bhand\b|knee|shoulder|elbow|\bhip\b|thigh|\bleg\b|\bfoot\b|ankle|\blimb|joint|thora[cx]|mediastin|abdom|pelvi|perine|inguinal|head and neck|\bneck\b|\bface\b|skull|\bback\b|\bpat[ _\d-]|\bgluteal|popliteal|brachial|femoral|diaphragm|orbit|scalp/i],
  ["Physiology", null, /blood|cardiovascular|\bcvs\b|\bgit\b|renal|endocrin|muscular|immunity|respirat|hearing|neurophys|cns and special|sensory/i],
  ["Biochemistry", null, /amino acid|enzym|glycoly|lipid|vitamin|nucleotide|carbohydrate|krebs|cori/i],
];
function subjectOf(f) {
  const chain = [...f.path].reverse(); // innermost first
  for (const folder of chain) for (const [s, sub, re] of ANCHORS) if (re.test(folder)) return [s, sub];
  for (const [s, sub, re] of ANCHORS) if (re.test(f.name)) return [s, sub];
  for (const [s, sub, re] of TOPIC_HINTS) if (re.test(f.name) || chain.some((c) => re.test(c))) return [s, sub];
  return ["Other & Unnamed Files", null];
}

// ---- type ----
const TYPES = {
  videos: "Videos", images: "Images & Slide Atlas", questions: "Questions & Past Papers", books: "Textbooks & Reference",
  practical: "Practicals & Lab Manuals", slides: "Lecture Slides", notes: "Notes & Handouts",
};
function typeOf(f) {
  const e = ext(f.name), pathStr = f.path.join(" / ");
  if (/^video\//.test(f.mime) || ["mp4", "mkv", "avi", "mov", "wmv"].includes(e)) return TYPES.videos;
  if (/^image\//.test(f.mime) || ["jpg", "jpeg", "png", "gif", "bmp", "tif"].includes(e)) return TYPES.images;
  const text = `${f.path[f.path.length - 1] || ""} ${f.name}`;
  if (/question|mcq|\bsaq\b|past ?paper|\bpats?\b|\bcats?\b|\bexam|quiz|\bspots?\b|review test|\beoq\b|exercise|answers?\b/i.test(text) || /past papers?|questions/i.test(pathStr)) return TYPES.questions;
  if (/textbook|\bbooks?\b|\bbks\b|\bbrs\b|atlas|netter|guyton|gray'?s|robbins|lippincott|harper|costanzo|ganong|snell|langman|junqueira|\bedition\b|\d(st|nd|rd|th) ed/i.test(text) || /textbook|\bbooks?\b|\bbks\b/i.test(pathStr)) return TYPES.books;
  if (/lab manual|practical|\bprac\b|dissection|\blab\b/i.test(text) || /lab manuals?|practical/i.test(pathStr)) return TYPES.practical;
  if (/presentationml|powerpoint|presentation/.test(f.mime) || ["ppt", "pptx", "pps", "ppsx", "pptm"].includes(e)) return TYPES.slides;
  return TYPES.notes;
}

// ---- dedupe (prefer organised source, then shallowest path) ----
const norm = (n) => n.toLowerCase().replace(/\.[a-z0-9]{1,5}$/, "").replace(/\s*\(\d+\)\s*$/, "").replace(/[\s_\-.]+/g, " ").replace(/\bcopy\b/g, "").trim();
const keyOf = (f) => (/^image\//.test(f.mime) || norm(f.name).length < 8 ? `${norm(f.name)}|${(f.path[f.path.length - 1] || "").toLowerCase()}|${ext(f.name)}` : `${norm(f.name)}|${ext(f.name)}`);
files.sort((a, b) => a.source - b.source || a.path.length - b.path.length);
const seen = new Map();
const kept = [];
for (const f of files) { const k = keyOf(f); if (seen.has(k)) continue; seen.set(k, f.id); kept.push(f); }
stats.duplicates = files.length - kept.length;

// ---- group ----
const GENERIC = /^(notes|questions|textbooks?|books?|slides|modules|physiology|biochemistry|anatomy|gross anatomy|embryology|histology|neuroanatomy|level 1 anatomy|level 1 bds|anatomy reviews first year|kimaiga's regional review|physiology lectures|telegram documents|dental surgery|oral biology)$/i;
const tidy = (s) => s.replace(/^\d+\.\s*/, (m) => m).replace(/\s+/g, " ").replace(/SYSYTEM/gi, "SYSTEM").trim();
const groups = new Map();
for (const f of kept) {
  const [subject, sub] = subjectOf(f);
  const type = typeOf(f);
  const topic = [...f.path].reverse().find((p) => !GENERIC.test(p.trim()) && !/^\d{8}|_files$|-001$/.test(p)) || "";
  const key = [subject, sub || "", type].join("||");
  if (!groups.has(key)) groups.set(key, { subject, sub, type, items: [] });
  groups.get(key).items.push({ f, topic: tidy(topic) });
}

const kindOf = (f) => { const e = ext(f.name); return /pdf/.test(f.mime) || e === "pdf" ? "pdf" : /presentation|powerpoint/.test(f.mime) || ["ppt", "pptx", "pps", "ppsx"].includes(e) ? "ppt" : /word|msword/.test(f.mime) || ["doc", "docx", "rtf"].includes(e) ? "doc" : /^video\//.test(f.mime) ? "video" : /^image\//.test(f.mime) ? "img" : /zip|rar/.test(f.mime) || ["zip", "rar", "7z"].includes(e) ? "zip" : "file"; };
const rank = ["Textbooks & Reference", "Lecture Slides", "Notes & Handouts", "Questions & Past Papers", "Practicals & Lab Manuals", "Videos", "Images & Slide Atlas"];
const SUBJECTS = ["Anatomy", "Physiology", "Immunology", "Microbiology", "Biochemistry", "Behavioural Sciences", "ICT", "Oral Biology & Dental (BDS)", "Other & Unnamed Files"];
const SUBS = ["Gross Anatomy", "Neuroanatomy", "Embryology", "Histology"];
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function typeNode(g) {
  const o = { n: g.type };
  const byTopic = new Map();
  for (const it of g.items) { const k = g.items.length > 18 ? it.topic : ""; (byTopic.get(k) || byTopic.set(k, []).get(k)).push(it); }
  const mk = (arr) => arr.sort((a, b) => collator.compare(a.f.name, b.f.name)).map(({ f }) => [f.id, f.name, kindOf(f)]);
  const direct = byTopic.get("") || [];
  if (direct.length) o.f = mk(direct);
  const topics = [...byTopic.entries()].filter(([k]) => k).sort((a, b) => collator.compare(a[0], b[0]));
  if (topics.length) o.d = topics.map(([k, arr]) => ({ n: k, f: mk(arr) }));
  return o;
}
const subjNode = (name, gs) => ({ n: name, d: gs.sort((a, b) => rank.indexOf(a.type) - rank.indexOf(b.type)).map(typeNode) });
const tree = [];
for (const s of SUBJECTS) {
  const gs = [...groups.values()].filter((g) => g.subject === s);
  if (!gs.length) continue;
  if (s === "Anatomy") {
    const d = SUBS.map((sub) => { const x = gs.filter((g) => g.sub === sub); return x.length ? subjNode(sub, x) : null; }).filter(Boolean);
    tree.push({ n: s, d });
  } else tree.push(subjNode(s, gs));
}
const count = (n) => (n.f?.length || 0) + (n.d || []).reduce((s, c) => s + count(c), 0);
stats.kept = kept.length;
const out = { updated: new Date().toISOString().slice(0, 10), source: "Google Drive: Year 1 collections", d: tree };
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(JSON.stringify(stats));
(function p(n, d) { console.log("  ".repeat(d) + n.n + " [" + count(n) + "]"); if (d < 2) (n.d || []).forEach((c) => p(c, d + 1)); })({ n: "YEAR 1", d: tree }, 0);
const unAll=[...groups.values()].filter(g=>g.subject==="Other & Unnamed Files").flatMap(g=>g.items.map(i=>i.f.name));
console.log("\nUNSORTED (" + unAll.length + "): " + unAll.join(" | "));
