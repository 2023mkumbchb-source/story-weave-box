import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AlertTriangle, ChevronRight, Download, FileText, Loader2, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccess } from "@/lib/access";
import { openSubscribePrompt } from "@/lib/subscribe-prompt";
import { SITE_URL } from "@/lib/seo";
import {
  RESOURCE_CATEGORIES,
  downloadResource,
  fileTypeLabel,
  formatFileSize,
  listYearResources,
  type StudyResource,
} from "@/lib/studyResources";

const YEARS = [1, 2, 3, 4, 5, 6];

export default function YearResources() {
  const { yearNumber } = useParams();
  const parsedYear = Number(yearNumber);
  const validYear = YEARS.includes(parsedYear);
  const yearLabel = `Year ${parsedYear}`;

  const [params, setParams] = useSearchParams();
  const [resources, setResources] = useState<StudyResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [query, setQuery] = useState(params.get("q") || "");
  const category = params.get("category") || "All";
  const unit = params.get("unit") || "All";
  const { canDownload } = useAccess();

  useEffect(() => {
    if (!validYear) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    setError(null);
    listYearResources(parsedYear)
      .then((list) => { if (alive) { setResources(list); setLoading(false); } })
      .catch(() => { if (alive) { setError("We could not load the resource list."); setLoading(false); } });
    return () => { alive = false; };
  }, [validYear, parsedYear]);

  const units = useMemo(
    () => Array.from(new Set(resources.map((r) => r.unit).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [resources],
  );

  const categoriesPresent = useMemo(() => {
    const present = new Set(resources.map((r) => r.category));
    return RESOURCE_CATEGORIES.filter((c) => present.has(c));
  }, [resources]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resources.filter((r) => {
      if (category !== "All" && r.category !== category) return false;
      if (unit !== "All" && r.unit !== unit) return false;
      if (!q) return true;
      const haystack = [r.title, r.unit, r.category, r.description || "", (r.keywords || []).join(" ")]
        .join(" ")
        .toLowerCase();
      return q.split(/\s+/).every((word) => haystack.includes(word));
    });
  }, [resources, category, unit, query]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (!value || value === "All") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  }

  async function handleDownload(resource: StudyResource) {
    setDownloadError(null);
    if (!canDownload) {
      openSubscribePrompt("Subscribe to download the study resources for your year.");
      return;
    }
    setBusyId(resource.id);
    try {
      await downloadResource(resource);
    } catch {
      setDownloadError(`“${resource.title}” could not be downloaded right now. Please try again.`);
    } finally {
      setBusyId(null);
    }
  }

  if (!validYear) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-16 text-center">
        <h1 className="font-serif text-2xl font-bold text-foreground">Invalid year</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please choose a valid year from the menu.</p>
      </div>
    );
  }

  const title = `${yearLabel} Study Resources | OmpathStudy`;
  const description = `Download ${yearLabel} notes, past papers, CATs, MCQs, revision and practical materials on OmpathStudy.`;

  return (
    <div className="min-h-[65vh] bg-background">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`${SITE_URL}/year/${parsedYear}/resources`} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-[12px] text-muted-foreground">
          <Link to="/" className="hover:text-primary">Home</Link>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <Link to={`/year/${parsedYear}`} className="hover:text-primary">{yearLabel}</Link>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <span className="text-foreground">Study resources</span>
        </nav>

        <header className="mt-4">
          <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {yearLabel} study resources
          </h1>
          <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-muted-foreground">
            Notes, past papers, CATs, MCQs, revision packs and practical material — downloaded straight from
            OmpathStudy.
          </p>
        </header>

        <div className="mt-6 space-y-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setParam("q", e.target.value); }}
              placeholder="Search resources by title, unit or topic"
              aria-label="Search resources"
              className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-3 text-[14.5px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25"
            />
          </label>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
            {["All", ...categoriesPresent].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setParam("category", c)}
                aria-pressed={category === c}
                className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                  category === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-primary"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {units.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="unit-filter" className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                Unit
              </label>
              <select
                id="unit-filter"
                value={unit}
                onChange={(e) => setParam("unit", e.target.value)}
                className="rounded-lg border border-border bg-card px-3 py-2 text-[13.5px] text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
              >
                <option value="All">All units</option>
                {units.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          )}
        </div>

        {downloadError && (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {downloadError}
          </p>
        )}

        <div className="mt-6">
          {loading ? (
            <div className="space-y-2" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
            </div>
          ) : error ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <p className="text-[14.5px] text-foreground">{error}</p>
              <button
                type="button"
                onClick={() => { setLoading(true); listYearResources(parsedYear).then((l) => { setResources(l); setError(null); }).catch(() => setError("We could not load the resource list.")).finally(() => setLoading(false)); }}
                className="mt-3 rounded-lg bg-primary px-4 py-2 text-[13.5px] font-semibold text-primary-foreground"
              >
                Try again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card/60 p-10 text-center">
              <FileText className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden />
              <p className="mt-3 font-serif text-[16px] font-semibold text-foreground">
                {resources.length === 0
                  ? `No ${yearLabel} downloads published yet.`
                  : "No resources match these filters yet."}
              </p>
              <p className="mt-1 text-[13.5px] text-muted-foreground">
                {resources.length === 0
                  ? "Material is added as soon as it is reviewed."
                  : "Try another category, unit or search word."}
              </p>
            </div>
          ) : (
            <>
              <p className="mb-2 text-[12.5px] text-muted-foreground">
                {filtered.length} resource{filtered.length === 1 ? "" : "s"}
              </p>
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                {filtered.map((r) => (
                  <li key={r.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-[15px] font-semibold leading-snug text-foreground sm:text-[16px]">{r.title}</h2>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-muted-foreground">
                        <span className="rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-primary">
                          {r.category}
                        </span>
                        <span>{r.unit}</span>
                        <span aria-hidden>·</span>
                        <span className="font-semibold">{fileTypeLabel(r)}</span>
                        {formatFileSize(r.file_size) && (
                          <>
                            <span aria-hidden>·</span>
                            <span>{formatFileSize(r.file_size)}</span>
                          </>
                        )}
                      </div>
                      {r.description && (
                        <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{r.description}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownload(r)}
                      disabled={busyId === r.id}
                      className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[13.5px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
                    >
                      {busyId === r.id
                        ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Preparing…</>
                        : <><Download className="h-4 w-4" aria-hidden /> Download</>}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
