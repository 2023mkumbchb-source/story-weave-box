import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  BookOpen, CalendarDays, CheckCircle2, Clock, FileQuestion, GraduationCap,
  Loader2, Search, ShieldAlert, ShieldCheck, ShieldQuestion, Target,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { answerKeyByQuestion, parseConsolidatedAnswerKey, preprocessContent } from "@/lib/blog-content";

/** Group definitions keyed by real unit_id (not text-matched), so a resource
 *  only ever lands under the unit it's actually filed against on the site. */
const GROUPS: { name: string; unitIds: string[] }[] = [
  { name: "Year 2 Microbiology", unitIds: ["1f8af21a-7f8c-4fb3-9a34-ea85e8ba1bf3"] },
  { name: "Year 2 Parasitology", unitIds: ["d546bef1-e9f6-4cb2-bed5-947080c7d61d"] },
  { name: "Bacteriology (Year 3)", unitIds: ["c2dc4045-7703-4d46-bb11-4b783d611a8d"] },
  { name: "Parasitology (Year 3)", unitIds: ["e0fcca99-842a-4463-847a-8b25227ea1c0"] },
  { name: "Medical Virology", unitIds: ["175fbea8-047d-45e7-947b-49f8fe71123a"] },
  { name: "Medical Mycology", unitIds: ["af08c148-6f00-4490-b69d-d6c0b5513840"] },
  {
    name: "General & Systemic Pathology",
    unitIds: [
      "41ee4626-7d46-48a0-b977-338bd4877e18", "5efab67a-83e0-440a-8f25-66fc94bf8f75",
      "9745e6cd-4956-4a2e-9902-a56a727149af", "86e9f86f-0076-437e-abf1-917923017ac1",
      "368e97ca-bbc6-447c-a2c6-bf186fb0f007", "41b15174-8d63-496d-a91d-29cf5a81fa27",
      "815112aa-c685-441b-b389-23c4cbb49d35", "19497219-610f-4570-a795-ae5f75770c5d",
      "bed7df38-e258-4d84-a97b-b6aca7a67d1f", "a4f9eaa1-30f1-4afa-94bc-cfb7096119b3",
      "81167a68-3bed-4ca6-bc12-8794c7ea9caf", "91ca2634-63f0-4eb9-90df-62251c015052",
      "02a2b32f-f623-429b-89d2-91d8a4658874", "fee82c4d-45c1-4dfc-a4b4-ff3f2025ea2e",
      "1537f539-5329-4496-812d-54e66aa78a18",
    ],
  },
  {
    name: "Hematology",
    unitIds: [
      "e4825137-0e6b-47f7-a44f-ee313832b389", "7fc484bd-f0a0-4729-a7f2-995a77542440",
      "c930392f-900b-41ad-a145-fbcc1a24a310",
    ],
  },
];
const ALL_UNIT_IDS = GROUPS.flatMap((g) => g.unitIds);
const GROUP_OF_UNIT = new Map(GROUPS.flatMap((g) => g.unitIds.map((id) => [id, g.name])));
const GROUP_ORDER = GROUPS.map((g) => g.name);

const QUESTION_TYPES = new Set(["MCQ Bank", "CAT", "Past Paper"]);
type Health = "self-test" | "partial" | "unmarked" | null;

