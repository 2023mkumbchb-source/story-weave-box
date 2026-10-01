import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, RotateCcw } from "lucide-react";
import { LADDERS } from "@/clinical/whyLadders";
import { ROTATIONS } from "@/clinical/types";
import { useClinicalProgress } from "@/clinical/progress";
import McqSeries, { ResultCard, type SeriesResult } from "@/components/clinical/McqSeries";
import { saveDrill } from "./shared";

export function WhyList() {
  const prog = useClinicalProgress();
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs leading-relaxed text-foreground">Start from something you can see at the bedside and keep asking <b>“why?”</b> until you reach the physiology — then climb back up to the question you should ask the patient. {LADDERS.length} ladders.</div>
      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {LADDERS.map((l) => { const a = [...prog.attempts].reverse().find((x) => x.caseId === `x-why-${l.id}`); const r = ROTATIONS.find((x) => x.id === l.rotation)!; return (
          <li key={l.id}>
            <Link to={`/clinical/why/${l.id}`} className="group flex h-full min-w-0 flex-col rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{r.emoji} {r.short} · {l.rungs.length} steps</span>
              <span className="mt-1 font-serif text-base font-bold leading-snug text-foreground">{l.title}</span>
              <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{l.start}</span>
              <span className="mt-2 flex items-center justify-between text-[11px] font-bold"><span className={a ? (a.score >= 75 ? "text-emerald-700" : "text-amber-700") : "text-muted-foreground"}>{a ? `Last: ${a.score}%` : "Not tried"}</span><ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5" /></span>
            </Link>
          </li>); })}
      </ul>
    </div>
  );
}

export function WhyRunner() {
  const { id } = useParams();
  const l = LADDERS.find((x) => x.id === id);
  const [res, setRes] = useState<SeriesResult | null>(null);
  const [round, setRound] = useState(0);
  if (!l) return <Navigate to="/clinical/why" replace />;
  const next = LADDERS[(LADDERS.indexOf(l) + 1) % LADDERS.length];
  return (
    <div className="space-y-4" key={`${l.id}-${round}`}>
      <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">At the bedside</p>
        <p className="mt-1 text-base font-semibold leading-relaxed text-foreground">{l.start}</p>
        <p className="mt-2 font-serif text-lg font-bold text-foreground">{l.title}</p>
      </div>
      {!res ? <McqSeries qs={l.rungs} labels={l.rungs.map((_, i) => (i === l.rungs.length - 1 ? `Why? ${i + 1} · therefore…` : `Why? ${i + 1} of ${l.rungs.length}`))} onFinish={(r) => { setRes(r); saveDrill(`why-${l.id}`, "why", "pathophysiology", r); }} finishLabel="Climb back up" /> : (
        <>
          <ResultCard title="Ladder complete" pct={res.pct} />
          <div className="rounded-2xl border border-border bg-card p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-primary">The chain to remember</p><p className="mt-1 text-sm leading-relaxed text-foreground">{l.takeaway}</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setRes(null); setRound((r) => r + 1); }} className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-bold hover:border-primary/50"><RotateCcw className="h-4 w-4" /> Again</button>
            <Link to={`/clinical/why/${next.id}`} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">Next ladder <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </>
      )}
    </div>
  );
}
