import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { logStudy } from "@/lib/studyLog";

const MODES = [
  { id: "focus", label: "Focus", minutes: 25 },
  { id: "short", label: "Short break", minutes: 5 },
  { id: "long", label: "Long break", minutes: 15 },
] as const;

/** Pomodoro timer: finished focus sessions are added to today's study minutes (and the streak). */
export default function FocusTimer() {
  const [mode, setMode] = useState<(typeof MODES)[number]>(MODES[0]);
  const [left, setLeft] = useState(MODES[0].minutes * 60);
  const [running, setRunning] = useState(false);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => {
      setLeft((s) => {
        if (s > 1) return s - 1;
        setRunning(false);
        if (modeRef.current.id === "focus") logStudy(modeRef.current.minutes);
        try { navigator.vibrate?.(200); } catch { /* not supported */ }
        return 0;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [running]);

  useEffect(() => { document.title = running ? `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")} · Focus` : document.title.replace(/^\d\d:\d\d · Focus$/, "Smart Revision"); }, [running, left]);

  const pick = (m: (typeof MODES)[number]) => { setMode(m); setLeft(m.minutes * 60); setRunning(false); };
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const pct = 100 - (left / (mode.minutes * 60)) * 100;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Timer mode">
        {MODES.map((m) => <button key={m.id} type="button" onClick={() => pick(m)} aria-pressed={mode.id === m.id} className={`rounded-full border px-3 py-1 text-xs font-bold ${mode.id === m.id ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"}`}>{m.label}</button>)}
      </div>
      <p className="mt-4 text-center font-serif text-6xl font-bold tabular-nums text-foreground" aria-live="off">{mm}:{ss}</p>
      <div className="mx-auto mt-3 h-1.5 max-w-xs overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
      <div className="mt-4 flex justify-center gap-2">
        <button type="button" onClick={() => setRunning((r) => !r)} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">{running ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> {left === 0 ? "Again" : "Start"}</>}</button>
        <button type="button" onClick={() => pick(mode)} aria-label="Reset timer" className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-bold hover:border-primary/50"><RotateCcw className="h-4 w-4" /></button>
      </div>
      {left === 0 && <p className="mt-3 text-center text-xs font-bold text-primary">{mode.id === "focus" ? `${mode.minutes} minutes logged — take a break.` : "Break over — back to it."}</p>}
    </div>
  );
}
