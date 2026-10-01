import type { CaseDef } from "../types";
import { mcq, o } from "../templates";

export const SURGERY_2: CaseDef[] = [
  {
    id: "sg-foot", rotation: "surgery", title: "A diabetic with a foul-smelling foot and fever", level: 2, setting: "Surgical ward", tags: ["diabetic foot", "necrotising infection", "sepsis", "peripheral vascular disease"], emergency: true,
    involved: ["Endocrine / metabolic", "Infective / immune", "Cardiovascular"],
    vignette: "A 58-year-old woman with 15 years of diabetes presents with a swollen, foul-smelling left foot and fever for 4 days. She stepped on a thorn a week ago and ignored it.",
    hsets: ["core"], esets: ["general", "cvs"],
    hx: {
      onset: "Puncture wound on the sole of the left foot 1 week ago; swelling and discharge for 4 days.", fever: "Fever, rigors and malaise for 3 days.", pmh: "Type 2 diabetes for 15 years, hypertension; known numbness in both feet; poor glycaemic control.", drugs: "Metformin and glibenclamide irregularly; no insulin; amlodipine.",
      swell: "Foot swollen and red up to the ankle.", gu: "Passing urine more than usual.", wt: "Lost weight recently.", smoke: "Smoked for 25 years.", alc: "None.", gi: "Nausea and vomiting today.", neuro: "Drowsy today.", cp: "No chest pain.", fh: "Mother had amputation.",
    },
    hxKey: ["pmh", "onset", "fever", "drugs", "smoke", "gu"],
    ex: {
      vit: "BP 96/58, pulse 124/min, RR 26/min, SpO₂ 95%, temperature 39.1 °C, capillary glucose 24 mmol/L.", hydr: "Dehydrated.", pulse: "124/min, regular.", oed: "Left foot and ankle oedema.",
      sacral: "Left dorsalis pedis and posterior tibial pulses absent; right foot pulses weak; both feet cool; loss of hair; monofilament sensation absent bilaterally; reduced ankle reflexes.", hands: "Normal.", apex: "Normal.", hs: "Normal.", bases: "Clear.",
    },
    exKey: ["vit", "sacral", "hydr"],
    exExtra: [{ id: "foot", group: "Local examination", label: "Examine the foot and wound", def: "Plantar ulcer 3 × 3 cm with foul pus and a probe-to-bone positive sinus; surrounding cellulitis spreading to the ankle with crepitus over the dorsum and a black, necrotic forefoot; blisters and dusky skin; foul smell.", looking: "Probe-to-bone = osteomyelitis; crepitus and black skin = gas-forming necrotising infection (surgical emergency)." }],
    ix: [
      { id: "glu", group: "Bedside", label: "Glucose, ketones, gas, U&E, lactate", result: "Glucose 24 mmol/L; urine ketones 1+; pH 7.30, lactate 4.8; Na 130, K 4.4, creatinine 156 µmol/L.", meaning: "Hyperglycaemia with sepsis; AKI; early lactic acidosis.", use: "key" },
      { id: "fbc", group: "Blood", label: "FBC, CRP, blood cultures, wound swab/tissue culture", result: "WBC 26 (neutrophilia), CRP 310; blood cultures positive for Staphylococcus aureus and Gram-negative rods; HbA1c 12%.", meaning: "Sepsis from a polymicrobial diabetic foot infection.", use: "key" },
      { id: "xray", group: "Imaging", label: "Foot X-ray", result: "Soft-tissue gas in the forefoot; periosteal reaction and bone destruction of the 4th metatarsal.", meaning: "Gas gangrene/necrotising infection with osteomyelitis.", use: "key" },
      { id: "doppler", group: "Imaging", label: "Arterial Doppler / ankle-brachial index", result: "ABI 0.5 on the left (severe ischaemia).", meaning: "Peripheral arterial disease limits healing — assess for revascularisation.", use: "useful" },
      { id: "mri", group: "Imaging", label: "MRI foot", result: "Not done.", meaning: "", use: "low", note: "Clinical + X-ray are enough; surgery is urgent." },
    ],
    interpret: [mcq("df-i1", "interpretation", "Foul wound with crepitus, black skin, fever 39.1, BP 96/58, glucose 24, lactate 4.8, gas on X-ray, ABI 0.5. What does this tell you?", [
      o("Limb- and life-threatening diabetic foot sepsis (necrotising soft-tissue infection ± osteomyelitis) on a background of neuropathy and ischaemia — needs urgent resuscitation and surgical debridement", true, "Sepsis source control."), o("Simple cellulitis — oral antibiotics", false, "No."), o("Chronic neuropathic ulcer needing dressings", false, "No."), o("Gout", false, "No."),
    ], ["Which findings mean necrosis?", "Is there systemic sepsis?", "What is the treatment of the source?", "Necrotising foot sepsis."], "Neuropathy + ischaemia + infection = the diabetic foot triad.", { after: "xray" })],
    ddx: [
      { name: "Diabetic foot infection with necrotising soft-tissue infection/wet gangrene and osteomyelitis; sepsis", aliases: ["diabetic foot", "diabetic foot infection", "necrotising fasciitis", "gas gangrene", "gangrene", "osteomyelitis", "cellulitis", "sepsis"], tier: "likely", why: "Neuropathic puncture wound, ischaemic foot, uncontrolled diabetes and systemic sepsis.", for: ["Probe-to-bone, crepitus, black skin, gas on X-ray, sepsis"], against: ["None"], separate: { ask: "Wound history", exam: "Probe, crepitus, pulses", ix: "X-ray, cultures, ABI" } },
      { name: "Charcot neuroarthropathy / deep vein thrombosis / gout", aliases: ["charcot", "dvt", "gout", "venous thrombosis"], tier: "possible", why: "Other causes of a hot swollen foot in a diabetic.", for: ["Swollen foot"], against: ["Foul wound, necrosis"], separate: { ask: "Trauma, calf pain", exam: "Wound, calf tenderness", ix: "X-ray, Doppler" } },
      { name: "Diabetic ketoacidosis / HHS (decompensation)", aliases: ["dka", "hhs", "hyperosmolar", "ketoacidosis"], tier: "dangerous", why: "Sepsis can precipitate hyperglycaemic crises.", for: ["Glucose 24, drowsy"], against: ["Mild ketosis, pH 7.30"], separate: { ask: "Polyuria, vomiting", exam: "Dehydration", ix: "Ketones, gas, osmolality" } },
      { name: "Critical limb ischaemia with dry gangrene", aliases: ["critical limb ischaemia", "peripheral arterial disease", "pad", "dry gangrene"], tier: "possible", why: "Absent pulses and cold feet.", for: ["Absent pulses"], against: ["Wet gangrene with infection"], separate: { ask: "Rest pain, claudication", exam: "Pulses, capillary refill", ix: "ABI, angiography" } },
    ],
    event: { when: "after-exam", title: "Septic shock", text: "While assessing her she becomes drowsy; BP falls and she is hypoxic with mottled skin.", vitals: "BP 72/40, pulse 142, RR 34, SpO₂ 90%, lactate 8.", q: mcq("df-ev", "emergency", "What do you do NOW? (select all)", [
      o("Sepsis bundle within 1 hour: oxygen, two IV lines, IV crystalloid 30 mL/kg, blood cultures then IV broad-spectrum antibiotics (e.g. piperacillin–tazobactam ± vancomycin/clindamycin), lactate", true, "Early antibiotics and fluids."), o("Vasopressor (noradrenaline) if hypotension persists; ICU/HDU", true, "Septic shock."), o("Insulin infusion for hyperglycaemia and monitor K⁺; treat the AKI", true, "Metabolic control."), o("Urgent surgical debridement/amputation (source control) after initial resuscitation", true, "Definitive source control."),
    ], ["Which shock?", "How quickly do antibiotics start?", "What stops the infection?", "Sepsis bundle + surgery."], "Source control saves lives.") },
    dx: { q: mcq("df-dx", "pathophysiology", "What is the pathophysiology of the diabetic foot?", [
      o("Neuropathy (loss of protective sensation, autonomic dryness), ischaemia (macro- and microvascular disease) and impaired immunity → unnoticed trauma → deep infection", true, "The triad."), o("Autoimmune joint disease", false, "No."), o("Venous insufficiency only", false, "No."), o("Primary skin disease", false, "No."),
    ], ["Which three factors?", "Why did she not feel the thorn?", "Why does it not heal?", "Neuropathy, ischaemia, infection."], "Prevention: foot care, footwear, regular checks."),
    },
    mgmt: mcq("df-mx", "management", "Select correct management.", [
      o("Resuscitate, IV broad-spectrum antibiotics (cover Gram-positives, Gram-negatives and anaerobes), glycaemic control with insulin", true, "Sepsis care."), o("Urgent surgical debridement ± amputation (e.g. below-knee) for necrotising infection; vascular assessment/revascularisation if limb salvage", true, "Source control."), o("Offloading, wound care, nutrition, treat osteomyelitis (6 weeks antibiotics if bone retained)", true, "Healing."), o("Long-term: HbA1c control, smoking cessation, foot-care education, regular surveillance, treat hypertension/lipids", true, "Prevention."),
      o("Daily dressing changes at home and review in 2 weeks", false, "Dangerous."), o("Oral antibiotics only", false, "Insufficient."),
    ], ["What controls the source?", "What controls the glucose?", "What prevents recurrence?", "Antibiotics, surgery, insulin, education."], "Multidisciplinary diabetic foot team improves outcomes."),
    consultant: [
      mcq("df-c1", "consultant", "List the components of a diabetic foot examination (select all).", [
        o("Inspection for deformity, ulcers, callus and skin colour", true, "Yes."), o("Pulses and capillary refill (ischaemia)", true, "Yes."), o("Monofilament/vibration testing (neuropathy)", true, "Yes."), o("Footwear assessment", true, "Yes."),
      ], ["Skin.", "Blood.", "Nerves.", "Shoes."], "Annual foot screening for all diabetics."),
      mcq("df-c2", "pathophysiology", "Why do diabetics heal poorly and get infections?", [
        o("Hyperglycaemia impairs leucocyte function; microvascular disease reduces perfusion; neuropathy hides injury", true, "Multifactorial."), o("They have more white cells", false, "No."), o("They do not bleed", false, "No."), o("They have thicker skin", false, "No."),
      ], ["Which cells?", "Which vessels?", "Which nerves?", "All three."], "Glycaemic control improves outcomes."),
      mcq("df-c3", "consultant", "What would kill this patient?", [
        o("Septic shock from necrotising infection", true, "Immediate."), o("Hyperglycaemic crisis/AKI", true, "Metabolic."), o("Myocardial infarction (silent in diabetics)", true, "Cardiac risk."), o("Delay in amputation", true, "Source control."),
      ], ["Think sepsis.", "Think metabolic.", "Think heart.", "All."], "Diabetic foot disease is the commonest cause of non-traumatic amputation."),
    ],
    chain: { risk: "Long-standing poorly controlled diabetes, neuropathy, PAD, smoking", patho: "Neuropathy + ischaemia → unnoticed wound → deep polymicrobial infection → necrosis, osteomyelitis, sepsis", symptoms: "Foul wound, swelling, fever", signs: "Ulcer, probe-to-bone, crepitus, black skin, absent pulses, sepsis", ix: "Glucose/gas, FBC/CRP/cultures, X-ray (gas/bone), ABI", dx: "Diabetic foot sepsis with necrotising infection and osteomyelitis", mx: "Sepsis bundle, antibiotics, insulin, debridement/amputation, vascular review", comp: "Septic shock, amputation, AKI, death" },
    mustKnow: ["Diabetic foot = neuropathy + ischaemia + infection.", "Probe-to-bone positive suggests osteomyelitis.", "Gas/crepitus/black skin = surgical emergency.", "Start broad-spectrum antibiotics early; insulin for glucose.", "Assess perfusion: pulses, ABI.", "Prevent with foot care and footwear.", "Smoking cessation and glycaemic control."],
    thinkIf: [["Diabetic + foot wound + fever", "Diabetic foot infection/sepsis."], ["Black skin + crepitus + pain out of proportion", "Necrotising infection."], ["Cold pale foot + absent pulses + rest pain", "Critical limb ischaemia."]],
    revise: "diabetic foot",
  },
  {
    id: "sg-burn", rotation: "surgery", title: "A child pulled a pot of boiling water over himself", level: 2, setting: "Casualty", tags: ["burns", "fluid resuscitation", "airway", "paediatric trauma"], emergency: true,
    involved: ["Musculoskeletal / trauma", "Respiratory", "Cardiovascular"],
    vignette: "A 3-year-old boy (weighing 14 kg) is brought in 30 minutes after pulling a pot of boiling water from a stove. He is crying, with blistered skin on his face, chest, abdomen and left arm.",
    hsets: ["paeds"], esets: ["paeds", "abcde"],
    hx: {
      onset: "Scald from boiling water 30 minutes ago; mother poured cold water on it immediately.", danger: "Crying; drinking; no loss of consciousness.", resp: "Hoarse cry; no difficulty yet; no smoke exposure (scald).", pmh: "Healthy; immunisation complete (tetanus covered).", birth: "Term.", feed: "Normal.", dev: "Normal.", fam: "Open fire/stove in a one-room house; the pot was on the floor. Mother worried about safeguarding questions.",
      drugs: "None.", hiv: "Negative.", imm: "Fully immunised including tetanus.", fever: "None.", gi: "Normal.", neuro: "Alert, crying.", other: "No other injuries noticed.",
    },
    hxKey: ["onset", "resp", "imm", "fam", "danger"],
    ex: {
      pgen: "Weight 14 kg. Crying, alert, distressed. HR 150, RR 34, SpO₂ 97%, temperature 36.0 °C, capillary refill 2 s.", phyd: "Not yet dehydrated.", presp: "Hoarse cry, mild stridor; singeing around the mouth; no soot; chest clear.", pcvs: "Tachycardia from pain.", pabd: "Soft.", pneuro: "Alert.",
      pskin: "Partial-thickness (blistered, moist, painful) burns to the face (part), anterior chest and abdomen, and the entire left arm: estimated 25% total body surface area (TBSA) using the paediatric Lund–Browder chart; no circumferential full-thickness burns.", A: "Hoarse, mild stridor — risk of airway oedema.", B: "RR 34, SpO₂ 97%.", C: "HR 150, CRT 2 s.", D: "Alert.", E: "25% TBSA partial thickness burns; keep warm.",
    },
    exKey: ["pgen", "presp", "pskin", "A"],
    ix: [
      { id: "tbsa", group: "Bedside", label: "Estimate TBSA with the Lund–Browder chart and depth", result: "25% TBSA partial-thickness (superficial dermal to deep dermal) burns.", meaning: "Burns >10% TBSA in a child need IV fluid resuscitation and admission.", use: "key" },
      { id: "gas", group: "Blood", label: "Blood glucose, U&E, FBC, group & save, blood gas/carboxyhaemoglobin", result: "Glucose 6.2, Hb 12.4, Na 136, K 4.5; COHb 3%.", meaning: "Baseline; carboxyhaemoglobin low (no smoke inhalation).", use: "useful" },
      { id: "bronch", group: "Other", label: "Laryngoscopy/bronchoscopy to assess the airway", result: "Oedematous, erythematous vocal cords and supraglottic oedema with no soot.", meaning: "Impending airway oedema — consider early intubation.", use: "key" },
      { id: "xray", group: "Imaging", label: "Chest X-ray", result: "Normal.", meaning: "No inhalational injury yet.", use: "useful" },
      { id: "swab", group: "Microbiology", label: "Routine wound swabs and prophylactic IV antibiotics", result: "Not indicated.", meaning: "", use: "low", note: "Prophylactic antibiotics are not recommended for burns; use topical antimicrobials and monitor for infection." },
    ],
    interpret: [mcq("bu-i1", "interpretation", "Hoarse cry, stridor, singed perioral skin and supraglottic oedema in a child with burns to the face and chest. What is the priority?", [
      o("Secure the airway early (anticipate swelling) — urgent senior anaesthetic review and intubation before oedema obstructs it", true, "Airway burn swelling progresses over hours."), o("Start fluids and wait", false, "Airway first."), o("Give antibiotics", false, "Not indicated."), o("Apply creams only", false, "No."),
    ], ["Which of the ABCs is threatened?", "What happens to oedema over hours?", "How easy is a late airway?", "Early intubation."], "In burns, A comes before fluids.", { after: "bronch" })],
    ddx: [
      { name: "Partial-thickness scald burn 25% TBSA with airway involvement", aliases: ["burns", "scald", "scald burn", "partial thickness burn", "thermal injury", "burn injury"], tier: "likely", why: "Boiling water scald with blisters, painful, over 25% TBSA and facial involvement.", for: ["Mechanism, blistered painful skin, face involved, hoarse"], against: ["None"], separate: { ask: "Mechanism, enclosed space", exam: "Burn depth/TBSA, airway", ix: "TBSA chart, laryngoscopy" } },
      { name: "Inhalation injury / carbon monoxide poisoning", aliases: ["inhalation injury", "carbon monoxide", "smoke inhalation", "co poisoning"], tier: "dangerous", why: "Burns in an enclosed space can cause airway burns and CO poisoning.", for: ["Hoarseness"], against: ["Scald, no smoke, COHb 3%"], separate: { ask: "Smoke exposure", exam: "Soot in nose/mouth", ix: "COHb, bronchoscopy" } },
      { name: "Non-accidental injury / neglect", aliases: ["non accidental injury", "child abuse", "nai", "neglect", "safeguarding"], tier: "possible", why: "Always consider the story vs the pattern: stocking/glove burns, patterned burns.", for: ["Young child"], against: ["Consistent history with splash pattern"], separate: { ask: "Consistency of the story, delay", exam: "Patterned scalds, other injuries", ix: "Skeletal survey if concerned" } },
      { name: "Staphylococcal scalded skin / toxic epidermal necrolysis / chemical burns", aliases: ["ssss", "scalded skin", "ten", "stevens johnson", "chemical burn"], tier: "possible", why: "Other causes of blistering and skin loss.", for: ["Blisters"], against: ["Acute scald history"], separate: { ask: "Fever, drugs", exam: "Nikolsky sign", ix: "Cultures" } },
    ],
    event: { when: "after-exam", title: "Airway closing", text: "While you are preparing the burn dressings his voice becomes muffled, stridor worsens and he is drooling and tiring.", vitals: "SpO₂ 90% and falling, RR 44, HR 168.", q: mcq("bu-ev", "emergency", "What do you do NOW? (select all)", [
      o("Call anaesthetist/ENT; 100% oxygen; prepare for immediate intubation (small tube sizes available), surgical airway if intubation fails", true, "Airway obstruction is imminent."), o("Keep him calm and upright; avoid distressing him; do not attempt unnecessary examination", true, "Reduce oxygen consumption."), o("Establish IV access and give analgesia/sedation per anaesthetist", true, "Prepare."), o("Wait for arterial gas", false, "Delay."),
    ], ["What is closing?", "Who should do the airway?", "What if it fails?", "Intubate early; surgical airway."], "Burn oedema peaks at 24–48 hours.") },
    dx: { q: mcq("bu-dx", "pathophysiology", "What is the pathophysiology of burn shock?", [
      o("Inflammatory mediators increase capillary permeability → fluid and protein move out of vessels (oedema) → hypovolaemia (burn shock) peaking at 24–48 hours in burns >10–15% TBSA in children", true, "Major fluid shifts."), o("Blood is lost from the burn surface only", false, "No."), o("Cardiac failure", false, "No."), o("Sepsis in the first hour", false, "No."),
    ], ["What happens to capillaries?", "Where does fluid go?", "Which burn size needs IV fluids?", "Capillary leak."], "Reduce loss with early adequate fluids."),
    },
    mgmt: mcq("bu-mx", "management", "Select correct management.", [
      o("Stop the burning process (cool with running water 20 min, remove clothing/jewellery), airway management (early intubation), oxygen, analgesia (IV opioid)", true, "Initial care."), o("Fluid resuscitation using Parkland/Advanced Burn Life Support: 3–4 mL × kg × %TBSA over 24 h (half in first 8 h) as Ringer’s lactate + maintenance with dextrose in children; titrate to urine output 1 mL/kg/h", true, "Burn fluids."), o("Wound care: clean, debride blisters as needed, topical antimicrobial (silver sulfadiazine) or non-adherent dressings, tetanus prophylaxis, early excision/grafting for deep burns", true, "Skin care."), o("Nutrition (early enteral feeds), temperature control, pressure/contracture prevention, psychosocial support, home safety and prevention counselling", true, "Recovery and prevention."),
      o("Apply butter or toothpaste", false, "Harmful."), o("Give prophylactic antibiotics", false, "Not indicated."),
    ], ["What do you do first?", "How much fluid?", "What do you avoid?", "Cool, airway, fluids, wound care."], "Calculate fluids from the time of injury."),
    consultant: [
      mcq("bu-c1", "consultant", "How do you estimate TBSA and depth (select all)?", [
        o("Lund–Browder chart in children (head is a larger percentage); rule of nines in adults; palm = 1%", true, "Accurate assessment."), o("Depth: superficial (red, painful), partial (blisters, moist, painful), full-thickness (white/leathery, painless)", true, "Burn depth."), o("Reassess after 24–48 h as burns evolve", true, "They deepen."), o("Count only the blisters", false, "No."),
      ], ["Which chart for children?", "Which sign for depth?", "Do burns change?", "First three."], "Children lose heat and fluid faster."),
      mcq("bu-c2", "pathophysiology", "Why must urine output be monitored and what is the target?", [
        o("It is the best bedside marker of resuscitation adequacy: 1 mL/kg/h in children (0.5 in adults); over- and under-resuscitation are both harmful", true, "Titrate fluids."), o("It has no value", false, "No."), o("It measures burn depth", false, "No."), o("It measures pain", false, "No."),
      ], ["Which organ reflects perfusion?", "What volume?", "Why not give too much?", "Urine output."], "Over-resuscitation causes compartment syndrome and oedema."),
      mcq("bu-c3", "consultant", "What would kill or harm this child?", [
        o("Airway obstruction", true, "Immediate."), o("Burn shock and hypothermia", true, "Early."), o("Sepsis (late) and multi-organ failure", true, "Later."), o("Contractures and psychological trauma", true, "Long term."),
      ], ["Think hours, days, weeks.", "Heat loss.", "Infection.", "All."], "Prevention: safe cooking and storing hot liquids."),
    ],
    chain: { risk: "Open stove, cooking at floor level, young child", patho: "Thermal injury → coagulative necrosis; mediators → capillary leak → oedema and hypovolaemia; airway oedema", symptoms: "Pain, blistering, hoarseness", signs: "Partial-thickness burns 25% TBSA, perioral singeing, stridor", ix: "TBSA/depth, airway assessment, U&E/glucose, COHb", dx: "25% TBSA scald with airway involvement", mx: "Airway first, cool, analgesia, Parkland fluids, wound care, tetanus, nutrition", comp: "Airway obstruction, burn shock, sepsis, contractures" },
    mustKnow: ["Airway first in burns of the face/neck/inhalation.", "Cool with running water for 20 minutes; do not use ice.", "Burns >10% TBSA in children need IV fluids (Parkland formula).", "Target urine output 1 mL/kg/h in children.", "No prophylactic antibiotics.", "Give tetanus prophylaxis and adequate analgesia.", "Consider non-accidental injury and prevention."],
    thinkIf: [["Burns + hoarse voice + facial singeing", "Airway burn — intubate early."], ["Enclosed-space fire + headache/confusion", "Carbon monoxide poisoning."], ["Patterned scald in a child with delay in presentation", "Non-accidental injury."]],
    revise: "burns",
  },
  {
    id: "sg-breast", rotation: "surgery", title: "A painless breast lump in a 45-year-old", level: 2, setting: "Surgical outpatient clinic", tags: ["breast cancer", "triple assessment", "oncology", "metastases"],
    involved: ["Musculoskeletal / trauma", "Haematological", "Obstetric / gynaecological"],
    vignette: "A 45-year-old woman, a mother of four, presents with a painless lump in her left breast for four months. She has also noticed that the skin looks like orange peel and her nipple has turned inward.",
    hsets: ["core"], esets: ["general", "resp", "abd"],
    hx: {
      onset: "Lump noticed 4 months ago, growing; painless.", wt: "Lost 5 kg in 3 months; poor appetite.", cp: "Dull bone pain in the back for 2 weeks.", sob: "Mild cough, no breathlessness.", fh: "Mother died of breast cancer at 52.", pmh: "No chronic illness; menarche at 11, first child at 27, no breastfeeding for more than 3 months, uses injectable contraception for 10 years.",
      drugs: "Depo-Provera; no HRT.", smoke: "None.", alc: "Social.", gi: "Normal.", neuro: "No headache.", gu: "Normal.", sex: "Not at risk.",
    },
    hxKey: ["onset", "wt", "fh", "cp", "pmh"],
    ex: {
      vit: "BP 124/78, pulse 88, RR 18, SpO₂ 96%, temperature 36.8 °C, weight 56 kg.", nodes: "Hard, fixed 2 cm left axillary lymph nodes; palpable hard left supraclavicular node.", nutr: "Mild weight loss.", face: "Pale.", hands: "Normal.",
      breath: "Dullness at the right base with reduced breath sounds (effusion).", liv: "Hard nodular liver edge 3 cm below the costal margin.", abdp: "Non-tender.", chest: "Dullness at right base.",
    },
    exKey: ["vit", "nodes", "liv"],
    exExtra: [{ id: "breast", group: "Breast examination", label: "Inspect and palpate both breasts and axillae", def: "Left breast: hard 5 × 4 cm irregular lump in the upper outer quadrant, fixed to skin with peau d’orange and nipple retraction, fixed to the underlying pectoral fascia; no discharge. Right breast normal.", looking: "Hard, irregular, fixed lump with skin tethering/peau d’orange/nipple retraction suggests carcinoma." }],
    ix: [
      { id: "us", group: "Imaging", label: "Breast ultrasound ± mammography (triple assessment)", result: "Irregular hypoechoic 5 cm mass with posterior shadowing and enlarged axillary nodes (BI-RADS 5).", meaning: "Highly suspicious for malignancy.", use: "key" },
      { id: "core", group: "Pathology", label: "Core needle biopsy with ER/PR/HER2", result: "Invasive ductal carcinoma grade 3; ER-positive, PR-positive, HER2-negative; Ki-67 40%.", meaning: "Hormone-receptor-positive breast cancer.", use: "key" },
      { id: "stage", group: "Imaging", label: "Staging: chest X-ray/CT chest, abdominal ultrasound/CT, bone scan", result: "Right pleural effusion, multiple liver metastases, and sclerotic lesions in the spine and ribs.", meaning: "Stage IV (metastatic) disease — liver, lung/pleura, bone.", use: "key" },
      { id: "lab", group: "Blood", label: "FBC, LFTs, calcium, ALP", result: "Hb 10.4, ALP 480, calcium 2.9 mmol/L (high), albumin 33.", meaning: "Bone metastases with hypercalcaemia.", use: "useful" },
      { id: "excision", group: "Pathology", label: "Excision biopsy of the lump first", result: "Not done.", meaning: "", use: "low", note: "Excision biopsy before core biopsy can disrupt planning. Do triple assessment (clinical, imaging, core biopsy) first." },
    ],
    interpret: [mcq("br-i1", "interpretation", "Core biopsy: invasive ductal carcinoma, ER/PR+, HER2−. Staging shows lung/pleura, liver and bone metastases and hypercalcaemia. What is the stage and goal of treatment?", [
      o("Stage IV (metastatic) breast cancer — treatment is palliative/disease-controlling: endocrine therapy ± CDK4/6 inhibitor, bone-targeted therapy and symptom control", true, "Hormone-receptor-positive, so endocrine therapy is first-line."), o("Early breast cancer — curative mastectomy", false, "Metastatic disease."), o("Benign fibroadenoma", false, "No."), o("Phyllodes tumour", false, "No."),
    ], ["Where has it spread?", "What does ER positivity allow?", "Curative or palliative?", "Stage IV."], "Palliative care and psychosocial support from day one.", { after: "stage" })],
    ddx: [
      { name: "Locally advanced breast carcinoma with distant metastases (liver, lung/pleura, bone)", aliases: ["breast cancer", "breast carcinoma", "carcinoma of the breast", "invasive ductal carcinoma", "metastatic breast cancer", "malignancy"], tier: "likely", why: "Hard, fixed, irregular lump with peau d’orange, nipple retraction, hard nodes, weight loss and bone pain.", for: ["Hard fixed lump, skin and nipple changes, nodes, weight loss, bone pain, hepatomegaly"], against: ["None"], separate: { ask: "Duration, growth, family history", exam: "Characteristics, nodes", ix: "Triple assessment" } },
      { name: "Fibroadenoma / fibrocystic change / cyst", aliases: ["fibroadenoma", "cyst", "fibrocystic", "benign breast disease"], tier: "possible", why: "Common benign lumps at younger ages, usually mobile and smooth.", for: ["Lump"], against: ["Age, hard fixed irregular, skin changes"], separate: { ask: "Cyclical pain, mobility", exam: "Smooth, mobile ‘breast mouse’", ix: "Ultrasound, FNA" } },
      { name: "Breast abscess / mastitis / fat necrosis", aliases: ["abscess", "mastitis", "fat necrosis", "breast infection"], tier: "possible", why: "Inflammatory lumps with erythema; painless here.", for: ["Skin changes"], against: ["Painless, no fever"], separate: { ask: "Pain, fever, trauma", exam: "Warmth, fluctuance", ix: "Ultrasound, aspirate" } },
      { name: "Inflammatory breast cancer / Paget’s disease / lymphoma / phyllodes tumour", aliases: ["inflammatory breast cancer", "paget", "lymphoma", "phyllodes"], tier: "possible", why: "Other malignant breast conditions.", for: ["Skin changes"], against: ["Discrete mass, hormone receptor positive"], separate: { ask: "Rapid onset, nipple eczema", exam: "Erythema, nipple", ix: "Biopsy, skin punch" } },
    ],
    twist: { text: "Her calcium is 3.2 mmol/L and she is now confused, constipated and vomiting, with a short QT on ECG.", q: mcq("br-tw", "emergency", "What is the emergency and what do you do?", [
      o("Hypercalcaemia of malignancy (bone metastases): rehydrate with IV saline, give IV bisphosphonate (zoledronic acid), consider calcitonin and treat the cancer", true, "Life-threatening metabolic complication."), o("Panic disorder: reassure", false, "No."), o("Start calcium supplements", false, "Contraindicated."), o("Give thiazide diuretics", false, "Raises calcium."),
    ], ["What is the number telling you?", "Which fluid first?", "Which drug class lowers calcium?", "Saline and bisphosphonate."], "‘Stones, bones, groans and psychic moans’.") },
    dx: { q: mcq("br-dx", "pathophysiology", "How does breast cancer spread?", [
      o("Local invasion, lymphatic spread to axillary/supraclavicular nodes, and haematogenous spread to bone, lung, liver and brain", true, "Typical sites."), o("Only through the nipple", false, "No."), o("Only to nearby muscle", false, "No."), o("By inhalation", false, "No."),
    ], ["Which nodes first?", "Which organs?", "Why bone?", "Lymphatic and haematogenous."], "Hormone receptor status guides therapy."),
    },
    mgmt: mcq("br-mx", "management", "Select correct management of this stage IV hormone-receptor-positive cancer.", [
      o("Multidisciplinary approach: endocrine therapy (e.g. letrozole/tamoxifen ± CDK4/6 inhibitor), bone-modifying agents (bisphosphonate/denosumab) and symptom control", true, "First-line for ER+ metastatic disease."), o("Pleural drainage/pleurodesis for symptomatic effusion; analgesia and palliative radiotherapy for painful bone metastases", true, "Palliation."), o("Treat hypercalcaemia, nutrition and psychosocial support; palliative care referral; genetic counselling for family", true, "Whole-person care."), o("In early disease: surgery (mastectomy/breast-conserving + axillary surgery), radiotherapy, adjuvant systemic therapy; screening and breast awareness", true, "Context for early disease."),
      o("Mastectomy alone for cure", false, "Not for metastatic disease."), o("Reassure and review in 6 months", false, "Dangerous."),
    ], ["Stage?", "Which receptor guides therapy?", "How do you protect bone?", "Endocrine, bone agents, palliation."], "Late presentation is the norm in many settings: encourage early detection."),
    consultant: [
      mcq("br-c1", "consultant", "What is ‘triple assessment’ (select all)?", [
        o("Clinical examination", true, "Part 1."), o("Imaging (ultrasound ± mammography)", true, "Part 2."), o("Pathology (core biopsy or FNA)", true, "Part 3."), o("Excision of the lump first", false, "No."),
      ], ["Three parts.", "Which comes last?", "Which avoids damage?", "First three."], "All three agree before treatment."),
      mcq("br-c2", "pathophysiology", "What features suggest malignancy on examination (select all)?", [
        o("Hard, irregular, fixed lump", true, "Yes."), o("Peau d’orange, nipple retraction, skin dimpling", true, "Ligament and lymphatic involvement."), o("Axillary/supraclavicular lymphadenopathy", true, "Spread."), o("Smooth mobile lump", false, "Typical of fibroadenoma."),
      ], ["Texture.", "Skin.", "Nodes.", "First three."], "Peau d’orange = lymphatic obstruction."),
      mcq("br-c3", "consultant", "What are risk factors for breast cancer?", [
        o("Female sex, age, family history/BRCA mutation, early menarche/late menopause, nulliparity/late first birth, hormonal exposure, obesity, alcohol", true, "Established risk factors."), o("Wearing a bra", false, "No."), o("Antiperspirants", false, "No."), o("Breastfeeding (it is protective)", false, "Protective."),
      ], ["Hormones.", "Genes.", "Lifestyle.", "First."], "Counsel on risk and screening."),
    ],
    chain: { risk: "Family history, hormonal exposure, age, obesity, alcohol", patho: "Ductal epithelial transformation → invasion → lymphatic and haematogenous spread (bone, lung, liver)", symptoms: "Painless lump, skin changes, weight loss, bone pain", signs: "Hard fixed lump, peau d’orange, nipple retraction, nodes, hepatomegaly, effusion", ix: "Triple assessment; staging CT/bone scan; calcium/ALP", dx: "Stage IV breast cancer (ER/PR+, HER2−)", mx: "Endocrine ± CDK4/6, bone agents, palliative measures, MDT", comp: "Hypercalcaemia, pathological fractures, effusions, liver failure" },
    mustKnow: ["Any breast lump needs triple assessment.", "Hard, fixed, irregular + peau d’orange + nodes = cancer.", "Do not excise before core biopsy.", "ER/PR/HER2 status determines therapy.", "Bone metastases → hypercalcaemia: treat with fluids and bisphosphonate.", "Late presentation: early detection saves lives.", "Palliative care is part of every plan."],
    thinkIf: [["Painless hard breast lump + nodes + weight loss", "Breast cancer with metastases."], ["Mobile smooth ‘breast mouse’ in a young woman", "Fibroadenoma."], ["Painful red breast + fever + lactating", "Mastitis/abscess."]],
    revise: "breast cancer",
  },
]
