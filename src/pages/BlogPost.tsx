import { useState, useEffect } from "react";
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
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={j} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
          return <em key={j}>{part.slice(1, -1)}</em>;
        return <span key={j}>{part.replace(/\*/g, "")}</span>;
      })}
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
        className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5">
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
            <div className="px-4 py-3.5 border-t border-border bg-emerald-500/5 flex items-start gap-3">
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

// ── Content renderer (previous working version + practice Q accordion) ────────
function ArticleContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listBuffer: { type: "ul" | "ol"; items: React.ReactNode[] } | null = null;
  // Collect practice Q→A pairs under a Practice heading
  let inPractice = false;
  const practiceItems: { number: string; question: string; answer: string }[] = [];

  const flushList = () => {
    if (!listBuffer) return;
    const Tag = listBuffer.type === "ul" ? "ul" : "ol";
    elements.push(
      <Tag key={`list-${elements.length}`} className="mb-4 space-y-2 pl-5 list-disc marker:text-primary/50">
        {listBuffer.items}
      </Tag>
    );
    listBuffer = null;
  };

  const flushPractice = () => {
    if (!practiceItems.length) return;
    elements.push(
      <div key={`practice-${elements.length}`} className="my-5">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="h-4 w-4 text-emerald-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Practice Questions</span>
          <span className="ml-auto text-[10px] text-muted-foreground italic">tap to reveal answer</span>
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

    if (!trimmed) {
      flushList();
      return;
    }

    // Detect practice section heading
    if (trimmed.startsWith("## ") && trimmed.toLowerCase().includes("practice")) {
      flushList();
      inPractice = true;
      return;
    }

    // Any other ## heading ends practice mode
    if (trimmed.startsWith("## ") && !trimmed.toLowerCase().includes("practice")) {
      flushPractice();
      inPractice = false;
      flushList();
      elements.push(
        <h2 key={`h2-${i}`} className="mt-10 mb-4 font-display text-2xl font-bold text-foreground border-b border-border pb-2">
          <Inline text={trimmed.slice(3).replace(/\*+/g, "")} />
        </h2>
      );
      return;
    }

    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h3 key={`h3-${i}`} className="mt-6 mb-2 font-display text-xl font-bold text-foreground">
          <Inline text={trimmed.slice(4).replace(/\*+/g, "")} />
        </h3>
      );
      return;
    }

    // Q→A line (practice questions)
    const qaMatch = trimmed.match(/^(\d+)\.\s(.+?)\s*→\s*(.+)$/);
    if (qaMatch) {
      flushList();
      if (inPractice) {
        practiceItems.push({ number: qaMatch[1], question: qaMatch[2], answer: qaMatch[3] });
      } else {
        elements.push(
          <div key={`qa-${i}`} className="mb-3 rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-medium text-foreground">{qaMatch[1]}. <Inline text={qaMatch[2]} /></p>
            <p className="mt-1.5 text-sm text-primary font-medium">→ <Inline text={qaMatch[3]} /></p>
          </div>
        );
      }
      return;
    }

    // Standalone numbered question (no arrow yet) — buffer for next line
    if (inPractice && /^\d+\.\s/.test(trimmed) && !trimmed.includes("→")) {
      // Look ahead for arrow on next line
      const nextLine = lines[i + 1]?.trim() ?? "";
      if (nextLine.startsWith("→")) {
        practiceItems.push({
          number: trimmed.match(/^(\d+)/)?.[1] ?? "",
          question: trimmed.replace(/^\d+\.\s/, ""),
          answer: nextLine.slice(1).trim(),
        });
      } else {
        practiceItems.push({
          number: trimmed.match(/^(\d+)/)?.[1] ?? "",
          question: trimmed.replace(/^\d+\.\s/, ""),
          answer: "",
        });
      }
      return;
    }

    // Skip standalone arrow lines (already consumed above)
    if (inPractice && trimmed.startsWith("→")) return;

    // Bullet list
    if (trimmed.startsWith("- ")) {
      if (!listBuffer || listBuffer.type !== "ul") {
        flushList();
        listBuffer = { type: "ul", items: [] };
      }
      listBuffer.items.push(
        <li key={`li-${i}`} className="text-foreground/90 leading-relaxed">
          <Inline text={trimmed.slice(2)} />
        </li>
      );
      return;
    }

    // Numbered list (non-practice, no arrow)
    if (/^\d+\.\s/.test(trimmed) && !trimmed.includes("→") && !inPractice) {
      if (!listBuffer || listBuffer.type !== "ol") {
        flushList();
        listBuffer = { type: "ol", items: [] };
      }
      listBuffer.items.push(
        <li key={`oli-${i}`} className="text-foreground/90 leading-relaxed">
          <Inline text={trimmed.replace(/^\d+\.\s/, "")} />
        </li>
      );
      return;
    }

    // Plain paragraph
    flushList();
    elements.push(
      <p key={`p-${i}`} className="mb-3 leading-relaxed text-foreground/90 text-[15px]">
        <Inline text={trimmed} />
      </p>
    );
  });

  flushList();
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
      <h1 className="mb-4 font-display text-3xl font-bold text-foreground">Article not found</h1>
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
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-12">
      <Button asChild variant="ghost" size="sm" className="mb-8 gap-2 text-muted-foreground">
        <Link to="/blog"><ArrowLeft className="h-4 w-4" /> Back to Blog</Link>
      </Button>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>{date}</span>
        </div>
        {unitName && unitName !== "Uncategorized" && (
          <>
            <span>·</span>
            <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
              {unitName}
            </span>
          </>
        )}
      </div>

      <h1 className="mb-8 font-display text-3xl font-bold leading-tight text-foreground md:text-4xl break-words">
        {article.title}
      </h1>

      <div className="max-w-none overflow-hidden">
        <ArticleContent content={article.content} />
      </div>

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
                      className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 hover:border-primary/40 hover:bg-primary/5 transition-colors">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                        <GraduationCap className="h-4 w-4 text-amber-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{f.title}</p>
                        <p className="text-xs text-muted-foreground">{(f.cards as any[])?.length || 0} cards</p>
                      </div>
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
                      className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 hover:border-primary/40 hover:bg-primary/5 transition-colors">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                        <ListChecks className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                        <p className="text-xs text-muted-foreground">{(m.questions as any[])?.length || 0} questions</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
