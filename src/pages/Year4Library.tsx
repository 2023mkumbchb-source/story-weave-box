import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronRight, Download, File, FileText, Film, FolderOpen, Image as ImageIcon, Loader2, Presentation, Search, Archive } from "lucide-react";
import { updateMetaTags, SITE_URL } from "@/lib/seo";
import { toast } from "@/hooks/use-toast";

type Kind = "pdf" | "ppt" | "doc" | "video" | "img" | "zip" | "file";
type DriveFile = [id: string, name: string, kind: Kind];
interface DriveFolder { n: string; d?: DriveFolder[]; f?: DriveFile[] }
interface Library { updated: string; d: DriveFolder[] }

const KIND_LABEL: Record<Kind, string> = { pdf: "PDF", ppt: "Slides", doc: "Document", video: "Video", img: "Image", zip: "Archive", file: "File" };
const KIND_ICON: Record<Kind, typeof File> = { pdf: FileText, ppt: Presentation, doc: FileText, video: Film, img: ImageIcon, zip: Archive, file: File };

// drive.usercontent.google.com serves the file itself; confirm=t skips the
// "can't scan for viruses" interstitial that large files (videos) otherwise hit.
const downloadUrl = (id: string) => `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`;

// Start the download without leaving the site: the file is served as an attachment, so
// loading it in a hidden frame makes the browser save it and the page never navigates.
function startDownload(id: string, name: string) {
  const frame = document.createElement("iframe");
  frame.style.display = "none";
  frame.setAttribute("aria-hidden", "true");
  frame.src = downloadUrl(id);
  document.body.appendChild(frame);
  window.setTimeout(() => frame.remove(), 5 * 60 * 1000);
  toast({ title: "Download started", description: cleanName(name) });
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const countFiles = (f: DriveFolder): number => (f.f?.length ?? 0) + (f.d ?? []).reduce((s, c) => s + countFiles(c), 0);
const cleanName = (name: string) => name.replace(/\.(pdf|pptx?|docx?|mp4|zip|rar|jpe?g|png)$/i, "");

const parsePath = (raw: string | null): string[] => (raw ? raw.split("/").map((p) => { try { return decodeURIComponent(p); } catch { return p; } }) : []);
const buildPath = (parts: string[]) => parts.map(encodeURIComponent).join("/");

function resolve(root: DriveFolder[], parts: string[]): { folders: DriveFolder[]; node: DriveFolder | null; valid: string[] } {
  let level = root;
  let node: DriveFolder | null = null;
  const valid: string[] = [];
  for (const part of parts) {
    const next = level.find((x) => x.n === part);
    if (!next) break;
    node = next;
    valid.push(part);
    level = next.d ?? [];
  }
  return { folders: node ? node.d ?? [] : root, node, valid };
}

function searchAll(root: DriveFolder[], q: string): { file: DriveFile; where: string[] }[] {
  const out: { file: DriveFile; where: string[] }[] = [];
  const needle = q.toLowerCase();
  const walk = (folders: DriveFolder[], trail: string[]) => {
    for (const f of folders) {
      const here = [...trail, f.n];
      for (const file of f.f ?? []) if (file[1].toLowerCase().includes(needle)) out.push({ file, where: here });
      if (f.d) walk(f.d, here);
    }
  };
  walk(root, []);
  return out;
}

export default function Year4Library() {
  const [params, setParams] = useSearchParams();
  const [lib, setLib] = useState<Library | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    updateMetaTags({
      title: "Year 4 Library – Books, Notes & Slides to Download | Ompath Study",
      description: "Year 4 MBChB books, notes, slides and videos by department: IMED, Paediatrics, Obstetrics, Pharmacology, Psychiatry, Radiology and Surgery.",
      image: `${SITE_URL}/og-default.png`,
      url: `${SITE_URL}/year-4-library`,
      type: "website",
    });
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/year4-library.json`)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((data: Library) => { if (!cancelled) setLib(data); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  const requested = parsePath(params.get("p"));
  const view = useMemo(() => (lib ? resolve(lib.d, requested) : null), [lib, params]);
  const trail = view?.valid ?? [];
  const files = useMemo(() => [...(view?.node?.f ?? [])].sort((a, b) => collator.compare(a[1], b[1])), [view]);
  const folders = useMemo(() => [...(view?.folders ?? [])].sort((a, b) => collator.compare(a.n, b.n)), [view]);
  const results = useMemo(() => (lib && query.trim().length >= 2 ? searchAll(lib.d, query.trim()).slice(0, 200) : null), [lib, query]);

  const go = (parts: string[]) => {
    setQuery("");
    setParams(parts.length ? { p: buildPath(parts) } : {}, { replace: false });
    window.scrollTo({ top: 0 });
  };

  const total = lib ? lib.d.reduce((s, f) => s + countFiles(f), 0) : 0;

  return (
    <div className="min-h-dvh bg-muted/20">
      <section className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Year 4</p>
          <h1 className="mt-2 font-serif text-3xl font-bold text-foreground sm:text-4xl">Year 4 Library</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Books, notes, slides and videos by department. Open a department, then tap a file to download it.
            {total > 0 && <> <span className="font-semibold text-foreground">{total.toLocaleString()}</span> files.</>}
          </p>
          <div className="relative mt-6 max-w-xl">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search every file by name…"
              aria-label="Search the Year 4 library"
              className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm text-foreground outline-none ring-primary/30 placeholder:text-muted-foreground focus:ring-2"
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 py-8">
        {error && (
          <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            The library could not be loaded. Check your connection and refresh the page.
          </p>
        )}
        {!lib && !error && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading library…</p>
        )}

        {lib && results && (
          <section aria-live="polite">
            <p className="mb-3 text-sm text-muted-foreground">
              {results.length === 0 ? "No files match" : `${results.length}${results.length === 200 ? "+" : ""} file${results.length === 1 ? "" : "s"} for`} “{query.trim()}”
            </p>
            <FileList rows={results.map((r) => ({ file: r.file, where: r.where.join(" › ") }))} />
          </section>
        )}

        {lib && !results && (
          <>
            <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1 text-sm">
              <button onClick={() => go([])} className={`font-semibold ${trail.length ? "text-primary hover:underline" : "text-foreground"}`}>All departments</button>
              {trail.map((part, i) => (
                <span key={`${part}-${i}`} className="flex items-center gap-1">
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  {i === trail.length - 1
                    ? <span className="font-semibold text-foreground">{part}</span>
                    : <button onClick={() => go(trail.slice(0, i + 1))} className="font-semibold text-primary hover:underline">{part}</button>}
                </span>
              ))}
            </nav>

            {folders.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {folders.map((f) => (
                  <button
                    key={f.n}
                    onClick={() => go([...trail, f.n])}
                    className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[var(--shadow-elevated)]"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FolderOpen className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-foreground">{f.n}</span>
                      <span className="block text-xs text-muted-foreground">{countFiles(f)} file{countFiles(f) === 1 ? "" : "s"}{f.d?.length ? ` · ${f.d.length} folder${f.d.length === 1 ? "" : "s"}` : ""}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            )}

            {files.length > 0 && (
              <section className={folders.length ? "mt-8" : ""}>
                {folders.length > 0 && <h2 className="mb-3 font-serif text-lg font-bold text-foreground">Files in this folder</h2>}
                <FileList rows={files.map((file) => ({ file }))} />
              </section>
            )}

            {folders.length === 0 && files.length === 0 && (
              <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
                Nothing here yet. <Link to="/year-4-library" className="font-semibold text-primary hover:underline">Back to all departments</Link>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FileList({ rows }: { rows: { file: DriveFile; where?: string }[] }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {rows.map(({ file: [id, name, kind], where }) => {
        const Icon = KIND_ICON[kind];
        return (
          <li key={id}>
            <a
              href={downloadUrl(id)}
              download={name}
              onClick={(e) => { e.preventDefault(); startDownload(id, name); }}
              className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"><Icon className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-semibold text-foreground">{cleanName(name)}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{KIND_LABEL[kind]}{where ? ` · ${where}` : ""}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 px-3 py-1 text-xs font-bold text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                <Download className="h-3.5 w-3.5" /> Download
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
