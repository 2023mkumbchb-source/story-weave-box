import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { flashAnchor } from "@/lib/deep-link";

const SCROLL_KEY = "ompath_scroll_positions";

function saveScrollPosition(key: string) {
  try {
    const positions = JSON.parse(sessionStorage.getItem(SCROLL_KEY) || "{}");
    positions[key] = window.scrollY;
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify(positions));
  } catch {}
}

function getScrollPosition(key: string): number {
  try {
    const positions = JSON.parse(sessionStorage.getItem(SCROLL_KEY) || "{}");
    return positions[key] || 0;
  } catch { return 0; }
}

function isHistoryTraversal(): boolean {
  const navEntry = (window as any).navigation?.currentEntry;
  if (navEntry?.navigationType === "traverse") return true;
  const perfEntries = window.performance?.getEntriesByType?.("navigation") as PerformanceNavigationTiming[] | undefined;
  return perfEntries?.[0]?.type === "back_forward";
}

export default function ScrollToTop() {
  const { pathname, search, hash, key } = useLocation();
  const previousLocationKeyRef = useRef<string | null>(null);
  const previousPathRef = useRef<string>("");
  const isFirstLoad = useRef(true);

  // Disable browser scroll restoration
  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => { window.history.scrollRestoration = previous; };
  }, []);

  // Save scroll position before navigating away
  useEffect(() => {
    const handleBeforeUnload = () => saveScrollPosition(pathname + search);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Save when leaving this route
      saveScrollPosition(previousPathRef.current);
    };
  }, [pathname, search]);

  // On first load from external, push home as base
  useEffect(() => {
    if (isFirstLoad.current && pathname !== "/" && window.history.length <= 2) {
      window.history.replaceState({ fromExternal: true }, "", "/");
      window.history.pushState(null, "", pathname + search + hash);
    }
    isFirstLoad.current = false;
  }, []);

  useLayoutEffect(() => {
    const isNewNavigationEntry = previousLocationKeyRef.current !== key;
    
    // Save old position before updating refs
    if (previousPathRef.current && isNewNavigationEntry) {
      saveScrollPosition(previousPathRef.current);
    }
    
    previousLocationKeyRef.current = key;
    previousPathRef.current = pathname + search;

    if (!isNewNavigationEntry) return;

    if (hash) {
      const hashRaf = requestAnimationFrame(() => {
        const id = hash.replace("#", "");
        flashAnchor(id);
      });
      return () => cancelAnimationFrame(hashRaf);
    }

    // Restore exact saved position for back/forward, reload, and returning to a note.
    const savedPos = getScrollPosition(pathname + search);
    
    if (savedPos > 0) {
      // Restore scroll position on back/forward — retry as content loads
      const timers: number[] = [];
      const rafs: number[] = [];
      const restore = () => {
        const max = Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight,
        ) - window.innerHeight;
        const target = Math.min(savedPos, Math.max(0, max));
        window.scrollTo({ top: target, left: 0, behavior: "auto" });
      };
      rafs.push(requestAnimationFrame(restore));
      [50, 150, 350, 700, 1200, 2000].forEach((d) => {
        timers.push(window.setTimeout(restore, d));
      });
      return () => {
        rafs.forEach(cancelAnimationFrame);
        timers.forEach(clearTimeout);
      };
    }

    // New navigation - scroll to top
    const resetToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    resetToTop();
    const raf1 = requestAnimationFrame(() => {
      resetToTop();
      requestAnimationFrame(resetToTop);
    });
    const t1 = window.setTimeout(resetToTop, 80);
    const t2 = window.setTimeout(resetToTop, 220);

    return () => {
      cancelAnimationFrame(raf1);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [key, pathname, search, hash]);

  return null;
}
