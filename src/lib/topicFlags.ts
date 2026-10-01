// Topics a learner has flagged as "hard", kept on this device. Smart revision brings them back.
import { useSyncExternalStore } from "react";

export interface TopicFlag { id: string; outlineId: string; outlineTitle: string; title: string; at: number }
const KEY = "ompath_topic_flags";

function read(): TopicFlag[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
let flags = read();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toggleFlag(flag: Omit<TopicFlag, "at">) {
  flags = flags.some((f) => f.id === flag.id) ? flags.filter((f) => f.id !== flag.id) : [{ ...flag, at: Date.now() }, ...flags].slice(0, 300);
  try { localStorage.setItem(KEY, JSON.stringify(flags)); } catch { /* storage blocked */ }
  emit();
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const useTopicFlags = () => useSyncExternalStore(subscribe, () => flags, () => flags);
