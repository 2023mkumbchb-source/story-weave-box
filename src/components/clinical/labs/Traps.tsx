import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { TRAPS } from "@/clinical/traps";
import { recordDrill } from "@/clinical/progress";
import { ROTATIONS } from "@/clinical/types";
import McqCard from "@/components/clinical/McqCard";
import { ResultCard } from "@/components/clinical/McqSeries";
import { logStudy } from "@/lib/studyLog";

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

export function TrapsLab() {
  const [rot, setRot] = useState<string>("all");
  const [round, setRound] = useState(0);
  const deck = useMemo(() => shuffle(TRAPS.filter((t) => rot === "all" || t.rot === rot || t.rot === "all")).slice(0, 8), [rot, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState<number[]>([]);
  const cur = deck[i];
  const restart = () => { setRound((r) => r + 1); setI(0); setDone(false); setScore([]); };
  const avg = score.length ? Math.round((score.reduce((a, b) => a + b, 0) / score.length) * 100) : 0;
  if (i >= deck.length) return (
    <div className="space-y-3"><ResultCard title="Round complete" pct={avg}><p className="mt-1 text-xs text-muted-foreground">Another round draws a fresh set of traps.</p></ResultCard>
      <button type="button" onClick={restart} className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">Another round</button></div>
  );
  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }} role="group" aria-label="Rotation">
        <button type="button" onClick={() => { setRot("all"); restart(); }} aria-pressed={rot === "all"} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold ${rot === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>All traps</button>
        {ROTATIONS.map((r) => <button key={r.id} type="button" onClick={() => { setRot(r.id); restart(); }} aria-pressed={rot === r.id} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold ${rot === r.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{r.emoji} {r.short}</button>)}
      </div>
      <p className="text-xs font-bold text-muted-foreground">Trap {i + 1} of {deck.length}</p>
      <div key={`${cur.id}-${round}`} className="space-y-3">
        <div className="rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 p-4">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-700"><ShieldAlert className="h-4 w-4" /> On the ward round</p>
          <p className="mt-1 text-sm leading-relaxed text-foreground sm:text-base">{cur.scenario}</p>
        </div>
        <McqCard q={cur.q} label="What is the trap?" onDone={(r, h) => { setScore((s) => [...s, r.earned]); setDone(true); recordDrill(cur.q.id, r.allRight && h < 2); logStudy(1); }} />
        {done && (
          <>
            <p className="rounded-xl border border-border bg-card p-3 text-xs italic text-foreground">The consultant would say: {cur.lecturer}</p>
            <button type="button" onClick={() => { setDone(false); setI((x) => x + 1); }} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground">{i + 1 >= deck.length ? "Finish" : "Next trap"} <ArrowRight className="h-4 w-4" /></button>
          </>
        )}
      </div>
      <Link to="/clinical" className="inline-block text-xs font-bold text-primary hover:underline">← Back to the simulator</Link>
    </div>
  );
}
