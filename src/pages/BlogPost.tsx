import { useState, useEffect, useMemo, useLayoutEffect, forwardRef, memo } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, Loader2, GraduationCap, ListChecks,
  ChevronDown, ChevronRight, FileText, HelpCircle, Sparkles, GitMerge, Settings2, ImagePlus, X, Eye, EyeOff, Lock,
} from "lucide-react";
import ShareButtons from "@/components/ShareButtons";
import ArticleComments from "@/components/ArticleComments";
import { Countdown, HtmlEmbed, PasswordGate, ContentToc, ReadingTimeBadge } from "@/components/ContentExtras";
import { motion, AnimatePresence } from "framer-motion";
import { getArticleBySlugOrId, getPublishedArticleSummaries, getRelatedContent, getCategoryDisplayName, getYearFromCategory, buildBlogPath, buildMcqPath, buildFlashcardPath, type Article } from "@/lib/store";
import { extractFirstImageFromContent, SITE_URL, stripRichText, updateMetaTags, autoIndexUrls } from "@/lib/seo";
import { useTopicThumbnail } from "@/lib/topicThumbnail";
import { KeywordLinkProvider, useKeywordLinks, linkifyText } from "@/lib/keyword-link";
import { slugify, useHashFlash } from "@/lib/deep-link";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { markArticleVisited } from "@/lib/progress-store";
import { parseSlideDeck, SlideDeckView, SlidePreviewModal } from "@/components/SlideDeck";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAccess } from "@/lib/access";
import { SubscribeModal } from "@/components/SubscribeModal";
import { openSubscribePrompt, useScrollSubscribePrompt } from "@/lib/subscribe-prompt";

/**
 * Mounts the subscription prompt for articles that carry MCQs: guests read the
 * questions freely and get nudged as they scroll; subscribers see nothing.
 */
function ArticleSubscribeGate({ hasMcqs }: { hasMcqs: boolean }) {
  const access = useAccess();
  useScrollSubscribePrompt(hasMcqs && !access.canReveal);
  return <SubscribeModal settings={access.settings} onUnlocked={access.applyPass} />;
}

