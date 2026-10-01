// Generic Drive -> library builder (Subject -> Type -> Topic), configured per year.
// usage: node build-gen.cjs <y2|y3> <out.json>
const fs = require("fs");
const dir = __dirname;
const [KEY, OUT] = process.argv.slice(2);

const CONFIGS = {
  y3: {
    sources: [["y3.json", 1]],
    subjects: ["Pharmacology", "Microbiology", "Pathology", "Chemical Pathology", "Haematopathology", "Nutrition & Dietetics", "Clinical Methods", "Research Methodology", "Other & Unsorted"],
    anchors: [
      ["Nutrition & Dietetics", /nutrition|dietetic/i],
      ["Chemical Pathology", /chem ?path/i],
      ["Haematopathology", /hem(a)?topath|blood components|haematolog|hematolog/i],
      ["Microbiology", /bacteriolog|virolog|mycolog|parasitolog|microbio|entomolog/i],
      ["Pharmacology", /pharmac/i],
      ["Clinical Methods", /clinical (methods|techniques)/i],
      ["Research Methodology", /research method/i],
      ["Pathology", /patholog|histopath|oncopath|gyn(a)?e? ?path|resp path|gi path|pathoma|genetic diseases|marathon|\bpots?\b|patho spot|spot pic|^endocrine$/i],
    ],
    hints: [
      ["Pharmacology", /pharm|phama|drug|antibiotic|toxicolog/i],
      ["Chemical Pathology", /clinical-chem|chem path|chemical path/i],
      ["Microbiology", /immunolog|bacteri|virus|viral|fung|parasit|microb/i],
      ["Research Methodology", /research|community health|logbook/i],
      ["Pathology", /path[oa]lo?gy|patho|tumou?r|neoplas|carcinoma|inflammation|cell injury|spot|glomerul|renal|urinary|reproductive|skin|respirat|cardiac|heart|liver|gastro|bone|\bcns\b|disorders? of|breast|prostate|genital|cerebrovascular|\bgtd\b|whole blood|importance of blood|histology and cytology/i],
    ],
    topics: {
      Pathology: [
        ["Pathoma Videos", /pathoma/i],
        ["Pathology Marathon", /marathon/i],
        ["Spot Pictures", /spot pic|patho spot/i],
        ["GI Pathology", /\bgi\b|\bgit\b|gastro/i],
        ["Respiratory Pathology", /resp/i],
        ["Gynae Pathology", /gyn/i],
        ["Endocrine Pathology", /endocrine/i],
        ["Oncopathology", /onco|neoplas|tumou?r|cancer/i],
        ["Genetic Diseases", /genetic/i],
        ["Immunopathology", /immunopath/i],
        ["Histopathology", /histopath/i],
        ["General Pathology", /gen(eral)? path|cell injury|inflammation|haemodynamic|hemodynamic|amyloid|necrosis/i],
      ],
      Microbiology: [["Bacteriology", /bacteri/i], ["Virology", /virolog|viral|\bvirus/i], ["Mycology", /mycolog|fung/i], ["Parasitology", /parasit|entomol/i]],
      Pharmacology: [["Week-by-week Lectures", /week/i]],
    },
  },
  y2: {
    sources: [["y2.json", 1]],
    subjects: ["Anatomy", "Biochemistry", "Immunology", "Microbiology", "Physiology", "Epidemiology & Biostatistics", "Human Communication Skills", "Other & Unsorted"],
    anchors: [
      ["Biochemistry", /bio ?chem|bchem|neurochem|molecular biology|metabolism/i],
      ["Anatomy", /anat|abdomen|neuroanat/i],
      ["Microbiology", /microbio|mocrobio|bacteriolog|virolog|mycolog|parasitolog/i],
      ["Immunology", /immuno/i],
      ["Epidemiology & Biostatistics", /epidemiolog|statistic|biostat/i],
      ["Human Communication Skills", /communication/i],
      ["Physiology", /physiolog/i],
    ],
    hints: [],
    topics: {},
  },
};
const cfg = CONFIGS[KEY];
if (!cfg) throw new Error("unknown year key " + KEY);

