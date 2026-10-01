// Free-text marking and generated practice, with no server: keyword coverage against what the case actually contains.
// It is deliberately transparent — every criterion says what it looked for and what was missing, and a model answer is always shown.
import { EXAM_SETS, HISTORY_SETS, mcq, o } from "./templates";
import { PROBLEMS } from "./extras/problems";
import { DRUGS, type Drug } from "./extras/drugs";
import type { CaseDef, ExItem, HxItem, MCQ } from "./types";

const STOP = new Set("with that this have from were been they their there which about into than then also very some more most only over after before while when what where whom does done doing for and the are was has had not but can may will would should could patient patients history examination signs sign finding findings noted none normal there is its his her she him he it a an of to in on at by or as be".split(" "));
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9. ]+/g, " ").replace(/\s+/g, " ").trim();
/** Content words, reduced to a 5-letter stem so "breathlessness"/"breathless" and "oedema"/"oedematous" match. */
export function stems(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of norm(text).split(" ")) {
    if (!w) continue;
    if (/^\d/.test(w)) { if (w.replace(/[^0-9]/g, "").length >= 2) out.add(w.replace(/\.$/, "")); continue; }
    if (w.length < 4 || STOP.has(w)) continue;
    out.add(w.slice(0, 5));
  }
  return out;
}
const overlap = (need: Set<string>, have: Set<string>) => { let n = 0; need.forEach((x) => { if (have.has(x)) n++; }); return n; };
export const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

