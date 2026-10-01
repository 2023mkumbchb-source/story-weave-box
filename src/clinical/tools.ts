// Ward tools: the arithmetic and scores you are expected to do on a round. Pure functions so they are easy to check.

export const bmi = (kg: number, cm: number) => (cm > 0 ? kg / ((cm / 100) ** 2) : NaN);
export const bmiBand = (b: number) => (b < 18.5 ? "Underweight" : b < 25 ? "Normal" : b < 30 ? "Overweight" : "Obese");
export const map = (sys: number, dia: number) => dia + (sys - dia) / 3;
export const shockIndex = (hr: number, sys: number) => (sys > 0 ? hr / sys : NaN);
/** APLS-style estimate for 1–10 years; infants use (months/2)+4. */
export const paedWeight = (years: number) => (years >= 1 ? (years + 4) * 2 : (years * 12) / 2 + 4);
/** 4-2-1 rule, ml/hour. */
export const maintenancePerHour = (kg: number) => (kg <= 10 ? 4 * kg : kg <= 20 ? 40 + 2 * (kg - 10) : 60 + (kg - 20));
export const parkland = (kg: number, tbsa: number) => 4 * kg * tbsa;
export const anionGap = (na: number, cl: number, hco3: number, k = 0) => na + k - cl - hco3;
export const correctedCalcium = (ca: number, albumin: number) => ca + 0.02 * (40 - albumin);
export const correctedSodium = (na: number, glucose: number) => na + 0.3 * (glucose - 5.5); // mmol/L, 1.6 mEq per 100 mg/dL ≈ 0.3 per mmol
export const eGFRCockcroft = (age: number, kg: number, creatUmol: number, female: boolean) => ((140 - age) * kg * (female ? 1.04 : 1.23)) / creatUmol;
export function eddFromLmp(lmp: Date) { const d = new Date(lmp); d.setDate(d.getDate() + 280); return d; }
export function gestationDays(lmp: Date, on = new Date()) { return Math.floor((on.getTime() - lmp.getTime()) / 86_400_000); }
export const fmtGa = (days: number) => `${Math.floor(days / 7)} weeks ${days % 7} days`;
export const ivDose = (mgPerKg: number, kg: number) => mgPerKg * kg;

export interface Check { id: string; label: string; pts: number }
export interface ScoreDef { id: string; title: string; blurb: string; items: Check[]; band: (s: number) => { text: string; tone: "good" | "warn" | "bad" } }

