import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Slugify a term for use as a hash anchor. */
export function slugify(text: string): string {
  return String(text || "")
    .toLowerCase()
    .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

/** Find a target element by id, or fall back to first heading whose text contains the slug words. */
function resolveTarget(slug: string): HTMLElement | null {
  if (!slug) return null;
  const direct = document.getElementById(slug);
  if (direct) return direct;
  const decoded = decodeURIComponent(slug).toLowerCase();
  const headings = Array.from(
    document.querySelectorAll<HTMLElement>("h1, h2, h3, h4, strong, dt")
  );
  for (const h of headings) {
    const txt = (h.textContent || "").toLowerCase();
    if (txt && (slugify(txt) === decoded || txt.includes(decoded.replace(/-/g, " ")))) {
      return h;
    }
  }
  return null;
}

/** Scroll + flash a target. */
export function flashAnchor(slug: string) {
  if (!slug) return;
  const tryOnce = () => {
    const el = resolveTarget(slug);
    if (!el) return false;
    const y = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: y, behavior: "smooth" });
    el.classList.remove("deep-flash");
    // Force reflow to restart animation
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    void el.offsetWidth;
    el.classList.add("deep-flash");
    window.setTimeout(() => el.classList.remove("deep-flash"), 2200);
    return true;
  };
  if (tryOnce()) return;
  // Retry while content is still mounting
  let attempts = 0;
  const iv = window.setInterval(() => {
    attempts++;
    if (tryOnce() || attempts > 20) window.clearInterval(iv);
  }, 150);
}

/** React hook: flashes the hash target whenever the route or hash changes. */
export function useHashFlash() {
  const { hash, key } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const slug = hash.replace(/^#/, "");
    // Defer so content has a chance to render
    const t = window.setTimeout(() => flashAnchor(slug), 200);
    return () => window.clearTimeout(t);
  }, [hash, key]);
}