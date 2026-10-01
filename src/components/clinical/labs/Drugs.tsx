import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, Pill, RotateCcw, Search } from "lucide-react";
import { DRUGS } from "@/clinical/extras/drugs";
import { drugQuestions } from "@/clinical/grading";
import { useClinicalProgress } from "@/clinical/progress";
import McqSeries, { ResultCard, type SeriesResult } from "@/components/clinical/McqSeries";
import { saveDrill } from "./shared";

export function DrugsList() {
  const prog = useClinicalProgress();
  const [q, setQ] = useState("");
  const list = DRUGS.filter((d) => !q || `${d.name} ${d.cls}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs leading-relaxed text-foreground">Not “give ceftriaxone” — <b>why</b> this drug? Class, mechanism, adverse effects, cautions, and what changes in renal impairment, pregnancy and children. {DRUGS.length} drugs.</div>
      <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a drug or class…" aria-label="Find a drug" className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" /></div>
      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {list.map((d) => { const a = [...prog.attempts].reverse().find((x) => x.caseId === `x-drug-${d.id}`); return (
          <li key={d.id}>
            <Link to={`/clinical/drugs/${d.id}`} className="group flex h-full min-w-0 flex-col rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"><Pill className="h-3 w-3" /> {d.cls}</span>
              <span className="mt-1 font-serif text-base font-bold leading-snug text-foreground">{d.name}</span>
              <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{d.why}</span>
              <span className="mt-2 flex items-center justify-between text-[11px] font-bold"><span className={a ? (a.score >= 75 ? "text-emerald-700" : "text-amber-700") : "text-muted-foreground"}>{a ? `Last: ${a.score}%` : "Not tried"}</span><ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5" /></span>
            </Link>
          </li>); })}
      </ul>
      {list.length === 0 && <p className="text-sm text-muted-foreground">No drug matches that search.</p>}
    </div>
  );
}

export function DrugRunner() {
  const { id } = useParams();
  const d = DRUGS.find((x) => x.id === id);
  const [res, setRes] = useState<SeriesResult | null>(null);
  const [round, setRound] = useState(0);
  const qs = useMemo(() => (d ? drugQuestions(d) : []), [d, round]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!d) return <Navigate to="/clinical/drugs" replace />;
  const next = DRUGS[Math.floor(Math.random() * DRUGS.length)];
  return (
    <div className="space-y-4" key={`${d.id}-${round}`}>
      <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 sm:p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-primary">Drug reasoning</p><p className="mt-1 font-serif text-2xl font-bold text-foreground">{d.name}</p><p className="mt-1 text-xs text-muted-foreground">Answer from memory first; the drug card appears at the end.</p></div>
      {!res ? <McqSeries qs={qs} onFinish={(r) => { setRes(r); saveDrill(`drug-${d.id}`, "drug", "pharmacology", r); }} finishLabel="Show the drug card" /> : (
        <>
          <ResultCard title="Drug drill complete" pct={res.pct} />
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <h3 className="font-serif text-lg font-bold text-foreground">{d.name}</h3>
            <dl className="mt-2 space-y-2 text-xs leading-relaxed sm:text-sm">
              {([["Class", d.cls], ["Why we use it", d.why], ["Mechanism", d.mech], ["Adverse effects", d.ae.join("; ")], ["Cautions / contraindications", d.caution], ["Dose (teaching)", d.dose], ["Renal / pregnancy / children", d.special]] as [string, string][]).map(([k, v]) => <div key={k}><dt className="font-bold text-primary">{k}</dt><dd className="text-foreground">{v}</dd></div>)}
            </dl>
            <p className="mt-2 text-[11px] text-muted-foreground">Teaching doses — follow your local guideline and your pharmacist.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setRes(null); setRound((r) => r + 1); }} className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-bold hover:border-primary/50"><RotateCcw className="h-4 w-4" /> Again</button>
            <Link to={`/clinical/drugs/${next.id}`} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">Random drug <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/clinical/drugs" className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-bold">All drugs</Link>
          </div>
        </>
      )}
    </div>
  );
}
