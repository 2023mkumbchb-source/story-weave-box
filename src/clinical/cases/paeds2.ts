import type { CaseDef } from "../types";
import { mcq, o } from "../templates";

export const PAEDS_2: CaseDef[] = [
  {
    id: "pd-neo", rotation: "paeds", title: "A four-day-old who will not feed and looks yellow", level: 2, setting: "Newborn unit", tags: ["neonatal sepsis", "jaundice", "prematurity", "hypothermia"], emergency: true,
    involved: ["Infective / immune", "Gastrointestinal / hepatobiliary", "Haematological"],
    vignette: "A 4-day-old baby boy, born at home at 36 weeks, is brought by his grandmother because he has stopped breastfeeding, is lethargic and has turned yellow. His mother had fever and prolonged rupture of membranes before delivery.",
    hsets: ["paeds"], esets: ["paeds", "abcde"],
    hx: {
      onset: "Normal for 2 days, then poor feeding and sleepiness for 1 day.", danger: "Not sucking, lethargic, vomiting; no convulsions yet.", fever: "Felt cold to touch yesterday; no documented fever.", gi: "Mild abdominal distension, passed meconium.", birth: "Born at home at 36 weeks (late preterm), birth weight 2.2 kg; cried late; mother had fever and foul liquor, membranes ruptured for 24 hours; umbilical cord cut with an unclean blade.",
      feed: "Breastfeeding poorly for a day; cow’s milk and herbs given to ‘clean him’.", imm: "BCG and polio not yet given.", hiv: "Mother’s HIV status not known (no ANC).", pmh: "Mother had untreated urinary symptoms in pregnancy.", fam: "Mother not recovered; low income; home birth.", dev: "N/A.", resp: "Fast breathing noticed.", neuro: "Lethargic.", drugs: "Herbal remedies.", other: "Yellow since day 3; pus around the umbilicus.",
    },
    hxKey: ["birth", "danger", "feed", "hiv", "other", "fever"],
    ex: {
      pgen: "Weight 2.1 kg. Lethargic, poor tone. Temperature 35.2 °C (hypothermia), HR 176, RR 70 with grunting, SpO₂ 88%, capillary refill 4 s, glucose 1.8 mmol/L.", phyd: "Mildly dehydrated.", presp: "Tachypnoeic, grunting, chest indrawing, bilateral crackles.", pcvs: "Tachycardic, no murmur, weak pulses.",
      pabd: "Distended, hepatosplenomegaly 2 cm; umbilicus with purulent discharge and surrounding erythema (omphalitis).", pneuro: "Hypotonic, weak suck, bulging anterior fontanelle, no seizures.", pskin: "Jaundice to the thighs, pustules on the skin.",
      A: "Patent.", B: "RR 70, SpO₂ 88%.", C: "HR 176, CRT 4 s.", D: "Lethargic, glucose 1.8.", E: "Temp 35.2.",
    },
    exKey: ["pgen", "pabd", "pneuro", "pskin", "presp"],
    ix: [
      { id: "glu", group: "Bedside", label: "Blood glucose and temperature", result: "Glucose 1.8 mmol/L; temperature 35.2 °C.", meaning: "Hypoglycaemia and hypothermia accompany neonatal sepsis and kill.", use: "key" },
      { id: "bc", group: "Microbiology", label: "Blood culture (before antibiotics, but do not delay them)", result: "Pending; later grows Klebsiella pneumoniae (resistant to ampicillin).", meaning: "Identifies organism and sensitivities.", use: "key" },
      { id: "fbc", group: "Blood", label: "FBC, CRP, bilirubin (total and direct)", result: "WBC 3.1 (neutropenia), platelets 62, CRP 96; total bilirubin 302 µmol/L (unconjugated), direct 14.", meaning: "Sepsis with severe hyperbilirubinaemia (risk of kernicterus).", use: "key" },
      { id: "lp", group: "Other", label: "Lumbar puncture (when stable)", result: "Turbid CSF: WBC 1,200/µL (neutrophils), protein high, glucose low; Gram-negative rods.", meaning: "Neonatal meningitis.", use: "useful" },
      { id: "cxr", group: "Imaging", label: "Chest X-ray", result: "Bilateral diffuse infiltrates (pneumonia).", meaning: "Respiratory involvement.", use: "useful" },
      { id: "group", group: "Blood", label: "Blood group, Coombs test", result: "Mother O positive, baby A positive; direct Coombs negative.", meaning: "Haemolytic disease less likely; jaundice is multifactorial (sepsis, prematurity).", use: "useful" },
      { id: "usabd", group: "Imaging", label: "Abdominal ultrasound", result: "Not done.", meaning: "", use: "low", note: "Not urgent; stabilise first." },
    ],
    interpret: [mcq("neo-i1", "interpretation", "Temperature 35.2, glucose 1.8, grunting, SpO₂ 88%, total bilirubin 302, WBC 3.1, platelets 62. What is the key priority?", [
      o("Neonatal sepsis (early/late onset) with respiratory distress, hypoglycaemia, hypothermia and severe jaundice: stabilise and give IV antibiotics immediately", true, "These are life-threatening."), o("Physiological jaundice — reassure", false, "Jaundice on day 3 with sepsis is pathological."), o("Breastmilk jaundice — continue breastfeeding", false, "No."), o("Biliary atresia — arrange surgery", false, "Direct bilirubin is normal."),
    ], ["Is he well or sick?", "Which problems are immediately life-threatening?", "Where did the infection start?", "Sepsis with complications."], "Neonates with suspected sepsis: warm, glucose, oxygen, antibiotics in the first hour.", { after: "fbc" })],
    ddx: [
      { name: "Neonatal sepsis (pneumonia, meningitis, omphalitis) with pathological jaundice", aliases: ["neonatal sepsis", "sepsis", "septicaemia", "neonatal meningitis", "omphalitis", "early onset sepsis", "pneumonia"], tier: "likely", why: "Risk factors (preterm, PROM, maternal fever, unclean cord) plus lethargy, poor feeding, hypothermia, respiratory distress and jaundice.", for: ["Maternal fever, PROM, home birth, pus at the umbilicus", "Lethargy, hypothermia, grunting, jaundice"], against: ["None"], separate: { ask: "Maternal risk factors", exam: "Omphalitis, fontanelle, perfusion", ix: "Cultures, CRP, LP" } },
      { name: "Haemolytic disease / ABO or Rhesus incompatibility / G6PD deficiency", aliases: ["haemolytic disease", "abo incompatibility", "rhesus", "g6pd", "haemolysis", "hdn"], tier: "possible", why: "Early jaundice (<24 h) usually signals haemolysis.", for: ["Jaundice"], against: ["Jaundice from day 3, Coombs negative, sick baby"], separate: { ask: "Time of onset, family history", exam: "Pallor, splenomegaly", ix: "Coombs, blood group, G6PD, film" } },
      { name: "Metabolic/endocrine causes (hypoglycaemia, hypothyroidism, galactosaemia)", aliases: ["hypothyroidism", "galactosaemia", "metabolic", "hypoglycaemia", "inborn error"], tier: "possible", why: "Prolonged or unexplained jaundice with poor feeding.", for: ["Jaundice, lethargy"], against: ["Clear infective picture"], separate: { ask: "Family history, vomiting", exam: "Cataracts, hepatomegaly", ix: "TFTs, reducing substances" } },
      { name: "Birth asphyxia / intracranial haemorrhage / hypothermia / congenital heart disease", aliases: ["birth asphyxia", "intracranial haemorrhage", "hypothermia", "heart disease", "hie"], tier: "dangerous", why: "Sick neonates need all dangerous causes considered.", for: ["Late cry at birth"], against: ["Evolving sepsis picture"], separate: { ask: "Birth history", exam: "Murmur, tone, fontanelle", ix: "Echo, cranial ultrasound" } },
    ],
    event: { when: "after-exam", title: "Apnoea and convulsion", text: "While you are assessing him he has an apnoeic spell and then a generalised convulsion. His colour is grey.", vitals: "SpO₂ 78%, HR 90, glucose 1.8.", q: mcq("neo-ev", "emergency", "What do you do NOW? (select all)", [
      o("Open airway, stimulate, bag–valve–mask ventilation with oxygen; keep warm (skin-to-skin/incubator)", true, "ABC and warmth."), o("IV 10% dextrose 2 mL/kg (about 4 mL) then dextrose infusion; check glucose again", true, "Treat hypoglycaemia."), o("IV/IM ampicillin + gentamicin (or ceftriaxone if meningitis suspected/ resistant organisms) immediately; phenobarbital if seizures continue", true, "Antibiotics and anticonvulsant."), o("Give a feed through a cup", false, "Wrong."),
    ], ["Temperature, glucose, airway.", "Which reversible cause?", "What treats the infection?", "Airway, warmth, dextrose, antibiotics."], "Neonatal doses are weight-based and age-based; always check.") },
    dx: { q: mcq("neo-dx", "pathophysiology", "What is the working diagnosis?", [
      o("Late-preterm baby with neonatal sepsis (pneumonia, omphalitis, possible meningitis), hypoglycaemia, hypothermia and severe unconjugated hyperbilirubinaemia", true, "Pathological jaundice with sepsis."), o("Physiological jaundice", false, "No."), o("Biliary atresia", false, "Direct bilirubin normal."), o("Rhesus disease", false, "Coombs negative."),
    ], ["What is the main risk?", "Which organs are infected?", "Why is bilirubin high?", "Sepsis with jaundice."], "Sepsis causes haemolysis and reduces bilirubin conjugation."),
    },
    mgmt: mcq("neo-mx", "management", "Select correct management.", [
      o("Stabilise: warmth (kangaroo care/incubator), oxygen, IV dextrose, treat shock cautiously (10 mL/kg), give vitamin K if not given", true, "Start with ABC and glucose."), o("IV ampicillin + gentamicin (or ceftriaxone/meropenem per local resistance and meningitis), LP when stable; treat for 10–14 days", true, "Empirical antibiotics."), o("Phototherapy now; exchange transfusion if bilirubin approaches the threshold (>340–400 µmol/L for this age/weight) or signs of acute bilirubin encephalopathy", true, "Prevent kernicterus."), o("Care for the mother, test HIV, cord care with chlorhexidine, immunisations, and counsel on clean delivery and breastfeeding", true, "Prevention."),
      o("Treat with herbal remedies and observe", false, "Fatal."), o("Stop breastfeeding", false, "Not indicated."),
    ], ["Which three problems first?", "Which antibiotics?", "How do you treat jaundice?", "Warmth, glucose, antibiotics, phototherapy."], "Recognise danger signs at the community level."),
    consultant: [
      mcq("neo-c1", "consultant", "Danger signs in a newborn requiring urgent referral (select all).", [
        o("Not feeding well, lethargy, convulsions", true, "Yes."), o("Fast breathing (≥60/min), chest indrawing, grunting", true, "Yes."), o("Fever ≥37.5 or hypothermia <35.5 °C", true, "Yes."), o("Mild nasal congestion", false, "No."),
      ], ["Feeding, activity.", "Breathing.", "Temperature.", "First three."], "Neonates have limited reserve."),
      mcq("neo-c2", "pathophysiology", "Why is unconjugated hyperbilirubinaemia dangerous in neonates?", [
        o("Lipid-soluble unconjugated bilirubin crosses the immature blood–brain barrier and deposits in the basal ganglia (kernicterus), especially with sepsis, acidosis, hypoalbuminaemia", true, "Brain damage."), o("It damages the kidneys", false, "No."), o("It causes blindness", false, "No."), o("It stains only the skin", false, "No."),
      ], ["Conjugated or not?", "Which structure?", "Which factors increase risk?", "Kernicterus."], "Prevent with phototherapy and exchange transfusion."),
      mcq("neo-c3", "consultant", "What would kill this baby?", [
        o("Septic shock/respiratory failure", true, "Immediate."), o("Hypoglycaemia and seizures", true, "Metabolic."), o("Meningitis complications", true, "CNS."), o("Kernicterus (long-term brain damage)", true, "Neurological."),
      ], ["ABC.", "Glucose.", "CNS.", "All."], "Neonatal mortality is highest in the first week."),
    ],
    chain: { risk: "Prematurity, PROM, maternal infection, unclean delivery/cord care", patho: "Bacteria enter via lungs/cord/gut → bacteraemia → organ dysfunction, haemolysis and reduced conjugation → jaundice", symptoms: "Poor feeding, lethargy, fast breathing, jaundice", signs: "Hypothermia, grunting, omphalitis, hepatosplenomegaly, bulging fontanelle", ix: "Glucose, culture, FBC/CRP, bilirubin, LP, CXR", dx: "Neonatal sepsis with pneumonia/meningitis and hyperbilirubinaemia", mx: "Warmth, glucose, oxygen, antibiotics, phototherapy/exchange, supportive care", comp: "Death, kernicterus, neurological sequelae" },
    mustKnow: ["Neonatal sepsis presents non-specifically: poor feeding, lethargy, temperature instability.", "Check glucose and temperature in every sick newborn.", "Antibiotics within the first hour; ampicillin + gentamicin (adjust for local resistance).", "Jaundice in the first 24 h or beyond day 14 is pathological.", "Phototherapy; exchange transfusion for severe hyperbilirubinaemia.", "Kangaroo mother care keeps preterm babies warm.", "Prevent with clean delivery, cord care and ANC."],
    thinkIf: [["Newborn: not feeding + lethargic + hypothermic", "Neonatal sepsis."], ["Jaundice <24 h", "Haemolytic disease (ABO/Rhesus/G6PD)."], ["Prolonged jaundice + pale stool + dark urine", "Biliary atresia/cholestasis."]],
    revise: "neonatal sepsis",
  },
  {
    id: "pd-scd", rotation: "paeds", title: "A child with sickle cell disease who is in terrible pain and breathless", level: 2, setting: "Paediatric casualty", tags: ["sickle cell disease", "vaso-occlusive crisis", "acute chest syndrome", "anaemia"], emergency: true,
    involved: ["Haematological", "Respiratory", "Infective / immune"],
    vignette: "A 7-year-old boy with known sickle cell disease is brought in with 2 days of severe pain in his legs and back, a fever, and now chest pain and fast breathing.",
    hsets: ["paeds"], esets: ["paeds", "abcde"],
    hx: {
      onset: "Pain in both legs and back for 2 days; fever and cough since yesterday.", fever: "Fever to 39 °C.", resp: "Chest pain on breathing, cough, fast breathing.", danger: "Drinking less, no convulsions.", gi: "Passing less urine; no diarrhoea.",
      pmh: "HbSS diagnosed at 2 years; 3 previous crises; one admission with pneumonia; no hydroxyurea; not on penicillin prophylaxis consistently.", drugs: "Folic acid sometimes; no antimalarial prophylaxis.", imm: "Missed pneumococcal booster.", fam: "Two siblings with sickle cell trait; parents carriers.", birth: "Term, normal.", feed: "Normal.", dev: "Normal.", hiv: "Negative.", neuro: "No weakness or headache.", other: "Dark yellow eyes at times.",
    },
    hxKey: ["pmh", "fever", "resp", "drugs", "imm", "gi"],
    ex: {
      pgen: "Weight 18 kg. In severe pain, ill. Temperature 39.2 °C, HR 142, RR 48, SpO₂ 89% on room air, BP 96/54, capillary refill 3 s.", phyd: "Moderately dehydrated.", presp: "Tachypnoeic with grunting; bronchial breathing and crackles at the left base; pleural rub.", pcvs: "Tachycardia, flow murmur, spleen not palpable.",
      pabd: "Mild abdominal tenderness; liver 2 cm; spleen not felt (auto-infarcted).", pneuro: "Alert, no deficits, no neck stiffness.", pskin: "Pallor, mild jaundice; tender swollen hands and feet; no rash.", A: "Patent.", B: "RR 48, SpO₂ 89%.", C: "HR 142, BP 96/54.", D: "Alert.", E: "Febrile.",
    },
    exKey: ["pgen", "presp", "pskin", "phyd", "pneuro"],
    ix: [
      { id: "spo2", group: "Bedside", label: "Pulse oximetry and malaria RDT/glucose", result: "SpO₂ 89%; malaria RDT negative; glucose 5.0 mmol/L.", meaning: "Hypoxia warrants oxygen; excludes malaria, a common trigger.", use: "key" },
      { id: "fbc", group: "Blood", label: "FBC and reticulocytes", result: "Hb 5.4 g/dL (baseline 7.5), WBC 24, platelets 560, reticulocytes 22%.", meaning: "Acute drop in Hb (sequestration/haemolysis/aplastic crisis) with leucocytosis.", use: "key" },
      { id: "cxr", group: "Imaging", label: "Chest X-ray", result: "New left lower-lobe infiltrate with a small effusion.", meaning: "Acute chest syndrome (new pulmonary infiltrate + fever/respiratory signs) — a leading cause of death in SCD.", use: "key" },
      { id: "cult", group: "Microbiology", label: "Blood cultures", result: "Pending; later Streptococcus pneumoniae.", meaning: "Encapsulated organisms are the major infective threat (functional asplenia).", use: "key" },
      { id: "lft", group: "Blood", label: "Bilirubin, LDH, U&E", result: "Bilirubin 56 (unconjugated), LDH 1,200, creatinine 60.", meaning: "Haemolysis; renal function normal.", use: "useful" },
      { id: "xlimb", group: "Imaging", label: "X-rays of the limbs", result: "Not done.", meaning: "", use: "low", note: "Pain is vaso-occlusive; imaging is only for suspected osteomyelitis after stabilisation." },
    ],
    interpret: [mcq("sc-i1", "interpretation", "New left lower-lobe infiltrate + fever + hypoxia + falling Hb + painful crisis. What is the diagnosis?", [
      o("Acute chest syndrome complicating a vaso-occlusive crisis — treat as an emergency", true, "Sickling in pulmonary vasculature."), o("Simple pneumonia only", false, "Pneumonia and ACS overlap; treat both."), o("Asthma", false, "No."), o("Pulmonary TB", false, "No."),
    ], ["What is new on CXR?", "What does hypoxia mean in SCD?", "Where does sickling occur?", "Acute chest syndrome."], "ACS: oxygen, analgesia, antibiotics, incentive spirometry, simple/exchange transfusion.", { after: "cxr" })],
    ddx: [
      { name: "Vaso-occlusive crisis with acute chest syndrome (± pneumonia)", aliases: ["sickle cell crisis", "vaso-occlusive crisis", "acute chest syndrome", "sickle cell disease", "sickle crisis", "voc", "ACS"], tier: "likely", why: "Known HbSS with painful limbs, fever, new chest signs and hypoxia.", for: ["HbSS, bone pain, fever, hypoxia, infiltrate"], against: ["None"], separate: { ask: "Previous crises, triggers", exam: "Dactylitis, chest signs", ix: "CXR, FBC, retics" } },
      { name: "Sepsis / pneumococcal infection (functional asplenia)", aliases: ["sepsis", "pneumococcal sepsis", "pneumonia", "infection", "septicaemia"], tier: "dangerous", why: "SCD children are functionally asplenic; fever is an emergency.", for: ["Fever, tachycardia"], against: ["N/A"], separate: { ask: "Prophylaxis, vaccination", exam: "Shock, meningism", ix: "Cultures, CRP, LP if indicated" } },
      { name: "Severe anaemia: aplastic crisis (parvovirus B19) / splenic sequestration / haemolytic crisis / malaria", aliases: ["aplastic crisis", "splenic sequestration", "hyperhaemolysis", "malaria", "anaemia", "parvovirus"], tier: "possible", why: "Hb has fallen sharply.", for: ["Hb 5.4"], against: ["High reticulocytes, spleen not enlarged"], separate: { ask: "Abdominal pain, pallor", exam: "Big spleen", ix: "Retics, film" } },
      { name: "Osteomyelitis / septic arthritis / stroke", aliases: ["osteomyelitis", "septic arthritis", "stroke", "bone infection"], tier: "possible", why: "SCD predisposes to Salmonella osteomyelitis and stroke.", for: ["Bone pain, fever"], against: ["Symmetrical pain, chest signs"], separate: { ask: "Focal swelling, weakness", exam: "Joint effusion, neurological signs", ix: "MRI, cultures" } },
    ],
    event: { when: "after-ix", title: "Neurological deficit", text: "Several hours later he develops a sudden left-sided weakness and slurred speech.", vitals: "BP 130/82, SpO₂ 93% on oxygen, GCS 13.", q: mcq("sc-ev", "emergency", "What do you do NOW? (select all)", [
      o("Treat as acute ischaemic stroke in SCD: ABC, oxygen, glucose check, and urgent exchange (or simple) transfusion to reduce HbS to <30%; do not wait for imaging if delayed", true, "Transfusion is life- and brain-saving."), o("Urgent CT/MRI brain to exclude haemorrhage while arranging transfusion", true, "Confirm and rule out bleeding."), o("Hydration, analgesia and neurology review", true, "Supportive."), o("Give aspirin and thrombolysis as in adults", false, "Not for SCD children."),
    ], ["Which problem is acute in the brain?", "What is the main treatment?", "What reduces sickling?", "Transfusion."], "Primary stroke prevention: transcranial Doppler screening and chronic transfusion/hydroxyurea.") },
    dx: { q: mcq("sc-dx", "pathophysiology", "What is the mechanism of the crisis?", [
      o("HbS polymerises when deoxygenated → red cells sickle → vaso-occlusion, haemolysis and infarction (bone, lung, brain, spleen)", true, "The core mechanism."), o("Auto-antibodies destroy red cells", false, "No."), o("Iron deficiency", false, "No."), o("Platelet failure", false, "No."),
    ], ["Which haemoglobin?", "What triggers sickling?", "What happens to flow?", "HbS polymerisation."], "Triggers: infection, dehydration, hypoxia, cold, stress."),
    },
    mgmt: mcq("sc-mx", "management", "Select correct management of this sickle cell crisis with acute chest syndrome.", [
      o("Oxygen to maintain SpO₂ ≥94%, adequate analgesia (paracetamol, NSAID cautiously, morphine IV), warmth, incentive spirometry", true, "Pain and oxygenation."), o("IV fluids at maintenance (avoid overhydration), IV antibiotics covering pneumococcus and atypicals (ceftriaxone ± macrolide)", true, "Treat infection."), o("Simple or exchange transfusion for ACS/severe anaemia/neurological events; consider ICU", true, "Rescue therapy."), o("Long-term: penicillin prophylaxis, pneumococcal vaccines, folic acid, hydroxyurea, malaria prophylaxis, family counselling", true, "Prevention."),
      o("Large saline boluses", false, "Pulmonary oedema risk."), o("Withhold opioids for fear of addiction", false, "Undertreated pain is harmful."),
    ], ["What is the first priority?", "How do you treat pain?", "When do you transfuse?", "Oxygen, analgesia, antibiotics, transfusion."], "Avoid dehydration, cold and hypoxia."),
    consultant: [
      mcq("sc-c1", "consultant", "Name complications of sickle cell disease and their mechanisms (select all).", [
        o("Splenic sequestration / auto-infarction → anaemia and infection risk", true, "Functional asplenia."), o("Acute chest syndrome and stroke from occlusion", true, "Vasculopathy."), o("Dactylitis, osteonecrosis, osteomyelitis", true, "Bone."), o("Priapism, leg ulcers, retinopathy, pigment gallstones", true, "Others."),
      ], ["Which organs sickle?", "Which infection risk?", "Which bone problems?", "All."], "Multi-organ disease."),
      mcq("sc-c2", "pathophysiology", "Why do children with SCD need penicillin prophylaxis and vaccines?", [
        o("Auto-infarcted spleen → loss of clearance of encapsulated bacteria (pneumococcus, Haemophilus)", true, "Functional asplenia."), o("They have no white cells", false, "No."), o("They have too much iron", false, "No."), o("They have thick skin", false, "No."),
      ], ["Which organ clears bacteria?", "Which organisms?", "What prevents infection?", "Functional asplenia."], "Fever in SCD = urgent antibiotics."),
      mcq("sc-c3", "consultant", "What would kill this child?", [
        o("Acute chest syndrome/respiratory failure", true, "Immediate."), o("Overwhelming pneumococcal sepsis", true, "Infection."), o("Stroke and splenic sequestration", true, "Vascular."), o("Aplastic crisis", true, "Marrow."),
      ], ["Think lung, blood, brain.", "Which infection?", "Which neurological event?", "All."], "Know triggers and early warning signs."),
    ],
    chain: { risk: "HbSS, infection, dehydration, hypoxia, cold, poor prophylaxis", patho: "HbS polymerises → sickled RBCs → vaso-occlusion, haemolysis, functional asplenia", symptoms: "Bone pain, chest pain, fever, breathlessness", signs: "Pallor, jaundice, dactylitis, hypoxia, chest signs", ix: "SpO₂, FBC/retics, CXR, cultures, bilirubin/LDH", dx: "Vaso-occlusive crisis with acute chest syndrome", mx: "Oxygen, analgesia, antibiotics, hydration, transfusion, prevention", comp: "Stroke, sepsis, splenic sequestration, chronic organ damage" },
    mustKnow: ["Fever in a child with SCD is an emergency: antibiotics.", "Acute chest syndrome: new infiltrate + fever/hypoxia — treat with oxygen, antibiotics, transfusion.", "Treat pain early and adequately with opioids.", "Avoid dehydration, hypoxia, cold and over-hydration.", "Prevent: penicillin V, pneumococcal vaccine, folic acid, malaria prophylaxis, hydroxyurea.", "Stroke: exchange transfusion.", "Screen with transcranial Doppler."],
    thinkIf: [["Known SCD + fever", "Sepsis until proven otherwise."], ["SCD + chest pain + hypoxia + infiltrate", "Acute chest syndrome."], ["SCD + sudden abdominal swelling + pallor", "Splenic sequestration."]],
    revise: "sickle cell disease",
  },
  {
    id: "pd-asthma", rotation: "paeds", title: "Wheeze and a child too breathless to speak", level: 1, setting: "Casualty", tags: ["asthma", "wheeze", "respiratory distress", "bronchodilators"], emergency: true,
    involved: ["Respiratory"],
    vignette: "A 6-year-old girl with a history of recurrent night cough is rushed in after a cold. She is wheezing loudly, sitting forward and can only say two or three words at a time.",
    hsets: ["paeds"], esets: ["paeds", "abcde"],
    hx: {
      onset: "Cold 2 days; breathlessness and wheeze started overnight, worse this morning.", resp: "Loud wheeze, cough, chest tightness; reliever used 3 times without lasting benefit.", danger: "Cannot complete sentences, drinking little; no convulsions.", fever: "Low-grade fever.", pmh: "Recurrent cough and wheeze since age 2, night symptoms, eczema; two hospital visits last year.", drugs: "Salbutamol inhaler used inconsistently; no inhaled steroid.",
      fam: "Father has asthma; lives with smokers; mould in the house.", imm: "Fully immunised.", birth: "Term.", feed: "Normal.", dev: "Normal.", hiv: "Negative.", neuro: "Alert but anxious.", gi: "Normal.", other: "Eczema.",
    },
    hxKey: ["resp", "pmh", "drugs", "fam", "danger"],
    ex: {
      pgen: "Weight 20 kg. Sitting upright, anxious, speaking in single words. HR 148, RR 44, SpO₂ 90% on room air, temperature 37.8 °C, capillary refill 2 s.", phyd: "Mildly dry.", presp: "Marked accessory muscle use, subcostal and intercostal recession, hyperinflated chest, widespread expiratory and inspiratory wheeze; air entry reduced.",
      pcvs: "Tachycardic, no murmur.", pabd: "Soft.", pneuro: "Alert.", pskin: "Eczematous patches in the flexures; no cyanosis yet.", A: "Patent.", B: "RR 44, SpO₂ 90%, severe wheeze.", C: "HR 148.", D: "Alert.", E: "Afebrile.",
    },
    exKey: ["pgen", "presp", "phyd", "pcvs"],
    ix: [
      { id: "spo2", group: "Bedside", label: "Pulse oximetry (and peak flow if able)", result: "SpO₂ 90% on room air; peak flow cannot be done.", meaning: "SpO₂ <92% = severe/life-threatening asthma.", use: "key" },
      { id: "cxr", group: "Imaging", label: "Chest X-ray (only if pneumothorax/pneumonia suspected)", result: "Hyperinflated lungs, flattened diaphragms, no pneumothorax or consolidation.", meaning: "Typical asthma; excludes complications.", use: "useful" },
      { id: "gas", group: "Blood", label: "Blood gas (if deteriorating)", result: "pH 7.32, PaCO₂ 5.6 kPa (normal/rising), PaO₂ low.", meaning: "A ‘normal’ PaCO₂ in a child working this hard signals fatigue and impending respiratory failure.", use: "key" },
      { id: "glu", group: "Bedside", label: "Blood glucose and potassium (after salbutamol)", result: "Glucose 6.1; K 3.1 (salbutamol effect).", meaning: "Hypokalaemia from β2 agonists.", use: "useful" },
      { id: "abx", group: "Other", label: "Routine antibiotics and sputum culture", result: "Not indicated.", meaning: "", use: "low", note: "Most exacerbations are viral; antibiotics are not routine." },
    ],
    interpret: [mcq("as-i1", "interpretation", "SpO₂ 90%, can’t speak in sentences, HR 148, PaCO₂ 5.6 kPa (normal). How severe is this exacerbation?", [
      o("Life-threatening: hypoxia, exhaustion and a normal PaCO₂ (should be low from hyperventilation) means impending respiratory failure", true, "Intensify treatment and escalate."), o("Mild — observe", false, "No."), o("Moderate — oral steroids only", false, "No."), o("Not asthma", false, "No."),
    ], ["Why is CO₂ normal?", "What does tiredness mean?", "Which criteria are severe?", "Impending failure."], "Silent chest and exhaustion are pre-terminal.", { after: "gas" })],
    ddx: [
      { name: "Acute severe asthma exacerbation (viral trigger)", aliases: ["asthma", "acute asthma", "asthma exacerbation", "severe asthma", "wheeze", "bronchospasm"], tier: "likely", why: "Atopic child with recurrent night cough and widespread wheeze after a cold.", for: ["Atopy, eczema, family history, recurrent episodes", "Wheeze, recession"], against: ["None"], separate: { ask: "Recurrent episodes, atopy", exam: "Wheeze, hyperinflation", ix: "Response to salbutamol" } },
      { name: "Bronchiolitis / viral wheeze", aliases: ["bronchiolitis", "viral wheeze", "viral lrti"], tier: "possible", why: "Wheeze with a cold; bronchiolitis is usually <2 years.", for: ["Wheeze after a cold"], against: ["Age 6, atopy, recurrent"], separate: { ask: "Age, recurrence", exam: "Crackles", ix: "Clinical" } },
      { name: "Foreign body aspiration / pneumonia / pneumothorax", aliases: ["foreign body", "pneumonia", "pneumothorax", "epiglottitis", "croup"], tier: "dangerous", why: "Sudden wheeze or unilateral signs could be a foreign body or pneumothorax.", for: ["Wheeze"], against: ["Bilateral wheeze with history of asthma"], separate: { ask: "Choking event", exam: "Unilateral signs", ix: "CXR" } },
      { name: "Congenital heart disease/heart failure / anaphylaxis", aliases: ["heart failure", "anaphylaxis", "cardiac wheeze"], tier: "possible", why: "Heart failure can cause ‘cardiac asthma’; anaphylaxis can cause wheeze.", for: ["Wheeze"], against: ["No murmur/hepatomegaly/trigger"], separate: { ask: "Allergen exposure", exam: "Urticaria, murmur", ix: "Echo, response to adrenaline" } },
    ],
    event: { when: "after-exam", title: "Tiring", text: "After repeated salbutamol nebulisers she is drowsy, no longer wheezing loudly (silent chest) and her breathing is slowing.", vitals: "SpO₂ 86% on 100% oxygen, RR 20, HR 170, cyanosed.", q: mcq("as-ev", "emergency", "What do you do NOW? (select all)", [
      o("Call senior/PICU team; 100% oxygen, bag–valve–mask support; IV magnesium sulfate 40 mg/kg over 20 min; IV hydrocortisone", true, "Rescue therapy for life-threatening asthma."), o("Continuous salbutamol and ipratropium nebulisers; IV aminophylline/salbutamol infusion as per ICU; prepare for intubation", true, "Escalation."), o("Check for pneumothorax/tension, glucose, electrolytes; consider ventilation", true, "Complications."), o("Reduce oxygen and observe", false, "Fatal."),
    ], ["What does a silent chest mean?", "Which drugs after salbutamol?", "Who must be present?", "Escalate: magnesium, steroids, ventilation."], "Intubating an asthmatic is high-risk: involve experts early.") },
    dx: { q: mcq("as-dx", "pathophysiology", "What is the pathophysiology?", [
      o("Bronchial hyper-reactivity with airway inflammation, smooth-muscle spasm and mucus plugging → airflow obstruction and air-trapping", true, "Reversible obstruction."), o("Fixed airway fibrosis", false, "No."), o("Alveolar collapse", false, "No."), o("Pulmonary oedema", false, "No."),
    ], ["Reversible or fixed?", "What triggers?", "What narrows the airway?", "Bronchospasm + inflammation."], "Inhaled steroids treat the inflammation."),
    },
    mgmt: mcq("as-mx", "management", "Select correct management.", [
      o("Oxygen to SpO₂ ≥94%, back-to-back salbutamol nebulisers/MDI+spacer (2.5–5 mg) ± ipratropium, early systemic steroid (prednisolone 1–2 mg/kg)", true, "Standard severe asthma."), o("Reassess frequently; IV magnesium if no response; avoid sedatives", true, "Escalation."), o("Discharge plan: inhaled steroid (preventer), spacer technique, written action plan, identify triggers (smoke, mould), follow-up", true, "Prevent relapses."), o("Vaccinate, treat eczema/rhinitis, and counsel about smoking in the home", true, "Whole-child care."),
      o("Antibiotics routinely", false, "Not indicated."), o("Long-acting β-agonist alone", false, "Dangerous without steroid."),
    ], ["Which three drugs first?", "How do you prevent relapse?", "What do you avoid?", "Oxygen, salbutamol, steroids; magnesium if needed."], "Check inhaler technique every visit."),
    consultant: [
      mcq("as-c1", "consultant", "List features of life-threatening asthma (select all).", [
        o("Silent chest, cyanosis, poor respiratory effort", true, "Yes."), o("Exhaustion, confusion, drowsiness", true, "Yes."), o("Bradycardia or hypotension", true, "Pre-terminal."), o("Normal PaCO₂ in a distressed child", true, "Fatigue."),
      ], ["Which signs are pre-terminal?", "What does a silent chest mean?", "What does a normal CO₂ mean?", "All four."], "Immediate escalation."),
      mcq("as-c2", "pathophysiology", "Why can salbutamol cause hypokalaemia?", [
        o("β2 stimulation drives potassium into cells via Na⁺/K⁺-ATPase", true, "Shifts K⁺ intracellularly."), o("It increases urinary loss only", false, "No."), o("It blocks potassium channels", false, "No."), o("It destroys potassium", false, "No."),
      ], ["Which receptor?", "Which pump?", "Where does K⁺ go?", "Into cells."], "Monitor K⁺ with repeated doses."),
      mcq("as-c3", "consultant", "What would kill this child and what else worries you?", [
        o("Respiratory failure/arrest", true, "Immediate."), o("Pneumothorax, mucus plug lobar collapse", true, "Complications."), o("Arrhythmia from hypokalaemia/β-agonists", true, "Drug effect."), o("Delay in treatment because of under-recognition", true, "System issue."),
      ], ["ABC.", "Complications of air trapping.", "Drug effects.", "All."], "Teach families an asthma action plan."),
    ],
    chain: { risk: "Atopy, family history, viral infection, smoke/mould exposure, poor preventer use", patho: "Airway inflammation and hyper-reactivity → bronchospasm, oedema, mucus plugging → air trapping", symptoms: "Cough, wheeze, breathlessness, chest tightness", signs: "Wheeze, recession, hyperinflation, tachycardia, hypoxia", ix: "SpO₂, peak flow, CXR if complications, gas if severe", dx: "Acute severe asthma", mx: "Oxygen, salbutamol ± ipratropium, steroids, magnesium, escalate; preventer therapy", comp: "Respiratory failure, pneumothorax, death" },
    mustKnow: ["Asthma severity: speech, SpO₂, heart/respiratory rate, silent chest.", "Oxygen first for hypoxia; salbutamol back-to-back; early steroids.", "Normal CO₂ in a tiring child is dangerous.", "IV magnesium for severe/refractory attacks.", "Always give a preventer (inhaled steroid) and an action plan.", "Avoid triggers; treat smoke exposure.", "Antibiotics are not routine."],
    thinkIf: [["Wheeze + atopy + recurrent night cough", "Asthma."], ["Sudden wheeze after choking", "Foreign body aspiration."], ["Wheeze + hepatomegaly + murmur", "Heart failure."]],
    revise: "asthma",
  },
]
