import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Calendar, Loader2, GraduationCap, ListChecks,
  ChevronDown, FileText, HelpCircle, BookOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getArticleById, getRelatedContent, getCategoryDisplayName, type Article } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { markArticleVisited } from "@/lib/progress-store";

// ── Inline renderer ───────────────────────────────────────────────────────────
function Inline({ text }: { text: string }) {
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
      {hasStar && <span className="ml-1 text-amber-400">★</span>}
    </>
  );
}

// ── Reading progress ──────────────────────────────────────────────────────────
function ReadingProgress() {
  const [w, setW] = useState(0);
  useEffect(() => {
    const fn = () => {
      const d = document.documentElement;
      const total = d.scrollHeight - d.clientHeight;
      setW(total > 0 ? (d.scrollTop / total) * 100 : 0);
    };
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-border/30">
      <div
        className="h-full transition-all duration-150 ease-out"
        style={{
          width: `${w}%`,
          background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.6))",
        }}
      />
    </div>
  );
}

// ── Table — mobile card layout + desktop horizontal scroll ───────────────────
function TableBlock({ lines }: { lines: string[] }) {
  const isSep = (l: string) => /^\|[-:\s|]+\|$/.test(l.trim());
  const parse = (l: string) =>
    l.trim().split("|").map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);

  const data = lines.filter(l => !isSep(l));
  if (data.length < 2) return null;
  const [hLine, ...bLines] = data;
  const headers = parse(hLine);
  const rows = bLines.map(parse);

  return (
    <div className="my-6 rounded-xl overflow-hidden border border-border/60 shadow-sm">
      {/* Mobile: stack each row as a card */}
      <div className="block sm:hidden">
        {rows.map((row, ri) => (
          <div
            key={ri}
            className="border-b border-border/40 last:border-0 p-4"
            style={{
              background: ri % 2 === 0 ? "hsl(var(--card))" : "hsl(var(--muted) / 0.2)",
            }}
          >
            {headers.map((h, ci) => (
              <div key={ci} className="flex gap-2 mb-2 last:mb-0">
                <span
                  className="text-[11px] font-bold uppercase tracking-wider shrink-0 pt-0.5 w-[90px]"
                  style={{ color: "hsl(var(--primary))" }}
                >
                  {h}
                </span>
                <span className="text-[14px] text-foreground/85 leading-snug flex-1">
                  {row[ci] ? <Inline text={row[ci]} /> : <span className="text-muted-foreground">—</span>}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Desktop: traditional table with horizontal scroll */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: `${Math.max(headers.length * 160, 400)}px` }}>
          <thead>
            <tr style={{ background: "hsl(var(--primary) / 0.08)" }}>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="px-4 py-3 text-left text-[12px] font-bold uppercase tracking-widest border-b border-border/50"
                  style={{ color: "hsl(var(--primary))" }}
                >
                  <Inline text={h} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className="border-b border-border/30 last:border-0 transition-colors hover:bg-muted/20"
                style={{ background: ri % 2 === 0 ? "hsl(var(--card))" : "hsl(var(--muted) / 0.15)" }}
              >
                {headers.map((_, ci) => (
                  <td key={ci} className="px-4 py-3 text-[14px] text-foreground/85 leading-relaxed align-top">
                    {row[ci] ? <Inline text={row[ci]} /> : <span className="text-muted-foreground">—</span>}
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

// ── Practice accordion ────────────────────────────────────────────────────────
function PracticeQuestion({ number, question, answer }: {
  number: string; question: string; answer: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-xl overflow-hidden border transition-all duration-200"
      style={{
        borderColor: open ? "hsl(var(--primary) / 0.4)" : "hsl(var(--border))",
        background: open ? "hsl(var(--primary) / 0.03)" : "hsl(var(--card))",
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors active:bg-muted/30"
      >
        <span
          className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold mt-0.5 transition-all"
          style={{
            background: open ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.15)",
            color: open ? "hsl(var(--primary-foreground))" : "hsl(var(--primary))",
          }}
        >
          {number}
        </span>
        <span className="flex-1 text-[15px] font-medium text-foreground leading-snug">
          <Inline text={question} />
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 mt-0.5 transition-transform duration-200`}
          style={{
            color: "hsl(var(--primary))",
            transform: open ? "rotate(180deg)" : "none",
          }}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="a"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div
              className="px-4 py-3.5 flex gap-3 border-t"
              style={{
                borderColor: "hsl(var(--primary) / 0.2)",
                background: "hsl(var(--primary) / 0.06)",
              }}
            >
              <span
                className="font-bold text-[15px] shrink-0 mt-0.5"
                style={{ color: "hsl(var(--primary))" }}
              >→</span>
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

// ── Article content renderer ──────────────────────────────────────────────────
let _sec = 0;

function ArticleContent({ content }: { content: string }) {
  _sec = 0;
  const lines = content.split("\n");
  const els: React.ReactNode[] = [];
  let listBuf: { type: "ul" | "ol"; items: React.ReactNode[] } | null = null;
  let inPractice = false;
  let tableBuf: string[] = [];
  const pqs: { number: string; question: string; answer: string }[] = [];

  const flushList = () => {
    if (!listBuf) return;
    els.push(
      <div key={`list-${els.length}`} className="mb-5 space-y-2">
        {listBuf.items}
      </div>
    );
    listBuf = null;
  };

  const flushTable = () => {
    if (tableBuf.length >= 2)
      els.push(<TableBlock key={`tbl-${els.length}`} lines={tableBuf} />);
    tableBuf = [];
  };

  const flushPractice = () => {
    if (!pqs.length) return;
    els.push(
      <div key={`pq-${els.length}`} className="my-8 rounded-2xl overflow-hidden border border-border/50" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/40" style={{ background: "hsl(var(--primary) / 0.06)" }}>
          <HelpCircle className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
          <span className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "hsl(var(--primary))" }}>
            Practice Questions
          </span>
          <span className="ml-auto text-[11px] text-muted-foreground italic">tap to reveal</span>
        </div>
        <div className="p-3 space-y-2">
          {pqs.map((q, k) => (
            <PracticeQuestion key={k} number={q.number} question={q.question} answer={q.answer} />
          ))}
        </div>
      </div>
    );
    pqs.length = 0;
  };

  lines.forEach((line, i) => {
    const t = line.trim();

    if (t.startsWith("|")) { flushList(); tableBuf.push(t); return; }
    else if (tableBuf.length) flushTable();

    if (!t) { flushList(); return; }

    // ## H2
    if (t.startsWith("## ")) {
      flushList();
      if (t.toLowerCase().includes("practice")) { inPractice = true; return; }
      flushPractice(); inPractice = false;
      _sec++;
      const n = _sec;
      const txt = t.slice(3).replace(/\*+/g, "").replace(/\s*⭐+/g, "").replace(/^\d+\.\s*/, "").trim();
      els.push(
        <div key={`h2-${i}`} className="mt-10 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="shrink-0 flex items-center justify-center rounded-lg text-[13px] font-bold"
              style={{
                width: "32px",
                height: "32px",
                minWidth: "32px",
                background: "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
              }}
            >
              {n}
            </div>
            <h2
              className="font-bold text-[18px] sm:text-[20px] uppercase tracking-wide leading-tight text-foreground"
            >
              {txt}
            </h2>
          </div>
          <div
            className="h-px w-full"
            style={{ background: "linear-gradient(90deg, hsl(var(--primary) / 0.5), transparent)" }}
          />
        </div>
      );
      return;
    }

    // ### H3
    if (t.startsWith("### ")) {
      flushList();
      const txt = t.slice(4).replace(/\*+/g, "").replace(/\s*⭐+/g, "").trim();
      els.push(
        <div key={`h3-${i}`} className="mt-5 mb-2.5 flex items-start gap-2.5">
          <div
            className="h-2 w-2 rounded-full shrink-0 mt-[9px]"
            style={{ background: "hsl(var(--primary))" }}
          />
          <h3 className="font-semibold text-[16px] sm:text-[17px] text-foreground leading-snug">{txt}</h3>
        </div>
      );
      return;
    }

    // Q→A
    const qa = t.match(/^(\d+)\.\s(.+?)\s*→\s*(.+)$/);
    if (qa) {
      flushList();
      if (inPractice) pqs.push({ number: qa[1], question: qa[2], answer: qa[3] });
      else els.push(
        <div
          key={`qa-${i}`}
          className="mb-3 rounded-xl border border-border/50 overflow-hidden"
          style={{ background: "hsl(var(--card))" }}
        >
          <div className="px-4 py-3 text-[15px] font-medium text-foreground border-b border-border/30">
            {qa[1]}. <Inline text={qa[2]} />
          </div>
          <div className="px-4 py-3 text-[15px] font-medium" style={{ color: "hsl(var(--primary))", background: "hsl(var(--primary) / 0.04)" }}>
            → <Inline text={qa[3]} />
          </div>
        </div>
      );
      return;
    }

    if (inPractice && /^\d+\.\s/.test(t) && !t.includes("→")) {
      const next = lines[i + 1]?.trim() ?? "";
      pqs.push({
        number: t.match(/^(\d+)/)?.[1] ?? "",
        question: t.replace(/^\d+\.\s/, ""),
        answer: next.startsWith("→") ? next.slice(1).trim() : "",
      });
      return;
    }
    if (inPractice && t.startsWith("→")) return;

    // Bullet
    if (t.startsWith("- ")) {
      if (!listBuf || listBuf.type !== "ul") { flushList(); listBuf = { type: "ul", items: [] }; }
      listBuf.items.push(
        <div key={`li-${i}`} className="flex items-start gap-3 py-0.5">
          <div
            className="rounded-full shrink-0 mt-[7px]"
            style={{ width: "6px", height: "6px", minWidth: "6px", background: "hsl(var(--primary) / 0.7)" }}
          />
          <span className="text-[15px] text-foreground/85 leading-relaxed flex-1">
            <Inline text={t.slice(2)} />
          </span>
        </div>
      );
      return;
    }

    // Numbered list
    if (/^\d+\.\s/.test(t) && !t.includes("→") && !inPractice) {
      if (!listBuf || listBuf.type !== "ol") { flushList(); listBuf = { type: "ol", items: [] }; }
      const num = t.match(/^(\d+)/)?.[1] ?? "";
      listBuf.items.push(
        <div key={`ol-${i}`} className="flex items-start gap-3 py-0.5">
          <div
            className="shrink-0 flex items-center justify-center rounded-full text-[11px] font-bold mt-[2px]"
            style={{
              width: "22px",
              height: "22px",
              minWidth: "22px",
              background: "hsl(var(--primary) / 0.12)",
              color: "hsl(var(--primary))",
            }}
          >
            {num}
          </div>
          <span className="text-[15px] text-foreground/85 leading-relaxed flex-1">
            <Inline text={t.replace(/^\d+\.\s/, "")} />
          </span>
        </div>
      );
      return;
    }

    // Paragraph
    flushList();
    els.push(
      <p key={`p-${i}`} className="mb-4 text-[15px] sm:text-[16px] leading-relaxed text-foreground/80">
        <Inline text={t} />
      </p>
    );
  });

  flushList(); flushTable(); flushPractice();
  return <div>{els}</div>;
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
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );

  if (!article) return (
    <div className="mx-auto max-w-2xl px-5 py-20 text-center">
      <p className="mb-6 text-muted-foreground">This article couldn't be found.</p>
      <Button asChild variant="outline" size="sm">
        <Link to="/blog"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Blog</Link>
      </Button>
    </div>
  );

  const date = new Date(article.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
  const unitName = getCategoryDisplayName(article.category);
  const hasRelated = related.flashcards.length > 0 || related.mcqs.length > 0;

  return (
    <>
      <ReadingProgress />

      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-10">

        {/* Back nav */}
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors mb-6 -ml-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Link>

        {/* Header card */}
        <div
          className="rounded-2xl p-5 sm:p-6 mb-8 border border-border/50"
          style={{ background: "hsl(var(--card))" }}
        >
          {/* Category + date */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {unitName && unitName !== "Uncategorized" && (
              <span
                className="text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                style={{
                  background: "hsl(var(--primary) / 0.12)",
                  color: "hsl(var(--primary))",
                }}
              >
                {unitName}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {date}
            </span>
          </div>

          {/* Title */}
          <h1 className="font-bold text-[22px] sm:text-[28px] leading-tight text-foreground break-words">
            {article.title}
          </h1>

          {/* Reading indicator */}
          <div className="flex items-center gap-1.5 mt-3">
            <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[12px] text-muted-foreground">
              {Math.ceil(article.content.split(" ").length / 200)} min read
            </span>
          </div>
        </div>

        {/* Body */}
        <ArticleContent content={article.content} />

        {/* Continue learning */}
        {hasRelated && (
          <div
            className="mt-12 rounded-2xl overflow-hidden border border-border/50"
            style={{ background: "hsl(var(--card))" }}
          >
            <div
              className="px-4 sm:px-5 py-3.5 border-b border-border/40 flex items-center gap-2"
              style={{ background: "hsl(var(--primary) / 0.06)" }}
            >
              <FileText className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
              <span className="font-semibold text-[15px] text-foreground">Continue Learning</span>
              {unitName && unitName !== "Uncategorized" && (
                <span className="ml-auto text-[12px] text-muted-foreground">{unitName}</span>
              )}
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {related.flashcards.length > 0 && (
                <div>
                  <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Flashcards</p>
                  <div className="space-y-2">
                    {related.flashcards.map((f: any) => (
                      <Link
                        key={f.id}
                        to={`/flashcards/${f.id}`}
                        className="flex items-center gap-3 rounded-xl border border-border/50 p-3.5 transition-all hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98]"
                        style={{ background: "hsl(var(--background))" }}
                      >
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                          style={{ background: "hsl(45 100% 50% / 0.12)" }}
                        >
                          <GraduationCap className="h-4 w-4" style={{ color: "hsl(45 100% 45%)" }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-medium text-foreground truncate">{f.title}</p>
                          <p className="text-[12px] text-muted-foreground">{(f.cards as any[])?.length || 0} cards</p>
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground -rotate-90 shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {related.mcqs.length > 0 && (
                <div>
                  <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">MCQ Quizzes</p>
                  <div className="space-y-2">
                    {related.mcqs.map((m: any) => (
                      <Link
                        key={m.id}
                        to={`/mcqs/${m.id}`}
                        className="flex items-center gap-3 rounded-xl border border-border/50 p-3.5 transition-all hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98]"
                        style={{ background: "hsl(var(--background))" }}
                      >
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                          style={{ background: "hsl(152 60% 50% / 0.12)" }}
                        >
                          <ListChecks className="h-4 w-4" style={{ color: "hsl(152 60% 40%)" }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-medium text-foreground truncate">{m.title}</p>
                          <p className="text-[12px] text-muted-foreground">{(m.questions as any[])?.length || 0} questions</p>
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground -rotate-90 shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="h-16" />
      </div>
    </>
  );
}
