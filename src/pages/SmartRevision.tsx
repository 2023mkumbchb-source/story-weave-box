import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, CalendarDays, CheckCircle2, Circle, Flame, FolderOpen, GraduationCap, Timer, Trophy } from "lucide-react";
import registry from "@/data/libraries.json";
import FocusTimer from "@/components/FocusTimer";
import { useMyYear } from "@/components/StudyPanel";
import { useAuth } from "@/hooks/useAuth";
import { dueTasks, sessionsForDay, WEEKDAYS, dayNameOf, type Session } from "@/lib/revisionPlan";
import { unitNameMap, useSiteConfig, useTimetable } from "@/lib/siteConfig";
import { setTaskDone, todayIso, useStudyLog } from "@/lib/studyLog";
import { libraryPath } from "@/lib/libraryMeta";
import { updateMetaTags } from "@/lib/seo";

const groupKey = (y: number) => `ompath_group_y${y}`;
const safeGet = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };

function SubjectLinks({ subject, year }: { subject: string; year: number }) {
  const lib = registry.libraries.find((l) => l.year === year);
  const q = encodeURIComponent(subject.split(/[ &]/)[0]);
  const y = encodeURIComponent(`Year ${year}`);
  const cls = "inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-bold text-foreground transition-colors hover:border-primary/50 hover:text-primary";
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {lib && <Link to={`${libraryPath(lib)}?q=${q}`} className={cls}><FolderOpen className="h-3 w-3" /> Files</Link>}
      <Link to={`/blog?year=${y}&q=${q}`} className={cls}><BookOpen className="h-3 w-3" /> Notes</Link>
      <Link to={`/flashcards?year=${y}`} className={cls}><GraduationCap className="h-3 w-3" /> Cards</Link>
      <Link to={`/exams?year=${y}`} className={cls}><Trophy className="h-3 w-3" /> Quiz</Link>
    </div>
  );
}

