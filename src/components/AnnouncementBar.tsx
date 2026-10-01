import { useState } from "react";
import { Link } from "react-router-dom";
import { Megaphone, X } from "lucide-react";
import { useSiteConfig } from "@/lib/siteConfig";

const TONE = { info: "bg-primary text-primary-foreground", success: "bg-emerald-600 text-white", warning: "bg-amber-500 text-black" } as const;
const seenKey = (text: string) => `ompath_announce_${text.length}_${text.slice(0, 24)}`;

/** Site-wide notice the admin writes in Admin → Site manager. Learners can dismiss it. */
export default function AnnouncementBar() {
  const { announcement: a } = useSiteConfig();
  const [, force] = useState(0);
  if (!a.enabled || !a.text.trim()) return null;
  let dismissed = false;
  try { dismissed = localStorage.getItem(seenKey(a.text)) === "1"; } catch { /* storage blocked */ }
  if (dismissed) return null;
  const external = /^https?:/i.test(a.link);
  const body = <span className="font-semibold">{a.text}{a.link && <span className="ml-1.5 underline underline-offset-2">Open →</span>}</span>;
  return (
    <div className={`${TONE[a.tone] ?? TONE.info} relative z-40`} role="status">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 text-xs sm:text-sm">
        <Megaphone className="h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">{a.link ? (external ? <a href={a.link} target="_blank" rel="noopener noreferrer">{body}</a> : <Link to={a.link}>{body}</Link>) : body}</div>
        <button type="button" aria-label="Dismiss announcement" onClick={() => { try { localStorage.setItem(seenKey(a.text), "1"); } catch { /* storage blocked */ } force((n) => n + 1); }} className="shrink-0 rounded p-1 hover:bg-black/10"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
