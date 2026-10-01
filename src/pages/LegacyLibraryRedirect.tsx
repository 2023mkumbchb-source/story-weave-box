import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import registry from "@/data/libraries.json";
import { libraryPath } from "@/lib/libraryMeta";
import { loadLibrary } from "@/lib/libraryData";

// Old shared links looked like /year-4-library?p=IMED/BOOK. Send them to the new folder address.
const OLD_ROOT_NAMES: Record<string, string> = {
  IMED: "Internal Medicine",
  OBSTERTICS: "Obstetrics & Gynaecology",
  PAEDS: "Paediatrics & Child Health",
  PHARMACOLOGY: "Clinical Pharmacology",
  PSYCHIATRY: "Psychiatry",
  SURGERY: "Surgery",
  "RADIOLOGY DOWNLOADS": "Radiology",
};
interface Node { n: string; s: string; d?: Node[] }

export default function LegacyLibraryRedirect({ slug }: { slug: string }) {
  const def = registry.libraries.find((l) => l.slug === slug);
  const [params] = useSearchParams();
  const [to, setTo] = useState<string | null>(null);

  useEffect(() => {
    if (!def) return;
    const q = params.get("q");
    const tail = q ? `?q=${encodeURIComponent(q)}` : "";
    const names = (params.get("p") ?? "").split("/").filter(Boolean).map((p) => { try { return decodeURIComponent(p); } catch { return p; } });
    if (!names.length) { setTo(libraryPath(def) + tail); return; }
    loadLibrary(def.dataFile)
      .then((lib) => {
        let level = lib.d as Node[];
        const slugs: string[] = [];
        names.forEach((raw, i) => {
          const wanted = (i === 0 ? OLD_ROOT_NAMES[raw] ?? raw : raw).toLowerCase();
          const hit = level.find((x) => x.n.toLowerCase() === wanted);
          if (!hit || slugs.length !== i) return;
          slugs.push(hit.s);
          level = hit.d ?? [];
        });
        setTo(libraryPath(def, slugs) + tail);
      })
      .catch(() => setTo(libraryPath(def) + tail));
  }, [def, params]);

  if (!def) return <Navigate to="/" replace />;
  return to ? <Navigate to={to} replace /> : <p className="p-8 text-sm text-muted-foreground">Opening the library…</p>;
}