const load = (f, source) => {
  const t = JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8")); const out = [];
  (function w(n, p) { n.files.forEach((x) => out.push({ ...x, path: p, source })); n.folders.forEach((c) => w(c, [...p, c.name])); })(t, []);
  return out;
};
let files = cfg.sources.flatMap(([f, s]) => load(f, s));
const stats = { raw: files.length };

const ext = (n) => (n.match(/\.([A-Za-z0-9]{1,5})$/) || [])[1]?.toLowerCase() || "";
const isJunk = (f) => /shortcut/.test(f.mime) || ["lnk", "ini", "db", "tmp", "url", "ds_store"].includes(ext(f.name)) || /^(thumbs\.db|desktop\.ini)$/i.test(f.name) || f.path.some((p) => /_files$/i.test(p)) || /\.(css|js|woff2?|ttf|map|xml|html?)$/i.test(f.name);
stats.junk = files.filter(isJunk).length;
files = files.filter((f) => !isJunk(f));

// subject: deepest anchor folder wins, then filename, then hints
function subjectOf(f) {
  for (const folder of [...f.path].reverse()) for (const [s, re] of cfg.anchors) if (re.test(folder)) return s;
  for (const [s, re] of cfg.anchors) if (re.test(f.name)) return s;
  for (const [s, re] of cfg.hints) if (re.test(f.name) || f.path.some((p) => re.test(p))) return s;
  return "Other & Unsorted";
}

