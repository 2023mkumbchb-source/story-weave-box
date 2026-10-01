import type { CaseDef, Ddx, MCQ, Skill } from "./types";

export interface McqResult { earned: number; correctPicked: number[]; wrongPicked: number[]; missed: number[]; allRight: boolean }

/** Score a (single or multi) choice question. Partial credit for multi-select; wrong picks subtract. */
export function scoreMcq(q: MCQ, picked: number[], hintsUsed: number, retried: boolean): McqResult {
  const right = q.options.map((o, i) => (o.ok ? i : -1)).filter((i) => i >= 0);
  const correctPicked = picked.filter((i) => q.options[i]?.ok);
  const wrongPicked = picked.filter((i) => !q.options[i]?.ok);
  const missed = right.filter((i) => !picked.includes(i));
  let raw = right.length ? (correctPicked.length - wrongPicked.length) / right.length : 0;
  raw = Math.max(0, Math.min(1, raw));
  const penalty = Math.min(0.45, hintsUsed * 0.12) + (retried ? 0.25 : 0);
  return { earned: Math.max(0, raw * (1 - penalty)), correctPicked, wrongPicked, missed, allRight: wrongPicked.length === 0 && missed.length === 0 };
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/** Which of the case's differentials does the learner's free text correspond to? */
export function matchDdx(text: string, list: Ddx[]): number {
  const t = norm(text);
  if (t.length < 2) return -1;
  for (let i = 0; i < list.length; i++) {
    const names = [list[i].name, ...list[i].aliases].map(norm);
    if (names.some((n) => n === t || (t.length >= 3 && n.includes(t)) || (n.length >= 3 && t.includes(n)))) return i;
  }
  return -1;
}

export const pct = (e: number, t: number) => (t > 0 ? Math.round((e / t) * 100) : 0);

export type SkillTally = Partial<Record<Skill, [number, number]>>;
export function addScore(tally: SkillTally, skill: Skill, earned: number, total = 1): SkillTally {
  const [e, t] = tally[skill] ?? [0, 0];
  return { ...tally, [skill]: [e + earned, t + total] };
}

export const STAGES_BY_MODE: Record<string, string[]> = {
  full: ["intro", "history", "exam", "ddx", "ix", "event", "twist", "dx", "mgmt", "consult", "summary"],
  ddx: ["intro", "ddx", "summary"],
  history: ["intro", "history", "summary"],
  exam: ["intro", "exam", "summary"],
  ix: ["intro", "ix", "summary"],
  emergency: ["intro", "event", "summary"],
};

export const MODE_INFO: Record<string, { label: string; blurb: string }> = {
  full: { label: "Full ward round", blurb: "From the first sentence to the management plan." },
  ddx: { label: "Differential diagnosis", blurb: "Handover given — generate and justify differentials." },
  history: { label: "History taking", blurb: "Ask the right questions; see what you missed." },
  exam: { label: "Examination", blurb: "Choose what to examine and why." },
  ix: { label: "Investigation interpretation", blurb: "Order tests and read the results." },
  emergency: { label: "Emergency", blurb: "The patient deteriorates — what do you do NOW?" },
};

export function caseHasStage(c: CaseDef, stage: string): boolean {
  if (stage === "event") return Boolean(c.event);
  if (stage === "twist") return Boolean(c.twist);
  return true;
}
