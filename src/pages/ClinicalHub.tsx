import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Brain, Calculator, CalendarDays, ClipboardCheck, ClipboardList, Dices, Flame, Gauge, HelpCircle, Layers, MessageSquare, Pill, Presentation, RotateCcw, ScanLine, ShieldAlert, Siren, Snowflake, Stethoscope, Target, TestTube2, Timer, Workflow, FileText, ListChecks, HelpingHand } from "lucide-react";
import { COLD } from "@/clinical/extras/cold";
import { BANK } from "@/clinical/bank";
import { STATIONS } from "@/clinical/stations";
import { ALL_CASES, ROTATIONS } from "@/clinical";
import { MODE_INFO } from "@/clinical/engine";
import { resetClinical, useClinicalProgress } from "@/clinical/progress";
import type { CaseDef, Rotation, Skill } from "@/clinical/types";
import { updateMetaTags } from "@/lib/seo";

const LEVEL = ["", "Foundation", "Core", "Challenging"];
const MODE_ICON: Record<string, typeof Stethoscope> = { full: Stethoscope, cold: Snowflake, long: FileText, ddx: Brain, history: MessageSquare, exam: Target, report: ClipboardCheck, ix: TestTube2, emergency: Siren, problems: ListChecks, present: Presentation, drug: Pill, why: HelpingHand };
const DEEP = ["full", "long"];

const LABS: { to: string; label: string; blurb: string; icon: typeof Stethoscope }[] = [
  { to: "/clinical/osce", label: "OSCE circuit", blurb: "Six timed stations back to back", icon: Timer },
  { to: "/clinical/stations", label: "ECG & imaging", blurb: `${STATIONS.length} stations: describe → interpret → diagnose`, icon: ScanLine },
  { to: "/clinical/why", label: "Why ladders", blurb: "Keep asking why down to the physiology", icon: Layers },
  { to: "/clinical/traps", label: "Ward-round traps", blurb: "What lecturers catch you on", icon: ShieldAlert },
  { to: "/clinical/drugs", label: "Drug reasoning", blurb: "Why this drug, what can go wrong", icon: Pill },
  { to: "/clinical/findings", label: "Normal or abnormal?", blurb: "Report findings like a doctor", icon: ClipboardCheck },
  { to: "/clinical/quiz", label: "Rapid-fire quiz", blurb: `${BANK.length}+ questions with reasoning`, icon: HelpCircle },
  { to: "/clinical/counsel", label: "Counselling", blurb: "Bad news, HIV, consent, suicide risk", icon: MessageSquare },
  { to: "/clinical/tools", label: "Ward tools", blurb: "Calculators, scores, normal values", icon: Calculator },
  { to: "/clinical/consultant", label: "Consultant interrogation", blurb: "Rapid-fire from every case", icon: Gauge },
  { to: "/clinical/reason", label: "Reverse reasoning", blurb: "From a finding back to the disease", icon: Workflow },
  { to: "/clinical/cards", label: "Recall cards", blurb: "If you see THIS → think THESE", icon: Layers },
];

/** Which case best trains a weak skill: the one with most questions of that kind, least recently done. */
function pickForSkill(skill: Skill, last: Record<string, { at: number; score: number }>): CaseDef | undefined {
  const weight = (c: CaseDef) => [...c.interpret, ...c.consultant, c.mgmt, c.dx.q, ...(c.event ? [c.event.q] : [])].filter((q) => q.skill === skill).length;
  return [...ALL_CASES].sort((a, b) => (weight(b) - weight(a)) || ((last[a.id]?.at ?? 0) - (last[b.id]?.at ?? 0)))[0];
}

