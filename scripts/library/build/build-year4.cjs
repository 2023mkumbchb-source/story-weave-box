// Audit and categorise the Year 4 Drive tree: Department -> Type -> Topic. Reusable for any year.
const fs = require("fs");
const dir = __dirname;
const [OUT, RES_OUT] = process.argv.slice(2);
const tree = JSON.parse(fs.readFileSync(`${dir}/y4-v2.json`, "utf8"));

const DEPTS = {
  IMED: "Internal Medicine",
  OBSTERTICS: "Obstetrics & Gynaecology",
  PAEDS: "Paediatrics & Child Health",
  PHARMACOLOGY: "Clinical Pharmacology",
  PSYCHIATRY: "Psychiatry",
  "RADIOLOGY DOWNLOADS": "Radiology",
  SURGERY: "Surgery",
};
const DESC = {
  "Internal Medicine": "Clinical medicine notes, books, block materials and revision resources.",
  "Obstetrics & Gynaecology": "Obstetrics, gynaecology, block notes, books and revision materials.",
  "Paediatrics & Child Health": "Paediatric teaching notes, books, block materials and exam revision.",
  "Surgery": "Surgical presentations, emergencies, examination and management notes.",
  "Clinical Pharmacology": "System-based pharmacology notes, cases, figures, drug reviews and course outlines.",
  "Psychiatry": "Psychiatric assessment, psychopathology, DSM guidance and practice cases.",
  "Radiology": "Introductory radiology, skeletal lesions, chest trauma and spot cases.",
};

// course-outline PDFs live in a separate Drive folder; add them under Pharmacology
const EXTRA = [
  ["1DMbr7iBFHU1Y3xdI_wlpbdFxT1H9AEev", "MBPL4400 Course Outline.pdf"],
  ["1W6jBKwdVxIjyNl2aaoV7YCS9MqFcqRzg", "MBPL 4411-Course Outline - 1st Trim.pdf"],
  ["1c023V1hIpZdwS_1j5laBIdFusbRl6lWW", "MBPL 4422-Course Outline - 2nd Trim.pdf"],
  ["1JWjKQ5K_9zrIdiZOO5xMD-2e-Inf2PSE", "MBPL 4433-Course Outline - 3rd Trim.pdf"],
].map(([id, name]) => ({ id, name, mime: "application/pdf", path: ["PHARMACOLOGY"], dept: "Clinical Pharmacology", source: 0 }));

let files = [];
for (const top of tree.folders) {
  const dept = DEPTS[top.name] || top.name;
  (function w(n, p) { n.files.forEach((x) => files.push({ ...x, path: p, dept, source: 1 })); n.folders.forEach((c) => w(c, [...p, c.name])); })(top, [top.name]);
}
// extra Surgery notes folder (separate Drive link)
const y4b = JSON.parse(fs.readFileSync(`${dir}/y4b.json`, "utf8"));
(function w(n, p) { n.files.forEach((x) => files.push({ ...x, path: p, dept: "Surgery", source: 1 })); n.folders.forEach((c) => w(c, [...p, c.name])); })(y4b, ["SURGERY"]);
files = [...EXTRA, ...files];
const stats = { raw: files.length };

const ext = (n) => (n.match(/\.([A-Za-z0-9]{1,5})$/) || [])[1]?.toLowerCase() || "";
const isJunk = (f) => /shortcut/.test(f.mime) || ["lnk", "ini", "db", "tmp", "url"].includes(ext(f.name)) || /^(thumbs\.db|desktop\.ini)$/i.test(f.name) || f.path.some((p) => /_files$/i.test(p)) || /\.(css|js|woff2?|ttf|map|xml|html?)$/i.test(f.name);
stats.junk = files.filter(isJunk).length;
files = files.filter((f) => !isJunk(f));

