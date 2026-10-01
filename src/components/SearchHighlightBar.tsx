import { useState } from "react";
import { ChevronDown, ChevronUp, Highlighter, X } from "lucide-react";
import { useSearchHighlight } from "@/hooks/useSearchHighlight";

/** Floating "match 2 of 9 ▲ ▼" control shown when a note was opened from a search (?hl=…). */
export default function SearchHighlightBar({ term, ready, selector = ".article-reader" }: { term: string | null; ready: boolean; selector?: string }) {
  const [dismissed, setDismissed] = useState(false);
  const { count, index, next, prev, clear } = useSearchHighlight(dismissed ? null : term, selector, ready);
  if (!term || dismissed) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs shadow-lg print:hidden" role="status">
      <Highlighter className="h-4 w-4 text-yellow-500" aria-hidden="true" />
      <span className="max-w-[40vw] truncate font-semibold text-foreground">“{term}”</span>
      <span className="text-muted-foreground">{count ? `${index + 1} of ${count}` : "no match in the text"}</span>
      <button type="button" onClick={prev} disabled={!count} aria-label="Previous match" className="rounded-full p-1 hover:bg-muted disabled:opacity-40"><ChevronUp className="h-4 w-4" /></button>
      <button type="button" onClick={next} disabled={!count} aria-label="Next match" className="rounded-full p-1 hover:bg-muted disabled:opacity-40"><ChevronDown className="h-4 w-4" /></button>
      <button type="button" onClick={() => { clear(); setDismissed(true); }} aria-label="Clear highlighting" className="rounded-full p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
    </div>
  );
}