const T = { videos: "Videos", images: "Images & Spot Pictures", questions: "Past Papers & Questions", books: "Textbooks & Reference", practical: "Practicals & Lab Manuals", slides: "Lecture Slides", notes: "Notes & Handouts" };
function typeOf(f) {
  const e = ext(f.name), pathStr = f.path.join(" / "), folder = f.path[f.path.length - 1] || "";
  if (/^video\//.test(f.mime) || ["mp4", "mkv", "avi", "mov", "wmv"].includes(e)) return T.videos;
  if (/^image\//.test(f.mime) || ["jpg", "jpeg", "png", "gif", "bmp"].includes(e)) return T.images;
  const text = `${folder} ${f.name}`;
  if (/question|mcq|\bsaq\b|past ?papers?|\bpapers?\b|\bpats?\b|\bcats?\b|\bpots?\b|\bexam|quiz|\bspots?\b|suppl|marathon|answers?\b|revision/i.test(text) || /past papers?|questions|\bcats?\b|\bpots?\b|exam drafts|suppl/i.test(pathStr)) return T.questions;
  if (/textbook|\bbooks?\b|\bbks\b|\bbrs\b|atlas|robbins|pathoma|first.?aid|\bedition\b|\d(st|nd|rd|th) ed\b|goodman|katzung|rang|harper|lippincott|guyton|netter/i.test(text) || /textbook|\bbooks?\b/i.test(pathStr)) return T.books;
  if (/lab manual|practical|dissection|\blab\b/i.test(text)) return T.practical;
  if (/presentationml|powerpoint|presentation/.test(f.mime) || ["ppt", "pptx", "pps", "ppsx", "pptm"].includes(e)) return T.slides;
  return T.notes;
}

// dedupe: prefer shallow paths; images only collide inside the same folder
const norm = (n) => n.toLowerCase().replace(/\.[a-z0-9]{1,5}$/, "").replace(/\s*\(\d+\)\s*$/, "").replace(/[\s_\-.]+/g, " ").replace(/\bcopy\b/g, "").trim();
const keyOf = (f) => (/^image\//.test(f.mime) || norm(f.name).length < 8 ? `${norm(f.name)}|${(f.path[f.path.length - 1] || "").toLowerCase()}|${ext(f.name)}` : `${norm(f.name)}|${ext(f.name)}`);
files.sort((a, b) => a.source - b.source || a.path.length - b.path.length);
const seen = new Set(); const kept = [];
for (const f of files) { const k = keyOf(f); if (seen.has(k)) continue; seen.add(k); kept.push(f); }
stats.duplicates = files.length - kept.length; stats.kept = kept.length;

const GENERIC = /^(notes|questions|textbooks?|books?|slides|modules|lectures?|extra|main|common units|year \d|2024 class notes|3rd year.*|biochem|biochemistry|physiology|pathology|pharmacology|microbiology|immunology|telegram documents|presentations?)$/i;
const WRAP = /-\d{8}T\d{6}Z-|^\d{8}T/i;
const tidy = (s) => s.replace(/\s+/g, " ").trim();
function topicOf(f, subject) {
  const rules = cfg.topics[subject];
  if (rules) {
    for (const part of [...f.path].reverse()) for (const [name, re] of rules) if (re.test(part)) return name;
    for (const [name, re] of rules) if (re.test(f.name)) return name;
  }
  const near = [...f.path].reverse().find((p) => !GENERIC.test(p.trim()) && !WRAP.test(p) && !/_files$/i.test(p));
  return near ? tidy(near) : "";
}

const kindOf = (f) => { const e = ext(f.name); return /pdf/.test(f.mime) || e === "pdf" ? "pdf" : /presentation|powerpoint/.test(f.mime) || ["ppt", "pptx", "pps", "ppsx", "pptm"].includes(e) ? "ppt" : /word|msword/.test(f.mime) || ["doc", "docx", "rtf"].includes(e) ? "doc" : /^video\//.test(f.mime) || ["mp4", "wmv", "avi", "mkv"].includes(e) ? "video" : /^image\//.test(f.mime) ? "img" : /zip|rar/.test(f.mime) || ["zip", "rar", "7z"].includes(e) ? "zip" : "file"; };
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const rank = [T.books, T.slides, T.notes, T.practical, T.questions, T.videos, T.images];

const groups = new Map();
for (const f of kept) {
  const subject = subjectOf(f), type = typeOf(f);
  const key = `${subject}||${type}`;
  if (!groups.has(key)) groups.set(key, { subject, type, items: [] });
  groups.get(key).items.push({ f, topic: topicOf(f, subject) });
}
const mk = (arr) => arr.sort((a, b) => collator.compare(a.f.name, b.f.name)).map(({ f }) => [f.id, f.name, kindOf(f)]);
const tree = cfg.subjects.map((s) => {
  const gs = [...groups.values()].filter((g) => g.subject === s).sort((a, b) => rank.indexOf(a.type) - rank.indexOf(b.type));
  if (!gs.length) return null;
  return {
    n: s,
    d: gs.map((g) => {
      const by = new Map();
      for (const it of g.items) { const k = g.items.length > 18 ? it.topic : ""; (by.get(k) || by.set(k, []).get(k)).push(it); }
      const o = { n: g.type };
      const direct = by.get("") || []; if (direct.length) o.f = mk(direct);
      const tops = [...by.entries()].filter(([k]) => k).sort((a, b) => collator.compare(a[0], b[0]));
      if (tops.length) o.d = tops.map(([k, arr]) => ({ n: k, f: mk(arr) }));
      return o;
    }),
  };
}).filter(Boolean);

const count = (n) => (n.f?.length || 0) + (n.d || []).reduce((s, c) => s + count(c), 0);
fs.writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), source: `Google Drive: ${KEY}`, d: tree }));
console.log(JSON.stringify(stats));
for (const s of tree) { console.log(`${s.n} [${count(s)}]`); for (const t of s.d) console.log(`    ${t.n} [${count(t)}]` + (t.d ? "  -> " + t.d.slice(0, 9).map((x) => x.n.slice(0, 14) + " " + count(x)).join(", ") : "")); }
const un = [...groups.values()].filter((g) => g.subject === "Other & Unsorted").flatMap((g) => g.items.map((i) => i.f.name));
console.log(`\nUNSORTED (${un.length}):`, un.slice(0, 40).join(" | "));
