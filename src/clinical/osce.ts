// OSCE circuit: a timed run of stations (history, examination, interpretation, emergency, counselling, MSE) kept in sessionStorage.
import { ALL_CASES } from "./index";
import { COUNSEL } from "./counselling";
import type { CaseDef } from "./types";

export type StationKind = "history" | "exam" | "interpret" | "emergency" | "counsel" | "mse";
export interface OsceStation { kind: StationKind; id: string; seconds: number; label: string }
export interface OsceRun { stations: OsceStation[]; idx: number; scores: { label: string; score: number }[]; startedAt: number }

const KEY = "ompath_osce";
const read = (): OsceRun | null => { try { return JSON.parse(sessionStorage.getItem(KEY) ?? "null"); } catch { return null; } };
const write = (r: OsceRun | null) => { try { if (r) sessionStorage.setItem(KEY, JSON.stringify(r)); else sessionStorage.removeItem(KEY); } catch { /* storage blocked */ } };

export const KIND_LABEL: Record<StationKind, string> = { history: "History taking", exam: "Physical examination", interpret: "Investigation interpretation", emergency: "Emergency management", counsel: "Counselling / communication", mse: "Mental state examination" };
const pickOne = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

/** Build a circuit: history, exam, interpretation, emergency, counselling, MSE, drawn at random from different cases. */
export function buildCircuit(minutes: number, rotation?: string): OsceStation[] {
  const sec = Math.round(minutes * 60);
  const pool = (rotation && rotation !== "all" ? ALL_CASES.filter((c) => c.rotation === rotation) : ALL_CASES);
  const used = new Set<string>();
  const take = (f: (c: CaseDef) => boolean, fallbackPool = ALL_CASES): CaseDef => { const cand = shuffle(pool.filter((c) => f(c) && !used.has(c.id))); const c = cand[0] ?? shuffle(fallbackPool.filter((x) => f(x) && !used.has(x.id)))[0] ?? pickOne(ALL_CASES); used.add(c.id); return c; };
  const medical = (c: CaseDef) => c.rotation !== "psychiatry";
  const h = take(medical); const e = take(medical); const i = take(medical); const em = take((c) => Boolean(c.event) && medical(c));
  const ms = take((c) => c.rotation === "psychiatry", ALL_CASES);
  const cs = pickOne(rotation && rotation !== "all" ? (COUNSEL.filter((c) => c.rotation === rotation).length ? COUNSEL.filter((c) => c.rotation === rotation) : COUNSEL) : COUNSEL);
  return [
    { kind: "history", id: h.id, seconds: sec, label: KIND_LABEL.history },
    { kind: "exam", id: e.id, seconds: sec, label: KIND_LABEL.exam },
    { kind: "interpret", id: i.id, seconds: sec, label: KIND_LABEL.interpret },
    { kind: "emergency", id: em.id, seconds: sec, label: KIND_LABEL.emergency },
    { kind: "counsel", id: cs.id, seconds: sec, label: KIND_LABEL.counsel },
    { kind: "mse", id: ms.id, seconds: sec, label: KIND_LABEL.mse },
  ];
}

export const stationUrl = (s: OsceStation): string => {
  const q = `limit=${s.seconds}&circuit=1`;
  if (s.kind === "counsel") return `/clinical/counsel/${s.id}?${q}`;
  const mode = s.kind === "history" ? "history" : s.kind === "exam" ? "exam" : s.kind === "interpret" ? "ix" : s.kind === "emergency" ? "emergency" : "report";
  return `/clinical/case/${s.id}?mode=${mode}&${q}&r=${Date.now()}`;
};

export const getOsce = read;
export function startOsce(stations: OsceStation[]) { const r: OsceRun = { stations, idx: 0, scores: [], startedAt: Date.now() }; write(r); return r; }
export function recordOsceStation(score: number) {
  const r = read(); if (!r || r.idx >= r.stations.length) return;
  r.scores.push({ label: r.stations[r.idx].label, score }); r.idx += 1; write(r);
}
export const osceNextUrl = (): string => { const r = read(); return r && r.idx < r.stations.length ? stationUrl(r.stations[r.idx]) : "/clinical/osce?done=1"; };
export const endOsce = () => write(null);
