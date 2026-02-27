import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Calendar, Loader2, GraduationCap, ListChecks,
  ChevronDown, FileText, HelpCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getArticleById, getRelatedContent, getCategoryDisplayName, type Article } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { markArticleVisited } from "@/lib/progress-store";

// ── Inline markdown renderer ──────────────────────────────────────────────────
function Inline({ text }: { text: string }) {
  // Strip ⭐ emoji from inline text (handled separately as badges)
  const cleaned = text.replace(/⭐+/g, "").trim();
  const parts = cleaned.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={j} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
          return <em key={j} className="italic">{part.slice(1, -1)}</em>;
        return <span key={j}>{part.replace(/\*/g, "")}</span>;
      })}
    </>
  );
}

// Keep ⭐ for lines that genuinely need a star badge
function InlineWithStar({ text }: { text: string }) {
  const hasStar = text.includes("⭐");
  const cleaned = text.replace(/⭐+/g, "").trim();
  const parts = cleaned.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={j} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
          return <em key={j} className="italic">{part.slice(1, -1)}</em>;
        return <span key={j}>{part.replace(/\*/g, "")}</span>;
      })}
      {hasStar && <span className="ml-1.5 text-base leading-none">⭐</span>}
    </>
  );
}

// ── Reading progress bar ──────────────────────────────────────────────────────
function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const update = () => {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? (el.scrollTop / total) * 100 : 0);
    };
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-transparent">
      <div className="h-full bg-primary transition-all duration-100" style={{ width: `${progress}%` }} />
    </div>
  );
}

