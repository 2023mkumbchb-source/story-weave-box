import { useEffect, useRef, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  /** Absolute URL to share. */
  url: string;
  title: string;
  /** Message shown above the link in WhatsApp / Telegram. */
  text: string;
  className?: string;
  label?: string;
}

const enc = encodeURIComponent;

/** One-tap share: the phone's share sheet where available, otherwise WhatsApp / Telegram / Facebook / X / copy link. */
export default function ShareButton({ url, title, text, className = "", label = "Share" }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: "Link copied", description: "Paste it into WhatsApp, Telegram or anywhere else." });
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({ title: "Could not copy", description: url, variant: "destructive" });
    }
  };

  const onClick = async () => {
    const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }) : undefined;
    const touch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
    if (nav?.share && touch) {
      try { await nav.share({ title, text, url }); } catch { /* cancelled */ }
      return;
    }
    setOpen((o) => !o);
  };

  const full = `${text}\n${url}`;
  const items = [
    { name: "WhatsApp", href: `https://wa.me/?text=${enc(full)}` },
    { name: "Telegram", href: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}` },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { name: "X (Twitter)", href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}` },
  ];

  return (
    <div ref={box} className="relative inline-block">
      <button
        type="button"
        onClick={onClick}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 ${className}`}
      >
        <Share2 className="h-4 w-4" /> {label}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-elevated)]">
          {items.map((i) => (
            <a key={i.name} role="menuitem" href={i.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-primary/10">
              Share on {i.name}
            </a>
          ))}
          <button role="menuitem" type="button" onClick={copy} className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-left text-sm font-semibold text-foreground hover:bg-primary/10">
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  );
}
