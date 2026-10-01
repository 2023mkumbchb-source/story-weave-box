import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, CheckCircle2, ChevronRight, Circle, ClipboardList, Flag, Flame, FolderOpen, GraduationCap, Hourglass, Minus, Plus, Star, Target, Timer, Trophy } from "lucide-react";
import registry from "@/data/libraries.json";
import { useAuth } from "@/hooks/useAuth";
import { useOutlineProgress } from "@/hooks/useOutlineProgress";
import { TodayClasses, useMyYear } from "@/components/StudyPanel";
import { dueTasks } from "@/lib/revisionPlan";
import { unitNameMap, useSiteConfig, useTimetable } from "@/lib/siteConfig";
import { setTaskDone, useStudyLog } from "@/lib/studyLog";
import { useFileShelf } from "@/lib/fileShelf";
import { useTopicFlags } from "@/lib/topicFlags";
import { loadYearOutlines } from "@/lib/outlineEngine";
import { libraryPath, prettyTitle } from "@/lib/libraryMeta";
import { updateMetaTags } from "@/lib/seo";
import type { CourseOutline } from "@/data/courseOutlines";

const GOAL_KEY = "ompath_daily_goal";
const readGoal = () => { try { const g = Number(localStorage.getItem(GOAL_KEY)); return g >= 10 && g <= 600 ? g : 60; } catch { return 60; } };

function Ring({ value, label, sub }: { value: number; label: string; sub: string }) {
  const r = 40, c = 2 * Math.PI * r;
  return (
    <div className="relative h-28 w-28 shrink-0" role="img" aria-label={`${label}, ${Math.round(value * 100)} percent`}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" className="stroke-muted" />
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" strokeLinecap="round" className="stroke-primary transition-all duration-700" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(value, 1))} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="font-serif text-2xl font-bold text-foreground">{label}</span><span className="text-[10px] font-semibold text-muted-foreground">{sub}</span></div>
    </div>
  );
}

