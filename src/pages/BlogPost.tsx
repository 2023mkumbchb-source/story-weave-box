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
          return <strong key={j} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
          return <em key={j}>{part.slice(1, -1)}</em>;
        return <span key={j}>{part.replace(/\*/g, "")}</span>;
      })}
      {hasStar && <span className="ml-1">⭐</span>}
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
    <div className="fixed top-0 left-0 right-0 z-50 h-[3px]">
      <div className="h-full bg-primary transition-all duration-100" style={{ width: `${w}%` }} />
    </div>
  );
}

// ── Table — classic, horizontally scrollable, full-bleed on mobile ───────────
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
    <div className="my-6">
      {/* Full-bleed on mobile: negative margin pulls to edge, padding restores inside */}
      <div
        className="-mx-5 sm:mx-0 overflow-x-auto"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="px-5 sm:px-0" style={{ minWidth: "max-content" }}>
          <table
            className="w-full border-collapse"
            style={{
              minWidth: `${Math.max(headers.length * 155, 400)}px`,
              borderRadius: "12px",
              overflow: "hidden",
              border: "1px solid hsl(var(--border))",
            }}
          >
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th
                    key={i}
                    className="px-4 py-3 text-left text-[13px] font-extrabold uppercase tracking-widest"
                    style={{
                      background: "hsl(var(--primary) / 0.10)",
                      color: "hsl(var(--primary))",
                      borderBottom: "2px solid hsl(var(--primary) / 0.2)",
                      whiteSpace: "nowrap",
                    }}
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
                  style={{
                    background: ri % 2 === 0 ? "hsl(var(--card))" : "hsl(var(--muted) / 0.3)",
                    borderBottom: ri < rows.length - 1 ? "1px solid hsl(var(--border) / 0.4)" : "none",
                  }}
                >
                  {headers.map((_, ci) => (
                    <td
                      key={ci}
                      className="px-4 py-3.5 text-[16px] leading-snug align-top"
                      style={{
                        color: "hsl(var(--foreground) / 0.85)",
                        minWidth: ci === 0 ? "110px" : "140px",
                      }}
                    >
                      {row[ci] ? <Inline text={row[ci]} /> : <span className="text-muted-foreground/30">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-1.5 text-right text-[12px] italic text-muted-foreground/40 sm:hidden pr-1">
        swipe to scroll →
      </p>
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
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        border: `1px solid ${open ? "hsl(var(--primary) / 0.4)" : "hsl(var(--border))"}`,
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 px-4 py-4 text-left hover:bg-muted/20 active:bg-muted/40 transition-colors"
      >
        <span
          className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-[14px] font-bold mt-0.5 transition-all"
          style={{
            background: open ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.15)",
            color: open ? "hsl(var(--primary-foreground))" : "hsl(var(--primary))",
          }}
        >
          {number}
        </span>
        <span className="flex-1 text-[17px] font-medium text-foreground leading-snug">
          <Inline text={question} />
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground mt-0.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="a"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div
              className="px-4 py-4 border-t flex gap-3"
              style={{
                borderColor: "hsl(var(--primary) / 0.2)",
                background: "hsl(var(--primary) / 0.05)",
              }}
            >
              <span className="font-bold text-[17px] shrink-0 mt-0.5" style={{ color: "hsl(var(--primary))" }}>→</span>
              <p className="text-[17px] text-foreground/90 leading-relaxed">
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
      <div key={`list-${els.length}`} className="mb-5 space-y-3">
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
      <div key={`pq-${els.length}`} className="my-6">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="h-5 w-5" style={{ color: "hsl(var(--primary))" }} />
          <span className="text-[13px] font-bold uppercase tracking-wider" style={{ color: "hsl(var(--primary))" }}>
            Practice Questions
          </span>
          <span className="ml-auto text-[12px] text-muted-foreground italic">tap to reveal</span>
        </div>
        <div className="space-y-3">
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
        <div key={`h2-${i}`} className="mt-12 mb-5">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="shrink-0 flex items-center justify-center rounded-xl font-bold text-[17px]"
              style={{
                width: "42px",
                height: "42px",
                minWidth: "42px",
                background: "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
              }}
            >
              {n}
            </div>
            <h2 className="font-bold text-[20px] sm:text-[22px] uppercase tracking-wide text-foreground leading-tight">
              {txt}
            </h2>
          </div>
          <div
            className="h-px"
            style={{ background: "linear-gradient(to right, hsl(var(--primary) / 0.45), transparent 70%)" }}
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
        <div key={`h3-${i}`} className="mt-6 mb-3 flex items-start gap-3">
          <div
            className="rounded-full bg-primary shrink-0"
            style={{ width: "9px", height: "9px", minWidth: "9px", marginTop: "10px" }}
          />
          <h3 className="font-bold text-[19px] sm:text-[20px] text-foreground leading-snug">{txt}</h3>
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
        <div key={`qa-${i}`} className="mb-4 rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 text-[17px] font-medium text-foreground border-b border-border/60">
            {qa[1]}. <Inline text={qa[2]} />
          </div>
          <div
            className="px-5 py-4 text-[17px] font-semibold"
            style={{ color: "hsl(var(--primary))", background: "hsl(var(--primary) / 0.05)" }}
          >
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
        <div key={`li-${i}`} className="flex items-start gap-3">
          <div
            className="rounded-full bg-primary shrink-0"
            style={{ width: "8px", height: "8px", minWidth: "8px", marginTop: "10px" }}
          />
          <span className="text-[17px] text-foreground/90 leading-relaxed flex-1">
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
        <div key={`ol-${i}`} className="flex items-start gap-3">
          <div
            className="shrink-0 flex items-center justify-center rounded-full"
            style={{
              width: "26px", height: "26px", minWidth: "26px", marginTop: "1px",
              background: "hsl(var(--primary) / 0.12)",
              color: "hsl(var(--primary))",
              fontSize: "13px", fontWeight: "700",
            }}
          >
            {num}
          </div>
          <span className="text-[17px] text-foreground/90 leading-relaxed flex-1">
            <Inline text={t.replace(/^\d+\.\s/, "")} />
          </span>
        </div>
      );
      return;
    }

    // Paragraph
    flushList();
    els.push(
      <p key={`p-${i}`} className="mb-4 text-[17px] leading-relaxed text-foreground/85">
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
  const readTime = Math.ceil(article.content.split(" ").length / 200);

  return (
    <>
      <ReadingProgress />

      <div className="mx-auto max-w-3xl px-5 sm:px-6 py-8 sm:py-12">

        {/* Back */}
        <Button asChild variant="ghost" size="sm" className="mb-8 gap-2 text-muted-foreground -ml-2">
          <Link to="/blog"><ArrowLeft className="h-5 w-5" /> Back to Blog</Link>
        </Button>

        {/* Meta */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {unitName && unitName !== "Uncategorized" && (
            <span
              className="rounded-full px-3 py-1 text-[13px] font-bold uppercase tracking-wider"
              style={{
                background: "hsl(var(--primary) / 0.12)",
                color: "hsl(var(--primary))",
              }}
            >
              {unitName}
            </span>
          )}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-[15px]">{date}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span className="text-[15px]">{readTime} min read</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="mb-3 font-bold text-[26px] sm:text-[32px] leading-tight text-foreground break-words">
          {article.title}
        </h1>

        {/* Gradient divider */}
        <div
          className="mb-10 h-px"
          style={{ background: "linear-gradient(to right, hsl(var(--primary) / 0.5), hsl(var(--border)), transparent)" }}
        />

        {/* Body */}
        <ArticleContent content={article.content} />

        {/* Continue learning */}
        {hasRelated && (
          <div className="mt-14 rounded-2xl border border-border bg-card overflow-hidden">
            <div
              className="px-5 py-4 border-b border-border flex items-center gap-2"
              style={{ background: "hsl(var(--primary) / 0.05)" }}
            >
              <FileText className="h-5 w-5" style={{ color: "hsl(var(--primary))" }} />
              <h3 className="font-semibold text-[17px] text-foreground">Continue Learning</h3>
              {unitName && unitName !== "Uncategorized" && (
                <span className="ml-auto text-[13px] text-muted-foreground">{unitName}</span>
              )}
            </div>
            <div className="p-5 space-y-5">
              {related.flashcards.length > 0 && (
                <div>
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Flashcards</p>
                  <div className="space-y-2">
                    {related.flashcards.map((f: any) => (
                      <Link
                        key={f.id}
                        to={`/flashcards/${f.id}`}
                        className="flex items-center gap-4 rounded-xl border border-border bg-background p-4 hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] transition-all"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                          <GraduationCap className="h-5 w-5 text-amber-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[16px] font-medium text-foreground truncate">{f.title}</p>
                          <p className="text-[13px] text-muted-foreground">{(f.cards as any[])?.length || 0} cards</p>
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground -rotate-90 shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {related.mcqs.length > 0 && (
                <div>
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">MCQ Quizzes</p>
                  <div className="space-y-2">
                    {related.mcqs.map((m: any) => (
                      <Link
                        key={m.id}
                        to={`/mcqs/${m.id}`}
                        className="flex items-center gap-4 rounded-xl border border-border bg-background p-4 hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] transition-all"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                          <ListChecks className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[16px] font-medium text-foreground truncate">{m.title}</p>
                          <p className="text-[13px] text-muted-foreground">{(m.questions as any[])?.length || 0} questions</p>
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

        <div className="h-12" />
      </div>
    </>
  );
}
