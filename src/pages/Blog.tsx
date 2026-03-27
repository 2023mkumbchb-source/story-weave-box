import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link, useNavigate, useLocation } from "react-router-dom";
import { Search, X, Loader2, BookOpen, Clock, ArrowRight, ArrowLeft, ChevronDown } from "lucide-react";
import { Helmet } from "react-helmet-async";
import {
  getCategoryDisplayName,
  getYearFromCategory,
  getYearNumber,
  getPublishedArticleSummaries,
  searchPublishedArticles,
  buildBlogPath,
  type Article,
} from "@/lib/store";
import ArticleCard from "@/components/ArticleCard";
import { getRecentArticles, type RecentArticle } from "@/lib/progress-store";

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

export default function Blog() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = `${location.pathname}${location.search}`;
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMatches, setSearchMatches] = useState<Article[] | null>(null);
  const [recentArticles, setRecentArticles] = useState<RecentArticle[]>([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const selectedYear =
    normalizeYear(searchParams.get("year")) ||
    normalizeYear(sessionStorage.getItem("nav_year_filter")) ||
    "All";

  const selectedUnit = searchParams.get("unit");
  const ogUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${location.pathname}${location.search}`
      : location.pathname;
  const title = "Study Notes | OmpathStudy Kenya Medical Education";
  const description =
    "Browse structured medical study notes for Kenyan medical and health students. Filter by year and unit, search topics, and study smarter with OmpathStudy.";
  const keywords =
    "OmpathStudy, study notes Kenya, medical notes, clinical notes, nursing notes, year 1, year 2, year 3, year 4, year 5, year 6, medical education Kenya";

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
    if (unit) setSearchParams({ year: selectedYear, unit });
    else if (selectedYear !== "All") setSearchParams({ year: selectedYear });
    else setSearchParams({});
    setVisibleCount(20);
  };

  const unitsForYear = useMemo(() => {
    if (selectedYear === "All") return [];
    const units = new Map<string, number>();
    articles.forEach(a => {
      if (getYearFromCategory(a.category) === selectedYear) {
        units.set(a.category, (units.get(a.category) || 0) + 1);
      }
    });
    return Array.from(units.entries())
      .map(([cat, count]) => ({ category: cat, name: getCategoryDisplayName(cat), count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [articles, selectedYear]);

  const filtered = useMemo(() => {
    const isSearching = search.trim().length > 0;
    const base = isSearching
      ? searchMatches || []
      : articles.filter(a => {
          if (a.category === "Stories") return false;
          const articleYear = normalizeYear(getYearFromCategory(a.category));
          const matchesYear = selectedYear === "All" || articleYear === selectedYear;
          const matchesUnit = !selectedUnit || a.category === selectedUnit;
          return matchesYear && matchesUnit;
        });
    return [...base].sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
  }, [articles, search, searchMatches, selectedYear, selectedUnit]);

  const filteredRecentArticles = useMemo(() => {
    if (selectedYear === "All") return recentArticles;
    const byId = new Map(articles.map(a => [a.id, a]));
    return recentArticles.filter(r => {
      const a = byId.get(r.id);
      return a && normalizeYear(getYearFromCategory(a.category)) === selectedYear;
    });
  }, [articles, recentArticles, selectedYear]);

  const groupedArticles = useMemo(() => {
    if (selectedUnit || search.trim()) return null;
    const groups = new Map<string, Article[]>();
    filtered.forEach(a => {
      const articleYear = normalizeYear(getYearFromCategory(a.category));
      if (selectedYear !== "All" && articleYear !== selectedYear) return;
      const key = a.category || "Uncategorized";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(a);
    });
    return Array.from(groups.entries())
      .filter(([, arts]) => arts.length > 0)
      .map(([cat, arts]) => ({ category: cat, name: getCategoryDisplayName(cat), articles: arts }))
      .sort((a, b) => {
        const ya = getYearNumber(a.category);
        const yb = getYearNumber(b.category);
        if (ya !== yb) return ya - yb;
        return a.name.localeCompare(b.name);
      });
  }, [filtered, selectedUnit, search, selectedYear]);

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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={ogUrl} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </Helmet>
      {/* Header */}
      <div className="mb-7">
        <h1 className="font-serif text-3xl font-bold leading-tight text-foreground sm:text-4xl">Study Notes</h1>
        <p className="mt-1 text-sm text-muted-foreground">Browse structured clinical notes by year and unit.</p>
        {yearRoute && (
          <button onClick={() => navigate(`/year/${yearRoute}`)} className="mt-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Year {yearRoute}
          </button>
        )}
      </div>

      {/* Continue reading */}
      {!search.trim() && selectedYear !== "All" && !selectedUnit && filteredRecentArticles.length > 0 && (
        <div className="mb-7 rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Continue Reading</h2>
          </div>
          <div className="space-y-1">
            {filteredRecentArticles.slice(0, 3).map(ra => (
              <Link key={ra.id} to={buildBlogPath(ra)} state={{ from: fromPath }} className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/40">
                <BookOpen className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">{ra.title}</span>
                <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{timeAgo(ra.visitedAt)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-5">
        <div className={`relative flex items-center rounded-xl border bg-card transition-all ${searchFocused ? "border-primary ring-1 ring-primary/20" : "border-border"}`}>
          <Search className="ml-3 h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Live search in title + content…"
            className="w-full bg-transparent px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="mr-3 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          )}
        </div>
        {search.trim() && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {searchLoading ? "Searching…" : filtered.length === 0 ? `No results for "${search}"` : `${filtered.length} matching articles`}
          </p>
        )}
      </div>

      {/* Year tabs */}
      <div className="mb-5 flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: "none" }}>
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

      {/* Unit chips */}
      {selectedYear !== "All" && unitsForYear.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          <button
            onClick={() => setUnit(null)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              !selectedUnit ? "border border-primary/30 bg-primary/10 text-primary" : "border border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            All Units ({filtered.length})
          </button>
          {unitsForYear.map(u => (
            <button
              key={u.category}
              onClick={() => setUnit(selectedUnit === u.category ? null : u.category)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                selectedUnit === u.category ? "border border-primary/30 bg-primary/10 text-primary" : "border border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {u.name} ({u.count})
            </button>
          ))}
        </div>
      )}

      {/* Articles */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">No articles found</p>
        </div>
      ) : groupedArticles && !search.trim() ? (
        <div className="space-y-10">
          {groupedArticles.map(group => {
            const isExpanded = expandedGroups.has(group.category);
            const showCount = isExpanded ? group.articles.length : INITIAL_PER_GROUP;
            const hasMore = group.articles.length > INITIAL_PER_GROUP;
            return (
              <div key={group.category}>
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="font-serif text-xl font-bold text-foreground sm:text-2xl">{group.name}</h2>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{group.articles.length}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-3">
                  {group.articles.slice(0, showCount).map(a => <ArticleCard key={a.id} article={a} />)}
                </div>
                {hasMore && (
                  <button
                    onClick={() => toggleGroup(group.category)}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
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
        <div className="space-y-3">
          {filtered.slice(0, visibleCount).map(a => <ArticleCard key={a.id} article={a} />)}
          {filtered.length > visibleCount && (
            <button
              onClick={() => setVisibleCount(prev => prev + LOAD_MORE_STEP)}
              className="mx-auto flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Load more ({filtered.length - visibleCount} remaining)
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
