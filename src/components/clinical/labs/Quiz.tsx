import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BANK, type BankQ } from "@/clinical/bank";
import { ALL_CASES } from "@/clinical";
import { recordDrill, useClinicalProgress } from "@/clinical/progress";
import { ROTATIONS } from "@/clinical/types";
import McqSeries, { ResultCard, type SeriesResult } from "@/components/clinical/McqSeries";
import { saveDrill } from "./shared";

/** Mixed rapid-fire: the question bank plus consultant questions and interpretation questions from every case. Questions you miss are drawn more often. */
export function QuizLab() {
  const prog = useClinicalProgress();
  const [rot, setRot] = useState<string>("all");
  const [size, setSize] = useState(10);
  const [round, setRound] = useState(0);
  const [started, setStarted] = useState(false);
  const [res, setRes] = useState<SeriesResult | null>(null);
  const [misses, setMisses] = useState<string[]>([]);

  const pool = useMemo<BankQ[]>(() => {
    const fromCases: BankQ[] = ALL_CASES.filter((c) => rot === "all" || c.rotation === rot).flatMap((c) => [...c.consultant, ...c.interpret].map((q) => ({ ...q, rotation: c.rotation, topic: c.title })));
    return [...BANK.filter((b) => rot === "all" || b.rotation === rot), ...fromCases];
  }, [rot]);
  const deck = useMemo(() => {
    const weight = (id: string) => { const d = prog.drills[id]; return d ? 1 + (d[1] - d[0]) * 2 : 3; };
    const left = [...pool]; const out: BankQ[] = [];
    while (out.length < Math.min(size, pool.length)) { const tot = left.reduce((s, x) => s + weight(x.id), 0); let r = Math.random() * tot; const i = left.findIndex((x) => (r -= weight(x.id)) <= 0); out.push(...left.splice(Math.max(i, 0), 1)); }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, size, round]);

  if (!started) return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs leading-relaxed text-foreground">{BANK.length} rapid-fire questions plus every consultant and interpretation question from the {ALL_CASES.length} cases ({pool.length} in this selection). Each answer comes with the reasoning.</div>
      <div><p className="text-xs font-bold text-foreground">Rotation</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setRot("all")} aria-pressed={rot === "all"} className={`rounded-full border px-3.5 py-1.5 text-xs font-bold ${rot === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>Mixed</button>
          {ROTATIONS.map((r) => <button key={r.id} type="button" onClick={() => setRot(r.id)} aria-pressed={rot === r.id} className={`rounded-full border px-3.5 py-1.5 text-xs font-bold ${rot === r.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{r.emoji} {r.short}</button>)}
        </div></div>
      <div><p className="text-xs font-bold text-foreground">Length</p>
        <div className="mt-1.5 flex gap-1.5">{[5, 10, 20].map((n) => <button key={n} type="button" onClick={() => setSize(n)} aria-pressed={size === n} className={`rounded-full border px-4 py-1.5 text-xs font-bold ${size === n ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{n} questions</button>)}</div></div>
      <button type="button" onClick={() => { setStarted(true); setRes(null); setMisses([]); }} className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground">Start</button>
    </div>
  );
  if (res) return (
    <div className="space-y-3">
      <ResultCard title="Quiz complete" pct={res.pct}><p className="mt-1 text-xs text-muted-foreground">{res.hints} hint{res.hints === 1 ? "" : "s"} used · {misses.length} to revisit</p></ResultCard>
      {misses.length > 0 && <div className="rounded-2xl border border-border bg-card p-4 text-xs"><p className="font-bold text-foreground">Questions to revisit (they will come back sooner)</p><ul className="mt-1 list-disc space-y-1 pl-4 text-muted-foreground">{deck.filter((q) => misses.includes(q.id)).map((q) => <li key={q.id}>{q.q}</li>)}</ul></div>}
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setRound((r) => r + 1); setRes(null); setMisses([]); }} className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">Another round</button><button type="button" onClick={() => setStarted(false)} className="rounded-full border border-border px-5 py-2 text-sm font-bold">Change settings</button><Link to="/clinical" className="rounded-full border border-border px-5 py-2 text-sm font-bold">Simulator</Link></div>
    </div>
  );
  return <McqSeries key={round} qs={deck} labels={deck.map((q, i) => `${ROTATIONS.find((r) => r.id === q.rotation)?.short ?? ""} · question ${i + 1} of ${deck.length}`)} onEach={(q, r, h) => { recordDrill(q.id, r.allRight && h < 2); if (!r.allRight) setMisses((m) => [...m, q.id]); }} onFinish={(r) => { setRes(r); saveDrill("quiz", "quiz", "consultant", r); }} finishLabel="See my score" />;
}