function Panel({ title, icon: Icon, action, children }: { title: string; icon: typeof Star; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-foreground"><Icon className="h-4 w-4 text-primary" /> {title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** /dashboard — the learner's day at a glance: goal, streak, classes, due revision, outline progress, saved files. */
export default function Dashboard() {
  const { user } = useAuth();
  const [year, setYear] = useMyYear();
  const tables = useTimetable(year);
  const cfg = useSiteConfig();
  const names = useMemo(() => unitNameMap(cfg), [cfg]);
  const { streak, todayMinutes, week, done } = useStudyLog();
  const { saved, recent } = useFileShelf();
  const flags = useTopicFlags();
  const { done: outlineDone } = useOutlineProgress(user?.id ?? null);
  const [goal, setGoalState] = useState(readGoal);
  const [outlines, setOutlines] = useState<CourseOutline[]>([]);
  const [group, setGroup] = useState("");

  useEffect(() => { updateMetaTags({ title: "My study dashboard | Ompath Study", description: "Your day at a glance: timetable, revision due today, daily goal, streak and course-outline progress." }); }, []);
  useEffect(() => { try { setGroup(localStorage.getItem(`ompath_group_y${year}`) ?? ""); } catch { setGroup(""); } }, [year]);
  useEffect(() => { let on = true; loadYearOutlines(Math.min(year, 4)).then((l) => { if (on) setOutlines(l); }); return () => { on = false; }; }, [year]);

  const setGoal = (g: number) => { const v = Math.max(10, Math.min(600, g)); setGoalState(v); try { localStorage.setItem(GOAL_KEY, String(v)); } catch { /* storage blocked */ } };
  const tasks = useMemo(() => dueTasks(tables, group, names), [tables, group, names]);
  const tasksDone = tasks.filter((t) => done.has(t.id)).length;
  const name = (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ?? user?.email?.split("@")[0];
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const lib = registry.libraries.find((l) => l.year === year);
  const maxMin = Math.max(goal, ...week.map((w) => w.minutes));

  const progress = outlines.map((o) => {
    const total = o.sections.reduce((n, s) => n + s.items.length, 0);
    const d = o.sections.reduce((n, s) => n + s.items.filter((i) => outlineDone.has(i.id)).length, 0);
    return { o, total, d };
  }).filter((p) => p.d > 0 || !p.o.auto).sort((a, b) => b.d / Math.max(b.total, 1) - a.d / Math.max(a.total, 1)).slice(0, 6);

  return (
    <div className="min-h-dvh bg-muted/20">
      <section className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-5 py-8 sm:py-10">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">My study dashboard</p>
            <h1 className="mt-1 font-serif text-2xl font-bold text-foreground sm:text-4xl">{hello}{name ? `, ${name}` : ""} 👋</h1>
            <p className="mt-1 text-sm text-muted-foreground">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}{!user && <> · <Link to="/login" className="font-bold text-primary hover:underline">Sign in</Link> to save outline progress to your account</>}</p>
          </div>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="My year" className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold">{[1, 2, 3, 4, 5, 6].map((y) => <option key={y} value={y}>Year {y}</option>)}</select>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-5 px-5 py-8 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel title="Daily goal" icon={Target} action={
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <button type="button" onClick={() => setGoal(goal - 15)} aria-label="Lower goal by 15 minutes" className="rounded-full border border-border p-1 hover:border-primary/50"><Minus className="h-3.5 w-3.5" /></button>
              {goal} min
              <button type="button" onClick={() => setGoal(goal + 15)} aria-label="Raise goal by 15 minutes" className="rounded-full border border-border p-1 hover:border-primary/50"><Plus className="h-3.5 w-3.5" /></button>
            </div>}>
            <div className="flex flex-wrap items-center gap-6">
              <Ring value={todayMinutes / goal} label={`${todayMinutes}`} sub={`of ${goal} min`} />
              <div className="min-w-[220px] flex-1">
                <p className="flex items-center gap-2 text-sm font-bold text-foreground"><Flame className="h-4 w-4 text-amber-500" /> {streak}-day streak</p>
                <div className="mt-3 flex h-16 items-end gap-1.5">
                  {week.map((w) => <div key={w.day} className="flex flex-1 flex-col items-center gap-1" title={`${w.day}: ${w.minutes} min`}><div className={`w-full rounded-t ${w.minutes >= goal ? "bg-primary" : "bg-primary/45"}`} style={{ height: `${Math.max(w.minutes ? 8 : 3, (w.minutes / maxMin) * 100)}%` }} /></div>)}
                </div>
                <Link to="/revise" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"><Timer className="h-3.5 w-3.5" /> Start a focus session</Link>
              </div>
            </div>
          </Panel>

          <Panel title="Revision due today" icon={Hourglass} action={<Link to="/revise" className="text-xs font-bold text-primary hover:underline">Open Smart revision →</Link>}>
            {tasks.length === 0 ? <p className="text-sm text-muted-foreground">Nothing due — no classes in the last week for this group.</p> : (
              <>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">{tasksDone} of {tasks.length} done</p>
                <ul className="space-y-1.5">
                  {tasks.slice(0, 6).map((t) => {
                    const isDone = done.has(t.id);
                    return (
                      <li key={t.id}>
                        <button type="button" onClick={() => setTaskDone(t.id, !isDone)} aria-pressed={isDone} className="flex w-full items-start gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-muted/50">
                          {isDone ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                          <span className="min-w-0"><span className={`block text-sm font-semibold text-foreground ${isDone ? "line-through opacity-60" : ""}`}>{t.subject}</span><span className="block text-[11px] text-muted-foreground">{t.label}</span></span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </Panel>

          <Panel title="Course outline progress" icon={ClipboardList} action={<Link to={`/course-outlines/year-${Math.min(year, 4)}`} className="text-xs font-bold text-primary hover:underline">All Year {Math.min(year, 4)} →</Link>}>
            {year > 4 ? <p className="text-sm text-muted-foreground">Outlines are available for Years 1–4.</p> : progress.length === 0 ? <p className="text-sm text-muted-foreground">Loading…</p> : (
              <ul className="space-y-3">
                {progress.map(({ o, total, d }) => (
                  <li key={o.id}>
                    <Link to={`/course-outlines/${o.id}`} className="group block">
                      <span className="flex items-center justify-between text-sm font-semibold text-foreground group-hover:text-primary"><span className="truncate">{o.department}</span><span className="ml-3 shrink-0 text-xs text-muted-foreground">{user ? `${d}/${total}` : `${total} topics`}</span></span>
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${user ? (d / Math.max(total, 1)) * 100 : 0}%` }} /></span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {flags.length > 0 && (
            <Panel title="Hard topics" icon={Flag}>
              <ul className="space-y-1">{flags.slice(0, 5).map((f) => <li key={f.id}><Link to={`/course-outlines/${f.outlineId}#${encodeURIComponent(f.id)}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/50"><span className="min-w-0 truncate font-semibold text-foreground">{f.title}</span><ChevronRight className="h-4 w-4 shrink-0 text-primary" /></Link></li>)}</ul>
            </Panel>
          )}
        </div>

        <div className="space-y-5">
          <Panel title="Classes" icon={CalendarDays}><TodayClasses year={year} /></Panel>

          <Panel title="Shortcuts" icon={Star}>
            <div className="grid grid-cols-2 gap-2">
              {[
                { to: lib ? libraryPath(lib) : "/blog", label: "Library", icon: FolderOpen },
                { to: `/exams?year=${encodeURIComponent(`Year ${year}`)}`, label: "Exams", icon: Trophy },
                { to: `/flashcards?year=${encodeURIComponent(`Year ${year}`)}`, label: "Flashcards", icon: GraduationCap },
                { to: "/contests", label: "Contests", icon: Trophy },
              ].map((l) => <Link key={l.label} to={l.to} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold text-foreground hover:border-primary/50 hover:text-primary"><l.icon className="h-4 w-4 text-primary" /> {l.label}</Link>)}
            </div>
          </Panel>

          <Panel title={`Saved files (${saved.length})`} icon={Star}>
            {saved.length === 0 ? <p className="text-xs text-muted-foreground">Tap the ☆ on any library file to keep it here.</p> : <ul className="space-y-1.5">{saved.slice(0, 5).map((s) => <li key={s.id} className="truncate text-xs font-semibold text-foreground">{prettyTitle(s.name)}</li>)}</ul>}
            {recent.length > 0 && <p className="mt-3 truncate text-[11px] text-muted-foreground">Last opened: {prettyTitle(recent[0].name)}</p>}
          </Panel>
        </div>
      </div>
    </div>
  );
}
