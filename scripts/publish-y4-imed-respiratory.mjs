import fs from "fs";
import { SUPABASE_URL as BASE, SUPABASE_PUBLISHABLE_KEY as K } from "../src/lib/supabase-config.ts";
const U = `${BASE}/rest/v1/articles`;
const H = { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": "application/json", Prefer: "return=representation" };
const A = [
  ["y4-imed-asthma.md", "Bronchial Asthma: Pathophysiology, Diagnosis and GINA Stepwise Management", "bronchial-asthma-internal-medicine-y4", "Naomi Chebet", "Year 4 Internal Medicine notes on asthma: triggers, Th2 immunology, complications, spirometry, acute attack grading and GINA stepwise treatment."],
  ["y4-imed-pneumothorax.md", "Pneumothorax: Classification, Clinical Features and Emergency Management", "pneumothorax-clinical-management-y4", "Dr Wanami Tyson", "Year 4 Internal Medicine notes on pneumothorax: PSP vs SSP, tension pneumothorax, imaging, BTS algorithm, aspiration, chest drains and surgery."],
  ["y4-imed-pleural-effusion.md", "Pleural Effusion: Light's Criteria, Fluid Analysis and Management", "pleural-effusion-lights-criteria-y4", null, "Year 4 Internal Medicine notes on pleural effusion: Starling forces, examination, imaging, thoracentesis, Light's criteria, fluid analysis and management."],
];
for (const [f, title, slug, lecturer, desc] of A) {
  const content = fs.readFileSync(`content-drafts/${f}`, "utf8");
  const ex = await (await fetch(`${U}?select=id&slug=eq.${slug}`, { headers: H })).json();
  const row = { title, slug, content, original_notes: "", category: "Year 4: Internal Medicine", unit: "Internal Medicine", content_kind: "notes", lecturer, published: true, meta_title: `${title} | Ompath Study`, meta_description: desc, tags: ["Year 4", "Internal Medicine", "Respiratory"], toc_enabled: true, reading_time_minutes: Math.ceil(content.split(/\s+/).length / 200) };
  const r = ex.length
    ? await fetch(`${U}?id=eq.${ex[0].id}`, { method: "PATCH", headers: H, body: JSON.stringify(row) })
    : await fetch(U, { method: "POST", headers: H, body: JSON.stringify(row) });
  console.log(slug, r.status, (await r.text()).slice(0, 120));
}
