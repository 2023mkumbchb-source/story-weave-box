// Simulator progress, kept on this device: every attempt, per-skill accuracy, streak, and what to revise next.
import { useSyncExternalStore } from "react";
import { SKILLS, type Skill } from "./types";
import type { SkillTally } from "./engine";

export interface Attempt { caseId: string; at: number; mode: string; tally: SkillTally; score: number; hints: number }
const KEY = "ompath_clinical_attempts";
const DRILL_KEY = "ompath_clinical_drills";

function read<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) ?? "") as T; } catch { return fallback; } }
let attempts: Attempt[] = read(KEY, []);
let drills: Record<string, [number, number]> = read(DRILL_KEY, {}); // question id → [right, seen] for spaced consultant/reasoning drills
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const snap = { get: () => ({ attempts, drills }) };
let cache = snap.get();

export function recordAttempt(a: Attempt) {
  attempts = [...attempts, a].slice(-300);
  try { localStorage.setItem(KEY, JSON.stringify(attempts)); } catch { /* storage blocked */ }
  cache = snap.get(); emit();
}
export function recordDrill(id: string, right: boolean) {
  const [r, s] = drills[id] ?? [0, 0];
  drills = { ...drills, [id]: [r + (right ? 1 : 0), s + 1] };
  try { localStorage.setItem(DRILL_KEY, JSON.stringify(drills)); } catch { /* storage blocked */ }
  cache = snap.get(); emit();
}
export function resetClinical() { attempts = []; drills = {}; try { localStorage.removeItem(KEY); localStorage.removeItem(DRILL_KEY); } catch { /* ignore */ } cache = snap.get(); emit(); }

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export function useClinicalProgress() {
  const s = useSyncExternalStore(subscribe, () => cache, () => cache);
  // Recent attempts count more than old ones, so improvement shows.
  const totals: Record<string, [number, number]> = {};
  s.attempts.slice(-40).forEach((a, i, arr) => {
    const w = 0.5 + (i / Math.max(arr.length - 1, 1)) * 0.5;
    for (const [skill, v] of Object.entries(a.tally)) { const [e, t] = totals[skill] ?? [0, 0]; totals[skill] = [e + (v as [number, number])[0] * w, t + (v as [number, number])[1] * w]; }
  });
  const skillPct = SKILLS.map((k) => ({ skill: k.id as Skill, label: k.label, pct: totals[k.id] && totals[k.id][1] > 0 ? Math.round((totals[k.id][0] / totals[k.id][1]) * 100) : null, seen: totals[k.id]?.[1] ?? 0 }));
  const weak = skillPct.filter((x) => x.pct !== null && x.seen >= 2).sort((a, b) => (a.pct as number) - (b.pct as number)).slice(0, 2).filter((x) => (x.pct as number) < 75);
  const lastByCase: Record<string, Attempt> = {};
  s.attempts.forEach((a) => { lastByCase[a.caseId] = a; });
  const days = new Set(s.attempts.map((a) => new Date(a.at).toDateString()));
  let streak = 0;
  for (let i = days.has(new Date().toDateString()) ? 0 : 1; i < 400; i++) { const d = new Date(); d.setDate(d.getDate() - i); if (days.has(d.toDateString())) streak++; else break; }
  return { attempts: s.attempts, drills: s.drills, skillPct, weak, lastByCase, streak, totalCases: Object.keys(lastByCase).length };
}
