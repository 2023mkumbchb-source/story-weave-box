import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Calendar, Loader2, GraduationCap, ListChecks,
  ChevronDown, FileText, HelpCircle, BookOpen, Star,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getArticleById, getRelatedContent, getCategoryDisplayName, type Article } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { markArticleVisited } from "@/lib/progress-store";

// ── Inline markdown renderer ──────────────────────────────────────────────────
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
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
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-border/40">
      <div
        className="h-full bg-primary transition-all duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// ── Table: stacked cards on mobile, normal table on desktop ───────────────────
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
    <>
      {/* ── MOBILE: stacked cards (no clipping ever) ── */}
      <div className="my-5 space-y-2 sm:hidden">
        {rows.map((row, ri) => (
          <div key={ri} className="rounded-xl border border-border bg-card overflow-hidden">
            {row[0] && (
              <div className="px-4 py-3 bg-primary/8 border-b border-border/70">
                <p className="text-sm font-bold text-foreground leading-snug">
                  <Inline text={row[0]} />
                </p>
              </div>
            )}
            <div className="divide-y divide-border/40 px-4">
              {headers.slice(1).map((h, hi) =>
                row[hi + 1] ? (
                  <div key={hi} className="py-2.5 flex gap-3 items-baseline">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary/55 w-[88px] shrink-0 leading-snug pt-0.5">
                      <Inline text={h} />
                    </span>
                    <span className="text-[13px] text-foreground/85 leading-snug flex-1">
                      <Inline text={row[hi + 1]} />
                    </span>
                  </div>
                ) : null
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── DESKTOP: traditional table ── */}
      <div className="my-5 hidden sm:block overflow-x-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {headers.map((h, i) => (
                <th key={i} className="py-2.5 px-4 text-left text-xs font-bold uppercase tracking-wider text-primary/70 whitespace-nowrap">
                  <Inline text={h} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                {row.map((cell, ci) => (
                  <td key={ci} className={`py-2.5 px-4 leading-snug ${ci === 0 ? "font-semibold text-foreground whitespace-nowrap" : "text-foreground/85"}`}>
                    <Inline text={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
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
        className="w-full flex items-start gap-3 px-4 py-4 text-left hover:bg-muted/30 active:bg-muted/50 transition-colors"
      >
        <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold mt-0.5">
          {number}
        </span>
        <span className="flex-1 text-sm font-medium text-foreground leading-snug">
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
              <p className="text-sm text-foreground/90 leading-relaxed">
                <Inline text={answer} />
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Collapsible Table of Contents ─────────────────────────────────────────────
function SectionNav({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  const sections = content
    .split("\n")
    .filter(l => l.trim().startsWith("## ") && !l.toLowerCase().includes("practice"))
    .map(l => l.trim().slice(3).replace(/\*+/g, "").replace(/\s*⭐+/g, "").trim());

  if (sections.length < 3) return null;
  return (
    <div className="mb-8 rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left bg-muted/30 hover:bg-muted/50 active:bg-muted/60 transition-colors"
      >
        <BookOpen className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-semibold text-foreground flex-1">Table of Contents</span>
        <span className="text-xs text-muted-foreground mr-1">{sections.length} sections</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border divide-y divide-border/40 bg-background">
              {sections.map((s, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-xs font-bold text-primary/50 w-5 shrink-0 text-right tabular-nums">{i + 1}</span>
                  <span className="text-sm text-foreground/80 leading-snug">{s}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── High-yield callout ────────────────────────────────────────────────────────
function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
      <Star className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" fill="currentColor" />
      <div className="text-sm leading-relaxed text-foreground/90 flex-1">{children}</div>
    </div>
  );
}

// ── Full article content renderer ─────────────────────────────────────────────
function ArticleContent({ content }: { content: string }) {
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
      <Tag key={`list-${elements.length}`}
        className={`mb-5 space-y-2 pl-5 ${listBuffer.type === "ul" ? "list-disc" : "list-decimal"} marker:text-primary/50`}>
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
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Practice Questions</span>
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

    // Table rows — collect
    if (trimmed.startsWith("|")) {
      flushList();
      tableBuffer.push(trimmed);
      return;
    } else if (tableBuffer.length) {
      flushTable();
    }

    if (!trimmed) { flushList(); return; }

    // H2
    if (trimmed.startsWith("## ")) {
      flushList();
      if (trimmed.toLowerCase().includes("practice")) { inPractice = true; return; }
      flushPractice();
      inPractice = false;
      const text = trimmed.slice(3).replace(/\*+/g, "").replace(/\s*⭐+/g, "").trim();
      elements.push(
        <div key={`h2-${i}`} className="mt-10 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-5 w-1 rounded-full bg-primary shrink-0" />
            <h2 className="font-bold text-lg sm:text-xl text-foreground leading-snug"><Inline text={text} /></h2>
          </div>
          <div className="mt-2.5 border-b border-border/60" />
        </div>
      );
      return;
    }

    // H3
    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h3 key={`h3-${i}`} className="mt-6 mb-2.5 font-semibold text-[15px] sm:text-base text-foreground">
          <Inline text={trimmed.slice(4).replace(/\*+/g, "")} />
        </h3>
      );
      return;
    }

    // High-yield callout
    if (trimmed.includes("⭐⭐⭐") || trimmed.toUpperCase().startsWith("MUST MEMORIZE")) {
      flushList();
      const clean = trimmed.replace(/⭐+/g, "").replace(/\*+/g, "").trim();
      if (clean) elements.push(<Callout key={`callout-${i}`}><Inline text={clean} /></Callout>);
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
            <p className="text-sm font-medium text-foreground">{qaMatch[1]}. <Inline text={qaMatch[2]} /></p>
            <p className="mt-1.5 text-sm text-primary font-medium">→ <Inline text={qaMatch[3]} /></p>
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

    // Bullet list
    if (trimmed.startsWith("- ")) {
      if (!listBuffer || listBuffer.type !== "ul") { flushList(); listBuffer = { type: "ul", items: [] }; }
      listBuffer.items.push(
        <li key={`li-${i}`} className="text-[15px] text-foreground/85 leading-relaxed">
          <Inline text={trimmed.slice(2)} />
        </li>
      );
      return;
    }

    // Numbered list
    if (/^\d+\.\s/.test(trimmed) && !trimmed.includes("→") && !inPractice) {
      if (!listBuffer || listBuffer.type !== "ol") { flushList(); listBuffer = { type: "ol", items: [] }; }
      listBuffer.items.push(
        <li key={`oli-${i}`} className="text-[15px] text-foreground/85 leading-relaxed">
          <Inline text={trimmed.replace(/^\d+\.\s/, "")} />
        </li>
      );
      return;
    }

    // Paragraph
    flushList();
    elements.push(
      <p key={`p-${i}`} className="mb-3 leading-relaxed text-foreground/85 text-[15px]">
        <Inline text={trimmed} />
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

        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2 gap-2 text-muted-foreground">
          <Link to="/blog"><ArrowLeft className="h-4 w-4" /> Blog</Link>
        </Button>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span className="text-xs">{date}</span>
          </div>
          {unitName && unitName !== "Uncategorized" && (
            <>
              <span className="text-border text-xs">·</span>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{unitName}</span>
            </>
          )}
        </div>

        <h1 className="mb-8 font-bold text-2xl sm:text-3xl md:text-4xl leading-tight text-foreground break-words">
          {article.title}
        </h1>

        <SectionNav content={article.content} />

        <ArticleContent content={article.content} />

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
