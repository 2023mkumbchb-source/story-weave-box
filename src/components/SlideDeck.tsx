import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, X, ZoomIn, Images, Check } from "lucide-react";

/**
 * Slide / spot-exam deck renderer.
 *
 * Some articles are pure "image + answer key" sets (SDL spot marathons,
 * embryology slide reviews). Rendering those through the normal prose
 * pipeline produced one long run-on answer paragraph. This component gives
 * them a purpose-built layout: one card per slide, the plate on top, and a
 * short "Reveal" toggle that opens a numbered answer table — one answer per
 * row, never sharing a row.
 */

export interface SlideAnswerRow {
  label?: string;   // "A", "Left image — B", "" when unlabelled
  term: string;     // the actual answer
  detail?: string;  // trailing explanation after — / –
}

export interface Slide {
  key: string;
  number: string;      // "1", "22", "26b"
  prompt: string;      // "Name the breast anomalies (left to right)"
  image?: string;
  alt?: string;
  rows: SlideAnswerRow[];
  labelled: boolean;   // A/B/C style → render as table
}

export interface SlideDeck {
  intro: string;
  slides: Slide[];
  footer: string;
}

const clean = (s: string) =>
  (s || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\*+/g, "")
    .replace(/`+/g, "")
    .replace(/\s+/g, " ")
    .trim();

function splitRow(raw: string): SlideAnswerRow {
  const text = clean(raw.replace(/^[-*•]\s*/, ""));
  const labelled = text.match(/^([A-Z](?:\s*[-–/]\s*[A-Z])?|(?:Left|Right|Top|Bottom)[^:]{0,28}?)\s*:\s*(.+)$/);
  let label: string | undefined;
  let body = text;
  if (labelled) {
    label = clean(labelled[1]);
    body = clean(labelled[2]);
  }
  const dash = body.match(/^(.{2,90}?)\s+[—–]\s+(.+)$/);
  if (dash) return { label, term: clean(dash[1]), detail: clean(dash[2]) };
  return { label, term: body };
}

/** Parse `## Number N: prompt` + image + `**Answer:**` bullet blocks. */
export function parseSlideDeck(content: string): SlideDeck | null {
  if (!content) return null;
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const slides: Slide[] = [];
  const introLines: string[] = [];
  const footerLines: string[] = [];
  let cur: Slide | null = null;
  let inAnswer = false;
  let seenAny = false;

  const push = () => {
    if (cur && (cur.image || cur.rows.length)) {
      cur.labelled = cur.rows.length > 1 && cur.rows.every((r) => !!r.label);
      slides.push(cur);
    }
    cur = null;
    inAnswer = false;
  };

  for (const line of lines) {
    const t = line.trim();
    const head = t.match(/^#{2,3}\s+(?:Number|Slide|Plate|Q(?:uestion)?)\s*([0-9]+[a-z]?)\s*[:.\-–]?\s*(.*)$/i);
    if (head) {
      push();
      seenAny = true;
      cur = { key: `slide-${head[1]}-${slides.length}`, number: head[1], prompt: clean(head[2]), rows: [], labelled: false };
      continue;
    }
    if (!cur) {
      (seenAny ? footerLines : introLines).push(line);
      continue;
    }
    const img = t.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (img) {
      if (!cur.image) { cur.image = img[2].trim(); cur.alt = clean(img[1]); }
      continue;
    }
    if (/^\*{0,2}\s*(?:✅\s*)?(?:Answer|Answers|Answer key)\s*[:：]?\s*\*{0,2}$/i.test(t)) { inAnswer = true; continue; }
    const inlineAnswer = t.match(/^\*{0,2}\s*(?:✅\s*)?(?:Answer|Answers)\s*[:：]\s*\*{0,2}(.+)$/i);
    if (inlineAnswer) { inAnswer = true; cur.rows.push(splitRow(inlineAnswer[1])); continue; }
    if (!t) continue;
    if (/^[-*•]\s+/.test(t) || /^\d+[.)]\s+/.test(t)) {
      cur.rows.push(splitRow(t.replace(/^\d+[.)]\s+/, "")));
      continue;
    }
    if (inAnswer) cur.rows.push(splitRow(t));
    else if (!cur.prompt) cur.prompt = clean(t);
  }
  push();

  const withImages = slides.filter((s) => s.image).length;
  if (slides.length < 3 || withImages < Math.max(3, Math.ceil(slides.length * 0.6))) return null;

  return {
    intro: introLines.join("\n").trim(),
    slides,
    footer: footerLines.join("\n").trim(),
  };
}

