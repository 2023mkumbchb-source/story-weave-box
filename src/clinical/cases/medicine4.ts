import type { CaseDef } from "../types";
import { mcq, o } from "../templates";

export const MEDICINE_4: CaseDef[] = [
  {
    id: "med-aki", rotation: "medicine", title: "Weak, tired and passing little urine", level: 3, setting: "Medical ward", tags: ["AKI", "CKD", "hyperkalaemia", "uraemia", "electrolytes"], emergency: true,
    involved: ["Renal / urinary", "Cardiovascular", "Toxic / drug-related"],
    vignette: "A 58-year-old man with long-standing diabetes and hypertension, on treatment for knee pain, is brought in with 4 days of vomiting, diarrhoea and poor intake. Over two days he has passed very little urine and has become weak and drowsy.",
    hsets: ["core"], esets: ["general", "cvs", "resp", "abd"],
    hx: {
      onset: "4 days of vomiting and diarrhoea; urine very scanty for 2 days.", gu: "Passing only a few spoonfuls of dark urine; no pain or blood.", gi: "Vomiting and watery diarrhoea, no blood.", neuro: "Drowsy, muscle weakness, cramps.", sob: "Slightly breathless on lying flat today.", swell: "Ankle swelling for a day.",
      pmh: "Type 2 diabetes 12 years, hypertension 15 years, known CKD stage 3 (creatinine ~140).", drugs: "Lisinopril, metformin, furosemide and diclofenac for knee pain (taken daily for 2 weeks); also herbal remedy.", alc: "Rare.", smoke: "Non-smoker.", fh: "Father on dialysis.", fever: "None.",
    },
    hxKey: ["gu", "gi", "drugs", "pmh", "sob", "swell"],
    ex: {
      vit: "BP 90/52 mmHg, pulse 112/min, RR 26/min (deep), SpO₂ 95%, temperature 37.0 °C, weight 70 kg (usual 74 kg). Glucose 9.2 mmol/L.", gcs: "GCS 13.", pulse: "112, weak but regular.", hydr: "Dry mucosa, reduced skin turgor, JVP not visible.", neck: "JVP not elevated.", oed: "Mild pitting ankle oedema.", hands: "Flapping tremor (asterixis).",
      bases: "Bibasal fine crackles.", hs: "Normal heart sounds; no rub.", breath: "Deep, rapid respiration; bibasal crackles.", abdp: "Soft; no palpable bladder.", rr: "Deep, sighing breaths (acidotic breathing); generalised weakness and hyporeflexia.",
    },
    exKey: ["vit", "hydr", "pulse", "neck", "abdp", "rr"],
    ix: [
      { id: "ecg", group: "Bedside", label: "12-lead ECG", result: "Sinus rhythm 98/min; tall peaked T waves, flattened P waves, widened QRS (120 ms).", meaning: "Hyperkalaemia with conduction changes — a life-threatening arrhythmia risk requiring immediate treatment.", use: "key" },
      { id: "uec", group: "Blood", label: "U&E, creatinine, bicarbonate", result: "Na 131, K 7.4 mmol/L, urea 38 mmol/L, creatinine 612 µmol/L (baseline 140), HCO₃ 11.", meaning: "Severe AKI on CKD with life-threatening hyperkalaemia and metabolic acidosis.", use: "key" },
      { id: "abg", group: "Blood", label: "Blood gas and lactate", result: "pH 7.18, HCO₃ 11, PaCO₂ 2.8 kPa, lactate 2.6.", meaning: "Metabolic acidosis (uraemic + hypovolaemic) with respiratory compensation.", use: "key" },
      { id: "us", group: "Imaging", label: "Renal tract ultrasound", result: "Normal-sized kidneys with mild loss of corticomedullary differentiation; no hydronephrosis; bladder empty.", meaning: "No obstruction: AKI is pre-renal evolving to intrinsic (ATN) on CKD.", use: "key" },
      { id: "urine", group: "Blood", label: "Urinalysis and urine sodium", result: "Protein 1+, no blood, granular casts; urine Na 48 mmol/L.", meaning: "Muddy-brown casts/high urine Na: acute tubular necrosis rather than purely pre-renal.", use: "useful" },
      { id: "fbc", group: "Blood", label: "FBC", result: "Hb 9.8, WBC 12.", meaning: "Anaemia of CKD; mild leucocytosis from stress.", use: "useful" },
      { id: "biopsy", group: "Other", label: "Renal biopsy", result: "Not done.", meaning: "", use: "low", note: "Not indicated for an obvious pre-renal/ATN cause with a clear precipitant." },
    ],
    interpret: [mcq("aki-i1", "interpretation", "K⁺ 7.4 with peaked T waves and widened QRS. What is the FIRST treatment priority?", [
      o("IV calcium gluconate to stabilise the myocardium", true, "Calcium protects the heart immediately (does not lower K⁺)."), o("IV insulin and dextrose alone", false, "Shifts K⁺ but takes 15–30 min; membrane stabilisation first."), o("Oral potassium binders alone", false, "Too slow."), o("Wait for a repeat sample", false, "ECG changes mean treat now."),
    ], ["What threatens the patient in minutes?", "Which drug protects heart cells?", "What does calcium NOT do?", "Calcium first, then shift, then remove."], "Treatment ladder: stabilise (calcium) → shift (insulin/dextrose, salbutamol, bicarbonate) → remove (diuretic, binders, dialysis).", { after: "ecg" })],
    ddx: [
      { name: "Acute kidney injury on CKD — pre-renal/ATN from dehydration + NSAID + ACE inhibitor", aliases: ["aki", "acute kidney injury", "acute renal failure", "atn", "acute tubular necrosis", "pre-renal", "prerenal", "ckd", "aki on ckd"], tier: "likely", why: "Volume depletion plus NSAID plus ACE inhibitor plus diuretic ('triple whammy') in a diabetic with CKD.", for: ["Vomiting/diarrhoea, hypotension, oliguria", "NSAID, ACE inhibitor, diuretic, metformin"], against: ["None"], separate: { ask: "Fluid losses, nephrotoxic drugs", exam: "Dehydration, empty bladder", ix: "Urea:creatinine, urinary Na, casts, ultrasound" } },
      { name: "Obstructive uropathy (post-renal)", aliases: ["obstruction", "post-renal", "bph", "urinary retention", "obstructive uropathy", "hydronephrosis", "stones"], tier: "dangerous", why: "Oliguria in a man could be urinary retention from prostate disease; reversible if relieved early.", for: ["Oliguria"], against: ["No palpable bladder, no hydronephrosis"], separate: { ask: "Hesitancy, poor stream", exam: "Palpable bladder, prostate", ix: "Bladder scan/ultrasound" } },
      { name: "Glomerulonephritis / vasculitis (intrinsic renal)", aliases: ["glomerulonephritis", "nephritis", "nephritic", "rapidly progressive glomerulonephritis", "vasculitis"], tier: "possible", why: "AKI with haematuria and hypertension suggests glomerular disease.", for: ["AKI"], against: ["No haematuria, clear precipitant"], separate: { ask: "Rash, sore throat, haematuria", exam: "BP, oedema", ix: "Urine microscopy, complement, ANCA" } },
      { name: "Sepsis / metformin-associated lactic acidosis", aliases: ["sepsis", "lactic acidosis", "metformin", "mala"], tier: "possible", why: "Metformin accumulates in AKI and can cause lactic acidosis; sepsis causes AKI.", for: ["Acidosis, diabetic on metformin"], against: ["Lactate only 2.6, no fever"], separate: { ask: "Fever, source", exam: "Temperature, perfusion", ix: "Lactate, cultures" } },
    ],
    event: { when: "after-ix", title: "Wide-complex rhythm", text: "While you assess him the monitor shows a widening QRS and a sine-wave pattern. He becomes hypotensive and drowsier.", vitals: "BP 78/40, pulse 48/min, sine-wave ECG, K⁺ 7.8.", q: mcq("aki-ev", "emergency", "What do you do NOW? (select all)", [
      o("IV calcium gluconate 10% 10–20 mL over 10 min (repeat if ECG not improving) with cardiac monitoring", true, "Stabilises the myocardium immediately."), o("IV 10 units soluble insulin with 50 mL 50% dextrose, nebulised salbutamol, and consider IV sodium bicarbonate for acidosis", true, "Shifts K⁺ into cells."), o("Urgent haemodialysis / call nephrology — definitive removal", true, "Needed for refractory hyperkalaemia and severe AKI."), o("Give oral potassium binder only and observe", false, "Too slow."),
    ], ["Cardiac membrane first.", "What shifts potassium into cells?", "What removes it from the body?", "Calcium, insulin/dextrose/salbutamol, dialysis."], "Hyperkalaemia with ECG changes is a medical emergency.") },
    dx: { q: mcq("aki-dx", "pathophysiology", "What is the diagnosis?", [
      o("AKI (ATN) on CKD precipitated by dehydration and nephrotoxic drugs, complicated by severe hyperkalaemia and metabolic acidosis", true, "Explains everything."), o("Primary glomerulonephritis", false, "No."), o("Obstructive nephropathy", false, "No obstruction."), o("Heart failure", false, "No."),
    ], ["Which three drugs hurt the kidney?", "Is the bladder full?", "What does AKI cause in the blood?", "AKI on CKD."], "Always review the drug list in AKI."),
    },
    mgmt: mcq("aki-mx", "management", "Which steps are appropriate? (select all)", [
      o("Stop NSAID, ACE inhibitor, metformin and diuretic; avoid further nephrotoxins", true, "Remove the cause."), o("Cautious IV fluid resuscitation (if hypovolaemic) with strict fluid balance and catheter for urine output", true, "Restore perfusion without overload."), o("Treat hyperkalaemia, acidosis and infection; renal replacement therapy if refractory/uraemic", true, "Dialysis indications: refractory hyperK, acidosis, fluid overload, uraemic complications."), o("Review drug doses for renal function and monitor daily weights, U&E", true, "Safe prescribing."),
      o("Give furosemide aggressively before restoring volume", false, "Worsens hypovolaemia."), o("Restart ACE inhibitor immediately", false, "Delay until recovery."),
    ], ["What caused the injury?", "What do you restore?", "When is dialysis indicated?", "Stop toxins, resuscitate, treat complications, dialyse if needed."], "Mnemonic for dialysis: AEIOU (Acidosis, Electrolytes, Intoxication, Overload, Uraemia)."),
    consultant: [
      mcq("aki-c1", "consultant", "What is the ‘triple whammy’ and why is it dangerous?", [
        o("ACE inhibitor/ARB + diuretic + NSAID — together they remove the afferent and efferent compensation and cause hypovolaemia, causing AKI", true, "Classic cause of AKI."), o("Insulin + metformin + aspirin", false, "No."), o("Beta-blocker + digoxin + warfarin", false, "No."), o("Antibiotic + antifungal + antiviral", false, "No."),
      ], ["Which drugs affect renal perfusion?", "Prostaglandins vasodilate the afferent arteriole.", "ACEI dilates the efferent arteriole.", "ACEI + diuretic + NSAID."], "Hold these drugs when a patient has vomiting/diarrhoea (‘sick day rules’)."),
      mcq("aki-c2", "pathophysiology", "Why does AKI cause hyperkalaemia and acidosis?", [
        o("Reduced GFR and tubular secretion retain K⁺ and H⁺; acidosis also shifts K⁺ out of cells", true, "Both effects."), o("Because of too much insulin", false, "No."), o("Because of dehydration alone", false, "No."), o("Because the liver fails", false, "No."),
      ], ["Where is K⁺ excreted?", "Where are acids excreted?", "What does acidosis do to K⁺ distribution?", "Retention + shift."], "Know the complications of AKI."),
      mcq("aki-c3", "consultant", "How do you distinguish AKI from CKD at the bedside?", [
        o("Prior creatinine and history, small echogenic kidneys on ultrasound, anaemia/bone disease favour CKD", true, "Chronicity markers."), o("Urine colour", false, "No."), o("Blood pressure", false, "No."), o("The heart rate", false, "No."),
      ], ["What do you compare creatinine to?", "What does ultrasound show in CKD?", "Which markers take time?", "Previous creatinine + small kidneys."], "Ask for old results — they are the best discriminator."),
    ],
    chain: { risk: "Diabetes, hypertension, CKD, NSAID/ACEI/diuretic use, dehydration", patho: "Volume depletion + drugs → reduced GFR → ATN; retention of K⁺, H⁺, urea", symptoms: "Oliguria, vomiting, weakness, drowsiness, breathlessness", signs: "Hypotension, dehydration, Kussmaul breathing, asterixis, fluid overload late", ix: "ECG (peaked T), U&E (K⁺ 7.4, creat 612), gas (acidosis), ultrasound (no obstruction), urine casts", dx: "AKI (ATN) on CKD with hyperkalaemia and acidosis", mx: "Calcium, insulin/dextrose, salbutamol; stop nephrotoxins; fluids; dialysis if refractory", comp: "Arrhythmia/cardiac arrest, pulmonary oedema, uraemic encephalopathy, bleeding" },
    mustKnow: ["Hyperkalaemia with ECG changes: calcium gluconate IV first.", "Triple whammy: ACEI/ARB + diuretic + NSAID.", "Always exclude obstruction (ultrasound/bladder scan).", "Stop nephrotoxins; adjust doses (metformin).", "Dialysis indications: AEIOU.", "Sick-day rules for patients on ACEI/NSAIDs.", "Old creatinine tells AKI from CKD."],
    thinkIf: [["Oliguria + vomiting/diarrhoea + NSAID/ACEI", "Pre-renal AKI / ATN."], ["Peaked T waves + weakness", "Hyperkalaemia."], ["Anuria + palpable bladder", "Obstruction/retention."]],
    revise: "acute kidney injury",
  },
  {
    id: "med-malaria", rotation: "medicine", title: "Fever, jaundice and confusion after a trip to the lake", level: 2, setting: "County referral hospital — ward", tags: ["severe malaria", "sepsis", "hypoglycaemia", "haemolysis"], emergency: true,
    involved: ["Infective / immune", "Haematological", "Neurological", "Renal / urinary"],
    vignette: "A 29-year-old man, a fisherman from Lake Victoria, is brought in with 5 days of fever, chills and headache. Since last night he has been confused, his eyes have turned yellow, and he has passed very little dark urine.",
    hsets: ["core"], esets: ["general", "abd", "neuro", "resp", "abcde"],
    hx: {
      onset: "Fever with rigors for 5 days; confusion since last night.", fever: "High fevers and chills every evening.", neuro: "Headache, confusion, and one fit this morning.", abd: "Dark urine, yellow eyes, upper abdominal pain.", gu: "Very little urine, dark (‘Coca-Cola’) coloured.",
      travel: "Lives in a malaria-endemic area; no bed net; no prophylaxis.", drugs: "Took herbal medicine and two paracetamol tablets.", sex: "Not at risk; HIV negative last year.", pmh: "No illness.", alc: "Occasional alcohol.", cough: "No cough.", gi: "Vomited twice.",
    },
    hxKey: ["fever", "travel", "neuro", "gu", "abd", "drugs"],
    ex: {
      vit: "BP 92/54, pulse 124, RR 30 (deep), SpO₂ 94%, temperature 39.8 °C, capillary glucose 2.1 mmol/L.", gcs: "GCS 10 (E3 V3 M4).", face: "Pale conjunctivae and deep jaundice.", hydr: "Dehydrated.", liv: "Tender hepatomegaly 3 cm; spleen palpable 4 cm.", cn: "Pupils equal and reactive; fundi: retinal haemorrhages (malarial retinopathy).",
      tone: "Increased tone, no focal deficit; plantars upgoing bilaterally.", mening: "No neck stiffness.", rr: "Deep, rapid breathing (acidosis).", pulse: "124/min.", A: "Patent.", B: "RR 30 deep, SpO₂ 94%.", C: "BP 92/54, HR 124.", D: "GCS 10, glucose 2.1.", E: "Jaundice, no rash.",
      abdp: "RUQ tenderness, soft.", asc: "No ascites.", abdi: "No distension.", pr: "Not indicated.", mouth: "Dry, no thrush.",
    },
    exKey: ["vit", "gcs", "face", "liv", "cn", "rr"],
    ix: [
      { id: "glu", group: "Bedside", label: "Capillary glucose (immediately)", result: "2.1 mmol/L.", meaning: "Severe hypoglycaemia is a cause of coma and fits in malaria — treat at once.", use: "key" },
      { id: "mal", group: "Blood", label: "Blood film / malaria RDT with parasite count", result: "Plasmodium falciparum, parasitaemia 18% (very high); RDT positive.", meaning: "Severe falciparum malaria (parasitaemia >2% in non-immune/ >5–10% by many criteria plus organ dysfunction).", use: "key" },
      { id: "fbc", group: "Blood", label: "FBC", result: "Hb 5.9 g/dL, WBC 11, platelets 28.", meaning: "Severe malarial anaemia (haemolysis) and thrombocytopenia.", use: "key" },
      { id: "uec", group: "Blood", label: "U&E, creatinine, LFTs, bilirubin, lactate", result: "Creatinine 310 µmol/L, urea 22; bilirubin 112 (mostly unconjugated), ALT 88; lactate 6.8.", meaning: "AKI, haemolytic jaundice, lactic acidosis — multi-organ severe malaria.", use: "key" },
      { id: "abg", group: "Blood", label: "Blood gas", result: "pH 7.20, HCO₃ 10.", meaning: "Metabolic (lactic) acidosis.", use: "useful" },
      { id: "lp", group: "Other", label: "Lumbar puncture", result: "Normal CSF.", meaning: "Excludes meningitis; do only if signs persist after treatment starts.", use: "useful" },
      { id: "cxr", group: "Imaging", label: "Chest X-ray", result: "Not done.", meaning: "", use: "low", note: "Not needed immediately; do not delay antimalarial treatment." },
    ],
    interpret: [mcq("ma-i1", "interpretation", "Glucose 2.1, Hb 5.9, creatinine 310, lactate 6.8, parasitaemia 18%, GCS 10. How would you classify this?", [
      o("Severe falciparum malaria with cerebral malaria, severe anaemia, AKI, acidosis and hypoglycaemia", true, "Several WHO criteria for severe malaria."), o("Uncomplicated malaria", false, "Organ dysfunction present."), o("Typhoid fever", false, "No."), o("Viral hepatitis", false, "Parasites seen."),
    ], ["What organs are affected?", "How many severity criteria?", "Which parasite?", "Severe falciparum malaria."], "Severe malaria is a clinical + parasitological diagnosis: treat immediately.", { after: "uec" })],
    ddx: [
      { name: "Severe falciparum malaria (cerebral, anaemia, AKI)", aliases: ["severe malaria", "cerebral malaria", "malaria", "falciparum malaria", "plasmodium falciparum"], tier: "likely", why: "Fever + coma + jaundice + anaemia + AKI in an endemic area.", for: ["Endemic exposure, fever, rigors, coma, splenomegaly, retinal haemorrhages"], against: ["None"], separate: { ask: "Travel, prophylaxis", exam: "Spleen, jaundice, retinal findings", ix: "Film/RDT, glucose" } },
      { name: "Bacterial meningitis / sepsis", aliases: ["meningitis", "sepsis", "septicaemia", "bacterial sepsis", "encephalitis"], tier: "dangerous", why: "Fever and reduced consciousness may be bacterial; co-infection is common.", for: ["Fever, reduced GCS"], against: ["No neck stiffness; malaria positive"], separate: { ask: "Neck stiffness, rash", exam: "Meningism", ix: "LP, cultures" } },
      { name: "Viral hepatitis / leptospirosis / liver failure", aliases: ["hepatitis", "leptospirosis", "liver failure", "weil", "typhoid", "yellow fever"], tier: "possible", why: "Jaundice with fever and AKI also in leptospirosis (Weil disease) and viral hepatitis.", for: ["Jaundice, AKI, fever"], against: ["Parasitaemia 18%; high unconjugated bilirubin"], separate: { ask: "Water/rodent exposure", exam: "Conjunctival suffusion, calf tenderness", ix: "Serology, LFT pattern" } },
      { name: "Hypoglycaemia from other cause / poisoning", aliases: ["hypoglycaemia", "poisoning", "organophosphate", "toxic"], tier: "possible", why: "Hypoglycaemia and coma may be due to drugs or poisoning.", for: ["Glucose 2.1"], against: ["Fever, jaundice, parasitaemia"], separate: { ask: "Ingestions, pesticides", exam: "Pupils, secretions", ix: "Toxicology, cholinesterase" } },
    ],
    event: { when: "after-ix", title: "Fit and glucose 2.1", text: "While you take blood he has a generalised convulsion lasting 2 minutes. The capillary glucose on the monitor reads 2.1 mmol/L.", vitals: "Seizing; SpO₂ 89%; BP 90/50; glucose 2.1.", q: mcq("ma-ev", "emergency", "What do you do NOW? (select all)", [
      o("Airway/oxygen, IV dextrose 10% (5 mL/kg) or 50% dextrose in adults, then dextrose infusion; recheck glucose", true, "Hypoglycaemia must be corrected immediately."), o("IV benzodiazepine for the seizure if it continues", true, "Treat the fit."), o("Start IV artesunate 2.4 mg/kg at 0, 12, 24 h and then daily", true, "First-line for severe malaria."), o("Give a quinine infusion and wait for glucose to normalise first", false, "Do not delay antimalarials; quinine causes hypoglycaemia — artesunate preferred."),
    ], ["Which metabolic cause must be corrected right now?", "What stops the fit?", "Which drug for severe malaria?", "Glucose, benzodiazepine, IV artesunate."], "Check glucose in every convulsing or comatose patient.") },
    dx: { q: mcq("ma-dx", "pathophysiology", "What is the working diagnosis?", [
      o("Severe P. falciparum malaria: cytoadherence/sequestration causing cerebral malaria, haemolytic anaemia, AKI, lactic acidosis and hypoglycaemia", true, "Infected red cells block microvasculature."), o("Typhoid fever", false, "No."), o("Viral hepatitis A", false, "No."), o("Sickle cell crisis", false, "No."),
    ], ["Which parasite?", "What does it do to red cells?", "Which organs are affected?", "Severe falciparum malaria."], "Sequestration in microvessels explains coma and organ failure."),
    },
    mgmt: mcq("ma-mx", "management", "Select the correct management steps.", [
      o("IV artesunate (2.4 mg/kg at 0, 12, 24 h, then daily) for ≥24 h, then a full course of oral ACT (e.g. artemether–lumefantrine)", true, "First-line severe malaria therapy."), o("Blood transfusion for Hb <5 g/dL (here 5.9 with signs of decompensation/ongoing haemolysis consider)", true, "Severe anaemia with distress."), o("Treat hypoglycaemia, correct fluid/acidosis cautiously (avoid fluid overload), monitor urine output; dialysis for refractory AKI", true, "Supportive care is vital."), o("Antibiotics until cultures exclude co-infection; avoid corticosteroids", true, "Co-infection is common; steroids are harmful in cerebral malaria."),
      o("Give dexamethasone for cerebral malaria", false, "Harmful."), o("Give oral chloroquine only", false, "Resistance; oral route unsuitable in coma."),
    ], ["Which drug is better than quinine?", "What anaemia threshold?", "Why avoid steroids?", "Artesunate, supportive, ACT."], "Follow IV artesunate with full oral ACT."),
    consultant: [
      mcq("ma-c1", "consultant", "List features of severe malaria (select all).", [
        o("Impaired consciousness/coma, repeated convulsions", true, "WHO criteria."), o("Severe anaemia (Hb <5), jaundice, AKI, hypoglycaemia, acidosis, pulmonary oedema, shock, hyperparasitaemia", true, "Multi-organ."), o("Spontaneous bleeding/DIC", true, "Yes."), o("A single temperature of 38 °C", false, "Not severe."),
      ], ["Think brain, blood, kidney, lung, metabolism.", "Which are WHO criteria?", "Fever alone is not severe.", "First three."], "Know the WHO criteria."),
      mcq("ma-c2", "pathophysiology", "Why do patients get hypoglycaemia?", [
        o("Parasite glucose consumption, impaired hepatic gluconeogenesis, and quinine-induced hyperinsulinaemia", true, "Multifactorial."), o("Excess insulin from the pancreas in all patients", false, "Not generally."), o("Because of anaemia", false, "No."), o("Because of kidney failure", false, "No."),
      ], ["Who uses glucose?", "What does the liver do?", "Which drug raises insulin?", "Multifactorial."], "Monitor glucose every 4 hours."),
      mcq("ma-c3", "consultant", "What would kill this patient first?", [
        o("Hypoglycaemia, seizures and cerebral oedema/coma", true, "Treatable immediate threats."), o("Severe anaemia/shock and AKI/acidosis", true, "Next."), o("Gram-negative sepsis co-infection", true, "Always consider."), o("Hair loss", false, "No."),
      ], ["Which problem kills fastest?", "ABCDE.", "Brain, blood, kidney.", "First three."], "Correct reversible causes at once."),
    ],
    chain: { risk: "Endemic area, no net/prophylaxis, delay in treatment, pregnancy, children", patho: "P. falciparum invades RBCs → cytoadherence/sequestration → microvascular obstruction, haemolysis, cytokine storm", symptoms: "Fever, rigors, headache, confusion, fits, dark urine", signs: "Jaundice, pallor, hepatosplenomegaly, coma, retinopathy, Kussmaul breathing", ix: "Film/RDT (parasitaemia), glucose, Hb, creatinine, lactate", dx: "Severe falciparum malaria (cerebral, anaemia, AKI, acidosis, hypoglycaemia)", mx: "IV artesunate, glucose, transfuse, supportive care, then ACT", comp: "Death, neurological sequelae, blackwater fever, ARDS" },
    mustKnow: ["Any fever in an endemic area = test for malaria.", "Severe malaria: IV artesunate, never delay for investigations.", "Check glucose in every seizure/coma.", "Avoid corticosteroids in cerebral malaria.", "Follow IV artesunate with full oral ACT.", "Transfuse for Hb <5 (or <7 with decompensation).", "Monitor glucose, urine output and lactate."],
    thinkIf: [["Fever + coma + endemic area", "Cerebral malaria (test glucose and film)."], ["Fever + jaundice + AKI", "Severe malaria vs leptospirosis."], ["Hb falling fast + dark urine + fever", "Haemolysis — malaria, G6PD, sickle cell."]],
    revise: "malaria",
  },
  {
    id: "med-gibleed", rotation: "medicine", title: "Vomiting blood in a man with a swollen abdomen", level: 3, setting: "Emergency department", tags: ["upper GI bleed", "cirrhosis", "varices", "shock", "ascites"], emergency: true,
    involved: ["Gastrointestinal / hepatobiliary", "Haematological", "Cardiovascular"],
    vignette: "A 52-year-old man with a long history of heavy alcohol use and a swollen abdomen for months is brought in after vomiting a large amount of fresh blood twice. He feels dizzy and cold.",
    hsets: ["core"], esets: ["general", "abd", "cvs", "abcde"],
    hx: {
      onset: "Vomited bright red blood twice in 2 hours, about two cupfuls each time.", gi: "Black tarry stool yesterday; no abdominal pain.", abd: "Abdomen swollen for 4 months; yellow eyes on and off.", alc: "Drinks 6–8 bottles of beer or local brew daily for 20 years.", pmh: "Told once he had ‘a bad liver’; never had a hepatitis B test or vaccine.",
      drugs: "Takes ibuprofen regularly for back pain; no aspirin.", sob: "Dizzy on standing; breathless from the swollen abdomen.", wt: "Weight loss of muscles but a big abdomen.", neuro: "Slightly sleepy and confused over the last day.", fever: "No fever.", sex: "Not tested for HIV.",
    },
    hxKey: ["gi", "alc", "pmh", "drugs", "abd", "neuro"],
    ex: {
      vit: "BP 84/50, pulse 132/min, RR 26, SpO₂ 95%, temperature 37.4 °C, glucose 5.0.", gcs: "GCS 13; slightly confused, asterixis present.", pulse: "132/min, thready.", face: "Pale and jaundiced.", hands: "Palmar erythema, leuconychia, Dupuytren contracture, flapping tremor.", mouth: "Dry; fetor hepaticus.",
      neck: "JVP flat.", oed: "Pitting ankle oedema.", abdi: "Distended with a tense abdomen and prominent veins; spider naevi on the chest; gynaecomastia.", abdp: "Mildly tender, no guarding; hepatomegaly not palpable; splenomegaly 4 cm.", asc: "Shifting dullness positive — large ascites.",
      pr: "Melaena on glove.", hydr: "Hypovolaemic.", nutr: "Muscle wasting.", A: "Patent but at risk if drowsy.", B: "RR 26, SpO₂ 95%.", C: "BP 84/50, HR 132, CRT 4 s.", D: "GCS 13, glucose 5.0.", E: "Stigmata of chronic liver disease.",
    },
    exKey: ["vit", "hands", "abdi", "asc", "pr", "pulse"],
    ix: [
      { id: "fbc", group: "Blood", label: "FBC and group & cross-match", result: "Hb 6.2 g/dL, MCV 105, platelets 62, WBC 9.", meaning: "Acute blood loss with chronic liver disease (macrocytosis, thrombocytopenia from hypersplenism).", use: "key" },
      { id: "inr", group: "Blood", label: "INR, LFTs, albumin, bilirubin", result: "INR 2.0, albumin 24 g/L, bilirubin 68 µmol/L, ALT 45, AST 98.", meaning: "Impaired synthetic function — Child–Pugh C cirrhosis; AST:ALT >2 suggests alcohol.", use: "key" },
      { id: "uec", group: "Blood", label: "U&E, creatinine", result: "Urea 16, creatinine 120, Na 128, K 3.4.", meaning: "Pre-renal; high urea due to blood protein load; hyponatraemia of cirrhosis.", use: "key" },
      { id: "endo", group: "Procedures", label: "Urgent upper GI endoscopy (after resuscitation)", result: "Large oesophageal varices with a red spot and active oozing; fundal varices not seen; mild portal hypertensive gastropathy.", meaning: "Variceal bleed from portal hypertension — endoscopic band ligation is needed.", use: "key" },
      { id: "us", group: "Imaging", label: "Abdominal ultrasound", result: "Shrunken nodular liver, splenomegaly 15 cm, large ascites, patent portal vein (dilated), no focal mass.", meaning: "Cirrhosis with portal hypertension; no obvious hepatocellular carcinoma.", use: "useful" },
      { id: "tap", group: "Procedures", label: "Diagnostic ascitic tap", result: "Straw fluid, albumin gradient (SAAG) 22 g/L (>11), neutrophils 140/mm³, protein 10 g/L.", meaning: "SAAG >11 = portal hypertension; neutrophils <250 argues against spontaneous bacterial peritonitis.", use: "useful" },
      { id: "ct", group: "Imaging", label: "CT abdomen first", result: "Not done.", meaning: "", use: "low", note: "He is unstable — resuscitate and scope first." },
    ],
    interpret: [mcq("gi-i1", "interpretation", "Hb 6.2, platelets 62, INR 2.0, albumin 24. What does this tell you?", [
      o("Acute haemorrhage on a background of decompensated cirrhosis (synthetic failure, hypersplenism), so he will bleed more easily and tolerate it poorly", true, "Low albumin and raised INR = impaired synthesis."), o("Isolated iron deficiency", false, "MCV is high; acute bleed."), o("Primary bone-marrow failure", false, "Hypersplenism and liver disease explain it."), o("Haemolysis", false, "No."),
    ], ["Which labs show the liver’s function?", "Why are platelets low?", "What does INR 2.0 mean?", "Decompensated cirrhosis."], "Resuscitate, but do not over-transfuse: aim for Hb 7–8 g/dL as higher levels increase portal pressure.", { after: "inr" })],
    ddx: [
      { name: "Variceal bleed from portal hypertension due to alcoholic cirrhosis", aliases: ["variceal bleed", "oesophageal varices", "varices", "portal hypertension", "cirrhosis", "chronic liver disease", "alcoholic liver disease"], tier: "likely", why: "Large-volume haematemesis in a patient with stigmata of chronic liver disease and ascites.", for: ["Heavy alcohol, ascites, splenomegaly, spider naevi, jaundice", "Massive haematemesis and melaena"], against: ["None"], separate: { ask: "Alcohol, jaundice, previous variceal bleed", exam: "Chronic liver disease stigmata, splenomegaly", ix: "Endoscopy" } },
      { name: "Peptic ulcer disease / gastritis (NSAID-related)", aliases: ["peptic ulcer", "gastric ulcer", "duodenal ulcer", "gastritis", "nsaid", "upper gi bleed", "pud"], tier: "possible", why: "Regular NSAID use and alcohol cause ulcers and gastritis, and cirrhotic patients can bleed from non-variceal sources too.", for: ["NSAID use, alcohol"], against: ["Stigmata and ascites favour varices"], separate: { ask: "Epigastric pain, relation to food", exam: "Epigastric tenderness", ix: "Endoscopy" } },
      { name: "Mallory–Weiss tear / oesophagitis / malignancy", aliases: ["mallory weiss", "oesophagitis", "oesophageal cancer", "gastric cancer", "malignancy", "hepatocellular carcinoma"], tier: "possible", why: "Retching then bleeding; alcohol is a risk factor for upper GI cancers and HCC.", for: ["Alcohol, vomiting"], against: ["No weight loss/dysphagia history; bleeding is massive"], separate: { ask: "Forceful retching, dysphagia", exam: "Mass, nodes", ix: "Endoscopy, ultrasound, AFP" } },
      { name: "Haemorrhagic shock with hepatic encephalopathy", aliases: ["hypovolaemic shock", "haemorrhagic shock", "hepatic encephalopathy"], tier: "dangerous", why: "Not a separate cause, but the complication that kills: shock and encephalopathy precipitated by bleeding.", for: ["Hypotension, tachycardia, confusion"], against: ["N/A"], separate: { ask: "Confusion, drowsiness", exam: "Asterixis, BP, perfusion", ix: "Ammonia not needed; treat precipitant" } },
    ],
    event: { when: "after-exam", title: "More bleeding", text: "While you are inserting an IV line he vomits another large amount of fresh blood and becomes drowsy.", vitals: "BP 70/40, pulse 144, SpO₂ 92%, GCS 10.", q: mcq("gi-ev", "emergency", "What do you do NOW? (select all)", [
      o("Airway protection (consider intubation if GCS falling/ongoing haematemesis), oxygen, two large-bore IV cannulae, crossmatched blood/restrictive transfusion", true, "ABC with hypovolaemia."), o("IV vasoactive drug (terlipressin or octreotide) and IV antibiotic prophylaxis (ceftriaxone) before endoscopy", true, "Reduces rebleeding and mortality."), o("Urgent endoscopy within 12 h (band ligation); Sengstaken–Blakemore balloon tamponade if endoscopy is unavailable/failing", true, "Definitive haemostasis."), o("Large volumes of crystalloid to restore BP to normal", false, "Raises portal pressure and rebleeding; use blood and restrictive targets."), o("IV proton pump inhibitor only and wait", false, "Insufficient for variceal bleeding."),
    ], ["Airway first with ongoing haematemesis.", "Which drug lowers portal pressure?", "What endoscopic therapy?", "Airway, blood, terlipressin + antibiotics, banding, balloon if needed."], "Variceal bleed = emergency: resuscitate, drug, antibiotic, endoscopy.") },
    dx: { q: mcq("gi-dx", "pathophysiology", "What is the diagnosis and mechanism?", [
      o("Variceal haemorrhage: cirrhosis → raised portal pressure → porto-systemic collaterals (oesophageal varices) that rupture", true, "Portal hypertension is the driver."), o("Peptic ulcer perforation", false, "No."), o("Acute pancreatitis", false, "No."), o("Boerhaave syndrome", false, "No."),
    ], ["What is raised in cirrhosis?", "Where do collaterals form?", "Which veins rupture?", "Portal hypertension → varices."], "Remember causes of portal hypertension: pre-hepatic, hepatic, post-hepatic."),
    },
    mgmt: mcq("gi-mx", "management", "Select correct management.", [
      o("Resuscitation with blood (target Hb 7–8), correct coagulopathy as indicated, caution with fluids", true, "Restrictive transfusion improves survival."), o("Terlipressin/octreotide, ceftriaxone prophylaxis and urgent band ligation; then non-selective beta-blocker ± repeat banding for secondary prophylaxis", true, "Standard of care."), o("Treat precipitants and complications: lactulose for encephalopathy, avoid sedatives, monitor for alcohol withdrawal (thiamine), review ascites (diuretics/paracentesis)", true, "Comprehensive care."), o("Stop NSAIDs, alcohol counselling, hepatitis B/HIV screening and vaccination; consider TIPS/transplant referral if rebleeds", true, "Prevention."),
      o("Give propranolol now for the bleed", false, "Beta-blocker in shock is dangerous; start after stabilisation."), o("Transfuse until Hb is 12", false, "Raises portal pressure."),
    ], ["What do you resuscitate with?", "Which drug class lowers portal pressure?", "How do you prevent rebleeding?", "Blood, terlipressin, antibiotics, banding, beta-blocker later."], "Do not forget thiamine for alcohol use disorder."),
    consultant: [
      mcq("gi-c1", "consultant", "Name stigmata of chronic liver disease and the cause for each (select all).", [
        o("Spider naevi, palmar erythema, gynaecomastia — oestrogen excess (reduced hepatic metabolism)", true, "Endocrine effects."), o("Ascites, oedema — low albumin and portal hypertension", true, "Fluid retention."), o("Asterixis, fetor — hepatic encephalopathy (ammonia and other toxins)", true, "Neurological effects."), o("Clubbing from hypertension", false, "No."),
      ], ["What does the liver clear?", "Which hormone accumulates?", "What accumulates in encephalopathy?", "First three."], "Examination of the hands and chest is a high-yield ward-round skill."),
      mcq("gi-c2", "pathophysiology", "Why is a restrictive transfusion strategy used?", [
        o("Over-transfusion raises portal pressure and risk of rebleeding; target Hb 7–8 g/dL", true, "Evidence-based."), o("Because blood is expensive", false, "No."), o("Because transfusion causes anaemia", false, "No."), o("Because the platelets are low", false, "No."),
      ], ["What happens to portal pressure with volume?", "What do trials show?", "Hb target?", "7–8 g/dL."], "Same logic applies to crystalloids."),
      mcq("gi-c3", "consultant", "What would you do about the ascites and why check an ascitic tap?", [
        o("Tap to exclude spontaneous bacterial peritonitis (neutrophils ≥250/mm³) and measure SAAG; treat with albumin/antibiotics if SBP", true, "SBP is lethal and common."), o("Never tap ascites in a bleeding patient", false, "Diagnostic tap is safe and important."), o("Drain 10 L immediately", false, "Large-volume paracentesis needs albumin."), o("Give steroids", false, "No."),
      ], ["Infection risk?", "Which cell count defines SBP?", "What does SAAG tell you?", "Tap for SBP and SAAG."], "SAAG ≥11 g/L = portal hypertension."),
    ],
    chain: { risk: "Chronic alcohol use, viral hepatitis B, NSAIDs, cirrhosis, portal hypertension", patho: "Cirrhosis → raised portal pressure → porto-systemic collaterals → oesophageal varices rupture; reduced synthesis → coagulopathy", symptoms: "Haematemesis, melaena, dizziness, abdominal swelling, confusion", signs: "Shock, jaundice, spider naevi, palmar erythema, ascites, splenomegaly, asterixis", ix: "FBC, INR, albumin; endoscopy (varices); ultrasound; ascitic tap", dx: "Variceal bleed in decompensated alcoholic cirrhosis", mx: "ABC, blood (Hb 7–8), terlipressin, antibiotics, band ligation, beta-blocker later", comp: "Rebleeding, hepatic encephalopathy, SBP, hepatorenal syndrome, death" },
    mustKnow: ["Haematemesis + chronic liver disease stigmata = variceal bleed until proven otherwise.", "ABC first: airway, two large-bore IVs, blood.", "Terlipressin/octreotide + IV antibiotics + endoscopic banding.", "Restrictive transfusion (Hb 7–8).", "Avoid sedatives; treat/prevent hepatic encephalopathy (lactulose).", "Diagnostic ascitic tap for SBP.", "Secondary prophylaxis: banding + non-selective beta-blocker."],
    thinkIf: [["Haematemesis + ascites + spider naevi", "Variceal bleed from portal hypertension."], ["Epigastric pain + NSAIDs + melaena", "Peptic ulcer bleed."], ["Cirrhosis + fever + abdominal pain + ascites", "Spontaneous bacterial peritonitis."]],
    revise: "oesophageal varices",
  },
]
