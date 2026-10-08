import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, BookOpen, Brain, ExternalLink, History, Loader2, Square, Trash2, X } from "lucide-react";
import { siteSearch, type SiteHit } from "@/lib/siteSearch";
import { HitIcon } from "@/components/SearchPalette";
import DriveFileViewer, { type DriveFile, type DriveKind } from "@/components/DriveFileViewer";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/lib/supabase-config";

interface Turn { id: string; q: string; answer: string; hits: SiteHit[]; error?: string; at: number }
const HISTORY_KEY = "ompath_ai_history";
const readHistory = (): Turn[] => { try { const v = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
const saveHistory = (t: Turn[]) => { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(t.slice(-40))); } catch { /* full */ } };

const STARTERS = [
  "I need notes on psychiatry",
  "Paediatrics notes on dehydration",
  "Explain Light's criteria",
  "Year 1 upper limb past papers",
  "First-line drugs for hypertension",
  "Pneumothorax management",
];

// Turn "I need notes on X" into the words worth searching for.
const STOP = /\b(i|need|want|give|me|show|find|get|notes?|on|about|for|the|a|an|of|please|pls|some|explain|what|is|are|how|to|tell|in|and|with|do|does|can|you|my)\b/gi;
const searchTerms = (q: string) => q.replace(STOP, " ").replace(/[^\w\s'-]/g, " ").replace(/\s+/g, " ").trim() || q;

/** Minimal, safe markdown: headings, bullets, numbered lists, bold. */
function Answer({ text }: { text: string }) {
  const inline = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>);
  return (
    <div className="space-y-2 text-[15px] leading-7 text-foreground">
      {text.split("\n").map((raw, i) => {
        const l = raw.trimEnd();
        if (!l.trim()) return null;
        const h = l.match(/^#{1,4}\s+(.*)/);
        if (h) return <h3 key={i} className="pt-2 font-serif text-lg font-semibold">{inline(h[1])}</h3>;
        const b = l.match(/^\s*[-*•]\s+(.*)/);
        if (b) return <div key={i} className="flex gap-2 pl-1"><span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /><p>{inline(b[1])}</p></div>;
        const n = l.match(/^\s*(\d+)[.)]\s+(.*)/);
        if (n) return <div key={i} className="flex gap-2 pl-1"><span className="font-semibold text-primary">{n[1]}.</span><p>{inline(n[2])}</p></div>;
        return <p key={i}>{inline(l)}</p>;
      })}
    </div>
  );
}

export default function OmpathAI() {
  const [turns, setTurns] = useState<Turn[]>(readHistory);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [note, setNote] = useState<SiteHit | null>(null);
  const [files, setFiles] = useState<{ items: DriveFile[]; index: number | null }>({ items: [], index: null });
  const abort = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { document.title = "Ompath AI — ask your study notes | Ompath Study"; }, []);
  useEffect(() => { saveHistory(turns); }, [turns]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [turns.length]);
  // Back button closes an open note instead of leaving the page.
  useEffect(() => {
    if (!note) return;
    window.history.pushState({ ompathAiNote: true }, "");
    const onPop = () => setNote(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setNote(null); };
    window.addEventListener("popstate", onPop); window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("popstate", onPop); window.removeEventListener("keydown", onKey); if (window.history.state?.ompathAiNote) window.history.back(); };
  }, [note]);

  const update = (id: string, patch: Partial<Turn>) => setTurns((t) => t.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const ask = async (question: string) => {
    const text = question.trim();
    if (text.length < 2 || busy) return;
    setQ(""); setBusy(true);
    const id = `${Date.now()}`;
    const prior = turns.slice(-3).flatMap((t) => [{ role: "user", content: t.q }, { role: "assistant", content: t.answer }]);
    setTurns((t) => [...t, { id, q: text, answer: "", hits: [], at: Date.now() }]);
    try {
      const terms = searchTerms(text);
      const [a, b] = await Promise.all([siteSearch(terms, { deep: true }), terms !== text ? siteSearch(text) : Promise.resolve({ hits: [] as SiteHit[], related: [] })]);
      const seen = new Set<string>();
      const hits = [...a.hits, ...b.hits].filter((h) => (seen.has(h.key) ? false : (seen.add(h.key), true))).sort((x, y) => y.score - x.score).slice(0, 18);
      update(id, { hits });

      abort.current = new AbortController();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ompath-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          question: text, history: prior,
          sources: hits.slice(0, 8).map((h) => ({ id: h.key.replace(/^article-/, ""), kind: h.kind, title: h.title, subtitle: h.subtitle, snippet: h.snippet })),
        }),
        signal: abort.current.signal,
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        update(id, { error: err?.error || "Ompath AI could not answer right now. The matching notes are below." });
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "", answer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          const d = line.trim();
          if (!d.startsWith("data:")) continue;
          const payload = d.slice(5).trim();
          if (payload === "[DONE]") continue;
          try { const piece = JSON.parse(payload)?.choices?.[0]?.delta?.content; if (piece) { answer += piece; update(id, { answer }); } } catch { /* partial */ }
        }
      }
      if (!answer) update(id, { error: "Ompath AI gave no answer. The matching notes are below." });
    } catch (e) {
      if ((e as Error).name !== "AbortError") update(id, { error: "Connection problem. The matching notes are below." });
    } finally { setBusy(false); abort.current = null; }
  };

  const openHit = (hit: SiteHit, all: SiteHit[]) => {
    if (hit.group === "Library files") {
      const list = all.filter((h) => h.group === "Library files").map((h) => [h.key.replace(/^file-/, ""), h.title, (h.kind as DriveKind) || "file"] as DriveFile);
      setFiles({ items: list, index: list.findIndex((f) => f[0] === hit.key.replace(/^file-/, "")) });
    } else setNote(hit);
  };

  const notesOf = (hits: SiteHit[]) => hits.filter((h) => h.group === "Notes");
  const filesOf = (hits: SiteHit[]) => hits.filter((h) => h.group === "Library files");
  const restOf = (hits: SiteHit[]) => hits.filter((h) => h.group !== "Notes" && h.group !== "Library files").slice(0, 6);

  const Row = ({ h, all }: { h: SiteHit; all: SiteHit[] }) => (
    <button type="button" onClick={() => openHit(h, all)} className="flex w-full items-start gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <HitIcon hit={h} className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{h.title}</span>
        <span className="block truncate text-xs text-muted-foreground">{h.subtitle}</span>
        {h.snippet && <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">{h.snippet}</span>}
      </span>
    </button>
  );

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-3xl flex-col px-4 pb-40 pt-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Brain className="h-5 w-5" /></span>
          <div><h1 className="font-serif text-2xl font-bold">Ompath AI</h1><p className="text-sm text-muted-foreground">Ask anything — answers from your study notes and library.</p></div>
        </div>
        <button type="button" onClick={() => setShowHistory((s) => !s)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"><History className="h-4 w-4" /> History</button>
      </header>

      {showHistory && (
        <section className="mb-6 rounded-xl border border-border bg-card p-3">
          <div className="mb-2 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Recent questions</p>
            {turns.length > 0 && <button type="button" onClick={() => setTurns([])} className="inline-flex items-center gap-1 text-xs text-destructive"><Trash2 className="h-3.5 w-3.5" /> Clear</button>}</div>
          {turns.length === 0 ? <p className="text-sm text-muted-foreground">No questions yet.</p> : (
            <ul className="max-h-60 space-y-1 overflow-y-auto">{[...turns].reverse().map((t) => (
              <li key={t.id}><button type="button" onClick={() => { setShowHistory(false); document.getElementById(`turn-${t.id}`)?.scrollIntoView({ behavior: "smooth" }); }} className="w-full truncate rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted">{t.q}</button></li>
            ))}</ul>
          )}
        </section>
      )}

      {turns.length === 0 && (
        <section className="rounded-xl border border-border bg-card p-5">
          <p className="mb-3 text-sm text-muted-foreground">Try asking:</p>
          <div className="flex flex-wrap gap-2">{STARTERS.map((s) => <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border border-border px-3 py-1.5 text-sm hover:border-primary hover:text-primary">{s}</button>)}</div>
        </section>
      )}

      <div className="space-y-8">
        {turns.map((t) => (
          <article key={t.id} id={`turn-${t.id}`} className="scroll-mt-24 space-y-4">
            <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">{t.q}</div>
            <div>
              {t.answer ? <Answer text={t.answer} /> : t.error ? <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">{t.error}</p>
                : <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Searching your notes…</p>}
            </div>
            {t.hits.length > 0 && (
              <div className="space-y-4">
                {notesOf(t.hits).length > 0 && <div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Notes on Ompath ({notesOf(t.hits).length})</p><div className="grid gap-2 sm:grid-cols-2">{notesOf(t.hits).slice(0, 8).map((h) => <Row key={h.key} h={h} all={t.hits} />)}</div></div>}
                {filesOf(t.hits).length > 0 && <div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Library files ({filesOf(t.hits).length})</p><div className="grid gap-2 sm:grid-cols-2">{filesOf(t.hits).slice(0, 8).map((h) => <Row key={h.key} h={h} all={t.hits} />)}</div></div>}
                {restOf(t.hits).length > 0 && <div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Also on the site</p><div className="flex flex-wrap gap-2">{restOf(t.hits).map((h) => <Link key={h.key} to={h.href} className="rounded-full border border-border px-3 py-1 text-xs hover:border-primary hover:text-primary">{h.title}</Link>)}</div></div>}
                <Link to={`/search?q=${encodeURIComponent(searchTerms(t.q))}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"><BookOpen className="h-4 w-4" /> See every result</Link>
              </div>
            )}
          </article>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); void ask(q); }} className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-border bg-card p-2 focus-within:ring-2 focus-within:ring-ring">
          <textarea value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void ask(q); } }} rows={1} placeholder="e.g. I need notes on psychiatry" aria-label="Ask Ompath AI" className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-base outline-none placeholder:text-muted-foreground" />
          {busy ? <button type="button" onClick={() => abort.current?.abort()} aria-label="Stop" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted"><Square className="h-4 w-4" /></button>
            : <button type="submit" disabled={q.trim().length < 2} aria-label="Ask" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"><ArrowUp className="h-5 w-5" /></button>}
        </div>
      </form>

      {note && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background" role="dialog" aria-modal="true" aria-label={note.title}>
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <button type="button" onClick={() => setNote(null)} aria-label="Close and go back" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-muted"><X className="h-5 w-5" /></button>
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">{note.title}</p>
            <Link to={note.href} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-primary hover:bg-muted"><ExternalLink className="h-4 w-4" /> Full page</Link>
          </div>
          <iframe title={note.title} src={note.href} className="min-h-0 w-full flex-1 border-0" />
        </div>
      )}
      <DriveFileViewer items={files.items} index={files.index} onIndexChange={(i) => setFiles((f) => ({ ...f, index: i }))} onDownload={() => {}} where="Ompath AI" />
    </div>
  );
}
