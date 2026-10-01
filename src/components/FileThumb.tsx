import { useState } from "react";
import { Archive, File, FileText, Film, Image as ImageIcon, Play, Presentation } from "lucide-react";
import { thumbUrl, type DriveKind } from "@/components/DriveFileViewer";

export const KIND_LABEL: Record<DriveKind, string> = { pdf: "PDF", ppt: "Slides", doc: "Document", video: "Video", img: "Image", zip: "Archive", file: "File" };
export const KIND_ICON: Record<DriveKind, typeof File> = { pdf: FileText, ppt: Presentation, doc: FileText, video: Film, img: ImageIcon, zip: Archive, file: File };

const TINT: Record<DriveKind, string> = {
  pdf: "bg-rose-500/10 text-rose-600", ppt: "bg-orange-500/10 text-orange-600", doc: "bg-blue-500/10 text-blue-600",
  video: "bg-violet-500/10 text-violet-600", img: "bg-emerald-500/10 text-emerald-600", zip: "bg-amber-500/10 text-amber-700", file: "bg-muted text-muted-foreground",
};

/**
 * Small preview of a Drive file: the first page of a PDF or slide deck, a frame of a video, the picture itself.
 * Archives, and anything Drive cannot render, fall back to a coloured type icon.
 */
export default function FileThumb({ id, kind, className = "h-12 w-10" }: { id: string; kind: DriveKind; className?: string }) {
  const [bad, setBad] = useState(false);
  const Icon = KIND_ICON[kind];
  if (kind === "zip" || kind === "file" || bad) {
    return <span className={`flex shrink-0 items-center justify-center rounded-md ${TINT[kind]} ${className}`}><Icon className="h-4 w-4" /></span>;
  }
  return (
    <span className={`relative block shrink-0 overflow-hidden rounded-md border border-border bg-muted ${className}`}>
      <img
        src={thumbUrl(id, 160)}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setBad(true)}
        className="h-full w-full object-cover object-top"
      />
      {kind === "video" && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/25"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-black"><Play className="h-3 w-3 fill-current" /></span></span>
      )}
    </span>
  );
}
