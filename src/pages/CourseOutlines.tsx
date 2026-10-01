import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { BadgeCheck, BookOpen, CheckCheck, ChevronDown, FileText, FolderOpen, Lock, RotateCcw, Search, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOutlineProgress } from "@/hooks/useOutlineProgress";
import { COURSE_OUTLINES, type CourseOutline, type OutlineSection } from "@/data/courseOutlines";
import DriveFileViewer, { type DriveFile } from "@/components/DriveFileViewer";
import { startDownload } from "@/lib/driveDownload";
import { updateMetaTags, SITE_URL } from "@/lib/seo";
import registry from "@/data/libraries.json";
import { outlineMeta } from "@/lib/libraryMeta";
import ShareButton from "@/components/ShareButton";
import { loadLibrary } from "@/lib/libraryData";

// Turn an outline title into a library search: first clause, no roman numerals/brackets, first three real words.
const STOP = new Set(["and","the","of","in","for","to","a","an","i","ii","iii","iv","vs","thread","introduction","overview","principles","disorders","drugs","agents","used"]);
const queryWords = (title: string) =>
  title.split(/ — | – |:/)[0].replace(/\([^)]*\)/g, " ").split(/[^A-Za-z0-9-]+/).filter((w) => w.length > 2 && !STOP.has(w.toLowerCase()));

/** Best library search for a topic that actually has files: two words first, then the most specific single word. */
function findNotes(title: string, names: string[]): { q: string; n: number } | null {
  if (/^(CAT|Weeks?)(\s|$)/.test(title) || names.length === 0) return null;
  const words = queryWords(title);
  const tries = [words.slice(0, 2).join(" "), ...words.slice(0, 2).sort((a, b) => b.length - a.length)].filter(Boolean);
  for (const q of tries) {
    const parts = q.toLowerCase().split(" ");
    const n = names.reduce((k, nm) => (parts.every((p) => nm.includes(p)) ? k + 1 : k), 0);
    if (n > 0) return { q, n };
  }
  return null;
}

const pct = (done: number, total: number) => (total ? Math.round((done / total) * 100) : 0);

