import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Download, FileQuestion, Loader2, Search } from "lucide-react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Article } from "@/lib/store";

const scanUrls = (article: Article) => {
  const found = new Set<string>();
  for (const source of [article.original_notes || "", article.content || ""]) {
    for (const match of source.replace(/\\\//g, "/").matchAll(/https?:\/\/[^\s)"'<>]+/gi)) {
      const value = match[0].replace(/[\],.;:!?]+$/, "");
      if (/(?:\/uploads\/|\.(?:jpe?g|png|webp)(?:\?|$))/i.test(value)) found.add(value.replace(/^https:\/\/(?:www\.)?ompathstudy\.com\/uploads\//i, "https://cdn.ompathstudy.com/uploads/"));
    }
  }
  return [...found];
};

const classify = (article: Article) => {
  const text = `${article.title}\n${article.content || ""}`.toLowerCase();
  const examSignals = [/(?:end of year|eoy|cat\b|examination|past paper|question paper)/, /\b(?:section [a-d]|time allowed|total marks|answer all questions)\b/, /\b(?:select one|choose the correct|each question)\b/, /(?:^|\n)\s*(?:question\s*)?\d+[.)]/m, /(?:^|\n)\s*[a-e][.)]\s+/m];
  const noteSignals = [/\b(?:chapter|lecture notes|learning objectives|summary|handbook|textbook)\b/, /\b(?:introduction|pathogenesis|clinical features|management)\b/];
  const examScore = examSignals.filter(rule => rule.test(text)).length;
  const noteScore = noteSignals.filter(rule => rule.test(text)).length;
  if (examScore >= 2 && examScore > noteScore) return "Past paper";
  if (/\b(?:isbn|edition|textbook|handbook)\b/.test(text)) return "Book / handbook";
  if (noteScore >= 1) return "Study notes";
  return "Unclassified scan";
};

const safeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "source";

export default function SourceLibrary() {
  const { slug } = useParams();
  const [items, setItems] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  useEffect(() => { supabase.from("articles").select("*").eq("published", true).eq("is_raw", true).is("deleted_at", null).order("updated_at", { ascending: false }).then(({ data }) => { setItems((data || []) as Article[]); setLoading(false); }); }, []);
  const visible = useMemo(() => items.filter(item => scanUrls(item).length && (!search || `${item.title} ${classify(item)}`.toLowerCase().includes(search.toLowerCase()))), [items, search]);
  const selected = slug ? items.find(item => item.slug === slug || item.id === slug) : undefined;

  const downloadPdf = async (article: Article) => {
    setBusy(true);
    try {
      let pdf: jsPDF | null = null;
      for (const [index, url] of scanUrls(article).entries()) {
        const response = await fetch(`/api/image-proxy?url=${encodeURIComponent(url)}`); if (!response.ok) throw new Error(`Page ${index + 1} failed`);
        const bitmap = await createImageBitmap(await response.blob());
        const canvas = document.createElement("canvas"); const scale = Math.min(1, 1800 / bitmap.width);
        canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale); canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const orientation = canvas.width > canvas.height ? "landscape" : "portrait";
        if (!pdf) pdf = new jsPDF({ orientation, unit: "pt", format: "a4", compress: true }); else pdf.addPage("a4", orientation);
        const w = pdf.internal.pageSize.getWidth(), h = pdf.internal.pageSize.getHeight(), ratio = Math.min(w / canvas.width, h / canvas.height), iw = canvas.width * ratio, ih = canvas.height * ratio;
        pdf.addImage(canvas.toDataURL("image/jpeg", .88), "JPEG", (w - iw) / 2, (h - ih) / 2, iw, ih, undefined, "FAST"); bitmap.close();
      }
      pdf?.save(`${safeName(article.title)}.pdf`);
    } finally { setBusy(false); }
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (selected) {
    const urls = scanUrls(selected);
    return <main className="mx-auto max-w-5xl px-4 py-8"><Link to="/source-library" className="text-sm font-semibold text-primary">← Source library</Link><div className="my-5 flex flex-wrap items-center justify-between gap-3"><div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{classify(selected)} · OCR classified</span><h1 className="mt-3 font-serif text-3xl font-bold">{selected.title}</h1><p className="text-muted-foreground">{urls.length} scanned pages</p></div><Button disabled={busy} onClick={() => void downloadPdf(selected)}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Download pages PDF</Button></div><div className="space-y-4">{urls.map((url, index) => <img key={url} src={url} alt={`Page ${index + 1}`} loading="lazy" className="mx-auto w-full rounded-xl border bg-white" />)}</div></main>;
  }
  return <main className="mx-auto max-w-6xl px-4 py-8"><div className="mb-6"><h1 className="font-serif text-3xl font-bold">Source Papers & Scans</h1><p className="mt-2 text-muted-foreground">Original uploaded documents, kept separate from edited study-note articles and classified using OCR text signals.</p></div><div className="relative mb-6"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search source papers and scans" /></div><div className="grid gap-4 md:grid-cols-2">{visible.map(item => <article key={item.id} className="rounded-xl border bg-card p-5"><div className="flex items-start gap-3"><FileQuestion className="mt-1 h-5 w-5 text-primary" /><div><span className="text-xs font-bold uppercase tracking-wide text-primary">{classify(item)} · OCR classified</span><h2 className="mt-1 font-semibold">{item.title}</h2><p className="mt-1 text-sm text-muted-foreground">{scanUrls(item).length} scanned pages</p><Button asChild size="sm" className="mt-3"><Link to={`/source-library/${item.slug || item.id}`}>View scans</Link></Button></div></div></article>)}</div></main>;
}
