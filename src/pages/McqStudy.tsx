import { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Loader2, Lock, Unlock, ListChecks, Phone, CheckCircle, GraduationCap, Calendar, Clock, Users } from "lucide-react";
import { getMcqSetBySlugOrId, getCategoryDisplayName, getSetting, buildMcqPath, type McqSet } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import McqViewer from "@/components/McqViewer";
import ExamMode from "@/components/ExamMode";
import { markMcqVisited } from "@/lib/progress-store";
import { supabase } from "@/integrations/supabase/client";
import { updateMetaTags, stripRichText } from "@/lib/seo";

const MCQ_UNLOCKED_KEY = "unlocked_mcqs";

function loadUnlockedMcqs(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(MCQ_UNLOCKED_KEY) || "[]")); }
  catch { return new Set(); }
}
function persistUnlockedMcqs(set: Set<string>) {
  localStorage.setItem(MCQ_UNLOCKED_KEY, JSON.stringify([...set]));
}

function isMcqItem(q: any) {
  return Array.isArray(q?.options) && q.options.length >= 2;
}

function inferPaperSource(title: string) {
  const t = title.toLowerCase();
  const known = ["mount kenya university", "uon", "university of nairobi", "ku", "kenyatta university", "moi university", "jkuat"];
  return known.find((name) => t.includes(name))?.replace(/\buon\b/i, "University of Nairobi").replace(/\bku\b/i, "Kenyatta University") || "Medical Exam Paper";
}

