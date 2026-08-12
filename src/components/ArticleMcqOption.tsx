import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Selection = { wrong: string[]; solved: boolean; correct: string; firstAttempt?: boolean };

export default function ArticleMcqOption({ articleId, questionKey, questionText, category, topic, label, text, correctLabel, children }: {
  articleId: string; questionKey: string; questionText: string; category: string; topic?: string;
  label: string; text: string; correctLabel?: string; children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [selection, setSelection] = useState<Selection | null>(null);
  const eventName = `ompath:answer:${articleId}:${questionKey}`;

  useEffect(() => {
    const listener = (event: Event) => setSelection((event as CustomEvent<Selection>).detail);
    window.addEventListener(eventName, listener);
    return () => window.removeEventListener(eventName, listener);
  }, [eventName]);

  const choose = () => {
    if (!correctLabel || selection?.solved || selection?.wrong.includes(label)) return;
    const correct = label === correctLabel;
    const detail: Selection = {
      wrong: correct ? (selection?.wrong || []) : [...(selection?.wrong || []), label],
      solved: correct,
      correct: correctLabel,
      firstAttempt: correct && (selection?.wrong.length || 0) === 0,
    };
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
    if (user) void supabase.from("article_answer_attempts").insert({
      user_id: user.id, article_id: articleId, question_key: questionKey, question_text: questionText,
      topic_label: topic || null, category, selected_answer: label, correct_answer: correctLabel, is_correct: correct,
    });
    else {
      try {
        const key = "study:guest-article-attempts";
        const rows = JSON.parse(localStorage.getItem(key) || "[]");
        rows.push({ articleId, questionKey, category, topic, selected: label, correct: correctLabel, isCorrect: correct, at: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(rows.slice(-200)));
      } catch { /* storage unavailable */ }
    }
  };

  const isCorrect = Boolean(selection?.solved && label === selection.correct);
  const isWrong = Boolean(selection?.wrong.includes(label));
  const isChosen = isCorrect || isWrong;
  return <button type="button" onClick={choose} disabled={!correctLabel || Boolean(selection?.solved) || isWrong}
    aria-pressed={isChosen}
    className={`not-prose !my-1 flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left align-middle transition-colors ${
      isCorrect ? "border-emerald-500 bg-emerald-500/10" : isWrong ? "border-red-500 bg-red-500/10" : "border-border/70 bg-card hover:border-primary/50"
    } disabled:cursor-default`}>
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center self-center rounded-md text-[11px] font-bold ${isCorrect ? "bg-emerald-600 text-white" : isWrong ? "bg-red-600 text-white" : "bg-primary/10 text-primary"}`}>
      {isCorrect ? <Check className="h-4 w-4" /> : isWrong ? <X className="h-4 w-4" /> : label}
    </span>
    <span className="min-w-0 flex-1 self-center text-[15px] leading-6 text-foreground">{children}</span>
    {isChosen && <span className={`text-xs font-bold ${isCorrect ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>{isCorrect ? "Correct" : "Try again"}</span>}
  </button>;
}
