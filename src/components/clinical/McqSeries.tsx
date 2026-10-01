import { useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import McqCard from "@/components/clinical/McqCard";
import type { McqResult } from "@/clinical/engine";
import type { MCQ } from "@/clinical/types";

export interface SeriesResult { earned: number; total: number; hints: number; pct: number }

/** A run of questions shown one at a time, earlier ones staying visible. Reports the combined score at the end. */
export default function McqSeries({ qs, labels, onEach, onFinish, finishLabel = "Finish" }: {
  qs: MCQ[]; labels?: string[]; onEach?: (q: MCQ, r: McqResult, hints: number) => void; onFinish: (r: SeriesResult) => void; finishLabel?: string;
}) {
  const [i, setI] = useState(0);
  const [answered, setAnswered] = useState(false);
  const acc = useRef({ earned: 0, hints: 0 });
  const last = i >= qs.length - 1;
  return (
    <div className="space-y-3">
      {qs.slice(0, i + 1).map((q, k) => (
        <McqCard key={q.id} q={q} label={labels?.[k] ?? `Question ${k + 1} of ${qs.length}`} onDone={(r, h) => { acc.current.earned += r.earned; acc.current.hints += h; onEach?.(q, r, h); if (k === i) setAnswered(true); }} />
      ))}
      {answered && (
        <button type="button" onClick={() => { if (last) onFinish({ earned: acc.current.earned, total: qs.length, hints: acc.current.hints, pct: Math.round((acc.current.earned / qs.length) * 100) }); else { setI((x) => x + 1); setAnswered(false); } }} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground">
          {last ? finishLabel : "Next"} <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function ResultCard({ title, pct, children }: { title: string; pct: number; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-primary/30 bg-card p-5 text-center">
      <p className="text-[11px] font-bold uppercase tracking-wider text-primary">{title}</p>
      <p className={`mt-1 font-serif text-5xl font-bold ${pct >= 75 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-rose-600"}`}>{pct}%</p>
      {children}
    </div>
  );
}