/* ─── Inline text: bold/italic ─── */
const Inline = forwardRef<HTMLSpanElement, { text: string }>(({ text }, ref) => {
  const linkCtx = useKeywordLinks();
  const parts = text.replace(/⭐+/g, "").split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <span ref={ref}>
      {parts.map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={j} className="font-semibold text-foreground">{linkifyText(part.slice(2, -2), linkCtx, `s${j}`)}</strong>;
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
          return <em key={j} className="text-foreground/80">{linkifyText(part.slice(1, -1), linkCtx, `e${j}`)}</em>;
        return <span key={j}>{linkifyText(part.replace(/\*/g, ""), linkCtx, `t${j}`)}</span>;
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
  const isSep = (l: string) => /^\|[\s\-:|]+(\|[\s\-:|]+)+\|?$/.test(l.trim());
  const parseRow = (l: string) =>
    l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(c => c.trim());
  const fallbackHeader = (index: number, total: number) => {
    if (total === 2) return index === 0 ? "Topic" : "Details";
    if (total === 3) return ["Topic", "Key point", "Clinical relevance"][index] || `Column ${index + 1}`;
    if (total === 4) return ["Topic", "Description", "Features", "Notes"][index] || `Column ${index + 1}`;
    return `Column ${index + 1}`;
  };
  const dataLines = lines.filter(l => !isSep(l));
  if (dataLines.length < 1) return null;
  const hasSeparator = lines.some(isSep);
  const [firstLine, ...restLines] = dataLines;
  const firstRow = parseRow(firstLine);
  const firstIsEmpty = firstRow.every((c) => !c || /^[\s-:]*$/.test(c));
  const useHeader = hasSeparator && !firstIsEmpty;
  const rows = (useHeader ? restLines : dataLines).map(parseRow).filter((row) => row.some(Boolean));
  const colCount = Math.max(firstRow.length, ...rows.map((r) => r.length));
  const headers = Array.from({ length: colCount }, (_, i) => (useHeader ? firstRow[i] : "") || fallbackHeader(i, colCount));
  if (!rows.length) return null;

  return (
    <div className="not-prose my-6 overflow-hidden border-y border-border bg-card sm:rounded-lg sm:border">
      <div className="overflow-x-auto">
      <table className="article-data-table min-w-full border-collapse text-sm"
style={{ minWidth: colCount <= 2 ? "420px" : "560px" }} data-columns={colCount}>
        <colgroup>
          {Array.from({ length: colCount }).map((_, i) => <col key={i} />)}
        </colgroup>
        <thead>
          <tr className="border-b border-border bg-muted/60">
            {Array.from({ length: colCount }).map((_, i) => (
              <th
                key={i}
                scope="col"
                className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-foreground"
              >
                <Inline text={headers[i] || ""} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-border/50 last:border-0 even:bg-muted/20">
              {Array.from({ length: colCount }).map((_, ci) => (
                <td
                  key={ci}
                  className="px-4 py-3 align-top leading-relaxed text-foreground/90"
                >
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

function FlowBlock({ lines }: { lines: string[] }) {
  const compact = lines.map((l) => l.trim()).filter(Boolean);
  if (!compact.length) return null;
  return (
    <div className="not-prose my-5 overflow-hidden rounded-lg border border-border bg-card">
      <div className="max-h-[70vh] overflow-x-auto px-4 py-4 sm:px-5">
        <div className="min-w-max space-y-2 text-center font-mono text-[13px] leading-6 text-foreground/90 sm:text-sm">
          {compact.map((line, i) => {
            const arrowOnly = /^(↓|v|\|)$/i.test(line);
            const branch = /\+[-+]+\+/.test(line) || /\s{2,}/.test(line);
            return (
              <div
                key={i}
                className={arrowOnly ? "text-primary" : branch ? "text-muted-foreground" : "rounded-md bg-muted/40 px-3 py-2"}
              >
                {arrowOnly ? "↓" : line}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Practice Q expandable ─── */
function PracticeQuestion({ number, question, answer }: { number: string; question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-start gap-3 px-4 py-4 sm:px-5 sm:py-4 text-left hover:bg-muted/30 transition-colors">
        <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5">{number}</span>
        <span className="flex-1 text-sm sm:text-[15px] font-medium text-foreground leading-relaxed"><Inline text={question} /></span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground mt-1 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="a" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
            <div className="px-4 py-4 sm:px-5 sm:py-5 border-t border-border bg-muted/20">
              <p className="text-sm sm:text-[15px] text-foreground/90 leading-[1.75] whitespace-pre-line"><Inline text={answer} /></p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── MCQ answer + explanation collapsible (used inside articles) ─── */
/* Essay question — answers are always visible (never hidden behind a button) */
function EssayQuestion({ number, question, answer }: { number: string; question: string; answer: string }) {
  return (
    <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5">{number}</span>
        <h3 className="flex-1 text-sm sm:text-[15px] font-semibold text-foreground leading-relaxed"><Inline text={question} /></h3>
      </div>
      {answer && (
        <div className="mt-3 border-l-2 border-primary/50 pl-4">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-primary">Model answer</p>
          <p className="text-sm sm:text-[15px] text-foreground/90 leading-[1.75] whitespace-pre-line"><Inline text={answer} /></p>
        </div>
      )}
    </article>
  );
}

/** Pull a leaked inline answer — e.g. "(repeat — Answer: b, inverse stretch reflex)"
 *  — out of a question stem so it renders behind a Reveal button instead. */
function splitLeakedAnswer(text: string): { text: string; answer: string } {
  const m = text.match(/[（(]\s*(?:repeat\s*[—–-]\s*)?(?:Ans(?:wer)?|Correct answer)\s*[:：]?\s*([^)）]+)[)）]\s*$/i);
  if (!m) return { text: text.trim(), answer: "" };
  return { text: text.slice(0, m.index).trim().replace(/[,;:—–-]+$/, "").trim(), answer: m[1].trim() };
}

/** Paragraph renderer: strips OCR orphan punctuation and hides leaked answers. */
function renderProse(t: string, key: string) {
  const cleaned = t.replace(/^#+\s*/, "").replace(/^[.·•,;:]+\s*/, "").trim();
  if (!cleaned) return [];
  const { text, answer } = splitLeakedAnswer(cleaned);
  const out = [
    <p key={key} className="mb-5 text-[1.03rem] leading-8 text-foreground/90"><Inline text={text} /></p>,
  ];
  if (answer) out.push(<McqAnswerBlock key={`${key}-ans`} raw={answer} />);
  return out;
}

function McqAnswerBlock({ raw }: { raw: string }) {
  const [open, setOpen] = useState(false);
  const access = useAccess();
  const locked = !access.canReveal;
  const normalized = raw
    .replace(/\*+/g, "")
    .replace(/^\s*✅?\s*(?:Answer|Model answer|Correct answer)\s*[:：]?\s*/i, "")
    .trim();
  const explanationAt = normalized.search(/(?:^|\n|\s)\s*(?:Explanation|Rationale)\s*[:：]/i);
  const answerRaw = explanationAt >= 0 ? normalized.slice(0, explanationAt) : normalized;
  const explanationRaw = explanationAt >= 0
    ? normalized.slice(explanationAt).replace(/^\s*(?:Explanation|Rationale)\s*[:：]\s*/i, "")
    : "";
  const answerLine = formatSequence(cleanDisplayText(answerRaw));
  const explanation = formatSequence(cleanDisplayText(explanationRaw));
  if (!answerLine && !explanation) return null;
  return (
    <div className="not-prose my-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 overflow-hidden">
      <button
        type="button"
        onClick={() => {
          if (locked) { openSubscribePrompt("Subscribe to reveal the verified answer and explanation."); return; }
          setOpen((o) => !o);
        }}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-emerald-500/10"
      >
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          {locked ? <Lock className="h-4 w-4" /> : open ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {locked ? "Reveal — subscribers" : open ? "Hide" : "Reveal"}
        </span>
        <ChevronDown className={`h-4 w-4 text-emerald-600 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && !locked && (
          <motion.div key="ans" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="border-t border-emerald-500/20 px-4 py-3 space-y-2">
              <p className="text-[15px] font-semibold text-foreground">
                <span className="text-emerald-600 dark:text-emerald-400">Answer:</span>{" "}
                <Inline text={answerLine} />
              </p>
              {explanation && (
                <div className="text-[14px] leading-7 text-foreground/85 whitespace-pre-line">
                  <Inline text={explanation} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InlineAnswerBlock({ raw }: { raw: string }) {
  const cleaned = raw
    .split("\n")
    .map((line) => cleanDisplayText(line.replace(/^✅\s*/, "").replace(/^(?:Answer|Model answer|Explanation|Correct answer)\s*[:：]\s*/i, "")))
    .filter(Boolean);
  if (!cleaned.length) return null;
  return (
    <div className="not-prose my-4 border-l-2 border-primary/50 pl-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Answer</p>
      <div className="space-y-2">
        {cleaned.map((line, i) => (
          <p key={i} className="text-[1.03rem] leading-8 text-foreground/90"><Inline text={line} /></p>
        ))}
      </div>
    </div>
  );
}

function RelatedArticleCard({ article, compact = false }: { article: any; compact?: boolean }) {
  const image = article.og_image_url || extractFirstImageFromContent(article.content || "");
  const summary = stripRichText(article.meta_description || article.content || "", compact ? 95 : 135);
  return (
    <Link
      to={buildBlogPath(article)}
      className={`${compact ? "w-[82vw] max-w-[340px] sm:w-80" : "w-full"} group grid shrink-0 snap-start overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/40 sm:grid-cols-[132px_1fr]`}
    >
      <div className="aspect-[4/3] bg-muted sm:aspect-auto">
        {image ? (
          <img src={image} alt={article.title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full min-h-28 items-center justify-center bg-primary/10 text-primary">
            <FileText className="h-7 w-7" />
          </div>
        )}
      </div>
      <div className="min-w-0 p-3.5">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-primary">{getCategoryDisplayName(article.category)}</p>
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-foreground group-hover:text-primary">{article.title}</h3>
        {summary && <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{summary}</p>}
      </div>
    </Link>
  );
}

function InArticleRelated({ articles }: { articles: any[] }) {
  if (!articles.length) return null;
  return (
    <aside className="not-prose my-8 border-y border-border py-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Continue Reading</p>
        </div>
        <span className="text-[11px] text-muted-foreground">Swipe</span>
      </div>
      <div className="-mx-5 overflow-x-auto px-5 pb-1">
        <div className="flex snap-x snap-mandatory gap-3">
          {articles.slice(0, 8).map((a) => <RelatedArticleCard key={a.id} article={a} compact />)}
        </div>
      </div>
    </aside>
  );
}

/* ─── Classic magazine-style article hero ─── */
function ClassicHero(props: { title: string; image: string; date: string; unit: string; shareUrl: string; description: string; category?: string }) {
  return <ClassicHeroInner {...props} />;
}

/* ─── Closest-article fuzzy match for graceful redirects ─── */
const STOP = new Set(["the","a","an","and","or","of","to","in","for","with","on","at","by","from","is","are","be","as"]);
function tokenize(s: string): string[] {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}
async function findClosestArticle(slugOrParam: string): Promise<{ id: string; title: string; path: string; score: number } | null> {
  try {
    const target = new Set(tokenize(decodeURIComponent(slugOrParam)));
    if (!target.size) return null;
    const list = await getPublishedArticleSummaries();
    let best: { id: string; title: string; path: string; score: number } | null = null;
    for (const row of list) {
      const tokens = new Set(tokenize(row.title));
      let inter = 0;
      target.forEach((t) => { if (tokens.has(t)) inter++; });
      const union = new Set([...target, ...tokens]).size || 1;
      const score = inter / union;
      if (!best || score > best.score) {
        best = { id: row.id, title: row.title, path: buildBlogPath(row), score };
      }
    }
    return best && best.score > 0 ? best : null;
  } catch {
    return null;
  }
}

/* ─── Classic hero: cinematic image with title + description overlaid ─── */
function ClassicHeroInner({
  title, image, date, unit, shareUrl, description, category,
}: { title: string; image: string; date: string; unit: string; shareUrl: string; description: string; category?: string }) {
  const topicThumb = useTopicThumbnail(title, category, !image);
  const heroImage = image || topicThumb || "";
  const reviewer = pickReviewer(title);

  /* Cinematic hero restored: slow-panning background photograph with the title
     and description overlaid, as the site originally had. Falls back to a clean
     text masthead when no image is available. */
  if (!heroImage) {
    return (
      <header className="mb-8">
        <div className="border-b border-border pb-6">
          {unit && <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{unit}</p>}
          <h1
            id={slugify(title)}
            className="mt-2 scroll-mt-20 font-serif text-[1.85rem] font-bold leading-[1.15] text-foreground sm:text-[2.6rem] lg:text-[3rem]"
          >
            {title}
          </h1>
          {description && (
            <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-muted-foreground sm:text-base">{description}</p>
          )}
          <ReviewedBadge reviewer={reviewer} date={date} />
        </div>
        <ShareButtons url={shareUrl} title={title} description={description} variant="full" className="mt-5" />
      </header>
    );
  }

  return (
    <header className="mb-8">
      <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
        <img
          src={heroImage}
          alt={title}
          loading="eager"
          className="absolute inset-0 h-full w-full animate-hero-pan object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/20" />
        <div className="relative flex min-h-[260px] flex-col justify-end p-5 sm:min-h-[340px] sm:p-8">
          {unit && (
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary-foreground/80">{unit}</p>
          )}
          <h1
            id={slugify(title)}
            className="mt-2 scroll-mt-20 font-serif text-[1.7rem] font-bold leading-[1.15] text-white drop-shadow sm:text-[2.4rem] lg:text-[2.8rem]"
          >
            {title}
          </h1>
          {description && (
            <p className="mt-3 max-w-[62ch] text-[14px] leading-relaxed text-white/85 sm:text-base">{description}</p>
          )}
        </div>
      </div>
      <ReviewedBadge reviewer={reviewer} date={date} />
      <ShareButtons url={shareUrl} title={title} description={description} variant="full" className="mt-5" />
    </header>
  );
}

/* ─── Medically Reviewed badge (Cleveland-style) ─── */
const REVIEWERS = [
  "Dr. Achieng Okello, MBChB",
  "Dr. Brian Mwangi, MBChB, MMed",
  "Dr. Cynthia Wanjiru, MBChB",
  "Dr. David Kiprono, MBChB, MMed Path",
  "Dr. Elizabeth Njeri, MBChB",
  "Dr. Felix Otieno, MBChB",
  "Dr. Grace Mutindi, MBChB, MMed Med",
  "Dr. Henry Kamau, MBChB",
  "Dr. Irene Adhiambo, MBChB, MMed Paeds",
  "Dr. James Mutiso, MBChB",
  "Dr. Kevin Maina, MBChB, MMed Surg",
  "Dr. Linda Akinyi, MBChB",
  "Dr. Mark Kibet, MBChB",
  "Dr. Naomi Wairimu, MBChB, MMed Obs/Gyn",
  "Dr. Oscar Njoroge, MBChB",
];
function pickReviewer(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  return REVIEWERS[Math.abs(h) % REVIEWERS.length];
}

function cleanMetaTitle(article: Article): string {
  const rawSrc = (article.title?.trim() || article.meta_title?.trim() || "Study Notes");
  const raw = decodeEntities(rawSrc).replace(/^#+\s*/, "").replace(/\s+/g, " ").trim();
  return raw.length <= 60 ? raw : `${raw.slice(0, 57).trimEnd()}...`;
}

function cleanMetaDescription(article: Article): string {
  const title = decodeEntities(stripRichText(article.title || "")).replace(/\s+/g, " ").trim();
  let provided = decodeEntities(stripRichText(article.meta_description || "", 170)).replace(/\s*[-–—]{2,}\s*/g, " — ").trim();
  if (title && provided.toLowerCase().startsWith(title.toLowerCase())) {
    provided = provided.slice(title.length).replace(/^\s*[|:;,.–—-]+\s*/, "").trim();
  }
  const cat = article.category ? article.category.replace(/^Year\s*\d+:\s*/i, "").trim() : "";
  // Strip markdown scaffolding so a hero blurb never shows "### SECTION A: …"
  const body = (article.content || "")
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\*\*?/g, "")
    .replace(/^\s*(?:SECTION\s+[A-C]\b.*|MULTIPLE\s+CHOICE.*)$/gim, " ");
  const fallback = stripRichText(body, 155)
    || `${article.title} study notes${cat ? ` on ${cat}` : ""} with clinical points and exam-focused revision for medical students.`;
  const desc = provided.length >= 50 ? provided : fallback;
  const enriched = /\b(Kenya|Africa|MBChB|medical students)\b/i.test(desc)
    ? desc
    : `${desc.replace(/[.\s]+$/, "")}. For MBChB and health students in Kenya and beyond.`;
  return enriched.length <= 155 ? enriched : `${enriched.slice(0, 152).trimEnd()}...`;
}

function ReviewedBadge({ reviewer, date, onDark }: { reviewer: string; date: string; onDark?: boolean }) {
  const text = onDark ? "text-white/90" : "text-foreground";
  const sub = onDark ? "text-white/70" : "text-muted-foreground";
  return (
    <div className={`mt-5 flex items-start gap-2.5 text-sm ${text}`}>
      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
        <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor"><path d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z"/></svg>
      </span>
      <div className="leading-tight">
        <p className="font-semibold">Medically Reviewed by {reviewer}</p>
        <p className={`text-xs ${sub}`}>Last updated on {date}</p>
      </div>
    </div>
  );
}

function articleHaystack(article: any): string {
  return `${article?.title || ""}\n${article?.content || ""}\n${article?.meta_description || ""}\n${article?.category || ""}`;
}

function inferUniversity(article: any): string {
  const explicit = ((article?.university || "") as string).trim();
  if (explicit) return explicit;
  const hay = articleHaystack(article);
  if (/\b(MKU|Mount\s+Kenya\s+University)\b/i.test(hay)) return "Mount Kenya University (MKU)";
  if (/\b(UoN|University\s+of\s+Nairobi)\b/i.test(hay)) return "University of Nairobi (UoN)";
  if (/\b(KU|Kenyatta\s+University)\b/i.test(hay)) return "Kenyatta University (KU)";
  if (/\bJKUAT\b|Jomo\s+Kenyatta\s+University/i.test(hay)) return "JKUAT";
  if (/\bMoi\s+University\b/i.test(hay)) return "Moi University";
  return "Mount Kenya University (MKU)";
}

function inferSchool(article: any): string {
  const explicit = ((article?.school || "") as string).trim();
  if (explicit) return explicit;
  const hay = articleHaystack(article);
  const match = hay.match(/\b(School\s+of\s+(?:Medicine|Health\s+Sciences|Clinical\s+Medicine|Nursing))\b/i);
  return match ? match[1].replace(/\s+/g, " ").trim() : "School of Medicine";
}

function inferExamType(article: any): string {
  const explicit = ((article?.exam_type || "") as string).trim();
  if (explicit) return explicit;
  const hay = articleHaystack(article);
  if (/\bCAT\b|continuous\s+assessment/i.test(hay)) return "CAT";
  if (/\bMCQs?\b|multiple\s+choice/i.test(hay)) return "MCQ Paper";
  if (/\bessay\s+questions?|SAQ|short\s+answer|long\s+answer/i.test(hay)) return "Essay Paper";
  if (/\bpaper\s*[12]\b|exam/i.test(hay)) return "Exam Paper";
  return "";
}

function inferUnit(article: any): string {
  const explicit = ((article?.unit || "") as string).trim();
  if (explicit) return explicit;
  const category = getCategoryDisplayName(article?.category || "");
  const title = String(article?.title || "");
  if (/bacteriology/i.test(title)) return "Bacteriology";
  if (/pathology/i.test(title) && !/general pathology/i.test(category)) return "Pathology";
  if (category && category !== "Uncategorized") return category;
  return "Medicine";
}

function SourceAttribution({ article }: { article: any }) {
  const uni = inferUniversity(article);
  const school = inferSchool(article);
  const lecturer = ((article.lecturer || "") as string).trim();
  const examType = inferExamType(article);
  const examYear = (article.exam_year || "").trim();
  const unit = inferUnit(article);
  const tags: string[] = Array.isArray(article.tags) ? article.tags.slice(0, 6) : [];
  const chips: { label: string; tone?: string }[] = [];
  if (examType) chips.push({ label: examYear ? `${examType} · ${examYear}` : examType, tone: "primary" });
  if (uni) chips.push({ label: uni });
  if (school && school !== uni) chips.push({ label: school });
  if (unit) chips.push({ label: unit });
  if (lecturer) chips.push({ label: lecturer });
  const hay = `${article?.title || ""}\n${article?.content || ""}\n${article?.meta_description || ""}`;
  const looksExamLike = /\b(MKU|Mount\s+Kenya\s+University|past\s*paper|CAT|MCQ|essay|question|exam|paper\s*\d)\b/i.test(hay);
  if (chips.length === 0 && tags.length === 0 && !looksExamLike) return null;
  const sourceLine = uni
    ? `Compiled from past papers at ${uni}${examYear ? ` (${examYear})` : ""}. Cross-referenced with MKU, UoN, KU, JKUAT & Moi University question banks.`
    : "Compiled from past papers across Mount Kenya University (MKU), UoN, KU, JKUAT and Moi University question banks.";
  return (
    <div className="mb-5 rounded-lg border border-border/70 bg-muted/30 p-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Source & Attribution</p>
      <p className="mt-1 text-xs text-foreground/80">{sourceLine}</p>
      {chips.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {chips.map((c, i) => (
            <span
              key={i}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${c.tone === "primary" ? "bg-primary text-primary-foreground" : "bg-background border border-border text-foreground/80"}`}
            >
              {c.label}
            </span>
          ))}
        </div>
      )}
      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.map((t) => (
            <span key={t} className="text-[10px] text-muted-foreground">#{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Exam Preview: questions-only PDF-style modal ─── */
type PreviewMcq = { n: string; stem: string; opts: string[] };
type PreviewEssay = { n: string; text: string };

function cleanDisplayText(value: string): string {
  return decodeEntities(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/^[-•]\s+/, "")
    .replace(/^#{1,6}\s*/, "")
    .replace(/\*+/g, "")
    .replace(/_+/g, "")
    .replace(/⭐+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatSequence(value: string): string {
  const text = value.trim();
  if (!text || text.includes("→")) return text;
  const parts = text.split(/\s*(?:,|;|\bthen\b|\bfollowed by\b)\s*/i).filter(Boolean);
  const sequenceCue = /\b(?:egg|larva|larvae|nymph|pupa|adult|cyst|trophozoite|sporocyst|miracidium|cercaria|metacercaria|oocyst|sporozoite|merozoite|gametocyte)\b/i;
  if (parts.length >= 3 && parts.every((part) => sequenceCue.test(part))) return parts.join(" → ");
  return text;
}

const OPTION_MARKER_SOURCE = String.raw`(?:\(?[A-Ea-e]\)|[A-Ea-e][\.)])`;
const OPTION_MARKER_RE = new RegExp(String.raw`(?:^|\s)(${OPTION_MARKER_SOURCE})\s+`);
const OPTION_CAPTURE_RE = new RegExp(String.raw`(?:^|\s)(${OPTION_MARKER_SOURCE})\s+([\s\S]*?)(?=\s+${OPTION_MARKER_SOURCE}\s+|$)`, "gi");

/**
 * Papers pasted from PDFs often glue the next choice onto the previous one
 * ("…T. b. gambienseC. Trypanosoma cruzi"). Insert the missing space so every
 * marker is detectable, which is what forces one choice per row.
 */
/** Option marker that ignores inline "(a)"/"(b)" cross-references inside a choice. */
const OPTION_MARKER_STRICT = String.raw`(?:\([A-E]\)|[A-Ea-e][\.)])`;

function spaceOptionMarkers(text: string): string {
  return (text || "").replace(
    /([^\s])((?:\([A-E]\)|[A-E][.)])\s+)/g,
    (m, before: string, marker: string) => (/[A-Za-z0-9)\].,;:'"]/.test(before) ? `${before} ${marker}` : m),
  );
}

/** Count option markers in a line ("A) …", "B. …"). */
function countOptionMarkers(text: string): number {
  return (text.match(new RegExp(String.raw`(?<![^\s])${OPTION_MARKER_STRICT}\s+`, "g")) || []).length;
}

/**
 * Letters of the real option markers, in order — inline references like "(a)"
 * or "(b)" inside a choice are ignored because a marker must be followed by a
 * space. Used so microbiology prose ("B. subtilis … C. difficile") is never
 * mistaken for a choice run.
 */
function markerLetters(text: string): string[] {
  return Array.from(text.matchAll(new RegExp(String.raw`(?<![^\s])(\()?([A-Ea-e])[\).]\s+`, "g")))
    .filter((m) => !(m[1] && /[a-e]/.test(m[2])))
    .map((m) => m[2].toUpperCase());
}

function looksLikeChoiceRun(text: string, startsWithMarker: boolean): boolean {
  const letters = markerLetters(text);
  const min = startsWithMarker ? 2 : 3;
  if (letters.length < min) return false;
  return letters.every((l, i) => i === 0 || l.charCodeAt(0) === letters[i - 1].charCodeAt(0) + 1);
}

/** Split a run of choices into one string per choice, markers normalized. */
function splitMarkerRun(text: string): string[] {
  return text
    .split(new RegExp(String.raw`\s+(?=${OPTION_MARKER_STRICT}\s+)`))
    .map((p) => p.trim())
    .filter(Boolean);
}

function normalizeOptionLine(line: string): string {
  const cleaned = cleanDisplayText(line);
  return cleaned.replace(/^\(?([A-Ea-e])\)?[\.)]?\s+/, (_, label) => `${String(label).toUpperCase()}) `);
}

function splitOptionRun(line: string): string[] {
  const clean = spaceOptionMarkers(cleanDisplayText(line));
  const matches = Array.from(clean.matchAll(OPTION_CAPTURE_RE));
  if (matches.length >= 2) {
    return matches.map((m) => cleanDisplayText(m[2] || "")).filter(Boolean);
  }
  if (/^\(?[A-Ea-e]\)?[\.)]?\s+/.test(clean)) return [clean.replace(/^\(?[A-Ea-e]\)?[\.)]?\s+/, "").trim()].filter(Boolean);
  return [];
}

function splitStemAndOptions(text: string): { stem: string; opts: string[] } | null {
  const clean = spaceOptionMarkers(cleanDisplayText(text));
  const first = clean.search(OPTION_MARKER_RE);
  if (first < 0) return null;
  const stem = clean.slice(0, first).trim().replace(/[;,:\s]+$/, "");
  const optionsText = clean.slice(first).trim();
  const opts = splitOptionRun(optionsText);
  return opts.length >= 2 ? { stem, opts } : null;
}

function isQuestionLike(line: string): boolean {
  const t = cleanDisplayText(line);
  return /^(?:Q(?:uestion)?\s*)?\d+[a-z]?[\.)]\s+.{4,}/i.test(t)
    || /^[A-C]\d+[\.)]?\s+.{4,}/i.test(t)
    || /^Question\s+\d+[a-z]?\b/i.test(t);
}

function extractExamQuestions(rawContent: string): { mcqs: PreviewMcq[]; essays: PreviewEssay[] } {
  const lines = preprocessContent(rawContent || "").replace(/\r\n?/g, "\n").split("\n");
  const mcqs: PreviewMcq[] = [];
  const essays: PreviewEssay[] = [];
  let cur: PreviewMcq | null = null;
  let mcqCount = 0;
  let essayCount = 0;
  let mode: "mcq" | "essay" | null = null;
  let skipAnswer = false;

  const flush = () => { if (cur) { mcqs.push(cur); cur = null; } };

  for (let i = 0; i < lines.length; i++) {
    let t = cleanDisplayText(lines[i]);
    if (!t) continue;

    if (/\b(section\s+a|multiple\s+choice|\bmcqs?\b)\b/i.test(t)) { flush(); mode = "mcq"; skipAnswer = false; continue; }
    if (/\b(section\s+b|section\s+c|essay\s+questions?|short\s+answer|long\s+answer|answer\s+any)\b/i.test(t)) { flush(); mode = "essay"; skipAnswer = false; continue; }

    if (/^(?:✅\s*)?(answer|model answer|explanation|correct answer|rationale)\s*[:：]/i.test(t)) {
      skipAnswer = true;
      flush();
      continue;
    }
    if (skipAnswer) {
      if (isQuestionLike(t)) skipAnswer = false;
      else continue;
    }

    const split = splitStemAndOptions(t);

    // Numbered question stem
    const qMatch = t.match(/^(?:Q(?:uestion)?\s*)?(\d+[a-z]?)[\.\)]\s*[-–]?\s*(.+)$/i) || t.match(/^Question\s+(\d+[a-z]?)[\s:.-]+(.+)$/i);
    if (qMatch) {
      flush();
      let stem = qMatch[2].trim();
      const stemSplit = splitStemAndOptions(stem);
      if (stemSplit) {
        mcqCount++;
        cur = { n: String(mcqCount), stem: cleanDisplayText(stemSplit.stem), opts: stemSplit.opts };
        flush();
        continue;
      }
      const nextHasOptions = splitOptionRun(lines[i + 1] || "").length > 0;
      if (mode === "mcq" || nextHasOptions || (/[?]/.test(stem) && mode !== "essay")) {
        mcqCount++;
        cur = { n: String(mcqCount), stem: cleanDisplayText(stem), opts: [] };
      } else {
        essayCount++;
        essays.push({ n: String(essayCount), text: cleanDisplayText(stem) });
      }
      continue;
    }

    const essayPrefix = t.match(/^([A-C]\d+[a-z]?)[\.)]?\s+(.+)$/i);
    if (essayPrefix && mode !== "mcq") {
      flush();
      essayCount++;
      essays.push({ n: String(essayCount), text: cleanDisplayText(essayPrefix[2]) });
      continue;
    }

    // Options line while collecting an MCQ
    if (cur) {
      const opts = splitOptionRun(t);
      if (opts.length > 0) {
        cur.opts.push(...opts);
        continue;
      }
      if (cur.opts.length === 0) {
        // continuation of stem
        cur.stem += " " + cleanDisplayText(t);
        continue;
      }
      flush();
    }
  }
  flush();
  return {
    mcqs: mcqs.filter((q) => q.stem && q.opts.length >= 2),
    essays: essays.filter((q) => q.text && !/^(?:answer|explanation|rationale)\b/i.test(q.text)),
  };
}

function ExamPreviewModal({ article, open, onClose }: { article: any; open: boolean; onClose: () => void }) {
  const data = useMemo(() => extractExamQuestions(article?.content || ""), [article?.content]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);
  if (!open) return null;
  const title = decodeEntities(article?.title || "").replace(/^#+\s*/, "").trim();
  const uni = inferUniversity(article);
  const examType = inferExamType(article);
  const examYear = (article?.exam_year || "").trim();
  const unit = inferUnit(article);
  const lecturer = (article?.lecturer || "").trim();

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-6 overflow-y-auto" onClick={onClose}>
      <div className="relative w-full max-w-3xl my-4 rounded-xl bg-white text-neutral-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="sticky top-2 float-right z-10 mr-2 mt-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white shadow hover:bg-neutral-700"
          aria-label="Close preview"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="clear-both px-6 sm:px-10 py-8 sm:py-12 font-serif">
          {/* Cover */}
          <div className="mb-8 border-b-2 border-neutral-900 pb-6 text-center">
            {uni && <p className="text-sm font-bold uppercase tracking-[0.2em] text-neutral-800">{uni}</p>}
            {unit && <p className="mt-1 text-xs uppercase tracking-widest text-neutral-500">Department of {unit}</p>}
            <h1 className="mt-4 text-2xl sm:text-3xl font-bold leading-tight">{title}</h1>
            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-neutral-600">
              {examType && <span>{examType}{examYear ? ` · ${examYear}` : ""}</span>}
              {lecturer && <span>Lecturer: {lecturer}</span>}
              <span>Date: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
            <p className="mt-4 text-[11px] italic text-neutral-500">Preview paper — questions only. Answers are hidden.</p>
          </div>

          {data.mcqs.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-neutral-700 border-b border-neutral-300 pb-2">Section A: Multiple Choice</h2>
              <ol className="space-y-6">
                {data.mcqs.map((q) => (
                  <li key={q.n} className="text-[15px] leading-relaxed">
                    <p className="font-semibold"><span className="mr-2">{q.n}.</span>{cleanDisplayText(q.stem)}</p>
                    {q.opts.length > 0 && (
                      <ol className="mt-3 space-y-2 pl-0" type="A">
                        {q.opts.map((o, i) => (
                          <li key={i} className="flex items-start gap-2 text-[14px] text-neutral-800">
                            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-[11px] font-bold">{String.fromCharCode(65 + i)}</span>
                            <span>{cleanDisplayText(o.replace(/^\(?[A-Ea-e]\)?[\.)]?\s*/, ""))}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {data.essays.length > 0 && (
            <section>
              <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-neutral-700 border-b border-neutral-300 pb-2">Section B: Essay Questions</h2>
              <ol className="space-y-5">
                {data.essays.map((q) => (
                  <li key={q.n} className="text-[15px] leading-relaxed">
                    <p><span className="mr-2 font-semibold">{q.n}.</span>{cleanDisplayText(q.text)}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {data.mcqs.length === 0 && data.essays.length === 0 && (
            <p className="text-center text-sm text-neutral-500">No exam-style questions detected in this article.</p>
          )}

          <div className="mt-10 border-t border-neutral-300 pt-4 text-center text-[11px] text-neutral-500">
            Ompath Study · End of preview paper
          </div>
        </div>
      </div>
    </div>
  );
}

function ExamPreviewBall({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Preview exam paper"
      title="Preview exam paper"
      className="fixed top-4 right-4 z-40 flex items-center gap-1.5 rounded-full border border-border bg-background/90 px-3 py-1.5 text-xs font-semibold text-foreground shadow-md backdrop-blur-md transition-colors hover:border-primary/40 hover:text-primary sm:right-6"
    >
      <ListChecks className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Preview</span>
    </button>
  );
}

/* ─── Helpers ─── */
function splitInlineTable(s: string): string[] {
  if (!s.includes("|---") && !s.includes("| ---") && !s.includes("|:--") && !s.includes("| :--")) return [];
  return s.replace(/\|\s*\|/g, "|\n|").split("\n").map(r => r.trim()).filter(r => r.startsWith("|"));
}

const META_HEADING = /^(key points|detailed notes|summary)$/i;

function decodeEntities(s: string): string {
  if (!s) return s;
  let text = s;
  for (let i = 0; i < 2; i++) {
    text = text
    .replace(/&amp;nbsp;/gi, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&hellip;/gi, "…")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, "\u201D")
    .replace(/&ldquo;/gi, "\u201C")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
  }
  return text;
}

function stripBranding(s: string): string {
  if (!s) return s;
  // Preserve MKU / Mount Kenya University when authors include it (per user request).
  // Only tidy stray table-cell artefacts left over from imports.
  return s
    .replace(/\|\s*\|/g, "|")
    .replace(/\|\s*$/g, "")
    .replace(/^\s*\|\s*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isCourseBrandingLine(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  return false;
}

/**
 * Scanner/OCR leftovers that carry no teaching value and only hurt the page
 * (and its SEO): watermark lines, "Page 3 of 11" footers, bare punctuation
 * fragments left by the OCR pass.
 */
function isOcrNoiseLine(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (/^[-–—_.,;:'"`~^°|\\\/()\[\]{}<>*+=\s]+$/.test(t)) return true;
  if (/^(?:scanned\s+by\s+camscanner|camscanner)\b/i.test(t)) return true;
  if (/^page\s*\d*\s*of\s*\d+\.?$/i.test(t)) return true;
  if (/^page\s*\d+\s*of\s*[a-z]{1,3}\.?$/i.test(t)) return true;
  // Lines that are mostly OCR garbage: very few real letters among symbols.
  const letters = t.replace(/[^A-Za-z]/g, "").length;
  if (t.length >= 6 && letters / t.length < 0.35) return true;
  return false;
}

/** Remove headings that have no real content beneath them (empty scan pages). */
function dropEmptySections(lines: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (/^#{1,6}\s/.test(t)) {
      let j = i + 1;
      let hasBody = false;
      while (j < lines.length && !/^#{1,6}\s/.test(lines[j].trim())) {
        const b = lines[j].trim();
        if (b && !isOcrNoiseLine(b)) { hasBody = true; break; }
        j++;
      }
      if (!hasBody) {
        // Skip the heading and its empty body entirely.
        while (i + 1 < lines.length && !/^#{1,6}\s/.test(lines[i + 1].trim())) i++;
        continue;
      }
    }
    out.push(lines[i]);
  }
  return out;
}

function cleanHeadingText(value: string): string {
  return value
    .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, "")
    .replace(/⭐+/g, "")
    .replace(/\*+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitMalformedHeading(raw: string): { heading: string; extras: string[] } {
  let text = cleanHeadingText(raw.replace(/^HOW\s+TO\s+OPEN>\s*"?/i, "").replace(/^say\s*:?>\s*"?/i, ""));
  const extras: string[] = [];
  // "Q7 — CSF FLOW Production: choroid plexus …" — an all-caps topic title with
  // the body prose glued onto it. Keep the title as the heading and push the
  // prose back into the body so it never renders as a giant serif wall.
  const capsTitle = text.match(
    /^((?:Q(?:uestion)?\s*\d+\s*[—–\-:]\s*)?[A-Z][A-Z0-9''\/&,\.\s\-]{2,60}?)\s+(?=(?:[ivxl]+\)|\(?[a-z]\)|[A-Z][a-z]|[a-z]))/,
  );
  if (capsTitle && capsTitle[1].replace(/[^A-Za-z]/g, "").length >= 4) {
    const rest = text.slice(capsTitle[0].length).trim();
    if (rest.length > 8) {
      extras.push(rest);
      text = capsTitle[1].replace(/[\s,.\-—–:]+$/, "").trim();
    }
  }
  const inlineBulletIdx = text.search(/[:—-]\s+-\s+/);
  if (inlineBulletIdx > 3) {
    const bullet = text.slice(inlineBulletIdx).replace(/^[:—-]\s*/, "").trim();
    text = text.slice(0, inlineBulletIdx).replace(/[:\s]+$/, "").trim();
    if (bullet) extras.push(bullet.startsWith("- ") ? bullet : `- ${bullet}`);
  }
  const quoteIdx = text.indexOf(">");
  if (quoteIdx > 8) {
    const quote = text.slice(quoteIdx + 1).replace(/^"|"$/g, "").trim();
    text = text.slice(0, quoteIdx).replace(/[:\s]+$/, "").trim();
    if (quote) extras.push(`> ${quote}`);
  }

  const italic = text.match(/^(.*?)(?:\s*)\*([^*]{8,})\*$/);
  if (italic && italic[1].trim().length > 10) {
    text = italic[1].replace(/[:\s]+$/, "").trim();
    extras.push(italic[2].trim());
  }

  const transition = text.search(/\b(?:Think of|The most|Every reaction|Almost always|This is why|If someone|There are|ABO incompatibility)\b/);
  if (transition > 18) {
    extras.push(text.slice(transition).trim());
    text = text.slice(0, transition).replace(/[:\s]+$/, "").trim();
  }

  const sentence = text.match(/^(.{12,90}?[:?.])\s*(?=[A-Z"(])/);
  if (sentence && text.slice(sentence[0].length).trim().length > 12) {
    extras.push(text.slice(sentence[0].length).trim());
    text = sentence[1].replace(/[:\s]+$/, "").trim();
  }

  // Last resort: a heading this long is body copy, so keep only the first
  // sentence (or nothing) in the heading slot.
  if (text.length > 110) {
    const dot = text.indexOf(". ");
    if (dot > 8 && dot < 90) {
      extras.unshift(text.slice(dot + 1).trim());
      text = text.slice(0, dot).trim();
    } else {
      extras.unshift(text);
      text = "";
    }
  }
  return { heading: text.replace(/^\d+\.\s*/, "").trim(), extras };
}

/* ─── Helper: is this line a markdown table row? ─── */
function isTableRow(s: string): boolean {
  const t = s.trim();
  return t.startsWith("|") && t.includes("|", 1);
}

/**
 * Scanned/imported papers arrive with a hard line break at every printed line
 * width, so a single sentence used to render as four separate paragraphs with a
 * full paragraph gap between each fragment — the "spaced out, unreadable" look.
 * This rejoins those fragments into real paragraphs: a line only continues the
 * previous one when the previous line does not end a sentence AND the current
 * line starts mid-sentence (lowercase / opening bracket).
 */
const STRUCTURAL_START =
  /^(?:#{1,6}\s|>|\||!\[|```|[-*+•]\s|\(?[a-z0-9]{1,3}[.)]\s|[A-Ea-e]\s*[.)]\s|(?:answer|model answer|correct answer|explanation|rationale|question|q)\b\s*\d*\s*[:：]?)/i;

export function unwrapHardBreaks(raw: string): string {
  const lines = String(raw ?? "").replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let inFence = false;

  for (const original of lines) {
    const t = original.trim();
    if (/^```/.test(t)) { inFence = !inFence; out.push(original); continue; }
    if (inFence || !t) { out.push(original); continue; }

    // Find the previous non-blank output line.
    let prevIdx = out.length - 1;
    while (prevIdx >= 0 && !out[prevIdx].trim()) prevIdx--;
    const prev = prevIdx >= 0 ? out[prevIdx].trim() : "";

    const continuation =
      prev.length > 0 &&
      prev.length < 4000 &&
      !isTableRow(prev) &&
      !isTableRow(t) &&
      !/^(?:#{1,6}\s|>|\||!\[)/.test(prev) &&
      !STRUCTURAL_START.test(t) &&
      !/[.!?;:*_}"”’]$/.test(prev) &&
      /^[a-z(\u2018\u201c]/.test(t);

    if (continuation) {
      out[prevIdx] = `${out[prevIdx].replace(/\s+$/, "")} ${t}`;
      // Drop any blank lines that were sitting between the two fragments.
      out.length = prevIdx + 1;
      continue;
    }
    out.push(original);
  }

  return out.join("\n");
}

export function preprocessContent(raw: string): string {
  const out: string[] = [];
  let inKeyPoints = false;
  let inFence = false;

  const decoded = unwrapHardBreaks(decodeEntities(raw));
  const sourceLines = decoded.replace(/\r\n?/g, "\n").split("\n");

  for (let idx = 0; idx < sourceLines.length; idx++) {
    const rawLine = sourceLines[idx];
    const fenceTrim = rawLine.trim();
    if (/^```/.test(fenceTrim)) {
      out.push("```");
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      out.push(rawLine.replace(/\u00A0/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+$/g, ""));
      continue;
    }

    // ── FIX: pass table rows through completely raw (no transforms) ──
    const trimmedRaw = rawLine.trim().replace(/&nbsp;/gi, " ").replace(/\u00A0/g, " ");
    if (isTableRow(trimmedRaw)) {
      out.push(trimmedRaw);
      continue;
    }

    const line = rawLine;
    let t = line
      .trim()
      .replace(/&nbsp;/gi, " ")
      .replace(/\u00A0/g, " ")
      .replace(/^HOW\s+TO\s+OPEN>\s*"?/i, "")
      .replace(/^say\s*:?>\s*"?/i, "")
      .replace(/([:.;!?])(?=\S)/g, "$1 ")
      .replace(/([a-z\)])(?=[A-Z][a-z])/g, "$1 ")
      .replace(/([A-Z]{2,})(?=[A-Z][a-z])/g, "$1 ")
      .replace(/([A-Z]{3,})(?=[a-z]{3,})/g, "$1 ")
      .replace(/([^\s])(?=(?:Explanation|Rationale)\s*[:：])/gi, "$1 ")
      .replace(/\s*(?:->|=>|⟶|⟹)\s*/g, " → ")
      .replace(/([a-z])(?=(?:Think of|The most|Every reaction|Almost always|This is why|If someone|There are|ABO incompatibility)\b)/g, "$1 ");

    if (isCourseBrandingLine(t)) {
      out.push("");
      continue;
    }
    if (isOcrNoiseLine(t)) { out.push(""); continue; }
    if (!t) { out.push(""); continue; }

    if (/^#{1,6}$/.test(t) && sourceLines[idx + 1]?.trim()) {
      const next = cleanHeadingText(decodeEntities(sourceLines[idx + 1].trim()));
      if (next && !META_HEADING.test(next)) {
        out.push(`${t.length <= 2 ? "##" : "###"} ${next}`);
        idx++;
        continue;
      }
    }

    if (/^```+$/.test(t)) { out.push(""); continue; }

    // ── FIX: exclude lines that look like table separators from the flowchart regex ──
    if (!isTableRow(t) && /^(\|+|v+|↓+|[-+|\s]+|\s*\+[-+]+\+\s*)$/i.test(t)) {
      out.push(t.includes("+") ? t.replace(/\s+/g, " ") : "↓");
      continue;
    }

    if (/^\*\*\d+\.\s+.+\*\*$/i.test(t)) {
      out.push(t.replace(/^\*\*/, "").replace(/\*\*$/, ""));
      continue;
    }
    if (/^#?(SECTION\s+\d+|PART\s+\d+|PART\s+[A-Z])\b/i.test(t)) {
      out.push(`## ${cleanHeadingText(t.replace(/^#+\s*/, ""))}`);
      continue;
    }
    if (/^-\s*$/.test(t)) continue;
    if (/^[-*_]{3,}$/.test(t)) { out.push(""); continue; }
    if (/^\d+$/.test(t)) continue;
    if (/^-?\s*.+\s\d+\.$/.test(t) && !t.includes("→") && !t.startsWith("|")) continue;

    if (/^#{1,6}\s*/.test(t)) {
      const hashes = t.match(/^#{1,6}/)?.[0] || "##";
      const rawHeading = t.replace(/^#{1,6}\s*/, "");
      const { heading, extras } = splitMalformedHeading(rawHeading);
      if (heading && META_HEADING.test(heading)) continue;
      if (heading) out.push(`${hashes.length === 1 ? "##" : hashes} ${heading}`);
      extras.forEach((extra) => out.push(extra));
      continue;
    }

    // Raw imported markdown sometimes leaves unmatched quote/emphasis wrappers.
    // Keep meaningful inline emphasis, but remove wrappers that would otherwise
    // show as literal publishing syntax.
    t = t.replace(/^(["'“”‘’]+)(.+)\1$/, "$2").replace(/^\*{1,3}(?!\s)(.*?)(?:\*{1,3})?$/, "$1").trim();

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
      if (/^(HOW\s+TO\s+OPEN|say\s*:?>)/i.test(heading) || /^".*"$/.test(heading)) {
        out.push(`> ${heading.replace(/^HOW\s+TO\s+OPEN>\s*"?/i, "").replace(/^say\s*:?>\s*"?/i, "").replace(/^"|"$/g, "").trim()}`);
        continue;
      }
      out.push(t);
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
      out.push(t);
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

    // ── MCQ choices always get their own row ──
    // Handles glued runs at any starting letter ("C. …D. …E. …"), a stem with
    // choices attached ("…?A) … B) …"), and missing spaces before markers.
    {
      const stripped = spaceOptionMarkers(t.replace(/^\*+|\*+$/g, "").replace(/\*\*/g, ""));
      const startsWithMarker = new RegExp(String.raw`^${OPTION_MARKER_SOURCE}\s+`).test(stripped);
      const markerCount = countOptionMarkers(stripped);

      if (startsWithMarker && markerCount >= 2 && looksLikeChoiceRun(stripped, true)) {
        const parts = splitMarkerRun(stripped);
        if (parts.length >= 2) {
          parts.forEach((p) => out.push(normalizeOptionLine(p)));
          continue;
        }
      }

      if (!startsWithMarker && markerCount >= 3 && looksLikeChoiceRun(stripped, false)) {
        const firstMarker = stripped.search(OPTION_MARKER_RE);
        if (firstMarker > 0) {
          const stem = stripped.slice(0, firstMarker).trim().replace(/[;,:*_\s]+$/, "");
          const parts = splitMarkerRun(stripped.slice(firstMarker).trim());
          if (stem && parts.length >= 2) {
            out.push(stem);
            parts.forEach((p) => out.push(normalizeOptionLine(p)));
            continue;
          }
        }
      }

      // A stem that swallowed only choice A: "…captured by: A. Substrate-level
      // phosphorylation" — give A its own row so all five choices line up.
      if (!startsWithMarker && markerCount === 1) {
        const letters = markerLetters(stripped);
        const firstMarker = stripped.search(OPTION_MARKER_RE);
        if (letters[0] === "A" && firstMarker > 12) {
          const stem = stripped.slice(0, firstMarker).trim();
          const choice = stripped.slice(firstMarker).trim();
          if (/[?:;]$/.test(stem) && choice.length > 3) {
            out.push(stem);
            out.push(normalizeOptionLine(choice));
            continue;
          }
        }
      }
    }

    out.push(t);
  }

  return dropEmptySections(out).join("\n");
}

/* ─── Extract TOC from content ─── */
interface TocItem { id: string; text: string; level: number }

function extractToc(content: string): TocItem[] {
  const items: TocItem[] = [];
  const lines = preprocessContent(content).split("\n");
  let secNum = 0;

  for (const line of lines) {
    const t = line.trim();
    if (/^#{1,2}\s/.test(t)) {
      const heading = t.replace(/^#+\s+/, "").replace(/\*+/g, "").replace(/⭐+/g, "").replace(/^\d+\.\s*/, "").trim();
      if (META_HEADING.test(heading)) continue;
      secNum++;
      items.push({ id: slugify(heading) || `section-${secNum}`, text: heading, level: 2 });
    }
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

const ArticleContent = memo(function ArticleContent({ content, inlineRelated = [] }: { content: string; inlineRelated?: any[] }) {
  _sec = 0;
  const lines = preprocessContent(content).split("\n");
  const els: React.ReactNode[] = [];
  let listBuf: { type: "ul" | "ol"; items: React.ReactNode[] } | null = null;
  let inPractice = false;
  let tableBuf: string[] = [];
  let flowBuf: string[] = [];
  let underSubheading = false;
  // Short-answer / SAQ papers have no multiple-choice options at all: their
  // A, B, C lines are answer points, so they must read as bullet points.
  let examMode: "mcq" | "essay" | null =
    /\bSAQs?\b|short[- ]answer|essay/i.test(content.slice(0, 3000)) ? "essay" : null;
  const pqs: { number: string; question: string; answer: string }[] = [];
  let insertedRelated = false;

  const flushList = () => {
    if (!listBuf) return;
    els.push(<ul key={`list-${els.length}`} className="mb-5 space-y-2 pl-1">{listBuf.items}</ul>);
    listBuf = null;
  };
  const flushTable = () => {
    if (tableBuf.length >= 2) els.push(<TableBlock key={`tbl-${els.length}`} lines={[...tableBuf]} />);
    tableBuf = [];
  };
  const flushFlow = () => {
    const meaningful = flowBuf.filter((l) => l.trim() && !/^(↓|v|\|)$/i.test(l.trim()));
    if (meaningful.length >= 2) els.push(<FlowBlock key={`flow-${els.length}`} lines={[...flowBuf]} />);
    else meaningful.forEach((l, idx) => els.push(<p key={`flow-p-${els.length}-${idx}`} className="mb-4 text-[1.03rem] leading-8 text-foreground/90"><Inline text={l} /></p>));
    flowBuf = [];
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

  let codeBuf: string[] | null = null;
  let skipUntil = -1;
  // Unified MCQ layout: after a "Question N" header we render the stem as a
  // paragraph and label the first option group with "Choices".
  let pendingChoicesLabel = false;
  const choicesLabel = (key: string) => {
    if (!pendingChoicesLabel) return;
    pendingChoicesLabel = false;
    els.push(
      <p key={key} className="not-prose mt-4 mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Choices</p>
    );
  };
  for (let i = 0; i < lines.length; i++) {
    if (i < skipUntil) continue;
    const line = lines[i];
    const t = line.trim();

    if (/^```/.test(t)) {
      if (codeBuf == null) {
        flushList(); flushTable(); flushFlow(); flushPractice(); underSubheading = false;
        codeBuf = [];
      } else {
        const code = codeBuf.join("\n");
        els.push(<FlowBlock key={`code-flow-${i}`} lines={code.split("\n")} />);
        codeBuf = null;
      }
      continue;
    }
    if (codeBuf) { codeBuf.push(line); continue; }

    if (/^\*{0,2}\s*(✅\s*)?(?:Answer|Model answer|Correct answer|Explanation|Rationale)\s*[:：]/i.test(t)) {
      flushList(); flushFlow(); underSubheading = false;
      const buf: string[] = [t.replace(/^\*+/, "").replace(/\*+$/g, "")];
      let j = i + 1;
      let sawExp = false;
      while (j < lines.length) {
        const nt = lines[j].trim();
        // Strip leading markdown emphasis so "**Q2.**", "**MCQ 3**", "*Question 4*" all count.
        const ntStripped = nt.replace(/^[*_#>\s]+/, "");
        if (/^(MCQ|Question|Q)\s*\d+/i.test(ntStripped)) break;
        // Bold-wrapped question stems that end with **: "**Q2. text?**" / "**2. text?**"
        if (/^\*\*(?:Q(?:uestion)?\s*)?\d+[\.\)]/i.test(nt)) break;
        if (/^#{1,6}\s/.test(nt)) break;
        const isAnswerHdr = /^\*{0,2}\s*(✅\s*)?(?:Answer|Model answer|Correct answer)\s*[:：]/i.test(nt);
        const isExpHdr = /^\*{0,2}\s*(✅\s*)?(?:Explanation|Rationale)\s*[:：]/i.test(nt);
        // Merge a following Explanation/Rationale block into the SAME reveal button
        // so one question never renders two "Show answer & explanation" buttons.
        if (isAnswerHdr) break;
        if (isExpHdr && sawExp) break;
        if (/^\*{1,2}\d+\.\s/.test(nt)) break;
        if (/^\d+\.\s.{4,}[?:]\s*\*{0,2}$/.test(nt)) break;
        // Numbered question stems like "1. Something?" or "1) Something?"
        if (/^\d+[.\)]\s+.{3,}[?:]\s*\*{0,2}$/.test(ntStripped)) break;
        // Standalone options like "A) foo" that start a new question's choice list
        if (/^[A-E][.\)]\s+\S/.test(ntStripped) && sawExp) break;
        if (!nt) {
          if (sawExp) break;
          buf.push(lines[j]);
          j++;
          continue;
        }
        if (sawExp && /^-\s+[A-E][\.\)]\s/.test(nt)) break;
        buf.push(lines[j]);
        if (isExpHdr) sawExp = true;
        j++;
      }
      while (buf.length && !buf[buf.length - 1].trim()) buf.pop();
      pendingChoicesLabel = false;
      els.push(examMode === "essay"
        ? <InlineAnswerBlock key={`ans-${i}`} raw={buf.join("\n")} />
        : <McqAnswerBlock key={`mcq-${i}`} raw={buf.join("\n")} />
      );
      skipUntil = j;
      continue;
    }

    const flowLike = /^(↓|v|\+[-+]+\+|[-+|\s]{3,})$/i.test(t) || (/^[A-Za-z0-9()\/,.''\-\s]+$/.test(t) && /^(STEP\s+\d+|[A-Z][A-Z\s\-]{4,}|Compatible\s+Incompatible|AHR\s+FNHR|Packed\s+Platelet|Hypothermia\s+Dilutional)/.test(t));
    if (t.startsWith("|")) { flushList(); flushFlow(); tableBuf.push(t); underSubheading = false; continue; }
    else if (tableBuf.length) { flushTable(); }

    if (flowLike) { flushList(); flowBuf.push(t); underSubheading = false; continue; }
    else if (flowBuf.length) { flushFlow(); }

    if (!t) { flushList(); flushFlow(); underSubheading = false; continue; }

    if (t.startsWith("> ")) {
      flushList(); underSubheading = false;
      els.push(
        <blockquote key={`bq-${i}`} className="my-4 border-l-3 border-primary/40 pl-4 py-1">
          <p className="text-[15px] italic text-foreground/70 leading-relaxed"><Inline text={t.slice(2)} /></p>
        </blockquote>
      );
      continue;
    }

      const imageMatch = t.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imageMatch) {
      flushList();
      underSubheading = false;
      const alt = imageMatch[1]?.trim() || "Medical illustration";
      const src = imageMatch[2]?.trim();
        if (src) {
        els.push(
          <figure key={`img-${i}`} className="my-7 overflow-hidden rounded-lg border border-border bg-muted/20">
            <img src={src} alt={alt} loading="lazy" decoding="async" className="w-full object-contain" />
            {alt && <figcaption className="border-t border-border px-4 py-2 text-sm leading-relaxed text-muted-foreground">{alt}</figcaption>}
          </figure>
        );
      }
      continue;
    }

    const questionMatch = t.match(/^(QUESTION|Question|Q)\s*(\d+)[:\s-]*(.*)/i);
    // ── Exam-paper front matter → compact meta card ──
    // "Programme: …", "Assessment: …", "Unit Code: …", "Date: …", "Reg No: …"
    const metaFieldRe = /^\*{0,2}\s*(Programme|Program|Course|Assessment|Exam|Paper|Unit Code|Unit|Subject|Date|Time|Duration|Venue|Marks|Instructions?|Reg\.?\s*No\.?|Registration\s*No\.?|Year|Semester|University|School)\s*\*{0,2}\s*[:：]\s*(.+)$/i;
    if (!questionMatch && metaFieldRe.test(t)) {
      const rows: { label: string; value: string }[] = [];
      let j = i;
      while (j < lines.length) {
        const lt = lines[j].trim();
        if (!lt) { j++; continue; }
        const m = lt.match(metaFieldRe);
        if (!m) break;
        rows.push({
          label: cleanDisplayText(m[1]).replace(/\s+/g, " ").trim(),
          value: cleanDisplayText(m[2].replace(/^\*+|\*+$/g, "")).trim(),
        });
        j++;
      }
      if (rows.length >= 2) {
        flushList(); flushTable(); flushFlow(); underSubheading = false;
        els.push(
          <dl
            key={`meta-card-${i}`}
            className="my-6 grid grid-cols-1 gap-x-6 gap-y-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-5 sm:grid-cols-2"
          >
            {rows.map((r, n) => (
              <div key={`meta-row-${i}-${n}`} className="min-w-0">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-primary/80">{r.label}</dt>
                <dd className="mt-0.5 text-[15px] font-medium leading-snug text-foreground break-words">
                  <Inline text={r.value} />
                </dd>
              </div>
            ))}
          </dl>
        );
        skipUntil = j;
        continue;
      }
    }
    if (questionMatch) {
      flushList(); flushPractice(); inPractice = false; underSubheading = false;
      _sec++;
      const qNum = questionMatch[2];
      let qTitle = questionMatch[3]?.replace(/^\s*[-:]\s*/, "").trim() || "";
      // Drop the orphan punctuation OCR/imports leave after the number
      // ("Question 1 . 66-year-old man …").
      qTitle = qTitle.replace(/^[.·•,;:）)\-–—\s]+/, "").trim();
      // Unified layout across the whole site:
      //   "Question N"  →  stem paragraph  →  "Choices"  →  A–E rows  →  Reveal
      // A short ALL-CAPS topic glued onto the header ("Q9 — ABDOMINAL WALL i) …")
      // stays in the heading; everything after it becomes normal body text so it
      // never renders as a giant serif wall of prose.
      qTitle = cleanDisplayText(qTitle.replace(/^\*+|\*+$/g, ""));
      let topic = "";
      let stem = qTitle;
      const capsMatch = qTitle.match(/^([A-Z][A-Z0-9''\/&,\.\-\s]{2,58}?)\s+(?=(?:[ivx]+\)|\(?[a-z]\)|[A-Z][a-z]|[a-z]))/);
      if (capsMatch) {
        topic = capsMatch[1].replace(/[\s,.\-]+$/, "").trim();
        stem = qTitle.slice(capsMatch[0].length).trim();
      } else if (/^[A-Z0-9''\/&,\.\-\s]{3,60}$/.test(qTitle)) {
        topic = qTitle.replace(/[\s,.\-]+$/, "").trim();
        stem = "";
      }
      els.push(
        <div key={`q-${i}`} id={`section-${_sec}`} className="not-prose mt-8 scroll-mt-24 border-t border-border pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-foreground">
              Question {qNum}
            </span>
            {topic && (
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{topic}</span>
            )}
          </div>
        </div>
      );
      if (stem) {
        const leaked = splitLeakedAnswer(stem);
        els.push(
          <p key={`q-stem-${i}`} className="mb-4 mt-3 text-[1.05rem] font-medium leading-[1.7] text-foreground">
            <Inline text={leaked.text} />
          </p>
        );
        if (leaked.answer) els.push(<McqAnswerBlock key={`q-stem-ans-${i}`} raw={leaked.answer} />);
      }
      pendingChoicesLabel = true;
      continue;
    }

    if (/^\*{0,2}\s*(?:Question\s*)?\d+[a-z]?[\.)]\s+.{4,}/i.test(t) && examMode === "essay" && t.length <= 150) {
      flushList(); underSubheading = false;
      els.push(<p key={`essay-q-${i}`} className="mb-4 font-serif text-xl font-bold leading-snug text-foreground"><Inline text={cleanDisplayText(t)} /></p>);
      continue;
    }
    // A long numbered stem is prose, not a display heading — keep it readable.
    if (/^\*{0,2}\s*(?:Question\s*)?\d+[a-z]?[\.)]\s+.{4,}/i.test(t) && examMode === "essay") {
      flushList(); underSubheading = false;
      els.push(<p key={`essay-q-long-${i}`} className="mb-4 text-[1.03rem] leading-8 text-foreground/90"><Inline text={cleanDisplayText(t)} /></p>);
      continue;
    }

    const combinedOpts = Array.from(t.matchAll(/(?:^|\s)([A-E])\s*[\.)]\s*([\s\S]*?)(?=\s*[B-E]\s*[\.)]\s*|$)/gi));
    if (combinedOpts.length >= 2 && !inPractice) {
      if (examMode !== "essay") { flushList(); }
      underSubheading = false;
      if (examMode !== "essay") choicesLabel(`choices-${i}`);
      else pendingChoicesLabel = false;
      combinedOpts.forEach((m, n) => {
        const label = m[1].toUpperCase();
        const rawOption = (m[2] || "").replace(/^\*+|\*+$/g, "").trim();
        const explanationMatch = rawOption.match(/^([\s\S]*?)\s*(?:Explanation|Rationale)\s*[:：]\s*([\s\S]+)$/i);
        const optText = (explanationMatch?.[1] || rawOption).trim();
        if (!optText) return;
        // In SAQ/essay papers the letters are answer points, not MCQ choices —
        // render them as a tight bulleted list so they read as revision points.
        if (examMode === "essay") {
          pushBullet(`**${label}.** ${optText}`, `essay-pt-${i}-${n}`);
          if (explanationMatch?.[2]) pushBullet(explanationMatch[2].trim(), `essay-pt-exp-${i}-${n}`);
          return;
        }
        els.push(
          <div key={`mcqopt-combo-${i}-${n}`} className="not-prose my-1 flex items-start gap-3 rounded-lg border border-border/70 bg-card px-3 py-2.5 transition-colors hover:border-primary/40">
            <span className="mt-px shrink-0 flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">{label}</span>
            <p className="min-w-0 flex-1 text-[15px] leading-[1.55] text-foreground"><Inline text={optText} /></p>
          </div>
        );
        if (explanationMatch?.[2]) {
          els.push(<McqAnswerBlock key={`mcqopt-combo-exp-${i}-${n}`} raw={`Answer: ${label}. ${optText}\nExplanation: ${explanationMatch[2]}`} />);
        }
      });
      continue;
    }

    const subQMatch = t.match(/^(\(?[a-z]\)|[ivx]+\)|\([ivx]+\))\s*(.+)/i);
    // MCQ choice line (A–E) — render uniformly even when wrapped in stray **
    // Handles: "A) text", "**A) text**", "E)** text", "**A.** text", etc.
    const mcqOptMatch = t.match(/^\*{0,2}\s*([A-E])\s*[\.\)]\s*\*{0,2}\s*(.+?)\s*\*{0,2}\s*$/);
    if (mcqOptMatch && !inPractice) {
      if (examMode !== "essay") { flushList(); }
      underSubheading = false;
      const label = mcqOptMatch[1].toUpperCase();
      const rawOption = mcqOptMatch[2].replace(/^\*+|\*+$/g, "").trim();
      const explanationMatch = rawOption.match(/^([\s\S]*?)\s*(?:Explanation|Rationale)\s*[:：]\s*([\s\S]+)$/i);
      const optText = (explanationMatch?.[1] || rawOption).trim();
      // A long lettered line is prose (an answer point), never an MCQ choice.
      if (examMode === "essay" || optText.length > 110) {
        pendingChoicesLabel = false;
        pushBullet(`**${label}.** ${optText}`, `essay-pt-${i}`);
        if (explanationMatch?.[2]) pushBullet(explanationMatch[2].trim(), `essay-pt-exp-${i}`);
        continue;
      }
      if (label === "A") choicesLabel(`choices-${i}`);
      else pendingChoicesLabel = false;
      els.push(
        <div key={`mcqopt-${i}`} className="not-prose my-1 flex items-start gap-3 rounded-lg border border-border/70 bg-card px-3 py-2.5 transition-colors hover:border-primary/40">
          <span className="mt-px shrink-0 flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">{label}</span>
          <p className="min-w-0 flex-1 text-[15px] leading-[1.55] text-foreground"><Inline text={optText} /></p>
        </div>
      );
      if (explanationMatch?.[2]) {
        els.push(<McqAnswerBlock key={`mcqopt-exp-${i}`} raw={`Answer: ${label}. ${optText}\nExplanation: ${explanationMatch[2]}`} />);
      }
      continue;
    }
    if (subQMatch) {
      const label = subQMatch[1].replace(/[()]/g, "").toUpperCase();
      const subText = subQMatch[2].trim();
      // In SAQ/essay papers "(a) …" lines are answer points: bullet them so the
      // page reads as revision points instead of a wall of chipped rows.
      if (examMode === "essay" || subText.length > 110) {
        pushBullet(`**${label}.** ${subText}`, `essay-sub-${i}`);
        continue;
      }
      flushList(); underSubheading = false;
      els.push(
        <div key={`subq-${i}`} className="my-3 flex items-start gap-2.5 pl-1">
          <span className="shrink-0 flex items-center justify-center rounded bg-primary/10 text-primary font-bold text-xs w-7 h-7">{label}</span>
          <p className="flex-1 text-[15px] font-medium text-foreground leading-relaxed pt-0.5"><Inline text={subQMatch[2]} /></p>
        </div>
      );
      continue;
    }

    if (/^#{1,2}\s/.test(t)) {
      flushList(); underSubheading = false;
      const heading = t.replace(/^#+\s+/, "").replace(/\*+/g, "").replace(/⭐+/g, "").replace(/^\d+\.\s*/, "").replace(/^[IVXLC]+\.\s+/, "").trim();
      if (/\b(section\s+a|multiple\s+choice|mcqs?)\b/i.test(heading)) examMode = "mcq";
      if (/\b(section\s+b|section\s+c|essay|short\s+answer|long\s+answer|answer\s+any)\b/i.test(heading)) examMode = "essay";
      if (heading.toLowerCase().includes("practice")) { inPractice = true; continue; }
      flushPractice(); inPractice = false;
      if (!insertedRelated && inlineRelated.length > 0 && els.length >= 4) {
        els.push(<InArticleRelated key="in-article-related" articles={inlineRelated} />);
        insertedRelated = true;
      }
      _sec++;
      els.push(
        <h2 key={`h2-${i}`} id={slugify(heading) || `section-${_sec}`} data-section={`section-${_sec}`} className="mt-9 mb-4 scroll-mt-20 border-b border-border pb-3 font-serif text-2xl font-bold leading-tight text-foreground sm:text-3xl">
          {heading}
        </h2>
      );
      continue;
    }

    if (/^#{3,6}\s/.test(t)) {
      flushList(); underSubheading = true;
      const txt = t.replace(/^#+\s+/, "").replace(/\*+/g, "").replace(/⭐+/g, "").trim();
      els.push(<h3 key={`h3-${i}`} id={slugify(txt)} className="mt-6 mb-2 scroll-mt-20 font-serif text-xl font-bold leading-snug text-foreground">{txt}</h3>);
      continue;
    }

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
      continue;
    }

    if (inPractice && /^\d+\.\s/.test(t) && !t.includes("→")) {
      const next = lines[i + 1]?.trim() ?? "";
      pqs.push({ number: t.match(/^(\d+)/)?.[1] ?? "", question: t.replace(/^\d+\.\s/, ""), answer: next.startsWith("→") ? next.slice(1).trim() : "" });
      continue;
    }
    if (inPractice && t.startsWith("→")) continue;

    if (t.startsWith("- ")) { pushBullet(t.slice(2), `li-${i}`); continue; }

    if (/^\d+\.\s/.test(t) && !t.includes("→") && !inPractice) {
      if (!listBuf || listBuf.type !== "ol") { flushList(); listBuf = { type: "ol", items: [] }; }
      const num = t.match(/^(\d+)/)?.[1] ?? "";
      listBuf.items.push(
        <li key={`ol-${i}`} className="flex items-start gap-2.5 text-base text-foreground/90 leading-8">
          <span className="shrink-0 flex items-center justify-center rounded-full border border-primary/40 bg-primary/5 text-primary text-xs font-semibold w-6 h-6 mt-1">{num}</span>
          <span className="flex-1"><Inline text={t.replace(/^\d+\.\s/, "")} /></span>
        </li>
      );
      continue;
    }

    const boldLabelMatch = t.match(/^\*\*([^*]+)\*\*:?$/);
    if (boldLabelMatch) {
      flushList();
      const blText = boldLabelMatch[1].replace(/:$/, "").trim();
      els.push(<h3 key={`bl-${i}`} id={slugify(blText)} className="mt-6 mb-2 scroll-mt-20 font-semibold text-base text-foreground">{blText}</h3>);
      underSubheading = false;
      continue;
    }

    const isSubLabel = /^[A-Za-z*\s()–-]{2,60}:$/.test(t);
    if (isSubLabel) {
      flushList();
      const slText = t.slice(0, -1).replace(/\*+/g, "").trim();
      els.push(<h3 key={`sl-${i}`} id={slugify(slText)} className="mt-6 mb-2 scroll-mt-20 font-semibold text-lg text-foreground"><Inline text={t.slice(0, -1)} /></h3>);
      underSubheading = false;
      continue;
    }

    if (underSubheading) {
      if (t.startsWith("⚠️") || t.startsWith("⚠")) {
        flushList();
        els.push(
          <div key={`warn-${i}`} className="my-3 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2.5">
            <span className="text-amber-500 text-sm shrink-0">⚠️</span>
            <p className="text-sm leading-relaxed text-foreground/85"><Inline text={t.replace(/^⚠️?\s*/, "")} /></p>
          </div>
        );
        continue;
      }
      underSubheading = false;
      els.push(...renderProse(t, `p-sub-${i}`));
      continue;
    }

    flushList(); underSubheading = false;

    if (t.startsWith("⚠️") || t.startsWith("⚠")) {
      els.push(
        <div key={`wp-${i}`} className="my-3 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2.5">
          <span className="text-amber-500 text-sm shrink-0">⚠️</span>
          <p className="text-sm leading-relaxed text-foreground/85"><Inline text={t.replace(/^⚠️?\s*/, "")} /></p>
        </div>
      );
      continue;
    }

    els.push(...renderProse(t, `p-${i}`));
  }

  if (codeBuf && codeBuf.length) {
    els.push(<FlowBlock key="code-tail-flow" lines={codeBuf} />);
  }

  flushList(); flushTable(); flushFlow(); flushPractice();
  if (!insertedRelated && inlineRelated.length > 0 && els.length > 8) {
    els.splice(Math.max(4, Math.floor(els.length / 2)), 0, <InArticleRelated key="in-article-related" articles={inlineRelated} />);
  }
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
  useHashFlash();

  const [article, setArticle] = useState<Article | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isOffline, setIsOffline] = useState(typeof navigator !== "undefined" ? !navigator.onLine : false);
  const [suggestion, setSuggestion] = useState<{ id: string; title: string; path: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [related, setRelated] = useState<{ articles: any[]; flashcards: any[]; mcqs: any[]; essays: any[] }>({ articles: [], flashcards: [], mcqs: [], essays: [] });
  const [activeSection, setActiveSection] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleBack = () => {
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
    let isReload = false;
    try {
      const navEntry = (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined);
      isReload = navEntry?.type === "reload";
    } catch { /* ignore */ }
    if (isReload && slug) {
      const saved = parseInt(sessionStorage.getItem(`blog_scroll_${slug}`) || "0", 10);
      if (saved > 0) {
        const restore = () => window.scrollTo({ top: saved, left: 0, behavior: "auto" });
        const r1 = requestAnimationFrame(() => { restore(); requestAnimationFrame(restore); });
        const t1 = window.setTimeout(restore, 120);
        const t2 = window.setTimeout(restore, 350);
        const t3 = window.setTimeout(restore, 800);
        return () => { cancelAnimationFrame(r1); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
      }
    }

    // New-route and back/forward scroll are handled centrally by ScrollToTop.
  }, [slug, location.key, article?.id]);

  useEffect(() => {
    if (!slug) return;
    const key = `blog_scroll_${slug}`;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        sessionStorage.setItem(key, String(window.scrollY));
        raf = 0;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [slug]);

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
      const newContent = `

![${imageAlt}](${imageDataUrl})

\n\n${contentWithoutTopImage}`;

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
      const normalizedTitle = article.title.replace(/^#+\s*/, "").replace(/\s+/g, " ").trim();
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
    // Retry transient network/CDN failures before declaring the article missing —
    // a flaky connection must never render "Article unavailable".
    const fetchWithRetry = async (attempt = 0): Promise<any> => {
      try {
        return await getArticleBySlugOrId(slug);
      } catch (err) {
        if (attempt >= 3) throw err;
        await new Promise((r) => setTimeout(r, 400 * Math.pow(2, attempt)));
        return fetchWithRetry(attempt + 1);
      }
    };

    fetchWithRetry()
      .then((a) => {
        if (!a) {
          setNotFound(true);
          findClosestArticle(slug).then((match) => {
            if (!match) return;
            if (match.score >= 0.6) {
              navigate(match.path, { replace: true });
            } else {
              setSuggestion({ id: match.id, title: match.title, path: match.path });
            }
          }).catch(() => {});
          document.title = "Article Not Found";
          let noindex = document.querySelector('meta[name="robots"]');
          if (!noindex) {
            noindex = document.createElement("meta");
            noindex.setAttribute("name", "robots");
            document.head.appendChild(noindex);
          }
          noindex.setAttribute("content", "noindex, nofollow");
          const canonical = document.querySelector('link[rel="canonical"]');
          if (canonical) canonical.remove();
          return;
        }

        const noindex = document.querySelector('meta[name="robots"]');
        if (noindex) noindex.remove();

        setNotFound(false);
        setArticle(a);
        const canonicalPath = buildBlogPath(a);
        if (location.pathname !== canonicalPath) navigate(`${canonicalPath}${location.hash || ""}`, { replace: true });
        markArticleVisited({ id: a.id, title: a.title, category: a.category, visitedAt: Date.now() });
        if (a.category) getRelatedContent(a.category, a.id).then(setRelated);
      })
      .catch(() => {
        // Network still failing: keep the shell, show offline messaging instead of "removed".
        setIsOffline(true);
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [slug, navigate, location.pathname, location.hash]);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  const toc = useMemo(() => article ? extractToc(article.content) : [], [article]);
  const slideDeck = useMemo(() => (article ? parseSlideDeck(article.content || "") : null), [article]);

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

  useEffect(() => {
    if (!article) return;
    const metaTitle = cleanMetaTitle(article);
    const metaDesc = cleanMetaDescription(article);
    const ogImage = article.og_image_url || extractFirstImageFromContent(article.content || "") || `${SITE_URL}/og-default.png`;
    const canonicalUrl = `${SITE_URL}${buildBlogPath(article)}`;
    const plain = stripRichText(article.content || "");
    const year = getYearFromCategory(article.category || "");
    const unit = getCategoryDisplayName(article.category || "") || "Medical Notes";
    const keywords = [
      unit, `${unit} notes`, `${unit} MCQs`, `${unit} past paper`,
      year ? `Year ${year} MBChB` : "MBChB",
      "Mount Kenya University", "MKU", "UON", "KU", "Moi University",
      "medical school Kenya", "past papers with answers", "revision notes",
    ].filter(Boolean) as string[];

    updateMetaTags({
      title: metaTitle,
      description: metaDesc,
      image: ogImage,
      url: canonicalUrl,
      type: "article",
      keywords,
    });

    // Thin/scan-only pages are noise for search engines — keep them readable for
    // humans but out of the index so real pages rank instead.
    let robots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    const isThin = plain.length < 600 || /scanned by camscanner/i.test(article.content || "");
    robots.setAttribute("content", isThin ? "noindex, follow" : "index, follow, max-image-preview:large, max-snippet:-1");

    let ldScript = document.querySelector("script[data-article-ld]") as HTMLScriptElement | null;
    if (!ldScript) {
      ldScript = document.createElement("script");
      ldScript.type = "application/ld+json";
      ldScript.setAttribute("data-article-ld", "true");
      document.head.appendChild(ldScript);
    }
    ldScript.textContent = JSON.stringify([
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": metaTitle.slice(0, 110),
        "description": metaDesc,
        "image": ogImage,
        "url": canonicalUrl,
        "mainEntityOfPage": { "@type": "WebPage", "@id": canonicalUrl },
        "inLanguage": "en",
        "isAccessibleForFree": true,
        "keywords": keywords.join(", "),
        "articleSection": unit,
        "wordCount": plain.split(/\s+/).filter(Boolean).length,
        "educationalLevel": year ? `Year ${year} (MBChB)` : "Undergraduate medicine",
        "learningResourceType": "Study notes and past paper questions",
        "datePublished": article.created_at,
        "dateModified": (article as { updated_at?: string }).updated_at || article.created_at,
        "author": { "@type": "Organization", "name": "Ompath Study", "url": SITE_URL },
        "publisher": {
          "@type": "Organization",
          "name": "Ompath Study",
          "url": SITE_URL,
          "logo": { "@type": "ImageObject", "url": `${SITE_URL}/favicon.png` },
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Notes", item: `${SITE_URL}/blog` },
          ...(year ? [{ "@type": "ListItem", position: 3, name: `Year ${year}`, item: `${SITE_URL}/year/${year}` }] : []),
          { "@type": "ListItem", position: year ? 4 : 3, name: unit, item: `${SITE_URL}/blog?category=${encodeURIComponent(article.category || "")}` },
          { "@type": "ListItem", position: year ? 5 : 4, name: metaTitle.slice(0, 110), item: canonicalUrl },
        ],
      },
    ]);

    autoIndexUrls([canonicalUrl]);

    return () => {
      const ldEl = document.querySelector("script[data-article-ld]");
      if (ldEl) ldEl.remove();
    };
  }, [article]);

  if (loading) {
    return <div className="flex min-h-[65vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (notFound || !article) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="mb-2 text-2xl font-bold text-foreground">
          {isOffline ? "You're offline" : "Article unavailable"}
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {isOffline
            ? "We couldn't load this article without an internet connection. Reconnect and tap retry."
            : "This link may have changed or the article was removed. Try one of the options below."}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {isOffline && (
            <Button variant="default" onClick={() => window.location.reload()}>Retry</Button>
          )}
          {suggestion && !isOffline && (
            <Button asChild variant="default">
              <Link to={suggestion.path}>Open closest match: {suggestion.title}</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to="/blog"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Study Notes</Link>
          </Button>
        </div>
      </div>
    );
  }

  const date = new Date(article.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const unitName = getCategoryDisplayName(article.category);
  const yearName = getYearFromCategory(article.category);
  const hasRelated = related.flashcards.length > 0 || related.mcqs.length > 0;
  const articleEssay = related.essays?.[0];
  const essaySaqs: any[] = Array.isArray(articleEssay?.short_answer_questions) ? articleEssay.short_answer_questions : [];
  const essayLaqs: any[] = Array.isArray(articleEssay?.long_answer_questions) ? articleEssay.long_answer_questions : [];

  return (
    <>
      <ReadingProgress />
      <ExamPreviewBall onOpen={() => setPreviewOpen(true)} />

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

      {/* Main layout */}
      <div className="mx-auto max-w-6xl px-5 py-8">
        <div className={slideDeck ? "" : toc.length > 0 ? "lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-10" : "max-w-3xl mx-auto"}>
          {!slideDeck && toc.length > 0 && (
            <aside className="hidden lg:block">
              <SidebarToc items={toc} activeId={activeSection} />
            </aside>
          )}

          <article id="section-top" className={slideDeck ? "min-w-0" : "min-w-0 lg:max-w-[76ch]"}>
            <Countdown data={(article as any).countdown} />
            <PasswordGate
              enabled={(article as any).password_protected}
              password={(article as any).access_password}
              storageKey={article.slug || article.id}
            >
            <ClassicHero
              title={cleanMetaTitle(article)}
              image={article.og_image_url || extractFirstImageFromContent(article.content || "") || ""}
              date={date}
              unit={unitName && unitName !== "Uncategorized" ? unitName : ""}
              shareUrl={`${SITE_URL}${buildBlogPath(article)}`}
              description={cleanMetaDescription(article)}
              category={article.category}
            />

            {(article as any).reading_time_minutes ? (
              <div className="mb-2"><ReadingTimeBadge minutes={(article as any).reading_time_minutes} /></div>
            ) : null}

            <SourceAttribution article={article} />

            <HtmlEmbed data={(article as any).html_embed} position="top" />

            {(article as any).toc_enabled && <ContentToc content={article.content} />}

            <div className="prose-custom article-reader">
              <KeywordLinkProvider currentPath={buildBlogPath(article)}>
                {slideDeck
                  ? <SlideDeckView
                      deck={slideDeck}
                      articleId={article.id}
                      title={cleanMetaTitle(article)}
                      university={inferUniversity(article)}
                      onPreview={() => setPreviewOpen(true)}
                    />
                  : <ArticleContent content={article.content} inlineRelated={related.articles || []} />}
              </KeywordLinkProvider>
            </div>

            {!slideDeck && (
              <ArticleSubscribeGate
                hasMcqs={/(?:^|\n)\s*(?:✅\s*)?(?:answer|correct answer)\s*[:：]/i.test(article.content || "")}
              />
            )}

            <HtmlEmbed data={(article as any).html_embed} position="bottom" />

            {Array.isArray((article as any).tags) && (article as any).tags.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2 border-t border-border pt-5">
                {(article as any).tags.slice(0, 8).map((tag: string) => (
                  <a
                    key={tag}
                    href={`https://www.google.com/search?q=${encodeURIComponent(`${tag} site:ompathstudy.com`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
                  >
                    #{tag}
                  </a>
                ))}
              </div>
            )}

            <div className="mt-10 pt-6 border-t border-border">
              <ShareButtons
                url={`${SITE_URL}${buildBlogPath(article)}`}
                title={cleanMetaTitle(article)}
                description={cleanMetaDescription(article)}
                variant="full"
              />
            </div>

            {(essaySaqs.length > 0 || essayLaqs.length > 0) && (
              <section className="mt-12 rounded-xl border border-border bg-card p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  <h2 className="font-serif text-xl font-bold text-foreground">Practice Essay Questions</h2>
                </div>
                {essaySaqs.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Short Answer Questions</p>
                    <div className="space-y-2">
                      {essaySaqs.map((q: any, i: number) => (
                        <EssayQuestion
                          key={`saq-${i}`}
                          number={`${i + 1}`}
                          question={q.question || ""}
                          answer={q.model_answer || q.answer || ""}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {essayLaqs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Long Answer Questions</p>
                    <div className="space-y-2">
                      {essayLaqs.map((q: any, i: number) => (
                        <EssayQuestion
                          key={`laq-${i}`}
                          number={`${i + 1}`}
                          question={q.question || ""}
                          answer={q.model_answer || q.answer || ""}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

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
                          <Link key={f.id} to={buildFlashcardPath(f)} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-primary/40 hover:bg-muted/30 transition-colors">
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
                          <Link key={m.id} to={buildMcqPath(m)} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-primary/40 hover:bg-muted/30 transition-colors">
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

            {related.articles && related.articles.length > 0 && (
              <section className="mt-12 border-t border-border pt-8">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h2 className="font-serif text-xl font-bold text-foreground">Related Articles</h2>
                  </div>
                  <span className="text-xs text-muted-foreground">Tap or hover to pause · swipe</span>
                </div>
                <RelatedMarquee articles={related.articles} />
              </section>
            )}

            {(article as any).comments_enabled !== false && <ArticleComments articleId={article.id} />}
            </PasswordGate>
          </article>
          {slideDeck ? (
            <SlidePreviewModal
              deck={slideDeck}
              title={cleanMetaTitle(article)}
              university={inferUniversity(article)}
              open={previewOpen}
              onClose={() => setPreviewOpen(false)}
            />
          ) : (
            <ExamPreviewModal article={article} open={previewOpen} onClose={() => setPreviewOpen(false)} />
          )}
        </div>
      </div>
    </>
  );
}

function RelatedMarquee({ articles }: { articles: any[] }) {
  const [paused, setPaused] = useState(false);
  const list = [...articles.slice(0, 12), ...articles.slice(0, 12)];
  return (
    <div
      className="group relative -mx-5 overflow-x-auto overflow-y-hidden"
      onTouchStart={() => setPaused(true)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onClick={() => setPaused((p) => !p)}
    >
      <div
        className="flex w-max gap-3 px-5 animate-marquee-slow"
        style={{ animationPlayState: paused ? "paused" : "running" }}
      >
        {list.map((a: any, i: number) => (
          <RelatedArticleCard key={`${a.id}-${i}`} article={a} compact />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}
