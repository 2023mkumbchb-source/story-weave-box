import type { CaseDef } from "../types";
import { mcq, o } from "../templates";

export const OBGYN_1: CaseDef[] = [
  {
    id: "ob-pe", rotation: "obgyn", title: "Headache and swollen feet at 36 weeks", level: 2, setting: "Antenatal ward", tags: ["pre-eclampsia", "eclampsia", "hypertension in pregnancy", "magnesium sulfate"], emergency: true,
    involved: ["Obstetric / gynaecological", "Cardiovascular", "Renal / urinary", "Neurological"],
    vignette: "A 22-year-old primigravida at 36 weeks’ gestation attends the antenatal clinic complaining of a worsening headache for two days and swelling of her face and feet. She has missed her last two antenatal visits.",
    hsets: ["obs"], esets: ["general", "obs", "abcde"],
    hx: {
      onset: "Headache for 2 days, getting worse; swelling for a week.", gp: "G1 P0, 36 weeks.", lnmp: "LNMP 6 months ago; EDD in four weeks; fundal height consistent.", anc: "Attended twice only; BP was ‘slightly high’ at the last visit but no action; urine not tested; Hb 10.8.",
      htn: "Severe frontal headache not relieved by paracetamol, blurred vision, epigastric pain for a day.", fm: "Fetal movements present, slightly reduced today.", bleed: "No vaginal bleeding.", leak: "No leakage of fluid.", contr: "No contractions.", fever: "None.", pmh: "No hypertension or diabetes before pregnancy.",
      prevob: "First pregnancy.", drugs: "Iron tablets only.", social: "Lives 20 km from the hospital; works as a hair stylist.", gyn: "Regular cycles previously.",
    },
    hxKey: ["htn", "anc", "fm", "bleed", "gp", "lnmp", "contr"],
    ex: {
      vit: "BP 172/112 mmHg (repeat 168/110), pulse 98/min, RR 22/min, SpO₂ 97%, temperature 36.9 °C, urine protein 3+ on dipstick.", face: "Puffy face.", oed: "Pitting oedema of both legs to the thighs and puffy hands.", ofh: "Fundal height 33 cm (small for dates).", olie: "Longitudinal lie, cephalic, 3/5 palpable.", ofhr: "Fetal heart 156/min, regular.", ouid: "Uterus soft and non-tender; no contractions.", ove: "Not performed.",
      oref: "Brisk reflexes with 3 beats of clonus at both ankles; epigastric tenderness.", neck: "JVP not elevated.", A: "Patent.", B: "RR 22, clear chest.", C: "BP 172/112, HR 98.", D: "Alert but anxious.", E: "Oedema.", pulse: "98/min.",
    },
    exKey: ["vit", "oref", "ofhr", "ofh", "ouid", "oed"],
    ix: [
      { id: "urine", group: "Bedside", label: "Urine dipstick / protein:creatinine ratio", result: "Protein 3+; PCR 90 mg/mmol (significant proteinuria is >30 mg/mmol).", meaning: "Hypertension + proteinuria after 20 weeks = pre-eclampsia.", use: "key" },
      { id: "fbc", group: "Blood", label: "FBC, platelets", result: "Hb 10.2, platelets 82 ×10⁹/L (low).", meaning: "Thrombocytopenia suggests severe disease (HELLP).", use: "key" },
      { id: "lft", group: "Blood", label: "LFTs, LDH, creatinine, urate", result: "AST 186, ALT 154, LDH 640, bilirubin 28, creatinine 112, urate high.", meaning: "Liver involvement: HELLP syndrome (haemolysis, elevated liver enzymes, low platelets).", use: "key" },
      { id: "ctg", group: "Bedside", label: "Cardiotocography (CTG) / fetal assessment", result: "Baseline 156, reduced variability, no accelerations, no decelerations.", meaning: "Non-reassuring (suspicious) CTG — placental insufficiency.", use: "key" },
      { id: "us", group: "Imaging", label: "Obstetric ultrasound with Doppler", result: "Estimated fetal weight <5th centile (growth restriction), reduced liquor, raised umbilical artery resistance.", meaning: "Fetal growth restriction from placental insufficiency.", use: "useful" },
      { id: "clot", group: "Blood", label: "Clotting profile, group & save", result: "INR 1.2, fibrinogen normal.", meaning: "No DIC yet.", use: "useful" },
      { id: "ct", group: "Imaging", label: "CT head", result: "Not done.", meaning: "", use: "low", note: "No focal deficit; imaging delays delivery. Treat the pre-eclampsia." },
    ],
    interpret: [mcq("pe-i1", "interpretation", "BP 172/112, proteinuria 3+, platelets 82, AST 186, LDH 640, clonus. Which diagnosis?", [
      o("Severe pre-eclampsia with HELLP syndrome and impending eclampsia", true, "Hypertension + proteinuria + multi-organ involvement."), o("Gestational hypertension", false, "No end-organ involvement."), o("Chronic hypertension", false, "No pre-pregnancy hypertension."), o("Acute fatty liver of pregnancy", false, "Different pattern (hypoglycaemia, high bilirubin)."),
    ], ["What do you call hypertension + proteinuria after 20 weeks?", "What do low platelets and raised liver enzymes add?", "Clonus and headache mean?", "Severe PE with HELLP."], "Severe features: BP ≥160/110, headache/visual symptoms, epigastric pain, platelets <100, raised LFTs, oliguria, pulmonary oedema.", { after: "lft" })],
    ddx: [
      { name: "Severe pre-eclampsia ± HELLP / impending eclampsia", aliases: ["pre-eclampsia", "preeclampsia", "severe pre-eclampsia", "eclampsia", "hellp", "pih", "hypertension in pregnancy", "pregnancy induced hypertension"], tier: "likely", why: "New hypertension after 20 weeks with proteinuria, oedema, headache, visual symptoms, hyperreflexia.", for: ["BP 172/112, proteinuria", "Headache, visual disturbance, epigastric pain, clonus", "Primigravida, missed ANC"], against: ["None"], separate: { ask: "Headache, visual change, epigastric pain, BP history", exam: "BP, reflexes, clonus, oedema", ix: "Urine protein, platelets, LFT, creatinine" } },
      { name: "Gestational hypertension / chronic hypertension", aliases: ["gestational hypertension", "chronic hypertension", "essential hypertension"], tier: "possible", why: "Hypertension in pregnancy without proteinuria is gestational hypertension; pre-existing hypertension is chronic.", for: ["High BP"], against: ["Proteinuria and end-organ features"], separate: { ask: "Pre-pregnancy BP", exam: "BP at <20 weeks", ix: "Proteinuria, LFT" } },
      { name: "Renal disease / nephrotic syndrome", aliases: ["nephrotic syndrome", "renal disease", "glomerulonephritis", "kidney disease"], tier: "possible", why: "Oedema with proteinuria can be renal, which may worsen in pregnancy.", for: ["Oedema, proteinuria"], against: ["Hypertension with HELLP features and gestation timing"], separate: { ask: "Previous renal disease", exam: "Periorbital oedema without hypertension", ix: "Albumin, urinalysis casts, renal ultrasound" } },
      { name: "Epilepsy / cerebral venous thrombosis / intracranial haemorrhage", aliases: ["epilepsy", "cerebral venous thrombosis", "stroke", "intracranial haemorrhage", "migraine"], tier: "dangerous", why: "A pregnant woman with headache and hypertension is at risk of stroke.", for: ["Headache, hypertension"], against: ["No focal deficit yet"], separate: { ask: "Previous fits, focal weakness", exam: "Focal signs, papilloedema", ix: "CT/MRI if focal or persistent" } },
    ],
    event: { when: "after-ix", title: "She seizes", text: "While waiting for the labour ward she has a generalised tonic–clonic convulsion lasting two minutes and then remains drowsy.", vitals: "BP 186/118, pulse 112, SpO₂ 90% (post-ictal), fetal heart 100/min.", q: mcq("pe-ev", "emergency", "What do you do NOW? (select all)", [
      o("Call for help; airway, left lateral position, oxygen; IV magnesium sulfate loading dose (4 g IV over 5–10 min, then 1 g/h)", true, "First-line anticonvulsant for eclampsia: reduces recurrence."), o("Control severe hypertension (IV labetalol or hydralazine, or oral nifedipine) to <160/110", true, "Prevents stroke."), o("Plan delivery after stabilisation (not before) — induce or caesarean depending on cervix and fetal state", true, "Delivery is the definitive treatment."), o("Give IV diazepam as the first-line drug", false, "Magnesium sulfate is superior in eclampsia."),
    ], ["Which two organs are at greatest risk?", "Which drug prevents the next fit?", "Which drug prevents a stroke?", "Magnesium, antihypertensive, deliver."], "Monitor for magnesium toxicity: loss of reflexes, RR <12, urine <30 mL/h; antidote calcium gluconate.") },
    dx: { q: mcq("pe-dx", "pathophysiology", "What is the pathophysiology?", [
      o("Abnormal placentation → placental ischaemia → release of anti-angiogenic factors (sFlt-1) → generalised endothelial dysfunction → hypertension, proteinuria and multi-organ injury", true, "Placental origin explains why delivery cures it."), o("Primary renal failure", false, "No."), o("Excess salt intake", false, "No."), o("Fetal infection", false, "No."),
    ], ["Where does the disease start?", "What cures it?", "Which organ is involved at the start?", "Placenta."], "The only definitive treatment is delivery of the placenta."),
    },
    mgmt: mcq("pe-mx", "management", "Select the correct plan for this woman at 36 weeks.", [
      o("Admit, stabilise: magnesium sulfate, antihypertensives (target <160/110), strict fluid balance, monitor reflexes/urine output", true, "Seizure and stroke prevention."), o("Deliver once stabilised — induction if cervix favourable, caesarean if not/fetal compromise; HELLP and non-reassuring CTG push towards urgent delivery", true, "At 36 weeks with severe disease, deliver."), o("Continuous fetal monitoring; neonatal team for a growth-restricted baby; give steroids if <34 weeks (not needed here)", true, "Fetal care."), o("Postnatal: continue BP monitoring, magnesium for 24 h after delivery, counsel on recurrence and long-term cardiovascular risk", true, "Follow-up."),
      o("Discharge with oral methyldopa and review in a week", false, "Severe disease: admit."), o("Large IV fluid boluses for oliguria", false, "Risk of pulmonary oedema."),
    ], ["What prevents the next seizure?", "What prevents a stroke?", "What is the cure?", "Magnesium, BP control, deliver."], "Aspirin prophylaxis (75–150 mg from 12 weeks) in high-risk women prevents pre-eclampsia in the next pregnancy."),
    consultant: [
      mcq("pe-c1", "consultant", "List severe features of pre-eclampsia (select all).", [
        o("BP ≥160/110", true, "Severe."), o("Headache, visual disturbance, epigastric/RUQ pain", true, "Severe."), o("Platelets <100, AST/ALT twice normal, creatinine >1.1 mg/dL, pulmonary oedema", true, "End-organ."), o("A single dipstick result of 1+ protein", false, "Not severe by itself."),
      ], ["What shows end-organ damage?", "BP threshold?", "Symptoms?", "First three."], "Early recognition prevents eclampsia."),
      mcq("pe-c2", "consultant", "Why is magnesium sulfate monitored and what is the antidote?", [
        o("Toxicity causes loss of patellar reflexes, respiratory depression and cardiac arrest; antidote is IV calcium gluconate", true, "Check reflexes, RR, urine output."), o("It causes hypertension; antidote is labetalol", false, "No."), o("It causes hypoglycaemia; antidote is glucose", false, "No."), o("It has no side effects", false, "No."),
      ], ["First sign of toxicity?", "Which organ stops?", "Antidote?", "Calcium gluconate."], "Renal excretion: reduce the dose in oliguria."),
      mcq("pe-c3", "consultant", "What would kill this patient and what else are you worried about? (select all)", [
        o("Eclampsia and intracranial haemorrhage", true, "Direct threats."), o("HELLP: liver rupture/DIC/bleeding", true, "Serious."), o("Placental abruption and fetal death", true, "Obstetric complications."), o("Pulmonary oedema and renal failure", true, "Multi-organ."),
      ], ["Think brain, liver, placenta, lungs.", "What can bleed?", "Which complication threatens the baby?", "All."], "Always think of both mother and baby."),
    ],
    chain: { risk: "Primigravida, young age, missed ANC, previous/familial PE, obesity, multiple pregnancy", patho: "Abnormal placentation → placental ischaemia → endothelial dysfunction → vasospasm, capillary leak, platelet consumption", symptoms: "Headache, visual disturbance, epigastric pain, swelling, reduced fetal movement", signs: "BP 172/112, proteinuria, hyperreflexia/clonus, small-for-dates uterus", ix: "Urine protein, platelets, LFT, creatinine, CTG, Doppler", dx: "Severe pre-eclampsia with HELLP and impending eclampsia", mx: "Magnesium sulfate, antihypertensives, deliver, monitor", comp: "Eclampsia, stroke, HELLP, abruption, DIC, FGR, perinatal death" },
    mustKnow: ["BP ≥140/90 after 20 weeks + proteinuria or end-organ features = pre-eclampsia.", "Headache + visual symptoms + epigastric pain = severe features.", "Magnesium sulfate prevents/treats eclampsia; watch reflexes/RR/urine.", "Treat BP ≥160/110 promptly (labetalol, hydralazine, nifedipine).", "Delivery is the definitive treatment.", "Avoid fluid overload.", "Low-dose aspirin in the next pregnancy."],
    thinkIf: [["Headache + visual changes + hypertension in pregnancy", "Severe pre-eclampsia/eclampsia."], ["Pre-eclampsia + low platelets + abnormal LFT", "HELLP syndrome."], ["Third-trimester bleed + hypertension + painful hard uterus", "Placental abruption."]],
    revise: "pre-eclampsia",
  },
  {
    id: "ob-aph", rotation: "obgyn", title: "Painless bright-red bleeding at 33 weeks", level: 2, setting: "Maternity casualty", tags: ["antepartum haemorrhage", "placenta praevia", "abruption", "shock"], emergency: true,
    involved: ["Obstetric / gynaecological", "Haematological", "Cardiovascular"],
    vignette: "A 31-year-old woman, gravida 3 para 2 (both caesarean deliveries), at 33 weeks’ gestation, wakes up to find her bed soaked with fresh blood. She feels no pain and no contractions.",
    hsets: ["obs"], esets: ["general", "obs", "abcde"],
    hx: {
      onset: "Sudden bleeding while asleep, about an hour ago.", gp: "G3 P2+0, two living children.", lnmp: "33 weeks by early scan.", prevob: "Two caesarean sections (last one 3 years ago for obstructed labour). No previous bleeding.", anc: "Attended 4 visits; the 20-week scan said ‘placenta low-lying’; she was told to return but did not.",
      bleed: "Bright red, soaking 3 pads, no clots, no pain. Similar small bleed last week after intercourse.", contr: "No contractions or abdominal pain.", fm: "Baby moving normally.", leak: "No fluid leakage.", htn: "No headache or visual change.", fever: "None.", pmh: "No hypertension or diabetes.", drugs: "Iron/folate.",
      social: "Lives 30 km away; no vehicle.", gyn: "No STIs.",
    },
    hxKey: ["bleed", "contr", "prevob", "anc", "fm", "gp", "htn"],
    ex: {
      vit: "BP 98/60 mmHg, pulse 118/min, RR 24/min, SpO₂ 98%, temperature 36.8 °C, capillary refill 3 s. Blood loss estimate ~800 mL.", face: "Pale.", pulse: "118, thready.", oed: "None.", ofh: "Fundal height 34 cm (consistent with dates).", olie: "Oblique lie, head high and mobile (not engaged).", ofhr: "Fetal heart 144/min, regular.", ouid: "Uterus soft, non-tender, relaxed between palpations.",
      ove: "NO digital vaginal examination performed (placenta praevia not yet excluded). Speculum later shows fresh blood from the os, no cervical lesion.", oref: "Normal reflexes.", A: "Patent.", B: "Normal.", C: "BP 98/60, HR 118.", D: "Alert.", E: "Bed soaked with fresh blood.", hydr: "Hypovolaemic.",
    },
    exKey: ["vit", "ouid", "olie", "ofhr", "ofh"],
    ix: [
      { id: "us", group: "Imaging", label: "Obstetric ultrasound (placental localisation)", result: "Placenta covers the internal os (anterior, extending over the previous caesarean scar). Fetus alive, cephalic/oblique, no retroplacental clot. Features suggesting placenta accreta spectrum (loss of clear zone, lacunae).", meaning: "Major placenta praevia with a risk of placenta accreta because of two previous caesareans — a surgical emergency.", use: "key" },
      { id: "fbc", group: "Blood", label: "FBC, group & crossmatch", result: "Hb 8.1 g/dL, platelets 190. Blood group O Rhesus positive.", meaning: "Acute blood loss; crossmatch 4 units.", use: "key" },
      { id: "ctg", group: "Bedside", label: "CTG", result: "Baseline 144, normal variability, reactive trace, no contractions.", meaning: "Reassuring fetal condition for now.", use: "key" },
      { id: "clot", group: "Blood", label: "Clotting profile (bedside clotting test)", result: "INR 1.0; fibrinogen normal; clot forms within 6 minutes.", meaning: "No DIC — unlike abruption.", use: "useful" },
      { id: "kb", group: "Blood", label: "Kleihauer–Betke test", result: "Not required (Rhesus positive).", meaning: "", use: "low", note: "Only for Rhesus-negative women with bleeding." },
      { id: "ve", group: "Procedures", label: "Digital vaginal examination to assess the cervix", result: "NOT DONE — contraindicated.", meaning: "", use: "low", note: "A digital VE in undiagnosed antepartum bleeding can provoke torrential haemorrhage from a praevia. Ultrasound first." },
    ],
    interpret: [mcq("ap-i1", "interpretation", "Painless bright-red bleeding at 33 weeks, relaxed non-tender uterus, normal CTG, and ultrasound showing the placenta over the os. What is the diagnosis and the key danger?", [
      o("Major placenta praevia (with possible accreta) — risk of torrential bleeding; no digital vaginal examination", true, "Painless, recurrent, bright red bleeding with a soft uterus."), o("Placental abruption", false, "Painful, dark blood, tense/woody uterus, fetal distress."), o("Vasa praevia", false, "Fetal bleeding with fetal bradycardia."), o("Cervical cancer", false, "Not the picture."),
    ], ["Painful or painless?", "Is the uterus soft or hard?", "Where is the placenta?", "Praevia."], "Praevia → painless; abruption → painful. Never do a digital VE until praevia is excluded.", { after: "us" })],
    ddx: [
      { name: "Placenta praevia (± accreta)", aliases: ["placenta praevia", "praevia", "placenta previa", "low lying placenta", "accreta"], tier: "likely", why: "Painless fresh bleeding in the third trimester with previous caesareans and a documented low-lying placenta.", for: ["Painless bright red bleeding", "Soft non-tender uterus, oblique lie, high head", "Low placenta on 20-week scan", "Two previous CS"], against: ["None"], separate: { ask: "Pain? Previous low placenta?", exam: "Soft uterus, malpresentation, no VE", ix: "Ultrasound" } },
      { name: "Placental abruption", aliases: ["abruption", "placental abruption", "abruptio placentae"], tier: "dangerous", why: "Third-trimester bleeding with shock may be abruption (concealed haemorrhage can be hidden).", for: ["Bleeding with shock"], against: ["Painless, soft uterus, normal CTG, bright blood"], separate: { ask: "Constant abdominal pain, trauma, hypertension, cocaine", exam: "Woody tender uterus, fetal distress", ix: "Ultrasound (clot), coagulation, CTG" } },
      { name: "Uterine rupture (previous caesarean scars)", aliases: ["uterine rupture", "scar dehiscence", "rupture"], tier: "dangerous", why: "Women with previous caesareans can rupture the scar, usually with pain, fetal distress or loss of station.", for: ["Two previous caesareans"], against: ["No pain or contractions, fetal heart normal"], separate: { ask: "Scar pain, labour", exam: "Palpable fetal parts, tenderness", ix: "CTG, ultrasound" } },
      { name: "Local causes: cervical lesion, vaginal trauma, bloody show/preterm labour, vasa praevia", aliases: ["cervical polyp", "cervicitis", "cervical cancer", "preterm labour", "vasa praevia", "trauma", "show"], tier: "possible", why: "Not all APH is placental.", for: ["Post-coital bleed"], against: ["Volume and placental position"], separate: { ask: "Intercourse, trauma", exam: "Speculum findings", ix: "Ultrasound, speculum" } },
    ],
    event: { when: "after-ix", title: "Brisk bleeding", text: "As she is being moved to theatre she has another gush of blood, estimated at 1,000 mL. She becomes pale and clammy.", vitals: "BP 72/40, pulse 142/min, fetal heart 100/min.", q: mcq("ap-ev", "emergency", "What do you do NOW? (select all)", [
      o("Call senior obstetrician, anaesthetist and blood bank; two large-bore cannulae; resuscitate with crystalloid then crossmatched blood; keep warm; left tilt", true, "Treat shock and prepare for theatre."), o("Immediate caesarean section (classical/upper segment approach) with a senior surgeon and cell salvage/hysterectomy back-up", true, "Placenta praevia with brisk bleeding needs delivery."), o("Give oxygen, tranexamic acid and prepare for major obstetric haemorrhage protocol", true, "Prevent coagulopathy."), o("Do a vaginal examination to see how dilated she is", false, "Dangerous."),
    ], ["Airway, breathing, circulation.", "Who should be in theatre?", "What is the definitive treatment?", "Resuscitate and deliver by caesarean."], "Prepare for placenta accreta: hysterectomy may be needed.") },
    dx: { q: mcq("ap-dx", "pathophysiology", "What is the best working diagnosis?", [
      o("Major placenta praevia with antepartum haemorrhage and probable accreta (two previous CS scars)", true, "Placenta implanted over the os and scar."), o("Placental abruption", false, "No pain/hard uterus."), o("Preterm labour", false, "No contractions."), o("Vasa praevia", false, "No fetal bradycardia/rupture of membranes."),
    ], ["Where is the placenta?", "Scar risk?", "Pain?", "Praevia + accreta."], "Previous caesareans increase praevia and accreta."),
    },
    mgmt: mcq("ap-mx", "management", "Select correct management steps.", [
      o("Resuscitate and cross-match blood; delivery by caesarean (urgent if heavy bleeding/fetal compromise); senior team, cell salvage, hysterectomy available", true, "Major praevia is always delivered by CS."), o("If bleeding settles at 33 weeks: admit, give antenatal corticosteroids for lung maturity, anti-D if Rh negative, and plan elective CS at 36–37 weeks", true, "Expectant management only if stable."), o("Avoid vaginal examinations; give magnesium sulfate for neuroprotection if <32 weeks; neonatal team present", true, "Fetal care."), o("Postpartum: watch for PPH (lower segment contracts poorly), iron replacement", true, "Complication risk."),
      o("Induce labour vaginally", false, "Contraindicated."), o("Send her home to return if bleeding recurs", false, "Dangerous."),
    ], ["What must you avoid?", "How do you deliver?", "What improves fetal lungs?", "Resuscitate, caesarean, steroids if stable."], "Place of delivery should have blood transfusion and theatre."),
    consultant: [
      mcq("ap-c1", "consultant", "Contrast placenta praevia with abruption (select all true).", [
        o("Praevia: painless, bright red, soft uterus, malpresentation; coagulopathy uncommon", true, "Classic."), o("Abruption: painful, dark blood (may be concealed), hard woody uterus, fetal distress, DIC risk", true, "Classic."), o("Abruption is associated with hypertension, trauma, cocaine, previous abruption", true, "Risk factors."), o("Praevia often presents with a hard woody uterus", false, "No."),
      ], ["Pain?", "Uterine tone?", "Colour of blood?", "First three."], "Concealed abruption can cause shock out of proportion to visible blood loss."),
      mcq("ap-c2", "pathophysiology", "Why is a VE contraindicated?", [
        o("Fingers may disturb the placenta over the cervix, causing massive haemorrhage", true, "Praevia must be excluded by ultrasound first."), o("It is painful", false, "No."), o("It causes infection", false, "No."), o("It causes preterm labour", false, "No."),
      ], ["Where is the placenta?", "What happens if you touch it?", "Which test first?", "Ultrasound first."], "Use speculum for visual assessment."),
      mcq("ap-c3", "consultant", "What would kill this patient and what else are you worried about? (select all)", [
        o("Haemorrhagic shock", true, "Immediate."), o("Placenta accreta needing hysterectomy; PPH", true, "Surgical."), o("Fetal hypoxia and prematurity", true, "Perinatal."), o("DIC after massive transfusion", true, "Coagulopathy."),
      ], ["ABC.", "What can happen at CS?", "What about the baby?", "All."], "Maternal haemorrhage is a leading cause of death in Kenya."),
    ],
    chain: { risk: "Previous caesareans, multiparity, previous praevia, smoking, advanced age", patho: "Placenta implants over the lower segment/scar → lower segment stretches in the third trimester → placental separation and bleeding from maternal sinuses", symptoms: "Painless fresh bleeding, recurrent small bleeds, post-coital bleed", signs: "Soft non-tender uterus, malpresentation, high head, hypovolaemia", ix: "Ultrasound (placental location, accreta signs), Hb/crossmatch, CTG, clotting", dx: "Major placenta praevia with possible accreta", mx: "Resuscitate, no VE, caesarean (urgent if heavy bleeding), steroids if stable, blood available", comp: "Haemorrhage, hysterectomy, preterm birth, DIC, perinatal death" },
    mustKnow: ["Painless bright-red bleeding in late pregnancy = placenta praevia until excluded.", "NEVER do a digital VE in antepartum haemorrhage before ultrasound.", "Painful dark bleeding with a hard uterus = abruption.", "Resuscitate while preparing for caesarean; involve senior team and blood bank.", "Previous caesareans increase praevia and accreta.", "Antenatal steroids if stable and <34–36 weeks.", "Anti-D for Rhesus-negative mothers."],
    thinkIf: [["Painless APH + soft uterus", "Placenta praevia."], ["Painful APH + woody uterus + shock out of proportion", "Placental abruption (concealed)."], ["Bleeding + fetal bradycardia after membrane rupture", "Vasa praevia."]],
    revise: "placenta praevia",
  },
  {
    id: "ob-pph", rotation: "obgyn", title: "Bleeding after a normal delivery", level: 2, setting: "Labour ward", tags: ["postpartum haemorrhage", "uterine atony", "shock"], emergency: true,
    involved: ["Obstetric / gynaecological", "Haematological", "Cardiovascular"],
    vignette: "A 28-year-old woman, gravida 4 para 3, has just delivered a 4.2 kg baby by normal vaginal delivery after a long second stage. Ten minutes later you notice heavy vaginal bleeding and she feels dizzy.",
    hsets: ["obs"], esets: ["general", "obs", "abcde"],
    hx: {
      onset: "Heavy bleeding started immediately after the placenta came out.", gp: "G4 P3+0 (now delivered).", prevob: "Three previous normal deliveries; one retained placenta; no PPH before.", anc: "Attended 5 visits; Hb 9.8 at 34 weeks (not treated); HIV negative; polyhydramnios noted.", bleed: "Steady heavy flow with clots.", contr: "Labour was augmented with oxytocin for 8 hours.", pmh: "Anaemia; no bleeding disorder.", drugs: "Iron irregularly.",
      social: "Lives in a rural area; home deliveries before.", fever: "None during labour.", leak: "Membranes ruptured 14 h ago.",
    },
    hxKey: ["bleed", "prevob", "anc", "contr", "pmh", "gp"],
    ex: {
      vit: "BP 84/50 mmHg, pulse 134/min, RR 26/min, SpO₂ 96%, temperature 36.7 °C; blood loss ≥1,500 mL.", face: "Pale; sweating.", pulse: "Rapid, thready.", ofh: "Uterus palpable above the umbilicus — large, soft and ‘boggy’.", ouid: "Uterus soft and relaxed, poor tone; rises with clots and firms briefly on massage then relaxes again.",
      ove: "Speculum/vaginal exam: placenta delivered (checked complete; membranes complete); no cervical or vaginal tears; no retained products.", oref: "Normal.", A: "Patent.", B: "RR 26.", C: "BP 84/50, HR 134, CRT 4 s.", D: "Anxious, alert.", E: "Blood soaking the bed, no tears seen.", hydr: "Hypovolaemic.",
    },
    exKey: ["vit", "ouid", "ofh", "ove", "pulse"],
    ix: [
      { id: "clot", group: "Bedside", label: "Bedside clotting test (20-minute whole blood clot) / coagulation screen", result: "Clot forms firm within 8 minutes. INR 1.1, fibrinogen 3.2 g/L.", meaning: "No coagulopathy yet.", use: "key" },
      { id: "fbc", group: "Blood", label: "FBC, group & crossmatch", result: "Hb 6.4 g/dL, platelets 190. Crossmatch 4 units.", meaning: "Acute blood loss on a background of pre-existing anaemia.", use: "key" },
      { id: "lac", group: "Blood", label: "Lactate and blood gas", result: "Lactate 5.6, pH 7.25, base excess −9.", meaning: "Hypoperfusion — shock.", use: "useful" },
      { id: "us", group: "Imaging", label: "Bedside ultrasound of the uterus", result: "Enlarged uterus with a heterogenous collection of clots; no retained placental tissue.", meaning: "Atonic uterus filled with clots.", use: "useful" },
      { id: "ct", group: "Imaging", label: "CT abdomen", result: "Not done.", meaning: "", use: "low", note: "Unstable — no time for CT." },
    ],
    interpret: [mcq("pph-i1", "interpretation", "Soft boggy uterus above the umbilicus, complete placenta, no tears. What is the cause of PPH? (use the 4 Ts)", [
      o("Tone — uterine atony (the commonest cause)", true, "Risk factors: macrosomia, polyhydramnios, grand multiparity, augmented/long labour."), o("Trauma", false, "None found."), o("Tissue (retained placenta)", false, "Placenta complete."), o("Thrombin (coagulopathy)", false, "Clotting normal."),
    ], ["Soft or firm uterus?", "Placenta complete?", "Tears?", "Tone."], "The four Ts: Tone, Trauma, Tissue, Thrombin.", { after: "us" })],
    ddx: [
      { name: "Uterine atony (primary PPH)", aliases: ["atony", "uterine atony", "pph", "postpartum haemorrhage", "tone"], tier: "likely", why: "Soft boggy uterus after a large baby, polyhydramnios and oxytocin-augmented long labour.", for: ["Soft uterus, large baby, grand multipara"], against: ["None"], separate: { ask: "Risk factors for atony", exam: "Uterine tone", ix: "Ultrasound, exam" } },
      { name: "Genital tract trauma (cervical, vaginal, perineal tears)", aliases: ["tear", "trauma", "genital tract trauma", "cervical tear", "laceration"], tier: "possible", why: "Large baby/precipitate delivery can tear the cervix and vagina — bleeding with a firm uterus.", for: ["Large baby"], against: ["Uterus is soft; inspection found none"], separate: { ask: "Instrumental delivery", exam: "Uterus firm with continuous bleeding", ix: "Inspection under good light" } },
      { name: "Retained placenta / products", aliases: ["retained placenta", "retained products", "tissue"], tier: "possible", why: "Retained tissue prevents contraction.", for: ["Previous retained placenta"], against: ["Placenta and membranes complete"], separate: { ask: "Placenta delivery", exam: "Inspect placenta", ix: "Ultrasound" } },
      { name: "Coagulopathy (DIC, bleeding disorder) / uterine inversion / rupture", aliases: ["dic", "coagulopathy", "uterine inversion", "uterine rupture", "bleeding disorder", "thrombin"], tier: "dangerous", why: "Missed causes: DIC after abruption/sepsis, inversion, or rupture.", for: ["Heavy bleeding"], against: ["Clot test normal"], separate: { ask: "Bleeding history, abruption", exam: "Fundal dimple (inversion), tenderness", ix: "Clotting, ultrasound" } },
    ],
    event: { when: "after-exam", title: "Persistent bleeding", text: "Despite uterine massage and oxytocin 10 IU IM the uterus relaxes again and bleeding continues. The blood loss now exceeds 2 litres.", vitals: "BP 70/40, pulse 148, RR 30.", q: mcq("pph-ev", "emergency", "What do you do NOW? (select all)", [
      o("Call for help, uterine massage/bimanual compression, empty the bladder, oxytocin infusion, IV tranexamic acid 1 g, misoprostol/ergometrine (if no hypertension) and carboprost if available", true, "Escalating uterotonics + TXA."), o("Resuscitate with warmed crystalloid and blood, two large cannulae, oxygen, catheter; activate the massive haemorrhage protocol", true, "Treat shock."), o("If bleeding continues: intrauterine balloon tamponade, compression sutures (B-Lynch), uterine artery ligation, then hysterectomy", true, "Stepwise surgical control."), o("Wait for 30 minutes to see if bleeding stops", false, "Delay kills."),
    ], ["What are the 4 Ts?", "What drug supports clotting?", "What mechanical measures follow?", "Massage, uterotonics, TXA, resuscitate, balloon/surgery."], "Time is life: PPH can kill in under an hour.") },
    dx: { q: mcq("pph-dx", "pathophysiology", "What is the diagnosis?", [
      o("Primary postpartum haemorrhage (>1,000 mL within 24 h) from uterine atony with hypovolaemic shock", true, "Definition and cause."), o("Secondary PPH", false, "Occurs >24 h."), o("Eclampsia", false, "No."), o("Amniotic fluid embolism", false, "No."),
    ], ["When did it happen?", "Cause?", "Shock?", "Atonic primary PPH."], "Definitions: primary PPH <24 h; secondary 24 h–12 weeks."),
    },
    mgmt: mcq("pph-mx", "management", "Select correct management steps.", [
      o("Active management of the third stage (oxytocin 10 IU IM, controlled cord traction) prevents most PPH", true, "WHO-recommended."), o("Resuscitate and treat tone: massage, uterotonics (oxytocin, misoprostol, ergometrine, carboprost) and tranexamic acid within 3 h", true, "Standard."), o("Surgical/ mechanical measures if medical measures fail", true, "Balloon tamponade, sutures, arterial ligation, hysterectomy."), o("After stabilisation: iron/transfusion, monitor, and counsel on subsequent pregnancies (hospital delivery, active management)", true, "Aftercare."),
      o("Give oral iron and discharge from labour ward", false, "Unsafe."), o("Pack the vagina with gauze", false, "Conceals bleeding."),
    ], ["What prevents PPH?", "What treats tone?", "What if it fails?", "AMTSL, uterotonics, TXA, surgery."], "Know your uterotonics and contraindications (ergometrine in hypertension)."),
    consultant: [
      mcq("pph-c1", "consultant", "List risk factors for atony (select all).", [
        o("Macrosomia, polyhydramnios, multiple pregnancy", true, "Overdistension."), o("Grand multiparity, prolonged/augmented labour", true, "Fatigued myometrium."), o("Chorioamnionitis, fibroids, uterine anomalies", true, "Poor contraction."), o("Primigravida with a normal short labour", false, "Lower risk."),
      ], ["What stretches the uterus?", "What tires it?", "What impairs contraction?", "First three."], "Identify high-risk women at ANC and deliver in a hospital."),
      mcq("pph-c2", "pathophysiology", "How does the uterus normally stop bleeding after delivery?", [
        o("Myometrial contraction compresses spiral arteries (‘living ligatures’), supported by clotting", true, "Physiological haemostasis."), o("Because the baby presses on the vessels", false, "No."), o("By vasoconstriction in the legs", false, "No."), o("Only by clotting factors", false, "Contraction is key."),
      ], ["Which muscle?", "Which vessels?", "Why does atony cause bleeding?", "Contraction."], "That is why uterotonics are first-line."),
      mcq("pph-c3", "consultant", "What would kill this patient and what are you worried about? (select all)", [
        o("Hypovolaemic shock and DIC", true, "Immediate."), o("Multi-organ failure and Sheehan syndrome later", true, "Delayed."), o("Anaemia-related heart failure", true, "Pre-existing anaemia."), o("Puerperal sepsis", true, "Risk after surgery and long labour."),
      ], ["Think shock, coagulopathy, pituitary, infection.", "Hb 6.4.", "What happens to the pituitary in severe PPH?", "All."], "Sheehan syndrome = pituitary necrosis (failure to lactate)."),
    ],
    chain: { risk: "Grand multipara, macrosomia, polyhydramnios, prolonged/augmented labour, anaemia", patho: "Failure of myometrial contraction → spiral arteries remain open → haemorrhage → shock", symptoms: "Heavy bleeding, dizziness, thirst", signs: "Tachycardia, hypotension, soft boggy uterus above the umbilicus", ix: "Hb, crossmatch, clotting test, ultrasound", dx: "Atonic primary PPH with haemorrhagic shock", mx: "Massage, uterotonics, TXA, fluids/blood, tamponade/surgery", comp: "DIC, hysterectomy, Sheehan syndrome, death" },
    mustKnow: ["PPH: ≥500 mL vaginal or ≥1,000 mL caesarean; severe if >1,000 mL or unstable.", "4 Ts: Tone (70%), Trauma, Tissue, Thrombin.", "AMTSL: oxytocin 10 IU IM + controlled cord traction + uterine massage.", "Give tranexamic acid 1 g IV within 3 hours.", "Resuscitate: ABC, two IV lines, blood early, warmth.", "Stepwise: uterotonics → tamponade → sutures/ligation → hysterectomy.", "Treat anaemia in pregnancy to improve tolerance."],
    thinkIf: [["Soft boggy uterus + heavy bleeding", "Uterine atony."], ["Firm uterus + continuous bright bleeding", "Genital tract trauma."], ["Bleeding + absent placenta/products", "Retained tissue."]],
    revise: "postpartum haemorrhage",
  },
]
