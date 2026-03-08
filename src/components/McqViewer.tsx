import { useState, useCallback, useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, RotateCcw, Shuffle,
  Check, X, Lightbulb, BookOpen, GraduationCap,
  AlertCircle, Clock, Trophy, ListChecks, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getPublishedArticles, getPublishedFlashcardSets, getPublishedMcqSets, buildBlogPath,
} from "@/lib/store";

const fetchArticles   = () => getPublishedArticles().catch(() => ([] as any[]));
const fetchFlashcards = () => getPublishedFlashcardSets().catch(() => ([] as any[]));
const fetchMcqs       = () => getPublishedMcqSets().catch(() => ([] as any[]));

interface McqQuestion {
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
}
interface Props {
  questions: McqQuestion[];
  title: string;
  setId?: string;
  category?: string;
  hideAnswers?: boolean;
}
interface AttemptRecord {
  date: string;
  score: number;
  total: number;
  pct: number;
  durationSec: number;
  failedQuestions: { question: string; correctAnswer: string }[];
}
interface RelatedResult {
  articles: any[];
  flashcards: any[];
  mcqs: { set: any; startIndex: number }[];
}

// Strip markdown headers and "Choices:" suffix from question text
function cleanQuestionText(text: string | undefined): string {
  if (!text) return "";
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^Question\s*\d+\s*/i, "")
    .replace(/\s*Choices:\s*$/i, "")
    .trim();
}


const HISTORY_KEY  = "mcq_history_";
const PROGRESS_KEY = "mcq_progress_";

function loadHistory(setId: string): AttemptRecord[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY + setId) || "[]"); }
  catch { return []; }
}
function saveHistory(setId: string, records: AttemptRecord[]) {
  localStorage.setItem(HISTORY_KEY + setId, JSON.stringify(records.slice(0, 20)));
}

interface ProgressState {
  current: number;
  order: number[];
}
function loadProgress(setId: string, questionCount: number): ProgressState | null {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY + setId);
    if (!raw) return null;
    const p: ProgressState = JSON.parse(raw);
    // Validate — stale if question count changed
    if (
      typeof p.current !== "number" ||
      !Array.isArray(p.order) ||
      p.order.length !== questionCount
    ) return null;
    return p;
  } catch { return null; }
}
function saveProgress(setId: string, current: number, order: number[]) {
  localStorage.setItem(PROGRESS_KEY + setId, JSON.stringify({ current, order }));
}
function clearProgress(setId: string) {
  localStorage.removeItem(PROGRESS_KEY + setId);
}

// ── Keyword extraction ─────────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  "the","a","an","is","are","was","were","be","been","being","have","has","had",
  "do","does","did","will","would","could","should","may","might","shall","can",
  "not","no","nor","so","yet","both","either","and","but","or","as","at","by",
  "for","from","in","of","on","to","with","that","this","these","those","it",
  "its","which","who","what","when","where","how","all","each","every","more",
  "most","other","some","such","only","than","then","too","very","just","also",
  "true","false","correct","incorrect","following","best","describe","describes",
  "associated","characteristic","commonly","typically","result","results","cause",
  "causes","used","found","seen","known","called","type","types","form","forms",
]);

