import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Lightbulb, Clock, AlertTriangle, Shield, LogOut, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackAnswer } from "@/lib/answer-tracker";
import { supabase } from "@/integrations/supabase/client";

interface McqQuestion {
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
}

interface StudentInfo {
  name: string;
  university: string;
  course: string;
}

interface Props {
  questions: McqQuestion[];
  title: string;
  setId?: string;
  hideAnswers?: boolean;
  timeLimitMinutes?: number;
  studentInfo?: StudentInfo;
  unitName?: string;
  onExit: () => void;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Returns true if current local time is midnight or later (00:00–05:59 window, or simply past midnight of exam date) */
function isAnswersUnlocked(submittedAt: number | null): boolean {
  if (!submittedAt) return false;
  const now = new Date();
  const submitted = new Date(submittedAt);
  // Answers unlock at midnight (00:00) the day after (or same day if already past midnight)
  const unlock = new Date(submitted);
  unlock.setDate(unlock.getDate() + 1);
  unlock.setHours(0, 0, 0, 0);
  return now >= unlock;
}

type SubmitReason = "manual" | "timeout" | "tab_switch" | "exit";

export default function ExamMode({
  questions, title, setId, hideAnswers = false,
  timeLimitMinutes, studentInfo, unitName,
  onExit,
}: Props) {
  const [answers, setAnswers] = useState<Map<number, number>>(new Map());
  const [submitted, setSubmitted] = useState(false);
  const [submitReason, setSubmitReason] = useState<SubmitReason>("manual");
  const [submittedAt, setSubmittedAt] = useState<number | null>(null);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [tabWarning, setTabWarning] = useState(false);
  const [answersUnlocked, setAnswersUnlocked] = useState(false);
  const submittedRef = useRef(false);

  const timeLimit = timeLimitMinutes ? timeLimitMinutes * 60 : undefined;
  const remaining = timeLimit ? Math.max(0, timeLimit - elapsed) : undefined;

  // Timer
  useEffect(() => {
    if (submitted) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startTime, submitted]);

  // Check unlock status every minute after submission
  useEffect(() => {
    if (!submitted || !submittedAt) return;
    const check = () => setAnswersUnlocked(isAnswersUnlocked(submittedAt));
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [submitted, submittedAt]);

  // Fullscreen request
  useEffect(() => {
    const el = document.documentElement;
    if (el.requestFullscreen && !document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    }
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  // Prevent copy-paste
  useEffect(() => {
    const block = (e: ClipboardEvent) => e.preventDefault();
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("paste", block);
    return () => {
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("paste", block);
    };
  }, []);

  // Prevent right-click
  useEffect(() => {
    const block = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", block);
    return () => document.removeEventListener("contextmenu", block);
  }, []);

  const doSubmit = useCallback(async (reason: SubmitReason) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    setSubmitReason(reason);
    const now = Date.now();
    setSubmittedAt(now);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});

    const currentElapsed = Math.floor((now - startTime) / 1000);
    const correctCount = [...answers.entries()].filter(([qi, oi]) => questions[qi].correct_answer === oi).length;

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

    if (studentInfo && setId) {
      try {
        await supabase.from("exam_results").insert({
          exam_id: setId,
          exam_title: title,
          unit: unitName || "General",
          student_name: studentInfo.name,
          university: studentInfo.university,
          course: studentInfo.course,
          mcq_score: correctCount,
          mcq_total: questions.length,
          time_taken_seconds: currentElapsed,
          submit_reason: reason,
        });
      } catch (e) {
        console.error("Failed to save exam result:", e);
      }
    }
  }, [answers, questions, setId, studentInfo, title, unitName, startTime]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (submittedRef.current || !timeLimit) return;
    if (elapsed >= timeLimit) doSubmit("timeout");
  }, [elapsed, timeLimit, doSubmit]);

  // Tab switch detection
  useEffect(() => {
    if (submittedRef.current) return;
    const handleVisChange = () => {
      if (document.hidden) { setTabWarning(true); doSubmit("tab_switch"); }
    };
    const handleBlur = () => { setTabWarning(true); doSubmit("tab_switch"); };
    document.addEventListener("visibilitychange", handleVisChange);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [doSubmit]);

  // No-select style
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "exam-no-select";
    style.textContent = `.exam-container * { user-select: none; -webkit-user-select: none; }`;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);