function Bar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-muted ${className}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${value}%` }} />
    </div>
  );
}

/** /course-outlines/psychiatry … — each department has its own address so it can be shared with its own preview. */
export default function CourseOutlinesRoute() {
  const { dept } = useParams();
  const [params] = useSearchParams();
  const legacy = params.get("d");
  if (!dept && legacy && COURSE_OUTLINES.some((o) => o.id === legacy)) return <Navigate to={`/course-outlines/${legacy}`} replace />;
  return <CourseOutlines deptId={dept ?? COURSE_OUTLINES[0].id} />;
}

function CourseOutlines({ deptId }: { deptId: string }) {
  const { user, loading } = useAuth();
  const outline: CourseOutline = COURSE_OUTLINES.find((o) => o.id === deptId) ?? COURSE_OUTLINES[0];
  const reg = registry.outlines.find((o) => o.slug === outline.id);
  const meta = reg ? outlineMeta(registry, reg) : null;
  const { done, toggle, setMany } = useOutlineProgress(user?.id ?? null);
  const [remainingOnly, setRemainingOnly] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<number | null>(null);
  const [names, setNames] = useState<string[]>([]);
  const signedIn = Boolean(user);

  useEffect(() => {
    if (!meta) return;
    updateMetaTags({
      title: meta.title,
      description: meta.description,
      image: `${SITE_URL}${meta.ogImage}`,
      url: `${SITE_URL}${meta.path}`,
      type: "website",
    });
  }, [meta?.path]);

  // File names from the Year 4 library, so each topic only offers "Find notes" when matching files exist.
  useEffect(() => {
    let cancelled = false;
    loadLibrary("year4-library.json")
      .then((lib) => {
        if (cancelled || !lib) return;
        const out: string[] = [];
        const walk = (nodes: { f?: [string, string, string][]; d?: unknown[] }[]) => nodes.forEach((n) => { n.f?.forEach((f) => out.push(f[1].toLowerCase())); if (n.d) walk(n.d as never); });
        walk(lib.d);
        setNames(out);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  // Open the first section that still has work left whenever the department (or saved progress) changes.
  useEffect(() => {
    const first = outline.sections.find((s) => s.items.some((i) => !done.has(i.id))) ?? outline.sections[0];
    setOpen(new Set(first ? [first.id] : []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outline.id, signedIn]);

  const all = useMemo(() => outline.sections.flatMap((s) => s.items.map((i) => ({ ...i, section: s }))), [outline]);
  const doneCount = all.filter((i) => done.has(i.id)).length;
  const next = all.find((i) => !done.has(i.id));
  const docs: DriveFile[] = (outline.documents ?? []).map((d) => [d.fileId, d.name, "pdf"]);
  const libraryHref = outline.librarySlugs ? `/library/year-4/${outline.librarySlugs.join("/")}` : undefined;

  const toggleOpen = (id: string) => setOpen((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="min-h-dvh bg-muted/20">
      <section className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Year 4 · MBChB</p>
              <h1 className="mt-2 font-serif text-3xl font-bold text-foreground sm:text-4xl">{outline.department} course outline &amp; progress tracker</h1>
            </div>
            {meta && <ShareButton url={`${SITE_URL}${meta.path}`} title={meta.title} text={meta.shareText} />}
          </div>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-bold text-primary"><BadgeCheck className="h-3.5 w-3.5" /> {registry.credit}</p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Every week and topic from your department outlines. Tick each one when you have covered it, and use the unticked list to plan revision.
          </p>
          <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Department">
            {COURSE_OUTLINES.map((o) => {
              const total = o.sections.reduce((n, s) => n + s.items.length, 0);
              const d = o.sections.reduce((n, s) => n + s.items.filter((i) => done.has(i.id)).length, 0);
              const active = o.id === outline.id;
              return (
                <Link
                  key={o.id}
                  role="tab"
                  aria-selected={active}
                  to={`/course-outlines/${o.id}`}
                  className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/50"}`}
                >
                  {o.department} <span className={`ml-1 text-xs ${active ? "opacity-80" : "text-muted-foreground"}`}>{signedIn ? `${pct(d, total)}%` : total}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-5 px-5 py-8">
        {!signedIn && !loading && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <p className="flex items-center gap-2 text-sm text-foreground"><Lock className="h-4 w-4 text-primary" /> Sign in to tick topics off — your progress is saved to your account.</p>
            <Link to="/login" className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90">Sign in</Link>
          </div>
        )}

        <article className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-serif text-xl font-bold text-foreground">{outline.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{outline.summary}</p>
          {outline.team && <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><span className="font-bold text-foreground">Teaching team:</span> {outline.team}</p>}
          {outline.assessment && <p className="mt-1 text-xs leading-relaxed text-muted-foreground"><span className="font-bold text-foreground">Assessment:</span> {outline.assessment}</p>}

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
              <span className="text-foreground">{signedIn ? `${doneCount} of ${all.length} topics done` : `${all.length} topics`}</span>
              <span className="text-primary">{signedIn ? `${pct(doneCount, all.length)}%` : ""}</span>
            </div>
            <Bar value={signedIn ? pct(doneCount, all.length) : 0} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {libraryHref && (
              <Link to={libraryHref} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:border-primary/50 hover:text-primary">
                <FolderOpen className="h-3.5 w-3.5" /> Notes &amp; files for this department
              </Link>
            )}
            {(outline.documents ?? []).map((d, i) => (
              <button key={d.fileId} onClick={() => setViewing(i)} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:border-primary/50 hover:text-primary">
                <FileText className="h-3.5 w-3.5" /> {d.label}
              </button>
            ))}
          </div>
        </article>

        {signedIn && next && (
          <button
            type="button"
            onClick={() => { setOpen((cur) => new Set(cur).add(next.section.id)); document.getElementById(next.id)?.scrollIntoView({ behavior: "smooth", block: "center" }); }}
            className="flex w-full items-start gap-3 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"
          >
            <Target className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <span className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-primary">Next up</span>
              <span className="block text-sm font-bold text-foreground">{next.title}</span>
              <span className="block text-xs text-muted-foreground">{next.section.title}{next.week ? ` · ${next.week}` : ""}</span>
            </span>
          </button>
        )}

        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold text-foreground">Weekly scope</h2>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-muted-foreground">
            <input type="checkbox" checked={remainingOnly} onChange={(e) => setRemainingOnly(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" disabled={!signedIn} />
            Show only what is left
          </label>
        </div>

        <div className="space-y-3">
          {outline.sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              done={done}
              signedIn={signedIn}
              names={names}
              open={open.has(section.id)}
              remainingOnly={remainingOnly && signedIn}
              onOpen={() => toggleOpen(section.id)}
              onToggle={toggle}
              onMany={setMany}
            />
          ))}
        </div>

        <p className="flex items-start gap-2 pb-6 text-xs leading-relaxed text-muted-foreground">
          <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Based on the department course outlines. Ticks are saved for your account in this browser — if you switch devices or clear browser data, they will not follow you yet.
        </p>
      </div>

      <DriveFileViewer items={docs} index={viewing} onIndexChange={setViewing} onDownload={(f) => startDownload(f[0], f[1])} />
    </div>
  );
}

