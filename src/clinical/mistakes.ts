// The mistakes notebook: every question you get wrong anywhere on the site is kept here until you answer it right twice in a row.
import { useSyncExternalStore } from "react";
import type { MCQ } from "./types";

export interface Mistake { q: MCQ; misses: number; streak: number; at: number }
const KEY = "ompath_mistakes";
const MAX = 150;

function read(): Mistake[] { try { const v = JSON.parse(localStorage.getItem(KEY) ?? "[]"); return Array.isArray(v) ? v : []; } catch { return []; } }
let items: Mistake[] = read();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage blocked */ } emit(); };

/** Call when a question is finished. `ok` = right first time. */
export function recordMcq(q: MCQ, ok: boolean) {
  const i = items.findIndex((m) => m.q.id === q.id);
  if (ok) {
    if (i < 0) return;
    const m = { ...items[i], streak: items[i].streak + 1 };
    items = m.streak >= 2 ? items.filter((_, k) => k !== i) : items.map((x, k) => (k === i ? m : x));
  } else if (i >= 0) {
    items = items.map((x, k) => (k === i ? { ...x, misses: x.misses + 1, streak: 0, at: Date.now() } : x));
  } else {
    items = [{ q, misses: 1, streak: 0, at: Date.now() }, ...items].slice(0, MAX);
  }
  save();
}
export function removeMistake(id: string) { items = items.filter((m) => m.q.id !== id); save(); }
export function clearMistakes() { items = []; save(); }

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const useMistakes = () => useSyncExternalStore(subscribe, () => items, () => items);
