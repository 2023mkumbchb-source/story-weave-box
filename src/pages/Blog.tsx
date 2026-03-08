import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Search, X, Loader2, BookOpen, Clock, ArrowRight, ArrowLeft } from "lucide-react";
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

const YEARS = ["All", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5"];

function normalizeYear(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed === "All") return "All";
  const match = trimmed.match(/year\s*([1-5])/i);
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMatches, setSearchMatches] = useState<Article[] | null>(null);
  const [recentArticles, setRecentArticles] = useState<RecentArticle[]>([]);

  const selectedYear =
    normalizeYear(searchParams.get("year")) ||
    normalizeYear(sessionStorage.getItem("nav_year_filter")) ||
    "All";

  const selectedUnit = searchParams.get("unit");

  useEffect(() => {
    const qpYear = normalizeYear(searchParams.get("year"));
    const savedYear = normalizeYear(sessionStorage.getItem("nav_year_filter"));
    if (!qpYear && savedYear && savedYear !== "All") {
      setSearchParams({ year: savedYear }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    getPublishedArticleSummaries().then(setArticles).finally(() => setLoading(false));
    setRecentArticles(getRecentArticles());
  }, []);

  useEffect(() => {
    if (!search.trim()) { setSearchMatches(null); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await searchPublishedArticles(search, selectedYear === "All" ? undefined : selectedYear, selectedUnit || undefined);
        setSearchMatches(results.filter(a => a.category !== "Stories"));
      } finally { setSearchLoading(false); }
    }, 220);
    return () => clearTimeout(t);
  }, [search, selectedYear, selectedUnit]);

  const setYear = (year: string) => {
    sessionStorage.setItem("nav_year_filter", year);
    if (year === "All") setSearchParams({});
    else setSearchParams({ year });
  };

  const setUnit = (unit: string | null) => {
    if (unit) setSearchParams({ year: selectedYear, unit });
    else if (selectedYear !== "All") setSearchParams({ year: selectedYear });
    else setSearchParams({});
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
    return [...base].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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

  const yearRoute = selectedYear.match(/^Year\s([1-5])$/)?.[1];

  if (loading) {
    return <div className="flex min-h-[65vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold text-foreground">Study Notes</h1>
        {yearRoute && (
          <button onClick={() => navigate(`/year/${yearRoute}`)} className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Year {yearRoute}
          </button>
        )}
      </div>

      {/* Continue reading */}
      {!search.trim() && selectedYear !== "All" && !selectedUnit && filteredRecentArticles.length > 0 && (
        <div className="mb-6 rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Continue Reading</h2>
          </div>
          <div className="space-y-1">
            {filteredRecentArticles.slice(0, 3).map(ra => (
              <Link key={ra.id} to={buildBlogPath(ra)} className="group flex items-center gap-3 rounded-lg py-2 px-2 -mx-2 hover:bg-muted/30 transition-colors">
                <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground group-hover:text-primary truncate transition-colors">{ra.title}</span>
                <span className="ml-auto text-[11px] text-muted-foreground shrink-0">{timeAgo(ra.visitedAt)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-5">
        <div className={`relative flex items-center rounded-lg border bg-card transition-all ${searchFocused ? "border-primary ring-1 ring-primary/20" : "border-border"}`}>
          <Search className="ml-3 h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search articles by title or content…"
            className="w-full bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="mr-3 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          )}
        </div>
        {search.trim() && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {searchLoading ? "Searching…" : filtered.length === 0 ? `No results for "${search}"` : `${filtered.length} results`}
          </p>
        )}
      </div>

      {/* Year tabs */}
      <div className="mb-5 flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
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
        <div className="mb-5 flex flex-wrap gap-1.5">
          <button
            onClick={() => setUnit(null)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              !selectedUnit ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            All Units
          </button>
          {unitsForYear.map(u => (
            <button
              key={u.category}
              onClick={() => setUnit(selectedUnit === u.category ? null : u.category)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                selectedUnit === u.category ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              {u.name} <span className="text-muted-foreground/60">({u.count})</span>
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
        <div className="space-y-8">
          {groupedArticles.map(group => (
            <div key={group.category}>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="font-serif text-base font-bold text-foreground">{group.name}</h2>
                <span className="text-xs text-muted-foreground">({group.articles.length})</span>
                <div className="flex-1 border-b border-border" />
              </div>
              <div>
                {group.articles.slice(0, 8).map(a => <ArticleCard key={a.id} article={a} />)}
              </div>
              {group.articles.length > 8 && (
                <button onClick={() => setUnit(group.category)} className="mt-2 text-sm font-medium text-primary hover:underline">
                  View all {group.articles.length} →
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div>
          {filtered.map(a => <ArticleCard key={a.id} article={a} />)}
        </div>
      )}
    </div>
  );
}
