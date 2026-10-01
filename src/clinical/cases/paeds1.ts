import type { CaseDef } from "../types";
import { mcq, o } from "../templates";

export const PAEDS_1: CaseDef[] = [
  {
    id: "pd-pneu", rotation: "paeds", title: "A toddler breathing fast and refusing to feed", level: 1, setting: "Paediatric ward", tags: ["pneumonia", "hypoxia", "IMCI", "oxygen"], emergency: true,
    involved: ["Respiratory", "Infective / immune"],
    vignette: "An 18-month-old girl is brought by her mother with 3 days of cough and fever. Since yesterday she is breathing fast, has stopped breastfeeding and is very sleepy.",
    hsets: ["paeds"], esets: ["paeds", "abcde"],
    hx: {
      onset: "Cough and fever for 3 days; fast breathing since yesterday.", danger: "Not breastfeeding or drinking since this morning; no vomiting; no convulsions; very sleepy.", fever: "High fever, controlled partially by paracetamol.", resp: "Fast, noisy breathing; chest looks ‘sucked in’ with each breath.", gi: "No diarrhoea; passing less urine (2 wet nappies today).",
      birth: "Term SVD, birth weight 3.2 kg.", feed: "Breastfed to 12 months and now eating family foods; weight on the growth curve.", imm: "BCG, polio, pentavalent and pneumococcal vaccines up to date; measles due.", dev: "Walks with support, says a few words.", hiv: "Mother HIV negative.", pmh: "No previous admissions; no asthma.",
      fam: "Lives in a smoky one-room house; cooks with charcoal indoors; older sibling has a cough.", drugs: "Paracetamol and cough syrup; no antibiotics.", neuro: "None.", other: "No rash.",
    },
    hxKey: ["danger", "resp", "fever", "gi", "imm", "fam", "feed"],
    ex: {
      pgen: "Weight 10.4 kg (appropriate). Lethargic but rousable (AVPU: V). Temperature 38.9 °C, HR 168/min, RR 62/min, SpO₂ 86% on room air, capillary refill 2 s.", phyd: "Some dehydration: sunken eyes, drinks poorly, skin pinch slow.",
      presp: "Fast breathing 62/min, severe lower chest wall indrawing, nasal flaring, grunting; bronchial breathing and fine crackles at the right base; no wheeze.", pcvs: "Tachycardic, normal heart sounds, liver edge 1 cm.", pabd: "Soft.", pneuro: "Drowsy but no neck stiffness; fontanelle closed.", pskin: "No rash; mild pallor; no clubbing.",
      A: "Patent.", B: "RR 62, SpO₂ 86%, indrawing.", C: "HR 168, CRT 2 s.", D: "AVPU: V.", E: "Hot.",
    },
    exKey: ["pgen", "presp", "phyd", "pneuro"],
    ix: [
      { id: "spo2", group: "Bedside", label: "Pulse oximetry", result: "86% on room air; 94% on 2 L/min oxygen via nasal prongs.", meaning: "Hypoxaemia (<90%) is a danger sign: needs oxygen.", use: "key" },
      { id: "mal", group: "Bedside", label: "Malaria RDT and blood glucose", result: "Malaria RDT negative; glucose 4.6 mmol/L.", meaning: "Excludes malaria and hypoglycaemia as the cause of the lethargy.", use: "key" },
      { id: "cxr", group: "Imaging", label: "Chest X-ray", result: "Right lower lobe consolidation with air bronchograms; small parapneumonic effusion.", meaning: "Lobar pneumonia, probably pneumococcal.", use: "useful" },
      { id: "fbc", group: "Blood", label: "FBC, CRP", result: "WBC 24 (neutrophilia), Hb 10.1, CRP 148.", meaning: "Bacterial infection.", use: "useful" },
      { id: "hiv", group: "Blood", label: "HIV test (DNA PCR if <18 months with exposure; antibody otherwise)", result: "Negative.", meaning: "Consider HIV in severe pneumonia.", use: "useful" },
      { id: "lp", group: "Other", label: "Lumbar puncture", result: "Not done.", meaning: "", use: "low", note: "No neck stiffness/convulsions; an obvious pulmonary source; LP risk with hypoxia." },
    ],
    interpret: [mcq("pn-i1", "interpretation", "RR 62, severe chest indrawing, grunting, SpO₂ 86%, unable to drink, lethargic. How do you classify this child (IMCI/WHO)?", [
      o("Very severe pneumonia (danger signs: hypoxia, inability to drink, lethargy) — needs oxygen, injectable antibiotics and admission", true, "WHO/IMCI classification."), o("Pneumonia — treat with oral amoxicillin at home", false, "That is for fast breathing only."), o("Cough or cold — no antibiotics", false, "No."), o("Asthma", false, "No wheeze or history."),
    ], ["Is she breathing fast or in respiratory distress?", "What are the general danger signs?", "What does SpO₂ 86% mean?", "Very severe pneumonia."], "Hypoxaemia, chest indrawing and any general danger sign = severe/very severe pneumonia.", { after: "spo2" })],
    ddx: [
      { name: "Severe (lobar) bacterial pneumonia with hypoxaemia", aliases: ["pneumonia", "severe pneumonia", "lobar pneumonia", "bacterial pneumonia", "lower respiratory tract infection", "lrti", "very severe pneumonia"], tier: "likely", why: "Fever, cough, fast breathing, chest indrawing and focal chest signs in a toddler.", for: ["Fast breathing, indrawing, hypoxia, focal crackles/bronchial breathing"], against: ["None"], separate: { ask: "Cough/fever duration", exam: "Focal signs", ix: "CXR, SpO₂" } },
      { name: "Bronchiolitis / viral LRTI / asthma", aliases: ["bronchiolitis", "asthma", "wheezing", "viral infection", "viral pneumonia"], tier: "possible", why: "Viral LRTI and bronchiolitis (<2 years) cause fast breathing and distress, but wheeze usually dominates.", for: ["Fast breathing"], against: ["Focal consolidation, high fever, no wheeze"], separate: { ask: "Wheeze, atopy", exam: "Wheeze, hyperinflation", ix: "CXR" } },
      { name: "Severe malaria (respiratory distress/acidosis) / sepsis / heart failure / meningitis", aliases: ["malaria", "sepsis", "heart failure", "meningitis", "congenital heart disease", "septic shock"], tier: "dangerous", why: "Lethargy with fast breathing could be sepsis, malaria acidosis, heart failure or meningitis.", for: ["Lethargy, fever"], against: ["Focal chest signs, negative malaria test"], separate: { ask: "Neck stiffness, travel", exam: "Murmur, hepatomegaly, rash", ix: "RDT, glucose, cultures, echo if cardiac" } },
      { name: "Foreign body aspiration / TB / pertussis / PCP", aliases: ["foreign body", "tb", "tuberculosis", "pertussis", "pcp"], tier: "possible", why: "Other causes of lower respiratory illness.", for: ["Cough"], against: ["Acute febrile illness with consolidation"], separate: { ask: "Choking episode, TB contact", exam: "Unilateral hyperinflation", ix: "CXR, GeneXpert" } },
    ],
    event: { when: "after-exam", title: "Respiratory failure", text: "Despite oxygen at 2 L/min she becomes more drowsy, her breathing slows and she starts to gasp. SpO₂ drops to 80%.", vitals: "RR 22 irregular with gasping, SpO₂ 80%, HR 80 (falling), capillary refill 4 s.", q: mcq("pn-ev", "emergency", "What do you do NOW? (select all)", [
      o("Call for help; open airway, give 100% oxygen by non-rebreather mask, bag–valve–mask ventilation as needed and prepare for intubation/ICU transfer", true, "Impending arrest: bradycardia and gasping."), o("Give IV ampicillin + gentamicin immediately (do not delay)", true, "Treat the infection."), o("Check glucose and give IV fluids cautiously (10 mL/kg) if shocked; consider a chest drain if large effusion/tension", true, "Reversible causes."), o("Give a nebulised bronchodilator and reassure", false, "Wrong treatment."),
    ], ["Airway, breathing, circulation.", "What does bradycardia mean in a child?", "What treats the cause?", "Ventilate, oxygen, antibiotics."], "In children, bradycardia and gasping are pre-terminal: act immediately.") },
    dx: { q: mcq("pn-dx", "pathophysiology", "What is the best working diagnosis?", [
      o("Very severe right lobar (probably pneumococcal) pneumonia with hypoxaemia and dehydration", true, "Consolidation + hypoxia + danger signs."), o("Bronchiolitis", false, "No."), o("Asthma", false, "No."), o("Heart failure", false, "No."),
    ], ["Which lobe?", "Most likely organism?", "Danger signs?", "Lobar pneumococcal pneumonia."], "Know the pneumococcal conjugate vaccine."),
    },
    mgmt: mcq("pn-mx", "management", "Select correct management for this 10.4 kg child.", [
      o("Oxygen to keep SpO₂ ≥90%, using prongs/mask", true, "Hypoxia is the immediate danger."), o("IV/IM ampicillin (50 mg/kg 6-hourly) + gentamicin (7.5 mg/kg once daily) for 5 days; switch to oral amoxicillin when improving; add IV ceftriaxone if no improvement or empyema", true, "WHO regimen for severe pneumonia."), o("Treat fever with paracetamol, maintain hydration with NG feeds/IV fluids carefully, encourage breastfeeding", true, "Supportive care."), o("Assess for HIV, malnutrition, TB; give vitamin A/zinc as per guidelines; check immunisation and recall", true, "Address risk factors."),
      o("Oral antibiotics and send home", false, "Unsafe with danger signs."), o("Give large fluid boluses", false, "Risk of pulmonary oedema."),
    ], ["Which two drugs?", "What do you monitor?", "Weight-based dosing.", "Oxygen, injectable antibiotics, supportive."], "Always calculate the dose by weight."),
    consultant: [
      mcq("pn-c1", "consultant", "List WHO signs of severe pneumonia in a child (select all).", [
        o("Lower chest wall indrawing", true, "Yes."), o("Inability to drink or breastfeed, vomiting everything, convulsions, lethargy", true, "General danger signs."), o("Central cyanosis or SpO₂ <90%", true, "Yes."), o("Mild nasal congestion", false, "No."),
      ], ["Signs of work of breathing.", "General danger signs.", "Hypoxia.", "First three."], "Fast breathing alone = pneumonia (oral amoxicillin); add indrawing = severe."),
      mcq("pn-c2", "pathophysiology", "Why are children more prone to rapid respiratory failure?", [
        o("Small airways (resistance rises with the fourth power of the radius reduction), compliant chest wall, high metabolic rate and little reserve", true, "Children tire quickly."), o("Their lungs are larger", false, "No."), o("They have thicker alveoli", false, "No."), o("They have no surfactant", false, "No."),
      ], ["Poiseuille.", "Chest wall.", "Oxygen demand.", "First option."], "Children are not small adults."),
      mcq("pn-c3", "consultant", "What would kill this child, and what else worries you?", [
        o("Hypoxia → respiratory failure/arrest", true, "Immediate."), o("Sepsis/septic shock and dehydration", true, "Systemic."), o("Empyema/pleural effusion and complicated pneumonia", true, "Complications."), o("Underlying HIV/malnutrition", true, "Risk factors."),
      ], ["ABC.", "What else spreads?", "What complicates?", "All."], "Prevent with vaccination and clean household air."),
    ],
    chain: { risk: "Indoor smoke, incomplete immunisation, malnutrition, HIV, age <2 years", patho: "Pneumococcus invades the alveoli → consolidation → V/Q mismatch → hypoxia → increased work of breathing", symptoms: "Cough, fever, fast breathing, poor feeding, lethargy", signs: "RR 62, indrawing, grunting, crackles/bronchial breathing, SpO₂ 86%", ix: "Pulse oximetry, CXR, FBC/CRP, malaria RDT, glucose, HIV", dx: "Very severe lobar pneumonia", mx: "Oxygen, IV ampicillin + gentamicin, fluids/feeds, treat fever, address risk factors", comp: "Respiratory failure, empyema, sepsis, death" },
    mustKnow: ["Fast breathing + cough = pneumonia; add indrawing/danger signs = severe.", "Hypoxia (SpO₂ <90%) = oxygen immediately.", "Severe pneumonia: injectable ampicillin + gentamicin.", "Dose by weight; reassess every 6–12 hours.", "Bradycardia in a sick child = impending arrest.", "Check HIV, TB, malnutrition, immunisation.", "Pneumococcal and Hib vaccines prevent pneumonia."],
    thinkIf: [["Child with cough + fast breathing + indrawing", "Severe pneumonia."], ["Wheeze + recurrent episodes", "Asthma."], ["Fast breathing + hepatomegaly + murmur", "Heart failure/congenital heart disease."]],
    revise: "pneumonia",
  },
  {
    id: "pd-malaria", rotation: "paeds", title: "A feverish child who has started fitting", level: 2, setting: "Casualty — paediatric", tags: ["severe malaria", "seizure", "hypoglycaemia", "anaemia"], emergency: true,
    involved: ["Infective / immune", "Neurological", "Haematological", "Endocrine / metabolic"],
    vignette: "A 4-year-old boy from Kisumu is brought in with 3 days of fever and, in the last hour, two generalised convulsions. He is now drowsy and not responding to his mother.",
    hsets: ["paeds"], esets: ["paeds", "abcde"],
    hx: {
      onset: "Fever for 3 days, convulsions today.", danger: "Two convulsions in an hour, each about 3 minutes; lethargic; vomited twice; not drinking.", fever: "High fever, rigors, no net at home.", resp: "No cough; fast, deep breathing since this morning.", gi: "Vomiting; urine dark.", neuro: "No neck stiffness reported; no head injury.",
      birth: "Term, uneventful.", feed: "Normal diet.", imm: "Fully immunised.", dev: "Normal.", pmh: "Previous malaria treated 6 months ago.", hiv: "Mother HIV negative.", drugs: "Mother gave herbal tea; no antimalarials.", fam: "Lives near a swamp; no bed nets.", other: "Pale and yellow eyes noticed.",
    },
    hxKey: ["danger", "fever", "fam", "neuro", "drugs", "imm"],
    ex: {
      pgen: "Weight 15 kg. Unconscious, withdraws to pain only (Blantyre coma score 2). Temperature 39.6 °C, HR 160, RR 44 deep, SpO₂ 94%, capillary refill 3 s, BP 84/50.", phyd: "Moderately dehydrated.", presp: "Deep ‘acidotic’ breathing, clear chest.",
      pcvs: "Tachycardic, flow murmur, cool peripheries.", pabd: "Hepatosplenomegaly (liver 3 cm, spleen 4 cm).", pneuro: "Reduced tone, no neck stiffness, pupils reactive, retinal haemorrhages, plantars upgoing.", pskin: "Severe pallor, mild jaundice, no rash.",
      A: "Patent with positioning.", B: "RR 44 deep.", C: "HR 160, BP 84/50, CRT 3 s.", D: "Blantyre 2; glucose 2.0 mmol/L.", E: "Hot.",
    },
    exKey: ["pgen", "pneuro", "pskin", "pabd", "presp"],
    ix: [
      { id: "glu", group: "Bedside", label: "Blood glucose (immediately)", result: "2.0 mmol/L.", meaning: "Hypoglycaemia (<2.5 mmol/L in children) causes fits/coma — treat now.", use: "key" },
      { id: "mal", group: "Bedside", label: "Malaria RDT and blood film with parasite count", result: "RDT positive; P. falciparum parasitaemia 12%.", meaning: "Severe/cerebral malaria.", use: "key" },
      { id: "hb", group: "Blood", label: "Haemoglobin and FBC", result: "Hb 4.6 g/dL, platelets 70.", meaning: "Severe anaemia (<5): transfusion needed.", use: "key" },
      { id: "gas", group: "Blood", label: "Blood gas/lactate, U&E", result: "pH 7.20, lactate 7.1, HCO₃ 9, creatinine 80, K 4.4.", meaning: "Lactic acidosis explains the deep breathing.", use: "useful" },
      { id: "lp", group: "Other", label: "Lumbar puncture (after stabilisation, if no improvement)", result: "Normal CSF: clear, no cells, protein normal.", meaning: "Excludes meningitis.", use: "useful" },
      { id: "cxr", group: "Imaging", label: "Chest X-ray", result: "Not done.", meaning: "", use: "low", note: "No respiratory cause; do not delay treatment." },
    ],
    interpret: [mcq("pm-i1", "interpretation", "Parasitaemia 12%, Hb 4.6, glucose 2.0, lactate 7.1, Blantyre 2. What is this?", [
      o("Severe falciparum malaria with cerebral malaria, severe anaemia, hypoglycaemia and lactic acidosis", true, "Multiple severity criteria."), o("Uncomplicated malaria", false, "No."), o("Bacterial meningitis", false, "CSF normal."), o("Simple febrile convulsion", false, "Coma and organ dysfunction."),
    ], ["Which severity features?", "Which organ?", "Which parasite?", "Severe malaria."], "Treat first; do not wait for results.", { after: "mal" })],
    ddx: [
      { name: "Severe (cerebral) falciparum malaria", aliases: ["cerebral malaria", "severe malaria", "malaria", "falciparum malaria"], tier: "likely", why: "Fever, fits, coma, pallor, hepatosplenomegaly in an endemic area without a net.", for: ["Fever, convulsions, coma, pallor, splenomegaly"], against: ["None"], separate: { ask: "Endemic exposure", exam: "Spleen, retinal haemorrhages, pallor", ix: "RDT/film, glucose, Hb" } },
      { name: "Bacterial meningitis", aliases: ["meningitis", "bacterial meningitis"], tier: "dangerous", why: "Fever with fits and coma may be meningitis; co-infection is possible.", for: ["Fever, fits, coma"], against: ["No neck stiffness, malaria positive"], separate: { ask: "Neck stiffness, rash", exam: "Meningism, bulging fontanelle", ix: "LP" } },
      { name: "Febrile convulsion", aliases: ["febrile convulsion", "febrile seizure", "simple febrile seizure"], tier: "possible", why: "Common at age 6 months–5 years but short, generalised, and the child recovers quickly.", for: ["Fever, fit"], against: ["Prolonged coma, repeated fits, pallor, organ involvement"], separate: { ask: "Recovery time", exam: "Alert after the fit", ix: "Glucose, malaria test" } },
      { name: "Sepsis / hypoglycaemia from other cause / poisoning / encephalopathy", aliases: ["sepsis", "hypoglycaemia", "poisoning", "encephalopathy", "septic shock"], tier: "possible", why: "Other treatable causes of coma.", for: ["Coma, shock"], against: ["Parasitaemia, hepatosplenomegaly"], separate: { ask: "Ingestions", exam: "Pupils, source", ix: "Glucose, cultures, toxicology" } },
    ],
    event: { when: "after-exam", title: "Status epilepticus", text: "While you examine him he convulses again — now 6 minutes and continuing. His glucose on the monitor is 2.0 mmol/L.", vitals: "Seizing; SpO₂ 90%; HR 170.", q: mcq("pm-ev", "emergency", "What do you do NOW? (select all)", [
      o("Airway, oxygen; IV 10% dextrose 5 mL/kg (75 mL) bolus, then recheck glucose", true, "Hypoglycaemia is the first reversible cause."), o("IV/IM/rectal diazepam 0.3–0.5 mg/kg (rectal) or IV lorazepam if seizure continues; repeat once if needed", true, "Stop the seizure."), o("Start IV artesunate 2.4 mg/kg immediately (0, 12, 24 h then daily) — do not delay", true, "First-line severe malaria."), o("Transfuse packed cells 10–20 mL/kg (Hb 4.6 with respiratory distress/acidosis)", true, "Severe anaemia with decompensation."),
      o("Give oral quinine and a cold sponge", false, "Wrong route and treatment."),
    ], ["What is reversible and killing now?", "How do you stop a fit?", "Which antimalarial?", "Dextrose, benzodiazepine, artesunate, transfusion."], "Always check glucose in every child who fits or is comatose.") },
    dx: { q: mcq("pm-dx", "pathophysiology", "What is the working diagnosis?", [
      o("Severe falciparum malaria: cerebral malaria, severe anaemia, hypoglycaemia and lactic acidosis", true, "Sequestration and haemolysis."), o("Bacterial meningitis", false, "No."), o("Typhoid", false, "No."), o("Febrile convulsion", false, "No."),
    ], ["What does the parasite do to red cells?", "Where do infected cells stick?", "Which metabolic problems?", "Severe malaria."], "Cytoadherence in cerebral capillaries causes coma."),
    },
    mgmt: mcq("pm-mx", "management", "Select correct management.", [
      o("IV artesunate 2.4 mg/kg at 0, 12, 24 h then daily until able to take oral ACT (then a full 3-day course)", true, "WHO first-line."), o("Treat hypoglycaemia, fits and anaemia (transfuse 20 mL/kg whole blood or 10 mL/kg packed cells for Hb <5 or <6 with distress)", true, "Supportive."), o("Cautious fluids (avoid overload), antipyretics, monitoring of glucose every 4–6 h, GCS, urine output", true, "Prevent complications."), o("Broad-spectrum antibiotics until bacterial sepsis is excluded; follow up after discharge with bed nets and prevention", true, "Co-infection common; prevention."),
      o("Dexamethasone for cerebral oedema", false, "Harmful."), o("Oral chloroquine", false, "Not suitable."),
    ], ["Which drug?", "How do you treat low Hb?", "Which drugs do you avoid?", "Artesunate, transfuse, glucose, antibiotics, avoid steroids."], "Insecticide-treated nets prevent recurrence."),
    consultant: [
      mcq("pm-c1", "consultant", "Why do children get severe malaria more than adults in endemic areas?", [
        o("Lack of acquired immunity (adults develop partial immunity after repeated exposure)", true, "Immunity is gradual."), o("Children have more red cells", false, "No."), o("Children bite mosquitoes more", false, "No."), o("Because of poor sanitation only", false, "No."),
      ], ["Who gets semi-immune?", "What reduces severity?", "Age effect?", "Acquired immunity."], "Pregnant women and non-immune travellers are also at risk."),
      mcq("pm-c2", "pathophysiology", "How does malaria cause anaemia and acidosis?", [
        o("Haemolysis of infected and uninfected red cells, dyserythropoiesis; lactic acidosis from microvascular obstruction and anaerobic metabolism", true, "Multiple mechanisms."), o("Bleeding", false, "No."), o("Iron overload", false, "No."), o("Vitamin deficiency", false, "No."),
      ], ["Which cells are lost?", "What does sequestration do?", "What does tissue do without oxygen?", "Haemolysis and lactate."], "Treat early to prevent progression."),
      mcq("pm-c3", "consultant", "What would kill this child?", [
        o("Hypoglycaemia and prolonged seizures", true, "Immediate."), o("Severe anaemia/shock and respiratory distress", true, "Next."), o("Raised ICP/cerebral oedema", true, "Neurological."), o("Co-infection with bacterial sepsis", true, "Possible."),
      ], ["ABC.", "Glucose.", "Anaemia.", "All."], "Neurological sequelae occur in ~10% of survivors."),
    ],
    chain: { risk: "Endemic area, no net, young age, delayed care", patho: "P. falciparum → RBC invasion, haemolysis, cytoadherence/sequestration → cerebral hypoxia, lactic acidosis, hypoglycaemia", symptoms: "Fever, fits, drowsiness, vomiting, pallor", signs: "Coma, hepatosplenomegaly, severe pallor, retinal haemorrhages, Kussmaul breathing", ix: "Glucose, RDT/film, Hb, gas/lactate, LP if needed", dx: "Severe malaria (cerebral, anaemia, hypoglycaemia, acidosis)", mx: "Dextrose, benzodiazepine, IV artesunate, transfusion, antibiotics, supportive", comp: "Death, neurological sequelae, severe anaemia" },
    mustKnow: ["Fever in an endemic child: test for malaria.", "Fit or coma: check glucose first.", "IV artesunate 2.4 mg/kg (0, 12, 24 h, then daily).", "Transfuse for Hb <5 g/dL (or <6 with distress/respiratory signs).", "Avoid steroids and mannitol in cerebral malaria.", "Follow with a full ACT course.", "Give nets and educate carers."],
    thinkIf: [["Fever + fits + coma + pallor in an endemic child", "Cerebral malaria."], ["Deep breathing + low Hb + malaria", "Lactic acidosis/anaemia."], ["Fever + neck stiffness + bulging fontanelle", "Meningitis."]],
    revise: "severe malaria",
  },
  {
    id: "pd-dehyd", rotation: "paeds", title: "Watery diarrhoea and a limp baby", level: 1, setting: "Casualty", tags: ["diarrhoea", "dehydration", "shock", "ORS", "fluid resuscitation"], emergency: true,
    involved: ["Gastrointestinal / hepatobiliary", "Infective / immune", "Renal / urinary"],
    vignette: "A 9-month-old boy is brought limp and sleepy after 3 days of profuse watery diarrhoea and vomiting. His mother says he has not passed urine since yesterday and cries without tears.",
    hsets: ["paeds"], esets: ["paeds"],
    hx: {
      onset: "Watery diarrhoea 3 days, more than 10 stools a day; vomiting after each feed.", danger: "Cannot drink or breastfeed, very sleepy, no convulsions.", gi: "No blood or mucus; no urine for 12 hours; sunken eyes.", fever: "Mild fever.", birth: "Term, weight 3.0 kg.", feed: "Breastfeeding plus weaning on cow’s milk with an unwashed bottle.", imm: "Missed rotavirus and measles vaccines.",
      dev: "Normal.", hiv: "Mother HIV negative.", fam: "Water from an open stream; poor sanitation; neighbour’s baby also has diarrhoea.", drugs: "Gave herbal medicine and cola; no ORS.", resp: "No cough.", neuro: "None.", pmh: "None.", other: "No rash.",
    },
    hxKey: ["danger", "gi", "feed", "fam", "imm", "drugs"],
    ex: {
      pgen: "Weight 7.0 kg (was 8.2 kg last week: 14% loss). Lethargic (AVPU: P). HR 176/min, RR 48/min, temperature 37.8 °C, BP not recordable, capillary refill >4 s, cool mottled extremities.", phyd: "Severe dehydration: sunken eyes, sunken anterior fontanelle, very slow skin pinch (>2 s), dry mouth, no tears.",
      presp: "Deep acidotic breathing, clear chest.", pcvs: "Weak, fast pulse; cold peripheries.", pabd: "Distended soft abdomen, active bowel sounds; no mass.", pneuro: "Floppy but no neck stiffness.", pskin: "Cold, mottled; perineal excoriation.",
    },
    exKey: ["pgen", "phyd", "pcvs", "presp"],
    ix: [
      { id: "glu", group: "Bedside", label: "Blood glucose", result: "2.4 mmol/L.", meaning: "Hypoglycaemia is common in dehydrated children.", use: "key" },
      { id: "uec", group: "Blood", label: "U&E and gas", result: "Na 148 mmol/L, K 2.8, HCO₃ 8, pH 7.12, chloride 118, creatinine 120 (pre-renal).", meaning: "Hypernatraemic dehydration with severe non-anion-gap acidosis and hypokalaemia from stool losses — correct slowly.", use: "key" },
      { id: "stool", group: "Microbiology", label: "Stool microscopy ± culture / rotavirus test", result: "No blood cells; rotavirus antigen positive.", meaning: "Viral gastroenteritis; antibiotics are not needed.", use: "useful" },
      { id: "mal", group: "Bedside", label: "Malaria RDT", result: "Negative.", meaning: "Excludes malaria in a lethargic febrile child.", use: "useful" },
      { id: "xray", group: "Imaging", label: "Abdominal X-ray", result: "Not done.", meaning: "", use: "low", note: "No surgical abdomen; unnecessary." },
    ],
    interpret: [mcq("dh-i1", "interpretation", "Na 148, K 2.8, HCO₃ 8, pH 7.12, glucose 2.4. What is the best interpretation and implication?", [
      o("Hypernatraemic dehydration with metabolic acidosis, hypokalaemia and hypoglycaemia — resuscitate, give dextrose, correct slowly and replace potassium", true, "Too-rapid sodium correction risks cerebral oedema."), o("Isotonic dehydration only", false, "Sodium is high."), o("Diabetic ketoacidosis", false, "Glucose is low."), o("Pyloric stenosis", false, "No."),
    ], ["What does Na 148 mean for the speed of correction?", "Why is K low?", "Why is HCO₃ low?", "Hypernatraemic dehydration."], "Reduce sodium by no more than 10–12 mmol/L per 24 hours.", { after: "uec" })],
    ddx: [
      { name: "Severe dehydration (hypovolaemic shock) from acute watery gastroenteritis (rotavirus)", aliases: ["gastroenteritis", "dehydration", "diarrhoea", "rotavirus", "hypovolaemic shock", "acute watery diarrhoea", "cholera"], tier: "likely", why: "Profuse watery diarrhoea and vomiting with sunken eyes and fontanelle and no urine.", for: ["Diarrhoea ×3 days, no urine, sunken eyes/fontanelle, shock"], against: ["None"], separate: { ask: "Stool frequency, blood", exam: "Dehydration signs", ix: "Stool, electrolytes" } },
      { name: "Sepsis / bacterial enteritis (Shigella, cholera) / intussusception", aliases: ["sepsis", "shigella", "dysentery", "intussusception", "bacterial gastroenteritis", "septic shock"], tier: "dangerous", why: "Bloody stool or colicky pain would raise intussusception/dysentery.", for: ["Lethargy"], against: ["Watery stools only, no blood, no colicky pain"], separate: { ask: "Blood, drawing up legs, vomiting bile", exam: "Sausage mass, peritonism", ix: "Ultrasound, stool culture" } },
      { name: "Malaria / meningitis / pneumonia presenting with shock", aliases: ["malaria", "meningitis", "pneumonia"], tier: "possible", why: "Febrile lethargic child — keep other causes open.", for: ["Fever"], against: ["Clear diarrhoeal illness"], separate: { ask: "Fever pattern", exam: "Neck stiffness", ix: "RDT, LP" } },
      { name: "Diabetic ketoacidosis / inborn errors / pyloric stenosis", aliases: ["dka", "diabetes", "inborn error", "pyloric stenosis", "congenital adrenal hyperplasia"], tier: "possible", why: "Vomiting with acidosis in infants may reflect metabolic disease.", for: ["Vomiting, acidosis"], against: ["Hypoglycaemia, diarrhoea"], separate: { ask: "Polyuria, projectile vomiting", exam: "Olive mass, genitalia", ix: "Glucose, ketones, gas" } },
    ],
    event: { when: "after-exam", title: "In shock", text: "He is cold and mottled with a weak pulse and prolonged capillary refill. A cannula cannot be placed in a peripheral vein.", vitals: "HR 176, BP unrecordable, CRT >4 s, AVPU: P.", q: mcq("dh-ev", "emergency", "What do you do NOW? (select all)", [
      o("Give oxygen; obtain IV access (or intra-osseous if no vein in 2 minutes); IV Ringer’s lactate 20 mL/kg (140 mL) rapidly and reassess; give dextrose for hypoglycaemia", true, "Shock needs fluids immediately; IO is a safe route."), o("Repeat boluses until perfusion improves; then rehydrate (100 mL/kg over 6 hours in infants: 30 mL/kg in the first hour, 70 mL/kg over 5 h)", true, "WHO plan C."), o("Start nasogastric ORS after stabilisation, zinc 20 mg daily for 10 days and continue breastfeeding", true, "Zinc reduces duration/recurrence."), o("Give oral ORS only", false, "He cannot drink and is in shock."),
    ], ["What is failing — A, B or C?", "What is the first step to restore perfusion?", "What if no vein?", "Oxygen, IV/IO fluids, dextrose, reassess."], "Check glucose. Keep warm.") },
    dx: { q: mcq("dh-dx", "pathophysiology", "What is the diagnosis?", [
      o("Severe dehydration with hypovolaemic shock from acute watery diarrhoea (rotavirus), complicated by hypernatraemia, acidosis, hypokalaemia and hypoglycaemia", true, "Fluid and electrolyte loss."), o("Sepsis", false, "Not the primary problem."), o("Intussusception", false, "No."), o("Malnutrition", false, "No."),
    ], ["What was lost?", "What does hypernatraemia do?", "What is the acid–base state?", "Dehydration + shock."], "Prevent with ORS, zinc, breastfeeding, rotavirus vaccine and clean water."),
    },
    mgmt: mcq("dh-mx", "management", "Select correct management.", [
      o("Immediate IV Ringer’s lactate or saline 20 mL/kg boluses for shock, repeated if needed; add dextrose; then Plan C rehydration", true, "Priority."), o("Correct sodium slowly (≤12 mmol/L/24 h), replace potassium once urine is passed, monitor glucose and electrolytes", true, "Avoid cerebral oedema."), o("Zinc 20 mg/day ×10–14 days; continue breastfeeding; discharge with ORS and counselling on handwashing/clean water; vaccinate against rotavirus/measles", true, "Prevention."), o("Antibiotics only if bloody diarrhoea or cholera", true, "Not routine."),
      o("Antidiarrhoeals (loperamide)", false, "Harmful in children."), o("Give plain water", false, "No."),
    ], ["What do you give first?", "What mineral shortens diarrhoea?", "When are antibiotics indicated?", "Fluids, zinc, no antidiarrhoeals."], "Plan A (home), B (ORS in clinic), C (IV)."),
    consultant: [
      mcq("dh-c1", "consultant", "Classify dehydration in children (select all true).", [
        o("No dehydration: normal; Plan A", true, "Home ORS."), o("Some dehydration: restless/irritable, sunken eyes, thirsty, slow skin pinch; Plan B (ORS 75 mL/kg over 4 h)", true, "ORS."), o("Severe dehydration: lethargic/unconscious, sunken eyes, unable to drink, very slow skin pinch; Plan C (IV fluids)", true, "IV."), o("Dehydration is judged on weight alone", false, "Use signs."),
      ], ["A, B, C.", "Which signs?", "Which fluid?", "First three."], "Reassess frequently."),
      mcq("dh-c2", "pathophysiology", "How does ORS work in cholera and rotavirus diarrhoea?", [
        o("Sodium–glucose cotransport (SGLT1) in the small bowel stays intact, drawing water with it despite secretory diarrhoea", true, "Basis of ORS."), o("It kills the virus", false, "No."), o("It blocks chloride secretion", false, "No."), o("It replaces potassium only", false, "No."),
      ], ["Which transporter?", "Which ion drives water?", "Why does glucose help?", "SGLT1."], "ORS saves millions of lives."),
      mcq("dh-c3", "consultant", "What would kill this child, and what else are you worried about?", [
        o("Hypovolaemic shock and arrhythmia (hypokalaemia)", true, "Immediate."), o("Hypoglycaemia and seizures", true, "Metabolic."), o("Cerebral oedema from rapid sodium correction", true, "Treatment risk."), o("Acute kidney injury", true, "Pre-renal."),
      ], ["ABC.", "Glucose.", "Sodium.", "All."], "Safe fluid resuscitation is a core skill."),
    ],
    chain: { risk: "Poor sanitation, unclean bottle feeding, missed rotavirus vaccine, malnutrition", patho: "Viral enteropathy → loss of water/electrolytes in stool → hypovolaemia, acidosis, hypokalaemia, hypernatraemia", symptoms: "Watery diarrhoea, vomiting, thirst, lethargy, no urine", signs: "Sunken eyes/fontanelle, slow skin pinch, tachycardia, cold peripheries, deep breathing", ix: "Glucose, electrolytes/gas, stool, malaria test", dx: "Severe dehydration/shock from rotavirus gastroenteritis", mx: "Oxygen, IV/IO fluids, dextrose, Plan C, zinc, continue feeds", comp: "Death, AKI, cerebral oedema, malnutrition" },
    mustKnow: ["Diarrhoea + lethargy + sunken eyes = severe dehydration: IV fluids.", "Check glucose in every sick child.", "ORS + zinc + continued feeding for all diarrhoea.", "Plan C: Ringer’s lactate 100 mL/kg (30 mL/kg then 70 mL/kg).", "No antidiarrhoeals; antibiotics only for bloody diarrhoea/cholera.", "Intra-osseous access if no vein.", "Rotavirus vaccine and handwashing prevent disease."],
    thinkIf: [["Child with diarrhoea + lethargy + cold hands", "Hypovolaemic shock."], ["Bloody diarrhoea + fever", "Shigella — treat with antibiotics."], ["Colicky pain + bloody ‘redcurrant’ stool", "Intussusception."]],
    revise: "diarrhoea dehydration",
  },
  {
    id: "pd-sam", rotation: "paeds", title: "A swollen, miserable child with sparse hair", level: 2, setting: "Paediatric ward — nutrition unit", tags: ["malnutrition", "kwashiorkor", "HIV", "refeeding"],
    involved: ["Gastrointestinal / hepatobiliary", "Infective / immune", "Endocrine / metabolic"],
    vignette: "A 2-year-old girl is brought by her grandmother with swelling of the feet and face for two weeks, diarrhoea and a skin rash. She is apathetic and has stopped eating.",
    hsets: ["paeds"], esets: ["paeds"],
    hx: {
      onset: "Swelling of the feet for 2 weeks, face puffy; rash for 1 week.", danger: "Not eating, very apathetic, no convulsions.", gi: "Loose stools for weeks, vomiting occasionally.", fever: "Intermittent low-grade fever.", birth: "Term; mother died of ‘a long illness’ when she was 8 months old.", feed: "Weaned abruptly at 8 months onto maize porridge only; no milk, eggs or beans.",
      imm: "Partially immunised (missed measles).", dev: "Regressed: previously walked, now sits only.", hiv: "Mother died of suspected AIDS; child never tested.", fam: "Lives with elderly grandmother; poverty; no clean water.", resp: "Mild cough.", neuro: "Apathetic.", pmh: "Several chest infections.", drugs: "Herbal remedies.", other: "Hair thin and light-coloured.",
    },
    hxKey: ["feed", "hiv", "gi", "danger", "dev", "fam", "birth"],
    ex: {
      pgen: "Weight 8.1 kg (<−3 SD for age), MUAC 12.0 cm; bilateral pitting oedema to the knees (grade ++). Temperature 38.1 °C, HR 130, RR 34, SpO₂ 95%, capillary refill 2 s.", phyd: "Not reliably assessed because of oedema; no sunken eyes; do NOT use the dehydration scheme for malnourished children.",
      presp: "Crackles at the right base.", pcvs: "Normal heart sounds; liver edge 4 cm.", pabd: "Distended abdomen with hepatomegaly 4 cm, soft.", pneuro: "Apathetic, miserable, no meningism.", pskin: "Flaky-paint dermatosis on the legs and perineum, thin sparse reddish hair, angular stomatitis, generalised lymphadenopathy, pale conjunctivae, oral thrush.",
    },
    exKey: ["pgen", "pskin", "pabd", "phyd", "presp"],
    ix: [
      { id: "glu", group: "Bedside", label: "Blood glucose", result: "2.6 mmol/L.", meaning: "Hypoglycaemia is a leading cause of death in SAM.", use: "key" },
      { id: "hiv", group: "Blood", label: "HIV test (PCR if <18 months, antibody if older)", result: "HIV antibody positive (confirmed with PCR); CD4 percentage 14%.", meaning: "HIV is common underlying SAM; needs ART.", use: "key" },
      { id: "hb", group: "Blood", label: "Hb and malaria test", result: "Hb 6.8 g/dL; malaria RDT negative.", meaning: "Anaemia of malnutrition/HIV; do not transfuse unless Hb <4 or <6 with distress.", use: "key" },
      { id: "uec", group: "Blood", label: "U&E, albumin", result: "Na 126, K 2.9, albumin 17 g/L.", meaning: "Low sodium and potassium; very low albumin — hallmarks of kwashiorkor.", use: "useful" },
      { id: "cxr", group: "Imaging", label: "Chest X-ray", result: "Right lower zone consolidation.", meaning: "Pneumonia must be treated.", use: "useful" },
      { id: "stool", group: "Microbiology", label: "Stool microscopy and TB screen (GeneXpert on gastric aspirate if suspected)", result: "Giardia cysts; no ova; TB screen negative.", meaning: "Treat giardia.", use: "useful" },
      { id: "ivfluids", group: "Other", label: "Large IV fluid boluses for the oedema/’dehydration’", result: "Not done.", meaning: "", use: "low", note: "Malnourished children are intolerant of fluid: bolus therapy causes heart failure. Use ReSoMal/F-75 and treat shock only with careful small volumes." },
    ],
    interpret: [mcq("sam-i1", "interpretation", "Weight <−3 SD, MUAC 12.0 cm, bilateral pitting oedema, albumin 17, Na 126, K 2.9, glucose 2.6. How do you classify this?", [
      o("Severe acute malnutrition with kwashiorkor (oedematous), complicated by hypoglycaemia, infection, anaemia and probable HIV", true, "Oedema alone defines severe acute malnutrition."), o("Marasmus only", false, "Oedema indicates kwashiorkor."), o("Nephrotic syndrome", false, "Features of malnutrition and low K/glucose."), o("Normal nutrition", false, "No."),
    ], ["What does bilateral pitting oedema mean in a child?", "What is MUAC <11.5?", "Which electrolytes are low?", "Kwashiorkor SAM."], "SAM with oedema, any complication or no appetite = inpatient care.", { after: "uec" })],
    ddx: [
      { name: "Severe acute malnutrition — kwashiorkor (± HIV-associated)", aliases: ["malnutrition", "kwashiorkor", "sam", "severe acute malnutrition", "protein energy malnutrition", "pem", "marasmic kwashiorkor"], tier: "likely", why: "Poor protein intake plus chronic infection/HIV; oedema, skin changes, sparse hair, apathy, hepatomegaly.", for: ["Maize-only diet, oedema, skin and hair changes, apathy, hepatomegaly"], against: ["None"], separate: { ask: "Diet, weaning, infections", exam: "Oedema, skin, hair, MUAC", ix: "Glucose, albumin, HIV" } },
      { name: "Nephrotic syndrome", aliases: ["nephrotic syndrome", "nephrotic", "renal disease"], tier: "possible", why: "Generalised oedema in a child suggests nephrotic syndrome.", for: ["Facial and leg oedema"], against: ["Malnutrition signs, dermatosis, low K/glucose"], separate: { ask: "Frothy urine", exam: "Periorbital oedema, normal weight", ix: "Urine protein, albumin, cholesterol" } },
      { name: "Heart failure / liver disease / protein-losing enteropathy / HIV enteropathy", aliases: ["heart failure", "liver disease", "protein losing enteropathy", "hiv", "congenital heart disease"], tier: "possible", why: "Other causes of oedema and hepatomegaly.", for: ["Hepatomegaly, oedema"], against: ["Normal heart sounds, malnutrition picture"], separate: { ask: "Breathlessness", exam: "Murmur, JVP", ix: "Echo, albumin, HIV test" } },
      { name: "Concurrent life-threatening infection (pneumonia, sepsis, TB)", aliases: ["pneumonia", "sepsis", "tb", "tuberculosis", "infection"], tier: "dangerous", why: "Malnourished children have blunted signs and die of infection.", for: ["Fever, cough, crackles"], against: ["N/A"], separate: { ask: "Cough, fever", exam: "Focal signs", ix: "CXR, cultures, GeneXpert" } },
    ],
    twist: { text: "During the first hours of ‘catch-up feeding’ with a high-energy formula she develops tachycardia, breathlessness and a rising respiratory rate; her phosphate, potassium and magnesium are very low.", q: mcq("sam-tw", "management", "What has happened and what should you have done?", [
      o("Refeeding syndrome / cardiac failure from over-rapid feeding: use F-75 (stabilisation phase) first with careful monitoring; replace K, Mg, treat infection; avoid IV fluids and high-protein/high-energy feeds early", true, "Stabilise before catch-up feeding."), o("Allergic reaction: give adrenaline", false, "No."), o("Pneumonia only: stop all feeds", false, "No."), o("Dehydration: give a large saline bolus", false, "Fatal in SAM."),
    ], ["What does the heart do in SAM?", "Which minerals shift into cells?", "Which formula first?", "F-75 and careful monitoring."], "10 steps: hypoglycaemia, hypothermia, dehydration, electrolytes, infection, micronutrients, cautious feeding, catch-up growth, stimulation, preparation for discharge.") },
    dx: { q: mcq("sam-dx", "pathophysiology", "What is the underlying pathophysiology of the oedema?", [
      o("Low protein intake and chronic infection → hypoalbuminaemia, increased capillary permeability, sodium and water retention", true, "Kwashiorkor oedema."), o("Cardiac failure from myocarditis", false, "No."), o("Nephrotic protein loss", false, "No."), o("Excess salt intake", false, "No."),
    ], ["What are the main nutrients lacking?", "What does low albumin do?", "What other factors?", "Hypoalbuminaemia and permeability."], "Oxidative stress and infection also contribute."),
    },
    mgmt: mcq("sam-mx", "management", "Select correct management of SAM with complications.", [
      o("Treat hypoglycaemia (10% dextrose 5 mL/kg), keep warm, avoid IV fluids unless in shock", true, "Priority."), o("Start F-75 (stabilisation) with frequent small feeds, then F-100/RUTF for catch-up", true, "Phased feeding."), o("Broad-spectrum antibiotics (ampicillin + gentamicin), treat pneumonia, giardia and oral thrush; start ART and cotrimoxazole prophylaxis", true, "Infection control."), o("Correct micronutrients (vitamin A, folate, zinc, potassium, magnesium); avoid iron in the first week; psychosocial stimulation and family support", true, "Complete care."),
      o("Give a 20 mL/kg saline bolus for the oedema", false, "Dangerous."), o("Give high-protein formula immediately", false, "Risk of refeeding syndrome."),
    ], ["What kills children with SAM?", "Which formula first?", "Which infection treatment?", "Stabilise, antibiotics, ART, micronutrients."], "Discharge to community nutrition programme with follow-up."),
    consultant: [
      mcq("sam-c1", "consultant", "Define severe acute malnutrition (select all).", [
        o("Weight-for-height/length <−3 SD", true, "WHO definition."), o("MUAC <11.5 cm (6–59 months)", true, "WHO definition."), o("Bilateral pitting oedema", true, "WHO definition."), o("Weight below the median", false, "Not SAM."),
      ], ["Three criteria.", "MUAC.", "Oedema.", "First three."], "Any of them suffices."),
      mcq("sam-c2", "pathophysiology", "Why do malnourished children not show typical signs of infection?", [
        o("Impaired immune response: they may be afebrile or hypothermic, with blunted signs, yet infected; treat empirically", true, "Treat all with antibiotics."), o("Because infection is rare", false, "No."), o("Because they are well", false, "No."), o("Because they have strong immunity", false, "No."),
      ], ["Which system is impaired?", "Do they mount fever?", "What do you do?", "Treat empirically."], "SAM is an immunodeficiency state."),
      mcq("sam-c3", "consultant", "What would kill this child?", [
        o("Hypoglycaemia and hypothermia", true, "Common early deaths."), o("Infection/sepsis, pneumonia, TB", true, "Common."), o("Heart failure from rapid IV fluids/refeeding", true, "Iatrogenic."), o("Electrolyte disturbance (low K, Mg)", true, "Arrhythmia."),
      ], ["Early vs late.", "Which treatment can harm?", "Which minerals?", "All."], "Prevent with exclusive breastfeeding, diverse diet, HIV care."),
    ],
    chain: { risk: "Poverty, early weaning onto maize only, maternal death/HIV, repeated infection", patho: "Protein deficiency + infection → low albumin, increased capillary permeability, fatty liver, immune and gut dysfunction", symptoms: "Swelling, apathy, poor appetite, diarrhoea, rash", signs: "Pitting oedema, flaky-paint dermatosis, sparse hair, hepatomegaly, MUAC 12 cm", ix: "Glucose, HIV, Hb, electrolytes, albumin, CXR", dx: "Kwashiorkor SAM with HIV, pneumonia and anaemia", mx: "Treat hypoglycaemia, antibiotics, F-75 then RUTF, ART, micronutrients, careful fluids", comp: "Hypoglycaemia, hypothermia, sepsis, heart failure, refeeding syndrome" },
    mustKnow: ["Bilateral pitting oedema = severe acute malnutrition until proven otherwise.", "Check glucose and temperature immediately.", "Never use IV fluid boluses unless in shock (and then small volumes).", "Give antibiotics to all admitted SAM children.", "F-75 first; do not rush feeding.", "Test for HIV and TB.", "No iron in the first week; give potassium, magnesium and vitamin A."],
    thinkIf: [["Child with oedema, flaky skin and sparse hair", "Kwashiorkor."], ["Wasted child with MUAC <11.5", "Marasmus/SAM."], ["Oedema + frothy urine + normal growth", "Nephrotic syndrome."]],
    revise: "malnutrition",
  },
]
