import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import type { ReactNode } from "react";

type Variant = { initial: Record<string, number>; animate: Record<string, number>; exit: Record<string, number> };

/** Each area of the site gets its own entrance so navigation feels intentional. */
const VARIANTS: Record<string, Variant> = {
  home: {
    initial: { opacity: 0, scale: 0.985 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.008 },
  },
  read: {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
  },
  list: {
    initial: { opacity: 0, x: 26 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -18 },
  },
  study: {
    initial: { opacity: 0, y: -14, scale: 0.99 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, scale: 0.99 },
  },
  utility: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
};

function variantFor(pathname: string): Variant {
  if (pathname === "/") return VARIANTS.home;
  if (/^\/blog\/.+/.test(pathname) || /^\/stories\/.+/.test(pathname)) return VARIANTS.read;
  if (/^\/(mcqs|flashcards|exams|essays)\/.+/.test(pathname)) return VARIANTS.study;
  if (/^\/(blog|mcqs|flashcards|exams|essays|stories|year)/.test(pathname)) return VARIANTS.list;
  return VARIANTS.utility;
}

export default function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const v = variantFor(location.pathname);
  return (
    <motion.main
      key={location.pathname}
      initial={v.initial}
      animate={v.animate}
      exit={v.exit}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-[65vh]"
    >
      {children}
    </motion.main>
  );
}