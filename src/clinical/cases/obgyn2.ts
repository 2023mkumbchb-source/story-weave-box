import type { CaseDef } from "../types";
import { mcq, o } from "../templates";

export const OBGYN_2: CaseDef[] = [
  {
    id: "ob-ectopic", rotation: "obgyn", title: "Lower abdominal pain and fainting after a missed period", level: 2, setting: "Casualty", tags: ["ectopic pregnancy", "shock", "acute abdomen", "pregnancy test"], emergency: true,
    involved: ["Obstetric / gynaecological", "Haematological", "Cardiovascular"],
    vignette: "A 26-year-old woman collapses at work after sudden severe lower abdominal pain. She reports that her last period was seven weeks ago and she has had some spotting for two days.",
    hsets: ["obs"], esets: ["general", "abd", "obs", "abcde"],
    hx: {
      onset: "Pain started suddenly 2 hours ago, left iliac fossa, then spread across the lower abdomen and to the shoulder tip.", lnmp: "LNMP 7 weeks ago; cycles regular; she did not know she was pregnant.", gp: "G2 P1 (previous normal delivery), one living child.", bleed: "Dark brown spotting for 2 days.", fm: "Not applicable.", fever: "No fever.",
      prevob: "Previous PID 2 years ago treated at a clinic; no previous ectopic.", gyn: "Uses no contraception; previously had an IUCD removed 6 months ago.", pmh: "No other illness.", drugs: "None.", social: "Sexually active with one partner; HIV status unknown.", anc: "Not yet booked.", htn: "Dizzy, faint.",
    },
    hxKey: ["onset", "lnmp", "bleed", "prevob", "gyn", "htn"],
    ex: {
      vit: "BP 84/48 mmHg, pulse 134/min, RR 28/min, SpO₂ 98%, temperature 36.6 °C.", face: "Pale, sweating.", pulse: "Fast, thready.", hydr: "Cool, clammy, capillary refill 4 s.", abdi: "Mildly distended lower abdomen, moves poorly with breathing.", abdp: "Marked lower abdominal tenderness with guarding and rebound, worse on the left.", asc: "Shifting dullness: free fluid.", ouid: "Uterus not palpable abdominally.",
      ove: "Speculum: small amount of dark blood from the os; cervix closed. Bimanual: cervical motion tenderness; tender left adnexa; fullness in the pouch of Douglas.", pr: "Not indicated.", A: "Patent.", B: "RR 28.", C: "BP 84/48, HR 134.", D: "Alert, anxious.", E: "Lower abdominal guarding.",
    },
    exKey: ["vit", "abdp", "asc", "ove", "pulse"],
    ix: [
      { id: "preg", group: "Bedside", label: "Urine pregnancy test (immediately in any woman of reproductive age with abdominal pain)", result: "Positive.", meaning: "Pregnant + pain + shock + free fluid = ruptured ectopic until proven otherwise.", use: "key" },
      { id: "fast", group: "Imaging", label: "Bedside ultrasound (FAST/pelvic)", result: "Empty uterus with a thickened endometrium; free fluid in the pouch of Douglas and Morison’s pouch; a complex left adnexal mass with no intrauterine gestational sac.", meaning: "Haemoperitoneum with a left tubal ectopic — ruptured.", use: "key" },
      { id: "fbc", group: "Blood", label: "FBC, group & crossmatch", result: "Hb 7.6 g/dL, platelets 220. Blood group A Rhesus negative.", meaning: "Acute blood loss; Rhesus-negative: needs anti-D.", use: "key" },
      { id: "bhcg", group: "Blood", label: "Serum β-hCG", result: "β-hCG 4,200 IU/L.", meaning: "Above the discriminatory zone with an empty uterus = ectopic.", use: "useful" },
      { id: "lac", group: "Blood", label: "Lactate / coagulation", result: "Lactate 4.4; INR normal.", meaning: "Hypoperfusion.", use: "useful" },
      { id: "ct", group: "Imaging", label: "CT abdomen", result: "Not done.", meaning: "", use: "low", note: "Unstable — ultrasound and theatre, not CT." },
    ],
    interpret: [mcq("ec-i1", "interpretation", "Positive pregnancy test, empty uterus, free fluid, shock and an adnexal mass. What next?", [
      o("Resuscitate and take her to theatre for emergency laparotomy/laparoscopic salpingectomy", true, "Ruptured ectopic with haemorrhagic shock."), o("Give methotrexate", false, "For stable unruptured ectopics only."), o("Repeat β-hCG in 48 hours", false, "She is unstable."), o("Discharge with analgesia", false, "Fatal."),
    ], ["Is she stable?", "Where is the bleeding?", "Medical or surgical?", "Surgical."], "Methotrexate criteria: stable, β-hCG <5,000, no fetal heart, no rupture.", { after: "fast" })],
    ddx: [
      { name: "Ruptured ectopic pregnancy (tubal)", aliases: ["ectopic pregnancy", "ectopic", "ruptured ectopic", "tubal pregnancy", "tubal ectopic"], tier: "likely", why: "Amenorrhoea + abdominal pain + shock in a woman with a PID history.", for: ["Missed period, spotting, sudden pain, shoulder-tip pain, shock", "Previous PID, IUCD"], against: ["None"], separate: { ask: "LNMP, bleeding, shoulder pain", exam: "Shock, peritonism, adnexal mass", ix: "Pregnancy test, ultrasound" } },
      { name: "Threatened or incomplete miscarriage", aliases: ["miscarriage", "abortion", "incomplete abortion", "threatened miscarriage"], tier: "possible", why: "Bleeding and pain in early pregnancy are commonly due to miscarriage.", for: ["Spotting, pain"], against: ["Shock out of proportion, closed os, free fluid"], separate: { ask: "Clots/tissue", exam: "Open os", ix: "Ultrasound (products in uterus)" } },
      { name: "Ruptured ovarian cyst / ovarian torsion / appendicitis / PID", aliases: ["ovarian cyst", "ovarian torsion", "appendicitis", "pid", "pelvic inflammatory disease", "acute abdomen"], tier: "possible", why: "Other causes of acute pelvic pain; appendicitis and torsion are surgical emergencies.", for: ["Lower abdominal pain, peritonism"], against: ["Positive pregnancy test, shock, free fluid"], separate: { ask: "Migration of pain, fever", exam: "RIF tenderness, cervical motion", ix: "Pregnancy test, ultrasound, WCC" } },
      { name: "Haemoperitoneum from other cause / abruption / uterine rupture", aliases: ["haemoperitoneum", "ruptured spleen", "uterine rupture", "internal bleeding"], tier: "dangerous", why: "Any cause of intra-abdominal bleeding with shock.", for: ["Shock"], against: ["The pregnancy test points to ectopic"], separate: { ask: "Trauma", exam: "Source of bleeding", ix: "Ultrasound, theatre" } },
    ],
    event: { when: "after-exam", title: "Collapse", text: "She suddenly becomes unresponsive and her blood pressure cannot be recorded.", vitals: "No palpable radial pulse; carotid weak at 150/min; GCS 8.", q: mcq("ec-ev", "emergency", "What do you do NOW? (select all)", [
      o("Call for help; oxygen; two large-bore cannulae; start rapid fluid/blood (O-negative or uncrossmatched if needed) through a rapid infuser; keep warm", true, "Haemorrhagic shock."), o("Transfer to theatre immediately — surgical control of bleeding is the definitive resuscitation", true, "Do not wait for blood to ‘normalise’ BP."), o("Give IV anti-D after the operation and send crossmatch; consider tranexamic acid", true, "Rhesus negative; TXA helps."), o("Wait for a CT scan", false, "She would die in the scanner."),
    ], ["Airway, breathing, circulation.", "Where do you take her?", "What do you give for Rh negative?", "Resuscitate and operate now."], "Haemorrhage control cannot be achieved by fluids alone.") },
    dx: { q: mcq("ec-dx", "pathophysiology", "What is the diagnosis and mechanism?", [
      o("Ruptured left tubal ectopic pregnancy: implantation in the damaged tube (previous PID) → trophoblast invades the wall → rupture → haemoperitoneum", true, "Tubal damage delays embryo transport."), o("Ovarian torsion", false, "No."), o("Complete miscarriage", false, "No."), o("Appendicitis", false, "No."),
    ], ["Where did the embryo implant?", "Risk factor?", "What happened to the tube?", "Tubal rupture."], "Risk factors: previous PID, previous ectopic, tubal surgery, IUCD, assisted conception."),
    },
    mgmt: mcq("ec-mx", "management", "Select correct management.", [
      o("Resuscitate and perform urgent laparotomy/laparoscopy with salpingectomy (or salpingotomy if the other tube is damaged and she wants fertility)", true, "Definitive."), o("Give anti-D immunoglobulin (Rhesus negative), blood transfusion, and arrange follow-up β-hCG", true, "Complete care."), o("Counsel about fertility, contraception and early scan in future pregnancies; test for STIs/HIV", true, "Prevention of recurrence."), o("Methotrexate for stable, small, unruptured ectopics (β-hCG <5,000, no cardiac activity)", true, "Medical option when appropriate."),
      o("Expectant management for this shocked patient", false, "Dangerous."), o("Dilatation and curettage", false, "Not treatment for ectopic."),
    ], ["Stable or unstable?", "What if Rhesus negative?", "What about future pregnancies?", "Surgery, anti-D, counselling."], "Any woman of reproductive age with abdominal pain gets a pregnancy test."),
    consultant: [
      mcq("ec-c1", "consultant", "List risk factors for ectopic pregnancy (select all).", [
        o("Previous PID/STI (chlamydia, gonorrhoea)", true, "Tubal damage."), o("Previous ectopic or tubal surgery", true, "Highest risk."), o("IUCD in situ, assisted conception, smoking", true, "Yes."), o("Previous normal vaginal delivery alone", false, "No."),
      ], ["What damages the tube?", "What alters transport?", "Which contraceptive?", "First three."], "A positive test plus no intrauterine sac above the discriminatory zone = ectopic."),
      mcq("ec-c2", "pathophysiology", "Why is shoulder-tip pain a clue?", [
        o("Blood irritates the diaphragm → referred pain via the phrenic nerve (C3–C5)", true, "Referred pain."), o("The shoulder is injured", false, "No."), o("It is a sign of kidney stones", false, "No."), o("It indicates anxiety", false, "No."),
      ], ["Which nerve?", "Which structure is irritated?", "C3–5 keeps the diaphragm off the neck/shoulder.", "Diaphragmatic irritation."], "Same mechanism in ruptured spleen."),
      mcq("ec-c3", "consultant", "What would kill this patient and what are you worried about?", [
        o("Haemorrhagic shock", true, "Immediate."), o("Failure to give anti-D (alloimmunisation)", true, "Future pregnancies."), o("Infertility and recurrent ectopic", true, "Counsel."), o("Sepsis from tubal infection", true, "Possible."),
      ], ["ABC.", "Rhesus.", "Fertility.", "All."], "Ectopic is the leading cause of first-trimester maternal death."),
    ],
    chain: { risk: "Previous PID, IUCD, previous ectopic, smoking", patho: "Damaged tube → embryo implants in tube → invasion → rupture → haemoperitoneum", symptoms: "Amenorrhoea, lower abdominal pain, spotting, shoulder-tip pain, syncope", signs: "Shock, peritonism, cervical motion tenderness, adnexal tenderness", ix: "Urine hCG, FAST ultrasound, Hb/crossmatch, anti-D status", dx: "Ruptured tubal ectopic", mx: "Resuscitate + surgery; methotrexate only if stable/unruptured; anti-D", comp: "Death, anaemia, infertility, recurrent ectopic" },
    mustKnow: ["Pregnancy test for every woman of reproductive age with abdominal pain.", "Amenorrhoea + pain + shock = ruptured ectopic until proven otherwise.", "Unstable → theatre, not CT.", "Shoulder-tip pain = diaphragmatic irritation.", "Methotrexate only for stable, unruptured, β-hCG <5,000.", "Give anti-D to Rhesus-negative women.", "Counsel on recurrence and future pregnancy care."],
    thinkIf: [["Positive hCG + empty uterus on scan + pain", "Ectopic pregnancy."], ["Lower abdominal pain + fever + cervical motion tenderness", "Pelvic inflammatory disease."], ["Sudden severe unilateral pain + adnexal mass", "Ovarian torsion/cyst accident."]],
    revise: "ectopic pregnancy",
  },
  {
    id: "ob-labour", rotation: "obgyn", title: "Eighteen hours in labour with no progress", level: 3, setting: "Labour ward", tags: ["obstructed labour", "fetal distress", "partograph", "caesarean"], emergency: true,
    involved: ["Obstetric / gynaecological", "Infective / immune"],
    vignette: "A 18-year-old primigravida, a petite girl at 41 weeks, has been in labour for 18 hours at a peripheral health centre. She is exhausted and referred because the cervix has not progressed.",
    hsets: ["obs"], esets: ["general", "obs", "abcde"],
    hx: {
      onset: "Regular painful contractions for 18 hours; membranes ruptured 16 hours ago.", gp: "G1 P0, 41 weeks.", lnmp: "EDD 10 days ago; fundal height large.", anc: "Attended 3 visits; short stature (height 148 cm); no scan.", contr: "Strong contractions every 2 minutes, severe pain, she is exhausted.", leak: "Draining liquor — now offensive and greenish.", fm: "Reduced fetal movements for the last hour.", bleed: "No bleeding.", fever: "Feels hot and shivery.",
      pmh: "No chronic illness; HIV negative at booking.", drugs: "None; received IV oxytocin at the health centre for 4 hours.", social: "Delivered at a distance; transport took 3 hours.", prevob: "First pregnancy.",
    },
    hxKey: ["contr", "leak", "fm", "fever", "anc", "gp", "onset"],
    ex: {
      vit: "BP 128/82, pulse 124/min, RR 24/min, SpO₂ 98%, temperature 38.9 °C.", face: "Exhausted, dehydrated, dry lips.", ofh: "Fundal height 40 cm.", olie: "Longitudinal lie, cephalic, 4/5 palpable above the brim (not engaged); a ridge (Bandl’s ring) is visible above the umbilicus.", ofhr: "Fetal heart 172/min with late decelerations on the Doppler.",
      ouid: "Uterus hard and tonically contracted, tender over the lower segment; contractions every 90 seconds lasting 70 seconds.", ove: "Cervix 5 cm dilated, oedematous, thick and poorly applied; head high; large caput and severe moulding (+++); offensive meconium-stained liquor; the bladder is distended.",
      hydr: "Dehydrated.", oref: "Normal.", A: "Patent.", B: "Normal.", C: "HR 124.", D: "Alert.", E: "Bladder palpable.",
    },
    exKey: ["vit", "ouid", "olie", "ofhr", "ove"],
    ix: [
      { id: "part", group: "Bedside", label: "Partograph review", result: "Cervix 5 cm since 14 hours: crossed the action line; descent of the head 4/5 not changed; moulding +++; caput ++.", meaning: "Obstructed labour from cephalopelvic disproportion (CPD).", use: "key" },
      { id: "ctg", group: "Bedside", label: "CTG", result: "Baseline 172, reduced variability, recurrent late decelerations.", meaning: "Fetal hypoxia/distress.", use: "key" },
      { id: "fbc", group: "Blood", label: "FBC, group & crossmatch, lactate, glucose", result: "Hb 10.4, WBC 21 ×10⁹/L, lactate 4.1, glucose normal.", meaning: "Infection (chorioamnionitis) with exhaustion.", use: "key" },
      { id: "uri", group: "Bedside", label: "Catheterise: urine output and protein/blood", result: "300 mL dark urine; blood-stained urine.", meaning: "Distended bladder obstructing labour; haematuria warns of impending rupture/pressure injury.", use: "useful" },
      { id: "us", group: "Imaging", label: "Obstetric ultrasound", result: "Singleton cephalic, EFW 4.1 kg, oligohydramnios, FHR present.", meaning: "Macrosomic baby in a small pelvis.", use: "useful" },
      { id: "xray", group: "Imaging", label: "X-ray pelvimetry", result: "Not done.", meaning: "", use: "low", note: "No time and not helpful — decision is clinical." },
    ],
    interpret: [mcq("lab-i1", "interpretation", "Partograph crossed the action line; moulding +++, caput ++, contractions strong, Bandl’s ring, hot, fetal heart 172 with late decelerations. What is the diagnosis?", [
      o("Obstructed labour with chorioamnionitis and fetal distress — impending uterine rupture", true, "Every sign supports it."), o("Normal first stage", false, "No."), o("Hypotonic uterine inertia", false, "Contractions are strong."), o("Pre-eclampsia", false, "BP normal."),
    ], ["What is not descending?", "Why is the uterus so tense?", "What signs predict rupture?", "Obstructed labour."], "Signs of impending rupture: Bandl’s ring, tender lower segment, tonic uterus, haematuria.", { after: "part" })],
    ddx: [
      { name: "Obstructed labour (cephalopelvic disproportion) with fetal distress and chorioamnionitis", aliases: ["obstructed labour", "cpd", "cephalopelvic disproportion", "prolonged labour", "chorioamnionitis", "fetal distress"], tier: "likely", why: "Primigravida, short stature, big baby, prolonged labour, moulding, Bandl’s ring.", for: ["Short stature, 18 h, high head, moulding, caput", "Offensive liquor, fever, tachycardia"], against: ["None"], separate: { ask: "Duration, height, previous labours", exam: "Head station, moulding, Bandl’s ring", ix: "Partograph" } },
      { name: "Uterine inertia / hypotonic labour", aliases: ["inertia", "uterine inertia", "poor contractions", "hypotonic"], tier: "possible", why: "Primary dysfunction (weak contractions) delays progress.", for: ["Slow progress"], against: ["Contractions are strong, tonic"], separate: { ask: "Frequency of contractions", exam: "Contractions per 10 min", ix: "Tocodynamometry" } },
      { name: "Malpresentation (occipito-posterior, brow, face) or malposition", aliases: ["malpresentation", "occipito posterior", "brow", "face presentation", "malposition", "breech"], tier: "possible", why: "Can mimic CPD and cause obstructed labour.", for: ["Slow progress"], against: ["Cephalic vertex"], separate: { ask: "Back pain", exam: "Station and position on VE", ix: "Ultrasound" } },
      { name: "Uterine rupture / cord prolapse / sepsis", aliases: ["uterine rupture", "rupture", "cord prolapse", "sepsis", "maternal sepsis"], tier: "dangerous", why: "Impending complications of obstructed labour.", for: ["Tonic uterus, fever"], against: ["Not yet"], separate: { ask: "Sudden cessation of pain", exam: "Loss of contractions, palpable fetus", ix: "Hb, lactate" } },
    ],
    event: { when: "after-exam", title: "The pain stops", text: "While you are preparing for theatre she suddenly cries out, then the pain stops. She becomes pale, with a fast thready pulse. The abdomen is tender and the fetal parts are now easily palpable under the skin; no fetal heart is heard.", vitals: "BP 80/46, pulse 144, RR 30.", q: mcq("lab-ev", "emergency", "What do you do NOW? (select all)", [
      o("Resuscitate: two IV lines, oxygen, crystalloid/blood, broad-spectrum IV antibiotics", true, "Haemorrhage and sepsis."), o("Urgent laparotomy: repair or hysterectomy and deliver the fetus", true, "Definitive treatment for uterine rupture."), o("Call senior obstetrician, anaesthetist and theatre; inform the family", true, "Team response."), o("Continue labour and wait for delivery", false, "Fatal."),
    ], ["What just happened to the uterus?", "Which definitive treatment?", "What must you replace?", "Resuscitate and operate."], "Uterine rupture is a major cause of maternal and perinatal death in Kenya.") },
    dx: { q: mcq("lab-dx", "pathophysiology", "What is the best working diagnosis?", [
      o("Obstructed labour from CPD, complicated by chorioamnionitis, fetal distress and uterine rupture", true, "Complete picture."), o("Placental abruption", false, "No."), o("Normal labour", false, "No."), o("Placenta praevia", false, "No."),
    ], ["Why did the head not descend?", "What does a tonic uterus risk?", "Which infection?", "Obstructed labour."], "Prevention: partograph, early referral, caesarean for CPD."),
    },
    mgmt: mcq("lab-mx", "management", "Select correct management.", [
      o("Urgent caesarean section after resuscitation (IV fluids, antibiotics, catheter) — never oxytocin in obstructed labour", true, "Obstructed labour needs delivery by CS (or laparotomy if ruptured)."), o("Broad-spectrum IV antibiotics (ampicillin/gentamicin/metronidazole) for chorioamnionitis and post-operative care", true, "Treat sepsis."), o("Neonatal resuscitation team ready; manage a potentially infected, hypoxic baby", true, "Neonatal care."), o("Postoperative: monitor for PPH, fistula (VVF/RVF), sepsis; counsel on future births (CS)", true, "Complications."),
      o("Augment with oxytocin", false, "Contraindicated, risks rupture."), o("Attempt forceps/vacuum with a high head", false, "Contraindicated."),
    ], ["What do you never give in obstructed labour?", "What route of delivery?", "What infection to cover?", "Resuscitate, antibiotics, caesarean."], "Fistula (VVF) can develop after prolonged obstructed labour."),
    consultant: [
      mcq("lab-c1", "consultant", "Explain the partograph and its action line.", [
        o("A graph of cervical dilatation, descent, FHR, contractions and liquor; the action line (4 h right of the alert line) triggers intervention", true, "WHO partograph."), o("A graph of maternal weight", false, "No."), o("A fetal growth chart", false, "No."), o("A bleeding chart", false, "No."),
      ], ["What does it record?", "What is the alert line?", "What does crossing the action line mean?", "Dilatation + action line."], "Use it in every labour from 4 cm."),
      mcq("lab-c2", "pathophysiology", "Why does obstruction cause fistula and rupture?", [
        o("Prolonged pressure of the head on the bladder/vaginal wall causes ischaemic necrosis (fistula); the thinned lower segment tears under strong contractions (rupture)", true, "Both result from obstruction."), o("Because of infection alone", false, "No."), o("Because of hypertension", false, "No."), o("Because of fluid overload", false, "No."),
      ], ["Pressure or infection?", "What happens to blood supply?", "What happens to the lower segment?", "Ischaemia and thinning."], "Prevent with early caesarean."),
      mcq("lab-c3", "consultant", "What would kill this patient and the baby? (select all)", [
        o("Uterine rupture and haemorrhage", true, "Maternal."), o("Sepsis (chorioamnionitis)", true, "Maternal/neonatal."), o("Fetal hypoxia/asphyxia", true, "Perinatal."), o("VVF later (morbidity)", true, "Long-term."),
      ], ["Think mother, baby and the future.", "What is the fetal heart doing?", "What is the fever?", "All."], "A dead baby and a damaged mother are preventable."),
    ],
    chain: { risk: "Adolescent, short stature, macrosomia, CPD, late referral", patho: "Head cannot pass the pelvis → strong contractions against obstruction → thinning of lower segment, pressure necrosis, fetal hypoxia, infection", symptoms: "Exhaustion, continuous pain, reduced fetal movement, offensive liquor", signs: "Fever, Bandl’s ring, high head, moulding +++, caput, FHR abnormalities, distended bladder", ix: "Partograph (action line), CTG, FBC/lactate", dx: "Obstructed labour with chorioamnionitis (± ruptured uterus)", mx: "Resuscitate, antibiotics, emergency caesarean/laparotomy; no oxytocin", comp: "Uterine rupture, VVF/RVF, PPH, sepsis, fetal death" },
    mustKnow: ["Plot every labour on the partograph; act at the action line.", "Never give oxytocin in obstructed labour.", "Signs of impending rupture: Bandl’s ring, tonic uterus, haematuria.", "Moulding and caput are signs of obstruction, not progress.", "Emergency caesarean after resuscitation; antibiotics for chorioamnionitis.", "Catheterise the bladder; watch for fistula.", "Short stature and young age raise CPD risk."],
    thinkIf: [["Strong contractions + head not descending + moulding", "Obstructed labour."], ["Sudden cessation of pain + palpable fetal parts + shock", "Uterine rupture."], ["Fever in labour + offensive liquor + fetal tachycardia", "Chorioamnionitis."]],
    revise: "obstructed labour",
  },
  {
    id: "ob-pid", rotation: "obgyn", title: "Fever and lower abdominal pain with foul vaginal discharge", level: 2, setting: "Gynaecology ward", tags: ["pelvic inflammatory disease", "tubo-ovarian abscess", "sepsis", "STI"],
    involved: ["Obstetric / gynaecological", "Infective / immune"],
    vignette: "A 24-year-old woman presents with five days of lower abdominal pain, fever and a smelly yellow vaginal discharge. She is unable to walk upright because of the pain.",
    hsets: ["core"], esets: ["general", "abd"],
    hx: {
      onset: "Pain began after her last period 5 days ago; has become severe.", abd: "Lower abdominal pain both sides, worse on walking and with intercourse; foul vaginal discharge.", fever: "Fever and chills for 3 days.", gu: "Burning on urination.", sex: "Two partners in the last 3 months, inconsistent condom use; partner has a urethral discharge. HIV status unknown.",
      pmh: "No chronic illness.", drugs: "Took paracetamol.", gi: "Nausea, no vomiting; bowels normal.", wt: "No weight loss.", alc: "None.", smoke: "None.", cp: "None.", sob: "None.",
    },
    hxKey: ["abd", "fever", "sex", "gu", "onset"],
    hxExtra: [{ id: "lnmp2", group: "Gynaecology", label: "Last menstrual period, contraception, pregnancy possibility, IUCD", def: "LNMP 12 days ago; uses condoms occasionally; no IUCD; home pregnancy test negative.", why: "Exclude ectopic and pregnancy before treating." }],
    ex: {
      vit: "BP 106/66, pulse 112/min, RR 22/min, SpO₂ 98%, temperature 39.2 °C.", abdp: "Lower abdominal tenderness with guarding on both sides, worse on the right; rebound mild.", asc: "Normal bowel sounds.", abdi: "Slight lower abdominal distension.", liv: "No hepatomegaly; RUQ tender (perihepatitis possible).",
      nodes: "Tender inguinal lymph nodes.", mouth: "Dry.", hydr: "Mildly dehydrated.", pulse: "112/min.", pr: "Not indicated.", face: "Flushed.",
    },
    exKey: ["vit", "abdp", "hydr"],
    exExtra: [{ id: "pelvic", group: "Pelvic examination", label: "Speculum and bimanual pelvic examination", def: "Speculum: mucopurulent cervical discharge, friable cervix. Bimanual: cervical motion tenderness (chandelier sign), bilateral adnexal tenderness, tender fullness in the right adnexa.", looking: "Cervical motion tenderness + adnexal tenderness + discharge = PID; a mass suggests a tubo-ovarian abscess." }],
    ix: [
      { id: "preg", group: "Bedside", label: "Urine pregnancy test", result: "Negative.", meaning: "Excludes ectopic/miscarriage as the cause.", use: "key" },
      { id: "swab", group: "Microbiology", label: "High vaginal/endocervical swabs, NAAT for chlamydia/gonorrhoea, HIV/syphilis tests", result: "Gram stain: Gram-negative intracellular diplococci; chlamydia NAAT positive; HIV negative; VDRL negative.", meaning: "Gonorrhoea and chlamydia co-infection — typical for PID.", use: "key" },
      { id: "fbc", group: "Blood", label: "FBC, CRP", result: "WBC 18 ×10⁹/L (neutrophilia), CRP 164.", meaning: "Systemic inflammation/sepsis.", use: "useful" },
      { id: "us", group: "Imaging", label: "Transvaginal/pelvic ultrasound", result: "Right-sided complex adnexal mass 6 × 5 cm with thick walls and internal echoes (tubo-ovarian abscess); free fluid in the pouch of Douglas.", meaning: "Complicated PID with tubo-ovarian abscess.", use: "key" },
      { id: "urine", group: "Bedside", label: "Urinalysis", result: "Leucocytes ++, nitrites negative.", meaning: "Sterile pyuria is common with chlamydia.", use: "useful" },
      { id: "ct", group: "Imaging", label: "CT abdomen", result: "Not done.", meaning: "", use: "low", note: "Ultrasound is enough; reserve CT for an unclear picture." },
    ],
    interpret: [mcq("pid-i1", "interpretation", "Fever, bilateral lower abdominal tenderness, cervical motion tenderness, positive chlamydia and a 6 cm adnexal complex mass. What is the diagnosis?", [
      o("Acute PID complicated by a tubo-ovarian abscess", true, "Ascending infection."), o("Ruptured ovarian cyst", false, "No fever."), o("Ectopic pregnancy", false, "Negative test."), o("Acute appendicitis", false, "Bilateral tenderness with cervical signs."),
    ], ["Which organisms?", "What does a complex mass indicate?", "Which sign is classic?", "PID with TOA."], "TOA needs IV antibiotics and sometimes drainage.", { after: "us" })],
    ddx: [
      { name: "Acute pelvic inflammatory disease (± tubo-ovarian abscess)", aliases: ["pid", "pelvic inflammatory disease", "tubo-ovarian abscess", "toa", "salpingitis", "gonorrhoea", "chlamydia"], tier: "likely", why: "Sexually active, fever, bilateral lower abdominal pain, cervicitis and cervical motion tenderness.", for: ["Fever, discharge, cervical motion tenderness", "Risky sexual behaviour; partner with urethritis"], against: ["None"], separate: { ask: "Discharge, partner symptoms", exam: "Cervical motion tenderness", ix: "Swabs, NAAT, ultrasound" } },
      { name: "Ectopic pregnancy", aliases: ["ectopic", "ectopic pregnancy", "pregnancy"], tier: "dangerous", why: "Any woman of reproductive age with pain must have a pregnancy test.", for: ["Lower abdominal pain"], against: ["Negative pregnancy test, fever, discharge"], separate: { ask: "LNMP", exam: "Shock, adnexal mass", ix: "hCG, ultrasound" } },
      { name: "Acute appendicitis", aliases: ["appendicitis", "acute abdomen"], tier: "possible", why: "RIF pain with fever — appendicitis can mimic PID and vice versa.", for: ["Fever, right-sided tenderness"], against: ["Bilateral signs, discharge, cervical tenderness"], separate: { ask: "Migration of pain, anorexia", exam: "McBurney’s tenderness, cervical motion tenderness absent", ix: "Ultrasound/CT, WCC" } },
      { name: "Urinary tract infection / pyelonephritis, ruptured ovarian cyst/torsion, endometriosis", aliases: ["uti", "urinary tract infection", "pyelonephritis", "ovarian cyst", "torsion", "endometriosis"], tier: "possible", why: "Other causes of pelvic pain and fever.", for: ["Burning micturition"], against: ["Cervical findings"], separate: { ask: "Urinary symptoms, loin pain", exam: "Loin tenderness", ix: "Urine culture, ultrasound" } },
    ],
    twist: { text: "Twenty-four hours after starting oral antibiotics she is worse: temperature 39.8 °C, severe abdominal pain, tachycardia 128/min and BP 88/52. The mass has enlarged on repeat ultrasound.", q: mcq("pid-tw", "management", "What is the right escalation?", [
      o("Admit and give IV broad-spectrum antibiotics (ceftriaxone + doxycycline + metronidazole), IV fluids; consider drainage (image-guided or laparoscopic) of the tubo-ovarian abscess; sepsis bundle", true, "Failure of oral treatment, abscess, sepsis."), o("Continue oral antibiotics and reassure", false, "She is septic."), o("Discharge with analgesia", false, "Dangerous."), o("Give one dose of IM ceftriaxone only", false, "Insufficient for TOA."),
    ], ["Is she improving?", "Which route of antibiotics?", "What if the abscess persists?", "IV antibiotics and drainage."], "Treat the partner(s) and counsel on STI prevention.") },
    dx: { q: mcq("pid-dx", "pathophysiology", "What is the best working diagnosis and mechanism?", [
      o("Acute PID with right tubo-ovarian abscess: ascending infection from the cervix (Neisseria gonorrhoeae and Chlamydia trachomatis ± anaerobes) to uterus, tubes and ovaries", true, "Ascending infection."), o("Acute appendicitis", false, "No."), o("Ectopic pregnancy", false, "Negative test."), o("Endometriosis", false, "No."),
    ], ["Which organisms?", "Where does it ascend from?", "What organs are affected?", "Ascending PID."], "Complications: infertility, ectopic pregnancy, chronic pelvic pain, Fitz-Hugh–Curtis syndrome."),
    },
    mgmt: mcq("pid-mx", "management", "Select correct management.", [
      o("Antibiotics covering gonorrhoea, chlamydia and anaerobes: e.g. ceftriaxone IM/IV + doxycycline + metronidazole for 14 days; admit if severe or abscess", true, "Standard."), o("Test and treat partners; counsel on condoms; test for HIV/syphilis; remove IUCD only if no improvement", true, "Prevent reinfection."), o("Drain the abscess if >5–6 cm or not responding to antibiotics", true, "Source control."), o("Follow-up for fertility counselling and risk of ectopic pregnancy", true, "Long-term."),
      o("Treat gonorrhoea only", false, "Co-infection is common."), o("Wait for culture results before treating", false, "Treat empirically."),
    ], ["Which three groups of organisms?", "Who else needs treatment?", "When do you drain?", "Broad-spectrum, partners, drainage, counselling."], "Low threshold to treat PID — delay raises infertility risk."),
    consultant: [
      mcq("pid-c1", "consultant", "What are the minimum criteria for diagnosing PID? (select all)", [
        o("Lower abdominal tenderness", true, "Minimum criteria (CDC)."), o("Adnexal tenderness", true, "Minimum criteria."), o("Cervical motion tenderness", true, "Minimum criteria."), o("Positive pregnancy test", false, "That points to ectopic."),
      ], ["Three bimanual findings.", "Treat empirically.", "No pregnancy.", "First three."], "Low threshold to treat."),
      mcq("pid-c2", "pathophysiology", "What are the long-term complications and why do they occur?", [
        o("Tubal scarring → infertility, ectopic pregnancy, chronic pelvic pain; adhesions around the liver capsule (Fitz-Hugh–Curtis)", true, "Scar tissue obstructs and distorts the tubes."), o("Cervical cancer", false, "No."), o("Osteoporosis", false, "No."), o("Hyperthyroidism", false, "No."),
      ], ["What does infection leave behind?", "Why ectopic?", "What about the liver?", "Scarring."], "Educate young women about STI prevention."),
      mcq("pid-c3", "consultant", "What would kill this patient?", [
        o("Ruptured tubo-ovarian abscess → peritonitis and septic shock", true, "Surgical emergency."), o("Ectopic pregnancy if the test were positive", true, "Always exclude."), o("HIV co-infection complicating management", true, "Test."), o("Fitz-Hugh–Curtis syndrome", false, "Not life-threatening."),
      ], ["Think abscess.", "Think pregnancy.", "Think host.", "First two."], "Sepsis recognition and early antibiotics save lives."),
    ],
    chain: { risk: "Multiple partners, unprotected sex, STI, recent IUCD, young age", patho: "Ascending infection (Gonococcus, Chlamydia, anaerobes) → endometritis, salpingitis, tubo-ovarian abscess", symptoms: "Lower abdominal pain, fever, discharge, dyspareunia", signs: "Fever, tachycardia, lower abdominal guarding, cervical motion tenderness, adnexal mass", ix: "Pregnancy test, swabs/NAAT, FBC/CRP, pelvic ultrasound, HIV/syphilis", dx: "Acute PID with tubo-ovarian abscess", mx: "IV/IM antibiotics (ceftriaxone, doxycycline, metronidazole), drainage if needed, partner treatment", comp: "Infertility, ectopic pregnancy, chronic pelvic pain, sepsis" },
    mustKnow: ["Always exclude pregnancy first (ectopic).", "Diagnose PID on pelvic tenderness + cervical motion tenderness + adnexal tenderness; treat empirically.", "Cover gonorrhoea, chlamydia and anaerobes.", "TOA >5–6 cm or failing antibiotics: drain.", "Treat partners; test for HIV and syphilis.", "Complications: infertility, ectopic pregnancy.", "Counsel on condom use."],
    thinkIf: [["Fever + lower abdominal pain + cervical motion tenderness", "PID."], ["Amenorrhoea + pain + positive test", "Ectopic pregnancy."], ["PID + persistent fever + mass", "Tubo-ovarian abscess."]],
    revise: "pelvic inflammatory disease",
  },
]
