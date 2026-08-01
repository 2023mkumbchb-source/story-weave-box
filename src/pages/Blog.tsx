import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, Link, useNavigate, useLocation } from "react-router-dom";
import { Search, X, BookOpen, Clock, ArrowLeft, ChevronDown, LayoutGrid, List } from "lucide-react";
import {
  getCategoryDisplayName,
  getYearFromCategory,
  getPublishedArticleSummaries,
  searchPublishedArticles,
  buildBlogPath,
  type Article,
} from "@/lib/store";
import NoteRow from "@/components/NoteRow";
import NoteCard from "@/components/NoteCard";
import UnitTile from "@/components/UnitTile";
import { getRecentArticles, type RecentArticle } from "@/lib/progress-store";
import { updateMetaTags } from "@/lib/seo";
import { getAllCategories } from "@/lib/store";
import { getYear3Semester, OTHER_UNITS_LABEL, semesterGroupSortKey } from "@/lib/year3Semesters";

const YEARS = ["All", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"];
const INITIAL_PER_GROUP = 6;
const LOAD_MORE_STEP = 12;

function normalizeYear(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed === "All") return "All";
  const match = trimmed.match(/year\s*([1-6])/i);
  return match ? `Year ${match[1]}` : null;
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getCoreUnitGroup(category: string): string {
  const unit = getCategoryDisplayName(category || "").toLowerCase();
  if (/pathology|hematopath|histopath|cytopath|oncopath|neuropath|breast|bone|respiratory system|cardiovascular system|gastrointestinal|endocrine|reproductive|urinary|genetic disorders|head & neck/.test(unit)) return "Pathology";
  if (/microbiology|bacteriology|virology|mycology|parasitology|immunology|blood transfusion/.test(unit)) return "Microbiology & Immunology";
  if (/pharmacology|drug|therapeutic/.test(unit)) return "Pharmacology";
  if (/physiology|git physiology|neurophysiology|communication skills/.test(unit)) return "Physiology";
  if (/biochemistry|chemistry|metabolism|molecular|genetics|cytogenetics/.test(unit)) return "Biochemistry & Genetics";
  if (/anatomy|histology|embryology|pelvis|perineum|dissection/.test(unit)) return "Anatomy & Embryology";
  if (/epidemiology|statistics|community|public health/.test(unit)) return "Community Health";
  if (/exam|paper|timetable|crash course|revision|spot|practical|tuesday|sunday|final/.test(unit)) return "Exam Papers & Revision";
  return getCategoryDisplayName(category || "Uncategorized") || "Other";
}

/**
 * Year 3 has a confirmed semester-by-semester course structure, so it gets grouped
 * by Semester 1/2/3 instead of the generic keyword-matched core-unit buckets (which
 * dumped almost everything into one giant "Pathology" bucket). Other years keep the
 * old grouping until their own semester breakdowns are confirmed.
 */
function getGroupLabel(year: string, category: string): string {
  if (year === "Year 3") {
    const subunit = getCategoryDisplayName(category || "");
    const sem = getYear3Semester(subunit);
    return sem ? `Semester ${sem}` : OTHER_UNITS_LABEL;
  }
  return getCoreUnitGroup(category);
}

// Every real course unit now maps to a semester (see year3Semesters.ts). Only
// non-course documents (exam timetables, admin docs) are unmapped, and they
// don't get a tab here — they still show up as their own section when
// browsing "All Semesters" (see getGroupLabel/OTHER_UNITS_LABEL).
const YEAR3_SEMESTER_OPTIONS = [
  { value: "1", label: "Semester 1" },
  { value: "2", label: "Semester 2" },
  { value: "3", label: "Semester 3" },
];

function unitMatchesSemester(unitName: string, semester: string | null): boolean {
  if (!semester) return true;
  const sem = getYear3Semester(unitName);
  return semester === "other" ? !sem : String(sem) === semester;
}

export default function Blog() {
  useEffect(() => {
    updateMetaTags({
      title: "Medical Study Notes",
      description: "Comprehensive medical study notes and articles for Kenyan health students. Organized by unit and year.",
    });
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = `${location.pathname}${location.search}`;
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => searchParams.get("q") || "");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMatches, setSearchMatches] = useState<Article[] | null>(null);
  const [recentArticles, setRecentArticles] = useState<RecentArticle[]>([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [sidebarCats, setSidebarCats] = useState<{ name: string; articles: number; flashcards: number; mcqs: number }[]>([]);

  useEffect(() => {
    getAllCategories().then(setSidebarCats).catch(() => {});
  }, []);

  const sidebarGroups = useMemo(() => {
    const groups: Record<string, { group: string; units: { category: string; name: string; count: number }[]; count: number }[]> = {};
    sidebarCats.forEach(c => {
      const y = getYearFromCategory(c.name) || "Other";
      if (!groups[y]) groups[y] = [];
      const core = getGroupLabel(y, c.name);
      let bucket = groups[y].find((g) => g.group === core);
      if (!bucket) {
        bucket = { group: core, units: [], count: 0 };
        groups[y].push(bucket);
      }
      const count = c.articles + c.mcqs + c.flashcards;
      bucket.units.push({ category: c.name, name: getCategoryDisplayName(c.name), count });
      bucket.count += count;
    });
    Object.entries(groups).forEach(([y, list]) => {
      if (y === "Year 3") {
        list.sort((a, b) => semesterGroupSortKey(a.group) - semesterGroupSortKey(b.group));
      } else {
        list.sort((a, b) => b.count - a.count || a.group.localeCompare(b.group));
      }
      list.forEach((g) => g.units.sort((a, b) => a.name.localeCompare(b.name)));
    });
    return groups;
  }, [sidebarCats]);

  const selectedYear =
    normalizeYear(searchParams.get("year")) ||
    normalizeYear(sessionStorage.getItem("nav_year_filter")) ||
    "All";

  const selectedUnit = searchParams.get("unit");
  const selectedSemester = selectedYear === "Year 3" ? searchParams.get("sem") : null;

  // Scroll the results into view when the user changes year/unit filters
  // (categorized clicks used to leave the page scrolled wherever it was,
  // or get reset to y=0 by ScrollToTop, forcing a manual scroll to find results).
  const resultsAnchorRef = useRef<HTMLDivElement>(null);
  const isFirstFilterRender = useRef(true);
  useEffect(() => {
    if (isFirstFilterRender.current) {
      isFirstFilterRender.current = false;
      return;
    }
    const id = window.setTimeout(() => {
      resultsAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 260);
    return () => window.clearTimeout(id);
  }, [selectedYear, selectedUnit, selectedSemester]);

  useEffect(() => {
    const qpYear = normalizeYear(searchParams.get("year"));
    const savedYear = normalizeYear(sessionStorage.getItem("nav_year_filter"));
    if (!qpYear && savedYear && savedYear !== "All") {
      setSearchParams({ year: savedYear }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getPublishedArticleSummaries(selectedYear === "All" ? undefined : selectedYear)
      .then((data) => {
        if (mounted) setArticles(data);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    setRecentArticles(getRecentArticles());
    setVisibleCount(20);
    setExpandedGroups(new Set());
    return () => { mounted = false; };
  }, [selectedYear]);

  useEffect(() => {
    const normalizedSearch = search.trim();
    if (!normalizedSearch) {
      setSearchMatches(null);
      return;
    }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await searchPublishedArticles(
          normalizedSearch,
          selectedYear === "All" ? undefined : selectedYear,
          undefined,
        );
        setSearchMatches(results.filter((a) => a.category !== "Stories"));
      } finally {
        setSearchLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [search, selectedYear]);

  const setYear = (year: string) => {
    sessionStorage.setItem("nav_year_filter", year);
    if (year === "All") setSearchParams({});
    else setSearchParams({ year });
  };

  const setUnit = (unit: string | null) => {
    const params: Record<string, string> = {};
    if (selectedYear !== "All") params.year = selectedYear;
    if (selectedYear === "Year 3") {
      if (unit) {
        // Always carry the unit's own semester so the semester tab stays in sync,
        // whether the unit was picked from the scoped chip row or the sidebar.
        const sem = getYear3Semester(getCategoryDisplayName(unit));
        params.sem = sem ? String(sem) : "other";
      } else if (selectedSemester) {
        params.sem = selectedSemester;
      }
    }
    if (unit) params.unit = unit;
    setSearchParams(unit || selectedYear !== "All" ? params : {});
    setVisibleCount(20);
  };

  const setSemester = (sem: string | null) => {
    const params: Record<string, string> = { year: selectedYear };
    if (sem) params.sem = sem;
    setSearchParams(params);
    setVisibleCount(20);
  };

  // Helper: get the latest updated/created date across a list of articles
  function latestDate(arts: Article[]): number {
    return Math.max(
      ...arts.map(a => new Date(a.updated_at || a.created_at).getTime())
    );
  }

  const filtered = useMemo(() => {
    const isSearching = search.trim().length > 0;
    const base = isSearching
      ? searchMatches || []
      : articles.filter(a => {
          if (a.category === "Stories") return false;
          const articleYear = normalizeYear(getYearFromCategory(a.category));
          const matchesYear = selectedYear === "All" || articleYear === selectedYear;
          const matchesUnit = !selectedUnit || a.category === selectedUnit;
          const matchesSemester =
            !selectedSemester ||
            unitMatchesSemester(getCategoryDisplayName(a.category || ""), selectedSemester);
          return matchesYear && matchesUnit && matchesSemester;
        });

    // Sort by most recently updated/created
    const sorted = [...base].sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at).getTime() -
        new Date(a.updated_at || a.created_at).getTime()
    );

    // Deduplicate by article id
    const seen = new Set<string>();
    return sorted.filter(a => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
  }, [articles, search, searchMatches, selectedYear, selectedUnit, selectedSemester]);

  // Per-year totals for the "choose your year" landing step, shown when no
  // year has been picked yet (fresh arrival from "Start Studying").
  const yearTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    if (selectedYear !== "All") return totals;
    articles.forEach(a => {
      if (a.category === "Stories") return;
      const y = normalizeYear(getYearFromCategory(a.category));
      if (y && y !== "All") totals[y] = (totals[y] || 0) + 1;
    });
    return totals;
  }, [articles, selectedYear]);

  const showYearPicker = selectedYear === "All" && !search.trim();

  const filteredRecentArticles = useMemo(() => {
    if (selectedYear === "All") return recentArticles;
    const byId = new Map(articles.map(a => [a.id, a]));
    return recentArticles.filter(r => {
      const a = byId.get(r.id);
      return a && normalizeYear(getYearFromCategory(a.category)) === selectedYear;
    });
  }, [articles, recentArticles, selectedYear]);

  // Unit chips — sorted by most recently updated, matching group order
  const unitsForYear = useMemo(() => {
    if (selectedYear === "All") return [];
    const units = new Map<string, Article[]>();
    articles.forEach(a => {
      if (getYearFromCategory(a.category) === selectedYear) {
        if (!units.has(a.category)) units.set(a.category, []);
        units.get(a.category)!.push(a);
      }
    });
    return Array.from(units.entries())
      .map(([cat, arts]) => ({
        category: cat,
        name: getCategoryDisplayName(cat),
        count: arts.length,
        latest: latestDate(arts),
      }))
      .sort((a, b) => b.latest - a.latest);
  }, [articles, selectedYear]);

  // Units scoped to the currently selected semester (Year 3 only) — this is what
  // actually drives the drill-down: pick a semester first, then only its units show up.
  const unitsForSelection = useMemo(() => {
    if (selectedYear !== "Year 3" || !selectedSemester) return unitsForYear;
    return unitsForYear.filter(u => unitMatchesSemester(u.name, selectedSemester));
  }, [unitsForYear, selectedYear, selectedSemester]);

  // Article counts per semester, for the semester tab row.
  const year3SemesterCounts = useMemo(() => {
    const counts: Record<string, number> = { "1": 0, "2": 0, "3": 0, other: 0 };
    if (selectedYear !== "Year 3") return counts;
    unitsForYear.forEach(u => {
      const sem = getYear3Semester(u.name);
      counts[sem ? String(sem) : "other"] += u.count;
    });
    return counts;
  }, [unitsForYear, selectedYear]);

  const groupedArticles = useMemo(() => {
    if (selectedUnit || search.trim()) return null;
    const groupBySpecificUnit = selectedYear === "Year 3" && Boolean(selectedSemester);
    const groups = new Map<string, Article[]>();
    filtered.forEach(a => {
      const articleYear = normalizeYear(getYearFromCategory(a.category));
      if (selectedYear !== "All" && articleYear !== selectedYear) return;
      const key = groupBySpecificUnit
        ? getCategoryDisplayName(a.category || "Uncategorized") || "Other"
        : getGroupLabel(selectedYear, a.category || "Uncategorized");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(a);
    });
    const entries = Array.from(groups.entries())
      .filter(([, arts]) => arts.length > 0)
      .map(([cat, arts]) => ({ category: cat, name: cat, articles: arts }));
    if (groupBySpecificUnit) {
      return entries.sort((a, b) => b.articles.length - a.articles.length || a.name.localeCompare(b.name));
    }
    if (selectedYear === "Year 3") {
      return entries.sort((a, b) => semesterGroupSortKey(a.category) - semesterGroupSortKey(b.category));
    }
    return entries.sort((a, b) => latestDate(b.articles) - latestDate(a.articles));
  }, [filtered, selectedUnit, search, selectedYear, selectedSemester]);

  const toggleGroup = (category: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const yearRoute = selectedYear.match(/^Year\s([1-5])$/)?.[1];

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-7">
          <div className="h-9 w-48 animate-pulse rounded-lg bg-muted" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-muted" />
        </div>
        <div className="mb-5 h-12 animate-pulse rounded-xl bg-muted" />
        <div className="mb-5 flex gap-1">
          {[1,2,3,4,5].map(i => <div key={i} className="h-8 w-16 animate-pulse rounded-lg bg-muted" />)}
        </div>
        <div className="space-y-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="flex gap-4 rounded-xl border border-border bg-card p-4">
              <div className="h-5 w-5 animate-pulse rounded bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[260px,1fr]">
        {/* Desktop-only sidebar (Jaypee-style specialty index) */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-2xl border border-border bg-card p-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Browse</p>
            <button
              onClick={() => { setYear("All"); setUnit(null); }}
              className={`mb-3 block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${selectedYear === "All" ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"}`}
            >
              All Years
            </button>
            {["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"].map(y => {
              const coreGroups = sidebarGroups[y] || [];
              if (coreGroups.length === 0) return null;
              const isOpen = selectedYear === y;
              return (
                <div key={y} className="mb-2">
                  <button
                    onClick={() => setYear(isOpen ? "All" : y)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${isOpen ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"}`}
                  >
                    <span>{y}</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <ul className="mt-1 space-y-0.5 border-l border-border pl-3">
                      {coreGroups.map(group => (
                        <li key={group.group} className="py-1">
                          <div className="mb-1 flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-wider text-foreground/70">
                            <span className="truncate">{group.group}</span>
                            <span>{group.count}</span>
                          </div>
                          <div className="space-y-0.5 pl-2">
                            {group.units.map(u => (
                              <button
                                key={u.category}
                                onClick={() => setUnit(selectedUnit === u.category ? null : u.category)}
                                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors ${selectedUnit === u.category ? "bg-primary/15 text-primary font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                              >
                                <span className="truncate">{u.name}</span>
                                <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">{u.count}</span>
                              </button>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        <div className="min-w-0">
      {/* Page header — dark editorial band with the search inside it, the way
          AMBOSS/TeachMeAnatomy anchor their library pages. */}
      <div className="band-ink mb-6 rounded-2xl px-5 py-6 sm:px-7 sm:py-8">
        {yearRoute && (
          <button
            onClick={() => navigate(`/year/${yearRoute}`)}
            className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-white/60 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Year {yearRoute}
          </button>
        )}
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
          {selectedYear === "All" ? "MBChB curriculum" : selectedYear}
        </p>
        <h1 className="mt-1.5 font-serif text-3xl font-bold leading-tight sm:text-4xl">Study Notes</h1>
        <p className="mt-1.5 max-w-xl text-sm text-white/70">
          High-yield notes, CATs and past papers, organised by year, semester and unit.
        </p>
        <div className={`mt-5 flex items-center overflow-hidden rounded-xl bg-white ${searchFocused ? "ring-2 ring-white/40" : ""}`}>
          <Search className="ml-3 h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search notes by title or content…"
            className="w-full bg-transparent px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="mr-3 text-muted-foreground hover:text-foreground" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {search.trim() && (
          <p className="mt-2 text-xs text-white/65">
            {searchLoading ? "Searching…" : filtered.length === 0 ? `No results for "${search}"` : `${filtered.length} matching articles`}
          </p>
        )}
      </div>

      {showYearPicker ? (
        /* Step 1: choose a year. This is the dedicated first screen "Start Studying"
           lands on — no search bar clutter, no tabs, just the one decision. */
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"].map(y => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className="rounded-2xl border border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-card-hover)]"
            >
              <span className="font-serif text-xl font-bold text-foreground sm:text-2xl">{y}</span>
              <p className="mt-1 text-xs text-muted-foreground">{yearTotals[y] ?? 0} notes</p>
            </button>
          ))}
        </div>
      ) : (
      <>
      {/* Continue reading */}
      {!search.trim() && selectedYear !== "All" && !selectedUnit && filteredRecentArticles.length > 0 && (
        <div className="mb-7 rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Continue Reading</h2>
          </div>
          <div className="space-y-1">
            {filteredRecentArticles.slice(0, 3).map(ra => (
              <Link
                key={ra.id}
                to={buildBlogPath(ra)}
                state={{ from: fromPath }}
                className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/40"
              >
                <BookOpen className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">{ra.title}</span>
                <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{timeAgo(ra.visitedAt)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Year tabs */}
      <div ref={resultsAnchorRef} className="mb-5 flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: "none" }}>
        {YEARS.map(year => (
          <button
            key={year}
            onClick={() => setYear(year)}
            className={`shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all ${
              selectedYear === year
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Semester step — Year 3 only. Before a semester is picked, this is a full
          step of its own (big cards, matching the Year picker) so it reads as a
          deliberate decision rather than another row of tabs. Once picked, it
          collapses to a compact switcher so browsing doesn't lose the space. */}
      {selectedYear === "Year 3" && !search.trim() && !selectedSemester && !selectedUnit && (
        <div className="mb-6">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Step 2 — Choose a semester</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {YEAR3_SEMESTER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSemester(opt.value)}
                className="rounded-2xl border border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-card-hover)]"
              >
                <span className="font-serif text-lg font-bold text-foreground sm:text-xl">{opt.label}</span>
                <p className="mt-1 text-xs text-muted-foreground">{year3SemesterCounts[opt.value] ?? 0} notes</p>
              </button>
            ))}
          </div>
          <button
            onClick={() => setSemester(null)}
            className="mt-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
          >
            Or browse all of Year 3 mixed together →
          </button>
        </div>
      )}

      {/* Compact semester switcher, shown once a semester (or unit) is already picked. */}
      {selectedYear === "Year 3" && !search.trim() && (selectedSemester || selectedUnit) && (
        <div className="mb-4">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Semester</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSemester(null)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                !selectedSemester
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              All Semesters
            </button>
            {YEAR3_SEMESTER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSemester(selectedSemester === opt.value ? null : opt.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  selectedSemester === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {opt.label} ({year3SemesterCounts[opt.value] ?? 0})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Breadcrumb once drilled into a semester and/or unit */}
      {selectedYear === "Year 3" && (selectedSemester || selectedUnit) && !search.trim() && (
        <div className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <button onClick={() => setSemester(null)} className="hover:text-foreground hover:underline">Year 3</button>
          {selectedSemester && (
            <>
              <span>›</span>
              <button
                onClick={() => setUnit(null)}
                className={selectedUnit ? "hover:text-foreground hover:underline" : "font-semibold text-foreground"}
              >
                {YEAR3_SEMESTER_OPTIONS.find(o => o.value === selectedSemester)?.label ?? selectedSemester}
              </button>
            </>
          )}
          {selectedUnit && (
            <>
              <span>›</span>
              <span className="font-semibold text-foreground">{getCategoryDisplayName(selectedUnit)}</span>
            </>
          )}
        </div>
      )}

      {/* Units. With no unit picked these render as colour-blocked tiles (Geeky
          Medics resource-grid pattern) so a 30-unit semester reads as a visual
          index; once a unit is open they collapse into a compact switcher row. */}
      {selectedYear !== "All" && unitsForSelection.length > 0 && (selectedYear !== "Year 3" || selectedSemester || selectedUnit) && (
        selectedUnit ? (
          <div className="mb-6 flex flex-wrap gap-1.5">
            <button
              onClick={() => setUnit(null)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              ← All units
            </button>
            {unitsForSelection.map(u => {
              const key = getSubjectKey(u.name);
              const active = selectedUnit === u.category;
              return (
                <button
                  key={u.category}
                  onClick={() => setUnit(active ? null : u.category)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                  style={
                    active
                      ? { backgroundColor: subjectColor(key), color: "white" }
                      : { backgroundColor: subjectColor(key, 0.12), color: subjectColor(key) }
                  }
                >
                  {u.name} ({u.count})
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mb-8">
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Choose a unit · {unitsForSelection.length} available
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {unitsForSelection.map(u => (
                <UnitTile key={u.category} title={u.name} count={u.count} onClick={() => setUnit(u.category)} />
              ))}
            </div>
          </div>
        )
      )}

      {/* Articles */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">No articles found</p>
        </div>
      ) : groupedArticles && !search.trim() ? (
        <div className="space-y-8">
          {groupedArticles.map(group => {
            const isExpanded = expandedGroups.has(group.category);
            const showCount = isExpanded ? group.articles.length : INITIAL_PER_GROUP;
            const hasMore = group.articles.length > INITIAL_PER_GROUP;
            return (
              <div key={group.category}>
                <div className="mb-3 flex items-center gap-3">
                  <span
                    className="h-5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: subjectColor(getSubjectKey(group.name)) }}
                    aria-hidden
                  />
                  <h2 className="font-serif text-lg font-bold text-foreground sm:text-2xl">{group.name}</h2>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {group.articles.length}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  {group.articles.slice(0, showCount).map((a, i) => (
                    <NoteRow key={a.id} article={a} index={i} />
                  ))}
                </div>
                {hasMore && (
                  <button
                    onClick={() => toggleGroup(group.category)}
                    className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                  >
                    {isExpanded ? (
                      <>Show less</>
                    ) : (
                      <>
                        Show all {group.articles.length} in {group.name}
                        <ChevronDown className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {filtered.slice(0, visibleCount).map((a, i) => (
            <NoteRow key={a.id} article={a} index={i} />
          ))}
        </div>
        {filtered.length > visibleCount && (
            <button
              onClick={() => setVisibleCount(prev => prev + LOAD_MORE_STEP)}
              className="mx-auto mt-4 flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Load more ({filtered.length - visibleCount} remaining)
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
        </>
      )}
      </>
      )}
        </div>
      </div>
    </div>
  );
}