interface CardProps {
  section: OutlineSection;
  done: Set<string>;
  signedIn: boolean;
  names: string[];
  open: boolean;
  remainingOnly: boolean;
  onOpen: () => void;
  onToggle: (id: string) => void;
  onMany: (ids: string[], value: boolean) => void;
}

function SectionCard({ section, done, signedIn, names, open, remainingOnly, onOpen, onToggle, onMany }: CardProps) {
  const ids = section.items.map((i) => i.id);
  const doneN = ids.filter((id) => done.has(id)).length;
  const complete = signedIn && doneN === ids.length && ids.length > 0;
  const items = remainingOnly ? section.items.filter((i) => !done.has(i.id)) : section.items;
  if (remainingOnly && items.length === 0) return null;

  return (
    <section className={`overflow-hidden rounded-2xl border bg-card ${complete ? "border-primary/40" : "border-border"}`}>
      <button type="button" onClick={onOpen} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/40">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${complete ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
          {complete ? <CheckCheck className="h-4 w-4" /> : signedIn ? `${pct(doneN, ids.length)}` : ids.length}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-foreground">{section.title}</span>
          <span className="block text-[11px] text-muted-foreground">{signedIn ? `${doneN} of ${ids.length} done` : `${ids.length} topics`}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {signedIn && <Bar value={pct(doneN, ids.length)} className="mx-4 mb-3 h-1.5" />}

      {open && (
        <div className="border-t border-border">
          {section.note && <p className="bg-muted/30 px-4 py-2.5 text-xs leading-relaxed text-muted-foreground">{section.note}</p>}
          {signedIn && (
            <div className="flex gap-2 px-4 pt-3">
              <button onClick={() => onMany(ids, true)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] font-bold hover:border-primary/50 hover:text-primary"><CheckCheck className="h-3 w-3" /> Mark all done</button>
              <button onClick={() => onMany(ids, false)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] font-bold hover:border-primary/50 hover:text-primary"><RotateCcw className="h-3 w-3" /> Clear</button>
            </div>
          )}
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const isDone = done.has(item.id);
              return (
                <li key={item.id} id={item.id}>
                  <label className={`flex items-start gap-3 px-4 py-3 ${signedIn ? "cursor-pointer hover:bg-primary/5" : "cursor-not-allowed opacity-80"}`}>
                    <input
                      type="checkbox"
                      checked={isDone}
                      disabled={!signedIn}
                      onChange={() => onToggle(item.id)}
                      className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                      aria-label={`Mark "${item.title}" as done`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        {item.week && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">{item.week}</span>}
                        <span className={`text-sm font-semibold ${isDone ? "text-muted-foreground line-through decoration-primary/50" : "text-foreground"}`}>{item.title}</span>
                      </span>
                      {item.detail && <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{item.detail}</span>}
                      {item.lecturer && <span className="mt-0.5 block text-[11px] font-semibold text-muted-foreground">{item.lecturer}</span>}
                      {(() => {
                        const hit = findNotes(item.title, names);
                        return hit ? (
                          <Link to={`/library/year-4?q=${encodeURIComponent(hit.q)}`} onClick={(e) => e.stopPropagation()} className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"><Search className="h-3 w-3" /> Find notes ({hit.n})</Link>
                        ) : null;
                      })()}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
