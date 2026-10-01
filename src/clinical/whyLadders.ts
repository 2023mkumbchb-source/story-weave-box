// "Why?" ladders: start from a bedside finding and keep asking why until you reach the physiology — then climb back up to the question you should ask the patient.
import type { MCQ } from "./types";
import { mcq, o } from "./templates";

export interface Ladder { id: string; title: string; rotation: "medicine" | "obgyn" | "paeds" | "surgery" | "psychiatry"; start: string; rungs: MCQ[]; takeaway: string }

/** Deterministic shuffle so the right answer is not always first. */
export function seeded<T>(arr: T[], seed: string): T[] {
  let h = 0; for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { h = (h * 1664525 + 1013904223) >>> 0; const j = h % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/** One rung: question, the right answer, three plausible wrong ones, and the physiology that explains it. */
const R = (id: string, q: string, right: string, wrong: [string, string, string], explain: string, hint?: string): MCQ =>
  mcq(id, "pathophysiology", q, seeded([o(right, true, explain), ...wrong.map((w) => o(w, false, "Not the mechanism — see the explanation below."))], id),
    [hint ?? "Go back one step: what changed physiologically?", `It starts with “${right.slice(0, 16)}…”.`, `Key idea: ${right.split(/[,;—]/)[0].slice(0, 60)}…`], explain);

export const LADDERS: Ladder[] = [
  {
    id: "orthopnoea", title: "Why does heart failure cause orthopnoea?", rotation: "medicine", start: "A man says he needs three pillows to sleep and wakes at night gasping.",
    rungs: [
      R("w-orth-1", "Why does lying flat make him more breathless?", "Blood from the legs and gut is redistributed to the chest, raising venous return to a ventricle that cannot pump it on", ["The diaphragm cannot move when lying flat", "Lying flat lowers the oxygen content of air", "The lungs fill with air more slowly when horizontal"], "Lying flat shifts about 500 ml from the lower body into the central circulation. A failing LV cannot handle the extra preload, so left atrial and pulmonary venous pressure rise."),
      R("w-orth-2", "Which force then drives fluid into the lung?", "Raised pulmonary capillary hydrostatic pressure, exceeding the oncotic pressure holding fluid in", ["Reduced capillary permeability", "Raised plasma oncotic pressure", "Reduced lymphatic flow only"], "Starling forces: when hydrostatic pressure in pulmonary capillaries rises above ~25 mmHg, fluid moves into the interstitium and alveoli, stiffening the lung and causing breathlessness."),
      R("w-orth-3", "Why does he wake at night gasping (PND)?", "Dependent oedema is reabsorbed when lying flat, and sleep reduces sympathetic drive so the failing heart copes less well", ["He is dreaming", "His airways narrow at night in everybody", "Nocturnal oxygen levels are always lower in heart disease only"], "Hours of lying down mobilise leg oedema fluid into the circulation, and lower overnight sympathetic tone reduces cardiac output — pulmonary pressure rises and wakes him."),
      R("w-orth-4", "Therefore, which question should you ask?", "“How many pillows do you sleep on, and do you wake at night short of breath needing to sit up?”", ["“Do you have a cough that is worse in the morning?”", "“Do you get chest pain after meals?”", "“Do you snore?”"], "Ask directly for the symptoms the mechanism predicts: orthopnoea (pillows), PND, nocturnal cough. This links the physiology to the history you take."),
    ],
    takeaway: "Posture → venous return → left atrial pressure → pulmonary capillary hydrostatic pressure → fluid in the lung → the symptom you ask about.",
  },
  {
    id: "oedema", title: "Why does this patient have oedema?", rotation: "medicine", start: "A patient presents with bilateral swollen legs.",
    rungs: [
      R("w-oed-1", "Which forces control the movement of fluid out of a capillary?", "Hydrostatic and oncotic pressures (Starling forces), capillary permeability and lymphatic drainage", ["Only the heart rate", "Only the sodium concentration", "The patient’s posture alone"], "Fluid leaves capillaries where hydrostatic pressure exceeds oncotic pressure. Oedema arises when hydrostatic pressure rises, oncotic pressure falls, permeability rises or lymph drainage fails."),
      R("w-oed-2", "Which diseases RAISE hydrostatic pressure?", "Heart failure, venous obstruction (DVT) and fluid overload (renal failure)", ["Cirrhosis and nephrotic syndrome only", "Sepsis and burns only", "Hypothyroidism only"], "Right heart failure and renal salt retention raise venous pressure and plasma volume. A DVT does so locally."),
      R("w-oed-3", "Which diseases LOWER oncotic pressure?", "Nephrotic syndrome, cirrhosis and malnutrition (low albumin)", ["Heart failure and pulmonary embolism", "Dehydration and diarrhoea", "Anaemia only"], "Albumin holds fluid inside the vessel. It is lost in urine (nephrotic), made poorly (cirrhosis) or not eaten (kwashiorkor)."),
      R("w-oed-4", "Therefore, how would you separate them at the bedside?", "JVP and heart sounds (cardiac), periorbital oedema and frothy urine (nephrotic), stigmata and ascites (liver), unilateral swelling (venous)", ["By feeling for warmth only", "By measuring the pulse only", "By counting the leg hairs"], "A systematic distinction: JVP raised in cardiac, normal/low in nephrotic and liver; protein in the urine; liver stigmata; unilateral or bilateral swelling."),
    ],
    takeaway: "Starling → raised pressure or lowered oncotic pressure → which organ → which bedside sign tells them apart.",
  },
  {
    id: "hyperkalaemia", title: "Why does hyperkalaemia change the ECG?", rotation: "medicine", start: "Potassium is 7.2 mmol/L and the T waves are tall and tented.",
    rungs: [
      R("w-k-1", "How does a high extracellular K⁺ affect the resting membrane potential?", "It makes the resting potential less negative (partial depolarisation)", ["It makes it more negative", "It has no effect on the membrane", "It abolishes the Na⁺/K⁺ pump"], "The resting potential is set by the K⁺ gradient. Raising extracellular K⁺ reduces the gradient so cells sit closer to threshold."),
      R("w-k-2", "Why does that widen the QRS and eventually stop the heart?", "Sodium channels stay inactivated, so conduction slows and eventually fails", ["Calcium channels open too long", "The Purkinje fibres become faster", "The sinus node speeds up"], "A less negative resting potential inactivates fast Na⁺ channels. Conduction slows (wide QRS, flat P waves), then sine-wave and VF/asystole."),
      R("w-k-3", "Why does calcium gluconate protect the heart?", "It raises the threshold potential, restoring the gap to the resting potential, without lowering K⁺", ["It lowers serum potassium immediately", "It removes potassium in urine", "It converts potassium to sodium"], "Calcium stabilises the membrane. It buys time (30–60 min) but does not lower potassium — you must also shift and remove it."),
      R("w-k-4", "Why do insulin and salbutamol lower potassium?", "They stimulate the Na⁺/K⁺-ATPase and drive potassium into cells", ["They stimulate renal excretion of potassium immediately", "They bind potassium in the gut", "They change the ECG only"], "Both stimulate the Na⁺/K⁺ pump (insulin via GLUT/pump activation, salbutamol via β₂ receptors). The total body potassium is unchanged, so the effect is temporary."),
    ],
    takeaway: "Membrane potential → sodium channels → conduction → ECG; protect (calcium), shift (insulin, salbutamol), remove (diuretic, resin, dialysis).",
  },
  {
    id: "dka", title: "Why does DKA cause fast, deep breathing?", rotation: "medicine", start: "A drowsy young woman is vomiting and breathing deeply and rapidly.",
    rungs: [
      R("w-dka-1", "Why do ketones accumulate?", "Insulin deficiency lets lipolysis and hepatic ketogenesis run unchecked", ["Excess insulin", "Excess dietary fat only", "Renal ketone production"], "Without insulin, adipose tissue releases fatty acids and the liver turns them into ketone bodies (acids)."),
      R("w-dka-2", "Why is she breathing deeply and fast?", "The respiratory centre compensates for metabolic acidosis by blowing off CO₂ (Kussmaul breathing)", ["Pneumonia has developed", "She is anxious", "Her lungs are stiff from oedema"], "H⁺ stimulates the chemoreceptors. Lowering pCO₂ raises the pH — an appropriate compensation, not lung disease."),
      R("w-dka-3", "Why is she profoundly dehydrated?", "Glucose above the renal threshold causes an osmotic diuresis, with vomiting adding to the losses", ["Because she drank too much", "Because ketones are diuretic", "Because insulin is a diuretic"], "Glycosuria drags water and electrolytes (Na⁺, K⁺, PO₄³⁻) into the urine; the deficit is typically 5–10 litres."),
      R("w-dka-4", "Why must you check potassium before starting insulin even if it is ‘normal’?", "Total body potassium is depleted, serum is kept up by acidosis and insulin lack, and insulin drives potassium into cells causing hypokalaemia", ["Insulin raises serum potassium", "Insulin causes hypernatraemia", "Potassium does not affect the heart"], "Acidosis shifts K⁺ out of cells and insulin lack prevents its uptake. Once treated, serum K⁺ falls steeply and can cause arrhythmia, so replace it."),
    ],
    takeaway: "No insulin → ketones → acidosis → Kussmaul breathing; glucose → osmotic diuresis → shock; K⁺ is the hidden danger.",
  },
  {
    id: "preeclampsia", title: "Why does pre-eclampsia cause hypertension and fits?", rotation: "obgyn", start: "A 22-year-old primigravida at 36 weeks has headache and BP 170/112.",
    rungs: [
      R("w-pe-1", "What is the underlying problem?", "Abnormal placentation with poor spiral-artery remodelling, causing placental ischaemia", ["Excessive maternal salt intake", "Fetal kidney disease", "Maternal thyroid disease"], "Shallow trophoblast invasion leaves high-resistance spiral arteries. The ischaemic placenta releases anti-angiogenic factors (sFlt-1)."),
      R("w-pe-2", "How does that raise the blood pressure?", "Widespread maternal endothelial dysfunction causes vasoconstriction and capillary leak", ["The fetus pushes on the aorta", "Increased maternal blood volume only", "Reduced heart rate"], "Endothelial injury reduces nitric oxide and prostacyclin and raises endothelin and thromboxane. Result: hypertension, proteinuria, oedema."),
      R("w-pe-3", "Why does she have headache and risk of seizures?", "Loss of cerebral autoregulation with hypertensive encephalopathy and cerebral oedema", ["The baby’s movements", "Anaemia", "High oestrogen alone"], "Severe hypertension overwhelms autoregulation; endothelial leak causes posterior reversible encephalopathy and fits (eclampsia)."),
      R("w-pe-4", "Why is delivery the definitive treatment?", "The placenta is the source of the disease; removing it reverses the process", ["Because the baby is the cause", "Because contractions lower BP", "Because bed rest is not working"], "Pre-eclampsia is a placental disease. Drugs (labetalol, magnesium) are only bridges to delivery."),
      R("w-pe-5", "Why give magnesium sulphate?", "It prevents and treats eclamptic seizures", ["It lowers BP quickly", "It induces labour", "It helps the baby’s lungs mature"], "Magnesium reduces seizure risk by about half; it is not an antihypertensive. Monitor reflexes, respiratory rate and urine output."),
    ],
    takeaway: "Placenta → endothelium → hypertension, proteinuria, brain → treat BP and seizures, then deliver.",
  },
  {
    id: "jaundice", title: "Why is pale stool with dark urine a clue?", rotation: "medicine", start: "A patient is jaundiced with pale stools and dark urine.",
    rungs: [
      R("w-jn-1", "Which three steps of bilirubin handling can fail?", "Before the liver (haemolysis), within the liver (uptake/conjugation/excretion) and after the liver (bile duct obstruction)", ["Only the gallbladder", "Only the kidney", "Only the spleen"], "Pre-hepatic, hepatic and post-hepatic — jaundice is a sign, never a diagnosis."),
      R("w-jn-2", "Why are the stools pale in obstruction?", "No bile reaches the gut, so there is no stercobilin", ["Because the liver stops making bilirubin", "Because the patient is not eating", "Because the kidney is failing"], "Stercobilin gives stool its colour. Biliary obstruction prevents bilirubin reaching the gut."),
      R("w-jn-3", "Why is the urine dark?", "Conjugated bilirubin is water-soluble and is filtered into the urine", ["Because of blood", "Because of unconjugated bilirubin", "Because of dehydration only"], "Unconjugated bilirubin is protein-bound and not filtered (so haemolytic jaundice has normal urine — acholuric)."),
      R("w-jn-4", "Therefore, which first investigations separate the three?", "Fractionated bilirubin, liver enzymes pattern (ALP/GGT vs ALT/AST), FBC/film and an abdominal ultrasound", ["Chest X-ray and ECG", "CT head", "Lumbar puncture"], "Unconjugated rise + anaemia → haemolysis; ALT/AST → hepatocellular; ALP/GGT + dilated ducts → obstruction."),
    ],
    takeaway: "Colour of stool and urine reflects where in the pathway bilirubin is blocked.",
  },
  {
    id: "shock", title: "Why is this patient in shock?", rotation: "medicine", start: "A patient has a BP of 78/40 and a pulse of 128.",
    rungs: [
      R("w-sh-1", "What is shock?", "Inadequate tissue perfusion and oxygen delivery relative to demand", ["A BP below 100 only", "A fast pulse only", "Loss of consciousness"], "Shock is a state of organ hypoperfusion; hypotension is a late sign."),
      R("w-sh-2", "What determines blood pressure?", "Cardiac output × systemic vascular resistance (CO = HR × SV)", ["Heart rate only", "Blood glucose", "Haemoglobin"], "To find the cause, ask which of preload, pump, afterload or tone has failed."),
      R("w-sh-3", "Which four patterns of shock follow?", "Hypovolaemic, cardiogenic, obstructive and distributive", ["Septic, allergic, toxic, neurogenic only", "Acute, subacute, chronic, terminal", "Arterial, venous, capillary, lymphatic"], "Low volume, failed pump, blocked flow (PE, tamponade, tension pneumothorax) or vasodilated circulation (sepsis, anaphylaxis, neurogenic)."),
      R("w-sh-4", "How do you tell them apart quickly?", "JVP (low in hypovolaemia/distributive, high in cardiogenic/obstructive), peripheral temperature, chest signs and the story", ["Only a blood culture", "Only an X-ray", "By the patient’s age"], "Cold and wet with a high JVP = pump; cold and dry with a low JVP = volume; warm and vasodilated = distributive; high JVP with quiet heart sounds or absent breath sounds = obstructive."),
    ],
    takeaway: "Pump, pipes, pressure, volume — and the JVP is your best bedside discriminator.",
  },
  {
    id: "hypoxia", title: "Why is this patient hypoxic — and why doesn’t oxygen fix it?", rotation: "medicine", start: "A patient has SpO₂ 86% despite oxygen by mask.",
    rungs: [
      R("w-hy-1", "Name the mechanisms of hypoxaemia.", "Hypoventilation, ventilation–perfusion mismatch, shunt and diffusion impairment", ["Anaemia and carbon monoxide only", "Poor appetite", "Low body temperature"], "These are the four lung causes (and low inspired O₂ at altitude)."),
      R("w-hy-2", "Why does a true shunt not correct with oxygen?", "Blood passes through unventilated lung and never meets the extra oxygen", ["Oxygen is destroyed", "Haemoglobin repels oxygen", "The oxygen never reaches the nose"], "In consolidation, atelectasis or a right-to-left cardiac shunt, shunted blood stays desaturated and dilutes the oxygenated blood."),
      R("w-hy-3", "Which disease gives V/Q mismatch with dead space?", "Pulmonary embolism: ventilated lung that is not perfused", ["Pneumonia", "Pulmonary oedema", "Pneumothorax"], "In PE, ventilated but unperfused alveoli add dead space; reflex vasoconstriction diverts blood to poorly ventilated areas, causing hypoxaemia."),
      R("w-hy-4", "Therefore, what do you look for to find the mechanism?", "Chest signs (consolidation, effusion, wheeze), JVP, leg swelling and the CXR / blood gas", ["Only the pulse", "Only the weight", "Only the temperature"], "Focal signs suggest shunt (pneumonia), clear chest with raised JVP/calf swelling suggests PE, bibasal crackles suggest oedema."),
    ],
    takeaway: "Four mechanisms; shunt does not correct with oxygen; look for the signs that label which one it is.",
  },
  {
    id: "ascites", title: "Why does cirrhosis cause ascites?", rotation: "medicine", start: "A man with chronic alcohol use has a swollen abdomen and shifting dullness.",
    rungs: [
      R("w-as-1", "What raises the pressure in the portal system?", "Fibrosis increases intrahepatic resistance, producing portal hypertension", ["Increased bile flow", "High pulmonary pressure", "Gallstones"], "Cirrhosis distorts the hepatic architecture, raising resistance to portal flow and hydrostatic pressure in splanchnic capillaries."),
      R("w-as-2", "What second force favours fluid leaving the vessels?", "Low albumin from reduced hepatic synthesis lowers oncotic pressure", ["High albumin", "Excessive sodium in the blood", "A high haematocrit"], "The cirrhotic liver makes less albumin, so oncotic pressure falls."),
      R("w-as-3", "Why does the kidney then retain salt and water?", "Splanchnic vasodilation reduces effective arterial volume, activating RAAS and ADH", ["The kidney fails to make urine from the start", "The bowel absorbs too much water", "The adrenal gland shrinks"], "Nitric-oxide-mediated splanchnic vasodilation lowers effective circulating volume, driving sodium and water retention."),
      R("w-as-4", "How do you tell it from cardiac ascites at the bedside?", "Check the JVP (high in cardiac), liver stigmata, and ascitic fluid SAAG and protein", ["By the colour of the nails only", "By palpating the knees", "They are always identical"], "A SAAG ≥ 11 g/L indicates portal hypertension (cirrhosis or heart failure); high protein (> 25 g/L) points to a cardiac cause."),
    ],
    takeaway: "Portal pressure + low albumin + renal salt retention = ascites; the JVP separates liver from heart.",
  },
  {
    id: "icp", title: "Why does raised intracranial pressure cause Cushing’s triad?", rotation: "medicine", start: "A head-injured man has a falling GCS, BP 190/100, pulse 48 and irregular breathing.",
    rungs: [
      R("w-icp-1", "What is the Monro–Kellie doctrine?", "The skull is a closed box: brain, blood and CSF share a fixed volume, so a rise in one must displace the others or raise pressure", ["The brain can expand freely", "CSF is made only in the ventricles", "The skull stretches in adults"], "Once compensation (CSF and venous blood displacement) is exhausted, ICP rises steeply with small volume changes."),
      R("w-icp-2", "Why does the BP rise?", "To maintain cerebral perfusion when ICP is high (CPP = MAP − ICP), the brainstem drives sympathetic hypertension", ["Because of pain only", "Because the heart is failing", "Because of dehydration"], "The Cushing response preserves perfusion at the cost of high BP."),
      R("w-icp-3", "Why bradycardia and irregular breathing?", "Baroreceptor reflex to the high BP and brainstem compression disturb the respiratory centres", ["Hypothermia", "Beta-blocker overdose", "Anxiety"], "A late, ominous triad that precedes coning."),
      R("w-icp-4", "Why is a lumbar puncture dangerous here?", "Removing CSF below a pressure gradient can pull the brainstem down through the foramen magnum (coning)", ["It causes infection", "It lowers blood glucose", "It causes pneumothorax"], "Get a CT first when there is focal deficit, reduced GCS, papilloedema or seizures."),
    ],
    takeaway: "Fixed box → pressure → Cushing’s response → coning: that is why you CT before you LP.",
  },
  {
    id: "neojaundice", title: "Why is jaundice in the first 24 hours of life dangerous?", rotation: "paeds", start: "A newborn is visibly yellow on day 1.",
    rungs: [
      R("w-nj-1", "Why do most newborns get mildly jaundiced after day 2?", "High red-cell mass with a short lifespan, immature hepatic conjugation and increased enterohepatic recirculation", ["The liver is overactive", "They drink too much milk", "The kidney excretes too much"], "Physiological jaundice peaks around day 3–5 and is mild."),
      R("w-nj-2", "Why is jaundice at < 24 hours pathological?", "It suggests rapid haemolysis (ABO/Rh incompatibility, G6PD), infection or another serious cause", ["It is normal", "It is due to breastfeeding", "It is due to vitamin K"], "Physiological jaundice cannot appear that early; assume haemolysis until proved otherwise."),
      R("w-nj-3", "Why is unconjugated bilirubin dangerous to the brain?", "It is lipid-soluble and crosses the immature blood–brain barrier, depositing in the basal ganglia (kernicterus)", ["It is water-soluble and floods the kidney", "It directly clots blood", "It only affects the skin"], "Acute bilirubin encephalopathy causes lethargy, hypotonia, poor feeding, then opisthotonos and high-pitched cry."),
      R("w-nj-4", "Why does phototherapy work?", "Light converts bilirubin into water-soluble isomers that are excreted without conjugation", ["It kills bacteria", "It destroys red cells", "It speeds up the liver"], "Blue light (460–490 nm) causes photoisomerisation — exchange transfusion is the next step if levels keep rising."),
    ],
    takeaway: "Timing of jaundice tells you whether it is physiological or a haemolytic emergency.",
  },
  {
    id: "thyroid", title: "Why can hyperthyroidism look like panic?", rotation: "psychiatry", start: "A 28-year-old woman has palpitations, tremor and a sense of dread.",
    rungs: [
      R("w-th-1", "Why is the heart rate fast?", "Thyroid hormone up-regulates β-adrenergic receptors and raises the metabolic rate", ["Because of a fever only", "Because of anaemia", "Because the sympathetic system is damaged"], "T3 increases β-receptor number and sensitivity, giving tremor, tachycardia and sweating."),
      R("w-th-2", "Why the weight loss despite a good appetite and heat intolerance?", "A hypermetabolic state with increased thermogenesis and calorie consumption", ["Malabsorption", "Depression", "Reduced thyroid hormone"], "These help to distinguish thyrotoxicosis from anxiety."),
      R("w-th-3", "Why do β-blockers help symptoms?", "They block the adrenergic effects of excess thyroid hormone", ["They reduce thyroid hormone production", "They kill thyroid cells", "They replace thyroid hormone"], "Propranolol also reduces peripheral T4→T3 conversion; antithyroid drugs treat the cause."),
      R("w-th-4", "Which findings separate thyrotoxicosis from a primary panic disorder?", "Weight loss, heat intolerance, goitre/bruit, eye signs, fine tremor persisting between attacks and a suppressed TSH", ["The patient’s age", "How loudly she describes the fear", "A history of anxiety in childhood"], "Never label panic before checking TSH, ECG and glucose."),
    ],
    takeaway: "Organic mimics of anxiety: thyroid, arrhythmia, hypoglycaemia, phaeochromocytoma, stimulants.",
  },
  {
    id: "umn", title: "Why is upper motor neuron weakness spastic?", rotation: "medicine", start: "A man with a stroke has a stiff, weak right arm and brisk reflexes.",
    rungs: [
      R("w-um-1", "What is lost in an UMN lesion?", "Descending inhibitory influence on the anterior horn cell, so reflex arcs become overactive", ["The anterior horn cell itself", "The muscle fibres", "The neuromuscular junction"], "Cortico-spinal and other descending tracts normally modulate spinal reflexes. Without them: spasticity, hyperreflexia, clonus, upgoing plantar."),
      R("w-um-2", "Why is a LMN lesion flaccid, wasted and fasciculating?", "The final common pathway to the muscle is destroyed — loss of the trophic and motor signal", ["Excess inhibition", "Excess upper motor neuron input", "A muscle disease only"], "LMN: reduced tone, wasting, fasciculation, absent or reduced reflexes."),
      R("w-um-3", "Which examination findings separate UMN from LMN?", "Tone, reflexes, plantar response, fasciculation and pattern of weakness", ["Colour of the skin", "Height", "Temperature"], "Pyramidal pattern (extensors in arm, flexors in leg) suggests UMN."),
      R("w-um-4", "Therefore, how do you localise a lesion with face, arm and leg weakness on one side?", "A contralateral cortical or internal capsule lesion, depending on the cortical features and the face involvement", ["A peripheral nerve lesion in the arm only", "A muscle disease", "A spinal cord lesion below C5"], "Add cortical signs (aphasia, neglect, field defect) → cortical; pure motor hemiparesis → capsule/lacunar; crossed signs → brainstem."),
    ],
    takeaway: "Descending inhibition lost → spasticity; final common pathway lost → flaccid weakness; the examination tells you where.",
  },
];
