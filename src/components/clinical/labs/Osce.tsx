import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Clock, Play } from "lucide-react";
import { COUNSEL, gradeCounsel } from "@/clinical/counselling";
import { buildCircuit, endOsce, getOsce, osceNextUrl, recordOsceStation, startOsce, stationUrl } from "@/clinical/osce";
import { recordAttempt } from "@/clinical/progress";
import { ROTATIONS } from "@/clinical/types";
import { wordCount } from "@/clinical/grading";
import { ResultCard } from "@/components/clinical/McqSeries";
import { logStudy } from "@/lib/studyLog";

export function OsceLab() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [minutes, setMinutes] = useState(4);
  const [rot, setRot] = useState("all");
  const run = useMemo(() => getOsce(), [sp]); // eslint-disable-line react-hooks/exhaustive-deps
  const done = sp.get("done") === "1" && run && run.idx >= run.stations.length;

  if (done && run) {
    const avg = Math.round(run.scores.reduce((s, x) => s + x.score, 0) / Math.max(run.scores.length, 1));
    return (
      <div className="space-y-4">
        <ResultCard title="OSCE circuit complete" pct={avg}><p className="mt-1 text-xs text-muted-foreground">{run.scores.length} stations in {Math.max(1, Math.round((Date.now() - run.startedAt) / 60000))} minutes</p></ResultCard>
        <ul className="space-y-2">{run.scores.map((s, i) => <li key={i} className="rounded-xl border border-border bg-card p-3"><div className="flex justify-between text-xs font-bold"><span>{i + 1}. {s.label}</span><span className={s.score >= 75 ? "text-emerald-700" : s.score >= 50 ? "text-amber-700" : "text-rose-700"}>{s.score}%</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${s.score >= 75 ? "bg-emerald-500" : s.score >= 50 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${s.score}%` }} /></div></li>)}</ul>
        <p className="text-xs text-muted-foreground">Your weakest station is the one to practise next. Each station also counted towards your skill percentages.</p>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { endOsce(); navigate("/clinical/osce"); }} className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">New circuit</button><Link to="/clinical" className="rounded-full border border-border px-5 py-2 text-sm font-bold">Simulator</Link></div>
      </div>
    );
  }

  const inProgress = run && run.idx < run.stations.length;
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs leading-relaxed text-foreground">An OSCE circuit runs six timed stations back to back: <b>history, physical examination, interpretation, emergency, counselling and a mental state examination</b>. A countdown runs on every station; when it hits zero the station closes and you are marked on what you did.</div>
      {inProgress && (
        <div className="rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 p-4">
          <p className="text-sm font-bold text-foreground">A circuit is in progress — station {run.idx + 1} of {run.stations.length}</p>
          <div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => navigate(osceNextUrl())} className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground">Continue</button><button type="button" onClick={() => { endOsce(); navigate("/clinical/osce"); }} className="rounded-full border border-border px-5 py-2 text-xs font-bold">Abandon</button></div>
        </div>
      )}
      <div>
        <p className="text-xs font-bold text-foreground">Time per station</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">{[2, 3, 4, 5, 8].map((m) => <button key={m} type="button" onClick={() => setMinutes(m)} aria-pressed={minutes === m} className={`rounded-full border px-4 py-1.5 text-xs font-bold ${minutes === m ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{m} min</button>)}</div>
        <p className="mt-1 text-[11px] text-muted-foreground">Real OSCEs are 5–8 minutes. Start shorter to build speed.</p>
      </div>
      <div>
        <p className="text-xs font-bold text-foreground">Focus</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5"><button type="button" onClick={() => setRot("all")} aria-pressed={rot === "all"} className={`rounded-full border px-3.5 py-1.5 text-xs font-bold ${rot === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>Mixed</button>{ROTATIONS.map((r) => <button key={r.id} type="button" onClick={() => setRot(r.id)} aria-pressed={rot === r.id} className={`rounded-full border px-3.5 py-1.5 text-xs font-bold ${rot === r.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{r.emoji} {r.short}</button>)}</div>
      </div>
      <button type="button" onClick={() => { const r = startOsce(buildCircuit(minutes, rot)); navigate(stationUrl(r.stations[0])); }} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"><Play className="h-4 w-4" /> Start the circuit</button>
    </div>
  );
}

export function CounselRunner() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const c = COUNSEL.find((x) => x.id === id);
  const limit = Number(sp.get("limit")) || 0;
  const circuit = sp.get("circuit") === "1";
  const [text, setText] = useState("");
  const [res, setRes] = useState<ReturnType<typeof gradeCounsel> | null>(null);
  const [left, setLeft] = useState(limit);
  useEffect(() => { if (!limit || res) return; const t = setInterval(() => setLeft((x) => x - 1), 1000); return () => clearInterval(t); }, [limit, res]);
  const submit = () => {
    if (!c || res) return;
    const g = gradeCounsel(c, text); setRes(g);
    const pct = Math.round((g.filter((x) => x.ok).length / g.length) * 100);
    recordAttempt({ caseId: `x-counsel-${c.id}`, at: Date.now(), mode: "counsel", tally: { communication: [pct / 100, 1] }, score: pct, hints: 0 }); logStudy(3);
    if (circuit) recordOsceStation(pct);
  };
  useEffect(() => { if (limit > 0 && left <= 0 && !res && c) submit(); }, [left]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!c) return <Navigate to="/clinical/osce" replace />;
  const pct = res ? Math.round((res.filter((x) => x.ok).length / res.length) * 100) : 0;
  const clock = `${Math.floor(Math.max(left, 0) / 60)}:${String(Math.max(left, 0) % 60).padStart(2, "0")}`;
  const other = COUNSEL[(COUNSEL.indexOf(c) + 1) % COUNSEL.length];
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3"><p className="text-[10px] font-bold uppercase tracking-wider text-primary">Counselling station · {ROTATIONS.find((r) => r.id === c.rotation)?.short}</p>{limit > 0 && !res && <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${left <= 0 ? "bg-rose-500/15 text-rose-700" : left < 30 ? "bg-amber-500/20 text-amber-700" : "bg-muted"}`}><Clock className="h-3 w-3" /> {left <= 0 ? "Time up" : clock}</span>}</div>
        <p className="mt-1 font-serif text-lg font-bold text-foreground">{c.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-foreground">{c.task}</p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <textarea value={text} disabled={Boolean(res)} onChange={(e) => setText(e.target.value)} rows={9} placeholder="Write what you would say, in the order you would say it…" className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-70" />
        {!res && <button type="button" onClick={submit} disabled={wordCount(text) < 10} className="mt-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-40">Mark my counselling</button>}
      </div>
      {res && (
        <>
          <ResultCard title="Communication checklist" pct={pct} />
          <ul className="space-y-2">{res.map(({ item, ok }) => <li key={item.label} className={`rounded-xl border p-3 text-xs leading-relaxed ${ok ? "border-emerald-500/40 bg-emerald-500/10" : "border-amber-500/40 bg-amber-500/10"}`}><b>{ok ? "✓" : "△"} {item.label}</b><br /><span className="text-muted-foreground">{item.why}</span></li>)}</ul>
          <div className="rounded-2xl border border-border bg-card p-4 text-xs leading-relaxed sm:text-sm"><p className="font-bold text-primary">A model script</p><p className="mt-1 text-foreground">{c.model}</p><p className="mt-2 text-[10px] text-muted-foreground">Keyword marking: reword freely, but make sure each checklist step appears in what you say.</p></div>
          <div className="flex flex-wrap gap-2">
            {circuit ? <Link to={osceNextUrl()} className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">Next OSCE station →</Link> : <Link to={`/clinical/counsel/${other.id}`} className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">Next counselling station →</Link>}
            <Link to="/clinical/osce" className="rounded-full border border-border px-5 py-2.5 text-sm font-bold">OSCE home</Link>
          </div>
        </>
      )}
    </div>
  );
}

export function CounselList() {
  return (
    <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {COUNSEL.map((c) => <li key={c.id}><Link to={`/clinical/counsel/${c.id}`} className="block h-full min-w-0 rounded-2xl border border-border bg-card p-4 hover:border-primary/50"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{ROTATIONS.find((r) => r.id === c.rotation)?.emoji} {ROTATIONS.find((r) => r.id === c.rotation)?.short}</span><span className="mt-1 block font-serif text-base font-bold leading-snug text-foreground">{c.title}</span><span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">{c.task}</span></Link></li>)}
    </ul>
  );
}