export const SCORES: ScoreDef[] = [
  {
    id: "curb65", title: "CURB-65 (pneumonia severity)", blurb: "Decides ward vs home vs ICU for community-acquired pneumonia.",
    items: [{ id: "c", label: "Confusion (new)", pts: 1 }, { id: "u", label: "Urea > 7 mmol/L", pts: 1 }, { id: "r", label: "Respiratory rate ≥ 30/min", pts: 1 }, { id: "b", label: "BP systolic < 90 or diastolic ≤ 60", pts: 1 }, { id: "a", label: "Age ≥ 65", pts: 1 }],
    band: (s) => (s <= 1 ? { text: "Low risk — consider outpatient treatment.", tone: "good" } : s === 2 ? { text: "Moderate risk — hospital admission.", tone: "warn" } : { text: "High risk — urgent admission, consider HDU/ICU.", tone: "bad" }),
  },
  {
    id: "qsofa", title: "qSOFA (sepsis screen)", blurb: "Two or more suggests a higher risk of poor outcome from infection.",
    items: [{ id: "r", label: "Respiratory rate ≥ 22/min", pts: 1 }, { id: "a", label: "Altered mentation (GCS < 15)", pts: 1 }, { id: "s", label: "Systolic BP ≤ 100 mmHg", pts: 1 }],
    band: (s) => (s >= 2 ? { text: "High risk of sepsis-related death — resuscitate, culture, antibiotics within the hour.", tone: "bad" } : { text: "Lower risk, but keep reassessing.", tone: "good" }),
  },
  {
    id: "wells", title: "Wells score (pulmonary embolism)", blurb: "Pre-test probability to decide between D-dimer and CT pulmonary angiography.",
    items: [{ id: "d", label: "Clinical signs of DVT", pts: 3 }, { id: "a", label: "PE is the most likely diagnosis", pts: 3 }, { id: "h", label: "Heart rate > 100", pts: 1.5 }, { id: "i", label: "Immobilisation ≥ 3 days or surgery in the last 4 weeks", pts: 1.5 }, { id: "p", label: "Previous DVT/PE", pts: 1.5 }, { id: "b", label: "Haemoptysis", pts: 1 }, { id: "m", label: "Malignancy", pts: 1 }],
    band: (s) => (s > 6 ? { text: "High probability — CTPA (and anticoagulate while waiting).", tone: "bad" } : s >= 2 ? { text: "Moderate — CTPA or D-dimer per local protocol.", tone: "warn" } : { text: "Low probability — D-dimer, and PE is unlikely if negative.", tone: "good" }),
  },
  {
    id: "cha2ds2", title: "CHA₂DS₂-VASc (stroke risk in AF)", blurb: "Guides anticoagulation in atrial fibrillation.",
    items: [{ id: "c", label: "Congestive heart failure / LV dysfunction", pts: 1 }, { id: "h", label: "Hypertension", pts: 1 }, { id: "a2", label: "Age ≥ 75", pts: 2 }, { id: "d", label: "Diabetes", pts: 1 }, { id: "s", label: "Previous stroke/TIA/thromboembolism", pts: 2 }, { id: "v", label: "Vascular disease (MI, PAD, plaque)", pts: 1 }, { id: "a", label: "Age 65–74", pts: 1 }, { id: "sc", label: "Female sex", pts: 1 }],
    band: (s) => (s >= 2 ? { text: "Anticoagulation is recommended (check bleeding risk).", tone: "bad" } : s === 1 ? { text: "Consider anticoagulation.", tone: "warn" } : { text: "Low risk — no antithrombotic therapy.", tone: "good" }),
  },
  {
    id: "apgar", title: "APGAR score (newborn)", blurb: "At 1 and 5 minutes; score each of five items 0–2. Enter total points below by ticking each item that scores 2.",
    items: [{ id: "a", label: "Appearance: pink all over", pts: 2 }, { id: "p", label: "Pulse > 100/min", pts: 2 }, { id: "g", label: "Grimace: cries/vigorous reflex", pts: 2 }, { id: "ac", label: "Activity: active movement", pts: 2 }, { id: "r", label: "Respiration: strong cry", pts: 2 }],
    band: (s) => (s >= 7 ? { text: "Reassuring.", tone: "good" } : s >= 4 ? { text: "Moderately depressed — stimulate, support breathing.", tone: "warn" } : { text: "Severely depressed — immediate resuscitation.", tone: "bad" }),
  },
];

export const GCS = {
  eye: [["Spontaneous", 4], ["To voice", 3], ["To pain", 2], ["None", 1]] as [string, number][],
  verbal: [["Orientated", 5], ["Confused", 4], ["Inappropriate words", 3], ["Incomprehensible sounds", 2], ["None", 1]] as [string, number][],
  motor: [["Obeys commands", 6], ["Localises pain", 5], ["Withdraws", 4], ["Abnormal flexion", 3], ["Extension", 2], ["None", 1]] as [string, number][],
};
export const gcsBand = (s: number) => (s <= 8 ? { text: "Severe — protect the airway (intubate if < 8 and not improving).", tone: "bad" as const } : s <= 12 ? { text: "Moderate head injury or depressed consciousness.", tone: "warn" as const } : { text: "Mild.", tone: "good" as const });

