import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, X } from "lucide-react";
import { ALL_CASES } from "@/clinical";
import { findingsDrill } from "@/clinical/grading";
import { ROTATIONS } from "@/clinical/types";
import { ResultCard } from "@/components/clinical/McqSeries";
import { saveDrill } from "./shared";

/** Normal or abnormal? Findings are taken from real cases: the case’s key findings are abnormal, the untouched template defaults are normal. */
export function FindingsLab() {
  const [rot, setRot] = useState<string>("all");
  const [round, setRound] = useState(0);
  const c = useMemo(() => { const pool = ALL_CASES.filter((x) => rot === "all" || x.rotation === rot); return pool[Math.floor(Math.random() * pool.length)]; }, [rot, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const items = useMemo(() => findingsDrill(c, 8), [c]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<boolean | null>(null);
  const [right, setRight] = useState(0);
  const cur = items[i];
  const again = () => { setRound((r) => r + 1); setI(0); setPicked(null); setRight(0); };
  if (!cur) {
    const pct = Math.round((right / Math.max(items.length, 1)) * 100);
    return (
      <div className="space-y-3">
        <ResultCard title="Round complete" pct={pct}><p className="mt-1 text-xs text-muted-foreground">{right} of {items.length} correct. Case: {c.title}</p></ResultCard>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { saveDrill("findings", "findings", "reporting", { earned: right, total: items.length, hints: 0, pct }); again(); }} className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">Save and play again</button><Link to="/clinical" className="rounded-full border border-border px-5 py-2 text-sm font-bold">Back to the simulator</Link></div>
      </div>
    );
  }
  const answer = (abn: boolean) => { if (picked !== null) return; setPicked(abn); if (abn === cur.abnormal) setRight((r) => r + 1); };
  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }} role="group" aria-label="Rotation">
        <button type="button" onClick={() => { setRot("all"); setI(0); setRight(0); setPicked(null); }} aria-pressed={rot === "all"} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold ${rot === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>All rotations</button>
        {ROTATIONS.map((r) => <button key={r.id} type="button" onClick={() => { setRot(r.id); setI(0); setRight(0); setPicked(null); }} aria-pressed={rot === r.id} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold ${rot === r.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{r.emoji} {r.short}</button>)}
      </div>
      <p className="text-xs font-bold text-muted-foreground">Finding {i + 1} of {items.length} · {right} right</p>
      <div className="rounded-2xl border-2 border-primary/30 bg-card p-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">You examine: {cur.label}</p>
        <p className="mt-2 font-serif text-lg font-bold leading-snug text-foreground sm:text-xl">“{cur.text}”</p>
        <p className="mt-2 text-xs text-muted-foreground">Is this normal or abnormal? Then say how you would report it.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => answer(false)} disabled={picked !== null} className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold ${picked === false ? (cur.abnormal ? "border-rose-500 bg-rose-500/10" : "border-emerald-500 bg-emerald-500/10") : "border-border hover:border-primary/50"}`}><Check className="h-4 w-4" /> Normal</button>
          <button type="button" onClick={() => answer(true)} disabled={picked !== null} className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold ${picked === true ? (cur.abnormal ? "border-emerald-500 bg-emerald-500/10" : "border-rose-500 bg-rose-500/10") : "border-border hover:border-primary/50"}`}><X className="h-4 w-4" /> Abnormal</button>
        </div>
        {picked !== null && (
          <div className={`mt-4 rounded-xl p-3 text-xs leading-relaxed ${picked === cur.abnormal ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
            <p className="font-bold">{picked === cur.abnormal ? "✓ Correct" : "✗ Not quite"} — this is {cur.abnormal ? "an ABNORMAL finding" : "a NORMAL finding"}.</p>
            <p className="mt-1 text-foreground"><b>Why it matters:</b> {cur.looking}</p>
            <p className="mt-1 text-muted-foreground"><b>How to say it:</b> {cur.abnormal ? `“${cur.label}: ${cur.text.replace(/\.$/, "")}.”` : `“No abnormality on ${cur.label.toLowerCase()} — ${cur.text.replace(/\.$/, "").toLowerCase()}.”`}</p>
          </div>
        )}
      </div>
      {picked !== null && <button type="button" onClick={() => { setPicked(null); setI((x) => x + 1); }} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground">{i + 1 >= items.length ? "Finish" : "Next finding"} <ArrowRight className="h-4 w-4" /></button>}
    </div>
  );
}