// ---- types ----
const T = { outline: "Course Outlines", videos: "Videos", images: "Images & Figures", questions: "Questions, CATs & OSCEs", books: "Textbooks & Reference", slides: "Lecture Slides", notes: "Notes & Handouts" };
function typeOf(f) {
  const e = ext(f.name), name = f.name, folder = f.path[f.path.length - 1] || "", pathStr = f.path.join(" / ");
  if (/course ?outline|MBPL ?\d{4}/i.test(name)) return T.outline;
  if (/^video\//.test(f.mime) || ["mp4", "mkv", "avi", "mov", "wmv"].includes(e)) return T.videos;
  if (/^image\//.test(f.mime) || ["jpg", "jpeg", "png", "gif", "bmp"].includes(e)) return T.images;
  if (/mcq|\bsaq\b|past ?paper|papers?\b|\bcats?\b|\bosces?\b|\bosler\b|\bexam|quiz|\bspot|cases? (in|studies)|case studies|patient cases|sample cases|oral stations|\bpiids\b|\bwc\b|end (sem|year)|take home|\bpaed (y\d|t\d|\d|\(|cat)|\bpaed\b ?\(?\d|^paed|kudra|mount kenya|^obyg|obs&gyn|obs gyn|gyne? (cat|paper)|\bog osces\b|sample osce|^internal med|^imed|hemat imed|cvs internal|100 cases|victoria case/i.test(name) || /papers|revision/i.test(folder)) return T.questions;
  if (/textbook|\bbooks?\b|\bnelson\b|davidson|harrison|dutta|hutchison|first.?aid|\bkaplan\b|\bsims\b|fish.s|dsm ?5|handbook|10 teachers|clinical management handbook|kumar|bailey|\bedition\b|\d(st|nd|rd|th) ed\b|bedside clinics|protocol|guidelines?\b|medscape/i.test(name) || /\bbooks?\b/i.test(folder)) return T.books;
  if (/presentationml|powerpoint|presentation/.test(f.mime) || ["ppt", "pptx", "pps", "ppsx", "pptm"].includes(e)) return T.slides;
  return T.notes;
}

// ---- topics: per department, first matching rule wins (tested on file name, then folder names) ----
const TOPICS = {
  "Internal Medicine": [
    ["ECG & Cardiac Tests", /\becg\b|electrocardio/i],
    ["Respiratory", /pneumo|asthma|copd|bronchiect|pleural|lung|tuberc|\btb\b|cough|rhinitis|covid|respirat|occupational|interstitial/i],
    ["Cardiovascular", /cardi|heart|hypertens|\bhtn\b|\bacs\b|coronary|endocarditis|arrhythm|valv|rheumatic fever|pericard|\bcvs\b|cvd/i],
    ["Gastroenterology & Liver", /\bgit\b|gastro|liver|hepat|biliary|pancrea|cirrh|portal|\bibd\b|diarrh|malabsor|oesoph|esoph|dyspep|\blfts?\b|abdominal pain|ibs|amoebi|cholera|dysentery|gastritis/i],
    ["Haematology & Oncology", /hemat|haemat|anaemi|anemi|leuk|lymphoma|myeloma|platelet|bleeding|transfusion|\bdic\b|thalass|sickle|marrow|neutropen|myelodys|haemochrom|hemochrom|coagul/i],
    ["Renal & Fluids", /renal|kidney|nephr|glomerul|tubulo|urinary|\buti\b|fluid and elec|stone/i],
    ["Endocrinology & Diabetes", /diabet|thyroid|endocr|adrenal|pituitary/i],
    ["Rheumatology", /rheumat|lupus|\bsle\b|sclero|arthrit|gout|crystal|spondylo|myopath|fibromyalg|osteopor|osteoarth|vasculit|\bscleroderma\b/i],
    ["Infectious Diseases & HIV", /infectio|malaria|\bhiv\b|aids|sepsis|leishman|trypanos|haemorrhagic|hemorrhagic|\bstds?\b|typhoid|nematode/i],
    ["Poisoning & Toxicology", /poison|pesticide|envenom|opp quizz|chemicals|toxic/i],
  ],
  "Obstetrics & Gynaecology": [
    ["Labour & Delivery", /labou?r|partograph|breech|malposition|malpresent|dystocia|obstructed|cord prolapse|vaginal delivery|vaccum|vacuum|caesar|ceaser|cesarean|passenger|fistula|puerperi/i],
    ["Complications in Pregnancy", /anaemia in|anemia in|in pregnan|pregnac|eclampsia|hypertens|placent|abruptio|previa|pprom|preterm|multiple gestation|twin|abortion|ectopic|gtd|maternal audit|thromboembolism/i],
    ["Antenatal Care & Normal Pregnancy", /antenatal|diagnosis of pregnancy|physiological changes|preconcept|pre conception|safe motherhood|gametogenesis|year 4 lecture/i],
    ["Postpartum & Lactation", /post ?partum|lactation|breast ?feeding|breatfeeding|puerperium/i],
    ["Gynaecology", /gyn|menstru|menopause|puberty|fibroid|endometrio|infertil|contracept|\bpid\b|premalignant|cervi|vulva|incontin|population dynamics|collage|urinary/i],
  ],
  "Paediatrics & Child Health": [
    ["Neonatology", /neonat|newborn|asphyxia|meconium|prematur|jaundice|respiratory distress/i],
    ["Growth, Nutrition & Development", /growth|develop|milestone|nutrition|malnutri|micronutri|breastfeeding|rickets|adolescen|history taking/i],
    ["Cardiology", /heart|cardi|chd|arrhythm|rheumatic fever|endocarditis/i],
    ["Respiratory", /pneumo|bronchiol|croup|aspiration|respiratory tract|tuberc|\btb\b/i],
    ["Gastroenterology & Liver", /diarrh|gastro|liver|hepat|\bgerd\b|reflux|peptic|gastritis/i],
    ["Haematology & Oncology", /haem|hem?at|anaemi|anemi|sickle|leuk|lymphoma|tumou?rs?|malignan|cns malig/i],
    ["Renal & Fluids", /renal|kidney|nephr|glomerul|urinary|\buti\b|fluid|electrolyte/i],
    ["Neurology", /seiz|epilep|convuls|meningit|cns|cerebral palsy|encephalop|neurocut|febrile/i],
    ["Endocrinology", /diabet|thyroid|adrenal|addison/i],
    ["Infectious Diseases & Immunisation", /hiv|immunodeficiency|aids|arv|malaria|parasite|vaccin|cold chain|pyrexia|shock|infection/i],
  ],
  "Clinical Pharmacology": [
    ["Anticoagulants & Antiplatelets", /anti-?coag|antiplatelet|anti-platelet|warfarin|heparin|fibrinolytic|blood thinner|thromb/i],
    ["Antiarrhythmics & ECG", /arrhythm|cardiac action|cap &|qrs|pqrst|glycoside|digitalis|fibrillation|tachycardia|bradycardia|drugs affecting/i],
    ["Acute Coronary Syndrome & Angina", /\bacs\b|coronary|myocardial|stemi|angina|antianginal/i],
    ["Hypertension, Heart Failure & Lipids", /hypertens|bp|hbp|heart failure|dyslip|dyslep|lipid|cholester|atp iii|ncep|antihypertens|heart ?disease|cardiovascular|risk factors|guidelines|made simple|quick review/i],
    ["Pain, Opioids & Anti-inflammatories", /opioid|nsaid|analges|pain|acetaminophen|ibuprofen|prednisone|corticosteroid|addiction|neurobiology|neuropathic/i],
    ["Gout & Arthritis Drugs", /gout|arthritis|dmard|colchicine|ra|rheumat/i],
    ["Hormone Therapy & Cancer Endocrinology", /serm|serd|fulvestrant|tamoxifen|estrogen synthesis|androgen|oestrogen|progestin/i],
    ["Endocrine Drugs", /thyroid|diabet|hba1c|androgen|oestrogen|estrogen|progestin|bisphosphonate|hormon/i],
    ["Contraception", /contracept/i],
    ["Anaesthetics & Muscle Relaxants", /anaesth|anesth|relaxant|smrs?|neuromuscular/i],
    ["COVID-19 Therapeutics", /covid|sars|coronavirus|ivermectin/i],
  ],
  Surgery: [
    ["Urology", /urolog|scrotum|testis|testicular|prostat|\bbph\b|bladder|renal mass|haematuria|hematuria|penile|urolith|genito|fournier|urogenital|kidney/i],
    ["Paediatric Surgery", /children|infantile|\bihps\b|pyloric|intussus|atresia|malrotation|hirschsprung|meckel|necrotizing enterocolitis|anorectal malformation|congenital|tracheoesophageal|hydrocephalus|abdominal wall defect/i],
    ["Trauma, Burns & Wounds", /trauma|burn|wound|injur|fasciitis/i],
    ["Endocrine & Neck", /thyroid|parathyroid|adrenal|neck mass/i],
    ["Abdominal & GI Surgery", /abdom|appendic|hernia|pancrea|peptic|obstruction|bowel|stoma|gallstone|jaundice|colorectal|anorectal|oesoph|esoph|gastric|\bgit\b|fistula|endoscop|hemorrhage|haemorrhage|\bibd\b/i],
    ["Perioperative Care & Surgical Skills", /pre-?operative|post-?operative|skills|incision|critical care|nutrition|anemia|anaemia|infection|introduction/i],
    ["Vascular, Skin & Lymphatic", /varicose|lymphoedema|melanoma/i],
  ],
  Psychiatry: [
    ["Psychopathology", /disorders? of|psychopath|symptoms in the mind|perception|thought|memory|affect|speech|motor|language|consciousness|self/i],
    ["Papers & Past Questions", /papp?ers|past/i],
    ["Psychotic & Mood Disorders", /schizo|psychotic|mood|depress|bipolar/i],
    ["Anxiety Disorders", /anxiety/i],
    ["Classification & Diagnosis", /dsm/i],
    ["Neurocognitive Disorders", /neuro-?cognitive/i],
  ],
};
const GENERAL = "General & Other";
function topicOf(f) {
  const rules = TOPICS[f.dept];
  if (!rules) return "";
  const tests = [f.name, ...[...f.path].reverse().filter((p) => !/^(IMED|OBSTERTICS|PAEDS|PHARMACOLOGY|PSYCHIATRY|SURGERY)$/i.test(p) && !/\b(4\.\d|NGUGI|MOGERE|ALEX|WANJA)\b/i.test(p))];
  for (const t of tests) for (const [topic, re] of rules) if (re.test(t)) return topic;
  return GENERAL;
}

// ---- dedupe ----
const norm = (n) => n.toLowerCase().replace(/\.[a-z0-9]{1,5}$/, "").replace(/\s*\(\d+\)\s*$/, "").replace(/\.pptx?$/, "").replace(/^[\d.a-z]{1,3}[.)]\s+/, "").replace(/[\s_\-.]+/g, " ").trim();
const keyOf = (f) => (/^image\//.test(f.mime) || norm(f.name).length < 8 ? `${f.dept}|${norm(f.name)}|${(f.path[f.path.length - 1] || "").toLowerCase()}|${ext(f.name)}` : `${f.dept}|${norm(f.name)}|${ext(f.name)}`);
files.sort((a, b) => a.source - b.source || a.path.length - b.path.length);
const seen = new Set(); const kept = [];
for (const f of files) { const k = keyOf(f); if (seen.has(k)) continue; seen.add(k); kept.push(f); }
stats.duplicates = files.length - kept.length;
stats.kept = kept.length;

const kindOf = (f) => { const e = ext(f.name); return /pdf/.test(f.mime) || e === "pdf" ? "pdf" : /presentation|powerpoint/.test(f.mime) || ["ppt", "pptx", "pps", "ppsx", "pptm"].includes(e) ? "ppt" : /word|msword/.test(f.mime) || ["doc", "docx", "rtf"].includes(e) ? "doc" : /^video\//.test(f.mime) || ["mp4", "wmv", "avi", "mkv"].includes(e) ? "video" : /^image\//.test(f.mime) ? "img" : /zip|rar/.test(f.mime) || ["zip", "rar", "7z"].includes(e) ? "zip" : "file"; };
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const rank = [T.outline, T.books, T.slides, T.notes, T.questions, T.videos, T.images];
const deptOrder = ["Internal Medicine", "Obstetrics & Gynaecology", "Paediatrics & Child Health", "Surgery", "Clinical Pharmacology", "Psychiatry", "Radiology"];

const groups = new Map();
for (const f of kept) {
  const type = typeOf(f); const topic = type === T.books || type === T.outline || type === T.videos || type === T.images || type === T.questions ? "" : topicOf(f);
  const vidTopic = type === T.videos ? (f.path.slice(-1)[0] || "").replace(/^[IVX]+ - /, "") : "";
  const key = `${f.dept}||${type}`;
  if (!groups.has(key)) groups.set(key, { dept: f.dept, type, items: [] });
  groups.get(key).items.push({ f, topic: topic || vidTopic });
}
const mk = (arr) => arr.sort((a, b) => collator.compare(a.f.name, b.f.name)).map(({ f }) => [f.id, f.name, kindOf(f)]);
const tree4 = deptOrder.map((dept) => {
  const gs = [...groups.values()].filter((g) => g.dept === dept).sort((a, b) => rank.indexOf(a.type) - rank.indexOf(b.type));
  if (!gs.length) return null;
  return {
    n: dept,
    d: gs.map((g) => {
      const by = new Map();
      for (const it of g.items) { const k = g.items.length > 12 ? it.topic : ""; (by.get(k) || by.set(k, []).get(k)).push(it); }
      const o = { n: g.type };
      const direct = by.get("") || []; if (direct.length) o.f = mk(direct);
      const tops = [...by.entries()].filter(([k]) => k).sort((a, b) => (a[0] === GENERAL) - (b[0] === GENERAL) || collator.compare(a[0], b[0]));
      if (tops.length) o.d = tops.map(([k, arr]) => ({ n: k, f: mk(arr) }));
      return o;
    }),
  };
}).filter(Boolean);

const count = (n) => (n.f?.length || 0) + (n.d || []).reduce((s, c) => s + count(c), 0);
fs.writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), source: "Google Drive: Year 4 notes", d: tree4 }));

// resources file for the /year/4 page
const enc = (parts) => "/year-4-library?p=" + parts.map(encodeURIComponent).join("/");
const res = tree4.map((s) => ({ title: s.n, description: DESC[s.n] || "", folderHref: enc([s.n]), collections: (s.d || []).map((c) => ({ label: `${c.n} (${count(c)})`, href: enc([s.n, c.n]) })) }));
fs.writeFileSync(RES_OUT, `export type Year4ResourceCollection = {\n  label: string;\n  href: string;\n};\n\nexport type Year4ResourceGroup = {\n  title: string;\n  description: string;\n  folderHref: string;\n  collections: Year4ResourceCollection[];\n};\n\n// Generated from the Year 4 library data (public/data/year4-library.json).\nexport const YEAR4_RESOURCE_GROUPS: Year4ResourceGroup[] = ${JSON.stringify(res, null, 2)};\n\nexport const YEAR4_SOURCE_FOLDER = "/year-4-library";\n`);

console.log(JSON.stringify(stats));
for (const s of tree4) { console.log(`${s.n} [${count(s)}]`); for (const t of s.d) console.log(`    ${t.n} [${count(t)}]` + (t.d ? "  -> " + t.d.map((x) => x.n.split(" ")[0] + " " + count(x)).join(", ") : "")); }
const other = [...groups.values()].flatMap((g) => g.items.filter((i) => i.topic === GENERAL).map((i) => i.f.name));
console.log(`\nGENERAL & OTHER (${other.length}):`, other.slice(0, 40).join(" | "));
