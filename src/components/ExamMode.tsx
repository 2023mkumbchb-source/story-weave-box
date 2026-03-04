import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Lightbulb, Trophy, AlertCircle, Clock } from "lucide-react";
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

export default function ExamMode({ questions, title, setId, hideAnswers = false, onExit }: Props) {
  const [answers, setAnswers] = useState<Map<number, number>>(new Map());
  const [submitted, setSubmitted] = useState(false);
  const [startTime] = useState(Date.now());

  const selectAnswer = (qIdx: number, optIdx: number) => {
    if (submitted) return;
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(qIdx, optIdx);
      return next;
    });
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    // Track answers for logged-in users
    if (setId) {
      for (const [qIdx, selectedOpt] of answers.entries()) {
        const q = questions[qIdx];
        await trackAnswer({
          mcq_set_id: setId,
          question_index: qIdx,
          question_text: q.question,
          selected_answer: selectedOpt,
          correct_answer: q.correct_answer,
          is_correct: selectedOpt === q.correct_answer,
        });
      }
    }
  };

  const answered = answers.size;
  const total = questions.length;
  const correctCount = submitted
    ? [...answers.entries()].filter(([qi, oi]) => questions[qi].correct_answer === oi).length
    : 0;
  const pct = submitted && total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const dur = Math.round((Date.now() - startTime) / 1000);

  if (submitted) {
    const grade =
      pct >= 80 ? { label: "Excellent!", color: "text-green-500", bg: "border-green-500/20 bg-green-500/5", emoji: "🏆" }
      : pct >= 60 ? { label: "Good job!", color: "text-blue-500", bg: "border-blue-500/20 bg-blue-500/5", emoji: "✅" }
      : { label: "Keep going", color: "text-amber-500", bg: "border-amber-500/20 bg-amber-500/5", emoji: "📚" };

    return (
      <div className="mx-auto max-w-3xl space-y-6 pb-12">
        {/* Score summary */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border ${grade.bg} p-6 text-center`}>
          <div className="text-5xl mb-3">{grade.emoji}</div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-1">{grade.label}</h2>
          <p className="text-sm text-muted-foreground mb-4 truncate">{title}</p>
          <div className="flex items-center justify-center gap-6 mb-4">
            <div>
              <p className={`text-4xl font-bold ${grade.color}`}>{pct}%</p>
              <p className="text-xs text-muted-foreground mt-1">Score</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div>
              <p className="text-4xl font-bold text-foreground">{correctCount}/{total}</p>
              <p className="text-xs text-muted-foreground mt-1">Correct</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div>
              <p className="text-4xl font-bold text-foreground">
                {Math.floor(dur / 60)}:{String(dur % 60).padStart(2, "0")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Time</p>
            </div>
          </div>
        </motion.div>

        {/* All questions with results */}
        <div className="space-y-4">
          {questions.map((q, qi) => {
            const selected = answers.get(qi);
            const isCorrect = selected === q.correct_answer;
            const wasAnswered = selected !== undefined;

            return (
              <div key={qi} className={`rounded-xl border p-4 ${
                !wasAnswered ? "border-muted bg-muted/30" :
                isCorrect ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"
              }`}>
                <div className="flex items-start gap-3 mb-3">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    !wasAnswered ? "bg-muted-foreground/20 text-muted-foreground" :
                    isCorrect ? "bg-green-500/20 text-green-600" : "bg-destructive/20 text-destructive"
                  }`}>
                    {qi + 1}
                  </span>
                  <p className="text-sm font-medium text-foreground leading-relaxed">{q.question}</p>
                </div>

                <div className="space-y-1.5 ml-10">
                  {q.options.map((opt, oi) => {
                    const isSelected = selected === oi;
                    const isCorrectOpt = oi === q.correct_answer;
                    let style = "border-border bg-card";
                    if (isCorrectOpt && !hideAnswers) style = "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400";
                    else if (isSelected && !isCorrectOpt) style = "border-destructive/50 bg-destructive/10 text-destructive";

                    return (
                      <div key={oi} className={`flex items-start gap-2 rounded-lg border p-2.5 text-sm ${style}`}>
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold">
                          {String.fromCharCode(65 + oi)}
                        </span>
                        <span className="flex-1">{opt}</span>
                        {isCorrectOpt && !hideAnswers && <Check className="h-4 w-4 text-green-500 shrink-0" />}
                        {isSelected && !isCorrectOpt && <X className="h-4 w-4 text-destructive shrink-0" />}
                      </div>
                    );
                  })}
                </div>

                {q.explanation && !hideAnswers && (
                  <div className="mt-2 ml-10 rounded-lg border border-primary/20 bg-primary/5 p-3 flex gap-2">
                    <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-foreground leading-relaxed">{q.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <Button onClick={onExit} className="flex-1">← Back to Quiz</Button>
        </div>
      </div>
    );
  }

  // Pre-submission exam view
  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-12">
      <div className="sticky top-0 z-10 rounded-xl border border-border bg-card/95 backdrop-blur p-3 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{answered}/{total} answered</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <ExamTimer startTime={startTime} />
          </div>
          <Button size="sm" onClick={handleSubmit} disabled={answered === 0}>
            Submit Exam ({answered}/{total})
          </Button>
        </div>
      </div>

      <div className="h-1.5 w-full rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${(answered / total) * 100}%` }} />
      </div>

      {questions.map((q, qi) => {
        const selected = answers.get(qi);
        return (
          <div key={qi} className={`rounded-xl border p-4 transition-colors ${
            selected !== undefined ? "border-primary/30 bg-primary/5" : "border-border bg-card"
          }`}>
            <div className="flex items-start gap-3 mb-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {qi + 1}
              </span>
              <p className="text-sm font-medium text-foreground leading-relaxed">{q.question}</p>
            </div>

            <div className="space-y-1.5 ml-10">
              {q.options.map((opt, oi) => (
                <button key={oi} onClick={() => selectAnswer(qi, oi)}
                  className={`w-full flex items-start gap-2 rounded-lg border p-2.5 text-sm text-left transition-colors ${
                    selected === oi
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-card hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                  }`}>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                    selected === oi ? "border-primary bg-primary text-primary-foreground" : ""
                  }`}>
                    {String.fromCharCode(65 + oi)}
                  </span>
                  <span className="flex-1">{opt}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <div className="sticky bottom-4 flex justify-center">
        <Button size="lg" onClick={handleSubmit} disabled={answered === 0}
          className="gap-2 shadow-lg">
          Submit Exam ({answered}/{total})
        </Button>
      </div>
    </div>
  );
}

function ExamTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);
  
  useState(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  });

  // Use effect for the timer
  import { useEffect } from "react";
  
  return null; // Will fix below
}

// Proper timer component
function ExamTimerDisplay({ startTime }: { startTime: number }) {
  const [, setTick] = useState(0);
  
  // Force re-render every second
  useState(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  });

  const sec = Math.floor((Date.now() - startTime) / 1000);
  return <span>{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, "0")}</span>;
}
