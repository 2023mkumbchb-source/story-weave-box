import fs from "fs";
import { SUPABASE_URL as BASE, SUPABASE_PUBLISHABLE_KEY as K } from "../src/lib/supabase-config.ts";
const H = { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": "application/json" };
const D = "/tmp/img/";
// [draft file, slug, [[image, caption, heading to place it under]]]
const PLAN = [
  ["y4-imed-asthma.md", "bronchial-asthma-internal-medicine-y4", [
    ["asthma-s3-1.jpg", "Drug triggers of asthma", "## Causes and Risk Factors"],
    ["asthma-s7-1.jpg", "Immunological mechanism on allergen exposure", "## Immunological Mechanism on Allergen Exposure"],
    ["asthma-s15-1.jpg", "Peak expiratory flow and lung function testing", "## Diagnostic Approach"],
    ["asthma-s16-1.jpg", "Paediatric asthma", "## Paediatric Asthma"],
  ]],
  ["y4-imed-pneumothorax.md", "pneumothorax-clinical-management-y4", [
    ["ptx-s5-1.jpg", "Air entering the pleural space — collapsed lung", "## Mechanism"],
    ["ptx-s7-1.jpg", "Classification of pneumothorax", "## Classification"],
    ["ptx-s12-1.jpg", "Clinical types of pneumothorax", "## Clinical Types"],
    ["ptx-s14-1.jpg", "Closed, open and tension pneumothorax compared", "## Clinical Types"],
    ["ptx-s21-1.jpg", "Chest X-ray in erect and supine positions", "### Chest X-ray (erect PA)"],
    ["ptx-s22-1.jpg", "Small pneumothorax on chest X-ray", "### Chest X-ray (erect PA)"],
    ["ptx-s24-1.jpg", "Pneumothorax with mediastinal shift", "### Chest X-ray (erect PA)"],
    ["ptx-s26-1.jpg", "Pneumothorax on CT", "### CT chest"],
    ["ptx-s28-1.jpg", "BTS guideline for spontaneous pneumothorax", "### BTS approach"],
    ["ptx-s33-1.jpg", "Intercostal drain with underwater seal", "### Intercostal tube drainage"],
    ["ptx-s34-1.jpg", "The safe triangle for chest drain insertion", "### Intercostal tube drainage"],
  ]],
  ["y4-imed-pleural-effusion.md", "pleural-effusion-lights-criteria-y4", [
    ["pe-02.jpg", "Normal pleural physiology", "## Normal Physiology"],
    ["pe-03.jpg", "Starling forces in pleural effusion", "## Mechanisms: Starling Forces"],
    ["pe-04.jpg", "Clinical presentation", "## Clinical Presentation"],
    ["pe-05.jpg", "Physical examination and percussion differential", "## Physical Examination"],
    ["pe-06.jpg", "Pleural effusion on chest X-ray", "### Chest X-ray"],
    ["pe-07.jpg", "Ultrasound and CT chest", "### Ultrasound — bedside gold standard"],
    ["pe-08.jpg", "Thoracentesis safety — over the top of the rib", "## Diagnostic Thoracentesis"],
    ["pe-09.jpg", "Transudate vs exudate", "## Transudate vs Exudate"],
    ["pe-10.jpg", "Light's criteria", "## Light's Criteria"],
    ["pe-11.jpg", "Exam trap: diuretics in heart failure", "### Exam trap: diuretics in heart failure"],
    ["pe-12.jpg", "Causes of transudates", "### Transudates"],
    ["pe-13.jpg", "Causes of exudates", "### Exudates"],
    ["pe-14.jpg", "Visual clues in pleural fluid", "## Special Fluid Analysis"],
    ["pe-15.jpg", "pH in parapneumonic effusions", "### The pH clue: parapneumonic effusions"],
    ["pe-16.jpg", "Low glucose — MEAT", "### Low glucose (< 60 mg/dL) — mnemonic **MEAT**"],
    ["pe-17.jpg", "Targeted biomarker clues", "### Targeted biomarkers"],
    ["pe-18.jpg", "Escalating interventions", "## Management: Escalating Steps"],
    ["pe-19.jpg", "Key numbers", "## Key Numbers"],
  ]],
];
for (const [file, slug, imgs] of PLAN) {
  let md = fs.readFileSync(`content-drafts/${file}`, "utf8");
  for (const [img, cap, head] of imgs) {
    const dataUrl = "data:image/jpeg;base64," + fs.readFileSync(D + img).toString("base64");
    const r = await fetch(`${BASE}/functions/v1/r2-upload`, { method: "POST", headers: H, body: JSON.stringify({ dataUrl, filename: `y4-imed-${img}` }) });
    const j = await r.json();
    if (!j.url) { console.log("upload failed", img, JSON.stringify(j).slice(0, 120)); continue; }
    const i = md.indexOf(head + "\n");
    if (i < 0) { console.log("heading missing", head); continue; }
    const at = i + head.length + 1;
    md = md.slice(0, at) + `\n![${cap}](${j.url})\n` + md.slice(at);
  }
  fs.writeFileSync(`content-drafts/${file}`, md);
  const r = await fetch(`${BASE}/rest/v1/articles?slug=eq.${slug}`, { method: "PATCH", headers: H, body: JSON.stringify({ content: md, og_image_url: (md.match(/!\[[^\]]*\]\((\S+)\)/) || [])[1] || null }) });
  console.log(slug, r.status, (md.match(/!\[/g) || []).length, "images");
}
