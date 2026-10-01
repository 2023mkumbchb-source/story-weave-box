// Problem lists. Real patients rarely have one diagnosis: the skill is to name every ACTIVE problem and rank what threatens life first.
// active[0] is the problem you deal with FIRST. Each entry is [problem, why it matters / why it ranks here].

export type P = [string, string];
export interface ProblemSet { active: P[]; not: P[] }

export const PROBLEMS: Record<string, ProblemSet> = {
  "med-hf": {
    active: [
      ["Acute pulmonary oedema with hypoxaemia", "Hypoxia kills fastest — treat before anything else."],
      ["Congestive (HFrEF) heart failure, probably ischaemic/hypertensive", "The underlying cause that drives the fluid overload."],
      ["Fluid overload with ascites and bilateral effusions", "The result of failure on both sides of the heart; guides diuresis."],
      ["Acute kidney injury on diabetic kidney disease (cardiorenal ± NSAID)", "Limits which drugs are safe and may need dialysis later."],
      ["Uncontrolled hypertension and diabetes with poor follow-up", "The reason he got here; needs a long-term plan."],
    ],
    not: [["Pulmonary tuberculosis", "No fever, cough with sputum or weight loss to support it."], ["Acute coronary syndrome as the primary event", "Troponin is mildly raised but flat — chronic injury, not an acute infarct."], ["Primary liver disease", "The congested liver is secondary to the heart."]],
  },
  "med-acs": {
    active: [
      ["Acute STEMI — time-critical myocardial ischaemia", "Muscle is dying every minute: reperfusion is the priority."],
      ["Risk of arrhythmia / cardiac arrest in the first hours", "VF is the commonest early killer after STEMI."],
      ["Diabetes with poor control and vascular risk", "Explains the atypical onset and drives long-term risk."],
      ["Smoking and other vascular risk factors needing secondary prevention", "Prevents the next event once the acute phase is over."],
    ],
    not: [["Acute aortic dissection", "Should be considered, but nothing here supports it and thrombolysis would be disastrous if it were present — so you must actively exclude it."], ["Gastro-oesophageal reflux", "Never label it as reflux until ischaemia is excluded."], ["Anxiety attack", "A diagnosis of exclusion; dangerous to assume here."]],
  },
  "med-tb": {
    active: [
      ["Large pleural effusion with respiratory compromise", "Mechanical problem causing breathlessness; may need drainage."],
      ["Probable pulmonary/pleural tuberculosis", "The cause of cough, sweats, weight loss and effusion; needs confirmation and treatment."],
      ["Possible HIV infection with immunosuppression", "Changes presentation, drug interactions and outcome; test with counselling."],
      ["Weight loss and malnutrition", "Predicts poor outcome; needs nutritional support."],
      ["Public health risk — infectious case", "Isolation, contact tracing and notification."],
    ],
    not: [["Acute bacterial pneumonia", "Two-month tempo and night sweats argue against it."], ["Pulmonary embolism", "No risk factors, no pleuritic onset."]],
  },
  "med-pe": {
    active: [
      ["Acute hypoxaemia and haemodynamic compromise", "Immediate life threat — resuscitate first."],
      ["Suspected pulmonary embolism after surgery", "The probable cause; anticoagulation is time-critical."],
      ["Post-operative state — day 5 after hysterectomy", "Explains the risk and the bleeding risk of anticoagulation."],
      ["Possible deep vein thrombosis", "The source of the clot; finding it confirms the story."],
      ["Need for thromboprophylaxis planning", "She should have been protected; prevents recurrence."],
    ],
    not: [["Post-operative wound infection", "No local signs and not the explanation for sudden breathlessness."], ["Anxiety", "A dangerous label in a post-op patient with hypoxia."]],
  },
  "med-stroke": {
    active: [
      ["Acute stroke within the treatment window", "Time is brain: confirm the type fast to decide on treatment."],
      ["Aphasia and right-sided weakness", "The deficits to document and monitor."],
      ["Aspiration and airway risk", "Swallow must be assessed before oral intake."],
      ["Hypertension and probable atrial fibrillation", "Both the cause and the target for secondary prevention."],
      ["Need for rehabilitation and carer support", "Determines long-term function."],
    ],
    not: [["Seizure with Todd paralysis", "No witnessed fit and the deficit is stable."], ["Migraine aura", "Wrong age and too abrupt."]],
  },
  "med-mening": {
    active: [
      ["Reduced consciousness with sepsis physiology", "Airway and haemodynamics first; antibiotics must not wait."],
      ["Suspected bacterial meningitis", "Treat immediately: every hour of delay raises mortality."],
      ["Raised intracranial pressure risk before lumbar puncture", "Decides whether a CT or a delay is needed before the LP."],
      ["Possible HIV and other causes (cryptococcus, TB)", "Changes the investigations and the antimicrobials."],
      ["Contact risk — close contacts", "Possible chemoprophylaxis for meningococcal disease."],
    ],
    not: [["Simple tension headache", "Fever and neck stiffness exclude it."], ["Primary psychiatric illness", "Confusion with fever is organic until proven otherwise."]],
  },
  "med-dka": {
    active: [
      ["Hypovolaemia / shock from osmotic diuresis", "Fluids first — restoring circulation saves life and improves everything else."],
      ["Diabetic ketoacidosis with severe metabolic acidosis", "The diagnosis driving the breathing and drowsiness."],
      ["Hyperglycaemia needing an insulin infusion", "Starts only after potassium is known."],
      ["Risk of hypokalaemia on treatment", "Insulin drives K⁺ into cells — the commonest preventable killer."],
      ["Precipitant (infection, missed insulin, new-onset diabetes)", "Find and treat it or the DKA returns."],
    ],
    not: [["Acute abdomen requiring surgery", "The pain is metabolic and settles with treatment."], ["Primary respiratory failure", "Kussmaul breathing is compensation, not lung disease."]],
  },
  "med-aki": {
    active: [
      ["Hyperkalaemia with ECG changes", "Arrhythmia is the immediate threat — protect the heart first."],
      ["Acute kidney injury", "Prerenal on CKD — hypovolaemia, NSAID, ACE inhibitor/metformin effects."],
      ["Hypovolaemia from vomiting and diarrhoea", "The reversible cause; cautious fluid replacement."],
      ["Nephrotoxic and risky drugs still being taken", "NSAIDs, ACE inhibitors, metformin must be stopped."],
      ["Chronic diabetic and hypertensive kidney disease", "Sets his baseline and long-term plan."],
    ],
    not: [["Acute pulmonary oedema", "Not yet; take care that fluid replacement does not cause it."], ["Urinary tract infection as the only problem", "Does not explain the biochemistry."]],
  },
  "med-malaria": {
    active: [
      ["Impaired consciousness and hypoglycaemia risk", "Check glucose at once — it is fast to fix and lethal if missed."],
      ["Severe falciparum malaria", "Start IV artesunate immediately."],
      ["Severe anaemia / jaundice / dark urine (haemolysis)", "Markers of severity; may need transfusion."],
      ["Acute kidney injury (blackwater)", "Complication that changes fluid management."],
      ["Risk of seizures and pulmonary oedema", "Prevent and watch for them."],
    ],
    not: [["Viral hepatitis alone", "Does not explain fever and coma."], ["Typhoid fever", "Possible co-infection, but not the dominant problem now."]],
  },
  "med-gibleed": {
    active: [
      ["Haemorrhagic shock from an upper GI bleed", "Restore the circulation: two large cannulae, cautious resuscitation, blood."],
      ["Probable variceal bleeding from portal hypertension", "Needs terlipressin/octreotide, antibiotics and endoscopic banding."],
      ["Decompensated chronic liver disease with ascites", "Explains the bleeding risk and the coagulopathy."],
      ["Risk of hepatic encephalopathy", "Blood in the gut precipitates it; avoid sedatives."],
      ["Alcohol dependence and withdrawal risk", "Thiamine and withdrawal monitoring."],
    ],
    not: [["Peptic ulcer disease as the sole cause", "Possible, but in this patient varices are most likely — treat as such until endoscopy."], ["Haemorrhoidal bleeding", "Does not cause haematemesis."]],
  },
  "ob-pe": {
    active: [
      ["Severe hypertension with neurological symptoms — risk of eclampsia", "Magnesium and BP control to prevent seizures and stroke."],
      ["Severe pre-eclampsia (± HELLP)", "The diagnosis that drives all treatment."],
      ["Fetal wellbeing at 36 weeks", "Placental insufficiency may require delivery."],
      ["Need for delivery planning", "Delivery is the cure; timing and route to decide."],
      ["Primigravida needing postpartum surveillance", "Risk continues after delivery."],
    ],
    not: [["Normal pregnancy swelling", "Headache and hypertension are not normal."], ["Migraine", "Cannot be accepted before pre-eclampsia is excluded."]],
  },
  "ob-aph": {
    active: [
      ["Active bleeding at 33 weeks — haemorrhagic shock risk", "Resuscitate: two lines, blood, call senior help."],
      ["Probable placenta praevia (± accreta) after two caesareans", "No digital vaginal examination before ultrasound."],
      ["Fetal compromise from maternal bleeding", "Monitor the fetal heart; dictates delivery urgency."],
      ["Preterm gestation — steroids and neonatal care", "Plan for early delivery with lung maturation."],
      ["Rhesus status and blood availability", "Cross-match and anti-D if negative."],
    ],
    not: [["Normal show of labour", "Bright red painless bleeding is not a show."], ["Urinary tract infection", "Not the explanation for fresh blood per vagina."]],
  },
  "ob-pph": {
    active: [
      ["Ongoing postpartum haemorrhage with shock", "Call for help and resuscitate while treating the cause."],
      ["Uterine atony as the likely cause", "Massage, oxytocin, tranexamic acid, misoprostol."],
      ["Possible genital tract trauma / retained placenta", "Examine the cervix and vagina; check the placenta is complete."],
      ["Risk of coagulopathy", "Dilutional or DIC after major bleeding."],
      ["Risk factors: high parity and a large baby", "Explains why it happened and prepares prevention next time."],
    ],
    not: [["Normal lochia", "This volume is not normal."], ["Urinary retention alone", "Can contribute by distending the bladder but is not the main problem."]],
  },
  "ob-ectopic": {
    active: [
      ["Hypovolaemic shock from intraperitoneal bleeding", "Resuscitate and get to theatre — do not wait for confirmation."],
      ["Probable ruptured ectopic pregnancy", "Pregnancy test + free fluid + shock = ectopic until proved otherwise."],
      ["Need for blood and Rhesus status", "Cross-match; give anti-D if Rh negative."],
      ["Counselling about future fertility", "Tubal damage and recurrence risk."],
    ],
    not: [["Acute appendicitis", "Possible mimic but does not explain shock with a positive pregnancy test."], ["Dysmenorrhoea", "Wrong tempo and she is amenorrhoeic."]],
  },
  "ob-labour": {
    active: [
      ["Obstructed labour with maternal exhaustion and dehydration", "Resuscitate with fluids and antibiotics before theatre."],
      ["Cephalopelvic disproportion in a small young primigravida", "Cause of obstruction — delivery by caesarean."],
      ["Fetal distress", "Check the fetal heart; urgency of delivery."],
      ["Infection risk after prolonged membrane rupture", "Chorioamnionitis needs antibiotics."],
      ["Risk of uterine rupture and fistula", "Bandl’s ring, tender lower segment, haematuria are warnings."],
    ],
    not: [["Normal latent phase of labour", "Eighteen hours with no progress is not normal."], ["False labour", "She has established obstruction."]],
  },
  "ob-pid": {
    active: [
      ["Acute pelvic inflammatory disease with possible tubo-ovarian abscess", "Treat now with broad-spectrum antibiotics; drain if abscess."],
      ["Pregnancy must be excluded", "Ectopic is the dangerous mimic and changes drug choice."],
      ["Sexually transmitted infection — partner treatment", "Prevents re-infection."],
      ["HIV status and counselling", "Associated risk and affects management."],
      ["Fertility risk — tubal damage", "Counsel about long-term consequences."],
    ],
    not: [["Acute appendicitis", "Possible, but this picture with discharge points to PID."], ["Simple urinary tract infection", "Does not explain the pelvic findings and discharge."]],
  },
  "pd-pneu": {
    active: [
      ["Hypoxaemia and respiratory distress", "Oxygen first: SpO₂ < 90% is a danger sign."],
      ["Severe pneumonia", "Needs IV antibiotics promptly."],
      ["Inability to feed with dehydration risk", "Danger sign; needs fluids, NG feeding or IV."],
      ["Malnutrition and HIV exposure to be assessed", "Alter the severity and the antibiotics."],
      ["Immunisation status", "Pneumococcal and Hib vaccines are key."],
    ],
    not: [["Asthma", "Fever and focal chest signs do not fit."], ["Foreign body aspiration", "No sudden choking story."]],
  },
  "pd-malaria": {
    active: [
      ["Convulsions and impaired consciousness — check glucose", "Treat seizures and hypoglycaemia first."],
      ["Severe (cerebral) malaria", "IV artesunate without delay."],
      ["Possible co-existing bacterial meningitis", "Cannot be excluded in a convulsing febrile child; consider antibiotics."],
      ["Severe anaemia and acidosis", "Danger signs that may need blood and fluids."],
      ["Prevention: ITNs and follow-up", "Reduces recurrence."],
    ],
    not: [["Simple febrile convulsion", "Drowsy, prolonged or repeated fits are not simple."], ["Epilepsy", "First presentation with fever points to infection."]],
  },
  "pd-dehyd": {
    active: [
      ["Hypovolaemic shock from severe dehydration", "Rapid IV rehydration first, with reassessment."],
      ["Acute watery diarrhoea with vomiting", "The cause: continue feeding, zinc, ORS when able."],
      ["Electrolyte disturbance risk (sodium, potassium)", "Check before and during fluids."],
      ["Nutritional status and hypoglycaemia", "Check glucose and weigh."],
      ["Infection control and immunisation (rotavirus)", "Prevent spread and recurrence."],
    ],
    not: [["Surgical abdomen", "Watery diarrhoea with a soft abdomen is not surgical."], ["Meningitis", "No neck stiffness or bulging fontanelle."]],
  },
  "pd-sam": {
    active: [
      ["Hypoglycaemia, hypothermia and infection risk", "Immediate threats in severe malnutrition."],
      ["Severe acute malnutrition with kwashiorkor", "The diagnosis that determines the care pathway."],
      ["Possible HIV and TB", "Frequent co-morbidities; test and treat."],
      ["Dehydration vs shock — careful rehydration", "Overzealous fluids cause heart failure in SAM."],
      ["Micronutrient deficiency and refeeding", "Vitamin A, folate, zinc; feed slowly with F-75."],
    ],
    not: [["Nephrotic syndrome", "Possible oedema cause but the clinical picture is nutritional."], ["Heart failure", "Not the primary mechanism, but fluid overload risk is real."]],
  },
  "pd-neo": {
    active: [
      ["Neonatal sepsis with poor feeding and lethargy", "Start IV antibiotics at once; don’t wait for cultures."],
      ["Hypoglycaemia and hypothermia risk", "Check glucose and keep warm."],
      ["Jaundice at day 4 — pathological until proved otherwise", "Check bilirubin; phototherapy or exchange threshold."],
      ["Prematurity at 36 weeks and home delivery", "Raises risk of infection and umbilical cord sepsis."],
      ["Maternal HIV / vaccination status", "Prevention of mother-to-child transmission and BCG/OPV."],
    ],
    not: [["Physiological jaundice", "Can’t explain lethargy and poor feeding."], ["Normal sleepy newborn", "Not feeding is a danger sign."]],
  },
  "pd-scd": {
    active: [
      ["Acute chest syndrome with hypoxia", "The most dangerous complication of a crisis — oxygen and antibiotics."],
      ["Severe vaso-occlusive pain crisis", "Needs prompt, adequate analgesia."],
      ["Fever in sickle cell disease — presume sepsis", "Functional asplenia: pneumococcal and Salmonella risk."],
      ["Anaemia — assess for aplastic or sequestration crisis", "Check Hb and reticulocytes."],
      ["Hydration and long-term care (hydroxyurea, prophylaxis, vaccines)", "Reduces crises."],
    ],
    not: [["Osteomyelitis as the only problem", "Possible, but chest signs and the sickle context point to ACS."], ["Appendicitis", "Back and leg pain with chest signs do not fit."]],
  },
  "pd-asthma": {
    active: [
      ["Life-threatening bronchospasm with hypoxia", "Oxygen and nebulised salbutamol now."],
      ["Acute severe asthma exacerbation", "Add ipratropium, steroids and consider magnesium."],
      ["Trigger — viral infection", "Identify and treat if bacterial."],
      ["Poor chronic control (recurrent night cough)", "Preventer therapy must be started."],
      ["Technique, adherence and action plan", "Prevents the next admission."],
    ],
    not: [["Bronchiolitis", "Wrong age and recurrent history."], ["Foreign body", "No choking story and bilateral symmetrical wheeze."]],
  },
  "sg-appy": {
    active: [
      ["Acute right iliac fossa pain — likely appendicitis", "Needs surgical review and an operation plan."],
      ["Risk of perforation and peritonitis", "Delay raises the risk; watch for rigid abdomen."],
      ["Dehydration and fasting", "IV fluids, analgesia and antiemetic."],
      ["Alternative surgical diagnoses to exclude (ureteric colic, mesenteric adenitis)", "Prevents a negative operation."],
    ],
    not: [["Gastroenteritis", "Pain migrating to RIF with localised tenderness is not gastroenteritis."], ["Renal colic", "Pain pattern and urinalysis differ."]],
  },
  "sg-obstruct": {
    active: [
      ["Dehydration and shock from third-space losses", "Resuscitate: drip and suck, correct electrolytes."],
      ["Small bowel obstruction", "NG decompression and surgical decision."],
      ["Strangulated hernia — bowel at risk of ischaemia", "Needs urgent operation if suspected."],
      ["Risk of perforation and sepsis", "Monitor lactate, WCC, fever, peritonism."],
      ["Chronic hernia needing definitive repair", "Elective repair prevents recurrence."],
    ],
    not: [["Gastroenteritis", "No diarrhoea and a tender irreducible groin swelling."], ["Constipation alone", "Does not explain vomiting and pain."]],
  },
  "sg-trauma": {
    active: [
      ["Airway and cervical spine", "A comes first; protect the spine."],
      ["Breathing — life-threatening chest injury (tension pneumothorax)", "Decompress immediately; do not wait for an X-ray."],
      ["Circulation — haemorrhagic shock", "Two large lines, blood, stop the bleeding."],
      ["Head injury — GCS and pupils", "Prevent secondary brain injury."],
      ["Tetanus, pain relief and secondary survey", "Complete the assessment after resuscitation."],
    ],
    not: [["Soft-tissue bruises as the main issue", "Distracting injuries must not delay the primary survey."], ["Intoxication", "Never attribute altered consciousness to alcohol in trauma."]],
  },
  "sg-foot": {
    active: [
      ["Sepsis from a necrotising diabetic foot infection", "Resuscitate, antibiotics, early surgical debridement."],
      ["Hyperglycaemia / risk of DKA or HHS", "Check glucose and ketones."],
      ["Diabetic foot ulcer with peripheral neuropathy and ischaemia", "Why the thorn became a limb-threatening injury."],
      ["Possible osteomyelitis", "X-ray and probe-to-bone test."],
      ["Long-term diabetes control and foot care education", "Prevents amputation."],
    ],
    not: [["Simple cellulitis", "Foul smell, necrosis and fever are not simple."], ["Gout", "Wrong picture."]],
  },
  "sg-burn": {
    active: [
      ["Pain and airway/inhalation risk", "Check face, voice and soot; analgesia."],
      ["Partial-thickness scald over a significant body surface area", "Calculate %TBSA (child’s chart) to guide fluids."],
      ["Fluid resuscitation needs", "Parkland for >10% TBSA in a child, plus maintenance."],
      ["Hypothermia risk", "Cover after cooling; keep the child warm."],
      ["Safeguarding — is the story consistent?", "Always consider non-accidental injury."],
    ],
    not: [["Staphylococcal scalded skin syndrome", "The history is clear thermal injury."], ["Allergic rash", "Wrong mechanism."]],
  },
  "sg-breast": {
    active: [
      ["Breast mass suspicious for locally advanced carcinoma", "Triple assessment is mandatory."],
      ["Possible axillary and distant metastases", "Staging to decide treatment intent."],
      ["Need for tissue diagnosis (core biopsy, receptor status)", "Determines hormonal and systemic therapy."],
      ["Psychosocial support and counselling", "Fear and delay are common in our setting."],
    ],
    not: [["Fibroadenoma", "Wrong age and skin changes."], ["Breast abscess", "Painless, no fever."]],
  },
  "ps-delirium": {
    active: [
      ["Acute confusional state — medical emergency", "Treat it as organic until proved otherwise."],
      ["Fluctuating consciousness with visual hallucinations — delirium", "Not schizophrenia."],
      ["Possible severe infection or substance toxicity", "Malaria, meningitis, drug intoxication or withdrawal."],
      ["Agitation and risk to self and staff", "Safe de-escalation first."],
      ["Need for collateral history", "The key to the diagnosis."],
    ],
    not: [["Schizophrenia", "Acute onset with fluctuating attention is not schizophrenia."], ["Bipolar mania", "No mood history."]],
  },
  "ps-schiz": {
    active: [
      ["First-episode psychosis", "Establish diagnosis, exclude organic/substance causes."],
      ["Risk to self and others", "Always assess before anything else."],
      ["Social decline and self-neglect", "Functional impact guides care."],
      ["Substance use contribution", "Cannabis and khat can cause or worsen psychosis."],
      ["Need for family involvement and long-term care", "Adherence depends on family support."],
    ],
    not: [["Normal adolescent adjustment", "Six months of decline with hallucinations is not."], ["Depression only", "Hallucinations dominate."]],
  },
  "ps-depr": {
    active: [
      ["Suicide risk — has she harmed herself?", "Ask directly: plan, intent, means, previous attempts, overdose."],
      ["Major depressive episode", "Treat; consider psychotic features."],
      ["Newly diagnosed HIV and non-adherence", "A medical risk that mood is driving."],
      ["Self-neglect: not eating, children at home", "Safeguarding and support."],
      ["Need for follow-up and safe means restriction", "Reduces risk after discharge."],
    ],
    not: [["Normal grief reaction", "Duration and functional collapse are beyond normal adjustment."], ["Hypothyroidism alone", "Test it, but it does not explain suicidal thoughts."]],
  },
  "ps-mania": {
    active: [
      ["Manic episode with risk of harm", "Safety: financial, sexual, aggression, exhaustion."],
      ["Bipolar I disorder", "The likely diagnosis; exclude substance and organic causes."],
      ["Sleep deprivation and poor oral intake", "Physical care matters."],
      ["Capacity and insight", "Determines whether admission must be compulsory."],
      ["Family burden and long-term mood stabilisation", "Plan for relapse prevention."],
    ],
    not: [["Normal high spirits", "Ten days without sleep and risky behaviour are not normal."], ["Schizophrenia", "Elevated mood with pressure of speech suggests mania."]],
  },
  "ps-dts": {
    active: [
      ["Delirium tremens — a life-threatening withdrawal state", "Benzodiazepines now; mortality is high without treatment."],
      ["Wernicke’s risk — give high-dose thiamine before glucose", "Prevent irreversible brain damage."],
      ["Dehydration and electrolyte disturbance", "Correct magnesium, potassium and glucose."],
      ["Fractured leg and post-operative state", "Pain and surgical issues remain."],
      ["Alcohol dependence — long-term plan", "Addiction treatment after the acute phase."],
    ],
    not: [["Primary psychotic disorder", "Onset three days into abstinence with autonomic signs is withdrawal."], ["Post-operative pain only", "Does not explain tremor, sweating and hallucinations."]],
  },
  "ps-panic": {
    active: [
      ["Exclude life-threatening causes first (ACS, arrhythmia, thyroid storm)", "A panic label is a diagnosis of exclusion."],
      ["Probable hyperthyroidism (weight loss, tremor, tachycardia)", "A medical mimic of panic."],
      ["Panic attacks with anxiety", "Treat after exclusion; explain the physiology."],
      ["Impact on function and avoidance", "Guides CBT and drug choice."],
    ],
    not: [["Purely psychological problem", "Must not be assumed — see hyperthyroidism."], ["Epilepsy", "No witnessed seizure or post-ictal period."]],
  },
  "ps-adhd": {
    active: [
      ["Neurodevelopmental disorder — ADHD with autistic features", "Needs a multidisciplinary assessment."],
      ["Exclude hearing and vision problems", "A common reversible reason for inattention and poor learning."],
      ["School failure and behaviour problems", "Needs an education plan and teacher liaison."],
      ["Family stress and coping", "Parent training is first-line."],
      ["Coexisting conditions (anxiety, learning disability, epilepsy)", "Affect treatment choices."],
    ],
    not: [["Naughty child needing discipline", "Neurodevelopmental, not moral failure."], ["Normal developmental variation", "Persistent in two settings with impairment."]],
  },
};