export default function McqStudy() {
  const { id: param } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [set, setSet] = useState<McqSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordUnlocked, setPasswordUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [examMode, setExamMode] = useState(false);

  // Paywall state
  const [mcqFreeLimit, setMcqFreeLimit] = useState(10);
  const [mcqPrice, setMcqPrice] = useState(10);
  const [isPaid, setIsPaid] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [paying, setPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "pending" | "completed" | "failed">("idle");

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/mcqs");
  };

  useEffect(() => {
    if (!param) return;
    const unlocked = loadUnlockedMcqs();

    Promise.all([
      getMcqSetBySlugOrId(param),
      getSetting("mcq_free_limit"),
      getSetting("mcq_price"),
    ]).then(([s, limitStr, priceStr]) => {
      setSet(s);
      if (s) {
        markMcqVisited(s.id);
        const canonical = buildMcqPath(s);
        if (location.pathname !== canonical) navigate(canonical, { replace: true });
        updateMetaTags({
          title: `${s.title} – MCQs`,
          description: s.description ? stripRichText(s.description, 155) : `Practice ${s.title} MCQs here. Interactive medical study quiz with answers and explanations.`,
        });
      }
      if (s && (!s.access_password || s.access_password === "")) setPasswordUnlocked(true);
      if (limitStr && !isNaN(Number(limitStr))) setMcqFreeLimit(Number(limitStr));
      if (priceStr && !isNaN(Number(priceStr))) setMcqPrice(Number(priceStr));
      if (s && unlocked.has(s.id)) setIsPaid(true);
    }).finally(() => setLoading(false));
  }, [param]);

  // Payment polling
  const pollPayment = (txnId: string) => {
    let attempts = 0;
    const pollId = setInterval(async () => {
      attempts++;
      if (attempts > 60) { clearInterval(pollId); setPaymentStatus("failed"); setPaying(false); return; }
      try {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-payment?transaction_id=${encodeURIComponent(txnId)}`,
          { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" } }
        );
        const result = await resp.json();
        if (!resp.ok) return;
        if (result.status === "completed") {
          clearInterval(pollId);
          setPaymentStatus("completed");
          setPaying(false);
          setIsPaid(true);
          if (set) {
            const next = loadUnlockedMcqs();
            next.add(set.id);
            persistUnlockedMcqs(next);
          }
        } else if (result.status === "failed") {
          clearInterval(pollId);
          setPaymentStatus("failed");
          setPaying(false);
        }
      } catch { /* keep polling */ }
    }, 2000);
  };

  const handlePay = async () => {
    const phone = phoneInput.trim();
    if (!phone || !set) return;
    setPaying(true);
    setPaymentStatus("pending");
    try {
      const { data, error } = await supabase.functions.invoke("initiate-payment", {
        body: { phone, amount: mcqPrice, package_type: `mcq:${set.id}` },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Payment failed");
      pollPayment(data.transaction_id);
    } catch {
      setPaymentStatus("failed");
      setPaying(false);
    }
  };

  const handleUnlock = () => {
    if (set && passwordInput === set.access_password) {
      setPasswordUnlocked(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!set) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="mb-4 font-serif text-3xl font-bold text-foreground">Set not found</h1>
        <Button asChild variant="outline">
          <Link to="/mcqs"><ArrowLeft className="mr-2 h-4 w-4" /> Back to MCQs</Link>
        </Button>
      </div>
    );
  }

  const unitName = getCategoryDisplayName(set.category);
  const isLocked = set.access_password && set.access_password !== "" && !passwordUnlocked;
  const hideAnswers = !!(set.access_password && set.access_password !== "" && !passwordUnlocked);
  const needsPayForExam = mcqFreeLimit > 0 && !isPaid && set.questions.length > mcqFreeLimit;

  const mcqQuestions = set.questions.filter(isMcqItem) as any[];
  const writtenQuestions = set.questions.filter((q: any) => !isMcqItem(q));
  const saqCount = writtenQuestions.filter((q: any) => q.type === "saq" || !/essay|laq|long/i.test(q.type || q.question || "")).length;
  const essayCount = writtenQuestions.length - saqCount;
  const qCount = set.questions.length;
  const estMinutes = Math.max(5, Math.round(mcqQuestions.length * 1.2 + saqCount * 5 + essayCount * 20));
  const examDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const paperSource = inferPaperSource(set.title);

  // Exam mode — if paid or no paywall needed
  if (examMode) {
    return (
      <div className="mx-auto max-w-3xl px-5 pb-20 pt-10 sm:px-6 sm:py-12">
        <ExamMode
          questions={mcqQuestions}
          title={set.title}
          setId={set.id}
          onExit={() => setExamMode(false)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 pb-20 pt-10 sm:px-6 sm:py-12">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" className="-ml-1 gap-2 text-muted-foreground" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => {
            if (needsPayForExam) {
              // Scroll down — the paywall in McqViewer will show
              window.scrollTo({ top: 0, behavior: "smooth" });
            } else {
              setExamMode(true);
            }
          }}
        >
          <ListChecks className="h-4 w-4" /> Exam Mode {needsPayForExam && "🔒"}
        </Button>
      </div>

      {unitName && unitName !== "Uncategorized" && (
        <div className="mb-6 text-center">
          <span className="inline-block rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
            {unitName}
          </span>
        </div>
      )}

      {/* Exam-style cover card */}
      <div className="mb-6 rounded-2xl border-2 border-primary/30 bg-card overflow-hidden shadow-sm">
        {(set as any).og_image_url && (
          <div className="relative aspect-[21/9] w-full overflow-hidden bg-muted">
            <img
              src={(set as any).og_image_url}
              alt={set.title}
              className="absolute inset-0 h-full w-full object-cover animate-hero-fade"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 animate-hero-rise">
              <span className="inline-block rounded-full bg-primary/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">{paperSource}</span>
              <h1 className="mt-2 font-serif text-lg sm:text-2xl font-bold leading-tight text-white drop-shadow">{set.title}</h1>
            </div>
          </div>
        )}
        <div className="bg-primary/10 px-5 py-3 text-center border-b-2 border-primary/20">
          <div className="flex items-center justify-center gap-2 text-primary">
            <GraduationCap className="h-4 w-4" />
            <p className="text-xs font-bold uppercase tracking-wider">{paperSource}</p>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">University-style revision paper</p>
        </div>
        <div className="px-5 py-4 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Unit</p>
          <p className="text-sm font-semibold text-foreground mb-3">{unitName}</p>
          <h1 className="font-serif text-xl sm:text-2xl font-bold text-foreground leading-tight">
            {set.title}
          </h1>
        </div>
        <div className="grid grid-cols-3 border-t border-border bg-muted/30 text-center">
          <div className="px-2 py-2.5 border-r border-border">
            <ListChecks className="h-3.5 w-3.5 mx-auto mb-0.5 text-primary" />
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Sections</p>
            <p className="text-sm font-bold text-foreground">{mcqQuestions.length} MCQ{writtenQuestions.length ? ` + ${writtenQuestions.length}` : ""}</p>
          </div>
          <div className="px-2 py-2.5 border-r border-border">
            <Clock className="h-3.5 w-3.5 mx-auto mb-0.5 text-primary" />
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Duration</p>
            <p className="text-sm font-bold text-foreground">~{estMinutes} min</p>
          </div>
          <div className="px-2 py-2.5">
            <Calendar className="h-3.5 w-3.5 mx-auto mb-0.5 text-primary" />
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Date</p>
            <p className="text-sm font-bold text-foreground">{examDate}</p>
          </div>
        </div>
        <div className="px-5 py-2.5 border-t border-border bg-card text-[11px] text-muted-foreground">
          <p><span className="font-semibold text-foreground">Instructions:</span> Answer MCQs first. Short-answer and essay questions appear after the MCQs when included in the paper.</p>
        </div>
      </div>

      {/* Exam mode paywall notice */}
      {needsPayForExam && (
        <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 flex items-center gap-2 text-xs text-primary">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span>Exam Mode requires unlocking all questions first (KES {mcqPrice})</span>
        </div>
      )}

      {isLocked && (
        <div className="mb-6 rounded-2xl border-2 border-amber-500/30 bg-amber-50 p-6 text-center dark:bg-amber-950/20">
          <Lock className="mx-auto mb-3 h-8 w-8 text-amber-600 dark:text-amber-400" />
          <h3 className="mb-2 font-serif text-lg font-bold text-foreground">Password Protected</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            This quiz is locked. Enter the password to view answers and explanations.
          </p>
          <div className="mx-auto flex max-w-xs items-center justify-center gap-2">
            <Input
              type="password"
              placeholder="Enter password"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              className={passwordError ? "border-destructive" : ""}
            />
            <Button onClick={handleUnlock} size="sm" className="shrink-0 gap-2">
              <Unlock className="h-4 w-4" /> Unlock
            </Button>
          </div>
          {passwordError && <p className="mt-2 text-sm font-medium text-destructive">Wrong password</p>}
          <p className="mt-3 text-xs text-muted-foreground">Or continue without unlocking — answers will be hidden</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setPasswordUnlocked(false)}>
            Continue without password →
          </Button>
        </div>
      )}

      <McqViewer
        questions={set.questions}
        title={set.title}
        setId={set.id}
        category={set.category}
        hideAnswers={hideAnswers}
        freeLimit={mcqFreeLimit}
        mcqPrice={mcqPrice}
        isPaid={isPaid}
        paymentStatus={paymentStatus}
        phoneInput={phoneInput}
        onPhoneChange={setPhoneInput}
        onPay={handlePay}
        onRetryPay={() => setPaymentStatus("idle")}
      />
    </div>
  );
}
