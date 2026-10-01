// Which must-knows the learner has ticked off (kept on this device).
import { useSyncExternalStore } from "react";

const KEY = "ompath_mustknow_v1";
function read(): Record<string, true> { try { const v = JSON.parse(localStorage.getItem(KEY) ?? "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; } }
let known: Record<string, true> = read();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(known)); } catch { /* storage blocked */ } emit(); };

export function setKnown(ids: string[], on: boolean) {
  const next = { ...known };
  for (const id of ids) { if (on) next[id] = true; else delete next[id]; }
  known = next; save();
}
export const toggleKnown = (id: string) => setKnown([id], !known[id]);
export const resetKnown = (prefix: string) => { known = Object.fromEntries(Object.entries(known).filter(([k]) => !k.startsWith(prefix))) as Record<string, true>; save(); };

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const useKnown = () => useSyncExternalStore(subscribe, () => known, () => known);

/** A short stable id for a piece of text. */
export function hashId(s: string) { let h = 5381; for (const ch of s) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0; return h.toString(36); }
