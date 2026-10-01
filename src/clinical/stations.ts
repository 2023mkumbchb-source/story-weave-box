// Imaging and "pictorial" stations: describe → interpret → diagnose → differential → next step.
// ECGs are drawn live from the rhythm kind; the other images are written as the report a radiologist/examiner would give.
import type { MCQ, Rotation } from "./types";
import { mcq, o } from "./templates";

export type EcgKind = "af" | "stemi" | "hyperk" | "chb" | "svt" | "pe" | "flutter" | "vt";
export interface Station {
  id: string; kind: "ecg" | "cxr" | "ct" | "us" | "xr" | "sign"; rotation: Rotation; title: string;
  ecg?: EcgKind; clinical: string; stimulus: string; steps: MCQ[]; link?: string;
}

const S = (id: string, kind: Station["kind"], rotation: Rotation, title: string, clinical: string, stimulus: string, steps: MCQ[], ecg?: EcgKind): Station => ({ id, kind, rotation, title, clinical, stimulus, steps, ecg });

export const STATIONS: Station[] = [
  S("ecg-af", "ecg", "medicine", "Palpitations and breathlessness", "A 68-year-old woman with hypertension has had palpitations for two days. Pulse is fast and irregular, BP 118/74.", "Rhythm strip, lead II. Compare the baseline between the QRS complexes and the spacing of the QRS complexes.", [
    mcq("ecg-af1", "imaging", "Describe the tracing. (select all that apply)", [
      o("Irregularly irregular R–R intervals", true, "No pattern to the spacing — the classic ‘irregularly irregular’ rhythm."),
      o("No distinct P waves; a chaotic fibrillating baseline", true, "Disorganised atrial activity replaces P waves."),
      o("Narrow QRS complexes", true, "Ventricular conduction is normal, so QRS is narrow."),
      o("Regular saw-tooth flutter waves at 300/min", false, "That is atrial flutter, which is regular."),
    ], ["Look at the gaps between R waves. Is there any pattern?", "Is there a P wave before every QRS?", "Describe rate, rhythm, P waves, QRS width.", "Irregular + no P + narrow QRS."], "Always describe systematically: rate, rhythm, axis, P waves, PR interval, QRS, ST segment, T wave."),
    mcq("ecg-af2", "imaging", "What is the diagnosis?", [
      o("Atrial fibrillation with a rapid ventricular response", true, "Irregularly irregular with no P waves."),
      o("Atrial flutter with variable block", false, "Flutter has regular saw-tooth waves."),
      o("Sinus arrhythmia", false, "P waves would be present before each QRS."),
      o("Ventricular tachycardia", false, "VT is wide-complex and regular."),
    ], ["Which rhythm is irregularly irregular?", "Absent P waves means no organised atrial activation.", "Think of the commonest sustained arrhythmia.", "AF."], "AF is the commonest sustained arrhythmia. The atria quiver; the AV node lets through impulses at random."),
    mcq("ecg-af3", "imaging", "What should you look for as the cause or complication? (select all that apply)", [
      o("Hyperthyroidism (check TSH)", true, "A treatable cause of new AF."),
      o("Mitral valve disease and heart failure (echo)", true, "Valvular and structural disease drive AF."),
      o("Alcohol, sepsis, electrolyte disturbance", true, "Common reversible triggers."),
      o("Stroke risk from atrial thrombus", true, "AF causes stasis in the left atrial appendage."),
      o("Nothing — AF is always benign", false, "AF carries a significant stroke risk."),
    ], ["AF has causes. Think ‘from the thyroid to the valve’.", "What happens to blood in a quivering atrium?", "What is the commonest serious complication?", "Thyroid, valves, hypertension, alcohol; stroke."], "Treat the cause, control rate or rhythm, and anticoagulate according to the CHA₂DS₂-VASc score."),
    mcq("ecg-af4", "imaging", "She is haemodynamically stable. What is the best next step?", [
      o("Rate control (β-blocker or diltiazem), look for the cause, assess stroke risk and anticoagulate", true, "Stable AF: control the rate, find the cause, prevent stroke."),
      o("Immediate synchronised DC cardioversion", false, "Reserved for the unstable patient."),
      o("IV adenosine", false, "Adenosine unmasks flutter but does not treat AF."),
      o("Reassure and send her home with no tests", false, "Needs a cause search and stroke prevention."),
    ], ["Is she stable or unstable?", "Instability (shock, chest pain, pulmonary oedema) would need electricity.", "What do we do for a stable patient?", "Rate control + cause + anticoagulation."], "Choose by haemodynamic status first, then rate, then risk."),
  ], "af"),

  S("ecg-stemi", "ecg", "medicine", "Crushing chest pain", "A 55-year-old diabetic truck driver has had 90 minutes of central chest tightness with sweating.", "Chest leads V1–V4. Look at the ST segment immediately after the QRS and compare it with the baseline.", [
    mcq("ecg-st1", "imaging", "Describe the key abnormality.", [
      o("Marked ST-segment elevation in the anterior leads", true, "The ST segment rises above the baseline — ‘tombstone’ shape."),
      o("Deep, symmetrical T-wave inversion without ST elevation", false, "That describes ischaemia or NSTEMI/Wellens, not what is seen."),
      o("Tall tented T waves with wide QRS", false, "Hyperkalaemia."),
      o("Normal tracing", false, "Not normal."),
    ], ["Look at the segment after the QRS.", "Is it on the baseline, above or below?", "The ST segment is elevated.", "ST elevation in V1–V4."], "ST elevation in contiguous leads with symptoms = STEMI."),
    mcq("ecg-st2", "imaging", "Which coronary artery is most likely to be occluded?", [
      o("Left anterior descending artery", true, "Anterior leads V1–V4 reflect the LAD territory."),
      o("Right coronary artery", false, "RCA causes inferior changes (II, III, aVF)."),
      o("Left circumflex artery", false, "Circumflex causes lateral changes (I, aVL, V5–V6)."),
      o("Posterior descending artery", false, "Posterior: ST depression V1–V3 with tall R waves."),
    ], ["Anatomy of the leads: V1–V4 look at the front wall.", "Which vessel supplies the anterior septum and anterior wall?", "It is the ‘widow-maker’.", "LAD."], "Match the leads to the territory: inferior = RCA, anterior = LAD, lateral = LCx."),
    mcq("ecg-st3", "imaging", "Which two are the most urgent actions? (select all that apply)", [
      o("Aspirin and urgent reperfusion (primary PCI or thrombolysis)", true, "Time is myocardium."),
      o("Check for contraindications to thrombolysis and cardiac monitoring", true, "Aortic dissection and bleeding must be excluded; VF can follow."),
      o("Wait for the troponin result before acting", false, "STEMI is a clinical and ECG diagnosis — do not wait."),
      o("Discharge with GTN spray", false, "Unsafe."),
    ], ["STEMI is a time-critical emergency.", "What happens if you wait for troponin?", "What is the treatment of an occluded artery?", "Aspirin + reperfusion + monitoring."], "Never wait for a biomarker when ST elevation is present."),
    mcq("ecg-st4", "imaging", "Which findings would make you stop and reconsider thrombolysis?", [
      o("Tearing chest pain radiating to the back with unequal arm BPs", true, "Suggests aortic dissection."),
      o("Pain relieved by sitting forward with a friction rub", false, "Pericarditis — but this is a different problem, not a thrombolysis contraindication."),
      o("A normal, regular pulse", false, "Does not matter."),
      o("Sweating", false, "Typical of MI, not an exclusion."),
    ], ["What disease can mimic STEMI and be made worse by lysis?", "Think of a tear in the aorta.", "Which finding would point to it?", "Unequal BPs and tearing pain."], "Before lysis always ask: could this be dissection?"),
  ], "stemi"),

  S("ecg-hyperk", "ecg", "medicine", "Weak and passing little urine", "A 58-year-old diabetic man with 4 days of vomiting, poor urine output and weakness. K⁺ result pending.", "Rhythm strip with leads V2–V4. Note the shape of the T waves and the width of the QRS.", [
    mcq("ecg-hk1", "imaging", "Describe the tracing. (select all that apply)", [
      o("Tall, narrow, peaked (‘tented’) T waves", true, "The earliest ECG change of hyperkalaemia."),
      o("Widened QRS complexes", true, "Prolonged ventricular depolarisation as K⁺ rises."),
      o("Flattened or absent P waves", true, "Atrial muscle is paralysed first."),
      o("Marked ST elevation", false, "Not the pattern here."),
    ], ["T waves first. Are they tall or flat?", "What happens to P waves in hyperkalaemia?", "What does a widening QRS mean?", "Peaked T, flat P, wide QRS."], "The progression: peaked T → flattened P → wide QRS → sine wave → VF/asystole."),
    mcq("ecg-hk2", "imaging", "What is the most likely abnormality?", [
      o("Severe hyperkalaemia", true, "ECG changes mean it is dangerous."),
      o("Hypokalaemia", false, "Gives flat T waves, U waves."),
      o("Hypocalcaemia", false, "Long QT with a prolonged ST segment."),
      o("Hypomagnesaemia", false, "Torsades risk but not peaked T."),
    ], ["Which electrolyte makes T waves peaked?", "Think potassium.", "High or low?", "Hyperkalaemia."], "An ECG changes with potassium level and is a marker of urgency."),
    mcq("ecg-hk3", "imaging", "What is the FIRST drug you give?", [
      o("Calcium gluconate IV", true, "Stabilises the cardiac membrane immediately — it protects the heart but does not lower potassium."),
      o("Insulin with dextrose", false, "Lowers potassium within 15–30 minutes but does not protect the membrane."),
      o("Salbutamol nebulised", false, "Helps shift potassium into cells; second step."),
      o("Furosemide", false, "Removes potassium slowly, only if the kidney responds."),
    ], ["The heart is in danger now. What protects it quickly?", "A membrane stabiliser.", "It is a salt of calcium.", "Calcium gluconate."], "Protect, shift, remove — in that order."),
    mcq("ecg-hk4", "imaging", "After protecting the heart, what shifts potassium into cells? (select all)", [
      o("Insulin (10 units) with 50 ml of 50% dextrose", true, "Drives K⁺ into cells."),
      o("Nebulised salbutamol 10 mg", true, "β₂-agonist action on Na⁺/K⁺-ATPase."),
      o("IV sodium bicarbonate if acidotic", true, "Shifts K⁺ in exchange for H⁺ in acidosis."),
      o("Oral calcium chloride", false, "Not a shift agent."),
    ], ["Which hormone moves glucose into cells and potassium with it?", "A bronchodilator has this effect too.", "Acidosis moves K⁺ out of cells.", "Insulin + dextrose, salbutamol, bicarbonate."], "Shifting is temporary; removal (diuresis, resin, dialysis) is definitive."),
  ], "hyperk"),

  S("ecg-chb", "ecg", "medicine", "Collapse with a slow pulse", "A 74-year-old man collapsed twice today. Pulse 38/min, BP 88/50, clear chest.", "Rhythm strip. Compare the rate of the P waves and the QRS complexes and check if they are related.", [
    mcq("ecg-chb1", "imaging", "Describe the tracing.", [
      o("Regular P waves and regular QRS complexes, each at its own rate, with no fixed relationship", true, "AV dissociation: atria and ventricles beat independently."),
      o("Lengthening PR interval until a beat is dropped", false, "Mobitz I (Wenckebach)."),
      o("Constant long PR interval, every P conducted", false, "First-degree block."),
      o("Irregularly irregular without P waves", false, "AF."),
    ], ["Are the P waves related to the QRS complexes?", "Which is faster: atrial or ventricular rate?", "Complete = nothing gets through.", "AV dissociation."], "Complete (third-degree) heart block: the ventricular escape rhythm is slow and unreliable."),
    mcq("ecg-chb2", "imaging", "What is the diagnosis?", [
      o("Complete (third-degree) heart block", true, "Atrial rate exceeds ventricular rate with no relationship."),
      o("Sinus bradycardia", false, "P waves would each be followed by a QRS."),
      o("Mobitz type II", false, "Intermittently dropped beats with constant PR."),
      o("Atrial flutter", false, "Regular saw-tooth waves."),
    ], ["No relationship between P and QRS is called?", "The block is complete.", "AV node fails totally.", "Third-degree block."], "Name the block by the relationship between P and QRS."),
    mcq("ecg-chb3", "imaging", "She is unstable. What do you do first?", [
      o("IV atropine and prepare for transcutaneous or transvenous pacing", true, "Bradycardia with shock: atropine first; pace if no response."),
      o("Beta-blocker", false, "Would worsen the block."),
      o("Reassure and observe", false, "Unstable."),
      o("DC cardioversion", false, "For tachyarrhythmias."),
    ], ["Bradycardia with hypotension is unstable.", "A vagolytic drug increases AV conduction.", "A device is the definitive answer.", "Atropine then pacing."], "Treat the patient’s state: instability changes the algorithm."),
    mcq("ecg-chb4", "imaging", "Which causes should you actively look for? (select all that apply)", [
      o("Inferior myocardial infarction", true, "RCA supplies the AV node."),
      o("Drugs: digoxin, β-blockers, verapamil", true, "Common reversible causes."),
      o("Degenerative fibrosis of the conduction system in the elderly", true, "Most common chronic cause."),
      o("Hyperkalaemia and Lyme / Chagas / rheumatic disease", true, "Infiltrative and infective causes."),
    ], ["Which artery supplies the AV node?", "Which drugs slow the AV node?", "Age is a cause too.", "All of them."], "Always search for a reversible cause before the pacemaker."),
  ], "chb"),

  S("ecg-svt", "ecg", "medicine", "Sudden palpitations in a young woman", "A 28-year-old woman has sudden-onset racing heart for 30 minutes, with dizziness. Pulse 190, BP 100/60.", "Rhythm strip. Observe the rate, regularity and QRS width.", [
    mcq("ecg-svt1", "imaging", "Describe the tracing.", [
      o("Regular narrow-complex tachycardia at about 190/min without visible P waves", true, "Classic SVT."),
      o("Irregularly irregular tachycardia", false, "AF."),
      o("Wide-complex tachycardia", false, "VT."),
      o("Sinus tachycardia with P waves before every QRS", false, "Slower, with visible P waves."),
    ], ["Regular or irregular?", "Narrow or wide?", "Any P waves?", "Regular, narrow, fast."], "Narrow regular tachycardia at 150–220 = SVT (AVNRT/AVRT)."),
    mcq("ecg-svt2", "imaging", "She is stable. What do you do first?", [
      o("Vagal manoeuvre (modified Valsalva)", true, "Slows AV conduction, often terminating SVT."),
      o("Immediate DC cardioversion", false, "Reserved for instability."),
      o("IV amiodarone", false, "Not first-line."),
      o("IV adenosine without monitoring", false, "Adenosine is second-line after vagal manoeuvres and needs monitoring."),
    ], ["She is stable. Try the least invasive method.", "Valsalva and carotid sinus massage.", "Increases vagal tone at the AV node.", "Vagal manoeuvre."], "Escalate only when needed."),
    mcq("ecg-svt3", "imaging", "Vagal manoeuvres fail. What is next?", [
      o("IV adenosine 6 mg rapid bolus (then 12 mg)", true, "Transiently blocks the AV node, breaking the re-entrant circuit."),
      o("Verapamil in a patient on β-blockers", false, "Dangerous combination."),
      o("Oral digoxin", false, "Slow onset."),
      o("Do nothing", false, "She remains symptomatic and risks deterioration."),
    ], ["A drug that briefly stops the AV node.", "Has a half-life of seconds.", "Warn the patient about chest tightness.", "Adenosine."], "Warn: transient asystole, flushing and chest tightness are expected."),
    mcq("ecg-svt4", "imaging", "Which patient should NOT receive adenosine?", [
      o("A patient with severe asthma", true, "Adenosine can cause bronchospasm."),
      o("A young woman with regular narrow-complex SVT", false, "Perfect indication."),
      o("A patient with SVT who is stable", false, "No contraindication."),
      o("A patient with a pulse of 180 and a narrow QRS", false, "Indication."),
    ], ["Think about adverse effects of adenosine.", "It acts on A₁ receptors in the airway too.", "Which lung disease?", "Asthma."], "Always check contraindications before giving drugs."),
  ], "svt"),

  S("ecg-pe", "ecg", "medicine", "Sudden breathlessness after surgery", "A 38-year-old woman, five days after a hysterectomy, has sudden breathlessness and pleuritic chest pain. HR 118, SpO₂ 89%.", "12-lead ECG, limb and chest leads.", [
    mcq("ecg-pe1", "imaging", "What is the commonest ECG finding in PE?", [
      o("Sinus tachycardia", true, "The commonest finding, ahead of S1Q3T3."),
      o("S1Q3T3 pattern", false, "Classic but present in a minority."),
      o("ST elevation V1–V4", false, "Not typical."),
      o("Bradycardia", false, "Unusual."),
    ], ["It is not the textbook sign.", "A non-specific finding.", "Rate.", "Sinus tachycardia."], "S1Q3T3, right axis deviation and RBBB are the textbook but rare findings."),
    mcq("ecg-pe2", "imaging", "Which signs suggest right heart strain? (select all)", [
      o("T-wave inversion in V1–V4", true, "Right ventricular strain pattern."),
      o("New right bundle branch block", true, "Right ventricular pressure overload."),
      o("S1Q3T3 pattern", true, "Classic."),
      o("Left axis deviation", false, "PE gives right axis deviation."),
    ], ["Which ventricle is under strain in PE?", "Right-sided leads V1–V4.", "Right BBB.", "T inversion, RBBB, S1Q3T3."], "ECG helps but cannot rule PE in or out."),
    mcq("ecg-pe3", "imaging", "What is the next best test if she is stable?", [
      o("CT pulmonary angiogram", true, "Gold-standard imaging in most hospitals."),
      o("Repeat the ECG until it shows S1Q3T3", false, "Insensitive."),
      o("Bronchoscopy", false, "Not indicated."),
      o("Discharge with analgesia", false, "Unsafe."),
    ], ["Which test visualises the pulmonary arteries?", "Radiation and contrast are acceptable if the benefit is clear.", "CTPA.", "CT pulmonary angiogram."], "Wells score → D-dimer if low risk, CTPA if high risk."),
    mcq("ecg-pe4", "imaging", "Which therapy should be started while waiting for imaging if suspicion is high?", [
      o("Therapeutic anticoagulation (LMWH)", true, "Do not wait when probability is high and the bleeding risk acceptable."),
      o("Thrombolysis for everyone", false, "Reserved for massive PE with shock."),
      o("Antibiotics", false, "Not indicated."),
      o("Furosemide", false, "Not helpful."),
    ], ["Prevent propagation.", "Which drug stops clots growing?", "Heparin.", "LMWH."], "High clinical probability justifies empirical anticoagulation."),
  ], "pe"),

  S("cxr-hf", "cxr", "medicine", "Breathless with swollen legs", "A 62-year-old man with hypertension is breathless, orthopnoeic and has ankle swelling.", "Erect PA chest X-ray: the heart is enlarged (cardiothoracic ratio about 0.62). The upper-lobe vessels are prominent. There are fine horizontal lines at the lung bases, bilateral perihilar ‘bat-wing’ shadowing and blunted costophrenic angles.", [
    mcq("cxr-hf1", "imaging", "Which findings are present? (select all)", [
      o("Cardiomegaly", true, "CTR > 0.5."),
      o("Upper-lobe venous diversion", true, "Raised left atrial pressure redistributes flow."),
      o("Kerley B lines and bat-wing shadowing", true, "Interstitial and alveolar oedema."),
      o("Bilateral pleural effusions", true, "Blunted costophrenic angles."),
      o("A large unilateral pneumothorax", false, "Not described."),
    ], ["Use ABCDE for the CXR: Airway, Breathing (lungs), Cardiac, Diaphragm, Everything else.", "Heart size?", "Lung markings?", "All four listed."], "Systematic approach: technique, then A–B–C–D–E."),
    mcq("cxr-hf2", "imaging", "What is the diagnosis?", [
      o("Cardiogenic pulmonary oedema", true, "Cardiomegaly + upper-lobe diversion + Kerley B + effusions."),
      o("Lobar pneumonia", false, "Unilateral consolidation and air bronchograms."),
      o("Pulmonary tuberculosis", false, "Upper-zone cavitation and fibrosis."),
      o("Pneumothorax", false, "Absent lung markings and a visible pleural line."),
    ], ["Bilateral, symmetrical.", "Which organ is enlarged?", "Perihilar shadowing = ?", "Pulmonary oedema from cardiac failure."], "Cardiomegaly with a pulmonary-oedema pattern = left heart failure."),
    mcq("cxr-hf3", "imaging", "Which test most helps identify the cause?", [
      o("Echocardiography", true, "Shows EF, valves and wall motion."),
      o("CT head", false, "Not related."),
      o("Barium swallow", false, "Not related."),
      o("Lumbar puncture", false, "Not related."),
    ], ["What test looks at the heart’s pump and valves?", "Ultrasound of the heart.", "It gives the ejection fraction.", "Echo."], "Echo establishes systolic vs diastolic failure and valvular causes."),
    mcq("cxr-hf4", "imaging", "Which differential must you keep in mind for bilateral effusions?", [
      o("Nephrotic syndrome / hypoalbuminaemia and renal failure", true, "Other causes of transudates."),
      o("Empyema", false, "Usually unilateral and febrile."),
      o("Lung abscess", false, "Not bilateral effusions."),
      o("Mesothelioma", false, "Usually unilateral."),
    ], ["Bilateral effusions in a systemic condition.", "A transudate is from pressure or oncotic imbalance.", "Which organs cause low oncotic pressure?", "Kidney/liver."], "Bilateral effusions: transudate until proved otherwise."),
  ]),

  S("cxr-pleural", "cxr", "medicine", "Weight loss and shortness of breath", "A 34-year-old woman has had a two-month cough, night sweats and weight loss, and is now short of breath.", "PA chest X-ray: a dense homogeneous opacity occupies the lower two-thirds of the left hemithorax with a concave upper border (meniscus). The trachea and mediastinum are shifted to the right.", [
    mcq("cxr-pl1", "imaging", "What does the tracheal position tell you?", [
      o("Mediastinal shift AWAY from a large effusion", true, "A large effusion pushes the mediastinum to the opposite side."),
      o("It is pulled TOWARDS the lesion, as in lung collapse", false, "Collapse pulls the mediastinum towards the lesion."),
      o("It is normal", false, "It is shifted."),
      o("It means a pneumothorax", false, "Tension pneumothorax also pushes away, but the lung would be hyperlucent."),
    ], ["Does the mass push or pull?", "Fluid takes up space.", "Collapse takes the trachea toward it.", "Pushes away."], "Away = space-occupying (effusion, tension pneumothorax); towards = volume loss (collapse)."),
    mcq("cxr-pl2", "imaging", "What is the diagnosis on the film?", [
      o("Large left pleural effusion", true, "Meniscus sign and a homogeneous opacity."),
      o("Left lower lobe collapse", false, "Would pull the trachea toward the lesion."),
      o("Left tension pneumothorax", false, "Hyperlucent, not opaque."),
      o("Pulmonary oedema", false, "Bilateral."),
    ], ["Opaque, with a meniscus.", "Fluid layering in the pleural space.", "Concave upper border.", "Effusion."], "A meniscus is the signature of a free pleural effusion."),
    mcq("cxr-pl3", "imaging", "Which investigation is most useful next?", [
      o("Diagnostic pleural aspiration: protein, LDH, cells, ADA, culture, GeneXpert", true, "Gives an exudate/transudate classification and an aetiology."),
      o("Bronchoscopy before anything else", false, "Not first."),
      o("Pulmonary function tests", false, "Not helpful."),
      o("Repeat CXR in a month", false, "Delays diagnosis."),
    ], ["Fluid can be sampled.", "Light’s criteria require protein and LDH.", "A lymphocytic exudate with high ADA suggests TB.", "Pleural tap."], "Always sample a new unilateral effusion, using ultrasound guidance if possible."),
    mcq("cxr-pl4", "imaging", "The fluid is a lymphocytic exudate with high ADA. What is the most likely diagnosis?", [
      o("Tuberculous pleural effusion", true, "Typical profile."),
      o("Parapneumonic effusion", false, "Neutrophilic with low pH."),
      o("Heart failure effusion", false, "Transudate."),
      o("Chylothorax", false, "Milky fluid."),
    ], ["Lymphocytic suggests chronic granulomatous disease.", "ADA is an enzyme in T-lymphocyte activity.", "A famous cause in Kenya.", "TB."], "In an HIV and TB endemic area, always ask for an HIV test."),
  ]),

  S("cxr-ptx", "cxr", "surgery", "Trauma, struggling to breathe", "A 27-year-old motorbike rider is groaning, struggling to breathe, with absent breath sounds on the right and a distended neck.", "In practice you do NOT wait for a film. If one were taken: the right hemithorax is hyperlucent, no lung markings; the lung is collapsed toward the hilum; the mediastinum and trachea are shifted to the left and the right hemidiaphragm is flattened.", [
    mcq("cxr-pt1", "imaging", "What is the diagnosis?", [
      o("Right tension pneumothorax", true, "A large hyperlucent hemithorax, displaced mediastinum and flattened diaphragm."),
      o("Right massive haemothorax", false, "Would be opaque."),
      o("Right lower lobe collapse", false, "Pulls the mediastinum to the right."),
      o("Cardiac tamponade", false, "Normal lung fields."),
    ], ["Dark or white?", "Does it push or pull?", "Flat diaphragm.", "Tension pneumothorax."], "Tension pneumothorax is a clinical diagnosis; treat first, film later."),
    mcq("cxr-pt2", "imaging", "What is the immediate treatment?", [
      o("Needle decompression in the 2nd intercostal space (mid-clavicular line) or 5th in the anterior axillary line, then a chest drain", true, "Life-saving release of pressure."),
      o("Wait for the CXR", false, "Fatal delay."),
      o("Give a fluid bolus only", false, "Does not relieve the obstruction."),
      o("Intubate immediately without decompressing", false, "Positive pressure ventilation will worsen it."),
    ], ["What must be released?", "A large-bore needle into the chest.", "Where is the safe site?", "Needle decompression then a drain."], "Tension pneumothorax kills through obstructive shock."),
    mcq("cxr-pt3", "imaging", "Which clinical signs support tension pneumothorax? (select all)", [
      o("Tracheal deviation away from the side", true, "Late sign."),
      o("Hyper-resonant percussion and absent breath sounds", true, "Pleural air."),
      o("Distended neck veins with hypotension", true, "Obstructive shock."),
      o("Dull percussion on that side", false, "That suggests fluid or consolidation."),
    ], ["Which note does air give on percussion?", "What happens to venous return?", "Where does the trachea go?", "Away, hyper-resonant, distended veins."], "Air = hyper-resonant; fluid = stony dull."),
    mcq("cxr-pt4", "imaging", "What other life-threatening injuries do you look for in the primary survey? (select all)", [
      o("Massive haemothorax, cardiac tamponade", true, "Part of the ‘deadly dozen’."),
      o("Open pneumothorax and flail chest", true, "Chest injuries that need immediate treatment."),
      o("Abdominal and pelvic haemorrhage", true, "Circulation must be assessed."),
      o("Cervical spine injury", true, "Protect the spine until cleared."),
    ], ["Do not stop at the first injury.", "Primary survey is ABCDE.", "Hidden causes of shock.", "All of them."], "Anchoring on one injury is a classic trauma error."),
  ]),

  S("ct-ich", "ct", "medicine", "Sudden weakness and headache", "A 70-year-old hypertensive man has sudden left-sided weakness, vomiting and a falling GCS.", "Non-contrast CT head: a well-defined hyperdense (bright) area in the right basal ganglia with a surrounding rim of low density (oedema). There is effacement of the right lateral ventricle and a 5 mm midline shift to the left.", [
    mcq("ct-1", "imaging", "What is the most likely diagnosis?", [
      o("Acute intracerebral haemorrhage", true, "Fresh blood is hyperdense (bright) on CT."),
      o("Acute ischaemic stroke", false, "Early infarcts are hypodense or normal."),
      o("Subdural haematoma", false, "A crescent-shaped collection over the convexity."),
      o("Brain abscess", false, "Ring-enhancing lesion."),
    ], ["Is it bright or dark?", "Blood is white.", "Within the brain parenchyma.", "ICH."], "On a non-contrast CT: blood is bright, early infarct is subtle, old infarct is dark."),
    mcq("ct-2", "imaging", "Which feature indicates a neurosurgical emergency?", [
      o("Midline shift and effacement of the ventricle (raised ICP)", true, "Mass effect risks herniation."),
      o("A normal gyral pattern", false, "Normal."),
      o("Symmetrical ventricles", false, "Normal."),
      o("Calcified pineal gland", false, "Normal."),
    ], ["What does a big bleed do to the brain?", "It pushes structures aside.", "Look for a shift.", "Mass effect."], "Mass effect predicts herniation and guides surgical referral."),
    mcq("ct-3", "imaging", "Which treatments are appropriate? (select all)", [
      o("Control blood pressure (target about 140 mmHg systolic)", true, "Limits haematoma expansion."),
      o("Reverse any anticoagulant and avoid antiplatelets and thrombolysis", true, "Thrombolysis would be catastrophic."),
      o("Airway protection, head up 30° and neurosurgical review", true, "ICP management."),
      o("Give aspirin 300 mg immediately", false, "Contraindicated in a haemorrhage."),
    ], ["Which drugs would worsen a bleed?", "Why must you know the CT before giving aspirin?", "What does head-up positioning do to ICP?", "Control BP; avoid antithrombotics."], "A CT before any antithrombotic is mandatory in stroke."),
    mcq("ct-4", "imaging", "Why did a CT, not an MRI, come first?", [
      o("It is fast, widely available and reliably shows acute blood", true, "Time is brain."),
      o("CT is more accurate than MRI for all lesions", false, "MRI is better for small infarcts."),
      o("MRI is unsafe in all stroke patients", false, "Not true."),
      o("CT is cheaper but less accurate for blood", false, "CT is excellent for blood."),
    ], ["What is needed in the first hour?", "Rapid exclusion of bleed.", "Availability.", "Speed and sensitivity."], "CT first excludes haemorrhage so that thrombolysis can be considered."),
  ]),

  S("us-ectopic", "us", "obgyn", "Collapse after a missed period", "A 26-year-old woman, 7 weeks since her last menstrual period, has severe lower abdominal pain and shock. Urine hCG is positive.", "Transabdominal/transvaginal ultrasound: an empty uterus with a thickened endometrium, a 3 cm complex mass in the right adnexa and a large volume of free echogenic fluid in the pouch of Douglas and Morison’s pouch.", [
    mcq("us-1", "imaging", "What is the most likely diagnosis?", [
      o("Ruptured ectopic pregnancy", true, "Positive hCG + empty uterus + adnexal mass + free fluid + shock."),
      o("Normal early intrauterine pregnancy", false, "A gestational sac would be seen in the uterus."),
      o("Complete miscarriage", false, "No shock and no adnexal mass."),
      o("Ovarian cyst torsion", false, "Doesn’t explain free fluid and shock."),
    ], ["A pregnancy test is positive but the uterus is empty.", "Where else can the pregnancy be?", "Free fluid means bleeding.", "Ectopic."], "Positive hCG + empty uterus = ectopic until proved otherwise."),
    mcq("us-2", "imaging", "What is the most urgent management step?", [
      o("Resuscitate (2 large cannulae, fluids/blood) and proceed to emergency laparotomy/laparoscopy", true, "Control the bleeding source."),
      o("Repeat the β-hCG in 48 hours", false, "Only for stable, suspected early cases."),
      o("Give methotrexate", false, "Only in stable, unruptured ectopics."),
      o("Discharge with analgesia", false, "Dangerous."),
    ], ["Is she stable?", "Intraperitoneal blood continues to flow.", "The bleeding must be stopped surgically.", "Resuscitate and operate."], "A shocked patient with a positive pregnancy test goes to theatre."),
    mcq("us-3", "imaging", "Which risk factors would you ask about? (select all)", [
      o("Previous pelvic inflammatory disease or tubal surgery", true, "Tubal damage."),
      o("Previous ectopic pregnancy", true, "High recurrence."),
      o("IUCD in situ or tubal ligation", true, "Pregnancy that does occur is more likely to be ectopic."),
      o("Smoking", true, "Impairs tubal motility."),
    ], ["What damages the fallopian tubes?", "What delays the egg’s passage?", "Think ‘tubal’.", "All four."], "Ask about the risk factors to explain why it happened."),
    mcq("us-4", "imaging", "Which laboratory step is essential before theatre?", [
      o("Group and cross-match; give anti-D if Rhesus negative", true, "Blood is likely to be needed; prevent sensitisation."),
      o("Serum amylase", false, "Not relevant."),
      o("HbA1c", false, "Not relevant."),
      o("Culture of the urine", false, "Not urgent."),
    ], ["What will she lose?", "Which blood group considerations arise in pregnancy?", "Rhesus.", "Cross-match and anti-D."], "Always check Rhesus in any pregnancy bleed."),
  ]),

  S("xr-sbo", "xr", "surgery", "Vomiting, colicky pain and no flatus", "A 60-year-old man has had 2 days of vomiting, colicky pain, constipation and a tender groin swelling.", "Supine abdominal X-ray: multiple dilated small-bowel loops (> 3 cm) arranged centrally with a ladder pattern and valvulae conniventes crossing the whole width. No gas is seen in the rectum. An erect film shows multiple air–fluid levels.", [
    mcq("xr-1", "imaging", "How do you tell small bowel from large bowel?", [
      o("Small bowel: central, valvulae conniventes cross the whole width; large bowel: peripheral, haustra do not cross the whole width", true, "A standard rule."),
      o("Small bowel: peripheral, haustra present", false, "Reversed."),
      o("They cannot be distinguished", false, "They can."),
      o("Large bowel always has air–fluid levels", false, "Not exclusively."),
    ], ["Position: central vs peripheral.", "Folds across the lumen vs partial folds.", "Valvulae conniventes vs haustra.", "Central, fully crossing folds = small bowel."], "A diameter > 3 cm small bowel or > 6 cm colon is dilated."),
    mcq("xr-2", "imaging", "What is the diagnosis?", [
      o("Small bowel obstruction (probably from a strangulated inguinal hernia)", true, "Dilated small bowel and no rectal gas, plus a hernia on examination."),
      o("Large bowel obstruction", false, "Peripheral dilated colon."),
      o("Perforated viscus", false, "Free gas under the diaphragm."),
      o("Normal film", false, "Not normal."),
    ], ["Is the bowel dilated?", "Which part?", "Where is the cause?", "SBO from the hernia."], "Always examine the hernial orifices in every patient with obstruction."),
    mcq("xr-3", "imaging", "Which findings point to strangulation? (select all)", [
      o("Continuous (not colicky) pain and fever", true, "Ischaemia changes the pain."),
      o("Tender, irreducible, discoloured hernia", true, "A hernia with compromised blood supply."),
      o("Tachycardia, raised lactate and WCC", true, "Systemic inflammation."),
      o("Passing flatus and soft abdomen", false, "Argues against obstruction/strangulation."),
    ], ["What does ischaemic bowel feel like?", "How does the pain change?", "Look at the groin.", "Continuous pain, irreducible tender hernia, sepsis markers."], "Strangulation is a surgical emergency."),
    mcq("xr-4", "imaging", "What is the initial management? (select all)", [
      o("‘Drip and suck’: IV fluids, nasogastric decompression and analgesia", true, "Resuscitate and decompress."),
      o("Urgent surgical review for operation", true, "Strangulated hernia needs surgery."),
      o("Broad-spectrum antibiotics", true, "Prophylaxis/sepsis cover."),
      o("Oral laxatives", false, "Dangerous."),
    ], ["What does the stomach contain?", "How do you stop the vomiting and aspiration?", "What must be done to the bowel?", "Drip, suck, antibiotics, theatre."], "Resuscitate before you operate, but do not delay the operation."),
  ]),

  S("sign-cld", "sign", "medicine", "Peripheral signs of liver disease", "A 52-year-old man with heavy alcohol use has a swollen abdomen and has just vomited blood.", "On inspection: jaundiced sclerae, palmar erythema, multiple spider naevi on the chest, bilateral gynaecomastia, muscle wasting, a distended abdomen with shifting dullness, caput medusae and bruises on the shins.", [
    mcq("sg-1", "imaging", "What is the unifying diagnosis?", [
      o("Chronic liver disease with portal hypertension (decompensated cirrhosis)", true, "Stigmata of liver disease plus ascites."),
      o("Congestive heart failure", false, "Would have a raised JVP and oedema."),
      o("Nephrotic syndrome", false, "No stigmata of chronic liver disease."),
      o("Normal examination", false, "Not normal."),
    ], ["Count the stigmata.", "Which organ do they all point to?", "Add the ascites and caput.", "Cirrhosis."], "Stigmata are clues to the diagnosis and its severity."),
    mcq("sg-2", "imaging", "Explain the mechanism of spider naevi, palmar erythema and gynaecomastia.", [
      o("Failure of the liver to metabolise oestrogen", true, "Hyperoestrogenism."),
      o("Excess cortisol", false, "Cushing’s gives different signs."),
      o("Allergic reaction", false, "No."),
      o("Hypothyroidism", false, "No."),
    ], ["Which hormone does the liver clear?", "It is a sex hormone.", "What does it do to the skin and breast?", "Oestrogen."], "A connection between physiology and sign: liver failure → hyperoestrogenism."),
    mcq("sg-3", "imaging", "Which complications should you look for? (select all)", [
      o("Variceal bleeding", true, "He has just vomited blood."),
      o("Hepatic encephalopathy", true, "Triggered by bleeding, infection, sedatives."),
      o("Spontaneous bacterial peritonitis", true, "Infected ascites."),
      o("Hepatorenal syndrome and hepatocellular carcinoma", true, "Late complications."),
    ], ["Which complications of cirrhosis do you know?", "Portal hypertension, failure and cancer.", "Think of what the bleeding does to the brain.", "All of them."], "Cirrhosis complications cluster: portal hypertension, synthetic failure, cancer."),
    mcq("sg-4", "imaging", "Which investigation gives the most direct information about the cause of the bleed?", [
      o("Urgent upper GI endoscopy after resuscitation", true, "Diagnoses and treats varices (banding)."),
      o("CT head", false, "Not relevant."),
      o("Chest X-ray only", false, "Not relevant."),
      o("Serum amylase", false, "Not relevant."),
    ], ["How do you see the oesophagus?", "Treatment can be done through the same tool.", "Banding.", "Endoscopy."], "Resuscitate first, endoscope within 12 hours."),
  ]),
];

export const stationById = (id: string) => STATIONS.find((s) => s.id === id);
