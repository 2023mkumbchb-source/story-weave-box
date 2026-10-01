// Patient role-play: match a question typed in the learner's own words to the history item it asks about.
import { stems } from "./grading";
import type { HxItem } from "./types";

/** Extra words a student might use for each history item, on top of the item's own label. */
const SYN: Record<string, string> = {
  onset: "start started begin began when onset long ago how sudden", prog: "worse better progress changed since getting", sev: "limit activities daily walk manage cope function", agg: "worse better aggravate relieve trigger makes",
  fever: "fever temperature hot chills sweats rigors shivering", wt: "weight appetite eating lost loss thinner", cp: "chest pain pressure tightness heaviness", palp: "palpitations heart racing fluttering dizzy dizziness faint blackout collapse",
  sob: "breath breathless breathing short pillows orthopnoea flat lying gasping night wake dyspnoea wheeze", cough: "cough sputum phlegm coughing blood haemoptysis", gi: "nausea vomiting vomit sick blood stool melaena black diarrhoea", abd: "abdominal belly stomach tummy pain jaundice yellow bowel constipation",
  gu: "urine urinate passing pee frothy burning dysuria bladder", neuro: "headache weakness speech vision fits seizure convulsion confusion numbness", skin: "rash joint bruising bleeding", swell: "swelling swollen legs ankles face oedema puffy",
  pmh: "history illness illnesses diabetes hypertension pressure asthma hiv tb epilepsy conditions known diagnosed", adm: "admission admitted hospital surgery operation previous before", drugs: "medication medicine medicines tablets drugs herbal pills taking treatment",
  allergy: "allergy allergic", fh: "family relatives father mother brother sister runs inherited", occ: "work job occupation lives home living exposure", alc: "alcohol drink drinking beer brew spirits", smoke: "smoke smoking cigarette cigarettes tobacco",
  subst: "recreational miraa khat bhang cannabis substances street", sex: "sexual partner partners hiv test status", travel: "travel travelled trip lake abroad", gyn: "menstrual periods cycle contraception", lnmp: "period lmp menstrual pregnant weeks gestation due",
  gp: "pregnancies children para gravida births deliveries", fm: "baby movements kicks moving", bleed: "bleeding blood vagina spotting", leak: "water fluid leaking membranes broke", contr: "contractions labour tightening pains", anc: "antenatal clinic visits attended scan",
  htn: "headache swelling vision epigastric", prevob: "previous caesarean delivery complications pregnancy", danger: "drink feed vomiting convulsions lethargic unconscious fits", resp: "breathing fast cough chest indrawing", feed: "feeding breastfeeding eating milk appetite", imm: "immunisation vaccines vaccinated immunised",
  birth: "birth born delivery premature weight hospital home", dev: "development milestones walking talking sitting school", hiv: "hiv status mother tested", mood: "mood sad low depressed happy irritable interest enjoy", sleep: "sleep sleeping insomnia appetite", psychosis: "voices hearing seeing beliefs watched paranoid hallucinations delusions",
  anx: "worry anxious panic fear avoid", cog: "confused confusion memory orientation head injury", meds: "medicines steroids antimalarials arvs efavirenz medical", "risk-self": "suicide suicidal harm yourself kill die end life self-harm", "risk-other": "hurt others violence aggression harm someone", past: "previous psychiatric treatment admission relapse",
  fam: "family psychiatric suicide history", collat: "family friends relatives collateral informant brought", pers: "childhood education school work relationships trauma abuse",
};

export function matchQuestion(text: string, items: HxItem[]): HxItem | null {
  const q = stems(text);
  if (q.size === 0) return null;
  let best: { item: HxItem; score: number } | null = null;
  for (const it of items) {
    const pool = stems(`${it.label} ${SYN[it.id] ?? ""}`);
    const label = stems(it.label);
    let s = 0;
    q.forEach((w) => { if (pool.has(w)) s += label.has(w) ? 2 : 1; });
    if (s > 0 && (!best || s > best.score)) best = { item: it, score: s };
  }
  return best ? best.item : null;
}