/* ── Lightbox ── */
function Lightbox({ src, alt, onClose }: { src: string; alt?: string; onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-background/95 p-3 backdrop-blur-sm" onClick={onClose}>
      <button className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground" aria-label="Close image">
        <X className="h-4 w-4" />
      </button>
      <img src={src} alt={alt || ""} className="max-h-[92vh] w-auto max-w-full rounded-lg object-contain" />
    </div>
  );
}

/* ── Answer rows ── */
function AnswerRows({ rows, labelled }: { rows: SlideAnswerRow[]; labelled: boolean }) {
  if (!rows.length) return null;

  if (labelled) {
    return (
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th scope="col" className="w-20 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Label</th>
              <th scope="col" className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Structure</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border/70 align-top even:bg-muted/20">
                <td className="px-3 py-2.5 font-mono text-xs font-bold text-primary">{r.label}</td>
                <td className="px-3 py-2.5 leading-relaxed text-foreground">
                  <span className="font-medium">{r.term}</span>
                  {r.detail && <span className="mt-0.5 block text-[13px] text-muted-foreground">{r.detail}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border">
      {rows.map((r, i) => (
        <li key={i} className="flex items-start gap-3 px-3 py-2.5 even:bg-muted/20">
          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
            {i + 1}
          </span>
          <span className="min-w-0 flex-1 text-sm leading-relaxed">
            {r.label && <span className="mr-1.5 font-mono text-xs font-bold text-primary">{r.label}:</span>}
            <span className="font-medium text-foreground">{r.term}</span>
            {r.detail && <span className="mt-0.5 block text-[13px] leading-relaxed text-muted-foreground">{r.detail}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ── One slide card ── */
function SlideCard({ slide, index, onZoom, defaultOpen = false }: { slide: Slide; index: number; onZoom: (s: Slide) => void; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [loaded, setLoaded] = useState(false);
  const eager = index < 2;

  return (
    <article id={`slide-${slide.number}`} className="scroll-mt-24 overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-start gap-3 border-b border-border px-4 py-3">
        <span className="mt-0.5 inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg bg-primary px-1.5 text-[13px] font-bold text-primary-foreground">
          {slide.number}
        </span>
        <h2 className="flex-1 font-serif text-[16px] font-bold leading-snug text-foreground sm:text-lg">
          {slide.prompt || `Slide ${slide.number}`}
        </h2>
      </header>

      {slide.image && (
        <button
          type="button"
          onClick={() => onZoom(slide)}
          className="group relative block w-full bg-muted/40"
          aria-label="Enlarge plate"
        >
          <span className="block aspect-[3/2] w-full overflow-hidden">
            <img
              src={slide.image}
              alt={slide.alt || slide.prompt}
              loading={eager ? "eager" : "lazy"}
              decoding="async"
              // @ts-expect-error fetchpriority is valid HTML
              fetchpriority={eager ? "high" : "low"}
              onLoad={() => setLoaded(true)}
              className={`h-full w-full object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
            />
          </span>
          {!loaded && <span className="absolute inset-0 animate-pulse bg-muted" />}
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-1 text-[11px] font-semibold text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
            <ZoomIn className="h-3 w-3" /> Zoom
          </span>
        </button>
      )}

      {slide.rows.length > 0 && (
        <div className="px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            {open ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {open ? "Hide" : "Reveal"}
          </button>
          {open && (
            <div className="mt-3">
              <AnswerRows rows={slide.rows} labelled={slide.labelled} />
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/* ── Deck ── */
export function SlideDeckView({ deck, revealAllDefault = false }: { deck: SlideDeck; revealAllDefault?: boolean }) {
  const [zoom, setZoom] = useState<Slide | null>(null);
  const [allKey, setAllKey] = useState(0);
  const [revealAll, setRevealAll] = useState(revealAllDefault);

  const intro = useMemo(
    () => deck.intro.split("\n").map((l) => l.trim()).filter((l) => l && !/^#\s/.test(l) && !/^!\[/.test(l)),
    [deck.intro],
  );

  return (
    <div className="not-prose">
      {intro.length > 0 && (
        <div className="mb-6 rounded-lg border-l-2 border-primary/40 bg-muted/30 px-4 py-3">
          {intro.map((l, i) => (
            <p key={i} className="text-[14px] leading-relaxed text-muted-foreground">{clean(l)}</p>
          ))}
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-y border-border py-3">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Images className="h-3.5 w-3.5 text-primary" />
          {deck.slides.length} plates · tap Reveal for the answer key
        </p>
        <button
          type="button"
          onClick={() => { setRevealAll((v) => !v); setAllKey((k) => k + 1); }}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Check className="h-3.5 w-3.5" />
          {revealAll ? "Hide all answers" : "Reveal all answers"}
        </button>
      </div>

      {/* Jump strip */}
      <nav aria-label="Slide index" className="mb-6 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {deck.slides.map((s) => (
          <a
            key={s.key}
            href={`#slide-${s.number}`}
            className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            {s.number}
          </a>
        ))}
      </nav>

      <div className="grid gap-5 sm:grid-cols-2">
        {deck.slides.map((s, i) => (
          <SlideCard key={`${s.key}-${allKey}`} slide={s} index={i} onZoom={setZoom} defaultOpen={revealAll} />
        ))}
      </div>

      {deck.footer && (
        <p className="mt-8 border-t border-border pt-4 text-[13px] italic leading-relaxed text-muted-foreground">
          {clean(deck.footer)}
        </p>
      )}

      {zoom?.image && <Lightbox src={zoom.image} alt={zoom.alt} onClose={() => setZoom(null)} />}
    </div>
  );
}

/* ── Preview modal: plates + answers ── */
export function SlidePreviewModal({
  deck, title, university, open, onClose,
}: { deck: SlideDeck; title: string; university?: string; open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 p-2 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <div className="relative mx-auto my-4 w-full max-w-3xl rounded-xl bg-white text-neutral-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="sticky top-2 float-right z-10 mr-2 mt-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white"
          aria-label="Close preview"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="clear-both px-5 py-8 font-serif sm:px-10 sm:py-12">
          <div className="mb-8 border-b-2 border-neutral-900 pb-5 text-center">
            {university && <p className="text-sm font-bold uppercase tracking-[0.2em] text-neutral-800">{university}</p>}
            <h1 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">{title}</h1>
            <p className="mt-3 text-[11px] italic text-neutral-500">Spot paper preview — {deck.slides.length} plates with answer key.</p>
          </div>
          <ol className="space-y-10">
            {deck.slides.map((s) => (
              <li key={s.key}>
                <p className="mb-3 text-[15px] font-bold">{s.number}. {s.prompt}</p>
                {s.image && (
                  <img src={s.image} alt={s.alt || s.prompt} loading="lazy" decoding="async" className="mb-3 w-full rounded border border-neutral-200 object-contain" />
                )}
                {s.rows.length > 0 && (
                  <table className="w-full border-collapse text-left text-[13px]">
                    <tbody>
                      {s.rows.map((r, i) => (
                        <tr key={i} className="border-b border-neutral-200 align-top last:border-0">
                          <td className="w-16 py-1.5 pr-2 font-bold text-neutral-500">{r.label || `${i + 1}.`}</td>
                          <td className="py-1.5">
                            {r.term}
                            {r.detail && <span className="block text-neutral-500">{r.detail}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </li>
            ))}
          </ol>
          <div className="mt-10 border-t border-neutral-300 pt-4 text-center text-[11px] text-neutral-500">
            Ompath Study · End of preview
          </div>
        </div>
      </div>
    </div>
  );
}