import type { CaseDef } from "../types";
import { mcq, o } from "../templates";

export const SURGERY_1: CaseDef[] = [
  {
    id: "sg-appy", rotation: "surgery", title: "Central abdominal pain that moved to the right", level: 1, setting: "Surgical casualty", tags: ["appendicitis", "acute abdomen", "peritonitis", "perforation"],
    involved: ["Gastrointestinal / hepatobiliary", "Infective / immune"],
    vignette: "A 19-year-old man presents with 24 hours of abdominal pain. It began around his umbilicus and has now settled in the right lower abdomen. He has lost his appetite and vomited once.",
    hsets: ["core"], esets: ["general", "abd"],
    hx: {
      onset: "Pain started 24 hours ago around the umbilicus; after about 8 hours it moved to the right iliac fossa.", prog: "Steadily worse; now sharp, worse with walking, coughing and bumps in the road.", abd: "No diarrhoea; constipated since yesterday; no urinary symptoms.", gi: "Anorexia, nausea, one vomit after the pain started.", fever: "Feels hot, subjective fevers.",
      pmh: "No previous abdominal problems or operations.", drugs: "Paracetamol.", sex: "Not sexually active.", travel: "No travel.", gu: "No dysuria or haematuria.", wt: "No weight loss.", alc: "None.",
    },
    hxKey: ["onset", "abd", "gi", "fever", "gu", "prog"],
    ex: {
      vit: "BP 118/72, pulse 108/min, RR 20, SpO₂ 98%, temperature 38.2 °C.", face: "Flushed.", mouth: "Dry, furred tongue, foetor.", hydr: "Mildly dehydrated.", abdi: "Flat; reduced movement of the lower abdomen with breathing.",
      abdp: "Tenderness maximal at McBurney’s point with guarding; rebound tenderness; pain in the RIF on palpating the LIF (Rovsing’s sign positive); positive psoas sign.", liv: "No organomegaly.", asc: "Bowel sounds reduced.", pr: "Tender on the right on rectal exam.", pulse: "108/min.",
    },
    exKey: ["vit", "abdp", "hydr", "abdi", "pr"],
    ix: [
      { id: "fbc", group: "Blood", label: "FBC and CRP", result: "WBC 16.8 ×10⁹/L (neutrophils 88%), CRP 78.", meaning: "Acute inflammatory response supports appendicitis (not diagnostic alone).", use: "key" },
      { id: "urine", group: "Bedside", label: "Urinalysis", result: "Normal; no blood, nitrites or leucocytes.", meaning: "Excludes urinary tract disease (UTI, stones).", use: "key" },
      { id: "us", group: "Imaging", label: "Abdominal ultrasound", result: "Non-compressible blind-ending tubular structure 9 mm in the RIF with surrounding fluid; no free air.", meaning: "Acute appendicitis (>6 mm, non-compressible).", use: "useful" },
      { id: "u", group: "Blood", label: "U&E, glucose, group & save", result: "Normal.", meaning: "Pre-operative baseline.", use: "useful" },
      { id: "ct", group: "Imaging", label: "CT abdomen with contrast", result: "Not required.", meaning: "", use: "low", note: "Reserve CT for atypical presentations or diagnostic doubt; here the clinical picture and ultrasound are diagnostic." },
      { id: "preg", group: "Bedside", label: "Pregnancy test", result: "Not applicable.", meaning: "", use: "low", note: "Male patient — it would be essential in a woman of reproductive age." },
    ],
    interpret: [mcq("ap-i1", "interpretation", "WBC 16.8, CRP 78, fever, McBurney tenderness with guarding, positive Rovsing and psoas signs, ultrasound: non-compressible 9 mm appendix. What next?", [
      o("Diagnosis of acute appendicitis: resuscitate, give IV fluids, analgesia and antibiotics, and proceed to appendicectomy", true, "Early surgery prevents perforation."), o("Observe for 3 days", false, "Risk of perforation."), o("Oral antibiotics and discharge", false, "Inappropriate for peritonism."), o("Request a barium enema", false, "No."),
    ], ["What does Rovsing’s sign mean?", "Is there peritonism?", "What is the definitive treatment?", "Appendicectomy."], "Alvarado score helps; surgery is the standard, antibiotics first-line only in selected uncomplicated cases.", { after: "us" })],
    ddx: [
      { name: "Acute appendicitis", aliases: ["appendicitis", "acute appendicitis", "appendiceal abscess"], tier: "likely", why: "Classic migration from periumbilical visceral pain to localised RIF somatic pain with anorexia, fever and leukocytosis.", for: ["Migration, anorexia, vomiting, fever", "RIF guarding, Rovsing’s sign, high WBC"], against: ["None"], separate: { ask: "Migration, anorexia", exam: "McBurney, Rovsing, psoas", ix: "WBC/CRP, ultrasound/CT" } },
      { name: "Mesenteric adenitis / gastroenteritis / Crohn’s disease / terminal ileitis (Yersinia)", aliases: ["mesenteric adenitis", "gastroenteritis", "crohn", "ileitis", "yersinia"], tier: "possible", why: "Common in young people and can mimic appendicitis.", for: ["RIF pain, fever"], against: ["Peritonism, constipation"], separate: { ask: "Diarrhoea, recent sore throat", exam: "Soft abdomen, tender nodes", ix: "Ultrasound, CT" } },
      { name: "Right ureteric colic / UTI / testicular torsion", aliases: ["ureteric colic", "renal colic", "uti", "testicular torsion", "torsion"], tier: "possible", why: "Genitourinary causes of RIF/groin pain, including torsion referred pain.", for: ["Pain"], against: ["Normal urine, no testicular pain"], separate: { ask: "Loin-to-groin pain, haematuria", exam: "Testes, loin tenderness", ix: "Urinalysis, KUB/CT" } },
      { name: "Perforated appendix with peritonitis / perforated duodenal ulcer / caecal pathology / intussusception", aliases: ["peritonitis", "perforation", "perforated appendix", "perforated ulcer"], tier: "dangerous", why: "Delay can cause perforation and generalised peritonitis.", for: ["Fever, guarding"], against: ["Localised not generalised"], separate: { ask: "Sudden worsening", exam: "Rigid abdomen, shock", ix: "Erect CXR, CT" } },
    ],
    twist: { text: "While waiting for theatre the pain suddenly eases for a few hours, then becomes severe and generalised. He is now febrile (39.1 °C), tachycardic (128/min) with a rigid abdomen and absent bowel sounds.", q: mcq("ap-tw", "emergency", "What has happened and what do you do?", [
      o("Perforation with generalised peritonitis — resuscitate (fluids, IV broad-spectrum antibiotics, analgesia, catheter) and take to theatre urgently for laparotomy/laparoscopy, peritoneal lavage and appendicectomy", true, "Source control is essential."), o("Wait for CT", false, "Delay increases mortality."), o("Treat as gastroenteritis", false, "No."), o("Give oral antibiotics", false, "No."),
    ], ["Why did the pain ease?", "What are the signs of peritonitis?", "Medical or surgical?", "Perforation → theatre."], "Transient relief after perforation (pressure release) is a classic trap.") },
    dx: { q: mcq("ap-dx", "pathophysiology", "What is the mechanism of appendicitis?", [
      o("Luminal obstruction (faecolith, lymphoid hyperplasia) → raised pressure, ischaemia and bacterial invasion → inflammation, gangrene and perforation", true, "Obstruction is the trigger."), o("Primary viral infection of the appendix", false, "No."), o("Vascular embolism", false, "No."), o("Autoimmune disease", false, "No."),
    ], ["Why does visceral pain start in the centre?", "Why does it later localise?", "What blocks the lumen?", "Obstruction."], "Midgut visceral pain is periumbilical; peritoneal irritation localises it."),
    },
    mgmt: mcq("ap-mx", "management", "Select correct management.", [
      o("Keep nil by mouth, IV fluids, analgesia, antiemetic; give IV antibiotics (e.g. ceftriaxone + metronidazole)", true, "Pre-operative preparation."), o("Appendicectomy (open or laparoscopic) as soon as optimised", true, "Definitive treatment."), o("If perforated/abscess: source control, peritoneal lavage, continued antibiotics, drain if indicated", true, "Complicated disease."), o("Post-operative: monitor for wound infection, abscess, ileus; early mobilisation; send the appendix for histology", true, "Aftercare."),
      o("Give strong laxatives", false, "Dangerous."), o("Delay surgery for 48 hours to ‘see’", false, "No."),
    ], ["What do you do before theatre?", "What is definitive?", "What if perforated?", "Fluids, antibiotics, appendicectomy."], "Always check for atypical presentations in women, children and the elderly."),
    consultant: [
      mcq("ap-c1", "consultant", "Explain the pain migration.", [
        o("Visceral afferent fibres (T10) give periumbilical pain; as the parietal peritoneum becomes inflamed somatic fibres localise it in the RIF", true, "Embryological midgut innervation."), o("The appendix moves to the right", false, "No."), o("A different organ is involved later", false, "No."), o("It is psychological", false, "No."),
      ], ["Which nerves supply the gut?", "Which peritoneum is sensitive?", "What is the dermatome?", "T10 then somatic."], "Know visceral vs somatic pain."),
      mcq("ap-c2", "consultant", "Name groups in whom appendicitis is atypical (select all).", [
        o("Children (difficult history, rapid perforation)", true, "Yes."), o("Pregnant women (displaced appendix)", true, "Yes."), o("Elderly (blunted signs, delayed presentation)", true, "Yes."), o("Young men", false, "Classic presentation."),
      ], ["Who gives poor history?", "Who has displaced anatomy?", "Who has blunted responses?", "First three."], "Atypical presentations increase morbidity."),
      mcq("ap-c3", "consultant", "What would kill this patient?", [
        o("Perforation → peritonitis/sepsis", true, "Immediate threat."), o("Appendiceal abscess and pylephlebitis", true, "Complications."), o("Adhesional obstruction later", true, "Late."), o("Delay in diagnosis", true, "Preventable."),
      ], ["What happens if it perforates?", "What forms around it?", "What comes later?", "All."], "Appendicectomy remains the commonest emergency operation."),
    ],
    chain: { risk: "Young age, faecolith, lymphoid hyperplasia (infection)", patho: "Luminal obstruction → pressure, ischaemia, bacterial overgrowth → inflammation → perforation", symptoms: "Periumbilical → RIF pain, anorexia, vomiting, fever", signs: "Fever, McBurney tenderness, guarding, Rovsing/psoas signs", ix: "WBC/CRP, ultrasound/CT, urinalysis", dx: "Acute appendicitis", mx: "IV fluids, antibiotics, appendicectomy", comp: "Perforation, abscess, peritonitis, wound infection" },
    mustKnow: ["Migrating pain + anorexia + RIF tenderness = appendicitis until proven otherwise.", "Do a pregnancy test in all women of reproductive age.", "Ultrasound first in children/young women; CT if unclear.", "Surgery is definitive; give pre-op antibiotics.", "Sudden relief of pain can mean perforation.", "Atypical presentations in extremes of age.", "Peritonitis = rigidity, rebound, absent bowel sounds."],
    thinkIf: [["RIF pain + anorexia + fever", "Appendicitis."], ["Colicky loin-to-groin pain + haematuria", "Ureteric colic."], ["RIF pain in a woman + amenorrhoea", "Ectopic pregnancy until excluded."]],
    revise: "appendicitis",
  },
  {
    id: "sg-obstruct", rotation: "surgery", title: "Vomiting, colicky pain and no flatus", level: 2, setting: "Surgical ward", tags: ["intestinal obstruction", "hernia", "strangulation", "fluid and electrolytes"], emergency: true,
    involved: ["Gastrointestinal / hepatobiliary", "Renal / urinary"],
    vignette: "A 60-year-old man with a long-standing groin swelling presents with 2 days of colicky abdominal pain, repeated vomiting and constipation. He has not passed gas for 24 hours.",
    hsets: ["core"], esets: ["general", "abd", "abcde"],
    hx: {
      onset: "Colicky central abdominal pain for 2 days.", abd: "Pain comes in waves every few minutes; abdomen has become swollen; has not passed stool or flatus for a day.", gi: "Repeated vomiting that has become bile-stained then foul; no haematemesis.", pmh: "Right groin swelling for 5 years that he pushed back in; today it is painful and he cannot reduce it.",
      adm: "Appendicectomy 15 years ago.", fever: "Mild fever today.", gu: "Passing little urine.", drugs: "None.", wt: "No weight loss.", alc: "Social.", smoke: "Ex-smoker.", fh: "No bowel cancer.",
    },
    hxKey: ["abd", "gi", "pmh", "adm", "gu", "onset"],
    ex: {
      vit: "BP 100/62, pulse 118/min, RR 24/min, SpO₂ 96%, temperature 37.9 °C.", hydr: "Severely dehydrated: dry tongue, sunken eyes, capillary refill 4 s.", pulse: "118, low volume.", abdi: "Distended abdomen with a lower midline scar and visible peristalsis; a tender, tense, irreducible swelling in the right groin that does not transmit a cough impulse.",
      abdp: "Tenderness around the groin lump with mild guarding elsewhere; no generalised peritonism yet.", asc: "Bowel sounds high-pitched and tinkling; tympanic distension.", liv: "No masses.", pr: "Rectum empty, no blood.", oed: "None.", mouth: "Dry.", nutr: "Normal.",
    },
    exKey: ["vit", "abdi", "abdp", "asc", "hydr", "pr"],
    ix: [
      { id: "axr", group: "Imaging", label: "Plain abdominal X-ray (supine ± erect)", result: "Dilated small bowel loops (>3 cm) with multiple air–fluid levels in a central ‘ladder’ pattern and no gas in the rectum.", meaning: "Small bowel obstruction.", use: "key" },
      { id: "uec", group: "Blood", label: "U&E, creatinine, lactate, glucose", result: "Na 131, K 3.0, urea 14.8, creatinine 148, lactate 4.2.", meaning: "Dehydration with hypokalaemia and raised lactate — warning of bowel ischaemia.", use: "key" },
      { id: "fbc", group: "Blood", label: "FBC, CRP, group & crossmatch", result: "WBC 15, CRP 62, Hb 14.", meaning: "Inflammatory response; prepare for surgery.", use: "useful" },
      { id: "us", group: "Imaging", label: "Groin ultrasound", result: "Right inguinal hernia containing a thick-walled non-peristalsing bowel loop with absent blood flow and free fluid.", meaning: "Strangulated inguinal hernia.", use: "useful" },
      { id: "ct", group: "Imaging", label: "CT abdomen", result: "Not done.", meaning: "", use: "low", note: "The obstruction has an obvious cause; do not delay surgery for imaging." },
      { id: "ba", group: "Imaging", label: "Barium meal and follow-through", result: "Not done.", meaning: "", use: "low", note: "Contraindicated in acute obstruction." },
    ],
    interpret: [mcq("ob-i1", "interpretation", "Dilated small bowel with air–fluid levels, no rectal gas, a tender irreducible groin lump and lactate 4.2. What is your assessment?", [
      o("Small bowel obstruction due to a strangulated inguinal hernia — emergency surgery after resuscitation", true, "Strangulation = ischaemic bowel."), o("Paralytic ileus — conservative management", false, "Mechanical obstruction with a clear cause."), o("Large bowel volvulus", false, "Small bowel pattern."), o("Gastroenteritis", false, "No."),
    ], ["Where is the obstruction?", "What does the lactate say?", "What is the most common cause in this man?", "Strangulated hernia."], "Obstructed → strangulated when blood supply is compromised (pain constant, tenderness, fever, raised lactate).", { after: "axr" })],
    ddx: [
      { name: "Small bowel obstruction from a strangulated inguinal hernia", aliases: ["intestinal obstruction", "bowel obstruction", "small bowel obstruction", "strangulated hernia", "obstructed hernia", "incarcerated hernia", "hernia"], tier: "likely", why: "Irreducible tender groin lump with colicky pain, vomiting and absolute constipation.", for: ["Hernia, vomiting, distension, absolute constipation, tinkling bowel sounds"], against: ["None"], separate: { ask: "Hernia history", exam: "Hernial orifices", ix: "AXR, ultrasound" } },
      { name: "Adhesional small bowel obstruction (previous surgery)", aliases: ["adhesions", "adhesional obstruction", "adhesive obstruction"], tier: "possible", why: "Previous appendicectomy is the commonest cause of adhesions.", for: ["Previous surgery"], against: ["An obvious strangulated hernia"], separate: { ask: "Previous operations", exam: "Scars, no hernia", ix: "CT" } },
      { name: "Large bowel obstruction (colon cancer, volvulus)", aliases: ["colon cancer", "volvulus", "large bowel obstruction", "sigmoid volvulus", "colorectal cancer"], tier: "possible", why: "Distension and constipation in a 60-year-old: cancer must be considered.", for: ["Age, constipation"], against: ["Small-bowel pattern"], separate: { ask: "Weight loss, bleeding", exam: "Mass, PR", ix: "AXR, CT, colonoscopy" } },
      { name: "Mesenteric ischaemia / peritonitis / paralytic ileus", aliases: ["mesenteric ischaemia", "peritonitis", "ileus", "paralytic ileus"], tier: "dangerous", why: "Strangulation risks bowel infarction and peritonitis.", for: ["Raised lactate"], against: ["N/A"], separate: { ask: "Constant pain, sudden severity", exam: "Rigidity", ix: "Lactate, CT" } },
    ],
    event: { when: "after-ix", title: "Peritonitis", text: "Over the next hour his pain becomes constant and severe, he develops a fever of 39.1 °C, and the abdomen becomes rigid.", vitals: "BP 82/50, pulse 136, RR 30, lactate 7.8.", q: mcq("ob-ev", "emergency", "What do you do NOW? (select all)", [
      o("Resuscitate: oxygen, large-bore cannulae, IV crystalloid bolus, antibiotics (ceftriaxone + metronidazole), nasogastric tube, urinary catheter, analgesia", true, "Septic shock from ischaemic bowel."), o("Urgent laparotomy: reduce/repair the hernia, resect non-viable bowel with primary anastomosis or stoma", true, "Definitive source control."), o("Inform senior surgeon/anaesthetist and arrange ICU/HDU; cross-match blood", true, "Team preparation."), o("Wait for repeat X-rays", false, "Fatal."),
    ], ["What is the abdomen telling you?", "Which kind of shock?", "What is definitive?", "Resuscitate, antibiotics, laparotomy."], "Strangulated bowel needs surgery within hours.") },
    dx: { q: mcq("ob-dx", "pathophysiology", "What is the pathophysiology?", [
      o("A loop of bowel trapped in the hernia sac obstructs the lumen; venous congestion then arterial compromise cause ischaemia, gangrene and perforation", true, "Strangulation."), o("Primary motility disorder", false, "No."), o("Viral inflammation", false, "No."), o("Vascular embolism", false, "No."),
    ], ["Which blood vessels are compressed first?", "What happens to the bowel wall?", "What leaks?", "Venous then arterial compromise."], "Closed-loop obstruction is a surgical emergency."),
    },
    mgmt: mcq("ob-mx", "management", "Select correct management.", [
      o("‘Drip and suck’: IV fluids with potassium, nasogastric decompression, nil by mouth, analgesia, antibiotics", true, "Resuscitation."), o("Emergency surgery for strangulation: hernia reduction/repair, resect non-viable bowel", true, "Definitive."), o("Monitor urine output (catheter), electrolytes and lactate; thromboprophylaxis", true, "Post-operative care."), o("Elective repair of the contralateral side/mesh later; counsel on risk factors", true, "Prevention."),
      o("Attempt prolonged manual reduction of a tender, strangulated hernia", false, "Risk of reducing gangrenous bowel."), o("Give prokinetics", false, "Contraindicated in mechanical obstruction."),
    ], ["What resuscitates?", "What decompresses?", "What is definitive?", "Drip and suck, surgery."], "Any hernia that is tender, irreducible and with symptoms of obstruction is an emergency."),
    consultant: [
      mcq("ob-c1", "consultant", "List causes of small bowel obstruction (select all).", [
        o("Adhesions", true, "Commonest in developed countries."), o("Hernias", true, "Commonest in many African settings."), o("Tumours, intussusception, volvulus", true, "Others."), o("Gallstone ileus, Crohn’s strictures, TB", true, "Others (TB common in endemic regions)."),
      ], ["Think inside, wall, outside.", "Common causes?", "TB?", "All."], "Classify as intraluminal, mural, extrinsic."),
      mcq("ob-c2", "pathophysiology", "Why are electrolytes deranged?", [
        o("Vomiting loses H⁺, Cl⁻, K⁺ (hypokalaemic hypochloraemic alkalosis); third-space sequestration loses fluid and sodium", true, "Dehydration and electrolyte loss."), o("Because of renal failure only", false, "No."), o("Because of excess salt intake", false, "No."), o("Because of liver failure", false, "No."),
      ], ["Where does the fluid go?", "What does vomiting lose?", "Why hypokalaemia?", "Vomiting and sequestration."], "Replace K⁺ once urine output is established."),
      mcq("ob-c3", "consultant", "What would kill this patient?", [
        o("Septic shock from perforation/gangrene", true, "Immediate."), o("Hypovolaemia and electrolyte disturbance", true, "Metabolic."), o("Aspiration pneumonia from vomiting", true, "Airway."), o("Short bowel after resection (long term)", true, "Late complication."),
      ], ["ABC.", "Airway risk?", "What happens to the gut?", "All."], "Protect the airway with an NG tube."),
    ],
    chain: { risk: "Long-standing hernia, previous abdominal surgery, constipation", patho: "Bowel trapped in the sac → obstruction → venous then arterial occlusion → gangrene → perforation → sepsis", symptoms: "Colicky pain, vomiting, distension, absolute constipation, painful groin lump", signs: "Tender irreducible hernia, distension, tinkling bowel sounds, dehydration", ix: "AXR (ladder pattern), U&E/lactate, ultrasound, FBC", dx: "Strangulated inguinal hernia with small bowel obstruction", mx: "Resuscitate, NG decompression, antibiotics, emergency surgery", comp: "Bowel infarction, sepsis, aspiration, AKI" },
    mustKnow: ["Examine all hernial orifices in every patient with obstruction.", "Irreducible + tender + vomiting = strangulation until proven otherwise.", "Drip and suck, but do not delay surgery for strangulation.", "Raised lactate suggests ischaemia.", "Pain becomes constant and severe with peritonism when bowel dies.", "Replace fluids and potassium.", "Do not give prokinetics or barium."],
    thinkIf: [["Vomiting + colic + distension + no flatus", "Intestinal obstruction."], ["Tender irreducible groin lump", "Strangulated hernia."], ["Age >50 + new constipation + weight loss + obstruction", "Colon cancer."]],
    revise: "intestinal obstruction",
  },
  {
    id: "sg-trauma", rotation: "surgery", title: "Motorbike crash on the highway", level: 3, setting: "Casualty — trauma bay", tags: ["trauma", "ABCDE", "tension pneumothorax", "head injury", "haemorrhage"], emergency: true,
    involved: ["Musculoskeletal / trauma", "Respiratory", "Cardiovascular", "Neurological"],
    vignette: "A 27-year-old man is brought by ambulance after his motorbike collided with a lorry. He was not wearing a helmet. He is groaning, struggling to breathe and has a swollen deformed left thigh.",
    hsets: ["core"], esets: ["abcde", "general"],
    hx: {
      onset: "Crash 40 minutes ago; unconscious for a short time at the scene.", cp: "Severe left chest pain, worse on breathing.", sob: "Struggling to breathe.", neuro: "Brief loss of consciousness; vomited once; headache.", abd: "Abdominal pain on the left.", pmh: "Not known.", drugs: "Not known.", allergy: "Not known (use AMPLE as available).",
      alc: "Smell of alcohol; last meal unknown.", sex: "Unknown.", swell: "Left thigh swollen.", fever: "None.",
    },
    hxKey: ["onset", "neuro", "sob", "abd", "allergy"],
    ex: {
      A: "Talking in short phrases; blood in the mouth; C-spine collar applied. Airway currently patent.", B: "RR 36/min, SpO₂ 82% on 15 L oxygen, trachea deviated to the right, left hemithorax hyper-resonant with absent breath sounds, distended neck veins, subcutaneous emphysema; paradoxical movement not seen.",
      C: "BP 82/48, pulse 138/min, CRT 4 s, cold peripheries; deformed, swollen left thigh (femoral fracture) with bleeding; abdomen distended with left upper quadrant tenderness.", D: "GCS 12 (E3 V4 M5); pupils equal; glucose 5.4 mmol/L.", E: "Left thigh deformity and wound, left chest bruising and abrasions; keep warm; log-roll shows no spinal deformity but he has a scalp laceration.",
      vit: "BP 82/48, pulse 138, RR 36, SpO₂ 82%, temperature 35.6 °C.", gcs: "GCS 12.", pulse: "138/min thready.", neck: "Distended neck veins; trachea deviated right.", hydr: "Hypovolaemic.",
    },
    exKey: ["A", "B", "C", "D", "E"],
    ix: [
      { id: "efast", group: "Imaging", label: "eFAST (extended focused assessment with sonography for trauma)", result: "Absent lung sliding on the left; free fluid in the splenorenal space (Morison/Koller); no pericardial effusion.", meaning: "Left pneumothorax (tension) and intra-abdominal haemorrhage (probable splenic injury).", use: "key" },
      { id: "glu", group: "Bedside", label: "Glucose, blood gas, lactate, FBC, crossmatch", result: "Glucose 5.4; lactate 6.8; Hb 8.4; base excess −10; group O positive; crossmatch 6 units.", meaning: "Haemorrhagic shock.", use: "key" },
      { id: "cxr", group: "Imaging", label: "Chest X-ray (after decompression)", result: "Left lung re-expanded after drain; fractures of ribs 5–8; no mediastinal widening.", meaning: "Pneumothorax resolved; rib fractures.", use: "useful" },
      { id: "ct", group: "Imaging", label: "CT head/neck/chest/abdomen (after stabilisation)", result: "Small left frontal contusion with no mass effect; splenic laceration grade IV with haemoperitoneum; no spinal fracture.", meaning: "Multiple injuries: splenic laceration needs surgery if unstable.", use: "useful" },
      { id: "xray", group: "Imaging", label: "Femur X-ray", result: "Comminuted mid-shaft left femoral fracture.", meaning: "Major blood loss source (up to 1.5 L).", use: "useful" },
      { id: "ctfirst", group: "Imaging", label: "CT scan before resuscitation", result: "Not done.", meaning: "", use: "low", note: "An unstable patient must not go to CT: resuscitate first." },
    ],
    interpret: [mcq("tr-i1", "interpretation", "Trachea deviated right, hyper-resonant left chest with absent breath sounds, distended neck veins, BP 82/48, SpO₂ 82%. What is the immediate problem?", [
      o("Tension pneumothorax — immediate needle decompression (second intercostal space midclavicular, or 5th intercostal space anterior axillary) then chest drain", true, "Life-threatening: clinical diagnosis; do not wait for X-ray."), o("Massive haemothorax", false, "Would give dull percussion."), o("Cardiac tamponade", false, "Absent breath sounds/hyper-resonance not typical."), o("Flail chest", false, "Paradoxical movement not seen."),
    ], ["Which findings are on the left?", "What is happening to the mediastinum?", "Treat now or image first?", "Tension pneumothorax."], "Remember Primary Survey: treat as you find (ATLS).", { after: "efast" })],
    ddx: [
      { name: "Tension pneumothorax (B)", aliases: ["tension pneumothorax", "pneumothorax", "chest injury"], tier: "likely", why: "Deviated trachea, absent breath sounds, hyper-resonance and shock after chest trauma.", for: ["Deviated trachea, hypotension, distended neck veins, absent breath sounds"], against: ["None"], separate: { ask: "Mechanism of injury", exam: "Trachea, percussion", ix: "eFAST, clinical diagnosis" } },
      { name: "Haemorrhagic shock (C) — splenic injury, femoral fracture, pelvic fracture, haemothorax", aliases: ["haemorrhagic shock", "hypovolaemic shock", "splenic injury", "internal bleeding", "ruptured spleen", "intra-abdominal haemorrhage"], tier: "dangerous", why: "Hypotension with tachycardia and distended abdomen after high-energy trauma.", for: ["Hypotension, tachycardia, left upper quadrant tenderness, femoral fracture"], against: ["Raised JVP suggests obstructive shock too"], separate: { ask: "Mechanism", exam: "Abdomen, pelvis, thigh", ix: "eFAST, Hb, CT when stable" } },
      { name: "Traumatic brain injury (D)", aliases: ["head injury", "tbi", "traumatic brain injury", "intracranial haemorrhage", "brain injury", "extradural haematoma"], tier: "dangerous", why: "Loss of consciousness without a helmet, GCS 12, vomiting.", for: ["LOC, GCS 12, vomiting, scalp laceration"], against: ["Shock must be corrected first to protect the brain"], separate: { ask: "Loss of consciousness, vomiting", exam: "GCS, pupils", ix: "CT head" } },
      { name: "Cardiac tamponade / aortic injury / spinal cord injury / airway obstruction", aliases: ["tamponade", "aortic injury", "spinal injury", "airway obstruction", "cervical spine injury"], tier: "possible", why: "Other life-threats to exclude in blunt trauma.", for: ["High-energy trauma"], against: ["Findings pointing to pneumothorax"], separate: { ask: "Neurological symptoms", exam: "Beck’s triad, spinal tenderness", ix: "eFAST, CXR, CT" } },
    ],
    event: { when: "after-exam", title: "Deteriorating after decompression", text: "After decompression and chest drain insertion his saturation rises to 94%, but his BP stays 80/46 and the pulse is 140. Two litres of crystalloid have given only a transient response.", vitals: "BP 78/44, HR 144, GCS 11, abdomen increasingly distended.", q: mcq("tr-ev", "emergency", "What do you do NOW? (select all)", [
      o("Activate massive transfusion protocol: blood (and plasma/platelets, 1:1:1) rather than more crystalloid; permissive hypotension; give tranexamic acid 1 g within 3 h", true, "Haemorrhagic shock needs blood."), o("Control haemorrhage: direct pressure/splint (traction) for the femur, pelvic binder if indicated, and urgent laparotomy for splenic bleeding", true, "Stop the bleeding."), o("Maintain normothermia, treat pain, protect the C-spine, keep SpO₂ ≥94% and avoid hypotension to protect the brain", true, "Damage control resuscitation."), o("Send for CT now", false, "Unstable — theatre first."),
    ], ["What is the cause of shock now?", "What replaces blood?", "How do you stop the bleeding?", "Blood, TXA, surgical control."], "Lethal triad: hypothermia, acidosis, coagulopathy — prevent it.") },
    dx: { q: mcq("tr-dx", "pathophysiology", "What is the best working summary?", [
      o("Polytrauma: tension pneumothorax, haemorrhagic shock from splenic laceration and femoral fracture, mild traumatic brain injury and rib fractures — treated in ATLS order (A, B, C, D, E)", true, "Treat life threats in sequence."), o("Isolated head injury", false, "No."), o("Isolated femoral fracture", false, "No."), o("Aortic dissection", false, "No."),
    ], ["Which life threats did you find?", "Treat in what order?", "Which is lethal first?", "ATLS order."], "Primary survey first: treat as you go."),
    },
    mgmt: mcq("tr-mx", "management", "Select the correct trauma management principles.", [
      o("Primary survey ABCDE with simultaneous resuscitation: airway with C-spine control, oxygen, needle decompression/chest drain, two wide-bore IV lines, blood", true, "ATLS."), o("Haemorrhage control: tourniquet/pressure, pelvic binder, tranexamic acid, early surgery; avoid excess crystalloid", true, "Damage control."), o("Neuroprotection: avoid hypotension/hypoxia, 30° head-up once spine cleared, urgent CT head, neurosurgical review", true, "Brain."), o("Secondary survey after stabilisation: head-to-toe, tetanus prophylaxis, antibiotics for open fracture, analgesia, definitive fracture fixation", true, "Complete care."),
      o("Remove the helmet/collar to take a history", false, "Protect the C-spine."), o("CT first in the unstable patient", false, "Dangerous."),
    ], ["What order?", "What replaces lost blood?", "What protects the brain?", "ATLS."], "Tetanus prophylaxis and wound care are often forgotten."),
    consultant: [
      mcq("tr-c1", "consultant", "Give the ATLS primary survey in order and one life-threat for each (select all true).", [
        o("A: airway obstruction with C-spine control", true, "A."), o("B: tension pneumothorax, massive haemothorax, flail chest, open pneumothorax", true, "B."), o("C: haemorrhagic shock, tamponade", true, "C."), o("D: raised ICP/hypoglycaemia; E: hypothermia/missed injuries", true, "D and E."),
      ], ["Letters ABCDE.", "Which is immediately lethal?", "What do you do in D?", "All."], "Treat as you find: don’t move on until A is secure."),
      mcq("tr-c2", "pathophysiology", "Why is hypotensive (permissive) resuscitation used and when is it contraindicated?", [
        o("Avoids dislodging clots and dilutional coagulopathy while bleeding is uncontrolled; contraindicated in head injury (needs cerebral perfusion pressure)", true, "Balance."), o("To make the patient hypotensive for surgery", false, "No."), o("Because fluids are scarce", false, "No."), o("It is never used", false, "No."),
      ], ["What do clots do?", "What does brain need?", "Which patients differ?", "Avoid clot disruption but not in TBI."], "Target systolic ~80–90 in haemorrhage (not head injury)."),
      mcq("tr-c3", "consultant", "What would kill this patient first, and then?", [
        o("Tension pneumothorax (minutes), then haemorrhagic shock", true, "Prioritise by lethality."), o("Airway obstruction/aspiration", true, "Always possible."), o("Expanding intracranial haematoma", true, "Later."), o("Lethal triad: hypothermia, acidosis, coagulopathy", true, "Resuscitation failure."),
      ], ["Treat what is killing first.", "A–B–C order.", "Brain next.", "All."], "Triage by physiology, not by the most dramatic injury."),
    ],
    chain: { risk: "High-energy mechanism, no helmet, alcohol, road environment", patho: "Blunt chest trauma → lung laceration with one-way valve → tension pneumothorax; solid organ laceration and long-bone fracture → blood loss; head impact → TBI", symptoms: "Chest pain, dyspnoea, abdominal pain, loss of consciousness", signs: "Deviated trachea, hyper-resonance, hypotension, distended abdomen, deformed thigh, GCS 12", ix: "eFAST, gas/lactate/Hb, CXR, CT when stable, femur X-ray", dx: "Polytrauma: tension pneumothorax + haemorrhagic shock + TBI", mx: "ABCDE, decompression, blood/TXA, haemorrhage control, neuroprotection, secondary survey", comp: "Death, lethal triad, ARDS, fat embolism, compartment syndrome" },
    mustKnow: ["ABCDE with simultaneous treatment; protect the C-spine.", "Tension pneumothorax is a clinical diagnosis: decompress immediately.", "Hypotension in trauma = haemorrhage until proven otherwise.", "Give blood, not litres of crystalloid; TXA within 3 hours.", "Unstable = theatre, not CT.", "Protect the brain: avoid hypoxia and hypotension.", "Do a secondary survey and give tetanus prophylaxis."],
    thinkIf: [["Trauma + deviated trachea + absent breath sounds + shock", "Tension pneumothorax."], ["Trauma + hypotension + distended abdomen", "Intra-abdominal haemorrhage."], ["Head injury + lucid interval + falling GCS", "Extradural haematoma."]],
    revise: "trauma ATLS",
  },
]