function detectQuestionCount(lines: string[]): number {
  let n = 0;
  for (const raw of lines) {
    const t = raw.trim().replace(/^[*_#>\s]+/, "");
    if (/^(?:MCQ|Question|Q)\s*\d+/i.test(t) || /^\d+[.)]\s+\S/.test(t)) n++;
  }
  return n;
}

/** Mechanically checks whether a question-style article actually has a
 *  working answer key on the page — the same detector that powers the
 *  site's own MCQ "Reveal answer" feature, reused here as a trust signal. */
function checkHealth(contentType: string | null, content: string): Health {
  if (!content || !contentType || !QUESTION_TYPES.has(contentType)) return null;
  const lines = preprocessContent(content).split("\n");
  const qCount = detectQuestionCount(lines);
  if (qCount < 3) return null;
  const keys = new Map(answerKeyByQuestion(lines));
  for (const [k, v] of parseConsolidatedAnswerKey(content)) if (!keys.has(k)) keys.set(k, v);
  const coverage = keys.size / qCount;
  if (coverage >= 0.85) return "self-test";
  if (coverage >= 0.3) return "partial";
  return "unmarked";
}

type Row = {
  id: string; title: string; slug: string | null; category: string; group: string;
  kind: "Notes" | "MCQ Bank" | "CAT" | "Past Paper" | "Timed Exam" | "Flashcards";
  href: string; health: Health; chars: number;
};

const SCHEDULE: { day: number; date: string; focus: string; light?: boolean; final?: boolean }[] = [
  { day: 1, date: "13 Aug", focus: "Bacteriology + Parasitology (Year 3) — both thin here, lean on lecture notes too" },
  { day: 2, date: "14 Aug", focus: "Medical Virology I: virus structure, classification, replication; Herpesviridae" },
  { day: 3, date: "15 Aug", focus: "Virology question practice + rest — self-mark against yesterday's notes", light: true },
  { day: 4, date: "16 Aug", focus: "Medical Virology II: HIV, hepatitis, oncogenic viruses, vaccines & antivirals, influenza" },
  { day: 5, date: "17 Aug", focus: "Medical Mycology I: fungal infections, histoplasmosis, cryptococcosis" },
  { day: 6, date: "18 Aug", focus: "Mycology II + the one genuinely self-markable microbiology set" },
  { day: 7, date: "19 Aug", focus: "General Pathology: cell injury, inflammation, adaptation" },
  { day: 8, date: "20 Aug", focus: "Cardiovascular System Pathology" },
  { day: 9, date: "21 Aug", focus: "Gastrointestinal Pathology" },
  { day: 10, date: "22 Aug", focus: "General Path + GI practice questions, then rest", light: true },
  { day: 11, date: "23 Aug", focus: "Respiratory System Pathology" },
  { day: 12, date: "24 Aug", focus: "Endocrine & Metabolic Pathology" },
  { day: 13, date: "25 Aug", focus: "Genitourinary — male & female reproductive/urinary" },
  { day: 14, date: "26 Aug", focus: "Bone/soft tissue, breast, head & neck, dermatopathology" },
  { day: 15, date: "27 Aug", focus: "Neuro, onco, histopath/cytopath, immunopath" },
  { day: 16, date: "28 Aug", focus: "Hematopathology II — malignancies & white cell disorders" },
  { day: 17, date: "29 Aug", focus: "Hematology practice + rest — coverage here is partial, verify as you go", light: true },
  { day: 18, date: "30 Aug", focus: "Hematopathology III — platelets & coagulation; Hematopathology I has no notes, read its papers only" },
  { day: 19, date: "31 Aug", focus: "Final mock — one timed paper per subject using the self-test sets, then only re-skim what you've pinned. Nothing new today.", final: true },
];

const healthMeta: Record<Exclude<Health, null>, { label: string; icon: typeof ShieldCheck; className: string }> = {
  "self-test": { label: "Self-test ready", icon: ShieldCheck, className: "text-emerald-600 bg-emerald-500/10" },
  partial: { label: "Partial answers", icon: ShieldQuestion, className: "text-amber-600 bg-amber-500/10" },
  unmarked: { label: "No answer key", icon: ShieldAlert, className: "text-red-600 bg-red-500/10" },
};

export default function RevisionIndex() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("All");
  const [done, setDone] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem("revision-index-done") || "[]"); } catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem("revision-index-done", JSON.stringify(done)); } catch { /* best effort */ }
  }, [done]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const [articlesRes, mcqRes, flashRes] = await Promise.all([
          supabase.from("articles").select("id,title,slug,category,content_type,content,unit_id")
            .in("unit_id", ALL_UNIT_IDS).eq("published", true).is("deleted_at", null),
          supabase.from("mcq_sets").select("id,title,slug,category,unit_id")
            .in("unit_id", ALL_UNIT_IDS).eq("published", true).is("deleted_at", null),
          supabase.from("flashcard_sets").select("id,title,slug,category,unit_id")
            .in("unit_id", ALL_UNIT_IDS).eq("published", true).is("deleted_at", null),
        ]);
        if (!alive) return;
        if (articlesRes.error || mcqRes.error || flashRes.error) { setError(true); setLoading(false); return; }

        const next: Row[] = [];
        for (const a of articlesRes.data || []) {
          const group = a.unit_id ? GROUP_OF_UNIT.get(a.unit_id) : undefined;
          if (!group) continue;
          const kind = (QUESTION_TYPES.has(a.content_type || "") ? a.content_type : "Notes") as Row["kind"];
          next.push({
            id: a.id, title: a.title, slug: a.slug, category: a.category, group, kind,
            href: `/blog/${a.slug || a.id}`, chars: (a.content || "").length,
            health: checkHealth(a.content_type, a.content || ""),
          });
        }
        for (const m of mcqRes.data || []) {
          const group = m.unit_id ? GROUP_OF_UNIT.get(m.unit_id) : undefined;
          if (!group) continue;
          next.push({ id: m.id, title: m.title, slug: m.slug, category: m.category, group, kind: "Timed Exam", href: `/exams/${m.slug || m.id}/start`, health: "self-test", chars: 0 });
        }
        for (const f of flashRes.data || []) {
          const group = f.unit_id ? GROUP_OF_UNIT.get(f.unit_id) : undefined;
          if (!group) continue;
          next.push({ id: f.id, title: f.title, slug: f.slug, category: f.category, group, kind: "Flashcards", href: `/flashcards/${f.slug || f.id}`, health: null, chars: 0 });
        }
        next.sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || a.title.localeCompare(b.title));
        setRows(next);
        setLoading(false);
      } catch {
        if (alive) { setError(true); setLoading(false); }
      }
    })();
    return () => { alive = false; };
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((r) => (groupFilter === "All" || r.group === groupFilter) && (!needle || `${r.title} ${r.category}`.toLowerCase().includes(needle)));
  }, [rows, query, groupFilter]);

  const grouped = useMemo(
    () => GROUP_ORDER.map((g) => ({ group: g, rows: visible.filter((r) => r.group === g) })).filter((x) => x.rows.length),
    [visible],
  );

  const healthByGroup = useMemo(() => {
    const out = new Map<string, { checked: number; healthy: number }>();
    for (const g of GROUP_ORDER) {
      const withHealth = rows.filter((r) => r.group === g && r.health);
      out.set(g, { checked: withHealth.length, healthy: withHealth.filter((r) => r.health === "self-test").length });
    }
    return out;
  }, [rows]);

  const toggleDay = (day: number) => setDone((v) => (v.includes(day) ? v.filter((x) => x !== day) : [...v, day]));
  const pinned = useMemo(
    () => GROUP_ORDER.map((g) => ({
      group: g,
      notes: rows.filter((r) => r.group === g && r.kind === "Notes").sort((a, b) => b.chars - a.chars).slice(0, 2),
    })).filter((x) => x.notes.length),
    [rows],
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <Helmet>
        <title>Revision Index | Ompath Study</title>
        <meta name="description" content="Every note, MCQ bank, CAT, past paper and flashcard set for the Microbiology, Pathology and Hematology supplementary, arranged by subject and checked for working answer keys." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">Home</Link> ›{" "}
        <span className="text-foreground">Revision Index</span>
      </nav>

      <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
        <Target className="h-3.5 w-3.5" /> Microbiology · Pathology · Hematology
      </span>
      <h1 className="mt-3 font-serif text-3xl font-bold text-foreground sm:text-4xl">Revision index</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
        Every note, question bank and flashcard set on the site for these units, arranged by subject so you never have to search for them.
        Question sets are checked live for whether they actually have a working answer key.
      </p>

      {!loading && !error && (
        <section className="mt-6 grid gap-2 sm:grid-cols-4">
          {["General & Systemic Pathology", "Medical Virology", "Medical Mycology", "Hematology"].map((g) => {
            const h = healthByGroup.get(g);
            const pct = h && h.checked ? Math.round((h.healthy / h.checked) * 100) : null;
            return (
              <div key={g} className="rounded-xl border border-border bg-card p-3">
                <p className="truncate text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{g}</p>
                <p className="mt-1 text-lg font-bold text-foreground">{pct === null ? "—" : `${pct}%`}</p>
                <p className="text-[11px] text-muted-foreground">{h ? `${h.healthy}/${h.checked} self-markable` : "no question sets"}</p>
              </div>
            );
          })}
        </section>
      )}

      {loading ? (
        <div className="mt-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : error ? (
        <p className="mt-10 rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm">Could not load the live catalogue. Refresh to try again.</p>
      ) : (
        <>
          {pinned.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-3 font-serif text-xl font-bold text-foreground">Start here per subject</h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {pinned.map(({ group, notes }) => (
                  <div key={group} className="rounded-2xl border border-border bg-card p-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">{group}</p>
                    <div className="space-y-1.5">
                      {notes.map((n) => (
                        <Link key={n.id} to={n.href} className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/50">
                          <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          <span className="truncate font-medium text-foreground">{n.title}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-10">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-primary">Complete live library</p>
                <h2 className="font-serif text-xl font-bold text-foreground">All matching resources</h2>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{rows.length} resources</span>
            </div>

            <div className="mb-5 grid gap-2 sm:grid-cols-[1fr_auto]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search these units…" className="pl-9" />
              </label>
              <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="min-h-[40px] rounded-lg border border-border bg-background px-3 text-sm">
                <option>All</option>
                {GROUP_ORDER.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>

            {grouped.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nothing matches that search.</p>
            ) : (
              <div className="space-y-7">
                {grouped.map(({ group, rows: groupRows }) => (
                  <div key={group}>
                    <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
                      <h3 className="font-serif text-lg font-bold text-foreground">{group}</h3>
                      <span className="text-xs font-semibold text-muted-foreground">{groupRows.length}</span>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {groupRows.map((r) => {
                        const Icon = r.kind === "Flashcards" ? GraduationCap : r.kind === "Timed Exam" ? FileQuestion : BookOpen;
                        const meta = r.health ? healthMeta[r.health] : null;
                        return (
                          <Link key={`${r.kind}-${r.id}`} to={r.href} className="group flex items-start gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-primary/5">
                            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-foreground group-hover:text-primary">{r.title}</span>
                              <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                <span>{r.kind}</span>
                                {meta && (
                                  <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${meta.className}`}>
                                    <meta.icon className="h-2.5 w-2.5" /> {meta.label}
                                  </span>
                                )}
                              </span>
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <section className="mt-12">
        <div className="mb-4 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /><h2 className="font-serif text-xl font-bold text-foreground">19-day schedule to 1 Sept</h2></div>
        <div className="space-y-2">
          {SCHEDULE.map((s) => {
            const checked = done.includes(s.day);
            return (
              <button
                key={s.day}
                type="button"
                onClick={() => toggleDay(s.day)}
                aria-pressed={checked}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                  checked ? "border-primary/30 bg-primary/5" : s.final ? "border-foreground/30 bg-muted/30" : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                  {checked && <CheckCircle2 className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-xs font-bold text-muted-foreground">Day {s.day} · {s.date}</span>
                    {s.light && <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600">Light day</span>}
                    {s.final && <span className="text-[10px] font-bold uppercase tracking-wide text-foreground">Final day</span>}
                  </span>
                  <span className="mt-0.5 block text-sm text-foreground">{s.focus}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-foreground p-4 text-sm text-background">
          <Clock className="h-4 w-4 shrink-0" />
          <span><strong>1 Sept — exam day.</strong> Light skim of what you've pinned only. Nothing new goes in today.</span>
        </div>
      </section>
    </main>
  );
}
