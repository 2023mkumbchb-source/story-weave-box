import type { CaseDef } from "../types";
import { mcq, o } from "../templates";

export const MEDICINE_3: CaseDef[] = [
  {
    id: "med-mening", rotation: "medicine", title: "Fever, headache and a stiff neck", level: 2, setting: "Emergency department", tags: ["meningitis", "HIV", "CNS infection", "seizure"], emergency: true,
    involved: ["Neurological", "Infective / immune"],
    vignette: "A 24-year-old man, a mechanic, is brought in by his brother with fever and a severe headache for two days. Since this morning he has been confused and sensitive to light, and he vomited twice.",
    hsets: ["core"], esets: ["general", "neuro", "abcde"],
    hx: {
      onset: "Fever and headache for 2 days; confusion since this morning.", prog: "Worse by the hour.", neuro: "Severe global headache, photophobia, neck pain, vomiting. No limb weakness. No fits so far.", fever: "High fever and rigors.", skin: "No rash that his brother noticed.",
      pmh: "No known illness; never had an HIV test.", sex: "Multiple partners, inconsistent condom use; never tested for HIV.", travel: "Lives in a crowded estate; no recent travel.", drugs: "Took paracetamol and an unknown ‘injection’ at a clinic two days ago.", alc: "Drinks beer on weekends.",
      cough: "Mild cough for a week.", wt: "Lost weight over the last 3 months (HIV risk).", swell: "None.",
    },
    hxKey: ["fever", "neuro", "sex", "pmh", "drugs", "onset"],
    ex: {
      vit: "BP 110/70, pulse 118, RR 26, SpO₂ 95%, temperature 39.6 °C, glucose 6.1 mmol/L.", gcs: "GCS 12 (E3 V4 M5), confused and irritable.", mouth: "Oral thrush; dry mucosa.", nodes: "Generalised lymphadenopathy.", mening: "Marked neck stiffness; Kernig and Brudzinski positive; photophobia.", cn: "Pupils equal and reactive; fundi: no papilloedema; no cranial nerve palsy.",
      tone: "Normal tone and power; reflexes brisk and symmetrical; plantars flexor.", skin: "No petechial rash.", A: "Patent.", B: "RR 26, SpO₂ 95%.", C: "HR 118, BP 110/70, capillary refill 3 s.", D: "GCS 12, glucose 6.1.", E: "No rash.", hydr: "Mildly dehydrated.", pulse: "118/min.",
    },
    exKey: ["vit", "gcs", "mening", "cn", "mouth", "nodes"],
    exExtra: [{ id: "skin", group: "General & vital signs", label: "Skin: rash, petechiae, purpura", def: "No rash.", looking: "A non-blanching petechial/purpuric rash means meningococcaemia — an emergency." }],
    ix: [
      { id: "mal", group: "Bedside", label: "Malaria rapid test / blood film", result: "Negative.", meaning: "Cerebral malaria is an important differential in Kenya; excluded here.", use: "key" },
      { id: "ct", group: "Imaging", label: "CT head before lumbar puncture", result: "No mass lesion, no midline shift, ventricles normal.", meaning: "Safe to do an LP: no raised ICP/mass effect.", use: "key" },
      { id: "lp", group: "CSF", label: "Lumbar puncture: opening pressure, cell count, protein, glucose, Gram stain, India ink, CrAg", result: "Cloudy CSF, opening pressure 32 cmH₂O (raised). WBC 1,800/µL, 90% neutrophils. Protein 2.4 g/L (raised). Glucose 0.8 mmol/L (low; blood 6.1). Gram stain: Gram-positive diplococci. India ink negative; CrAg negative.", meaning: "Acute bacterial meningitis (neutrophilic, high protein, low glucose, Gram-positive diplococci = Streptococcus pneumoniae).", use: "key" },
      { id: "bc", group: "Blood", label: "Blood cultures (before antibiotics, but do not delay them)", result: "Pending (later grows Streptococcus pneumoniae).", meaning: "Identifies organism and sensitivities.", use: "useful" },
      { id: "hiv", group: "Blood", label: "HIV test with CD4", result: "HIV-1 positive, CD4 168.", meaning: "HIV increases pneumococcal and cryptococcal meningitis risk — and means the differential must include cryptococcus.", use: "useful" },
      { id: "fbc", group: "Blood", label: "FBC, CRP, U&E, glucose, lactate", result: "WBC 21 (neutrophilia), CRP 220, Na 129, creatinine 110, lactate 3.2.", meaning: "Sepsis; hyponatraemia (SIADH) and AKI.", use: "useful" },
      { id: "mri", group: "Imaging", label: "MRI brain", result: "Not done.", meaning: "", use: "low", note: "Not needed to start treatment; do not delay antibiotics." },
    ],
    interpret: [mcq("me-i1", "interpretation", "CSF: cloudy, WBC 1,800 (90% neutrophils), protein 2.4, glucose 0.8 (blood 6.1), Gram-positive diplococci. What is the diagnosis?", [
      o("Acute bacterial (pneumococcal) meningitis", true, "Neutrophils, high protein, low glucose and Gram-positive diplococci."),
      o("Viral meningitis", false, "Lymphocytes, normal glucose, mild protein rise."),
      o("Cryptococcal meningitis", false, "Lymphocytes; India ink/CrAg positive; usually less acute."),
      o("Tuberculous meningitis", false, "Lymphocytes, very high protein, low glucose, subacute."),
    ], ["Neutrophils or lymphocytes?", "Glucose normal or low?", "Which organism is a Gram-positive diplococcus?", "Bacterial meningitis."], "Start antibiotics immediately: do not wait for CSF if an LP will be delayed.", { after: "lp" })],
    ddx: [
      { name: "Acute bacterial meningitis (pneumococcal / meningococcal)", aliases: ["bacterial meningitis", "meningitis", "pneumococcal meningitis", "meningococcal"], tier: "likely", why: "Fever + headache + neck stiffness + confusion: meningism with encephalopathy.", for: ["Fever, severe headache, photophobia, neck stiffness", "Reduced consciousness, tachycardia"], against: ["No rash (meningococcus)"], separate: { ask: "Onset over hours, rash", exam: "Meningism, Kernig/Brudzinski", ix: "CSF" } },
      { name: "Cryptococcal meningitis (HIV)", aliases: ["cryptococcal meningitis", "cryptococcus", "fungal meningitis"], tier: "possible", why: "Commonest cause of meningitis in advanced HIV (CD4 <100–200).", for: ["Risk for HIV, weight loss, thrush, nodes"], against: ["Acute fulminant onset, neutrophilic CSF"], separate: { ask: "Subacute headache for weeks", exam: "Papilloedema, cranial nerve palsy", ix: "India ink, serum/CSF CrAg" } },
      { name: "Cerebral malaria", aliases: ["cerebral malaria", "severe malaria", "malaria"], tier: "dangerous", why: "Fever with altered consciousness in Kenya must always prompt a malaria test.", for: ["Fever, reduced GCS"], against: ["Neck stiffness is not typical, malaria test negative"], separate: { ask: "Travel to endemic area", exam: "Jaundice, splenomegaly, retinopathy", ix: "Malaria RDT/film" } },
      { name: "Tuberculous meningitis / viral encephalitis / SAH", aliases: ["tb meningitis", "tuberculous meningitis", "encephalitis", "viral meningitis", "subarachnoid haemorrhage", "sah"], tier: "possible", why: "Other causes of meningism and confusion.", for: ["Meningism"], against: ["Fulminant onset; CSF pattern"], separate: { ask: "Thunderclap onset (SAH), weeks of illness (TB)", exam: "Cranial nerve palsies, seizures", ix: "CSF, CT" } },
    ],
    event: { when: "after-ix", title: "He seizes", text: "During the lumbar puncture preparation he has a generalised tonic–clonic seizure lasting 3 minutes, and then his GCS drops to 9.", vitals: "Seizure ongoing; SpO₂ 88%, HR 140, BP 150/90, glucose 6.0.", q: mcq("me-ev", "emergency", "What do you do NOW? (select all)", [
      o("Position, airway, high-flow oxygen; IV benzodiazepine (lorazepam/diazepam) for the seizure", true, "ABC first, then stop the seizure."), o("Give IV antibiotics immediately — ceftriaxone 2 g (+ dexamethasone before/with first dose)", true, "Do not wait for LP/CT in a sick patient."), o("Check glucose, give IV fluids cautiously and treat raised ICP if signs develop", true, "Supportive."), o("Delay antibiotics until CSF is obtained", false, "Every hour of delay increases mortality."),
    ], ["Airway first.", "How do you stop a seizure?", "What is the most urgent antimicrobial step?", "Benzodiazepine, oxygen, ceftriaxone + dexamethasone."], "Antibiotics within 1 hour of arrival in suspected bacterial meningitis.") },
    dx: { q: mcq("me-dx", "pathophysiology", "What is the best working diagnosis?", [
      o("Pneumococcal meningitis in a newly diagnosed HIV-positive patient", true, "Gram-positive diplococci + HIV."), o("Cerebral malaria", false, "Negative test."), o("Cryptococcal meningitis", false, "CrAg negative."), o("Migraine", false, "No."),
    ], ["Which organism does the Gram stain show?", "What is the immune status?", "Which risk factor?", "Pneumococcal + HIV."], "Always test HIV in meningitis."),
    },
    mgmt: mcq("me-mx", "management", "Which are correct? (select all)", [
      o("IV ceftriaxone 2 g (12-hourly) (add vancomycin if resistant pneumococci suspected; add ampicillin if age >50 or immunocompromise for Listeria)", true, "Empirical bactericidal therapy."), o("Dexamethasone 10 mg IV 6-hourly for 4 days, started with or before the first antibiotic dose", true, "Reduces mortality/deafness in pneumococcal meningitis."),
      o("Treat seizures, correct hyponatraemia/AKI, monitor ICP and fluid balance; start ART after the acute illness; chemoprophylaxis for close contacts if meningococcal", true, "Supportive and public health care."), o("Oral amoxicillin alone", false, "Insufficient CSF penetration/severity."),
    ], ["What is first-line for meningitis?", "What reduces inflammation damage?", "Who else needs care?", "Ceftriaxone ± vancomycin, dexamethasone, supportive, contacts."], "Do not delay antibiotics for imaging or LP."),
    consultant: [
      mcq("me-c1", "consultant", "Which are contraindications to immediate LP? (select all)", [
        o("Signs of raised ICP (papilloedema, focal deficit, GCS ≤12, new seizure)", true, "Risk of herniation — CT first."), o("Coagulopathy or local infection at the puncture site", true, "Bleeding/infection."), o("Cardiorespiratory instability", true, "Stabilise first."), o("Neck stiffness alone", false, "Not a contraindication."),
      ], ["Think about pressure differential.", "Which findings suggest a mass lesion?", "What must be done first?", "First three."], "In an emergency, give antibiotics first, then CT, then LP."),
      mcq("me-c2", "pathophysiology", "Why is CSF glucose low in bacterial meningitis?", [
        o("Bacteria and neutrophils consume glucose and glucose transport into the CSF is impaired", true, "Anaerobic glycolysis."), o("Glucose is excreted by the kidney", false, "No."), o("The blood glucose is low", false, "Blood glucose is normal."), o("Because of fluid overload", false, "No."),
      ], ["Who eats glucose in the CSF?", "Neutrophils and organisms.", "Impaired transport.", "Consumption + impaired transport."], "Compare CSF glucose to a simultaneous blood glucose."),
      mcq("me-c3", "consultant", "What would you expect in cryptococcal meningitis and how does it differ?", [
        o("Subacute headache, lymphocytic CSF, very high opening pressure, positive India ink/CrAg; treat with amphotericin + flucytosine; repeated LPs for pressure", true, "A key HIV opportunistic infection."), o("Acute fulminant neutrophilic CSF", false, "That is bacterial."), o("Normal CSF", false, "No."), o("Clear CSF with low protein", false, "No."),
      ], ["Which fungus?", "Which test is rapid and sensitive?", "What do you do for the pressure?", "Fungal, high CrAg, therapeutic LPs."], "Cryptococcus is the commonest cause of meningitis in advanced HIV in Kenya."),
    ],
    chain: { risk: "HIV, crowding, otitis/sinusitis, alcohol, asplenia", patho: "Bacteraemia → blood–brain barrier crossing → subarachnoid space inflammation → cerebral oedema, vasculitis, raised ICP", symptoms: "Fever, severe headache, photophobia, vomiting, confusion, seizures", signs: "Neck stiffness, Kernig/Brudzinski, fever, reduced GCS, ± rash", ix: "Glucose, malaria, CT if indicated, LP (neutrophils, high protein, low glucose, Gram-positive diplococci), blood cultures, HIV", dx: "Pneumococcal meningitis (HIV-positive)", mx: "Ceftriaxone + dexamethasone, seizure control, supportive, ART later, contact prophylaxis if meningococcal", comp: "Seizures, raised ICP/herniation, hearing loss, hydrocephalus, sepsis/shock" },
    mustKnow: ["Fever + headache + neck stiffness + confusion = meningitis until proven otherwise.", "Antibiotics within 1 hour; do not delay for CT/LP.", "CT before LP if focal signs, papilloedema, GCS ≤12 or seizures.", "CSF pattern: bacterial = neutrophils/high protein/low glucose; viral = lymphocytes/normal glucose; TB/crypto = lymphocytes.", "Dexamethasone with the first dose in suspected bacterial meningitis.", "Always test HIV and malaria.", "Non-blanching rash = meningococcaemia: urgent."],
    thinkIf: [["Fever + reduced consciousness in Kenya", "Cerebral malaria and meningitis until excluded."], ["Subacute headache in advanced HIV with high opening pressure", "Cryptococcal meningitis."], ["Fever + non-blanching rash + shock", "Meningococcaemia."]],
    revise: "meningitis",
  },
  {
    id: "med-dka", rotation: "medicine", title: "Vomiting, fast breathing and drowsiness in a young woman", level: 2, setting: "Emergency department", tags: ["diabetes", "DKA", "acidosis", "emergency"], emergency: true,
    involved: ["Endocrine / metabolic", "Infective / immune"],
    vignette: "A 19-year-old university student is brought in drowsy after two days of vomiting, abdominal pain and extreme thirst. Her roommate says she has been passing a lot of urine, has lost weight over the last month, and today her breathing has become fast and deep.",
    hsets: ["core"], esets: ["general", "abd", "resp", "abcde"],
    hx: {
      onset: "Two days of vomiting and abdominal pain; polyuria and thirst for 3 weeks.", sob: "Breathing deep and fast, no cough.", gi: "Vomited repeatedly; abdominal pain generalised.", gu: "Passing large volumes, getting up at night, thirsty.", wt: "Lost ~6 kg in a month despite eating well.",
      fever: "Low-grade fever for 2 days with a sore throat.", pmh: "No known diabetes; mother has type 1 diabetes.", fh: "Mother and maternal aunt have type 1 diabetes.", drugs: "No regular medication; not on insulin.", alc: "None.", neuro: "Drowsy.", cough: "None.", occ: "Student; lives in hostel.",
    },
    hxKey: ["gu", "wt", "gi", "fh", "pmh", "drugs", "fever"],
    ex: {
      vit: "BP 92/58, pulse 126/min, RR 34/min (Kussmaul), SpO₂ 98%, temperature 37.9 °C, capillary glucose 31.4 mmol/L.", gcs: "GCS 13; drowsy but rousable.", mouth: "Dry tongue; sweet (acetone) smell on the breath.", hydr: "Severely dehydrated: sunken eyes, reduced skin turgor, capillary refill 4 s.", nutr: "Thin (BMI 17).",
      abdp: "Diffuse mild tenderness, no guarding or rebound.", abdi: "Flat, moves with respiration.", asc: "Bowel sounds present.", rr: "Deep, sighing respiration (Kussmaul) without added sounds.", chest: "Clear.", breath: "Clear.",
      A: "Patent.", B: "RR 34 deep, SpO₂ 98%.", C: "BP 92/58, HR 126, CRT 4 s.", D: "GCS 13, glucose 31.4.", E: "Sore, erythematous throat.", neck: "JVP flat.",
    },
    exKey: ["vit", "hydr", "mouth", "rr", "gcs"],
    ix: [
      { id: "glu", group: "Bedside", label: "Capillary glucose and urine ketones", result: "Glucose 31.4 mmol/L; urine ketones 4+.", meaning: "Severe hyperglycaemia with ketonuria: diabetic ketoacidosis until proven otherwise.", use: "key" },
      { id: "abg", group: "Blood", label: "Venous/arterial blood gas", result: "pH 7.08, bicarbonate 6 mmol/L, PaCO₂ 1.9 kPa, lactate 2.1, anion gap 30.", meaning: "High anion-gap metabolic acidosis with respiratory compensation (Kussmaul breathing). Severe DKA (pH <7.1).", use: "key" },
      { id: "uec", group: "Blood", label: "U&E and potassium", result: "Na 129 (corrected ~135), K 5.6 mmol/L, urea 11, creatinine 142.", meaning: "Potassium is high initially because acidosis shifts K⁺ out of cells, but total body potassium is depleted — K⁺ will fall dramatically with insulin.", use: "key" },
      { id: "ecg", group: "Bedside", label: "ECG", result: "Sinus tachycardia, peaked T waves.", meaning: "Hyperkalaemia effect; monitor.", use: "useful" },
      { id: "fbc", group: "Blood", label: "FBC, CRP, cultures, urinalysis, throat swab", result: "WBC 17 (stress/infection), CRP 48; urine ketones 4+, no nitrites.", meaning: "Look for the precipitant: infection (pharyngitis).", use: "useful" },
      { id: "hba1c", group: "Blood", label: "HbA1c", result: "13.6%.", meaning: "Weeks of poor control: new-onset type 1 diabetes.", use: "useful" },
      { id: "ct", group: "Imaging", label: "CT abdomen for the pain", result: "Not done.", meaning: "", use: "low", note: "Abdominal pain is from ketoacidosis itself; treat DKA first and reassess." },
    ],
    interpret: [mcq("dka-i1", "interpretation", "pH 7.08, HCO₃ 6, PaCO₂ 1.9 kPa, glucose 31.4, ketones 4+. What does this show and why is she breathing deeply?", [
      o("High anion-gap metabolic acidosis from ketones (DKA); deep breathing is respiratory compensation (blowing off CO₂)", true, "Kussmaul respiration lowers PaCO₂ to buffer the acid."),
      o("Respiratory acidosis", false, "PaCO₂ is low, not high."), o("Metabolic alkalosis", false, "pH is low."), o("Normal anion gap acidosis from diarrhoea", false, "There is high glucose and ketosis."),
    ], ["What is the pH direction?", "Which organ buffers acid fast?", "Why is CO₂ low?", "DKA with compensation."], "Always calculate the anion gap and think ‘ketones, lactate, toxins, renal failure’.", { after: "abg" })],
    ddx: [
      { name: "Diabetic ketoacidosis (new-onset type 1 diabetes) precipitated by infection", aliases: ["dka", "diabetic ketoacidosis", "type 1 diabetes", "new diabetes", "ketoacidosis", "diabetes mellitus"], tier: "likely", why: "Polyuria, polydipsia, weight loss, vomiting, Kussmaul breathing, acetone breath and hyperglycaemia.", for: ["Classic osmotic symptoms, weight loss, family history", "Deep breathing, dehydration, ketones"], against: ["None"], separate: { ask: "Polyuria, weight loss, family history", exam: "Dehydration, Kussmaul respiration", ix: "Glucose, ketones, gas" } },
      { name: "Hyperosmolar hyperglycaemic state (HHS)", aliases: ["hhs", "hyperosmolar", "hyperosmolar hyperglycaemic state", "hhns"], tier: "possible", why: "Extreme hyperglycaemia and dehydration can be HHS, usually in older type 2 patients.", for: ["Very high glucose, dehydration"], against: ["Young, significant ketosis and acidosis"], separate: { ask: "Age, insulin deficiency", exam: "Marked dehydration with little ketosis", ix: "Osmolality >320, minimal ketones, pH >7.3" } },
      { name: "Sepsis / acute abdomen (appendicitis, pancreatitis)", aliases: ["sepsis", "appendicitis", "acute abdomen", "pancreatitis", "peritonitis", "surgical abdomen"], tier: "dangerous", why: "Vomiting and abdominal pain with tachycardia may be surgical; DKA can mimic or be triggered by sepsis.", for: ["Abdominal pain, vomiting, tachycardia, fever"], against: ["Soft abdomen, glucose 31, ketones"], separate: { ask: "Localised pain, peritonism", exam: "Guarding, rebound", ix: "Lipase, CRP, imaging after stabilisation" } },
      { name: "Other causes of high anion-gap acidosis (lactic acidosis, toxic alcohols, salicylate, uraemia)", aliases: ["lactic acidosis", "salicylate", "methanol", "uraemia", "poisoning", "toxic ingestion"], tier: "possible", why: "Consider other causes of acidosis with a high anion gap.", for: ["Acidosis"], against: ["Glucose and ketones clearly point to DKA"], separate: { ask: "Ingestions, drugs", exam: "Pupils, odour", ix: "Lactate, osmolar gap, salicylate level" } },
    ],
    event: { when: "after-ix", title: "Potassium crash after insulin", text: "Two hours into treatment her glucose has fallen to 14, she is more alert, but she complains of muscle weakness and palpitations.", vitals: "K⁺ 2.6 mmol/L on repeat; ECG shows flat T waves and U waves.", q: mcq("dka-ev", "emergency", "What do you do NOW?", [
      o("Add potassium to the infusion (cautiously, with ECG monitoring) and review insulin rate; do not stop fluids", true, "Insulin drives K⁺ into cells; hypokalaemia causes lethal arrhythmias."), o("Stop insulin permanently", false, "DKA needs insulin to clear ketones — pause only if K⁺ <3.3 until replaced."), o("Give IV calcium gluconate", false, "That is for hyperkalaemia."), o("Ignore: it is expected", false, "It is life-threatening."),
    ], ["What does insulin do to potassium?", "Is K⁺ high or low now?", "What is the danger?", "Replace K⁺."], "Rule: K⁺ >5.5 withhold; 3.3–5.5 add 20–40 mmol/L to fluids; <3.3 hold insulin and replace first.") },
    dx: { q: mcq("dka-dx", "pathophysiology", "What is the definitive working diagnosis and its mechanism?", [
      o("New-onset type 1 diabetes presenting with DKA: insulin deficiency → lipolysis and ketogenesis → ketoacidosis, with osmotic diuresis and dehydration", true, "Insulin lack and glucagon excess."), o("Type 2 diabetes with HHS", false, "Not in this young patient with ketosis."), o("Starvation ketosis", false, "Glucose would be low/normal."), o("Gastroenteritis with dehydration", false, "Does not explain glucose 31."),
    ], ["Which hormone is missing?", "What fuel is burnt when insulin is absent?", "What are ketones?", "Insulin deficiency → ketogenesis."], "DKA triad: hyperglycaemia, ketosis, acidosis."),
    },
    mgmt: mcq("dka-mx", "management", "Which steps are correct, in order of priority? (select all)", [
      o("IV 0.9% saline fluid resuscitation first (e.g. 1 L over the first hour, then guided by response)", true, "Dehydration is severe; fluids come before insulin."), o("Fixed-rate IV insulin infusion (0.1 U/kg/h) once K⁺ is known and not <3.3", true, "Switches off ketogenesis."), o("Monitor glucose hourly, K⁺ and gas regularly; add potassium; add dextrose when glucose <14", true, "Prevents hypoglycaemia and hypokalaemia."), o("Find and treat the precipitant (infection), then convert to subcutaneous insulin and educate", true, "Definitive care and prevention."),
      o("Give bicarbonate routinely", false, "Not recommended unless pH <6.9."), o("Give a stat large insulin bolus and no fluids", false, "Dangerous."),
    ], ["What do you replace first — fluid, insulin or bicarbonate?", "What do you watch closely?", "What triggered this?", "Fluids, insulin, potassium, precipitant."], "Cerebral oedema is a risk in children/young adults with over-rapid correction."),
    consultant: [
      mcq("dka-c1", "consultant", "Why is the potassium high at presentation but the body deficit large?", [
        o("Acidosis and insulin lack shift K⁺ out of cells; osmotic diuresis wastes K⁺ in urine", true, "Serum K⁺ falls when treatment starts."), o("Because she ate too many bananas", false, "No."), o("Because the kidney retains potassium", false, "Osmotic diuresis wastes it."), o("It is a lab error", false, "No."),
      ], ["Where is K⁺ stored?", "What does acidosis do?", "What does insulin do?", "Shift out then lost."], "Always expect the K⁺ to fall."),
      mcq("dka-c2", "pathophysiology", "How does Kussmaul breathing buffer the acidosis?", [
        o("Hyperventilation blows off CO₂ (an acid), raising the pH", true, "Respiratory compensation."), o("It increases bicarbonate production by the kidney immediately", false, "Renal compensation takes days."), o("It raises PaCO₂", false, "It lowers PaCO₂."), o("It reduces ketone formation", false, "No."),
      ], ["Which gas becomes an acid in solution?", "What does deep breathing do to it?", "Why is PaCO₂ low?", "Blows off CO₂."], "Henderson–Hasselbalch: pH relates to bicarbonate/CO₂."),
      mcq("dka-c3", "consultant", "What would kill this patient and what else are you worried about? (select all)", [
        o("Hypovolaemic shock and arrhythmia from potassium disturbances", true, "Immediate."), o("Cerebral oedema (particularly in the young)", true, "Rare but deadly."), o("Hypoglycaemia during insulin therapy", true, "Check glucose hourly."), o("Underlying sepsis", true, "Precipitant."),
      ], ["What organ fails first?", "Which electrolyte?", "What can too much insulin cause?", "All four."], "Think: fluids, potassium, glucose, precipitant."),
    ],
    chain: { risk: "New-onset type 1 diabetes (family history), infection, missed insulin", patho: "Absolute insulin deficiency + glucagon excess → lipolysis → ketones → metabolic acidosis; hyperglycaemia → osmotic diuresis → dehydration, K⁺ shifts", symptoms: "Polyuria, polydipsia, weight loss, vomiting, abdominal pain, drowsiness", signs: "Kussmaul breathing, acetone breath, dehydration, tachycardia, hypotension, reduced GCS", ix: "Glucose, ketones, gas (pH <7.3, HCO₃ <15), K⁺, anion gap", dx: "DKA (new-onset type 1 diabetes) with infective trigger", mx: "Fluids, fixed-rate insulin, potassium, treat precipitant, subcutaneous insulin and education", comp: "Hypokalaemia, cerebral oedema, hypoglycaemia, shock, AKI" },
    mustKnow: ["Vomiting + abdominal pain + Kussmaul breathing in a young person: check glucose and ketones.", "Fluids first, then insulin, with potassium monitoring.", "Do not give insulin if K⁺ <3.3 until replaced.", "Look for the trigger: infection, missed insulin, new diagnosis.", "Hourly glucose, 2-hourly K⁺; add dextrose when glucose <14.", "Bicarbonate is rarely indicated (pH <6.9).", "Cerebral oedema complicates over-rapid correction."],
    thinkIf: [["Kussmaul breathing + acetone smell + vomiting", "DKA."], ["Very high glucose + profound dehydration in an older type 2 patient", "HHS."], ["Drowsy diabetic with low glucose + sweating", "Hypoglycaemia — treat with IV dextrose immediately."]],
    revise: "diabetic ketoacidosis",
  },
]
