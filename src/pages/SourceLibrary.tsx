import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Clipboard, Download, FileQuestion, Loader2, Save, ScanText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Article } from "@/lib/store";

const scanUrls = (article: Article) => {
  const found = new Set<string>();
  for (const source of [article.original_notes || "", article.content || ""]) for (const match of source.replace(/\\\//g, "/").matchAll(/https?:\/\/[^\s)"'<>]+/gi)) {
    const value = match[0].replace(/[\],.;:!?]+$/, "");
    if (!/\.pdf(?:\?|$)/i.test(value) && /(?:\/uploads\/|\.(?:jpe?g|png|webp)(?:\?|$))/i.test(value)) found.add(value.replace(/^https:\/\/(?:www\.)?ompathstudy\.com\/uploads\//i, "https://cdn.ompathstudy.com/uploads/"));
  }
  return [...found];
};

const sourcePdfUrl = (article: Article) => {
  for (const source of [article.original_notes || "", article.content || ""]) for (const match of source.replace(/\\\//g, "/").matchAll(/https?:\/\/[^\s)"'<>]+/gi)) {
    const value = match[0].replace(/[\],.;:!?]+$/, "").replace(/^https:\/\/(?:www\.)?ompathstudy\.com\/uploads\//i, "https://cdn.ompathstudy.com/uploads/");
    if (/^https:\/\/cdn\.ompathstudy\.com\/uploads\/.+\.pdf(?:\?|$)/i.test(value)) return value;
  }
};

const classify = (article: Article) => {
  const text = `${article.title}\n${article.content || ""}`.toLowerCase();
  const exams = [/(?:end of year|eoy|cat\b|examination|past paper|question paper)/, /\b(?:section [a-d]|time allowed|total marks|answer all questions)\b/, /\b(?:select one|choose the correct|each question)\b/, /(?:^|\n)\s*(?:question\s*)?\d+[.)]/m, /(?:^|\n)\s*[a-e][.)]\s+/m].filter(rule => rule.test(text)).length;
  const notes = [/\b(?:chapter|lecture notes|learning objectives|summary|handbook|textbook)\b/, /\b(?:introduction|pathogenesis|clinical features|management)\b/].filter(rule => rule.test(text)).length;
  if (exams >= 2 && exams > notes) return "Past paper";
  if (/\b(?:isbn|edition|textbook|handbook)\b/.test(text)) return "Book / handbook";
  if (notes) return "Study notes";
  return "Unclassified scan";
};

const normalize = (value: string) => `${String(value || "").trim().replace(/^```(?:markdown|md)?\s*/i, "").replace(/\s*```$/i, "").replace(/\r\n?/g, "\n").replace(/^\s*([A-Ea-e])\s*[)]\s*/gm, (_, letter) => `${String(letter).toUpperCase()}. `).replace(/\n{3,}/g, "\n\n").trim()}\n`;
const claudePrompt = (article: Article, pages: number) => `Transcribe and clean this medical source document for OmpathStudy.\n\nTitle: ${article.title}\nPages: ${pages}\nOCR classification: ${classify(article)}\n\nReturn only clean GitHub-flavoured Markdown. Preserve every question in source order. Correct OCR errors without changing medical meaning. Every MCQ must contain all 4 or 5 visible options, followed by Answer and a concise Explanation. For SAQs and essays, provide a concise model answer. Do not invent unreadable text or missing questions.`;

export default function SourceLibrary() {
  const { slug } = useParams();
  const { toast } = useToast();
  const [items, setItems] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrStatus, setOcrStatus] = useState("");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  useEffect(() => { supabase.from("articles").select("*").eq("published", true).eq("is_raw", true).is("deleted_at", null).order("updated_at", { ascending: false }).then(({ data }) => { setItems((data || []) as Article[]); setLoading(false); }); }, []);
  const visible = useMemo(() => items.filter(item => scanUrls(item).length && (!search || `${item.title} ${classify(item)}`.toLowerCase().includes(search.toLowerCase()))), [items, search]);
  const selected = slug ? items.find(item => item.slug === slug || item.id === slug) : undefined;
  useEffect(() => { if (selected) setDraft(selected.content || ""); }, [selected?.id]);

  const save = async (markEdited: boolean) => {
    if (!selected) return;
    const content = normalize(draft);
    if (content.length < 80) return toast({ title: "Text is too short", description: "Paste the complete OCR or Claude response first.", variant: "destructive" });
    setBusy(true);
    const { error } = await supabase.from("articles").update({ content, is_raw: !markEdited, published: true, updated_at: new Date().toISOString() }).eq("id", selected.id);
    setBusy(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: markEdited ? "Saved as an edited study article" : "OCR draft saved" });
    setItems(current => markEdited ? current.filter(item => item.id !== selected.id) : current.map(item => item.id === selected.id ? { ...item, content } : item));
  };

  const runOcr = async (article: Article) => {
    if (ocrBusy) return;
    setOcrBusy(true);
    setOcrStatus("Starting OCR…");
    try {
      let from = 0;
      let startNumber = 1;
      const chunks: string[] = [];
      const totalPages = scanUrls(article).length;
      while (from < totalPages) {
        setOcrStatus(`OCR: pages ${from + 1}–${Math.min(from + 4, totalPages)} of ${totalPages}`);
        const { data, error } = await supabase.functions.invoke("paper-ocr", {
          body: { action: "ocr", article_id: article.id, from, count: 4, start_number: startNumber },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        if (typeof data?.text !== "string" || !data.text.trim()) {
          if (data?.done) break;
          throw new Error("OCR returned no text for this page batch.");
        }
        chunks.push(data.text.trim());
        const numbers = [...data.text.matchAll(/^(?:Question\\s*)?(\\d+)[.)]\\s+/gim)].map(m => Number(m[1]));
        if (numbers.length) startNumber = Math.max(startNumber, ...numbers) + 1;
        from = Number(data.next_from ?? from + 4);
        if (from <= 0) throw new Error("OCR returned an invalid page cursor.");
      }

      const content = normalize(chunks.join("\n\n"));
      if (content.length < 80) throw new Error("OCR produced too little text to save.");
      setOcrStatus("Saving OCR transcript…");
      const { data: saved, error: saveError } = await supabase.functions.invoke("paper-ocr", {
        body: { action: "commit", article_id: article.id, content, is_raw: true, published: true },
      });
      if (saveError) throw new Error(saveError.message);
      if (saved?.error) throw new Error(saved.error);
      setDraft(content);
      setItems(current => current.map(item => item.id === article.id ? { ...item, content } : item));
      toast({ title: "OCR completed", description: `${totalPages} scanned pages transcribed and saved.` });
      setOcrStatus("");
    } catch (error: any) {
      setOcrStatus("");
      toast({ title: "OCR failed", description: error?.message || String(error), variant: "destructive" });
    } finally {
      setOcrBusy(false);
    }
  };

  const copyPrompt = async (article: Article) => {
    await navigator.clipboard.writeText(claudePrompt(article, scanUrls(article).length));
    toast({ title: "Claude prompt copied" });
  };

  const downloadPdf = (article: Article) => {
    const readyPdf = sourcePdfUrl(article);
    if (readyPdf) {
      const link = document.createElement("a");
      link.href = readyPdf;
      link.download = `${article.slug || "source-paper"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }
    const form = document.createElement("form");
    form.method = "POST"; form.action = "/api/source-pdf"; form.style.display = "none";
    const title = document.createElement("input"); title.name = "title"; title.value = article.title;
    const urls = document.createElement("input"); urls.name = "urls"; urls.value = JSON.stringify(scanUrls(article));
    form.append(title, urls); document.body.appendChild(form); form.submit(); form.remove();
  };


  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (selected) {
    const urls = scanUrls(selected);
    return <main className="mx-auto max-w-7xl px-4 py-8"><Link to="/source-library" className="text-sm font-semibold text-primary">← Source library</Link><div className="my-5 flex flex-wrap items-end justify-between gap-4"><div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{classify(selected)} · OCR classified</span><h1 className="mt-3 font-serif text-3xl font-bold">{selected.title}</h1><p className="text-muted-foreground">{urls.length} scanned pages · existing OCR loaded in editor</p>{ocrStatus && <p className="mt-1 text-xs font-semibold text-primary">{ocrStatus}</p>}</div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void copyPrompt(selected)}><Clipboard className="mr-2 h-4 w-4" />Copy Claude prompt</Button><Button variant="outline" disabled={ocrBusy || busy} onClick={() => void runOcr(selected)}>{ocrBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanText className="mr-2 h-4 w-4" />}{ocrBusy ? "Running OCR…" : "Run OCR"}</Button><Button disabled={busy} onClick={() => void downloadPdf(selected)}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Download pages PDF</Button></div></div><div className="grid gap-6 lg:grid-cols-2"><section><h2 className="mb-3 font-bold">Original scanned pages</h2><div className="max-h-[75vh] space-y-4 overflow-y-auto rounded-xl border bg-muted/20 p-3">{urls.map((url, index) => <figure key={url} className="overflow-hidden rounded-lg border bg-white"><img src={url} alt={`Page ${index + 1}`} loading="lazy" className="w-full" /><figcaption className="px-3 py-2 text-xs font-semibold text-muted-foreground">Page {index + 1} of {urls.length}</figcaption></figure>)}</div></section><section><h2 className="mb-3 font-bold">OCR / Claude text editor</h2><Textarea value={draft} onChange={event => setDraft(event.target.value)} className="min-h-[68vh] font-mono text-sm leading-relaxed" placeholder="Existing OCR appears here. Replace it with Claude's corrected Markdown, then save." /><div className="mt-3 flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => void save(false)}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save OCR draft</Button><Button disabled={busy} onClick={() => void save(true)}><Check className="mr-2 h-4 w-4" />Save & mark edited</Button></div></section></div></main>;
  }
  return <main className="mx-auto max-w-6xl px-4 py-8"><div className="mb-6"><h1 className="font-serif text-3xl font-bold">Source Papers & Scans</h1><p className="mt-2 text-muted-foreground">Original uploaded documents, separated from edited study articles and classified using OCR text signals.</p></div><div className="relative mb-6"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search source papers and scans" /></div><div className="grid gap-4 md:grid-cols-2">{visible.map(item => <article key={item.id} className="rounded-xl border bg-card p-5"><div className="flex items-start gap-3"><FileQuestion className="mt-1 h-5 w-5 text-primary" /><div><span className="text-xs font-bold uppercase tracking-wide text-primary">{classify(item)} · OCR classified</span><h2 className="mt-1 font-semibold">{item.title}</h2><p className="mt-1 text-sm text-muted-foreground">{scanUrls(item).length} scanned pages</p><Button asChild size="sm" className="mt-3"><Link to={`/source-library/${item.slug || item.id}`}>Open scans & editor</Link></Button></div></div></article>)}</div></main>;
}
