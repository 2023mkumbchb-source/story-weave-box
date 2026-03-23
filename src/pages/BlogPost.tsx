import { useState, useEffect, useMemo, useLayoutEffect, forwardRef, memo } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, Loader2, GraduationCap, ListChecks,
  ChevronDown, ChevronRight, FileText, HelpCircle, Sparkles, GitMerge, Settings2, ImagePlus,
} from "lucide-react";
import ShareButtons from "@/components/ShareButtons";
import { motion, AnimatePresence } from "framer-motion";
import { getArticleBySlugOrId, getRelatedContent, getCategoryDisplayName, getYearFromCategory, buildBlogPath, type Article } from "@/lib/store";
import { extractFirstImageFromContent, SITE_URL, stripRichText } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { markArticleVisited } from "@/lib/progress-store";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

/* ─── Inline text: bold/italic ─── */
const Inline = forwardRef<HTMLSpanElement, { text: string }>(({ text }, ref) => {
  const parts = text.replace(/⭐+/g, "").split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <span ref={ref}>
      {parts.map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={j} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
          return <em key={j} className="text-foreground/80">{part.slice(1, -1)}</em>;
        return <span key={j}>{part.replace(/\*/g, "")}</span>;
      })}
    </span>
  );
});
Inline.displayName = "Inline";

/* ─── Reading progress bar + dot ─── */
function ReadingProgress() {
  const [pct, setPct] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fn = () => {
      const d = document.documentElement;
      const total = d.scrollHeight - d.clientHeight;
      setPct(total > 0 ? (d.scrollTop / total) * 100 : 0);
    };
    window.addEventListener("scroll", fn, { passive: true });
    fn();
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const rounded = Math.max(0, Math.min(100, Math.round(pct)));

  // Red → Orange → Yellow → Green
  const getColor = (p: number) => {
    if (p < 25) return { bg: "bg-red-500", bar: "from-red-500 to-red-400" };
    if (p < 50) return { bg: "bg-orange-500", bar: "from-red-500 via-orange-500 to-orange-400" };
    if (p < 75) return { bg: "bg-yellow-500", bar: "from-red-500 via-orange-500 to-yellow-500" };
    return { bg: "bg-green-500", bar: "from-red-500 via-orange-500 via-yellow-500 to-green-500" };
  };
  const colors = getColor(rounded);

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-50 h-[3px]">
        <div className={`h-full bg-gradient-to-r ${colors.bar} transition-all duration-150`} style={{ width: `${pct}%` }} />
      </div>

      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className={`fixed bottom-6 right-4 z-40 inline-flex items-center justify-center rounded-full border border-border text-white shadow-lg transition-all ${colors.bg} ${expanded ? "h-9 px-3 text-xs font-semibold" : "h-3.5 w-3.5"}`}
        aria-label="Reading progress"
      >
        <span className={`${expanded ? "opacity-100" : "sr-only"}`}>{rounded}%</span>
      </button>
    </>
  );
}

