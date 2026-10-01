import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Gauge, Layers, Workflow } from "lucide-react";
import { ALL_CASES } from "@/clinical";
import { REASON_DRILLS } from "@/clinical/reasoning";
import { recordDrill, useClinicalProgress } from "@/clinical/progress";
import type { CaseDef, MCQ, ReasonDrill } from "@/clinical/types";
import McqCard from "@/components/clinical/McqCard";
import { updateMetaTags } from "@/lib/seo";
import { logStudy } from "@/lib/studyLog";

const shuffle = <T,>(a: T[]) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const GENERIC = (what: string) => [`Think about the ${what} in the context given.`, "Eliminate the options that cannot produce this finding.", "More than one option may be right — consider every mechanism.", "Re-read the finding and ask: what could cause it, from every system?"];

/** /clinical/consultant — rapid-fire questions from every case, the ones you get wrong coming back more often. */
function ConsultantMode() {
  const prog = useClinicalProgress();
  const [round, setRound] = useState(0);
  const [score, setScore] = useState<number[]>([]);
  const [fin, setFin] = useState(false);
  const deck = useMemo(() => {
    const all: { q: MCQ; c: CaseDef }[] = ALL_CASES.flatMap((c) => [...c.consultant, ...c.interpret, ...(c.event ? [c.event.q] : [])].map((q) => ({ q, c })));
    const weight = (id: string) => { const d = prog.drills[id]; return d ? 1 + (d[1] - d[0]) * 2 : 3; };
    const pool = [...all];
    const out: typeof all = [];
    while (out.length < Math.min(8, all.length)) { const total = pool.reduce((s, x) => s + weight(x.q.id), 0); let r = Math.random() * total; const i = pool.findIndex((x) => (r -= weight(x.q.id)) <= 0); out.push(...pool.splice(Math.max(i, 0), 1)); }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);
  const [i, setI] = useState(0);
  const [answered, setAnswered] = useState(false);
  const cur = deck[i];

  useEffect(() => { updateMetaTags({ title: "Consultant interrogation | Clinical simulator | Ompath Study" }); }, []);
  const again = () => { setRound((r) => r + 1); setI(0); setScore([]); setFin(false); setAnswered(false); };
  if (!cur) return <p className="p-6 text-sm text-muted-foreground">No questions yet.</p>;
  const avg = score.length ? Math.round((score.reduce((a, b) => a + b, 0) / score.length) * 100) : 0;

  return (
    <>
      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground"><span>Question {Math.min(i + 1, deck.length)} of {deck.length}</span><span>{score.length ? `Average ${avg}%` : ""}</span></div>
      {!fin ? (
        <div className="space-y-3" key={`${round}-${i}`}>
          <div className="rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed"><p className="text-[10px] font-bold uppercase tracking-wider text-primary">The patient</p><p className="mt-1 text-foreground">{cur.c.vignette}</p></div>
          <McqCard q={cur.q} label="The consultant asks" onDone={(r, h) => { setScore((s) => [...s, r.earned]); setAnswered(true); recordDrill(cur.q.id, r.allRight && h < 2); logStudy(1); }} />
          {answered && <button type="button" onClick={() => { setAnswered(false); if (i + 1 >= deck.length) setFin(true); else setI(i + 1); }} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground">{i + 1 >= deck.length ? "Finish" : "Next question"} <ArrowRight className="h-4 w-4" /></button>}
        </div>
      ) : (
        <div className="rounded-2xl border border-primary/30 bg-card p-6 text-center">
          <p className="font-serif text-4xl font-bold text-primary">{avg}%</p><p className="mt-1 text-sm text-muted-foreground">Round complete. Questions you struggle with will come back sooner.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2"><button type="button" onClick={again} className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">Another round</button><Link to="/clinical" className="rounded-full border border-border px-5 py-2 text-sm font-bold">Back to cases</Link></div>
        </div>
      )}
    </>
  );
}

/** /clinical/reason — from a finding, back to the mechanism, the system, the diseases and the questions that separate them. */
function ReasonMode() {
  const [n, setN] = useState(0);
  const deck = useMemo(() => shuffle(REASON_DRILLS), []);
  const d: ReasonDrill = deck[n % deck.length];
  const [step, setStep] = useState(0);
  useEffect(() => { updateMetaTags({ title: "Reverse clinical reasoning | Clinical simulator | Ompath Study" }); }, []);
  const mk = (id: string, q: string, options: ReasonDrill["mechanisms"], what: string): MCQ => ({ id, skill: "pathophysiology", q, options, multi: true, hints: GENERIC(what), explain: "Work backwards from the finding: mechanism → organ system → disease → how to separate them. Several answers are usually right." });
  const steps = [
    { label: "Mechanism", q: mk(`${d.id}-m`, `${d.finding} — which mechanisms could produce it?`, d.mechanisms, "mechanism") },
    { label: "System", q: mk(`${d.id}-s`, "Which organ systems could be responsible?", d.systems, "organ systems") },
    { label: "Diseases", q: mk(`${d.id}-d`, "Which diseases would you consider?", d.diseases, "diseases") },
  ];
  const next = () => { setN((x) => x + 1); setStep(0); };

  return (
    <div key={`${d.id}-${n}`} className="space-y-4">
      <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-primary">Clinical finding</p><h2 className="font-serif text-xl font-bold text-foreground">{d.finding}</h2><p className="mt-1 text-sm text-muted-foreground">{d.context}</p></div>
      <ol className="flex gap-1.5 text-[11px] font-bold">{[...steps.map((s) => s.label), "Separate them"].map((l, i) => <li key={l} className={`rounded-full px-3 py-1 ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{i + 1}. {l}</li>)}</ol>
      {steps.slice(0, step + 1).map((s, i) => <McqCard key={s.q.id} q={s.q} label={s.label} onDone={() => { if (i === step) setTimeout(() => undefined, 0); recordDrill(s.q.id, true); logStudy(1); }} />)}
      {step < 3 && <button type="button" onClick={() => setStep((x) => x + 1)} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground">{step < 2 ? "Next step" : "How do I separate them?"} <ArrowRight className="h-4 w-4" /></button>}
      {step >= 3 && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed">
            <h3 className="font-serif text-lg font-bold text-foreground">What separates them</h3>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-primary">Ask</p><ul className="mt-1 list-disc space-y-1 pl-4 text-xs">{d.ask.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-primary">Examine</p><ul className="mt-1 list-disc space-y-1 pl-4 text-xs">{d.exam.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-primary">Investigate</p><ul className="mt-1 list-disc space-y-1 pl-4 text-xs">{d.ix.map((x) => <li key={x}>{x}</li>)}</ul></div>
            </div>
            <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-xs"><b className="text-rose-700">What would kill this patient first?</b> {d.danger}</p>
          </div>
          <button type="button" onClick={next} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground">Another finding <ArrowRight className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}

/** /clinical/cards — recall cards built from every case's "if you see THIS → think THESE" list; the ones you miss come back sooner. */
function CardsMode() {
  const prog = useClinicalProgress();
  const [round, setRound] = useState(0);
  const all = useMemo(() => ALL_CASES.flatMap((c) => c.thinkIf.map(([a, b], i) => ({ id: `ti-${c.id}-${i}`, front: a, back: b, from: c.title, revise: c.revise }))), []);
  const deck = useMemo(() => {
    const weight = (id: string) => { const d = prog.drills[id]; return d ? 1 + (d[1] - d[0]) * 2 : 3; };
    const pool = [...all]; const out: typeof all = [];
    while (out.length < Math.min(10, all.length)) { const total = pool.reduce((s, x) => s + weight(x.id), 0); let r = Math.random() * total; const i = pool.findIndex((x) => (r -= weight(x.id)) <= 0); out.push(...pool.splice(Math.max(i, 0), 1)); }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, all]);
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const [known, setKnown] = useState(0);
  const cur = deck[i];
  useEffect(() => { updateMetaTags({ title: "Clinical recall cards | Clinical simulator | Ompath Study" }); }, []);
  const grade = (ok: boolean) => { recordDrill(cur.id, ok); if (ok) setKnown((k) => k + 1); logStudy(1); setFlip(false); setI((x) => x + 1); };
  if (!cur) return (
    <div className="rounded-2xl border border-primary/30 bg-card p-6 text-center">
      <p className="font-serif text-4xl font-bold text-primary">{known}/{deck.length}</p><p className="mt-1 text-sm text-muted-foreground">recalled without help. The ones you missed will come back sooner.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2"><button type="button" onClick={() => { setRound((r) => r + 1); setI(0); setKnown(0); }} className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">Another round</button><Link to="/clinical" className="rounded-full border border-border px-5 py-2 text-sm font-bold">Back to cases</Link></div>
    </div>
  );
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-muted-foreground">Card {i + 1} of {deck.length}</p>
      <button type="button" onClick={() => setFlip(true)} disabled={flip} className="block w-full rounded-2xl border-2 border-primary/30 bg-card p-6 text-left sm:p-8">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">If you see THIS…</p>
        <p className="mt-2 font-serif text-xl font-bold leading-snug text-foreground sm:text-2xl">{cur.front}</p>
        {flip ? <div className="mt-5 rounded-xl bg-primary/10 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-primary">…think about</p><p className="mt-1 text-sm leading-relaxed text-foreground sm:text-base">{cur.back}</p><p className="mt-3 text-[11px] text-muted-foreground">From: {cur.from} · <Link to={`/search?q=${encodeURIComponent(cur.revise)}`} className="font-bold text-primary hover:underline">revise “{cur.revise}”</Link></p></div> : <p className="mt-5 text-xs font-semibold text-muted-foreground">Say your answer out loud first — then tap to reveal.</p>}
      </button>
      {flip && (
        <div className="flex gap-2">
          <button type="button" onClick={() => grade(false)} className="flex-1 rounded-full border border-rose-500/50 bg-rose-500/10 px-4 py-2.5 text-sm font-bold text-rose-700">Not yet</button>
          <button type="button" onClick={() => grade(true)} className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">I knew it</button>
        </div>
      )}
    </div>
  );
}

export default function ClinicalPractice() {
  const { pathname } = useLocation();
  const reason = pathname.endsWith("/reason");
  const cards = pathname.endsWith("/cards");
  return (
    <div className="min-h-dvh bg-muted/20">
      <section className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="mx-auto max-w-3xl px-4 py-7 sm:px-5 sm:py-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary"><Link to="/clinical" className="hover:underline">Clinical simulator</Link> › {cards ? "Recall cards" : reason ? "Reverse reasoning" : "Consultant interrogation"}</p>
          <h1 className="mt-1 flex items-center gap-2 font-serif text-2xl font-bold text-foreground sm:text-3xl">{cards ? <Layers className="h-6 w-6 text-primary" /> : reason ? <Workflow className="h-6 w-6 text-primary" /> : <Gauge className="h-6 w-6 text-primary" />} {cards ? "If you see THIS → think THESE" : reason ? "From finding to diagnosis — backwards" : "Rapid-fire with the consultant"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{cards ? "Pattern recognition cards from every case. Say the answer first, then reveal it." : reason ? "Start from a clinical finding and work out the mechanism, the system, the diseases, and the question, examination and test that separates them." : "Questions from every case, mixed together. Use hints, think out loud — what you get wrong comes back sooner."}</p>
        </div>
      </section>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-5">{cards ? <CardsMode /> : reason ? <ReasonMode /> : <ConsultantMode />}</div>
    </div>
  );
}
