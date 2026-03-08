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
import BlogAudioPlayer from "@/components/BlogAudioPlayer";

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
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const color = pct < 30 ? "#ef4444" : pct < 60 ? "#f59e0b" : pct < 90 ? "#22c55e" : "#16a34a";
  const label = pct < 2 ? "Start" : pct > 97 ? "Done ✓" : `${Math.round(pct)}%`;

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-transparent">
        <div className="h-full transition-all duration-150" style={{ width: `${pct}%`, background: color }} />
      </div>

      <button
        onClick={() => setExpanded(e => !e)}
        className="fixed bottom-6 right-6 z-50 focus:outline-none"
        aria-label="Reading progress"
        style={{ background: "transparent", border: "none", padding: 0, lineHeight: 0 }}
      >
        <div style={{
          position: "absolute",
          bottom: 0, right: 0,
          width: 10, height: 10,
          borderRadius: "50%",
          background: color,
          opacity: expanded ? 0 : 0.35,
          transition: "opacity 0.25s",
          pointerEvents: "none",
        }} />

        <div style={{
          width: 56, height: 56,
          opacity: expanded ? 1 : 0,
          transform: expanded ? "scale(1)" : "scale(0.3)",
          transition: "opacity 0.25s, transform 0.25s",
          pointerEvents: expanded ? "auto" : "none",
          position: "relative",
        }}>
          <svg
            style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}
            width={56} height={56} viewBox="0 0 56 56"
          >
            <circle cx={28} cy={28} r={23} fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth={1.5} />
            <circle
              cx={28} cy={28} r={23}
              fill="none" stroke={color} strokeWidth={4}
              strokeDasharray={`${(pct / 100) * (2 * Math.PI * 23)} ${2 * Math.PI * 23}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.3s ease, stroke 0.3s ease" }}
            />
          </svg>
          <span style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: "700", fontSize: "12px", color, lineHeight: 1,
          }}>{label}</span>
        </div>
      </button>
    </>
  );
}

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
    <div className="my-5 overflow-hidden rounded-xl border border-border">
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: Math.max(480, headers.length * 160) }}>
          <thead>
            <tr className="border-b border-border bg-primary/10">
              {headers.map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-sm font-bold text-foreground align-top">
                  <Inline text={h} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className={`border-b border-border/60 last:border-0 ${ri % 2 === 1 ? "bg-muted/20" : ""}`}>
                {headers.map((_, ci) => (
                  <td key={ci} className="px-4 py-3 text-sm leading-relaxed text-foreground/85 align-top">
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

function PracticeQuestion({ number, question, answer }: {
  number: string; question: string; answer: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 px-4 py-4 text-left hover:bg-muted/20 active:bg-muted/40 transition-colors"
      >
        <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full border border-primary/50 bg-primary/10 text-primary text-[14px] font-bold mt-0.5">
          {number}
        </span>
        <span className="flex-1 text-[17px] font-medium text-foreground leading-snug">
          <Inline text={question} />
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground mt-0.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="a" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="px-4 py-4 border-t border-border bg-primary/5 flex gap-3">
              <span className="text-primary font-bold text-[17px] shrink-0 mt-0.5">→</span>
              <p className="text-[17px] text-foreground/90 leading-relaxed"><Inline text={answer} /></p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function splitInlineTable(s: string): string[] {
  if (!s.includes("|---") && !s.includes("| ---")) return [];
  return s
    .replace(/\|\s*\|/g, "|\n|")
    .split("\n")
    .map(r => r.trim())
    .filter(r => r.startsWith("|") && r.endsWith("|"));
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
        const parts = t.slice(2).split(" - ").map((s: string) => s.trim()).filter(Boolean);
        parts.forEach((p: string) => out.push(`- ${p}`));
        continue;
      }
    }

    if (/^#{1,2}\s/.test(t)) {
      const heading = t.replace(/^#+\s+/, "").replace(/\*+/g, "").replace(/⭐+/g, "").trim();
      if (/^key points$/i.test(heading)) { inKeyPoints = true; continue; }
      if (inKeyPoints) inKeyPoints = false;
      if (META_HEADING.test(heading)) continue;
      if (/:\s+1\.\s/.test(heading)) {
        const colonIdx = heading.indexOf(": ");
        const labelOnly = heading.slice(0, colonIdx).trim();
        const listPart = heading.slice(colonIdx + 2).trim();
        const hashes = t.match(/^(#{1,2})/)?.[1] ?? "##";
        if (labelOnly) out.push(`${hashes} ${labelOnly}`);
        listPart.split(/(?=(?:^|\s)\d+\.\s)/).map((s: string) => s.trim()).filter(Boolean).forEach((item: string) => out.push(item));
        continue;
      }
      if (heading.includes("|---") || heading.includes("| ---")) {
        const pipeIdx = heading.search(/ \|/);
        if (pipeIdx !== -1) {
          const headOnly = heading.slice(0, pipeIdx).trim();
          const hashes = t.match(/^(#{1,2})/)?.[1] ?? "##";
          if (headOnly) out.push(`${hashes} ${headOnly}`);
          splitInlineTable(heading.slice(pipeIdx).trim()).forEach(r => out.push(r));
          continue;
        }
      }
      out.push(line);
      continue;
    }

    if (inKeyPoints) continue;

    if (/^#{3,6}\s/.test(t)) {
      const hashes = t.match(/^(#{3,6})/)?.[1] ?? "###";
      const headText = t.replace(/^#{3,6}\s+/, "");
      if (headText.includes("|---") || headText.includes("| ---")) {
        const pipeIdx = headText.search(/ \|/);
        if (pipeIdx !== -1) {
          const headOnly = headText.slice(0, pipeIdx).replace(/⭐+/g, "").trim();
          if (headOnly) out.push(`${hashes} ${headOnly}`);
          splitInlineTable(headText.slice(pipeIdx).trim()).forEach(r => out.push(r));
          continue;
        }
      }
      const bulletSplit = headText.search(/ - (?=[A-Z*\d"(])/);
      if (bulletSplit !== -1) {
        const headOnly = headText.slice(0, bulletSplit).replace(/⭐+/g, "").trim();
        if (headOnly) out.push(`${hashes} ${headOnly}`);
        headText.slice(bulletSplit + 3)
          .split(/ - (?=[A-Z*\d"(])/)
          .map(b => b.trim()).filter(Boolean)
          .forEach(b => out.push(`- ${b}`));
        continue;
      }
      out.push(line);
      continue;
    }

    if (!t.startsWith("|") && (t.includes("|---") || t.includes("| ---"))) {
      const pipeIdx = t.indexOf("| ");
      const prefix = t.slice(0, pipeIdx).replace(/[⭐:*\s]+$/, "").trim();
      if (prefix) out.push(`### ${prefix}`);
      splitInlineTable(t.slice(pipeIdx).trim()).forEach(r => out.push(r));
      continue;
    }

    if (!t.startsWith("- ") && !t.startsWith("#") && !t.startsWith("|")) {
      const allDashes = [...t.matchAll(/ - /g)];
      const capDashes = [...t.matchAll(/ - (?=[A-Z*\d"(])/g)];
      const splitPoints = allDashes.length >= 5 ? allDashes : capDashes;
      if (splitPoints.length >= 2) {
        const firstIdx = splitPoints[0].index!;
        const prefix = t.slice(0, firstIdx).replace(/[⭐:\s]+$/, "").trim();
        if (prefix) out.push(`### ${prefix}`);
        const splitter = allDashes.length >= 5 ? / - / : / - (?=[A-Z*\d"(])/;
        t.slice(firstIdx + 3)
          .split(splitter)
          .map(b => b.trim()).filter(Boolean)
          .forEach(b => out.push(`- ${b}`));
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

let _sec = 0;

function ArticleContent({ content }: { content: string }) {
  _sec = 0;
  const lines = preprocessContent(content).split("\n");
  const els: React.ReactNode[] = [];
  let listBuf: { type: "ul" | "ol"; items: React.ReactNode[] } | null = null;
  let inPractice = false;
  let tableBuf: string[] = [];
  let underSubheading = false; // ← NEW: track whether we're directly under a ### heading
  const pqs: { number: string; question: string; answer: string }[] = [];

  const flushList = () => {
    if (!listBuf) return;
    els.push(<div key={`list-${els.length}`} className="mb-5 space-y-3">{listBuf.items}</div>);
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
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="h-5 w-5 text-primary" />
          <span className="text-[13px] font-bold uppercase tracking-wider text-primary">Practice Questions</span>
          <span className="ml-auto text-[12px] text-muted-foreground italic">tap to reveal</span>
        </div>
        <div className="space-y-3">
          {pqs.map((q, k) => <PracticeQuestion key={k} number={q.number} question={q.question} answer={q.answer} />)}
        </div>
      </div>
    );
    pqs.length = 0;
  };

  // ─── Helper: render a line as a bullet item ─────────────────────────────
  const pushBullet = (text: string, key: string) => {
    if (!listBuf || listBuf.type !== "ul") { flushList(); listBuf = { type: "ul", items: [] }; }
    listBuf.items.push(
      <div key={key} className="flex items-start gap-3">
        <div className="rounded-full bg-primary shrink-0" style={{ width: "9px", height: "9px", minWidth: "9px", marginTop: "9px" }} />
        <span className="text-[17px] text-foreground/90 leading-relaxed flex-1"><Inline text={text} /></span>
      </div>
    );
  };

  lines.forEach((line, i) => {
    const t = line.trim();

    if (t.startsWith("|")) { flushList(); tableBuf.push(t); underSubheading = false; return; }
    else if (tableBuf.length) { flushTable(); }

    if (!t) {
      // A blank line ends the "under subheading" auto-bullet zone
      flushList();
      underSubheading = false;
      return;
    }

    if (t.startsWith("> ")) {
      flushList();
      underSubheading = false;
      els.push(
        <div key={`bq-${i}`} className="my-4 pl-4 border-l-4 border-primary/40 rounded-sm bg-primary/5 py-2 pr-3">
          <p className="text-[16px] italic text-foreground/75 leading-relaxed"><Inline text={t.slice(2)} /></p>
        </div>
      );
      return;
    }

    // ## headings
    if (/^#{1,2}\s/.test(t)) {
      flushList();
      underSubheading = false;
      const heading = t
        .replace(/^#+\s+/, "").replace(/\*+/g, "").replace(/⭐+/g, "")
        .replace(/^\d+\.\s*/, "").replace(/^[IVXLC]+\.\s+/, "").trim();
      if (heading.toLowerCase().includes("practice")) { inPractice = true; return; }
      flushPractice(); inPractice = false;
      _sec++;
      els.push(
        <div key={`h2-${i}`} className="mt-12 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="shrink-0 flex items-center justify-center rounded-full border-2 border-primary/50 text-primary font-bold text-[16px] w-[46px] h-[46px] bg-primary/10">
              {_sec}
            </div>
            <h2 className="font-bold text-[22px] sm:text-[26px] text-foreground leading-tight">{heading}</h2>
          </div>
          <div className="border-b border-border" />
        </div>
      );
      return;
    }

    // ### subheadings — set underSubheading = true
    if (/^#{3,6}\s/.test(t)) {
      flushList();
      underSubheading = true; // ← lines after this heading become auto-bullets
      const txt = t.replace(/^#+\s+/, "").replace(/\*+/g, "").replace(/⭐+/g, "").trim();
      els.push(<h3 key={`h3-${i}`} className="mt-6 mb-3 font-bold text-[18px] sm:text-[19px] text-foreground leading-snug">{txt}</h3>);
      return;
    }

    // Practice Q&A
    const qa = t.match(/^(\d+)\.\s(.+?)\s*→\s*(.+)$/);
    if (qa) {
      flushList();
      underSubheading = false;
      if (inPractice) pqs.push({ number: qa[1], question: qa[2], answer: qa[3] });
      else els.push(
        <div key={`qa-${i}`} className="mb-4 rounded-2xl border border-border bg-card p-5">
          <p className="text-[17px] font-medium text-foreground">{qa[1]}. <Inline text={qa[2]} /></p>
          <p className="mt-2 text-[17px] text-primary font-semibold">→ <Inline text={qa[3]} /></p>
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

    // Explicit "- " bullet
    if (t.startsWith("- ")) {
      pushBullet(t.slice(2), `li-${i}`);
      return;
    }

    // Numbered list
    if (/^\d+\.\s/.test(t) && !t.includes("→") && !inPractice) {
      if (!listBuf || listBuf.type !== "ol") { flushList(); listBuf = { type: "ol", items: [] }; }
      const num = t.match(/^(\d+)/)?.[1] ?? "";
      listBuf.items.push(
        <div key={`ol-${i}`} className="flex items-start gap-3">
          <div className="shrink-0 flex items-center justify-center rounded-full border border-primary/50"
            style={{ width: "28px", height: "28px", minWidth: "28px", marginTop: "1px", background: "hsl(var(--primary) / 0.08)", color: "hsl(var(--primary))", fontSize: "13px", fontWeight: "600" }}>
            {num}
          </div>
          <span className="text-[17px] text-foreground/90 leading-relaxed flex-1"><Inline text={t.replace(/^\d+\.\s/, "")} /></span>
        </div>
      );
      return;
    }

    // ─── AUTO-BULLET LOGIC ──────────────────────────────────────────────────
    const isItalicLine = /^\*[^*]/.test(t);
    const isSubLabel = /^[A-Za-z*\s()–-]{2,60}:$/.test(t);

    // Bold-only lines like **Pathogenesis:** → render as ### subheading
    const boldLabelMatch = t.match(/^\*\*([^*]+)\*\*:?$/);
    if (boldLabelMatch) {
      flushList();
      const labelText = boldLabelMatch[1].replace(/:$/, "").trim();
      els.push(<h3 key={`bold-label-${i}`} className="mt-6 mb-3 font-bold text-[18px] sm:text-[19px] text-foreground leading-snug">{labelText}</h3>);
      underSubheading = true;
      return;
    }

    // Sub-labels ending with ":" → ### subheading
    if (isSubLabel) {
      flushList();
      underSubheading = false;
      els.push(<h3 key={`sublabel-${i}`} className="mt-6 mb-3 font-bold text-[18px] sm:text-[19px] text-foreground leading-snug"><Inline text={t.slice(0, -1)} /></h3>);
      underSubheading = true;
      return;
    }

    if (isItalicLine || underSubheading) {
      // ⚠️ lines → styled amber callout box
      if (t.startsWith("⚠️") || t.startsWith("⚠")) {
        flushList();
        const warningText = t.replace(/^⚠️?\s*/, "").trim();
        els.push(
          <div key={`warn-${i}`} className="my-3 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-3">
            <span className="text-amber-500 text-[16px] shrink-0 mt-0.5">⚠️</span>
            <p className="text-[15px] leading-relaxed text-foreground/85"><Inline text={warningText} /></p>
          </div>
        );
        return;
      }
      pushBullet(t, `auto-li-${i}`);
      return;
    }
    // ────────────────────────────────────────────────────────────────────────

    flushList();
    underSubheading = false;

    // Standalone ⚠️ lines outside subheading context
    if (t.startsWith("⚠️") || t.startsWith("⚠")) {
      const warningText = t.replace(/^⚠️?\s*/, "").trim();
      els.push(
        <div key={`warn-p-${i}`} className="my-3 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-3">
          <span className="text-amber-500 text-[16px] shrink-0 mt-0.5">⚠️</span>
          <p className="text-[15px] leading-relaxed text-foreground/85"><Inline text={warningText} /></p>
        </div>
      );
      return;
    }

    els.push(<p key={`p-${i}`} className="mb-4 text-[17px] leading-relaxed text-foreground/85"><Inline text={t.replace(/^#+\s*/, "")} /></p>);
  });

  flushList(); flushTable(); flushPractice();
  return <div>{els}</div>;
}

export default function BlogPost() {
  const { id } = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState<{ articles: any[]; flashcards: any[]; mcqs: any[] }>({ articles: [], flashcards: [], mcqs: [] });

  const scrollKey = `scroll:${id}`;

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

  useEffect(() => {
    if (loading) return;
    const saved = localStorage.getItem(scrollKey);
    if (saved) {
      const y = parseInt(saved, 10);
      const restore = () => window.scrollTo({ top: y, behavior: "instant" });
      requestAnimationFrame(() => requestAnimationFrame(restore));
    }
  }, [loading, scrollKey]);

  useEffect(() => {
    if (loading) return;
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          localStorage.setItem(scrollKey, String(window.scrollY));
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [loading, scrollKey]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!article) return (
    <div className="mx-auto max-w-3xl px-6 py-20 text-center">
      <h1 className="mb-4 font-bold text-3xl text-foreground">Article not found</h1>
      <Button asChild variant="outline"><Link to="/blog"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Blog</Link></Button>
    </div>
  );

  const date = new Date(article.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const unitName = getCategoryDisplayName(article.category);
  const hasRelated = related.flashcards.length > 0 || related.mcqs.length > 0;

  return (
    <>
      <ReadingProgress />
      <div className="mx-auto max-w-3xl px-5 sm:px-6 py-8 sm:py-12">
        <Link to="/blog" className="inline-flex items-center gap-2 text-[15px] text-muted-foreground hover:text-foreground transition-colors mb-10">
          <ArrowLeft className="h-4 w-4" /> Back to Blog
        </Link>
        <div className="flex flex-wrap items-center gap-2 mb-4 text-[15px] text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{date}</span>
          {unitName && unitName !== "Uncategorized" && (<><span className="mx-1">·</span><span className="font-bold uppercase tracking-wider text-foreground/70">{unitName}</span></>)}
        </div>
        <h1 className="mb-10 font-bold text-[28px] sm:text-[36px] leading-tight text-foreground">
          {article.title.replace(/^#+\s*/, "")}
        </h1>
        <ArticleContent content={article.content} />
        {hasRelated && (
          <div className="mt-14 rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-[17px] text-foreground">Continue Learning</h3>
              {unitName && unitName !== "Uncategorized" && <span className="ml-auto text-[13px] text-muted-foreground">{unitName}</span>}
            </div>
            <div className="p-5 space-y-5">
              {related.flashcards.length > 0 && (
                <div>
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Flashcards</p>
                  <div className="space-y-2">
                    {related.flashcards.map((f: any) => (
                      <Link key={f.id} to={`/flashcards/${f.id}`} className="flex items-center gap-4 rounded-xl border border-border bg-background p-4 hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] transition-all">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10"><GraduationCap className="h-5 w-5 text-amber-500" /></div>
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
                      <Link key={m.id} to={`/mcqs/${m.id}`} className="flex items-center gap-4 rounded-xl border border-border bg-background p-4 hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] transition-all">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10"><ListChecks className="h-5 w-5 text-emerald-500" /></div>
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