/* ─── Markdown table ─── */
function TableBlock({ lines }: { lines: string[] }) {
  const isSep = (l: string) => /^\|[\s\-:|]+\|$/.test(l.trim());
  const parseRow = (l: string) =>
    l.trim().split("|").map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);
  const dataLines = lines.filter(l => !isSep(l));
  if (dataLines.length < 2) return null;
  const [headerLine, ...bodyLines] = dataLines;
  const headers = parseRow(headerLine);
  const rows = bodyLines.map(parseRow);

  return (
    <div className="my-6 overflow-hidden rounded-lg border border-border">
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {headers.map((h, i) => (
                <th key={i} className="px-4 py-2.5 text-left font-semibold text-foreground"><Inline text={h} /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-border/50 last:border-0">
                {headers.map((_, ci) => (
                  <td key={ci} className="px-4 py-2.5 text-foreground/85 leading-relaxed">
                    {row[ci] != null ? <Inline text={row[ci]} /> : null}
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

/* ─── Practice Q expandable ─── */
function PracticeQuestion({ number, question, answer }: { number: string; question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors">
        <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5">{number}</span>
        <span className="flex-1 text-sm font-medium text-foreground leading-snug"><Inline text={question} /></span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground mt-0.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="a" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
            <div className="px-4 py-3 border-t border-border bg-muted/20">
              <p className="text-sm text-foreground/85 leading-relaxed"><Inline text={answer} /></p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Helpers ─── */
function splitInlineTable(s: string): string[] {
  if (!s.includes("|---") && !s.includes("| ---")) return [];
  return s.replace(/\|\s*\|/g, "|\n|").split("\n").map(r => r.trim()).filter(r => r.startsWith("|") && r.endsWith("|"));
}

const META_HEADING = /^(key points|detailed notes|summary)$/i;

function preprocessContent(raw: string): string {
  const out: string[] = [];
  let inKeyPoints = false;

  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) { out.push(""); continue; }
    if (/^[-*_]{3,}$/.test(t)) { out.push(""); continue; }
    if (/^\d+$/.test(t)) continue;
    if (/^-?\s*.+\s\d+\.$/.test(t) && !t.includes("→") && !t.startsWith("|")) continue;

    if (t.startsWith("|") && (t.includes("|---") || t.includes("| ---"))) {
      splitInlineTable(t).forEach(r => out.push(r));
      continue;
    }

    if (t.startsWith("- ") && !t.startsWith("#") && !t.startsWith("|")) {
      const allDashes = [...t.matchAll(/ - /g)];
      if (allDashes.length >= 3) {
        t.slice(2).split(" - ").map(s => s.trim()).filter(Boolean).forEach(p => out.push(`- ${p}`));
        continue;
      }
    }

    if (/^#{1,2}\s/.test(t)) {
      const heading = t.replace(/^#+\s+/, "").replace(/\*+/g, "").replace(/⭐+/g, "").trim();
      if (/^key points$/i.test(heading)) { inKeyPoints = true; continue; }
      if (inKeyPoints) inKeyPoints = false;
      if (META_HEADING.test(heading)) continue;
      out.push(line);
      continue;
    }

    if (inKeyPoints) continue;

    if (/^#{3,6}\s/.test(t)) {
      const headText = t.replace(/^#{3,6}\s+/, "");
      const bulletSplit = headText.search(/ - (?=[A-Z*\d"(])/);
      if (bulletSplit !== -1) {
        const hashes = t.match(/^(#{3,6})/)?.[1] ?? "###";
        const headOnly = headText.slice(0, bulletSplit).replace(/⭐+/g, "").trim();
        if (headOnly) out.push(`${hashes} ${headOnly}`);
        headText.slice(bulletSplit + 3).split(/ - (?=[A-Z*\d"(])/).map(b => b.trim()).filter(Boolean).forEach(b => out.push(`- ${b}`));
        continue;
      }
      out.push(line);
      continue;
    }

    if (!t.startsWith("- ") && !t.startsWith("#") && !t.startsWith("|")) {
      const capDashes = [...t.matchAll(/ - (?=[A-Z*\d"(])/g)];
      if (capDashes.length >= 2) {
        const firstIdx = capDashes[0].index!;
        const prefix = t.slice(0, firstIdx).replace(/[⭐:\s]+$/, "").trim();
        if (prefix) out.push(`### ${prefix}`);
        t.slice(firstIdx + 3).split(/ - (?=[A-Z*\d"(])/).map(b => b.trim()).filter(Boolean).forEach(b => out.push(`- ${b}`));
        continue;
      }
      if (t.includes(": - ")) {
        const idx = t.indexOf(": - ");
        const prefix = t.slice(0, idx).replace(/⭐+/g, "").trim();
        if (prefix) out.push(`### ${prefix}`);
        out.push("- " + t.slice(idx + 4).trim());
        continue;
      }
    }

    if (/^[A-Z][^|\n]{2,60}:$/.test(t) && !t.startsWith("-") && !t.startsWith("#")) {
      out.push(`### ${t.slice(0, -1).trim()}`);
      continue;
    }

    out.push(line);
  }

  return out.join("\n");
}

/* ─── Extract TOC from content ─── */
interface TocItem { id: string; text: string; level: number }

function extractToc(content: string): TocItem[] {
  const items: TocItem[] = [];
  const lines = preprocessContent(content).split("\n");
  let secNum = 0;

  for (const line of lines) {
    const t = line.trim();
    // ## headings
    if (/^#{1,2}\s/.test(t)) {
      const heading = t.replace(/^#+\s+/, "").replace(/\*+/g, "").replace(/⭐+/g, "").replace(/^\d+\.\s*/, "").trim();
      if (META_HEADING.test(heading)) continue;
      secNum++;
      items.push({ id: `section-${secNum}`, text: heading, level: 2 });
    }
    // QUESTION pattern
    const qMatch = t.match(/^(QUESTION|Question|Q)\s*(\d+)/i);
    if (qMatch) {
      secNum++;
      items.push({ id: `section-${secNum}`, text: `Question ${qMatch[2]}`, level: 2 });
    }
  }

  return items;
}

/* ─── Article content renderer ─── */
let _sec = 0;

const ArticleContent = memo(function ArticleContent({ content }: { content: string }) {
  _sec = 0;
  const lines = preprocessContent(content).split("\n");
  const els: React.ReactNode[] = [];
  let listBuf: { type: "ul" | "ol"; items: React.ReactNode[] } | null = null;
  let inPractice = false;
  let tableBuf: string[] = [];
  let underSubheading = false;
  const pqs: { number: string; question: string; answer: string }[] = [];

  const flushList = () => {
    if (!listBuf) return;
    els.push(<ul key={`list-${els.length}`} className="mb-5 space-y-2 pl-1">{listBuf.items}</ul>);
    listBuf = null;
  };
  const flushTable = () => {
    if (tableBuf.length >= 2) els.push(<TableBlock key={`tbl-${els.length}`} lines={[...tableBuf]} />);
    tableBuf = [];
  };
  const flushPractice = () => {
    if (!pqs.length) return;
    els.push(
      <div key={`pq-${els.length}`} className="my-6">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Practice Questions</span>
        </div>
        <div className="space-y-2">{pqs.map((q, k) => <PracticeQuestion key={k} number={q.number} question={q.question} answer={q.answer} />)}</div>
      </div>
    );
    pqs.length = 0;
  };

  const pushBullet = (text: string, key: string) => {
    if (!listBuf || listBuf.type !== "ul") { flushList(); listBuf = { type: "ul", items: [] }; }
    listBuf.items.push(
      <li key={key} className="flex items-start gap-2.5 text-base text-foreground/90 leading-8">
        <span className="mt-3 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
        <span className="flex-1"><Inline text={text} /></span>
      </li>
    );
  };

  lines.forEach((line, i) => {
    const t = line.trim();

    if (t.startsWith("|")) { flushList(); tableBuf.push(t); underSubheading = false; return; }
    else if (tableBuf.length) { flushTable(); }

    if (!t) { flushList(); underSubheading = false; return; }

    if (t.startsWith("> ")) {
      flushList(); underSubheading = false;
      els.push(
        <blockquote key={`bq-${i}`} className="my-4 border-l-3 border-primary/40 pl-4 py-1">
          <p className="text-[15px] italic text-foreground/70 leading-relaxed"><Inline text={t.slice(2)} /></p>
        </blockquote>
      );
      return;
    }

    // Markdown image
    const imageMatch = t.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imageMatch) {
      flushList();
      underSubheading = false;
      const alt = imageMatch[1]?.trim() || "Medical illustration";
      const src = imageMatch[2]?.trim();
      if (src) {
        els.push(
          <figure key={`img-${i}`} className="my-6 overflow-hidden rounded-2xl border border-border bg-muted/20">
            <img src={src} alt={alt} loading="lazy" className="w-full object-cover" />
          </figure>
        );
      }
      return;
    }

    // QUESTION pattern
    const questionMatch = t.match(/^(QUESTION|Question|Q)\s*(\d+)[:\s-]*(.*)/i);
    if (questionMatch) {
      flushList(); flushPractice(); inPractice = false; underSubheading = false;
      _sec++;
      const qNum = questionMatch[2];
      const qTitle = questionMatch[3]?.replace(/^\s*[-:]\s*/, "").trim() || "";
      els.push(
        <div key={`q-${i}`} id={`section-${_sec}`} className="mt-10 mb-4 scroll-mt-20">
          <div className="flex items-center gap-3 mb-3">
            <span className="shrink-0 flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm w-10 h-10">
              Q{qNum}
            </span>
            <h2 className="font-serif font-bold text-2xl text-foreground leading-tight sm:text-[2rem]">
              {qTitle || `Question ${qNum}`}
            </h2>
          </div>
          <hr className="border-border" />
        </div>
      );
      return;
    }

    // Sub-question pattern
    const subQMatch = t.match(/^(\(?[a-z]\)|[ivx]+\)|\([ivx]+\))\s*(.+)/i);
    if (subQMatch) {
      flushList(); underSubheading = false;
      const label = subQMatch[1].replace(/[()]/g, "").toUpperCase();
      els.push(
        <div key={`subq-${i}`} className="my-3 flex items-start gap-2.5 pl-1">
          <span className="shrink-0 flex items-center justify-center rounded bg-primary/10 text-primary font-bold text-xs w-7 h-7">{label}</span>
          <p className="flex-1 text-[15px] font-medium text-foreground leading-relaxed pt-0.5"><Inline text={subQMatch[2]} /></p>
        </div>
      );
      return;
    }

    // ## headings
    if (/^#{1,2}\s/.test(t)) {
      flushList(); underSubheading = false;
      const heading = t.replace(/^#+\s+/, "").replace(/\*+/g, "").replace(/⭐+/g, "").replace(/^\d+\.\s*/, "").replace(/^[IVXLC]+\.\s+/, "").trim();
      if (heading.toLowerCase().includes("practice")) { inPractice = true; return; }
      flushPractice(); inPractice = false;
      _sec++;
      els.push(
        <h2 key={`h2-${i}`} id={`section-${_sec}`} className="mt-10 mb-4 font-serif font-bold text-2xl text-foreground scroll-mt-20 border-b border-border pb-3 sm:text-[2rem]">
          {heading}
        </h2>
      );
      return;
    }

    // ### subheadings
    if (/^#{3,6}\s/.test(t)) {
      flushList(); underSubheading = true;
      const txt = t.replace(/^#+\s+/, "").replace(/\*+/g, "").replace(/⭐+/g, "").trim();
      els.push(<h3 key={`h3-${i}`} className="mt-6 mb-2 font-semibold text-lg text-foreground">{txt}</h3>);
      return;
    }

    // Practice Q&A
    const qa = t.match(/^(\d+)\.\s(.+?)\s*→\s*(.+)$/);
    if (qa) {
      flushList(); underSubheading = false;
      if (inPractice) pqs.push({ number: qa[1], question: qa[2], answer: qa[3] });
      else els.push(
        <div key={`qa-${i}`} className="mb-3 rounded-lg border border-border p-4">
          <p className="text-sm font-medium text-foreground">{qa[1]}. <Inline text={qa[2]} /></p>
          <p className="mt-1.5 text-sm text-primary font-medium">→ <Inline text={qa[3]} /></p>
        </div>
      );
      return;
    }

    if (inPractice && /^\d+\.\s/.test(t) && !t.includes("→")) {
      const next = lines[i + 1]?.trim() ?? "";
      pqs.push({ number: t.match(/^(\d+)/)?.[1] ?? "", question: t.replace(/^\d+\.\s/, ""), answer: next.startsWith("→") ? next.slice(1).trim() : "" });
      return;
    }
    if (inPractice && t.startsWith("→")) return;

    // Explicit bullet
    if (t.startsWith("- ")) { pushBullet(t.slice(2), `li-${i}`); return; }

    // Numbered list
    if (/^\d+\.\s/.test(t) && !t.includes("→") && !inPractice) {
      if (!listBuf || listBuf.type !== "ol") { flushList(); listBuf = { type: "ol", items: [] }; }
      const num = t.match(/^(\d+)/)?.[1] ?? "";
      listBuf.items.push(
        <li key={`ol-${i}`} className="flex items-start gap-2.5 text-base text-foreground/90 leading-8">
          <span className="shrink-0 flex items-center justify-center rounded-full border border-primary/40 bg-primary/5 text-primary text-xs font-semibold w-6 h-6 mt-1">{num}</span>
          <span className="flex-1"><Inline text={t.replace(/^\d+\.\s/, "")} /></span>
        </li>
      );
      return;
    }

    // Bold label → subheading
    const boldLabelMatch = t.match(/^\*\*([^*]+)\*\*:?$/);
    if (boldLabelMatch) {
      flushList();
      els.push(<h3 key={`bl-${i}`} className="mt-6 mb-2 font-semibold text-base text-foreground">{boldLabelMatch[1].replace(/:$/, "").trim()}</h3>);
      underSubheading = true;
      return;
    }

    // Sub-labels ending with ":"
    const isSubLabel = /^[A-Za-z*\s()–-]{2,60}:$/.test(t);
    if (isSubLabel) {
      flushList();
      els.push(<h3 key={`sl-${i}`} className="mt-6 mb-2 font-semibold text-lg text-foreground"><Inline text={t.slice(0, -1)} /></h3>);
      underSubheading = true;
      return;
    }

    // Auto-bullet under subheading
    if (underSubheading) {
      if (t.startsWith("⚠️") || t.startsWith("⚠")) {
        flushList();
        els.push(
          <div key={`warn-${i}`} className="my-3 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2.5">
            <span className="text-amber-500 text-sm shrink-0">⚠️</span>
            <p className="text-sm leading-relaxed text-foreground/85"><Inline text={t.replace(/^⚠️?\s*/, "")} /></p>
          </div>
        );
        return;
      }
      pushBullet(t, `auto-li-${i}`);
      return;
    }

    flushList(); underSubheading = false;

    // Warning callout
    if (t.startsWith("⚠️") || t.startsWith("⚠")) {
      els.push(
        <div key={`wp-${i}`} className="my-3 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2.5">
          <span className="text-amber-500 text-sm shrink-0">⚠️</span>
          <p className="text-sm leading-relaxed text-foreground/85"><Inline text={t.replace(/^⚠️?\s*/, "")} /></p>
        </div>
      );
      return;
    }

    // Paragraph
    els.push(<p key={`p-${i}`} className="mb-5 text-base leading-8 text-foreground/90"><Inline text={t.replace(/^#+\s*/, "")} /></p>);
  });

  flushList(); flushTable(); flushPractice();
  return <div>{els}</div>;
});

/* ─── Sidebar TOC ─── */
function SidebarToc({ items, activeId }: { items: TocItem[]; activeId: string }) {
  if (items.length < 1) return null;
  return (
    <nav className="sticky top-20 space-y-0.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Contents</p>
      {items.map(item => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={`block text-[13px] leading-snug py-1.5 pl-3 border-l-2 transition-colors ${
            activeId === item.id
              ? "border-primary text-primary font-medium"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
          }`}
        >
          {item.text}
        </a>
      ))}
    </nav>
  );
}

/* ─── Main BlogPost component ─── */
export default function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isAdmin, user } = useAuth();


  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [related, setRelated] = useState<{ articles: any[]; flashcards: any[]; mcqs: any[] }>({ articles: [], flashcards: [], mcqs: [] });
  const [activeSection, setActiveSection] = useState("");

  const handleBack = () => {
    const shouldConfirm = window.scrollY > 220;
    if (shouldConfirm && !window.confirm("Leave this article and go back?")) return;

    const fromPath = (location.state as { from?: string } | null)?.from;
    if (fromPath && fromPath.startsWith("/blog")) {
      navigate(fromPath);
      return;
    }

    const savedYear = sessionStorage.getItem("nav_year_filter");
    if (savedYear && /^Year [1-6]$/.test(savedYear)) navigate(`/blog?year=${encodeURIComponent(savedYear)}`);
    else navigate("/blog");
  };

  useLayoutEffect(() => {
    const resetToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const scrollingEl = document.scrollingElement as HTMLElement | null;
      if (scrollingEl) scrollingEl.scrollTop = 0;
    };

    resetToTop();
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      resetToTop();
      raf2 = requestAnimationFrame(resetToTop);
    });

    const t1 = window.setTimeout(resetToTop, 80);
    const t2 = window.setTimeout(resetToTop, 220);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [slug, location.key, article?.id]);

  const reloadCurrentArticle = async (id: string) => {
    const refreshed = await getArticleBySlugOrId(id);
    if (refreshed) {
      setArticle(refreshed);
      if (refreshed.category) setRelated(await getRelatedContent(refreshed.category, refreshed.id));
    }
  };

  const runGeminiUpgrade = async (type: "format" | "expand") => {
    if (!article) return;
    setActionLoading(type);
    try {
      const { data, error } = await supabase.functions.invoke("content-upgrade", { body: { action: "upgrade", id: article.id, type } });
      if (error) throw new Error(error.message);
      if (!data?.improved_content) throw new Error("No upgraded content returned");
      const { error: applyError } = await supabase.functions.invoke("content-upgrade", {
        body: { action: "apply", id: article.id, content: data.improved_content, title: article.title },
      });
      if (applyError) throw new Error(applyError.message);
      await reloadCurrentArticle(article.id);
      toast({ title: type === "format" ? "Formatting applied" : "Content expanded" });
    } catch (err: any) {
      toast({ title: "Action failed", description: err?.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const runGenerateSaqs = async () => {
    if (!article) return;
    setActionLoading("saq");
    try {
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: { notes: article.content, type: "essay-qa" },
      });
      if (error) throw new Error(error.message);

      const saqs = Array.isArray(data?.saqs) ? data.saqs : [];
      if (!saqs.length) throw new Error("No SAQs generated");

      const section = [
        "",
        "## Short Answer Questions",
        ...saqs.map((q: any, i: number) => `### SAQ ${i + 1}\n${q.question}\n\n**Model answer:** ${q.answer || q.model_answer || ""}`),
      ].join("\n\n");

      const { error: applyError } = await supabase.functions.invoke("content-upgrade", {
        body: { action: "apply", id: article.id, title: article.title, content: `${article.content}\n${section}` },
      });
      if (applyError) throw new Error(applyError.message);

      await reloadCurrentArticle(article.id);
      toast({ title: "SAQs added to the end of this article" });
    } catch (err: any) {
      toast({ title: "Action failed", description: err?.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const runGenerateCoverImage = async () => {
    if (!article) return;
    setActionLoading("image");

    try {
      const { data, error } = await supabase.functions.invoke("content-upgrade", {
        body: { action: "generate_image", id: article.id },
      });

      if (error) throw new Error(error.message);
      const imageDataUrl = data?.image_data_url as string | undefined;
      if (!imageDataUrl) throw new Error("No image returned");

      const contentWithoutTopImage = article.content.replace(/^!\[[^\]]*\]\([^)]+\)\s*\n*/m, "").trimStart();
      const imageAlt = article.title.replace(/\s+/g, " ").trim() || "Medical illustration";
      const newContent = `![${imageAlt}](${imageDataUrl})\n\n${contentWithoutTopImage}`;

      const { error: applyError } = await supabase.functions.invoke("content-upgrade", {
        body: { action: "apply", id: article.id, title: article.title, content: newContent },
      });
      if (applyError) throw new Error(applyError.message);

      await reloadCurrentArticle(article.id);
      toast({ title: "Gemini cover image generated" });
    } catch (err: any) {
      toast({ title: "Action failed", description: err?.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const runTitleAndSubtitleCleanup = async () => {
    if (!article) return;
    setActionLoading("titles");
    try {
      const normalizedTitle = article.title
        .replace(/^#+\s*/, "")
        .replace(/\s+/g, " ")
        .trim();

      const normalizedContent = article.content
        .split("\n")
        .map((line) => {
          if (!/^#{1,3}\s+/.test(line.trim())) return line;
          const prefix = line.match(/^#{1,3}/)?.[0] || "##";
          const heading = line.replace(/^#{1,3}\s+/, "").replace(/\s+/g, " ").trim();
          return `${prefix} ${heading}`;
        })
        .join("\n");

      const { error: applyError } = await supabase.functions.invoke("content-upgrade", {
        body: { action: "apply", id: article.id, title: normalizedTitle, content: normalizedContent },
      });
      if (applyError) throw new Error(applyError.message);

      await reloadCurrentArticle(article.id);
      toast({ title: "Title and subtitles cleaned" });
    } catch (err: any) {
      toast({ title: "Action failed", description: err?.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const runCleanupFix = async (fixes: Record<string, any>, successMessage: string) => {
    if (!article) return;
    setActionLoading("fix");
    try {
      const { data, error } = await supabase.functions.invoke("bulk-cleanup", { body: { action: "fix", article_id: article.id, fixes } });
      if (error) throw new Error(error.message);
      if (data?.deleted_article) {
        toast({ title: successMessage });
        navigate("/blog", { replace: true });
        return;
      }
      if (data?.moved_to_raw) {
        toast({ title: "Could not parse MCQs — moved to Raw in Admin", description: "Open Admin panel to review this article manually." });
        await reloadCurrentArticle(article.id);
        return;
      }
      await reloadCurrentArticle(article.id);
      toast({ title: successMessage });
    } catch (err: any) {
      toast({ title: "Action failed", description: err?.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  /* Direct migrate: auto-route essay content, else try MCQ parse → fallback to raw */
  const runDirectMigrate = async () => {
    if (!article) return;
    setActionLoading("fix");
    try {
      const { data, error } = await supabase.functions.invoke("bulk-cleanup", {
        body: { action: "fix", article_id: article.id, fixes: { migrate_mcqs: true, auto_route_essay: true, fallback_to_raw: true } },
      });
      if (error) throw new Error(error.message);
      if (data?.migrated_essays) {
        toast({ title: "Detected essay format — moved to Essays" });
        navigate("/essays", { replace: true });
        return;
      }
      if (data?.deleted_article) {
        toast({ title: `Migrated ${data.migrated_mcqs || 0} MCQs → MCQ section` });
        navigate("/blog", { replace: true });
        return;
      }
      if (data?.moved_to_raw) {
        toast({ title: "MCQ parse failed — moved to Raw in Admin" });
        await reloadCurrentArticle(article.id);
        return;
      }
      await reloadCurrentArticle(article.id);
      toast({ title: "No MCQs found, article unchanged" });
    } catch (err: any) {
      toast({ title: "Action failed", description: err?.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    getArticleBySlugOrId(slug)
      .then((a) => {
        setArticle(a);
        if (!a) return;
        const canonicalPath = buildBlogPath(a);
        if (location.pathname !== canonicalPath) navigate(canonicalPath, { replace: true });
        markArticleVisited({ id: a.id, title: a.title, category: a.category, visitedAt: Date.now() });
        if (a.category) getRelatedContent(a.category, a.id).then(setRelated);
      })
      .finally(() => setLoading(false));
  }, [slug, navigate, location.pathname]);

  // Intersection observer for active TOC section
  const toc = useMemo(() => article ? extractToc(article.content) : [], [article]);

  useEffect(() => {
    if (!toc.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) { setActiveSection(entry.target.id); break; }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );
    toc.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [toc, loading]);

  // Dynamic OG meta tags for sharing
  useEffect(() => {
    if (!article) return;
    const metaTitle = article.meta_title || article.title;
    const fallbackDesc = stripRichText(article.content || "", 160);
    const metaDesc = article.meta_description || fallbackDesc || `Study ${article.title} - medical notes, key concepts and practice questions on Kenya Meds.`;
    const ogImage = article.og_image_url || extractFirstImageFromContent(article.content || "") || `${SITE_URL}/icon-512.png`;
    const canonicalUrl = `${SITE_URL}${buildBlogPath(article)}`;

    document.title = `${metaTitle} | Kenya Meds`;

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
      el.content = content;
    };

    setMeta("name", "description", metaDesc);
    setMeta("property", "og:title", metaTitle);
    setMeta("property", "og:description", metaDesc);
    setMeta("property", "og:image", ogImage);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:type", "article");
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", metaTitle);
    setMeta("name", "twitter:description", metaDesc);
    setMeta("name", "twitter:image", ogImage);

    let canonical = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
    canonical.href = canonicalUrl;

    let ldScript = document.querySelector("script[data-article-ld]") as HTMLScriptElement | null;
    if (!ldScript) { ldScript = document.createElement("script"); ldScript.type = "application/ld+json"; ldScript.setAttribute("data-article-ld", "true"); document.head.appendChild(ldScript); }
    ldScript.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": metaTitle,
      "description": metaDesc,
      "image": ogImage,
      "url": canonicalUrl,
      "datePublished": article.created_at,
      "author": { "@type": "Organization", "name": "OMPATH" },
      "publisher": { "@type": "Organization", "name": "OMPATH" },
    });

    return () => {
      const ldEl = document.querySelector("script[data-article-ld]");
      if (ldEl) ldEl.remove();
    };
  }, [article]);

  if (loading) {
    return <div className="flex min-h-[65vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!article) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="mb-4 text-2xl font-bold text-foreground">Article not found</h1>
        <Button asChild variant="outline"><Link to="/blog"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link></Button>
      </div>
    );
  }

  const date = new Date(article.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const unitName = getCategoryDisplayName(article.category);
  const yearName = getYearFromCategory(article.category);
  const hasRelated = related.flashcards.length > 0 || related.mcqs.length > 0;

  return (
    <>
      <ReadingProgress />

      {/* Breadcrumbs */}
      <div className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-5 py-3 flex items-center gap-2 text-sm text-muted-foreground overflow-x-auto">
          <button onClick={handleBack} className="shrink-0 hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <Link to="/blog" className="shrink-0 hover:text-foreground transition-colors">Study Notes</Link>
          {yearName && (
            <>
              <ChevronRight className="h-3 w-3 shrink-0" />
              <Link to={`/blog?year=${encodeURIComponent(yearName)}`} className="shrink-0 hover:text-foreground transition-colors">{yearName}</Link>
            </>
          )}
          {unitName && unitName !== "Uncategorized" && (
            <>
              <ChevronRight className="h-3 w-3 shrink-0" />
              <span className="truncate text-foreground font-medium">{unitName}</span>
            </>
          )}
        </div>
      </div>

      {/* Admin toolbar */}
      {isAdmin && (
        <div className="border-b-2 border-primary/30 bg-primary/5">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-5 py-3">
            <span className="mr-1 text-xs font-bold uppercase tracking-wider text-primary">Admin</span>

            {/* Direct Migrate — no AI, prominent */}
            <Button size="sm" className="h-8 gap-1.5 text-xs bg-primary hover:bg-primary/90" disabled={!!actionLoading} onClick={runDirectMigrate}>
              {actionLoading === "fix" ? <Loader2 className="h-3 w-3 animate-spin" /> : <GitMerge className="h-3 w-3" />}
              Migrate to MCQs
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs border-primary/30" disabled={!!actionLoading}>
                  {actionLoading === "format" || actionLoading === "expand" || actionLoading === "titles" || actionLoading === "saq" || actionLoading === "image"
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Sparkles className="h-3 w-3 text-primary" />}
                  Gemini
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => runGeminiUpgrade("format")}>Improve article formatting</DropdownMenuItem>
                <DropdownMenuItem onClick={() => runGeminiUpgrade("expand")}>Expand article details</DropdownMenuItem>
                <DropdownMenuItem onClick={runGenerateCoverImage}><ImagePlus className="mr-2 h-3.5 w-3.5" />Generate article image</DropdownMenuItem>
                <DropdownMenuItem onClick={runTitleAndSubtitleCleanup}>Update title + subtitles only</DropdownMenuItem>
                <DropdownMenuItem onClick={runGenerateSaqs}>Generate SAQs at article end</DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  if (!article) return;
                  setActionLoading("seo");
                  try {
                    const { data, error } = await supabase.functions.invoke("content-upgrade", { body: { action: "generate_seo_single", id: article.id } });
                    if (error) throw new Error(error.message);
                    if (data?.error) throw new Error(data.error);
                    toast({ title: "SEO metadata generated", description: `Title: ${data?.seo?.meta_title || ""}` });
                    await reloadCurrentArticle(article.id);
                  } catch (err: any) {
                    toast({ title: "SEO generation failed", description: err?.message, variant: "destructive" });
                  } finally { setActionLoading(null); }
                }}>Generate SEO metadata</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-primary/30" disabled={!!actionLoading}>
                  <GitMerge className="h-3 w-3" /> More Migrate
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => runCleanupFix({ migrate_mcqs: true }, "Migrated to MCQs")}>To MCQs (with delete)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => runCleanupFix({ migrate_essays: true }, "Migrated to Essays")}>To Essays</DropdownMenuItem>
                <DropdownMenuItem onClick={() => runCleanupFix({ move_to_raw: true }, "Moved to Raw")}>Move to Raw (unpublish)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-primary/30" disabled={!!actionLoading}>
                  <Settings2 className="h-3 w-3" /> Change
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => runCleanupFix({ fix_formatting: true, clean_emojis: true, clean_mku: true }, "Cleaned formatting")}>Clean formatting</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {/* Main layout: sidebar TOC + article */}
      <div className="mx-auto max-w-6xl px-5 py-8">
        <div className={toc.length > 0 ? "lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-10" : "max-w-3xl mx-auto"}>
          {/* Left sidebar: TOC — only show when real headings exist */}
          {toc.length > 0 && (
            <aside className="hidden lg:block">
              <SidebarToc items={toc} activeId={activeSection} />
            </aside>
          )}

          {/* Article body */}
          <article id="section-top" className="min-w-0">
            <header className="mb-10">
              <h1 className="mb-3 font-serif text-4xl font-bold leading-tight text-foreground sm:text-5xl">
                {article.title.replace(/^#+\s*/, "")}
              </h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{date}</span>
                {unitName && unitName !== "Uncategorized" && (
                  <>
                    <span>·</span>
                    <span className="font-medium text-foreground/70">{unitName}</span>
                  </>
                )}
              </div>
              <ShareButtons
                url={`${SITE_URL}${buildBlogPath(article)}`}
                title={article.title}
                description={article.meta_description || ""}
                variant="full"
                className="mt-4"
              />
            </header>

            <div className="prose-custom">

              <ArticleContent content={article.content} />
            </div>

            {/* Share after content */}
            <div className="mt-10 pt-6 border-t border-border">
              <ShareButtons
                url={`${SITE_URL}${buildBlogPath(article)}`}
                title={article.title}
                description={article.meta_description || ""}
                variant="full"
              />
            </div>

            {/* Related content */}
            {hasRelated && (
              <div className="mt-12 rounded-lg border border-border p-5">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-foreground">Continue Learning</h3>
                </div>
                <div className="space-y-4">
                  {related.flashcards.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Flashcards</p>
                      <div className="space-y-1.5">
                        {related.flashcards.map((f: any) => (
                          <Link key={f.id} to={`/flashcards/${f.id}`} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-primary/40 hover:bg-muted/30 transition-colors">
                            <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                            <span className="truncate text-sm font-medium text-foreground">{f.title}</span>
                            <span className="ml-auto text-xs text-muted-foreground">{(f.cards as any[])?.length || 0} cards</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  {related.mcqs.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">MCQ Quizzes</p>
                      <div className="space-y-1.5">
                        {related.mcqs.map((m: any) => (
                          <Link key={m.id} to={`/mcqs/${m.id}`} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-primary/40 hover:bg-muted/30 transition-colors">
                            <ListChecks className="h-4 w-4 text-primary shrink-0" />
                            <span className="truncate text-sm font-medium text-foreground">{m.title}</span>
                            <span className="ml-auto text-xs text-muted-foreground">{(m.questions as any[])?.length || 0} Qs</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </article>

        </div>
      </div>
    </>
  );
}