/** /revise — revision built from the learner's own timetable: what is due today, what is coming, and a focus timer. */
export default function SmartRevision() {
  const { user } = useAuth();
  const [year, setYear] = useMyYear();
  const tables = useTimetable(year);
  const cfg = useSiteConfig();
  const names = useMemo(() => unitNameMap(cfg), [cfg]);
  const [group, setGroup] = useState("");
  const { streak, todayMinutes, week, done } = useStudyLog();

  useEffect(() => { updateMetaTags({ title: "Smart Revision from your timetable | Ompath Study", description: "Spaced revision built from your MBChB timetable: what to review today, what to skim before class, plus a focus timer and study streak." }); }, []);
  useEffect(() => { setGroup(safeGet(groupKey(year)) ?? ""); }, [year]);
  const pickGroup = (g: string) => { setGroup(g); try { localStorage.setItem(groupKey(year), g); } catch { /* storage blocked */ } };

  const groups = useMemo(() => [...new Set(tables.flatMap((t) => t.rows.map((r) => r.group ?? "").filter(Boolean)))].sort(), [tables]);
  const tasks = useMemo(() => dueTasks(tables, group, names), [tables, group, names]);
  const doneCount = tasks.filter((t) => done.has(t.id)).length;
  const weekPlan = useMemo(() => WEEKDAYS.slice(0, 6).map((day) => ({ day, sessions: sessionsForDay(tables, day, group, names) })).filter((d) => d.sessions.length), [tables, group, names]);
  const today = dayNameOf(todayIso());
  const maxMin = Math.max(30, ...week.map((w) => w.minutes));

  const subjectsThisWeek = useMemo(() => {
    const m = new Map<string, Session>();
    weekPlan.forEach((d) => d.sessions.forEach((s) => { if (!m.has(s.key)) m.set(s.key, s); }));
    return [...m.values()];
  }, [weekPlan]);

  return (
    <div className="min-h-dvh bg-muted/20">
      <section className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="mx-auto max-w-5xl px-5 py-10">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary"><CalendarDays className="h-4 w-4" /> Revision that follows your timetable</p>
          <h1 className="mt-2 font-serif text-3xl font-bold text-foreground sm:text-4xl">Smart revision</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Subjects taught 1, 3 and 7 days ago come back for review, and tomorrow's classes get a quick skim. Tick them off to build your streak.</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Year" className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-bold">{[1, 2, 3, 4, 5, 6].map((y) => <option key={y} value={y}>Year {y}</option>)}</select>
            {groups.length > 1 && (
              <div className="flex items-center gap-1.5" role="group" aria-label="Your group">
                {["", ...groups].map((g) => <button key={g || "all"} type="button" onClick={() => pickGroup(g)} aria-pressed={group === g} className={`rounded-full border px-3 py-1 text-xs font-bold ${group === g ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50"}`}>{g ? `Group ${g}` : "All groups"}</button>)}
              </div>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700"><Flame className="h-4 w-4" /> {streak}-day streak · {todayMinutes} min today</span>
          </div>
          {!user && <p className="mt-3 text-xs text-muted-foreground"><Link to="/login" className="font-bold text-primary hover:underline">Sign in</Link> to keep your account in sync. Your ticks and streak are saved on this device.</p>}
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-6 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <section aria-labelledby="due-today">
            <div className="flex items-end justify-between gap-3">
              <h2 id="due-today" className="font-serif text-xl font-bold text-foreground">Due today</h2>
              {tasks.length > 0 && <span className="text-xs font-bold text-muted-foreground">{doneCount}/{tasks.length} done</span>}
            </div>
            {tasks.length > 0 && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${(doneCount / tasks.length) * 100}%` }} /></div>}
            {tasks.length === 0 ? (
              <p className="mt-3 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Nothing is due today — no classes in the last week for {group ? `group ${group}` : "this year"}, or teaching is over. Use the weekly plan below or the timer.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {tasks.map((t) => {
                  const isDone = done.has(t.id);
                  return (
                    <li key={t.id} className={`rounded-xl border bg-card p-3 ${isDone ? "border-primary/30 opacity-70" : "border-border"}`}>
                      <button type="button" onClick={() => setTaskDone(t.id, !isDone)} aria-pressed={isDone} className="flex w-full items-start gap-3 text-left">
                        {isDone ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />}
                        <span className="min-w-0"><span className={`block text-sm font-bold text-foreground ${isDone ? "line-through" : ""}`}>{t.subject}</span><span className="block text-xs text-muted-foreground"><span className={`mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${t.kind === "prep" ? "bg-sky-500/10 text-sky-700" : "bg-primary/10 text-primary"}`}>{t.kind === "prep" ? "Preview" : "Review"}</span>{t.label}</span></span>
                      </button>
                      <SubjectLinks subject={t.subject} year={year} />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="week-plan">
            <h2 id="week-plan" className="font-serif text-xl font-bold text-foreground">This week's classes</h2>
            {weekPlan.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No timetable published for Year {year} yet.</p> : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {weekPlan.map(({ day, sessions }) => (
                  <div key={day} className={`rounded-2xl border bg-card p-3 ${day === today ? "border-primary/50 ring-1 ring-primary/20" : "border-border"}`}>
                    <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{day}{day === today && <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] text-primary-foreground">Today</span>}</p>
                    <ul className="space-y-1.5">
                      {sessions.map((s) => <li key={`${s.key}${s.code}`} className="text-xs"><span className="font-bold text-foreground">{s.subject}</span>{s.code && <span className="text-muted-foreground"> · {s.code}</span>}{s.venue && <span className="text-muted-foreground"> · {s.venue}</span>}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          {subjectsThisWeek.length > 0 && (
            <section aria-labelledby="week-subjects">
              <h2 id="week-subjects" className="font-serif text-xl font-bold text-foreground">Study material for this week's subjects</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {subjectsThisWeek.map((s) => <div key={s.key} className="rounded-xl border border-border bg-card p-3"><p className="text-sm font-bold text-foreground">{s.subject}</p><SubjectLinks subject={s.subject} year={year} /></div>)}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <h2 className="flex items-center gap-2 font-serif text-xl font-bold text-foreground"><Timer className="h-5 w-5 text-primary" /> Focus timer</h2>
          <FocusTimer />
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Last 7 days</p>
            <div className="mt-3 flex h-24 items-end gap-1.5">
              {week.map((w) => (
                <div key={w.day} className="flex flex-1 flex-col items-center gap-1" title={`${w.day}: ${w.minutes} min`}>
                  <div className="w-full rounded-t bg-primary/80" style={{ height: `${Math.max(w.minutes ? 8 : 2, (w.minutes / maxMin) * 100)}%`, opacity: w.minutes ? 1 : 0.25 }} />
                  <span className="text-[9px] font-semibold text-muted-foreground">{dayNameOf(w.day).slice(0, 1)}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
