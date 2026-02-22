import { useState, useCallback, useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  cards: { question: string; answer: string }[];
  title: string;
  setId?: string;
}

const STORAGE_KEY = "flashcard_progress_";

export default function FlashcardViewer({ cards, title, setId }: Props) {
  const storageKey = setId ? STORAGE_KEY + setId : null;

  const [order, setOrder] = useState(() => cards.map((_, i) => i));
  const [current, setCurrent] = useState(() => {
    if (storageKey) {
      try { return JSON.parse(localStorage.getItem(storageKey) || "0"); } catch { return 0; }
    }
    return 0;
  });
  const [flipped, setFlipped] = useState(false);
  const dragX = useMotionValue(0);
  const dragOpacity = useTransform(dragX, [-150, 0, 150], [0.5, 1, 0.5]);
  const dragRotate = useTransform(dragX, [-150, 0, 150], [-8, 0, 8]);
  const isDragging = useRef(false);

  const cardIndex = order[current];

  // Save progress
  useEffect(() => {
    if (storageKey) localStorage.setItem(storageKey, String(current));
  }, [current, storageKey]);

  const next = useCallback(() => {
    if (current < order.length - 1) {
      setCurrent((c) => c + 1);
      setFlipped(false);
    }
  }, [current, order.length]);

  const prev = useCallback(() => {
    if (current > 0) {
      setCurrent((c) => c - 1);
      setFlipped(false);
    }
  }, [current]);

  const shuffle = () => {
    const shuffled = [...order].sort(() => Math.random() - 0.5);
    setOrder(shuffled);
    setCurrent(0);
    setFlipped(false);
  };

  const reset = () => {
    setOrder(cards.map((_, i) => i));
    setCurrent(0);
    setFlipped(false);
    if (storageKey) localStorage.removeItem(storageKey);
  };

  const handleDragEnd = (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    const swipeThreshold = 30;
    const velocityThreshold = 200;
    
    if (Math.abs(info.offset.x) > swipeThreshold || Math.abs(info.velocity.x) > velocityThreshold) {
      if (info.offset.x < 0 || info.velocity.x < -velocityThreshold) {
        next();
      } else {
        prev();
      }
    }
    animate(dragX, 0, { type: "spring", stiffness: 300, damping: 30 });
  };

  const handleClick = () => {
    if (!isDragging.current) {
      setFlipped(!flipped);
    }
  };

  // Keyboard shortcuts
  useState(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); setFlipped((f) => !f); }
      if (e.code === "ArrowRight") next();
      if (e.code === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  return (
    <div className="mx-auto max-w-2xl px-2">
      <h2 className="mb-2 text-center font-display text-xl sm:text-2xl font-bold text-foreground">{title}</h2>
      <p className="mb-6 sm:mb-8 text-center text-xs sm:text-sm text-muted-foreground">
        Card {current + 1} of {order.length} · Tap to flip · Swipe to navigate
      </p>

      <motion.div
        className="perspective-1000 mx-auto mb-6 sm:mb-8 h-64 sm:h-72 w-full max-w-lg cursor-pointer select-none touch-pan-y"
        style={{ x: dragX, opacity: dragOpacity, rotate: dragRotate }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragStart={() => { isDragging.current = true; }}
        onDragEnd={(e, info) => {
          handleDragEnd(e, info);
          setTimeout(() => { isDragging.current = false; }, 50);
        }}
        onClick={handleClick}
      >
        <motion.div
          className="relative h-full w-full"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-6 sm:p-8 text-center"
            style={{ backfaceVisibility: "hidden", boxShadow: "var(--shadow-elevated)" }}
          >
            <span className="mb-3 text-xs font-medium uppercase tracking-wider text-primary">Question</span>
            <p className="text-base sm:text-lg font-medium text-foreground leading-relaxed">{cards[cardIndex]?.question}</p>
          </div>
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-border bg-secondary p-6 sm:p-8 text-center overflow-y-auto"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <span className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Answer</span>
            <p className="text-base sm:text-lg font-medium text-foreground leading-relaxed">{cards[cardIndex]?.answer}</p>
          </div>
        </motion.div>
      </motion.div>

      <p className="mb-4 text-center text-xs text-muted-foreground sm:hidden">
        ← Swipe left/right to navigate →
      </p>

      <div className="flex items-center justify-center gap-2 sm:gap-3">
        <Button variant="outline" size="icon" onClick={prev} disabled={current === 0}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={shuffle}>
          <Shuffle className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={next} disabled={current === order.length - 1}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4 h-1 w-full rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${((current + 1) / order.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
