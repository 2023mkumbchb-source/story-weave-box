import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  const previousPathRef = useRef(pathname);

  useEffect(() => {
    const pathnameChanged = previousPathRef.current !== pathname;

    if (pathnameChanged) {
      previousPathRef.current = pathname;
      if (navigationType !== "POP") {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }
      return;
    }

    if (!hash) return;

    requestAnimationFrame(() => {
      const id = hash.replace("#", "");
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ block: "start", behavior: "auto" });
      }
    });
  }, [pathname, hash, navigationType]);

  return null;
}