export function hxItems(c: CaseDef): HxItem[] { return [...c.hsets.flatMap((s) => HISTORY_SETS[s] ?? []), ...(c.hxExtra ?? [])].filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i); }
export function exItems(c: CaseDef): ExItem[] { return [...c.esets.flatMap((s) => EXAM_SETS[s] ?? []), ...(c.exExtra ?? [])]; }
const shortLabel = (l: string) => l.split(/[:—(]/)[0].trim().replace(/[?]$/, "");

// ------------------------------------------------------------------ case presentation
export const PRESENT_FIELDS: { id: string; label: string; hint: string; rows: number }[] = [
  { id: "ident", label: "1. Identification", hint: "Age, sex, who brought them, setting. One sentence.", rows: 2 },
  { id: "cc", label: "2. Presenting complaint", hint: "The main problem in the patient’s words, with duration.", rows: 2 },
  { id: "hpc", label: "3. History of presenting complaint", hint: "Onset, progression, associated symptoms, and the relevant negatives.", rows: 4 },
  { id: "rel", label: "4. Relevant background", hint: "Past history, drugs, allergies, family and social history that matter.", rows: 3 },
  { id: "exam", label: "5. Examination", hint: "Vitals first, then the abnormal findings system by system, and the key negatives.", rows: 4 },
  { id: "summary", label: "6. Summary", hint: "One or two sentences that tie the story together.", rows: 3 },
  { id: "problems", label: "7. Problem list", hint: "Every active problem, most dangerous first.", rows: 3 },
  { id: "ddx", label: "8. Differential diagnosis, with reasons", hint: "Your leading diagnosis and the can’t-miss ones — and why for each.", rows: 4 },
  { id: "ix", label: "9. Investigations", hint: "What you would order and what each would tell you.", rows: 3 },
  { id: "mgmt", label: "10. Management", hint: "Immediate steps, then definitive treatment and follow-up.", rows: 3 },
];

const sentence = (s: string) => s.split(/(?<=[.!?])\s/)[0]?.trim() ?? s;
const correct = (q: MCQ) => q.options.filter((x) => x.ok).map((x) => x.t.replace(/\.$/, ""));

export function problemsOf(c: CaseDef) { return PROBLEMS[c.id]; }

/** An excellent Year 4 presentation, assembled from the case's own facts. */
export function modelPresentation(c: CaseDef): Record<string, string> {
  const hx = hxItems(c); const ex = exItems(c);
  const ans = (id: string) => c.hx[id] ?? hx.find((x) => x.id === id)?.def ?? "";
  const fnd = (id: string) => c.ex[id] ?? ex.find((x) => x.id === id)?.def ?? "";
  const relIds = c.hxKey.filter((k) => ["pmh", "drugs", "fh", "alc", "smoke", "allergy", "adm", "sex", "past", "meds", "subst", "birth", "imm", "gyn", "prevob", "occ", "travel"].includes(k));
  const hpcIds = c.hxKey.filter((k) => !relIds.includes(k));
  const first = sentence(c.vignette);
  const split = first.match(/^(.*?)\s+(?:is|are|was|were|has|have|presents?|arrives?|attends?|collapses|becomes|wakes|rushes|comes?)\b(.*)$/i);
  const subject = (split ? split[1] : first.replace(/\.$/, "")).replace(/[,;\s]+$/, "");
  const rest = (split ? split[0].slice(subject.length).trim() : "").replace(/\.$/, "");
  const withPart = rest.replace(/^.*?\b(?:with|complaining of)\s+/i, "");
  const tidy = rest.replace(/^(?:is|are|was|were|has been|has|have)\s+/i, "");
  const complaint = rest ? (withPart !== rest ? `Presenting with ${withPart}` : tidy.charAt(0).toUpperCase() + tidy.slice(1)) : first.replace(/\.$/, "");
  const lc = (t: string) => (t.length > 1 && t[1] === t[1].toLowerCase() ? t.charAt(0).toLowerCase() + t.slice(1) : t);
  const likely = c.ddx.find((d) => d.tier === "likely") ?? c.ddx[0];
  const danger = c.ddx.filter((d) => d.tier === "dangerous");
  const p = PROBLEMS[c.id];
  const exKey = c.exKey.map((id) => ({ id, label: shortLabel(ex.find((x) => x.id === id)?.label ?? id), text: fnd(id) }));
  const ixKey = c.ix.filter((x) => x.use === "key");
  const mg = [...(c.event ? correct(c.event.q) : []), ...correct(c.mgmt)];
  return {
    ident: `I would like to present ${lc(subject)}, seen in ${c.setting.charAt(0).toLowerCase() + c.setting.slice(1)}.`,
    cc: complaint + ".",
    hpc: hpcIds.slice(0, 7).map((k) => ans(k)).join(" ") || c.vignette,
    rel: relIds.map((k) => ans(k)).join(" ") || ans("pmh"),
    exam: exKey.map((e) => `${e.label}: ${e.text}`).join(" "),
    summary: `In summary, this is ${lc(subject)}. ${complaint}. On examination: ${exKey.slice(0, 3).map((e) => e.text.replace(/\.$/, "")).join("; ")}. This is most in keeping with ${likely.name}, but I must exclude ${danger.length ? danger.map((d) => d.name).join(" and ") : "other dangerous causes"}.`,
    problems: p ? p.active.map(([n], i) => `${i + 1}. ${n}`).join("  ") : "",
    ddx: c.ddx.map((d) => `${d.name} — ${d.why}`).join("  "),
    ix: ixKey.map((x) => `${x.label} (${x.meaning.split(/[.;]/)[0]})`).join("; ") + ".",
    mgmt: mg.join("; ") + ".",
  };
}

export interface Criterion { id: string; label: string; score: number; note: string; missing?: string[] }
export interface PresentGrade { criteria: Criterion[]; total: number }

const mark = (s: number) => (s >= 0.7 ? "✓" : s >= 0.35 ? "△" : "✗");
export { mark };

export function gradePresentation(c: CaseDef, ans: Record<string, string>): PresentGrade {
  const hx = hxItems(c); const ex = exItems(c);
  const all = Object.values(ans).join(" ");
  const allStems = stems(all);
  const filled = PRESENT_FIELDS.filter((f) => wordCount(ans[f.id] ?? "") >= 3);
  const lastFilled = PRESENT_FIELDS.reduce((m, f, i) => (wordCount(ans[f.id] ?? "") >= 3 ? i : m), -1);
  const gaps = PRESENT_FIELDS.slice(0, lastFilled + 1).filter((f) => wordCount(ans[f.id] ?? "") < 3);

  const cov = (fieldIds: string[], needText: string, cap: number) => {
    const need = stems(needText); const have = stems(fieldIds.map((f) => ans[f] ?? "").join(" "));
    return need.size ? Math.min(1, overlap(need, have) / Math.min(need.size, cap)) : 1;
  };
  const model = modelPresentation(c);
  const hpcCov = cov(["cc", "hpc"], model.cc + " " + model.hpc, 14);
  const relCov = model.rel ? cov(["rel", "hpc"], model.rel, 8) : 1;
  const examCov = cov(["exam"], model.exam, 16);

  // Differentials
  const ddText = norm(ans.ddx ?? "") + " " + norm(ans.summary ?? "");
  const named = c.ddx.map((d) => [d, [d.name, ...d.aliases].map(norm).some((n) => n.length >= 3 && ddText.includes(n))] as const);
  const hitDdx = named.filter(([, h]) => h).length;
  const likelyHit = named.some(([d, h]) => h && d.tier === "likely");
  const ddxScore = Math.min(1, (Math.min(hitDdx, 3) / Math.min(3, c.ddx.length)) * 0.8 + (likelyHit ? 0.2 : 0));
  const because = (ans.ddx ?? "").match(/\b(because|due to|since|as he|as she|as the|supports?|against|in keeping|consistent|favou?rs|evidence|suggest|which explains|explains|points to|makes it)\b/gi)?.length ?? 0;
  const justScore = wordCount(ans.ddx ?? "") < 6 ? 0 : Math.min(1, because / 3);
  // Danger
  const dangerous = named.filter(([d]) => d.tier === "dangerous");
  const dangerWords = /\b(urgent|immediate|resuscitat|abcde|unstable|life.threaten|escalat|senior|emergency|can.?t.miss|exclude|rule out|critical)\b/i.test(all);
  const dangerScore = dangerous.length ? Math.min(1, dangerous.filter(([, h]) => h).length / Math.min(dangerous.length, 2) * 0.8 + (dangerWords ? 0.2 : 0)) : dangerWords ? 1 : 0.4;
  // Problem list
  const pr = PROBLEMS[c.id];
  const probHave = stems((ans.problems ?? "") + " " + (ans.summary ?? ""));
  const probHits = pr ? pr.active.filter(([n]) => { const t = stems(n); return t.size && overlap(t, probHave) / t.size >= 0.4; }) : [];
  const probScore = pr ? Math.min(1, probHits.length / Math.min(4, pr.active.length)) : 1;
  // Investigations & management
  const ixKey = c.ix.filter((x) => x.use === "key");
  const ixHave = stems(ans.ix ?? "");
  const ixHits = ixKey.filter((x) => { const t = stems(shortLabel(x.label)); return t.size && overlap(t, ixHave) / t.size >= 0.5; });
  const ixScore = ixKey.length ? Math.min(1, ixHits.length / Math.min(4, ixKey.length)) : 1;
  const mgOpts = [...(c.event ? correct(c.event.q) : []), ...correct(c.mgmt)];
  const mgHave = stems(ans.mgmt ?? "");
  const mgHits = mgOpts.filter((t) => { const s = stems(t); return s.size && overlap(s, mgHave) / s.size >= 0.4; });
  const mgScore = Math.min(1, mgHits.length / Math.min(4, Math.max(mgOpts.length, 1)));
  // Organisation: filled in order, a short summary, and no giant paragraph in one box.
  const sumWords = wordCount(ans.summary ?? "");
  const orgScore = Math.min(1, (lastFilled < 0 ? 0 : 1 - gaps.length / (lastFilled + 1)) * 0.6 + (sumWords >= 12 && sumWords <= 70 ? 0.4 : sumWords > 0 ? 0.15 : 0));

  const relevance = (hpcCov + relCov + examCov) / 3;
  const miss = (arr: string[]) => (arr.length ? arr.slice(0, 4) : undefined);
  const missingHx = c.hxKey.filter((k) => { const t = stems(ans[ "hpc" ] + " " + ans.rel + " " + ans.cc); const s = stems(hx.find((x) => x.id === k) ? (c.hx[k] ?? "") : ""); return s.size && overlap(s, t) / s.size < 0.25; }).map((k) => shortLabel(hx.find((x) => x.id === k)?.label ?? k));
  const missingEx = c.exKey.filter((k) => { const s = stems(c.ex[k] ?? ""); return s.size && overlap(s, stems(ans.exam ?? "")) / s.size < 0.25; }).map((k) => shortLabel(ex.find((x) => x.id === k)?.label ?? k));

  const criteria: Criterion[] = [
    { id: "complete", label: "Completeness", score: filled.length / PRESENT_FIELDS.length, note: filled.length === PRESENT_FIELDS.length ? "Every section was addressed." : "Sections left empty or too short.", missing: miss(PRESENT_FIELDS.filter((f) => wordCount(ans[f.id] ?? "") < 3).map((f) => f.label.replace(/^\d+\.\s/, ""))) },
    { id: "relevance", label: "Clinical relevance", score: relevance, note: "Did you report the history and findings that actually move the diagnosis, rather than everything?", missing: miss([...missingHx.map((x) => "history: " + x), ...missingEx.map((x) => "exam: " + x)]) },
    { id: "organisation", label: "Organisation", score: orgScore, note: "Standard order, no gaps, and a summary of 12–70 words that ties the story together." },
    { id: "ddx", label: "Differential diagnosis", score: ddxScore, note: `You named ${hitDdx} of the case’s ${c.ddx.length} expected differentials${likelyHit ? ", including the leading one." : ", but not the leading diagnosis."}`, missing: miss(named.filter(([, h]) => !h).map(([d]) => d.name)) },
    { id: "justify", label: "Justification of differentials", score: justScore, note: "Good presentations give a reason for each: ‘because…’, ‘supported by…’, ‘against it is…’." },
    { id: "danger", label: "Recognition of danger signs", score: dangerScore, note: dangerous.length ? "Did you name the dangerous diagnoses and say what makes this urgent?" : "Did you state urgency and what could kill the patient first?", missing: miss(dangerous.filter(([, h]) => !h).map(([d]) => d.name)) },
    { id: "problems", label: "Problem list", score: probScore, note: pr ? `You covered ${probHits.length} of the ${pr.active.length} active problems.` : "—", missing: miss(pr ? pr.active.filter(([n]) => !probHits.some(([m]) => m === n)).map(([n]) => n) : []) },
    { id: "ix", label: "Investigation plan", score: ixScore, note: `You mentioned ${ixHits.length} of ${ixKey.length} key investigations.`, missing: miss(ixKey.filter((x) => !ixHits.includes(x)).map((x) => x.label)) },
    { id: "mgmt", label: "Management plan", score: mgScore, note: `You covered ${mgHits.length} of ${mgOpts.length} key management steps.`, missing: miss(mgOpts.filter((t) => !mgHits.includes(t)).map((t) => t.length > 90 ? t.slice(0, 88) + "…" : t)) },
  ];
  void allStems;
  const total = criteria.reduce((s, x) => s + x.score, 0) / criteria.length;
  return { criteria, total };
}

// ------------------------------------------------------------------ examination reporting
export function modelReport(c: CaseDef): string {
  const ex = exItems(c);
  const items = c.exKey.map((id) => ({ label: shortLabel(ex.find((x) => x.id === id)?.label ?? id), text: c.ex[id] ?? ex.find((x) => x.id === id)?.def ?? "" }));
  const normals = ex.filter((x) => !(x.id in c.ex) && !/^(recorded|not )/i.test(x.def) && x.group !== "Mental state examination").slice(0, 3).map((x) => `${shortLabel(x.label).toLowerCase()}: ${x.def.replace(/\.$/, "").toLowerCase()}`);
  return `On examination: ${items.map((i) => `${i.label.toLowerCase()} — ${i.text.replace(/\.$/, "")}`).join("; ")}.${normals.length ? " Pertinent negatives: " + normals.join("; ") + "." : ""}`;
}

export function gradeReport(c: CaseDef, text: string): Criterion[] {
  const ex = exItems(c);
  const need = c.exKey.map((id) => ({ id, label: shortLabel(ex.find((x) => x.id === id)?.label ?? id), s: stems(c.ex[id] ?? "") }));
  const have = stems(text);
  const hit = need.filter((n) => n.s.size && overlap(n.s, have) / n.s.size >= 0.35);
  const cover = need.length ? hit.length / need.length : 0;
  const neg = /\b(no|not|nil|normal|absent|clear|unremarkable|intact|without|negative|afebrile)\b/i.test(text);
  const structure = ["general", "inspection", "palpation", "percuss", "auscult", "vital", "blood pressure", "pulse", "jvp", "chest", "abdom", "neuro"].filter((w) => text.toLowerCase().includes(w)).length;
  return [
    { id: "abn", label: "Abnormal findings reported", score: cover, note: `You reported ${hit.length} of ${need.length} key findings.`, missing: need.filter((n) => !hit.includes(n)).map((n) => n.label).slice(0, 5) },
    { id: "neg", label: "Pertinent negatives and normals", score: neg ? (wordCount(text) >= 25 ? 1 : 0.6) : 0, note: "Say what is normal too: ‘no pallor, no jaundice, JVP not raised’ shows you looked." },
    { id: "struct", label: "Systematic order", score: Math.min(1, structure / 3), note: "Vital signs → general → the system examined (inspect, palpate, percuss, auscultate)." },
  ];
}

// ------------------------------------------------------------------ Normal or abnormal?
export interface FindingQ { id: string; label: string; text: string; abnormal: boolean; looking: string }
export function findingsDrill(c: CaseDef, n = 8): FindingQ[] {
  const ex = exItems(c);
  const abn = ex.filter((x) => c.exKey.includes(x.id) && c.ex[x.id] && x.id !== "vit").map((x) => ({ id: x.id, label: shortLabel(x.label), text: c.ex[x.id], abnormal: true, looking: x.looking }));
  const nor = ex.filter((x) => !(x.id in c.ex) && !/^(recorded|not )/i.test(x.def)).map((x) => ({ id: x.id, label: shortLabel(x.label), text: x.def, abnormal: false, looking: x.looking }));
  const half = Math.floor(n / 2);
  const shuffled = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);
  const picked = [...shuffled(abn).slice(0, half), ...shuffled(nor).slice(0, n - Math.min(half, abn.length))];
  return shuffled(picked);
}

