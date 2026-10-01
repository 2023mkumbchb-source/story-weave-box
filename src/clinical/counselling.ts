// Counselling / communication stations for the OSCE circuit: the learner types what they would say, then ticks off a checklist.
// Marking is by keyword per checklist item, with the model script shown afterwards.

export interface CounselItem { label: string; words: string[]; why: string }
export interface Counsel { id: string; title: string; rotation: "medicine" | "obgyn" | "paeds" | "surgery" | "psychiatry"; task: string; items: CounselItem[]; model: string }

const I = (label: string, words: string[], why: string): CounselItem => ({ label, words, why });

export const COUNSEL: Counsel[] = [
  {
    id: "bad-news", title: "Breaking bad news: a breast biopsy shows cancer", rotation: "surgery",
    task: "You are the intern. The consultant asks you to tell a 45-year-old woman, with her husband present, that her biopsy confirms breast cancer. Write what you would say and do.",
    items: [
      I("Prepare: private room, sit down, allow time, invite her husband", ["private", "sit", "time", "husband", "quiet", "room"], "Setting is the first step of SPIKES."),
      I("Find out what she already knows and wants to know", ["know", "understand", "aware", "expect", "told", "wants"], "Perception and invitation come before information."),
      I("Give a warning shot, then the news in plain words", ["unfortunately", "bad news", "sorry", "warn", "serious", "cancer"], "A warning shot softens the blow; use the word ‘cancer’."),
      I("Pause and respond to emotion with empathy", ["pause", "silence", "sorry", "understand", "difficult", "feel", "tears", "empath"], "Acknowledge before you explain further."),
      I("Explain next steps: staging, treatment options and a plan", ["stage", "treatment", "plan", "surgery", "chemo", "refer", "options", "team"], "People cope better when there is a plan."),
      I("Check understanding, give support and follow-up", ["questions", "understand", "support", "follow", "counsel", "return", "contact"], "End with a summary and a safety net."),
    ],
    model: "“I would like us to sit somewhere private. Is it all right if your husband stays? Before I go on, can you tell me what you understand so far? … I’m afraid the news is not good. The biopsy shows cancer. [Pause.] I am so sorry. This must be very hard. We will not leave you alone with this: the next steps are staging scans and a team plan that may include surgery, chemotherapy and hormone treatment. What worries you most? Do you have any questions? Do you want to go over anything? I will see you again on …, we will follow you up closely, and here is how to contact us.”",
  },
  {
    id: "hiv", title: "HIV testing and post-test counselling", rotation: "medicine",
    task: "A 34-year-old woman with weight loss and TB has just tested HIV positive. You must give the result and counsel her. What do you say?",
    items: [
      I("Private, confidential, and ask what she understands", ["confidential", "private", "understand", "know"], "Confidentiality is vital in HIV."),
      I("Give the result clearly and with empathy", ["positive", "result", "sorry", "understand", "feel"], "Do not hide behind jargon."),
      I("Explain that HIV is treatable and that people live long with ART", ["treat", "art", "arv", "antiretroviral", "live", "long", "manage"], "Hope: HIV is a chronic, controllable disease."),
      I("Explain the plan: CD4 and viral load, start ART, treat TB and prevent opportunistic infection", ["cd4", "viral load", "start", "tb", "co-trimoxazole", "cotrimoxazole", "prophylaxis", "clinic"], "Link HIV and TB care together."),
      I("Discuss partner testing, adherence, safer sex and children", ["partner", "adherence", "condom", "safe", "child", "children", "disclos"], "Prevention and family testing."),
      I("Screen for support and mood, and arrange follow-up", ["support", "mood", "depress", "counsel", "follow", "return", "suicid"], "Mood and safety matter after a diagnosis."),
    ],
    model: "“Thank you for coming. This is private and confidential. How are you feeling and what do you think this test could show? … The result is positive. I know that may be frightening. HIV is treatable: with daily antiretroviral tablets people live long, healthy lives. We will check your CD4 and viral load, start TB treatment and ART at the right time, and give cotrimoxazole to protect you from infections. We would like to test your partner and children. How are you coping? Who can support you? Have you been feeling low? I will see you in two weeks for follow-up.”",
  },
  {
    id: "contraception", title: "Post-partum family planning", rotation: "obgyn",
    task: "A 28-year-old woman, para 4, delivered yesterday and asks about contraception. She is HIV positive and breast-feeding. Write your counselling.",
    items: [
      I("Ask about her wishes, parity and future fertility", ["want", "future", "children", "wish", "plan", "space"], "Counselling starts with her preferences."),
      I("Offer the methods suitable after delivery and breast-feeding (IUCD, implant, progestin-only, LAM, tubal ligation)", ["iucd", "implant", "progest", "lam", "ligation", "injectable", "depo"], "Post-partum choices differ from the usual list."),
      I("Explain effectiveness, side effects and return of fertility", ["effective", "side effect", "bleeding", "fertil", "return"], "Informed choice needs the pros and cons."),
      I("Consider her HIV status and ART interactions, and condoms for protection", ["hiv", "art", "efavirenz", "condom", "interaction", "dolutegravir"], "Dual protection and drug interactions."),
      I("Check eligibility and contraindications (e.g. thrombosis, hypertension, breast cancer)", ["contraindicat", "blood pressure", "clot", "thrombo", "eligib", "history"], "Safety checking before prescribing."),
      I("Respect the decision, document, and arrange follow-up", ["decision", "choice", "consent", "follow", "return", "document"], "Consent and continuity of care."),
    ],
    model: "“Congratulations. Have you thought about when you would like another child, or whether you want no more? After delivery, we can offer an IUCD, an implant, progestin-only pills or injections, or tubal ligation if you are sure. Because you are on ART and breast-feeding, an implant or IUCD is very effective; I would also advise condoms to protect you and your partner. Let me check your BP and history for anything that makes a method unsafe. It is your decision and your choice — which would you prefer? I will document it and see you for follow-up at six weeks.”",
  },
  {
    id: "insulin", title: "Teaching insulin injection and hypoglycaemia", rotation: "medicine",
    task: "A newly diagnosed 19-year-old with type 1 diabetes is being discharged. Teach her injection technique, monitoring and what to do if she becomes hypoglycaemic.",
    items: [
      I("Explain why insulin is needed (her body does not make it)", ["body", "make", "pancrea", "need", "why", "cannot"], "Understanding improves adherence."),
      I("Demonstrate injection technique: sites, rotation, pen/syringe, storage", ["site", "rotate", "abdomen", "thigh", "pen", "syringe", "store", "fridge"], "Technique prevents lipohypertrophy and errors."),
      I("Teach glucose monitoring and targets", ["glucose", "monitor", "check", "meter", "target", "before meals"], "Self-monitoring guides dosing."),
      I("Recognise and treat hypoglycaemia (sweating, tremor, confusion; 15 g sugar and recheck)", ["hypogly", "sweat", "tremor", "confus", "sugar", "juice", "glucose", "15"], "A common and dangerous side effect."),
      I("Sick-day rules: never stop insulin, check ketones, return if vomiting", ["sick", "illness", "vomit", "ketone", "never stop", "continue", "return"], "Prevents DKA."),
      I("Lifestyle, follow-up and when to seek help", ["diet", "exercise", "meal", "follow", "clinic", "emergency", "return", "foot"], "Long-term care."),
    ],
    model: "“Your pancreas has stopped making insulin, so we replace it. I will show you how to inject into your abdomen or thigh and rotate the site; keep unopened insulin in the fridge. Check your sugar before meals and at bedtime. If you feel sweaty, shaky or confused, take 15 g of sugar — a glass of juice — and recheck in 15 minutes. When you are sick, never stop insulin, check ketones and come back if you are vomiting. Please eat regular meals, keep your clinic appointments and look after your feet.”",
  },
  {
    id: "inhaler", title: "Asthma: inhaler technique and action plan", rotation: "paeds",
    task: "Counsel the mother of a 6-year-old with asthma about the inhaler, the spacer and when to return to hospital.",
    items: [
      I("Explain what asthma is and the difference between reliever and preventer", ["reliever", "preventer", "salbutamol", "steroid", "inflamm", "narrow"], "Preventer vs reliever is the key concept."),
      I("Demonstrate the spacer technique (shake, spacer, breathe, wait)", ["spacer", "shake", "puff", "breath", "wait", "seconds", "mask"], "Poor technique is the commonest cause of treatment failure."),
      I("Identify triggers and how to reduce them", ["trigger", "dust", "smoke", "cold", "pet", "infection", "cooking"], "Reduce exposures."),
      I("Give an action plan and warn about danger signs", ["danger", "return", "cannot speak", "blue", "fast", "hospital", "emergency", "plan"], "She must know when to seek help."),
      I("Check adherence, rinse mouth after steroid, follow up", ["adherence", "rinse", "mouth", "follow", "review", "clinic"], "Support long-term control."),
    ],
    model: "“Asthma makes the airways narrow and inflamed. The blue inhaler relieves an attack; the brown/orange one is taken every day to prevent attacks. Shake it, put it in the spacer, give one puff and let her breathe in and out five times, then wait a minute before the next. Keep her away from smoke and dust. Come to hospital at once if she cannot speak a full sentence, is breathing fast, has blue lips or the blue inhaler does not help. Rinse her mouth after the steroid and bring her to clinic in a month.”",
  },
  {
    id: "anc-danger", title: "Antenatal danger signs and birth preparedness", rotation: "obgyn",
    task: "Counsel a 22-year-old primigravida at 28 weeks about danger signs in pregnancy and how to prepare for delivery.",
    items: [
      I("Warn about bleeding, severe headache, blurred vision, fits, swelling, fever", ["bleed", "headache", "vision", "fit", "swell", "fever"], "Early recognition of pre-eclampsia, APH and sepsis."),
      I("Reduced fetal movements and leaking fluid or labour before 37 weeks", ["movement", "fetal", "leak", "fluid", "labour", "contraction", "preterm"], "Fetal and preterm warnings."),
      I("Plan the place of delivery, transport, savings and a companion", ["transport", "plan", "hospital", "facility", "money", "save", "companion", "birth"], "A birth plan reduces delay."),
      I("Reinforce ANC visits, iron/folate, malaria prevention (ITN, IPT), HIV and syphilis testing", ["iron", "folate", "net", "itn", "ipt", "hiv", "syphilis", "visit", "anc"], "Core ANC package."),
      I("Invite questions and arrange follow-up", ["question", "follow", "next", "return", "visit"], "Close the loop."),
    ],
    model: "“Come to hospital at once if you have vaginal bleeding, a severe headache, blurred vision, fits, swelling of the face or hands, fever, leaking fluid, regular contractions or the baby moves less. Please plan where you will deliver, how you will get there and who will go with you, and save some money. Take iron and folate, sleep under a net, take your malaria prevention and get tested for HIV and syphilis. Keep all your visits. What questions do you have?”",
  },
  {
    id: "suicide", title: "Assessing suicide risk", rotation: "psychiatry",
    task: "A 34-year-old woman with newly diagnosed HIV is withdrawn and not eating. Write how you would ask about suicide and what you would do with the answer.",
    items: [
      I("Build rapport and normalise the question", ["rapport", "difficult", "many people", "feel", "worry", "concerned"], "Ask with warmth."),
      I("Ask directly about thoughts of ending her life, then plan, intent and means", ["suicid", "end your life", "kill", "plan", "intent", "means", "tablets"], "Direct questions do not increase risk."),
      I("Ask about previous attempts, hopelessness, support, alcohol and psychosis", ["previous", "attempt", "hopeless", "support", "alcohol", "voices"], "These stratify risk."),
      I("Protect: remove means, involve family, decide on admission", ["remove", "family", "admit", "safe", "watch", "means", "supervis"], "Management follows risk."),
      I("Treat the depression and arrange follow-up", ["treat", "antidepress", "counsel", "follow", "review", "support"], "Treat the underlying illness."),
    ],
    model: "“It sounds as though things have been very hard since the diagnosis. Many people in your situation have thoughts of not wanting to go on. Have you had thoughts of ending your life? Have you made a plan, and do you have the means? Have you made any previous attempts? Do you feel hopeless? Do you drink alcohol or hear voices? What keeps you going? Who is at home with you? Based on what you tell me, I would keep you safe — involve your sister, remove tablets, and consider admission — and start treatment for depression with follow-up in a few days.”",
  },
  {
    id: "consent-surg", title: "Consent for emergency surgery", rotation: "surgery",
    task: "A 19-year-old with appendicitis needs an appendicectomy. Obtain consent from him and explain the risks.",
    items: [
      I("Explain the diagnosis and why surgery is needed", ["appendic", "inflam", "infect", "burst", "perforat", "operation", "need"], "He must understand why."),
      I("Describe what the operation involves and the anaesthetic", ["incision", "laparoscop", "open", "anaesth", "asleep", "remove"], "Explain the procedure."),
      I("State the main risks and alternatives", ["risk", "bleed", "infection", "wound", "abscess", "alternative", "antibiotic"], "Material risks are part of informed consent."),
      I("Check understanding, give time and answer questions", ["question", "understand", "time", "worr", "check"], "Consent is a conversation."),
      I("Record consent, check capacity, and discuss recovery", ["sign", "consent", "capacity", "recovery", "pain", "discharge"], "Documentation and aftercare."),
    ],
    model: "“You have appendicitis — an inflamed appendix which could burst if we wait. I recommend an operation to remove it, under general anaesthetic, through a small cut or with keyhole instruments. Risks include bleeding, wound infection and an abscess; an alternative is antibiotics alone but it carries a higher risk of recurrence. Do you have any questions? If you agree, please sign here. After the operation you will have some pain and go home in one to two days.”",
  },
];

const norm = (s: string) => s.toLowerCase();
export function gradeCounsel(c: Counsel, text: string): { item: CounselItem; ok: boolean }[] {
  const t = norm(text);
  return c.items.map((item) => { const hits = item.words.filter((w) => t.includes(w)).length; return { item, ok: hits >= (item.words.length >= 8 ? 2 : 1) }; });
}