export const RANGES: { group: string; rows: [string, string][] }[] = [
  { group: "Adult vital signs", rows: [["Pulse", "60–100 /min"], ["Systolic BP", "100–140 mmHg"], ["Respiratory rate", "12–20 /min"], ["SpO₂ (room air)", "≥ 94%"], ["Temperature", "36.5–37.5 °C"]] },
  { group: "Paediatric vital signs (resting)", rows: [["Neonate", "HR 120–160 · RR 40–60"], ["1–12 months", "HR 110–160 · RR 30–50"], ["1–5 years", "HR 95–140 · RR 24–40"], ["6–12 years", "HR 80–120 · RR 18–30"], ["Fast breathing (IMCI)", "< 2 mo ≥ 60 · 2–11 mo ≥ 50 · 1–5 y ≥ 40"]] },
  { group: "Full blood count", rows: [["Haemoglobin", "♂ 13–17 · ♀ 12–15 g/dL"], ["WBC", "4–11 ×10⁹/L"], ["Platelets", "150–400 ×10⁹/L"], ["MCV", "80–100 fL"]] },
  { group: "Urea & electrolytes", rows: [["Sodium", "135–145 mmol/L"], ["Potassium", "3.5–5.0 mmol/L"], ["Chloride", "98–107 mmol/L"], ["Bicarbonate", "22–29 mmol/L"], ["Urea", "2.5–7.8 mmol/L"], ["Creatinine", "♂ 60–110 · ♀ 45–90 µmol/L"], ["Calcium (corrected)", "2.2–2.6 mmol/L"]] },
  { group: "Glucose & diabetes", rows: [["Fasting glucose", "3.9–5.5 mmol/L"], ["Diabetes (fasting)", "≥ 7.0 mmol/L"], ["Diabetes (random)", "≥ 11.1 mmol/L"], ["HbA1c", "< 6.5% (non-diabetic < 5.7%)"], ["Hypoglycaemia", "< 3.0 mmol/L (< 2.5 in a neonate)"]] },
  { group: "Liver & others", rows: [["ALT", "< 40 U/L"], ["ALP", "40–130 U/L"], ["Bilirubin", "< 21 µmol/L"], ["Albumin", "35–50 g/L"], ["CRP", "< 5 mg/L"]] },
  { group: "Arterial blood gas", rows: [["pH", "7.35–7.45"], ["pCO₂", "4.7–6.0 kPa"], ["pO₂", "11–13 kPa"], ["HCO₃⁻", "22–26 mmol/L"], ["Base excess", "−2 to +2"]] },
  { group: "Pregnancy", rows: [["Fetal heart rate", "110–160 /min"], ["Normal BP", "< 140/90 mmHg"], ["Severe hypertension", "≥ 160/110 mmHg"], ["Term", "37–42 weeks"], ["Normal Hb", "≥ 11 g/dL (anaemia < 11)"]] },
];

export interface Mnemonic { title: string; lines: string[] }
export const MNEMONICS: Mnemonic[] = [
  { title: "ABCDE — resuscitation", lines: ["A — Airway (with C-spine protection)", "B — Breathing: rate, SpO₂, chest", "C — Circulation: pulse, BP, capillary refill, access", "D — Disability: GCS/AVPU, pupils, glucose", "E — Exposure and environment"] },
  { title: "SOCRATES — pain", lines: ["Site · Onset · Character · Radiation", "Associated symptoms · Timing · Exacerbating/relieving · Severity"] },
  { title: "Presenting a case", lines: ["Identification → complaint → HPC → relevant history", "Examination → summary → problem list", "Differentials with reasons → investigations → management"] },
  { title: "Mental state examination", lines: ["Appearance & behaviour · Speech · Mood & affect", "Thought form · Thought content · Perception", "Cognition · Insight & judgment · Risk"] },
  { title: "Shock — four types", lines: ["Hypovolaemic: bleeding, dehydration, burns", "Cardiogenic: MI, arrhythmia, failure", "Obstructive: PE, tamponade, tension pneumothorax", "Distributive: sepsis, anaphylaxis, neurogenic"] },
  { title: "Hs and Ts of cardiac arrest", lines: ["Hypoxia · Hypovolaemia · Hypo/hyperkalaemia · Hypothermia (and hypoglycaemia)", "Tension pneumothorax · Tamponade · Toxins · Thrombosis (coronary/pulmonary)"] },
  { title: "Danger signs in a child (IMCI)", lines: ["Unable to drink or breastfeed · Vomits everything", "Convulsions · Lethargic or unconscious", "Plus: chest indrawing, stridor, severe malnutrition, severe dehydration"] },
  { title: "Obstetric danger signs", lines: ["Vaginal bleeding · Severe headache/blurred vision · Fits", "Fever · Reduced fetal movements · Leaking fluid", "Severe abdominal pain · Difficulty breathing"] },
  { title: "Delirium causes — I WATCH DEATH", lines: ["Infection · Withdrawal · Acute metabolic · Trauma · CNS pathology · Hypoxia", "Deficiencies · Endocrine · Acute vascular · Toxins/drugs · Heavy metals"] },
];