// ------------------------------------------------------------------ Drug reasoning
const pick = <T,>(a: T[], k: number): T[] => [...a].sort(() => Math.random() - 0.5).slice(0, k);
const first = (s: string, n = 28) => s.split(/\s+/).slice(0, n).join(" ") + (s.split(/\s+/).length > n ? "…" : "");

export function drugQuestions(d: Drug, context = ""): MCQ[] {
  const others = DRUGS.filter((x) => x.id !== d.id && x.cls.split(/[ (/]/)[0] !== d.cls.split(/[ (/]/)[0]);
  const hint = (ans: string) => [context ? `In this setting: ${context}` : `Think about what ${d.name} is used for: ${first(d.why, 14)}`, `The answer starts with “${ans.slice(0, 14)}…”.`, `The answer contains: ${first(ans, 5)}…`];
  const uniq = (f: (x: Drug) => string) => { const seen = new Set([f(d)]); return others.filter((x) => { const t = f(x); if (seen.has(t)) return false; seen.add(t); return true; }); };
  const q1 = mcq(`dr-${d.id}-1`, "pharmacology", `Why ${d.name} — which class does it belong to?`, [o(d.cls, true, d.why), ...pick(uniq((x) => x.cls), 3).map((x) => o(x.cls, false, `That is the class of ${x.name}.`))].sort(() => Math.random() - 0.5), hint(d.cls), `${d.name} is a ${d.cls.toLowerCase()}. ${d.why}`);
  const q2 = mcq(`dr-${d.id}-2`, "pharmacology", `What is the mechanism of ${d.name}?`, [o(d.mech, true, "This is the mechanism."), ...pick(uniq((x) => x.mech), 3).map((x) => o(x.mech, false, `That describes ${x.name}.`))].sort(() => Math.random() - 0.5), hint(d.mech), `Mechanism: ${d.mech} Linking mechanism to effect is what lets you predict adverse effects.`);
  const aeOwn = pick(d.ae, Math.min(2, d.ae.length));
  const aeWrong = pick(others.flatMap((x) => x.ae).filter((a) => !d.ae.some((b) => b.slice(0, 12) === a.slice(0, 12))), 2);
  const q3 = mcq(`dr-${d.id}-3`, "pharmacology", `Which are important adverse effects of ${d.name}? (select all that apply)`, [...aeOwn.map((a) => o(a, true, "A recognised adverse effect.")), ...aeWrong.map((a) => o(a, false, "That belongs to a different drug."))].sort(() => Math.random() - 0.5), [`Think of the mechanism: ${first(d.mech, 16)}`, `One of them is: ${d.ae[0].slice(0, 22)}…`, "Two are correct."], `Adverse effects of ${d.name}: ${d.ae.join("; ")}.`);
  const q4 = mcq(`dr-${d.id}-4`, "pharmacology", `When must you avoid ${d.name} or take extra care?`, [o(d.caution, true, "This is the key caution."), ...pick(uniq((x) => x.caution), 3).map((x) => o(x.caution, false, `That caution belongs to ${x.name}.`))].sort(() => Math.random() - 0.5), hint(d.caution), `Cautions: ${d.caution}`);
  const q5 = mcq(`dr-${d.id}-5`, "pharmacology", `What changes in renal impairment, pregnancy or children for ${d.name}?`, [o(d.special, true, "This is the special-populations rule."), ...pick(uniq((x) => x.special), 3).map((x) => o(x.special, false, `That applies to ${x.name}.`))].sort(() => Math.random() - 0.5), hint(d.special), `Special populations: ${d.special} Typical dose: ${d.dose}`);
  return [q1, q2, q3, q4, q5];
}
