import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, Circle, Network } from "lucide-react";
import { bySystem, loadGraph, systemCounts } from "@/lib/connections";
import { SYSTEMS, systemById, type SystemId } from "@/lib/concepts";
import { NodeRow } from "@/components/ConnectedLearning";
import { useMyYear } from "@/components/StudyPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { updateMetaTags } from "@/lib/seo";

type Graph = Awaited<ReturnType<typeof loadGraph>>;

function useGraph() {
  const [g, setG] = useState<Graph | null | undefined>(undefined);
  useEffect(() => { let on = true; loadGraph().then((x) => { if (on) setG(x); }).catch(() => { if (on) setG(null); }); return () => { on = false; }; }, []);
  return g;
}

function YearFilter({ year, setYear }: { year: number | null; setYear: (y: number | null) => void }) {
  return (
    <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter by year">
      {[null, 1, 2, 3, 4].map((y) => <button key={y ?? "all"} type="button" onClick={() => setYear(y)} aria-pressed={year === y} className={`rounded-full border px-3.5 py-1.5 text-xs font-bold ${year === y ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50"}`}>{y ? `Year ${y}` : "All years"}</button>)}
    </div>
  );
}

/** /study-map and /study-map/<system> — every system seen through anatomy, embryology, histology, physiology, pathology, drugs … in one place. */
export default function StudyMap() {
  const { system } = useParams();
  const g = useGraph();
  const [myYear] = useMyYear();
  const [year, setYear] = useState<number | null>(null);
  useEffect(() => { setYear(myYear >= 1 && myYear <= 4 ? myYear : null); }, [myYear]);

  const def = system ? SYSTEMS.find((s) => s.id === system) : undefined;
  useEffect(() => {
    updateMetaTags({
      title: def ? `${def.label} — anatomy, histology, physiology, pathology & drugs together | Ompath Study` : "Study map — every system, every discipline, connected | Ompath Study",
      description: def ? `${def.blurb}: notes, library files, outline topics and question banks for ${def.label.toLowerCase()} across anatomy, embryology, histology, physiology, biochemistry, pathology and pharmacology.` : "Choose a body system and see its anatomy, embryology, histology, physiology, pathology and pharmacology side by side.",
    });
    window.scrollTo({ top: 0 });
  }, [def]);

  if (system && !def) return <Navigate to="/study-map" replace />;

  return (
    <div className="min-h-dvh bg-muted/20">
      <section className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary"><Network className="h-4 w-4" /> <Link to="/study-map" className="hover:underline">Study map</Link>{def ? ` · ${def.label}` : ""}</p>
          <h1 className="mt-2 font-serif text-2xl font-bold leading-tight text-foreground sm:text-4xl">{def ? `${def.emoji} ${def.label}, from every angle` : "Learn it all together"}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{def ? `${def.blurb}. Work down the path: structure, development, microscopic anatomy, function, chemistry, disease and drugs.` : "Anatomy without histology and embryology is half a picture. Pick a body system to see all of its notes, slides, topics and question banks side by side."}</p>
          <YearFilter year={year} setYear={setYear} />
        </div>
      </section>
      <div className="mx-auto max-w-5xl px-5 py-8">
        {g === undefined && <div className="grid gap-3 sm:grid-cols-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>}
        {g === null && <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">The study map could not be built. Check your connection and refresh.</p>}
        {g && !def && <SystemGrid g={g} year={year} />}
        {g && def && <SystemHub g={g} system={def.id} year={year} />}
      </div>
    </div>
  );
}

function SystemGrid({ g, year }: { g: Graph; year: number | null }) {
  const counts = useMemo(() => systemCounts(g, year), [g, year]);
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {counts.map(({ system, total, disciplines }) => (
        <Link key={system.id} to={`/study-map/${system.id}`} className="group flex min-w-0 flex-col rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[var(--shadow-elevated)]">
          <span className="text-3xl" aria-hidden="true">{system.emoji}</span>
          <span className="mt-2 font-serif text-lg font-bold text-foreground">{system.label}</span>
          <span className="mt-0.5 text-xs text-muted-foreground">{system.blurb}</span>
          <span className="mt-3 flex items-center justify-between text-[11px] font-bold text-primary"><span>{total} items · {disciplines} disciplines</span><ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
        </Link>
      ))}
    </div>
  );
}

function SystemHub({ g, system, year }: { g: Graph; system: SystemId; year: number | null }) {
  const groups = useMemo(() => bySystem(g, system, year), [g, system, year]);
  const key = `ompath_path_${system}`;
  const [covered, setCovered] = useState<Set<string>>(new Set());
  const [more, setMore] = useState<Set<string>>(new Set());
  useEffect(() => { try { setCovered(new Set(JSON.parse(localStorage.getItem(key) ?? "[]"))); } catch { setCovered(new Set()); } }, [key]);
  const toggle = (id: string) => setCovered((c) => { const n = new Set(c); if (n.has(id)) n.delete(id); else n.add(id); try { localStorage.setItem(key, JSON.stringify([...n])); } catch { /* storage blocked */ } return n; });
  const done = groups.filter((x) => covered.has(x.discipline.id)).length;
  const def = systemById(system);

  if (!groups.length) return <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">Nothing for {def.label.toLowerCase()} {year ? `in Year ${year} ` : ""}yet. Try “All years”.</p>;
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between text-xs font-bold"><span className="text-foreground">Your path through {def.label.toLowerCase()}</span><span className="text-primary">{done}/{groups.length} covered</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(done / groups.length) * 100}%` }} /></div>
        <ol className="mt-3 flex flex-wrap gap-1.5">{groups.map((x, i) => <li key={x.discipline.id}><a href={`#lens-${x.discipline.id}`} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${covered.has(x.discipline.id) ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"}`}>{i + 1}. {x.discipline.label}</a></li>)}</ol>
      </div>

      {groups.map(({ discipline, items }) => {
        const shown = more.has(discipline.id) ? items : items.slice(0, 8);
        return (
          <section key={discipline.id} id={`lens-${discipline.id}`} className="scroll-mt-24 rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-serif text-xl font-bold text-foreground">{discipline.label} <span className="text-sm font-semibold text-muted-foreground">{items.length}</span></h2>
                <p className="text-xs text-muted-foreground">{discipline.question}</p>
              </div>
              <button type="button" onClick={() => toggle(discipline.id)} aria-pressed={covered.has(discipline.id)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${covered.has(discipline.id) ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"}`}>{covered.has(discipline.id) ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />} Covered</button>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-x-4 sm:grid-cols-2">{shown.map((n) => <NodeRow key={n.id} n={n} />)}</div>
            {items.length > 8 && <button type="button" onClick={() => setMore((m) => { const n = new Set(m); if (n.has(discipline.id)) n.delete(discipline.id); else n.add(discipline.id); return n; })} className="mt-2 text-xs font-bold text-primary hover:underline">{more.has(discipline.id) ? "Show fewer" : `Show all ${items.length}`}</button>}
          </section>
        );
      })}
    </div>
  );
}
