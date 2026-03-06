import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ListChecks, Calendar, Layers, Loader2, Search, X, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { getPublishedMcqSets, getCategoryDisplayName, type McqSet } from "@/lib/store";
import { getVisitedMcqIds } from "@/lib/progress-store";
import CategoryTabs from "@/components/CategoryTabs";

export default function Mcqs() {
  const [sets, setSets] = useState<McqSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getPublishedMcqSets().then(setSets).finally(() => setLoading(false));
    setVisitedIds(getVisitedMcqIds());
  }, []);

  const categories = useMemo(
    () => [...new Set(sets.map((s) => s.category).filter((c) => c && c !== "Uncategorized"))],
    [sets]
  );
  const categoryCounts = useMemo(
    () => Object.fromEntries(categories.map((c) => [c, sets.filter((s) => s.category === c).length])),
    [categories, sets]
  );

  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    const matched: { set: McqSet; matchingQuestions: { question: string; correct: string }[]; titleMatch: boolean }[] = [];
    for (const set of sets) {
      const titleMatch =
        set.title.toLowerCase().includes(q) ||
        getCategoryDisplayName(set.category).toLowerCase().includes(q);
      const matchingQuestions = (set.questions as any[])
        .filter((qn) =>
          (qn.question ?? qn.text ?? "").toLowerCase().includes(q) ||
          (qn.options ?? []).some((o: string) => o.toLowerCase().includes(q)) ||
          (qn.explanation ?? "").toLowerCase().includes(q)
        )
        .map((qn) => ({
          question: qn.question ?? qn.text ?? "",
          correct: Array.isArray(qn.options)
            ? qn.options[qn.correctIndex ?? qn.correct_index ?? 0] ?? ""
            : qn.answer ?? "",
        }));
      if (titleMatch || matchingQuestions.length > 0) matched.push({ set, matchingQuestions, titleMatch });
    }
    return matched;
  }, [query, sets]);

  const filtered = useMemo(() => {
    if (searchResults !== null) return [];
    return selectedCategory ? sets.filter((s) => s.category === selectedCategory) : sets;
  }, [sets, selectedCategory, searchResults]);

  const isSearching = searchResults !== null;
  const totalQMatches = searchResults?.reduce((n, r) => n + r.matchingQuestions.length, 0) ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 sm:px-6 py-10 sm:py-12">
      <div className="mb-7">
        <h1 className="mb-1 font-display text-3xl sm:text-4xl font-bold text-foreground">MCQ Quizzes</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Interactive multiple choice quizzes from notes</p>
      </div>

      {/* Search */}
      <div className="mb-5">
        <div className={`relative flex items-center rounded-xl border transition-all ${
          searchFocused ? "border-primary ring-2 ring-primary/20" : "border-border"
        } bg-background`}>
          <Search className="ml-3.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedCategory(null); }}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search across all questions, answers, topics…"
            className="w-full bg-transparent px-3 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="mr-3 rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {isSearching && (
          <p className="mt-2 px-1 text-sm text-muted-foreground">
            {searchResults!.length === 0
              ? <span className="text-destructive">No results for "<strong>{query}</strong>"</span>
              : <><strong className="text-foreground">{searchResults!.length}</strong> quizzes · <strong className="text-foreground">{totalQMatches}</strong> matching questions</>
            }
          </p>
        )}
      </div>

      {/* Category tabs */}
      {!isSearching && (
        <CategoryTabs
          categories={categories}
          counts={categoryCounts}
          totalCount={sets.length}
          selected={selectedCategory}
          onChange={setSelectedCategory}
        />
      )}

      {/* Search results */}
      {isSearching && (
        <>
          {searchResults!.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Search className="mx-auto mb-4 h-10 w-10 text-muted-foreground opacity-30" />
              <p className="font-medium text-foreground">No questions found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try a different keyword</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {searchResults!.map(({ set, matchingQuestions, titleMatch }, i) => (
                <motion.div key={set.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="rounded-xl border border-border bg-card overflow-hidden">
                  <Link to={`/mcqs/${set.id}`} className="flex items-start gap-3 px-5 py-4 hover:bg-muted/30 transition-colors group">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/20 text-accent mt-0.5">
                      <ListChecks className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {set.category && set.category !== "Uncategorized" && (
                          <p className="text-xs font-medium text-primary">{getCategoryDisplayName(set.category)}</p>
                        )}
                        {visitedIds.has(set.id) && <ContinueBadge />}
                      </div>
                      <p className="font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                        {titleMatch ? <Highlight text={set.title} query={query} /> : set.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {set.questions.length} questions total
                        {matchingQuestions.length > 0 && (
                          <> · <span className="text-primary font-medium">{matchingQuestions.length} question{matchingQuestions.length !== 1 ? "s" : ""} match</span></>
                        )}
                      </p>
                    </div>
                  </Link>
                  {matchingQuestions.length > 0 && (
                    <div className="border-t border-border divide-y divide-border">
                      {matchingQuestions.slice(0, 3).map((qn, qi) => (
                        <Link key={qi} to={`/mcqs/${set.id}`} className="flex flex-col gap-1 px-5 py-3 hover:bg-muted/20 transition-colors">
                          <p className="text-sm text-foreground leading-snug"><Highlight text={qn.question} query={query} /></p>
                          {qn.correct && (
                            <p className="text-xs text-primary/80 font-medium">✓ <Highlight text={qn.correct} query={query} /></p>
                          )}
                        </Link>
                      ))}
                      {matchingQuestions.length > 3 && (
                        <Link to={`/mcqs/${set.id}`} className="block px-5 py-2.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                          +{matchingQuestions.length - 3} more matching questions — open quiz to see all
                        </Link>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Normal grid */}
      {!isSearching && (
        <>
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <ListChecks className="mx-auto mb-4 h-10 w-10 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground">No quizzes yet. Create some from the dashboard!</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((s, i) => {
                // First question as snippet
                const firstQ = (s.questions as any[])[0];
                const snippet = firstQ?.question ?? firstQ?.text ?? null;

                return (
                  <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Link
                      to={`/mcqs/${s.id}`}
                      className="group relative flex flex-col rounded-xl border border-border bg-card p-6 transition-shadow hover:[box-shadow:var(--shadow-card-hover)] h-full"
                      style={{ boxShadow: "var(--shadow-card)" }}
                    >
                      {visitedIds.has(s.id) && (
                        <div className="absolute top-3 right-3"><ContinueBadge /></div>
                      )}
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20 text-accent">
                        <ListChecks className="h-5 w-5" />
                      </div>
                      {s.category && s.category !== "Uncategorized" && (
                        <span className="mb-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          {getCategoryDisplayName(s.category)}
                        </span>
                      )}
                      <h3 className="mb-2 font-display text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {s.title}
                      </h3>

                      {/* First question snippet */}
                      {snippet && (
                        <p className="mb-3 text-xs text-muted-foreground line-clamp-2 leading-relaxed border-l-2 border-primary/20 pl-2">
                          {snippet}
                        </p>
                      )}

                      <div className="mt-auto flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {s.questions.length} questions</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(s.created_at).toLocaleDateString()}</span>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ContinueBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
      <RotateCcw className="h-2.5 w-2.5" />
      Continue
    </span>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-primary/25 text-foreground rounded px-0.5 not-italic font-semibold">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}
