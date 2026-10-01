import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { clearMistakes, removeMistake, useMistakes } from "@/clinical/mistakes";
import McqSeries, { ResultCard, type SeriesResult } from "@/components/clinical/McqSeries";
import { saveDrill } from "./shared";

/** Every question you have got wrong, anywhere on the site. Answer it right twice in a row and it leaves the notebook. */
export function MistakesLab() {
  const items = useMistakes();
  const [running, setRunning] = useState(false);
  const [res, setRes] = useState<SeriesResult | null>(null);
  const [round, setRound] = useState(0);
  const deck = useMemo(() => [...items].sort((a, b) => b.misses - a.misses || b.at - a.at).slice(0, 10).map((m) => m.q), [round]); // eslint-disable-line react-hooks/exhaustive-deps

  if (running && !res && deck.length) return <McqSeries key={round} qs={deck} onFinish={(r) => { setRes(r); saveDrill("mistakes", "mistakes", "consultant", r); }} finishLabel="See my score" />;
  if (res) return (
    <div className="space-y-3">
      <ResultCard title="Review complete" pct={res.pct}><p className="mt-1 text-xs text-muted-foreground">Questions you now get right twice in a row leave the notebook.</p></ResultCard>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setRes(null); setRound((r) => r + 1); }} className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">Review again</button><button type="button" onClick={() => { setRes(null); setRunning(false); }} className="rounded-full border border-border px-5 py-2.5 text-sm font-bold">Back to the list</button></div>
    </div>
  );
  if (!items.length) return <div className="rounded-2xl border border-border bg-card p-6 text-center"><p className="font-serif text-xl font-bold text-foreground">Nothing to review</p><p className="mt-1 text-sm text-muted-foreground">Questions you get wrong anywhere on the site collect here. Try a case, the quiz or the pharmacology drills.</p><div className="mt-3 flex flex-wrap justify-center gap-2"><Link to="/clinical/quiz" className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">Rapid-fire quiz</Link><Link to="/pharmacology?tab=practice" className="rounded-full border border-border px-5 py-2 text-sm font-bold">Pharmacology drills</Link></div></div>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-foreground">{items.length} question{items.length === 1 ? "" : "s"} to master</p><div className="flex gap-2"><button type="button" onClick={() => { setRound((r) => r + 1); setRunning(true); }} className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">Review {Math.min(10, items.length)} now</button><button type="button" onClick={() => { if (window.confirm("Clear the whole notebook?")) clearMistakes(); }} className="rounded-full border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground">Clear all</button></div></div>
      <ul className="space-y-2">
        {items.map((m) => {
          const right = m.q.options.filter((o) => o.ok).map((o) => o.t);
          return (
            <li key={m.q.id}>
              <details className="group rounded-2xl border border-border bg-card">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-3.5"><span className="min-w-0 text-sm font-semibold leading-snug text-foreground">{m.q.q}</span><span className="shrink-0 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-700">missed {m.misses}×</span></summary>
                <div className="space-y-2 border-t border-border px-3.5 pb-3.5 pt-3 text-xs leading-relaxed">
                  <div className="rounded-lg bg-emerald-500/10 p-2.5"><p className="font-bold text-emerald-800">{right.length > 1 ? "Correct answers" : "Correct answer"}</p><ul className="list-disc pl-4 text-foreground">{right.map((r) => <li key={r}>{r}</li>)}</ul></div>
                  <p className="text-muted-foreground"><b className="text-foreground">Why:</b> {m.q.explain}</p>
                  <button type="button" onClick={() => removeMistake(m.q.id)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-rose-600"><Trash2 className="h-3 w-3" /> Remove from notebook</button>
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
