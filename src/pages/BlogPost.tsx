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

// ── Inline renderer — preserves ⭐ exactly where it appears ──────────────────
function Inline({ text, star = true }: { text: string; star?: boolean }) {
  const hasStar = star && text.includes("⭐");
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
      setW(d.scrollHeight - d.clientHeight > 0 ? (d.scrollTop / (d.scrollHeight - d.clientHeight)) * 100 : 0);
    };
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-transparent">
      <div className="h-full bg-primary transition-all duration-100" style={{ width: `${w}%` }} />
    </div>
  );
}

// ── Swipeable table — exactly matching screenshots ────────────────────────────
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
      <div className="text-right pr-1 mb-1.5">
        <span className="text-sm text-muted-foreground/50 italic">← swipe →</span>
      </div>
      <div className="overflow-x-auto">
        <table className="border-collapse" style={{ minWidth: `${headers.length * 160}px`, width: "100%" }}>
          <thead>
            <tr className="border-b-2 border-border">
              {headers.map((h, i) => (
                <th key={i} className="pb-3 pr-6 text-left font-bold text-[17px] text-foreground first:pl-0 whitespace-nowrap">
                  <Inline text={h} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-border/40 last:border-0">
                {row.map((cell, ci) => (
                  <td key={ci} className="py-4 pr-6 align-top first:pl-0 text-[16px] leading-relaxed text-foreground/85">
                    <Inline text={cell} />
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
    <div className="rounded-2xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-muted/20 active:bg-muted/40 transition-colors"
      >
        <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500 text-sm font-bold mt-0.5">
          {number}
        </span>
        <span className="flex-1 text-[17px] font-medium text-foreground leading-snug">
          <Inline text={question} />
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground mt-0.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
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
            <div className="px-5 py-4 border-t border-border bg-emerald-500/5 flex gap-3">
              <span className="text-emerald-500 font-bold text-[17px] shrink-0 mt-0.5">→</span>
              <p className="text-[17px] text-foreground/90 leading-relaxed"><Inline text={answer} /></p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Content renderer ──────────────────────────────────────────────────────────
let sectionNum = 0;

function ArticleContent({ content }: { content: string }) {
  sectionNum = 0;
  const lines = content.split("\n");
  const els: React.ReactNode[] = [];
  let listBuf: { type: "ul" | "ol"; items: React.ReactNode[] } | null = null;
  let inPractice = false;
  let tableBuf: string[] = [];
  const practiceQ: { number: string; question: string; answer: string }[] = [];

  const flushList = () => {
    if (!listBuf) return;
    els.push(
      <div key={`list-${els.length}`} className={`mb-5 space-y-3`}>
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
    if (!practiceQ.length) return;
    els.push(
      <div key={`pq-${els.length}`} className="my-6">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="h-5 w-5 text-emerald-500" />
          <span className="text-[13px] font-bold uppercase tracking-wider text-emerald-500">Practice Questions</span>
          <span className="ml-auto text-[12px] text-muted-foreground italic">tap to reveal</span>
        </div>
        <div className="space-y-3">
          {practiceQ.map((q, k) => (
            <PracticeQuestion key={k} number={q.number} question={q.question} answer={q.answer} />
          ))}
        </div>
      </div>
    );
    practiceQ.length = 0;
  };

  lines.forEach((line, i) => {
    const t = line.trim();

    // table rows
    if (t.startsWith("|")) { flushList(); tableBuf.push(t); return; }
    else if (tableBuf.length) flushTable();

    if (!t) { flushList(); return; }

    // ## H2 — numbered badge
    if (t.startsWith("## ")) {
      flushList();
      if (t.toLowerCase().includes("practice")) { inPractice = true; return; }
      flushPractice(); inPractice = false;
      sectionNum++;
      const n = sectionNum;
      const txt = t.slice(3).replace(/\*+/g, "").replace(/\s*⭐+/g, "").replace(/^\d+\.\s*/, "").trim();
      els.push(
        <div key={`h2-${i}`} className="mt-12 mb-6">
          <div className="flex items-center gap-4 mb-4">
            {/* Badge exactly like screenshots — rounded square, blue */}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/20">
              <span className="font-bold text-[18px] text-primary">{n}</span>
            </div>
            <h2 className="font-bold text-[22px] uppercase tracking-wide text-foreground leading-tight">
              {txt}
            </h2>
          </div>
          <div className="border-b border-border/60" />
        </div>
      );
      return;
    }

    // ### H3 — bold sub-heading with blue dot (like "Pathway", "Structural Units")
    if (t.startsWith("### ")) {
      flushList();
      const txt = t.slice(4).replace(/\*+/g, "").replace(/\s*⭐+/g, "").trim();
      els.push(
        <div key={`h3-${i}`} className="mt-7 mb-4 flex items-start gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-primary mt-[6px] shrink-0" />
          <h3 className="font-bold text-[19px] text-foreground leading-snug">{txt}</h3>
        </div>
      );
      return;
    }

    // Q→A
    const qa = t.match(/^(\d+)\.\s(.+?)\s*→\s*(.+)$/);
    if (qa) {
      flushList();
      if (inPractice) practiceQ.push({ number: qa[1], question: qa[2], answer: qa[3] });
      else els.push(
        <div key={`qa-${i}`} className="mb-4 rounded-2xl border border-border bg-card p-5">
          <p className="text-[17px] font-medium text-foreground">{qa[1]}. <Inline text={qa[2]} /></p>
          <p className="mt-2 text-[17px] text-primary font-semibold">→ <Inline text={qa[3]} /></p>
        </div>
      );
      return;
    }

    // practice standalone Q
    if (inPractice && /^\d+\.\s/.test(t) && !t.includes("→")) {
      const next = lines[i + 1]?.trim() ?? "";
      practiceQ.push({
        number: t.match(/^(\d+)/)?.[1] ?? "",
        question: t.replace(/^\d+\.\s/, ""),
        answer: next.startsWith("→") ? next.slice(1).trim() : "",
      });
      return;
    }
    if (inPractice && t.startsWith("→")) return;

    // Bullet — big blue dot + large font matching screenshots
    if (t.startsWith("- ")) {
      if (!listBuf || listBuf.type !== "ul") { flushList(); listBuf = { type: "ul", items: [] }; }
      listBuf.items.push(
        <div key={`li-${i}`} className="flex items-start gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-primary/70 mt-[9px] shrink-0" />
          <span className="text-[17px] text-foreground/90 leading-relaxed flex-1">
            <Inline text={t.slice(2)} />
          </span>
        </div>
      );
      return;
    }

    // Numbered list — circle badges
    if (/^\d+\.\s/.test(t) && !t.includes("→") && !inPractice) {
      if (!listBuf || listBuf.type !== "ol") { flushList(); listBuf = { type: "ol", items: [] }; }
      const num = t.match(/^(\d+)/)?.[1] ?? "";
      listBuf.items.push(
        <div key={`ol-${i}`} className="flex items-start gap-3">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 mt-[2px]">
            <span className="text-[13px] font-bold text-primary leading-none">{num}</span>
          </div>
          <span className="text-[17px] text-foreground/90 leading-relaxed flex-1">
            <Inline text={t.replace(/^\d+\.\s/, "")} />
          </span>
        </div>
      );
      return;
    }

    // paragraph
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

  return (
    <>
      <ReadingProgress />
      <div className="mx-auto max-w-3xl px-5 sm:px-6 py-8 sm:py-12">

        {/* Back */}
        <Button asChild variant="ghost" size="sm" className="mb-8 gap-2 text-muted-foreground -ml-2 text-[16px]">
          <Link to="/blog"><ArrowLeft className="h-5 w-5" /> Back to Blog</Link>
        </Button>

        {/* Meta */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-[15px]">{date}</span>
          </div>
          {unitName && unitName !== "Uncategorized" && (
            <span className="rounded-full bg-primary/15 px-3 py-1 text-[13px] font-bold uppercase tracking-wider text-primary">
              {unitName}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="mb-8 font-bold text-[28px] sm:text-[36px] leading-tight text-foreground break-words uppercase tracking-wide">
          {article.title}
        </h1>

        {/* Decorative divider */}
        <div className="mb-10 flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <div className="h-2 w-2 rounded-full bg-primary" />
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Article body */}
        <ArticleContent content={article.content} />

        {/* Continue learning */}
        {hasRelated && (
          <div className="mt-14 rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-5 border-b border-border flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
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
                      <Link key={f.id} to={`/flashcards/${f.id}`}
                        className="flex items-center gap-4 rounded-xl border border-border bg-background p-4 hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] transition-all">
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
                      <Link key={m.id} to={`/mcqs/${m.id}`}
                        className="flex items-center gap-4 rounded-xl border border-border bg-background p-4 hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] transition-all">
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
