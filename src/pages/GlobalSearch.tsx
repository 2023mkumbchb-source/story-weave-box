import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { BookOpen, Loader2, Search } from "lucide-react";
import { globalSearch, groupHits, logSearch, SEARCH_GROUPS, type SearchHit } from "@/lib/search";

export default function GlobalSearch() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [related, setRelated] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const run = async (e?: FormEvent) => {
    e?.preventDefault(); const value = q.trim(); if (!value) return;
    setLoading(true); setParams({ q: value });
    const result = await globalSearch(value);
    setHits(result.hits); setRelated(result.related); setSearched(true); setLoading(false);
  };
  const grouped = groupHits(hits);
  return <main className="mx-auto max-w-5xl px-5 py-8 sm:py-12">
    <Helmet><title>Search Medical Study Resources | OmpathStudy</title><meta name="robots" content="noindex,follow" /></Helmet>
    <h1 className="font-serif text-3xl font-bold">Search the study library</h1>
    <p className="mt-2 text-sm text-muted-foreground">Search notes, units, course codes, CATs, past papers, MCQs and flashcards.</p>
    <form onSubmit={run} className="mt-6 flex overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <Search className="ml-4 mt-3.5 h-5 w-5 text-muted-foreground" /><input value={q} onChange={e => setQ(e.target.value)} className="min-w-0 flex-1 bg-transparent px-3 py-3 outline-none" placeholder="Try TB, AGN, virology or MBMM3333" /><button className="bg-primary px-5 font-bold text-primary-foreground">Search</button>
    </form>
    {related.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{related.map(x => <button key={x} onClick={() => setQ(x)} className="rounded-full bg-muted px-3 py-1 text-xs">Related: {x}</button>)}</div>}
    {loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" /></div> : searched && hits.length === 0 ? <p className="mt-10 rounded-xl border border-dashed p-8 text-center text-muted-foreground">No results yet. Try a broader medical term or course code.</p> : <div className="mt-8 space-y-8">{SEARCH_GROUPS.map(group => { const rows = grouped[group] || []; return rows.length ? <section key={group}><h2 className="mb-3 font-serif text-xl font-bold">{group}</h2><div className="grid gap-2 sm:grid-cols-2">{rows.map(h => <Link key={`${h.kind}-${h.id}`} to={h.href} onClick={() => void logSearch(q, hits.length, { type: h.kind, id: h.id })} className="rounded-xl border border-border bg-card p-4 hover:border-primary/40"><div className="flex gap-3"><BookOpen className="mt-0.5 h-4 w-4 text-primary" /><span><strong className="line-clamp-2 text-sm">{h.title}</strong><span className="mt-1 block text-xs text-muted-foreground">{h.category || h.kind} · {h.reason}</span></span></div></Link>)}</div></section> : null; })}</div>}
  </main>;
}
