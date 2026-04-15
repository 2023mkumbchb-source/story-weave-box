import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

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
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ block: "start", behavior: "auto" });
      });
      return () => cancelAnimationFrame(hashRaf);
    }

    // Check if we have a saved position for this page (back/forward navigation)
    const navEntry = (window as any).navigation?.currentEntry;
    const isPopState = navEntry?.navigationType === "traverse" || false;
    const savedPos = getScrollPosition(pathname + search);
    
    if (isPopState && savedPos > 0) {
      // Restore scroll position on back/forward
      const restore = () => window.scrollTo({ top: savedPos, left: 0, behavior: "auto" });
      const raf = requestAnimationFrame(restore);
      const t = window.setTimeout(restore, 100);
      return () => { cancelAnimationFrame(raf); clearTimeout(t); };
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