export default function ClinicalHub() {
  const navigate = useNavigate();
  const prog = useClinicalProgress();
  const [params] = useSearchParams();
  const initialRot = ROTATIONS.find((r) => r.id === params.get("rot"))?.id;
  const [rot, setRot] = useState<Rotation | "all">(initialRot ?? "all");
  const [level, setLevel] = useState(0);
  const [mode, setMode] = useState("full");

  useEffect(() => { updateMetaTags({ title: "Clinical reasoning simulator — Year 4 ward-round revision | Ompath Study", description: "Practise ward rounds on realistic patients: take a history, examine, build differentials, interpret investigations, handle emergencies and face the consultant." }); }, []);

  const list = useMemo(() => ALL_CASES.filter((c) => (rot === "all" || c.rotation === rot) && (!level || c.level === level)), [rot, level]);
  const open = (c: CaseDef, m = mode) => navigate(`/clinical/case/${c.id}?mode=${m}`);
  const random = (filter?: (c: CaseDef) => boolean, m = mode) => {
    const pool = ALL_CASES.filter(filter ?? (() => true));
    const unseen = pool.filter((c) => !prog.lastByCase[c.id]);
    const pick = (unseen.length ? unseen : pool)[Math.floor(Math.random() * (unseen.length ? unseen.length : pool.length))];
    if (pick) open(pick, m);
  };
  const due = ALL_CASES.filter((c) => { const a = prog.lastByCase[c.id]; return a && a.score < 75 && Date.now() - a.at > 2 * 86_400_000; });
  const weakCase = prog.weak[0] ? pickForSkill(prog.weak[0].skill, prog.lastByCase) : undefined;
  const weakQs = Object.values(prog.drills).filter(([r, s]) => s - r > 0).length;
  const byRot = (r: Rotation) => { const cs = ALL_CASES.filter((c) => c.rotation === r); return { n: cs.length, done: cs.filter((c) => prog.lastByCase[c.id]).length }; };

  return (
    <div className="min-h-dvh bg-muted/20">
      <section className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-12">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary"><Stethoscope className="h-4 w-4" /> Year 4 clinical rotations</p>
          <h1 className="mt-2 font-serif text-2xl font-bold leading-tight text-foreground sm:text-4xl">Clinical reasoning simulator</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">Meet a patient you have never seen. Ask, examine, think in differentials, read the results, handle the emergency and answer the consultant — and learn <b>why</b> at every step. Not a question bank: a ward round.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => random()} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"><Dices className="h-4 w-4" /> Random ward round</button>
            <button type="button" onClick={() => random(undefined, "cold")} className="inline-flex items-center gap-2 rounded-full border border-sky-500/50 bg-sky-500/10 px-5 py-2.5 text-sm font-bold text-sky-800"><Snowflake className="h-4 w-4" /> Cold patient</button>
            <button type="button" onClick={() => random((c) => Boolean(c.emergency || c.event), "emergency")} className="inline-flex items-center gap-2 rounded-full border border-rose-500/50 bg-rose-500/10 px-5 py-2.5 text-sm font-bold text-rose-700"><Siren className="h-4 w-4" /> Emergency mode</button>
            <button type="button" onClick={() => open(ALL_CASES[Math.floor(Date.now() / 86_400_000) % ALL_CASES.length], "full")} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-bold hover:border-primary/50"><CalendarDays className="h-4 w-4 text-primary" /> Case of the day</button>
            <Link to="/clinical/osce" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-bold hover:border-primary/50"><Timer className="h-4 w-4 text-primary" /> OSCE circuit</Link>
            <button type="button" onClick={() => random((c) => c.rotation === "psychiatry", "report")} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-bold hover:border-primary/50"><Brain className="h-4 w-4 text-primary" /> Psychiatry / MSE</button>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 sm:px-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <section aria-label="Choose how to practise">
            <h2 className="font-serif text-lg font-bold text-foreground">How do you want to practise?</h2>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(MODE_INFO).map(([id, m]) => { const Icon = MODE_ICON[id]; return (
                <button key={id} type="button" onClick={() => setMode(id)} aria-pressed={mode === id} className={`flex min-w-0 flex-col items-start rounded-xl border p-3 text-left transition-colors ${mode === id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`}>
                  <Icon className="h-4 w-4 text-primary" /><span className="mt-1 flex flex-wrap items-center gap-1.5 text-sm font-bold text-foreground">{m.label}{m.hard && <span className="rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-800">Hardest</span>}</span><span className="text-[11px] leading-snug text-muted-foreground">{m.blurb}</span>
                </button>); })}
            </div>
          </section>

          <section aria-label="Practice labs">
            <h2 className="font-serif text-lg font-bold text-foreground">Practice labs</h2>
            <p className="text-xs text-muted-foreground">Skills on their own — pick the one you want to sharpen.</p>
            <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {LABS.map((l) => (
                <li key={l.to}><Link to={l.to} className="group flex h-full min-w-0 flex-col rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/50"><l.icon className="h-4 w-4 text-primary" /><span className="mt-1 text-sm font-bold leading-snug text-foreground">{l.label}</span><span className="text-[11px] leading-snug text-muted-foreground">{l.blurb}</span></Link></li>
              ))}
            </ul>
          </section>

          <section aria-label="Cases">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-serif text-lg font-bold text-foreground">Cases <span className="text-sm font-semibold text-muted-foreground">{list.length}</span></h2>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Difficulty">
                {[0, 1, 2, 3].map((l) => <button key={l} type="button" onClick={() => setLevel(l)} aria-pressed={level === l} className={`rounded-full border px-3 py-1 text-[11px] font-bold ${level === l ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{l ? LEVEL[l] : "Any level"}</button>)}
              </div>
            </div>
            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }} role="group" aria-label="Rotation">
              <button type="button" onClick={() => setRot("all")} aria-pressed={rot === "all"} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold ${rot === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>All rotations</button>
              {ROTATIONS.map((r) => { const s = byRot(r.id); return <button key={r.id} type="button" onClick={() => setRot(r.id)} aria-pressed={rot === r.id} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold ${rot === r.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{r.emoji} {r.short} <span className="opacity-70">{s.done}/{s.n}</span></button>; })}
            </div>
            <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {list.map((c) => {
                const a = prog.lastByCase[c.id]; const r = ROTATIONS.find((x) => x.id === c.rotation)!;
                return (
                  <li key={c.id}>
                    <button type="button" onClick={() => open(c)} className="group flex h-full w-full min-w-0 flex-col rounded-2xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[var(--shadow-elevated)]">
                      <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"><span>{r.emoji} {r.short}</span><span>·</span><span>{LEVEL[c.level]}</span>{c.emergency && mode !== "cold" && <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-rose-700">Emergency</span>}</span>
                      <span className="mt-1 font-serif text-base font-bold leading-snug text-foreground">{DEEP.includes(mode) ? c.title : "Case " + c.id.split("-").pop()?.toUpperCase()}</span>
                      <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{mode === "cold" ? COLD[c.id] ?? c.vignette : c.vignette}</span>
                      <span className="mt-2 flex items-center justify-between text-[11px] font-bold"><span className={a ? (a.score >= 75 ? "text-emerald-700" : "text-amber-700") : "text-muted-foreground"}>{a ? `Last: ${a.score}%` : "Not tried"}</span><ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5" /></span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {list.length === 0 && <p className="mt-4 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">No cases match those filters yet — more are being added.</p>}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-foreground"><ClipboardList className="h-4 w-4 text-primary" /> My progress</h2>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Flame className="h-4 w-4 text-amber-500" /> {prog.streak}-day streak · {prog.totalCases}/{ALL_CASES.length} cases tried · {prog.practice} drills</p>
            <ul className="mt-3 space-y-2">
              {prog.skillPct.map((s) => <li key={s.skill}><div className="flex justify-between text-[11px] font-bold"><span>{s.label}</span><span className={s.pct === null ? "text-muted-foreground" : s.pct >= 75 ? "text-emerald-700" : s.pct >= 50 ? "text-amber-700" : "text-rose-700"}>{s.pct === null ? "—" : `${s.pct}%`}</span></div><div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${s.pct === null ? "" : s.pct >= 75 ? "bg-emerald-500" : s.pct >= 50 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${s.pct ?? 0}%` }} /></div></li>)}
            </ul>
            {prog.attempts.length > 0 && <button type="button" onClick={() => { if (window.confirm("Clear all your simulator progress on this device?")) resetClinical(); }} className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"><RotateCcw className="h-3 w-3" /> Reset progress</button>}
          </section>

          <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <h2 className="font-serif text-lg font-bold text-foreground">Revise what you struggle with</h2>
            {prog.weak.length === 0 && due.length === 0 && <p className="mt-1 text-xs text-muted-foreground">Complete a few cases and I will point you to your weak spots here.</p>}
            {weakQs > 0 && <Link to="/clinical/quiz" className="mt-2 block rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold hover:border-primary/50">Spaced review: {weakQs} question{weakQs === 1 ? "" : "s"} you missed are due →</Link>}
            {prog.weak.map((w) => <p key={w.skill} className="mt-1 text-xs text-foreground">Weak: <b>{w.label}</b> ({w.pct}%)</p>)}
            {weakCase && <button type="button" onClick={() => open(weakCase, "full")} className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-left text-xs font-bold hover:border-primary/50">Practise it: {weakCase.title} →</button>}
            {due.slice(0, 3).map((c) => <button key={c.id} type="button" onClick={() => open(c, "full")} className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-left text-xs font-bold hover:border-primary/50">Revisit (scored {prog.lastByCase[c.id].score}%): {c.title}</button>)}
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
            <b className="text-foreground">Train the chain, not the list.</b> Risk factor → mechanism → organ → symptom → sign → differential → investigation → diagnosis → management. Every case ends with a connection map and “if you see THIS → think THESE”.
          </section>
        </aside>
      </div>
    </div>
  );
}