// ── Swipeable table (exactly like the screenshots) ────────────────────────────
function TableBlock({ lines }: { lines: string[] }) {
  const isSep = (l: string) => /^\|[-:\s|]+\|$/.test(l.trim());
  const parseRow = (l: string) =>
    l.trim().split("|").map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);

  const dataLines = lines.filter(l => !isSep(l));
  if (dataLines.length < 2) return null;
  const [headerLine, ...bodyLines] = dataLines;
  const headers = parseRow(headerLine);
  const rows = bodyLines.map(parseRow);

  return (
    <div className="my-5">
      {/* swipe hint — matches screenshots */}
      <div className="flex justify-end pr-1 mb-1">
        <span className="text-xs text-muted-foreground/60 italic">← swipe →</span>
      </div>
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="min-w-full border-collapse text-[14px]" style={{ minWidth: "480px" }}>
          <thead>
            <tr className="border-b-2 border-border">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="py-3 pr-4 text-left font-bold text-foreground first:pl-0"
                  style={{ minWidth: i === 0 ? "110px" : "120px" }}
                >
                  <Inline text={h} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`py-3 pr-4 leading-snug first:pl-0 align-top ${ci === 0 ? "text-foreground/80" : "text-foreground/80"}`}
                  >
                    <InlineWithStar text={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Practice question accordion ───────────────────────────────────────────────
function PracticeQuestion({ number, question, answer }: {
  number: string; question: string; answer: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 px-4 py-4 text-left hover:bg-muted/20 active:bg-muted/40 transition-colors"
      >
        <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 text-xs font-bold mt-0.5">
          {number}
        </span>
        <span className="flex-1 text-[15px] font-medium text-foreground leading-snug">
          <Inline text={question} />
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground mt-0.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-4 border-t border-border bg-emerald-500/5 flex items-start gap-3">
              <span className="shrink-0 text-emerald-500 font-bold text-sm mt-0.5">→</span>
              <p className="text-[15px] text-foreground/90 leading-relaxed">
                <Inline text={answer} />
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Section counter (shared state via ref passed down) ────────────────────────
let _sectionCount = 0;

// ── Full article content renderer ─────────────────────────────────────────────
function ArticleContent({ content }: { content: string }) {
  _sectionCount = 0; // reset on each render

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listBuffer: { type: "ul" | "ol"; items: React.ReactNode[] } | null = null;
  let inPractice = false;
  let tableBuffer: string[] = [];
  const practiceItems: { number: string; question: string; answer: string }[] = [];

  const flushList = () => {
    if (!listBuffer) return;
    const Tag = listBuffer.type === "ul" ? "ul" : "ol";
    elements.push(
      <Tag
        key={`list-${elements.length}`}
        className={`mb-4 space-y-2.5 ${listBuffer.type === "ul" ? "list-none pl-0" : "list-none pl-0"}`}
      >
        {listBuffer.items}
      </Tag>
    );
    listBuffer = null;
  };

  const flushTable = () => {
    if (tableBuffer.length >= 2) {
      elements.push(<TableBlock key={`table-${elements.length}`} lines={tableBuffer} />);
    }
    tableBuffer = [];
  };

  const flushPractice = () => {
    if (!practiceItems.length) return;
    elements.push(
      <div key={`practice-${elements.length}`} className="my-6">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="h-4 w-4 text-emerald-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">Practice Questions</span>
          <span className="ml-auto text-[10px] text-muted-foreground italic">tap to reveal</span>
        </div>
        <div className="space-y-2">
          {practiceItems.map((q, k) => (
            <PracticeQuestion key={k} number={q.number} question={q.question} answer={q.answer} />
          ))}
        </div>
      </div>
    );
    practiceItems.length = 0;
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    // Table rows
    if (trimmed.startsWith("|")) {
      flushList();
      tableBuffer.push(trimmed);
      return;
    } else if (tableBuffer.length) {
      flushTable();
    }

    if (!trimmed) { flushList(); return; }

    // H2 — numbered badge section header (matches screenshots exactly)
    if (trimmed.startsWith("## ")) {
      flushList();
      if (trimmed.toLowerCase().includes("practice")) { inPractice = true; return; }
      flushPractice();
      inPractice = false;
      _sectionCount++;
      const num = _sectionCount;
      const text = trimmed.slice(3).replace(/\*+/g, "").replace(/\s*⭐+/g, "").trim();
      // Strip leading number if content already has it e.g. "1. LIVER HISTOLOGY"
      const cleanText = text.replace(/^\d+\.\s*/, "");
      elements.push(
        <div key={`h2-${i}`} className="mt-10 mb-5">
          <div className="flex items-center gap-3 mb-3">
            {/* Numbered badge — exactly like screenshots */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary font-bold text-sm">
              {num}
            </div>
            <h2 className="font-bold text-[17px] sm:text-[19px] uppercase tracking-wide text-foreground leading-snug">
              {cleanText}
            </h2>
          </div>
          <div className="border-b border-border/70" />
        </div>
      );
      return;
    }

    // H3 — rendered as bold bullet (matches screenshots)
    if (trimmed.startsWith("### ")) {
      flushList();
      const text = trimmed.slice(4).replace(/\*+/g, "").replace(/\s*⭐+/g, "").trim();
      elements.push(
        <div key={`h3-${i}`} className="mt-5 mb-2 flex items-start gap-2.5">
          <div className="h-2 w-2 rounded-full bg-primary mt-[7px] shrink-0" />
          <h3 className="font-bold text-[16px] text-foreground leading-snug">{text}</h3>
        </div>
      );
      return;
    }

    // Q→A
    const qaMatch = trimmed.match(/^(\d+)\.\s(.+?)\s*→\s*(.+)$/);
    if (qaMatch) {
      flushList();
      if (inPractice) {
        practiceItems.push({ number: qaMatch[1], question: qaMatch[2], answer: qaMatch[3] });
      } else {
        elements.push(
          <div key={`qa-${i}`} className="mb-3 rounded-xl border border-border bg-card p-4">
            <p className="text-[15px] font-medium text-foreground">{qaMatch[1]}. <Inline text={qaMatch[2]} /></p>
            <p className="mt-1.5 text-[15px] text-primary font-medium">→ <Inline text={qaMatch[3]} /></p>
          </div>
        );
      }
      return;
    }

    // Practice standalone numbered Q
    if (inPractice && /^\d+\.\s/.test(trimmed) && !trimmed.includes("→")) {
      const nextLine = lines[i + 1]?.trim() ?? "";
      practiceItems.push({
        number: trimmed.match(/^(\d+)/)?.[1] ?? "",
        question: trimmed.replace(/^\d+\.\s/, ""),
        answer: nextLine.startsWith("→") ? nextLine.slice(1).trim() : "",
      });
      return;
    }
    if (inPractice && trimmed.startsWith("→")) return;

    // Bullet list — using blue dot like screenshots
    if (trimmed.startsWith("- ")) {
      if (!listBuffer || listBuffer.type !== "ul") {
        flushList();
        listBuffer = { type: "ul", items: [] };
      }
      const text = trimmed.slice(2);
      const hasStar = text.includes("⭐");
      listBuffer.items.push(
        <li key={`li-${i}`} className="flex items-start gap-2.5">
          <div className="h-2 w-2 rounded-full bg-primary/70 mt-[8px] shrink-0" />
          <span className="text-[15px] text-foreground/90 leading-relaxed flex-1">
            <InlineWithStar text={text} />
          </span>
        </li>
      );
      return;
    }

    // Numbered list
    if (/^\d+\.\s/.test(trimmed) && !trimmed.includes("→") && !inPractice) {
      if (!listBuffer || listBuffer.type !== "ol") {
        flushList();
        listBuffer = { type: "ol", items: [] };
      }
      const num = trimmed.match(/^(\d+)/)?.[1] ?? "";
      const text = trimmed.replace(/^\d+\.\s/, "");
      listBuffer.items.push(
        <li key={`oli-${i}`} className="flex items-start gap-2.5">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 mt-[2px]">
            <span className="text-[11px] font-bold text-primary">{num}</span>
          </div>
          <span className="text-[15px] text-foreground/90 leading-relaxed flex-1">
            <InlineWithStar text={text} />
          </span>
        </li>
      );
      return;
    }

    // Paragraph
    flushList();
    elements.push(
      <p key={`p-${i}`} className="mb-3 leading-relaxed text-foreground/85 text-[15px]">
        <InlineWithStar text={trimmed} />
      </p>
    );
  });

  flushList();
  flushTable();
  flushPractice();
  return <div>{elements}</div>;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function BlogPost() {
  const { id } = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState<{ articles: any[]; flashcards: any[]; mcqs: any[] }>({
    articles: [], flashcards: [], mcqs: [],
  });

  useEffect(() => {
    if (id) {
      getArticleById(id).then((a) => {
        setArticle(a);
        if (a) {
          markArticleVisited({ id: a.id, title: a.title, category: a.category, visitedAt: Date.now() });
          if (a.category) getRelatedContent(a.category, a.id).then(setRelated);
        }
      }).finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (!article) return (
    <div className="mx-auto max-w-3xl px-6 py-20 text-center">
      <h1 className="mb-4 font-bold text-3xl text-foreground">Article not found</h1>
      <Button asChild variant="outline">
        <Link to="/blog"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Blog</Link>
      </Button>
    </div>
  );

  const date = new Date(article.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const unitName = getCategoryDisplayName(article.category);
  const hasRelated = related.flashcards.length > 0 || related.mcqs.length > 0;

  return (
    <>
      <ReadingProgress />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">

        {/* Back */}
        <Button asChild variant="ghost" size="sm" className="mb-8 gap-2 text-muted-foreground -ml-2">
          <Link to="/blog"><ArrowLeft className="h-4 w-4" /> Back to Blog</Link>
        </Button>

        {/* Meta */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">{date}</span>
          </div>
          {unitName && unitName !== "Uncategorized" && (
            <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              {unitName}
            </span>
          )}
        </div>

        {/* Title — large, bold, all-caps style matches screenshots */}
        <h1 className="mb-10 font-bold text-[26px] sm:text-[32px] leading-tight text-foreground uppercase tracking-wide break-words">
          {article.title}
        </h1>

        {/* Divider dots like in screenshots */}
        <div className="mb-10 flex items-center gap-2">
          <div className="flex-1 h-px bg-border" />
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Body */}
        <ArticleContent content={article.content} />

        {/* Continue learning */}
        {hasRelated && (
          <div className="mt-12 rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground">Continue Learning</h3>
              {unitName && unitName !== "Uncategorized" && (
                <span className="ml-auto text-xs text-muted-foreground">{unitName}</span>
              )}
            </div>
            <div className="p-4 space-y-4">
              {related.flashcards.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Flashcards</p>
                  <div className="space-y-2">
                    {related.flashcards.map((f: any) => (
                      <Link key={f.id} to={`/flashcards/${f.id}`}
                        className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] transition-all">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                          <GraduationCap className="h-4 w-4 text-amber-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{f.title}</p>
                          <p className="text-xs text-muted-foreground">{(f.cards as any[])?.length || 0} cards</p>
                        </div>
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground -rotate-90 shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {related.mcqs.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">MCQ Quizzes</p>
                  <div className="space-y-2">
                    {related.mcqs.map((m: any) => (
                      <Link key={m.id} to={`/mcqs/${m.id}`}
                        className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] transition-all">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                          <ListChecks className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                          <p className="text-xs text-muted-foreground">{(m.questions as any[])?.length || 0} questions</p>
                        </div>
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground -rotate-90 shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="h-10" />
      </div>
    </>
  );
}