function extractKeywords(text: string): string[] {
  return [...new Set(
    text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
  )];
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function McqViewer({ questions, title, setId, category, hideAnswers = false }: Props) {
  // Restore order + current from localStorage if available
  const [order, setOrder] = useState<number[]>(() => {
    if (setId) {
      const saved = loadProgress(setId, questions.length);
      if (saved) return saved.order;
    }
    return questions.map((_, i) => i);
  });

  const [current, setCurrent] = useState<number>(() => {
    if (setId) {
      const saved = loadProgress(setId, questions.length);
      if (saved) return saved.current;
    }
    return 0;
  });

  const [wrongAttempts, setWrongAttempts] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [failed, setFailed] = useState<{ question: string; correctAnswer: string }[]>([]);
  const [finished, setFinished] = useState(false);
  const [startTime] = useState(Date.now());
  const [history, setHistory] = useState<AttemptRecord[]>(() => setId ? loadHistory(setId) : []);

  const [allArticles, setAllArticles] = useState<any[]>([]);
  const [allFlashcards, setAllFlashcards] = useState<any[]>([]);
  const [allMcqs, setAllMcqs] = useState<any[]>([]);
  const [siteLoaded, setSiteLoaded] = useState(false);

  const [related, setRelated] = useState<RelatedResult | null>(null);
  const [relatedKeywords, setRelatedKeywords] = useState<string[]>([]);
  const [miniQuizSet, setMiniQuizSet] = useState<{ set: any; startIndex: number } | null>(null);
  const [inlineArticle, setInlineArticle] = useState<any | null>(null);
  const [inlineFlashcard, setInlineFlashcard] = useState<any | null>(null);

  const dragX = useMotionValue(0);
  const dragOpacity = useTransform(dragX, [-150, 0, 150], [0.5, 1, 0.5]);

  const qIndex = order[current];
  const q = questions[qIndex];

  // Load all site content once
  useEffect(() => {
    Promise.all([fetchArticles(), fetchFlashcards(), fetchMcqs()])
      .then(([a, f, m]) => {
        setAllArticles(a ?? []);
        setAllFlashcards(f ?? []);
        setAllMcqs(m ?? []);
        setSiteLoaded(true);
      }).catch(() => setSiteLoaded(true));
  }, []);

  // ── Persist progress whenever current or order changes ─────────────────────
  useEffect(() => {
    if (!setId || finished) return;
    saveProgress(setId, current, order);
  }, [current, order, setId, finished]);

  // ── Keyword search ──────────────────────────────────────────────────────────
  function findRelated(clickedOptionText: string, correctOptionText: string, questionText: string, allOptions: string[]): RelatedResult {
    const fullText = [questionText, clickedOptionText, ...allOptions].join(" ");
    let keywords = extractKeywords(fullText);

    const searchArticles = (kws: string[]) => allArticles
      .map((a) => {
        const lower = (a.title + " " + (a.content ?? "")).toLowerCase();
        const s = kws.reduce((n, kw) => n + (lower.includes(kw) ? 1 : 0), 0);
        return { item: a, score: s };
      })
      .filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map((x) => x.item);

    const searchFlashcards = (kws: string[]) => allFlashcards
      .map((f) => {
        const allText = f.title + " " + (f.cards as any[]).map((c: any) =>
          (c.front ?? c.question ?? "") + " " + (c.back ?? c.answer ?? "")
        ).join(" ");
        const s = kws.reduce((n, kw) => n + (allText.toLowerCase().includes(kw) ? 1 : 0), 0);
        return { item: f, score: s };
      })
      .filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map((x) => x.item);

    const searchMcqs = (kws: string[]) => allMcqs
      .filter((m) => m.id !== setId)
      .map((m) => {
        const qs = m.questions as any[];
        let bestScore = 0, bestIndex = 0;
        qs.forEach((qn: any, i: number) => {
          const qText = (qn.question ?? "") + " " + (qn.options ?? []).join(" ");
          const s = kws.reduce((n, kw) => n + (qText.toLowerCase().includes(kw) ? 1 : 0), 0);
          if (s > bestScore) { bestScore = s; bestIndex = i; }
        });
        const totalScore = qs.reduce((n: number, qn: any) => {
          const qText = (qn.question ?? "") + " " + (qn.options ?? []).join(" ");
          return n + kws.reduce((s, kw) => s + (qText.toLowerCase().includes(kw) ? 1 : 0), 0);
        }, 0) + kws.reduce((n, kw) => n + (m.title.toLowerCase().includes(kw) ? 1 : 0), 0);
        return { item: m, startIndex: bestIndex, score: totalScore };
      })
      .filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3)
      .map((x) => ({ set: x.item, startIndex: x.startIndex }));

    let articles   = searchArticles(keywords);
    let flashcards = searchFlashcards(keywords);
    let mcqs       = searchMcqs(keywords);

    if (articles.length === 0 && flashcards.length === 0 && mcqs.length === 0) {
      keywords   = extractKeywords(correctOptionText);
      articles   = searchArticles(keywords);
      flashcards = searchFlashcards(keywords);
      mcqs       = searchMcqs(keywords);
    }

    setRelatedKeywords(keywords);
    return { articles, flashcards, mcqs };
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  const clearPanel = () => {
    setWrongAttempts(new Set());
    setRevealed(false);
    setRelated(null);
    setMiniQuizSet(null);
    setInlineArticle(null);
    setInlineFlashcard(null);
  };

  const goNext = useCallback(() => {
    if (current < order.length - 1) {
      setCurrent((c) => c + 1);
      clearPanel();
    } else {
      setFinished(true);
      if (setId) clearProgress(setId); // done — remove saved spot
    }
  }, [current, order.length, setId]);

  const goPrev = useCallback(() => {
    if (current > 0) {
      setCurrent((c) => c - 1);
      clearPanel();
    }
  }, [current]);

  // ── Save history on finish ──────────────────────────────────────────────────
  useEffect(() => {
    if (!finished || !setId) return;
    const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
    const record: AttemptRecord = {
      date: new Date().toISOString(),
      score: score.correct,
      total: score.total,
      pct,
      durationSec: Math.round((Date.now() - startTime) / 1000),
      failedQuestions: failed,
    };
    const updated = [record, ...history];
    saveHistory(setId, updated);
    setHistory(updated);
  }, [finished]); // eslint-disable-line

  // ── Answer handling ────────────────────────────────────────────────────────
  const handleSelect = (optionIndex: number) => {
    if (revealed) return;
    if (hideAnswers) {
      // In hideAnswers mode, just mark the selected option but don't reveal correct answer
      const newWrong = new Set(wrongAttempts).add(optionIndex);
      setWrongAttempts(newWrong);
      return;
    }
    if (optionIndex === q.correct_answer) {
      setRevealed(true);
      setRelated(null);
      setMiniQuizSet(null);
      setInlineArticle(null);
      setInlineFlashcard(null);
      if (!wrongAttempts.size) {
        setScore((s) => ({ correct: s.correct + 1, total: s.total + 1 }));
      } else {
        setScore((s) => ({ ...s, total: s.total + 1 }));
        setFailed((prev) => [...prev, { question: q.question, correctAnswer: q.options[q.correct_answer] }]);
      }
    } else {
      const newWrong = new Set(wrongAttempts).add(optionIndex);
      setWrongAttempts(newWrong);
      if (siteLoaded) {
        const wrongText   = q.options[optionIndex];
        const correctText = q.options[q.correct_answer];
        const results = findRelated(wrongText, correctText, q.question, q.options);
        if (results.articles.length > 0 || results.flashcards.length > 0 || results.mcqs.length > 0) {
          setRelated(results);
          setMiniQuizSet(null);
          setInlineArticle(null);
          setInlineFlashcard(null);
        }
      }
    }
  };

  const handleDragEnd = (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    if (Math.abs(info.offset.x) > 30 || Math.abs(info.velocity.x) > 200) {
      if (info.offset.x < 0) goNext(); else goPrev();
    }
    animate(dragX, 0, { type: "spring", stiffness: 300, damping: 30 });
  };

  const shuffle = () => {
    const newOrder = [...order].sort(() => Math.random() - 0.5);
    setOrder(newOrder);
    setCurrent(0);
    clearPanel();
    setScore({ correct: 0, total: 0 });
    setFailed([]);
    setFinished(false);
    if (setId) saveProgress(setId, 0, newOrder);
  };

  const reset = () => {
    const newOrder = questions.map((_, i) => i);
    setOrder(newOrder);
    setCurrent(0);
    clearPanel();
    setScore({ correct: 0, total: 0 });
    setFailed([]);
    setFinished(false);
    if (setId) {
      clearProgress(setId);
      localStorage.removeItem(HISTORY_KEY + setId);
    }
  };

  const getOptionStyle = (i: number) => {
    if (!hideAnswers && revealed && i === q.correct_answer)
      return "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400";
    if (wrongAttempts.has(i))
      return hideAnswers
        ? "border-primary/50 bg-primary/10 text-primary"
        : "border-destructive/50 bg-destructive/10 text-destructive line-through opacity-60";
    return "border-border bg-card hover:border-primary/50 hover:bg-primary/5 cursor-pointer";
  };

  // ── FINISHED SCREEN ────────────────────────────────────────────────────────
  if (finished) {
    const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
    const dur = Math.round((Date.now() - startTime) / 1000);
    const grade =
      pct >= 80 ? { label: "Excellent!", color: "text-green-500",  bg: "border-green-500/20 bg-green-500/5",  emoji: "🏆" }
    : pct >= 60 ? { label: "Good job!",  color: "text-blue-500",   bg: "border-blue-500/20 bg-blue-500/5",   emoji: "✅" }
    :             { label: "Keep going", color: "text-amber-500",  bg: "border-amber-500/20 bg-amber-500/5", emoji: "📚" };

    return (
      <div className="mx-auto max-w-2xl px-2 pb-12 space-y-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border ${grade.bg} p-6 text-center`}>
          <div className="text-5xl mb-3">{grade.emoji}</div>
          <h2 className="font-serif text-2xl font-bold text-foreground mb-1">{grade.label}</h2>
          <p className="text-sm text-muted-foreground mb-6 truncate">{title}</p>
          <div className="flex items-center justify-center gap-6 sm:gap-10 mb-5">
            <div>
              <p className={`text-4xl font-bold ${grade.color}`}>{pct}%</p>
              <p className="text-xs text-muted-foreground mt-1">Score</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div>
              <p className="text-4xl font-bold text-foreground">{score.correct}/{score.total}</p>
              <p className="text-xs text-muted-foreground mt-1">Correct</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div>
              <p className="text-4xl font-bold text-foreground">
                {Math.floor(dur / 60)}:{String(dur % 60).padStart(2, "0")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Time</p>
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </motion.div>

        {failed.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl border border-destructive/20 bg-destructive/5 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-destructive/10">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm font-bold text-destructive">Review These ({failed.length})</p>
            </div>
            <div className="divide-y divide-destructive/10">
              {failed.map((f, i) => (
                <div key={i} className="px-5 py-3">
                  <p className="text-sm text-foreground leading-snug mb-1">{f.question}</p>
                  <p className="text-xs font-semibold text-green-600 dark:text-green-400">✓ {f.correctAnswer}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {history.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
              <Trophy className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm font-bold text-foreground">All Attempts</p>
              <span className="ml-auto text-xs text-muted-foreground">{history.length} total</span>
            </div>
            <div className="divide-y divide-border">
              {history.slice(0, 10).map((rec, i) => {
                const d = new Date(rec.date);
                const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
                const time  = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
                const barColor   = rec.pct >= 80 ? "bg-green-500" : rec.pct >= 60 ? "bg-blue-500" : "bg-amber-500";
                const badgeColor = rec.pct >= 80
                  ? "bg-green-500/15 text-green-600 dark:text-green-400"
                  : rec.pct >= 60 ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400";
                return (
                  <div key={i} className={`px-5 py-3 ${i === 0 ? "bg-primary/5" : ""}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{rec.score}/{rec.total}</span>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${badgeColor}`}>{rec.pct}%</span>
                        {i === 0 && <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Latest</span>}
                        {rec.failedQuestions.length > 0 && <span className="text-[10px] text-destructive">{rec.failedQuestions.length} missed</span>}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock className="h-3 w-3" />
                        <span>{Math.floor(rec.durationSec / 60)}:{String(rec.durationSec % 60).padStart(2, "0")}</span>
                        <span className="hidden sm:inline"> · {label} {time}</span>
                      </div>
                    </div>
                    <div className="h-1 w-full rounded-full bg-secondary overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${rec.pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground sm:hidden">{label} {time}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        <div className="flex gap-3">
          <Button onClick={reset} className="flex-1 gap-2"><RotateCcw className="h-4 w-4" /> Try Again</Button>
          <Button onClick={shuffle} variant="outline" className="flex-1 gap-2"><Shuffle className="h-4 w-4" /> Shuffle & Retry</Button>
        </div>
      </div>
    );
  }

  // ── QUIZ VIEW ──────────────────────────────────────────────────────────────
  const hasRelated = related && (related.articles.length > 0 || related.flashcards.length > 0 || related.mcqs.length > 0);

  return (
    <div className="mx-auto max-w-2xl px-2">
      <h2 className="mb-2 text-center font-serif text-xl sm:text-2xl font-bold text-foreground">{title}</h2>
      <div className="mb-6 flex items-center justify-center gap-3 text-xs sm:text-sm text-muted-foreground">
        <span>Question {current + 1} of {order.length}</span>
        <span>·</span>
        <span>Score: {score.correct}/{score.total}</span>
      </div>

      <div key={qIndex}>
        <motion.div
          style={{ x: dragX, opacity: dragOpacity }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.7}
          onDragEnd={handleDragEnd}
          className="touch-pan-y"
        >
          {/* Question */}
          <div className="mb-4 rounded-2xl border border-border bg-card p-5 sm:p-6"
            style={{ boxShadow: "var(--shadow-elevated)" }}>
            <span className="mb-3 block text-xs font-medium uppercase tracking-wider text-primary">Question</span>
            <p className="text-base sm:text-lg font-medium text-foreground leading-relaxed break-words">{cleanQuestionText(q?.question)}</p>
          </div>

          {/* Options */}
          <div className="space-y-2 mb-4">
            {q?.options.map((opt, i) => (
              <motion.button key={i} onClick={() => handleSelect(i)}
                whileTap={!revealed ? { scale: 0.98 } : {}}
                className={`w-full rounded-xl border p-3 sm:p-4 text-left text-sm sm:text-base font-medium transition-colors flex items-start gap-3 ${getOptionStyle(i)}`}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1 break-words">{opt}</span>
                {revealed && i === q.correct_answer && <Check className="h-5 w-5 text-green-500 shrink-0" />}
                {wrongAttempts.has(i) && <X className="h-5 w-5 text-destructive shrink-0" />}
              </motion.button>
            ))}
          </div>

          {/* Wrong feedback */}
          {!revealed && wrongAttempts.size > 0 && (
            <p className="mb-3 text-center text-sm text-destructive font-medium">Wrong — try again!</p>
          )}

          {/* Correct + explanation */}
          {revealed && (
            <div className="mb-4 space-y-3">
              <p className="text-center text-sm font-semibold text-green-600 dark:text-green-400">
                {wrongAttempts.size === 0 ? "🎉 Correct on first try!" : "✅ Correct!"}
              </p>
              {q?.explanation && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex gap-3">
                  <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground leading-relaxed">{q.explanation}</p>
                </div>
              )}
            </div>
          )}

          {/* Related panel */}
          {!revealed && hasRelated && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-amber-200 dark:border-amber-800">
                <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    Related Study Material
                  </p>
                  {relatedKeywords.length > 0 && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 truncate">
                      keywords: {relatedKeywords.join(", ")}
                    </p>
                  )}
                </div>
                <button onClick={() => { setRelated(null); setMiniQuizSet(null); setInlineArticle(null); setInlineFlashcard(null); }}
                  className="ml-2 text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 transition-colors shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="p-3 space-y-2">
                {related.mcqs.map(({ set: m, startIndex }) => {
                  const isOpen = miniQuizSet?.set?.id === m.id;
                  return (
                    <div key={m.id}>
                      <button
                        onClick={() => {
                          setMiniQuizSet(isOpen ? null : { set: m, startIndex });
                          setInlineArticle(null); setInlineFlashcard(null);
                        }}
                        className="w-full flex items-center gap-3 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-white dark:bg-amber-950/60 px-3 py-2.5 hover:border-green-400 dark:hover:border-green-600 transition-colors group text-left">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-green-500/10">
                          <ListChecks className="h-3.5 w-3.5 text-green-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">{m.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {(m.questions as any[])?.length || 0} questions · opens at Q{startIndex + 1} · tap to try
                          </p>
                        </div>
                        {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                      </button>
                      {isOpen && <MiniQuiz set={miniQuizSet!.set} startIndex={miniQuizSet!.startIndex} onDone={() => setMiniQuizSet(null)} />}
                    </div>
                  );
                })}

                {related.flashcards.map((f: any) => (
                  <div key={f.id}>
                    <button
                      onClick={() => { setInlineFlashcard(inlineFlashcard?.id === f.id ? null : f); setMiniQuizSet(null); setInlineArticle(null); }}
                      className="w-full flex items-center gap-3 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-white dark:bg-amber-950/60 px-3 py-2.5 hover:border-amber-400 dark:hover:border-amber-600 transition-colors group text-left">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500/10">
                        <GraduationCap className="h-3.5 w-3.5 text-amber-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">{f.title}</p>
                        <p className="text-[10px] text-muted-foreground">{(f.cards as any[])?.length || 0} cards · tap to study inline</p>
                      </div>
                      {inlineFlashcard?.id === f.id ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    </button>
                    {inlineFlashcard?.id === f.id && <InlineFlashcards set={f} onDone={() => setInlineFlashcard(null)} />}
                  </div>
                ))}

                {related.articles.map((a: any) => (
                  <div key={a.id}>
                    <button
                      onClick={() => { setInlineArticle(inlineArticle?.id === a.id ? null : a); setMiniQuizSet(null); setInlineFlashcard(null); }}
                      className="w-full flex items-center gap-3 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-white dark:bg-amber-950/60 px-3 py-2.5 hover:border-blue-400 dark:hover:border-blue-600 transition-colors group text-left">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-500/10">
                        <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">{a.title}</p>
                        <p className="text-[10px] text-muted-foreground">Article · tap to read inline</p>
                      </div>
                      {inlineArticle?.id === a.id ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    </button>
                    {inlineArticle?.id === a.id && <InlineArticle article={a} onDone={() => setInlineArticle(null)} />}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      <p className="mb-4 text-center text-xs text-muted-foreground sm:hidden">← Swipe to navigate →</p>

      <div className="flex items-center justify-center gap-2 sm:gap-3">
        <Button variant="outline" size="icon" onClick={goPrev} disabled={current === 0}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="icon" onClick={shuffle}><Shuffle className="h-4 w-4" /></Button>
        <Button variant="outline" size="icon" onClick={reset}><RotateCcw className="h-4 w-4" /></Button>
        <Button variant="outline" size="icon" onClick={goNext} disabled={current === order.length - 1}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      <div className="mt-4 h-1 w-full rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${((current + 1) / order.length) * 100}%` }} />
      </div>
    </div>
  );
}

// ── MiniQuiz ───────────────────────────────────────────────────────────────────
function MiniQuiz({ set, startIndex = 0, onDone }: { set: any; startIndex?: number; onDone: () => void }) {
  const questions: any[] = set.questions ?? [];
  const [idx, setIdx] = useState(startIndex);
  const [wrong, setWrong] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [done, setDone] = useState(false);

  useEffect(() => {
    setIdx(startIndex); setWrong(new Set()); setRevealed(false); setDone(false);
  }, [startIndex, set.id]);

  const q = questions[idx];
  const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  const handleSelect = (i: number) => {
    if (revealed) return;
    if (i === q.correct_answer) {
      setRevealed(true);
      if (!wrong.size) setScore((s) => ({ correct: s.correct + 1, total: s.total + 1 }));
      else setScore((s) => ({ ...s, total: s.total + 1 }));
    } else { setWrong((w) => new Set(w).add(i)); }
  };

  const handleNext = () => {
    if (idx < questions.length - 1) { setIdx((i) => i + 1); setWrong(new Set()); setRevealed(false); }
    else setDone(true);
  };

  if (!q) return null;

  if (done) {
    return (
      <div className="mt-1 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-3 text-center">
        <p className="text-sm font-bold text-foreground mb-1">Done! {score.correct}/{score.total} ({pct}%)</p>
        <button onClick={onDone} className="text-xs text-primary font-medium hover:underline">← Back to main quiz</button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="mt-1 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-green-700 dark:text-green-400">
          Quiz · Q{idx + 1}/{questions.length}
          {idx === startIndex && startIndex > 0 && (
            <span className="ml-1 normal-case font-normal text-green-600 dark:text-green-500">(jumped to best match)</span>
          )}
        </p>
        <span className="text-[10px] text-muted-foreground">{score.correct}/{score.total}</span>
      </div>
      <p className="text-xs font-medium text-foreground leading-snug mb-2 break-words">{cleanQuestionText(q.question)}</p>
      <div className="space-y-1 mb-2">
        {(q.options ?? []).map((opt: string, i: number) => {
          const isCorrect = revealed && i === q.correct_answer;
          const isWrong = wrong.has(i);
          return (
            <button key={i} onClick={() => handleSelect(i)}
              className={`w-full text-left rounded-md px-2.5 py-1.5 text-xs font-medium border transition-colors flex items-start gap-2 ${
                isCorrect ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400"
                : isWrong ? "border-destructive/40 bg-destructive/10 text-destructive line-through opacity-60"
                : "border-border bg-background hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
              }`}>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1 break-words">{opt}</span>
              {isCorrect && <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />}
              {isWrong && <X className="h-3.5 w-3.5 text-destructive shrink-0" />}
            </button>
          );
        })}
      </div>
      {revealed && (
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold text-green-600 dark:text-green-400">{wrong.size === 0 ? "🎉 First try!" : "✅ Correct!"}</p>
          <button onClick={handleNext} className="text-xs font-semibold text-primary hover:underline">
            {idx < questions.length - 1 ? "Next →" : "Finish →"}
          </button>
        </div>
      )}
      {!revealed && wrong.size > 0 && <p className="text-[10px] text-destructive font-medium">Wrong — try again!</p>}
    </motion.div>
  );
}

// ── InlineFlashcards ───────────────────────────────────────────────────────────
function InlineFlashcards({ set, onDone }: { set: any; onDone: () => void }) {
  const cards: any[] = set.cards ?? [];
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[idx];
  if (!card) return null;
  const front = card.front ?? card.question ?? "";
  const back  = card.back  ?? card.answer  ?? "";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="mt-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
          Flashcards · {idx + 1}/{cards.length}
        </p>
        <button onClick={onDone} className="text-[10px] text-primary font-medium hover:underline">Done</button>
      </div>
      <button onClick={() => setFlipped((f) => !f)}
        className="w-full rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-amber-950/40 p-3 text-left min-h-[60px] flex flex-col justify-center transition-colors hover:border-amber-400">
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
          {flipped ? "Answer" : "Question — tap to flip"}
        </p>
        <p className="text-xs font-medium text-foreground leading-snug">{flipped ? back : front}</p>
      </button>
      <div className="flex gap-2 mt-2">
        <button onClick={() => { setIdx((i) => Math.max(0, i - 1)); setFlipped(false); }} disabled={idx === 0}
          className="flex-1 rounded-md border border-border bg-background py-1.5 text-xs font-medium text-muted-foreground disabled:opacity-40 hover:text-foreground transition-colors">
          ← Prev
        </button>
        <button onClick={() => setFlipped((f) => !f)}
          className="flex-1 rounded-md bg-primary/10 border border-primary/20 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
          Flip
        </button>
        <button onClick={() => { if (idx < cards.length - 1) { setIdx((i) => i + 1); setFlipped(false); } else onDone(); }}
          className="flex-1 rounded-md border border-border bg-background py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
          {idx < cards.length - 1 ? "Next →" : "Done ✓"}
        </button>
      </div>
    </motion.div>
  );
}

// ── InlineArticle ──────────────────────────────────────────────────────────────
function InlineArticle({ article, onDone }: { article: any; onDone: () => void }) {
  const content: string = article.content ?? "";
  const preview = content.length > 600 ? content.slice(0, 600).trim() + "…" : content;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="mt-1 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Article Preview</p>
        <button onClick={onDone} className="text-[10px] text-primary font-medium hover:underline">Close</button>
      </div>
      <p className="text-xs font-semibold text-foreground mb-2 leading-snug">{article.title}</p>
      <div className="max-h-48 overflow-y-auto">
        <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">{preview}</p>
      </div>
      {content.length > 600 && (
        <Link to={buildBlogPath({ id: article.id, title: article.title || "article", slug: article.slug })} target="_blank"
          className="mt-2 block text-center text-xs font-semibold text-primary hover:underline">
          Read full article →
        </Link>
      )}
    </motion.div>
  );
}
