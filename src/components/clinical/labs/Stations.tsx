import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, RotateCcw } from "lucide-react";
import { stationById, STATIONS, type Station } from "@/clinical/stations";
import { ROTATIONS, type Rotation } from "@/clinical/types";
import { useClinicalProgress } from "@/clinical/progress";
import EcgStrip from "@/components/clinical/EcgStrip";
import McqSeries, { ResultCard, type SeriesResult } from "@/components/clinical/McqSeries";
import { saveDrill } from "./shared";

const KIND: Record<Station["kind"], { label: string; emoji: string }> = { ecg: { label: "ECG", emoji: "📈" }, cxr: { label: "Chest X-ray", emoji: "🩻" }, ct: { label: "CT", emoji: "🧠" }, us: { label: "Ultrasound", emoji: "🔊" }, xr: { label: "Abdominal X-ray", emoji: "🩻" }, sign: { label: "Clinical signs", emoji: "👁️" } };
const STEPS = ["1 · Describe it", "2 · Interpret / diagnose", "3 · Differentials and mechanism", "4 · What next?"];

export function StationsList() {
  const prog = useClinicalProgress();
  const navigate = useNavigate();
  const [rot, setRot] = useState<Rotation | "all">("all");
  const list = STATIONS.filter((s) => rot === "all" || s.rotation === rot);
  const last = (id: string) => [...prog.attempts].reverse().find((a) => a.caseId === `x-station-${id}`);
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs leading-relaxed text-foreground">Every station follows the same routine examiners mark: <b>describe → interpret → diagnose → differentials → next step</b>. ECGs are drawn live. Other images are given as the report of what is on the film — use them to practise a systematic description.</div>
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }} role="group" aria-label="Rotation">
        <button type="button" onClick={() => setRot("all")} aria-pressed={rot === "all"} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold ${rot === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>All ({STATIONS.length})</button>
        {ROTATIONS.filter((r) => STATIONS.some((s) => s.rotation === r.id)).map((r) => <button key={r.id} type="button" onClick={() => setRot(r.id)} aria-pressed={rot === r.id} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold ${rot === r.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{r.emoji} {r.short}</button>)}
        <button type="button" onClick={() => navigate(`/clinical/stations/${STATIONS[Math.floor(Math.random() * STATIONS.length)].id}`)} className="shrink-0 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-bold">🎲 Random</button>
      </div>
      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {list.map((s) => { const a = last(s.id); return (
          <li key={s.id}>
            <Link to={`/clinical/stations/${s.id}`} className="group flex h-full min-w-0 flex-col rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{KIND[s.kind].emoji} {KIND[s.kind].label}</span>
              <span className="mt-1 font-serif text-base font-bold leading-snug text-foreground">{s.kind === "ecg" ? "Rhythm station" : "Imaging station"} {STATIONS.indexOf(s) + 1}</span>
              <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{s.clinical}</span>
              <span className="mt-2 flex items-center justify-between text-[11px] font-bold"><span className={a ? (a.score >= 75 ? "text-emerald-700" : "text-amber-700") : "text-muted-foreground"}>{a ? `Last: ${a.score}%` : "Not tried"}</span><ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5" /></span>
            </Link>
          </li>); })}
      </ul>
    </div>
  );
}

export function StationRunner() {
  const { id } = useParams();
  const s = id ? stationById(id) : undefined;
  const [res, setRes] = useState<SeriesResult | null>(null);
  const [round, setRound] = useState(0);
  const qs = useMemo(() => s?.steps ?? [], [s, round]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!s) return <Navigate to="/clinical/stations" replace />;
  const k = KIND[s.kind];
  const next = STATIONS[(STATIONS.indexOf(s) + 1) % STATIONS.length];
  return (
    <div className="space-y-4" key={`${s.id}-${round}`}>
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">{k.emoji} {k.label} station</p>
        <p className="mt-1 text-sm leading-relaxed text-foreground"><b>Clinical scenario:</b> {s.clinical}</p>
        <div className="mt-3">
          {s.kind === "ecg" && s.ecg ? <><EcgStrip kind={s.ecg} label="ECG — describe before you answer" /><p className="mt-2 text-xs text-muted-foreground">{s.stimulus}</p></> : (
            <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 font-mono text-xs leading-relaxed text-zinc-100 sm:text-sm"><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-sky-300">{k.label} report — what is on the image</p>{s.stimulus}</div>
          )}
        </div>
        <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">Say it out loud first: <b>description → interpretation → diagnosis → differentials → next step</b>.</p>
      </div>
      {!res ? <McqSeries qs={qs} labels={STEPS} onFinish={(r) => { setRes(r); saveDrill(`station-${s.id}`, "station", "imaging", r); }} finishLabel="See my result" /> : (
        <>
          <ResultCard title="Station complete" pct={res.pct}><p className="mt-1 text-xs text-muted-foreground">{res.hints} hint{res.hints === 1 ? "" : "s"} used</p></ResultCard>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setRes(null); setRound((r) => r + 1); }} className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-bold hover:border-primary/50"><RotateCcw className="h-4 w-4" /> Try again</button>
            <Link to={`/clinical/stations/${next.id}`} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">Next station <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/clinical/stations" className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-bold">All stations</Link>
          </div>
        </>
      )}
    </div>
  );
}
