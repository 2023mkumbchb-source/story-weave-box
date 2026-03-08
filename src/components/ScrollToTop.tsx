import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, search, hash, key } = useLocation();
  const previousLocationKeyRef = useRef<string | null>(null);

  // Prevent browser/native scroll restoration from forcing old positions (mobile-safe).
  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useLayoutEffect(() => {
    const isNewNavigationEntry = previousLocationKeyRef.current !== key;
    previousLocationKeyRef.current = key;

    if (!isNewNavigationEntry) return;

    const resetToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const scrollingEl = document.scrollingElement as HTMLElement | null;
      if (scrollingEl) scrollingEl.scrollTop = 0;
    };

    if (hash) {
      let hashRaf = 0;
      hashRaf = requestAnimationFrame(() => {
        const id = hash.replace("#", "");
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ block: "start", behavior: "auto" });
      });
      return () => cancelAnimationFrame(hashRaf);
    }

    resetToTop();

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      resetToTop();
      raf2 = requestAnimationFrame(resetToTop);
    });

    const t1 = window.setTimeout(resetToTop, 80);
    const t2 = window.setTimeout(resetToTop, 220);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [key, pathname, search, hash]);

  return null;
}