  const selectAnswer = (qIdx: number, optIdx: number) => {
    if (submitted) return;
    setAnswers((prev) => new Map(prev).set(qIdx, optIdx));
  };

  const answered = answers.size;
  const total = questions.length;
  const unanswered = total - answered;
  const correctCount = submitted
    ? [...answers.entries()].filter(([qi, oi]) => questions[qi].correct_answer === oi).length
    : 0;
  const pct = submitted && total > 0 ? Math.round((correctCount / total) * 100) : 0;

  const timeColor =
    remaining !== undefined
      ? remaining <= 60 ? "text-destructive bg-destructive/10"
        : remaining <= 300 ? "text-amber-500 bg-amber-500/10"
        : "text-primary bg-primary/10"
      : "text-primary bg-primary/10";

  // ─── EXIT CONFIRM DIALOG ───
  const ExitDialog = () => (
    <AnimatePresence>
      {showExitConfirm && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-full bg-destructive/10 p-2">
                <LogOut className="h-5 w-5 text-destructive" />
              </div>
              <h3 className="font-display text-base font-bold text-foreground">Exit Exam?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              Your progress will be <strong className="text-foreground">lost</strong> and this will be recorded as an incomplete attempt.
            </p>
            <p className="text-xs text-muted-foreground mb-5">
              You will <strong className="text-foreground">not</strong> see answers — they're only available after midnight.
            </p>
            <div className="flex gap-3">
              <Button variant="destructive" onClick={() => { setShowExitConfirm(false); onExit(); }} className="flex-1">
                Yes, Exit
              </Button>
              <Button variant="outline" onClick={() => setShowExitConfirm(false)} className="flex-1">
                Keep Going
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ─── SUBMIT CONFIRM DIALOG ───
  const SubmitDialog = () => (
    <AnimatePresence>
      {showSubmitConfirm && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="font-display text-base font-bold text-foreground mb-2">Submit Exam?</h3>
            {unanswered > 0 && (
              <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {unanswered} question{unanswered > 1 ? "s" : ""} unanswered — will be marked wrong.
              </div>
            )}
            <p className="text-sm text-muted-foreground mb-1">
              You answered <strong className="text-foreground">{answered}/{total}</strong> questions.
            </p>
            <p className="text-xs text-muted-foreground mb-5">
              Answers will be available after <strong className="text-foreground">midnight</strong>.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => { setShowSubmitConfirm(false); doSubmit("manual"); }} className="flex-1">
                Submit Now
              </Button>
              <Button variant="outline" onClick={() => setShowSubmitConfirm(false)} className="flex-1">
                Review First
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ─── RESULTS SCREEN ───
  if (submitted) {
    const grade =
      pct >= 80 ? { label: "Excellent!", color: "text-green-500", bg: "border-green-500/20 bg-green-500/5", emoji: "🏆" }
      : pct >= 60 ? { label: "Good job!", color: "text-blue-500", bg: "border-blue-500/20 bg-blue-500/5", emoji: "✅" }
      : { label: "Keep studying", color: "text-amber-500", bg: "border-amber-500/20 bg-amber-500/5", emoji: "📚" };

    const reasonLabel: Record<SubmitReason, string> = {
      manual: "",
      timeout: "⏱ Time ran out — exam was auto-submitted.",
      tab_switch: "⚠ Exam auto-submitted: you switched tabs or left the page.",
      exit: "",
    };

    return (
      <div className="min-h-screen bg-background px-3 sm:px-6 py-6 pb-20">
        <div className="mx-auto max-w-2xl space-y-4">
          {(submitReason === "tab_switch" || submitReason === "timeout") && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{reasonLabel[submitReason]}</span>
            </div>
          )}

          {studentInfo && (
            <div className="rounded-xl border border-border bg-card p-4 text-sm">
              <p className="text-foreground font-medium">{studentInfo.name}</p>
              <p className="text-muted-foreground text-xs">{studentInfo.university} · {studentInfo.course}</p>
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

          {/* Answers locked until midnight */}
          {!answersUnlocked ? (
            <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center text-center gap-3">
              <div className="rounded-full bg-primary/10 p-4">
                <Lock className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-display text-base font-bold text-foreground">Answers Locked</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Answers and explanations will be available after <strong className="text-foreground">midnight</strong>, once all students have completed the exam.
              </p>
              <p className="text-xs text-muted-foreground">Come back after 12:00 AM to review your answers.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q, qi) => {
                const selected = answers.get(qi);
                const isCorrect = selected === q.correct_answer;
                const wasAnswered = selected !== undefined;
                return (
                  <div key={qi} className={`rounded-xl border p-3 ${
                    !wasAnswered ? "border-muted bg-muted/30"
                    : isCorrect ? "border-green-500/30 bg-green-500/5"
                    : "border-destructive/30 bg-destructive/5"
                  }`}>
                    <div className="flex items-start gap-2 mb-2">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        !wasAnswered ? "bg-muted-foreground/20 text-muted-foreground"
                        : isCorrect ? "bg-green-500/20 text-green-600"
                        : "bg-destructive/20 text-destructive"
                      }`}>{qi + 1}</span>
                      <p className="text-xs sm:text-sm font-medium text-foreground leading-relaxed break-words">{q.question}</p>
                    </div>
                    <div className="space-y-1 ml-8">
                      {q.options.map((opt, oi) => {
                        const isSelected = selected === oi;
                        const isCorrectOpt = oi === q.correct_answer;
                        let style = "border-border bg-card";
                        if (isCorrectOpt) style = "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400";
                        else if (isSelected && !isCorrectOpt) style = "border-destructive/50 bg-destructive/10 text-destructive";
                        return (
                          <div key={oi} className={`flex items-start gap-1.5 rounded-lg border p-2 text-xs sm:text-sm ${style}`}>
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold mt-0.5">
                              {String.fromCharCode(65 + oi)}
                            </span>
                            <span className="flex-1 break-words">{opt}</span>
                            {isCorrectOpt && <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                            {isSelected && !isCorrectOpt && <X className="h-3.5 w-3.5 text-destructive shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                    {q.explanation && (
                      <div className="mt-2 ml-8 rounded-lg border border-primary/20 bg-primary/5 p-2 flex gap-1.5">
                        <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <p className="text-[10px] sm:text-xs text-foreground leading-relaxed break-words">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <Button onClick={onExit} className="w-full">← Back to Exams</Button>
        </div>
      </div>
    );
  }

  // ─── EXAM IN PROGRESS ───
  return (
    <div className="exam-container fixed inset-0 z-50 bg-background overflow-y-auto">
      <ExitDialog />
      <SubmitDialog />

      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur px-3 sm:px-6 py-2.5">
        <div className="mx-auto max-w-2xl flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-sm sm:text-base font-bold text-foreground truncate">{title}</h2>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {answered}/{total} answered
              {studentInfo && <> · {studentInfo.name}</>}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs sm:text-sm font-mono font-bold ${timeColor}`}>
              <Clock className="h-3 w-3" />
              {remaining !== undefined ? formatTime(remaining) : formatTime(elapsed)}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span className="hidden sm:inline">Proctored</span>
            </div>
            <button
              onClick={() => setShowExitConfirm(true)}
              className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-3 w-3" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>
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

      {/* Sticky bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-border bg-card/95 backdrop-blur px-3 sm:px-6 py-3">
        <div className="mx-auto max-w-2xl flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {remaining !== undefined && remaining <= 120 && (
              <span className="text-destructive font-medium animate-pulse">⚠ {formatTime(remaining)} remaining!</span>
            )}
            {remaining === undefined || remaining > 120 ? (
              unanswered > 0 ? (
                <span className="text-amber-500">{unanswered} unanswered</span>
              ) : (
                <span className="text-green-500">All answered ✓</span>
              )
            ) : null}
          </p>
          <Button
            onClick={() => setShowSubmitConfirm(true)}
            disabled={answered === 0}
            className="gap-2 flex-1 max-w-xs"
          >
            Submit Exam ({answered}/{total})
          </Button>
        </div>
      </div>
    </div>
  );
}
