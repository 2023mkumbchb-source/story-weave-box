// Turns the weekly timetable into revision work: what each session was, and which subjects are due for review.
import type { OfficialScheduleTable } from "@/lib/timetable2026";
import { MBCHB_2026_TRIMESTER_1 } from "@/lib/timetable2026";
import { isoDaysAgo } from "@/lib/studyLog";

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_BY_INDEX = ["Sunday", ...WEEKDAYS.slice(0, 6)];

export interface Session { key: string; subject: string; code?: string; venue?: string; group?: string }

/** "MBHA 1124 Ca · Dissection" → subject "Human Anatomy", code "MBHA 1124", venue "Dissection". */
export function parseEntry(entry: string, names: Record<string, string>, group?: string): Session {
  const [head, ...rest] = entry.split(" · ");
  const m = head.match(/^([A-Z]{3,4})\s?(\d{3,4})/);
  const venue = rest.join(" · ") || undefined;
  if (m && names[m[1]]) return { key: names[m[1]].toLowerCase(), subject: names[m[1]], code: `${m[1]} ${m[2]}`, venue, group };
  if (m) return { key: m[1].toLowerCase(), subject: head.trim(), code: `${m[1]} ${m[2]}`, venue, group };
  const subject = head.replace(/[ ]+[a-c]$/i, "").trim();
  return { key: subject.toLowerCase(), subject, venue, group };
}

export function sessionsForDay(tables: OfficialScheduleTable[], day: string, group: string, names: Record<string, string>): Session[] {
  const seen = new Set<string>();
  const out: Session[] = [];
  for (const t of tables) for (const r of t.rows) {
    if (r.day !== day || (group && r.group && r.group !== group)) continue;
    for (const e of r.entries) {
      const s = parseEntry(e, names, r.group);
      const id = `${s.key}|${s.code ?? ""}`;
      if (!seen.has(id)) { seen.add(id); out.push(s); }
    }
  }
  return out;
}

export const dayNameOf = (isoDate: string) => DAY_BY_INDEX[new Date(`${isoDate}T12:00:00`).getDay()];
const inTeaching = (isoDate: string) => isoDate >= MBCHB_2026_TRIMESTER_1.startDate && isoDate <= MBCHB_2026_TRIMESTER_1.teachingEndDate;

export interface RevisionTask { id: string; subject: string; kind: "review" | "prep"; label: string; taught?: string }

/** Spaced review: subjects taught 1, 3 and 7 days ago are due today; tomorrow's subjects are the "prep" list. */
export function dueTasks(tables: OfficialScheduleTable[], group: string, names: Record<string, string>): RevisionTask[] {
  const tasks: RevisionTask[] = [];
  const seen = new Set<string>();
  for (const back of [1, 3, 7]) {
    const date = isoDaysAgo(back);
    if (!inTeaching(date)) continue;
    for (const s of sessionsForDay(tables, dayNameOf(date), group, names)) {
      const id = `rev|${date}|${s.key}|${back}`;
      if (seen.has(`${s.key}|${back}`)) continue;
      seen.add(`${s.key}|${back}`);
      tasks.push({ id, subject: s.subject, kind: "review", taught: dayNameOf(date), label: back === 1 ? "Review yesterday's class" : `Revise — taught ${dayNameOf(date)} (${back} days ago)` });
    }
  }
  for (let ahead = 1; ahead <= 3; ahead++) {
    const date = isoDaysAgo(-ahead);
    if (!inTeaching(date)) continue;
    const sessions = sessionsForDay(tables, dayNameOf(date), group, names);
    if (!sessions.length) continue;
    for (const s of sessions) {
      if (seen.has(`${s.key}|prep`)) continue;
      seen.add(`${s.key}|prep`);
      tasks.push({ id: `prep|${date}|${s.key}`, subject: s.subject, kind: "prep", label: `Skim before ${ahead === 1 ? "tomorrow" : dayNameOf(date)}'s class` });
    }
    break; // only the next teaching day
  }
  return tasks;
}
