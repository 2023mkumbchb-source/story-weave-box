// Focus minutes and revision ticks, kept on this device, to drive the study streak.
import { useSyncExternalStore } from "react";

const KEY = "ompath_study_log"; // { "YYYY-MM-DD": minutes }
const DONE_KEY = "ompath_rev_done"; // string[] of completed revision task ids

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const todayIso = () => iso(new Date());
export const isoDaysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };

function read<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) ?? "") as T; } catch { return fallback; } }
function write(key: string, v: unknown) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage blocked */ } }

let state = { log: read<Record<string, number>>(KEY, {}), done: new Set<string>(read<string[]>(DONE_KEY, [])) };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Add minutes of focused study to today (a ticked revision task counts as 5 so a streak can be kept without the timer). */
export function logStudy(minutes: number) {
  const day = todayIso();
  state = { ...state, log: { ...state.log, [day]: (state.log[day] ?? 0) + minutes } };
  write(KEY, state.log); emit();
}

export function setTaskDone(id: string, done: boolean) {
  const next = new Set(state.done);
  if (done) next.add(id); else next.delete(id);
  state = { ...state, done: next };
  write(DONE_KEY, [...next].slice(-500));
  if (done) logStudy(5); else emit();
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const snapshot = () => state;

export function useStudyLog() {
  const s = useSyncExternalStore(subscribe, snapshot, snapshot);
  let streak = 0;
  for (let i = s.log[todayIso()] ? 0 : 1; ; i++) { if ((s.log[isoDaysAgo(i)] ?? 0) > 0) streak++; else break; if (i > 400) break; }
  const week = Array.from({ length: 7 }, (_, i) => ({ day: isoDaysAgo(6 - i), minutes: s.log[isoDaysAgo(6 - i)] ?? 0 }));
  return { todayMinutes: s.log[todayIso()] ?? 0, streak, week, done: s.done };
}
