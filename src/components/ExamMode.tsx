import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Check, X, Lightbulb, Clock, AlertTriangle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackAnswer } from "@/lib/answer-tracker";

interface McqQuestion {
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
}

interface Props {
  questions: McqQuestion[];
  title: string;
  setId?: string;
  hideAnswers?: boolean;
  onExit: () => void;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ExamMode({ questions, title, setId, hideAnswers = false, onExit }: Props) {
  const [answers, setAnswers] = useState<Map<number, number>>(new Map());
  const [submitted, setSubmitted] = useState(false);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [tabWarning, setTabWarning] = useState(false);

  // Timer
  useEffect(() => {
    if (submitted) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startTime, submitted]);

  // Fullscreen request
  useEffect(() => {
    const el = document.documentElement;
    if (el.requestFullscreen && !document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    }
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // Tab switch detection - auto submit
  const handleSubmit = useCallback(async () => {
    if (submitted) return;
    setSubmitted(true);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    if (setId) {
      for (const [qIdx, selectedOpt] of answers.entries()) {
        const q = questions[qIdx];
        trackAnswer({
          mcq_set_id: setId,
          question_index: qIdx,
          question_text: q.question,
          selected_answer: selectedOpt,
          correct_answer: q.correct_answer,
          is_correct: selectedOpt === q.correct_answer,
        });
      }
    }
  }, [submitted, answers, questions, setId]);

  useEffect(() => {
    if (submitted) return;
    const handleVisChange = () => {
      if (document.hidden) {
        setTabWarning(true);
        handleSubmit();
      }
    };
    const handleBlur = () => {
      setTabWarning(true);
      handleSubmit();
    };
    document.addEventListener("visibilitychange", handleVisChange);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [submitted, handleSubmit]);

  // Prevent text selection in exam
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "exam-no-select";
    style.textContent = `
      .exam-container { user-select: none; -webkit-user-select: none; }
      .exam-container * { user-select: none; -webkit-user-select: none; }
    `;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);

  const selectAnswer = (qIdx: number, optIdx: number) => {
    if (submitted) return;
    setAnswers((prev) => new Map(prev).set(qIdx, optIdx));
  };

  const answered = answers.size;
  const total = questions.length;
  const correctCount = submitted
    ? [...answers.entries()].filter(([qi, oi]) => questions[qi].correct_answer === oi).length
    : 0;
  const pct = submitted && total > 0 ? Math.round((correctCount / total) * 100) : 0;

  // RESULTS SCREEN
  if (submitted) {
    const grade =
      pct >= 80 ? { label: "Excellent!", color: "text-green-500", bg: "border-green-500/20 bg-green-500/5", emoji: "🏆" }
      : pct >= 60 ? { label: "Good job!", color: "text-blue-500", bg: "border-blue-500/20 bg-blue-500/5", emoji: "✅" }
      : { label: "Keep studying", color: "text-amber-500", bg: "border-amber-500/20 bg-amber-500/5", emoji: "📚" };

    return (
      <div className="min-h-screen bg-background px-3 sm:px-6 py-6 pb-20">
        <div className="mx-auto max-w-2xl space-y-4">
          {tabWarning && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Exam auto-submitted: you switched tabs or left the page.</span>
            </div>
          )}

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border ${grade.bg} p-5 text-center`}>
            <div className="text-4xl mb-2">{grade.emoji}</div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-1">{grade.label}</h2>
            <p className="text-xs text-muted-foreground mb-3 truncate">{title}</p>
            <div className="flex items-center justify-center gap-4 sm:gap-6 mb-3">
              <div>
                <p className={`text-3xl sm:text-4xl font-bold ${grade.color}`}>{pct}%</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Score</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-3xl sm:text-4xl font-bold text-foreground">{correctCount}/{total}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Correct</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-3xl sm:text-4xl font-bold text-foreground">{formatTime(elapsed)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Time</p>
              </div>
            </div>
          </motion.div>

          <div className="space-y-3">
            {questions.map((q, qi) => {
              const selected = answers.get(qi);
              const isCorrect = selected === q.correct_answer;
              const wasAnswered = selected !== undefined;

              return (
                <div key={qi} className={`rounded-xl border p-3 ${
                  !wasAnswered ? "border-muted bg-muted/30" :
                  isCorrect ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"
                }`}>
                  <div className="flex items-start gap-2 mb-2">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      !wasAnswered ? "bg-muted-foreground/20 text-muted-foreground" :
                      isCorrect ? "bg-green-500/20 text-green-600" : "bg-destructive/20 text-destructive"
                    }`}>{qi + 1}</span>
                    <p className="text-xs sm:text-sm font-medium text-foreground leading-relaxed break-words">{q.question}</p>
                  </div>
                  <div className="space-y-1 ml-8">
                    {q.options.map((opt, oi) => {
                      const isSelected = selected === oi;
                      const isCorrectOpt = oi === q.correct_answer;
                      let style = "border-border bg-card";
                      if (isCorrectOpt && !hideAnswers) style = "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400";
                      else if (isSelected && !isCorrectOpt) style = "border-destructive/50 bg-destructive/10 text-destructive";
                      return (
                        <div key={oi} className={`flex items-start gap-1.5 rounded-lg border p-2 text-xs sm:text-sm ${style}`}>
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold mt-0.5">
                            {String.fromCharCode(65 + oi)}
                          </span>
                          <span className="flex-1 break-words">{opt}</span>
                          {isCorrectOpt && !hideAnswers && <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                          {isSelected && !isCorrectOpt && <X className="h-3.5 w-3.5 text-destructive shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                  {q.explanation && !hideAnswers && (
                    <div className="mt-2 ml-8 rounded-lg border border-primary/20 bg-primary/5 p-2 flex gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <p className="text-[10px] sm:text-xs text-foreground leading-relaxed break-words">{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <Button onClick={onExit} className="w-full">← Back to Quiz</Button>
        </div>
      </div>
    );
  }

  // EXAM IN PROGRESS
  return (
    <div className="exam-container fixed inset-0 z-50 bg-background overflow-y-auto">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur px-3 sm:px-6 py-2.5">
        <div className="mx-auto max-w-2xl flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-sm sm:text-base font-bold text-foreground truncate">{title}</h2>
            <p className="text-[10px] sm:text-xs text-muted-foreground">{answered}/{total} answered</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs sm:text-sm font-mono font-bold text-primary">
              <Clock className="h-3 w-3" />
              {formatTime(elapsed)}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span className="hidden sm:inline">Proctored</span>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mx-auto max-w-2xl mt-1.5">
          <div className="h-1 w-full rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${(answered / total) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="mx-auto max-w-2xl px-3 sm:px-6 py-4 pb-24 space-y-3">
        {questions.map((q, qi) => {
          const selected = answers.get(qi);
          return (
            <div key={qi} className={`rounded-xl border p-3 transition-colors ${
              selected !== undefined ? "border-primary/30 bg-primary/5" : "border-border bg-card"
            }`}>
              <div className="flex items-start gap-2 mb-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {qi + 1}
                </span>
                <p className="text-xs sm:text-sm font-medium text-foreground leading-relaxed break-words">{q.question}</p>
              </div>
              <div className="space-y-1 ml-8">
                {q.options.map((opt, oi) => (
                  <button key={oi} onClick={() => selectAnswer(qi, oi)}
                    className={`w-full flex items-start gap-1.5 rounded-lg border p-2 text-xs sm:text-sm text-left transition-colors ${
                      selected === oi
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border bg-card hover:border-primary/50 hover:bg-primary/5 cursor-pointer active:bg-primary/10"
                    }`}>
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold mt-0.5 ${
                      selected === oi ? "border-primary bg-primary text-primary-foreground" : ""
                    }`}>{String.fromCharCode(65 + oi)}</span>
                    <span className="flex-1 break-words">{opt}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky bottom submit */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-border bg-card/95 backdrop-blur px-3 sm:px-6 py-3">
        <div className="mx-auto max-w-2xl flex items-center justify-between gap-3">
          <Button size="sm" onClick={onExit} variant="ghost" className="text-xs">Exit</Button>
          <Button onClick={handleSubmit} disabled={answered === 0} className="gap-2 flex-1 max-w-xs">
            Submit Exam ({answered}/{total})
          </Button>
        </div>
      </div>
    </div>
  );
}
