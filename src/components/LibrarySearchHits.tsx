import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FolderOpen } from "lucide-react";
import registry from "@/data/libraries.json";
import { loadLibrary, type LibraryNode } from "@/lib/libraryData";
import { loadSiteConfig } from "@/lib/siteConfig";
import { libraryPath, prettyTitle } from "@/lib/libraryMeta";
import FileThumb, { KIND_LABEL } from "@/components/FileThumb";
import type { DriveFile } from "@/components/DriveFileViewer";

type Hit = { file: DriveFile; where: string; href: string; yearLabel: string };
const LIMIT = 8;

function collect(nodes: LibraryNode[], needles: string[], trail: string[], out: Hit[], href: string, yearLabel: string, slugs: string[] = [], hidden: Set<string> = new Set()) {
  for (const n of nodes) {
    const here = [...trail, n.n];
    const hereSlugs = [...slugs, n.s];
    for (const file of n.f ?? []) {
      if (out.length >= LIMIT) return;
      if (hidden.has(file[0])) continue;
      if (needles.every((w) => file[1].toLowerCase().includes(w))) out.push({ file, where: here.join(" › "), href: `${href}/${hereSlugs.join("/")}`, yearLabel });
    }
    if (n.d) collect(n.d, needles, here, out, href, yearLabel, hereSlugs, hidden);
    if (out.length >= LIMIT) return;
  }
}

/** Matches from the Drive course-work library, shown above the article results when searching the notes. */
export default function LibrarySearchHits({ query, year }: { query: string; year?: number | null }) {
  const [hits, setHits] = useState<Hit[]>([]);
  const q = query.trim();

  useEffect(() => {
    const needles = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (q.length < 3) { setHits([]); return; }
    let on = true;
    const timer = setTimeout(async () => {
      const defs = registry.libraries.filter((l) => !year || l.year === year);
      const out: Hit[] = [];
      const hidden = new Set((await loadSiteConfig()).hiddenFiles);
      for (const def of defs) {
        try {
          const lib = await loadLibrary(def.dataFile);
          collect(lib.d, needles, [], out, libraryPath(def), def.label, [], hidden);
        } catch { /* a library that fails to load is just skipped */ }
        if (out.length >= LIMIT) break;
      }
      if (on) setHits(out);
    }, 250);
    return () => { on = false; clearTimeout(timer); };
  }, [q, year]);

  if (!hits.length) return null;
  const first = registry.libraries.find((l) => !year || l.year === year);
  return (
    <section className="mb-6 rounded-2xl border border-primary/25 bg-primary/5 p-4" aria-label="Matching files from the library">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground"><FolderOpen className="h-4 w-4 text-primary" /> Files from the course-work library</h2>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {hits.map((h) => (
          <li key={h.file[0]}>
            <Link to={h.href} className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-2 transition-colors hover:border-primary/50">
              <FileThumb id={h.file[0]} kind={h.file[2]} />
              <span className="min-w-0"><span className="block truncate text-sm font-semibold text-foreground">{prettyTitle(h.file[1])}</span><span className="block truncate text-[11px] text-muted-foreground">{KIND_LABEL[h.file[2]]} · {h.yearLabel} › {h.where}</span></span>
            </Link>
          </li>
        ))}
      </ul>
      {first && <Link to={`${libraryPath(first)}?q=${encodeURIComponent(q)}`} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">See every match <ArrowRight className="h-3 w-3" /></Link>}
    </section>
  );
}
