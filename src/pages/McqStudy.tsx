import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Lock, Unlock, ListChecks, Phone, CheckCircle } from "lucide-react";
import { getMcqSetById, getCategoryDisplayName, getSetting, type McqSet } from "@/lib/store";
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

export default function McqStudy() {
  const { id } = useParams();
  const navigate = useNavigate();
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
    if (!id) return;
    const unlocked = loadUnlockedMcqs();

    Promise.all([
      getMcqSetById(id),
      getSetting("mcq_free_limit"),
      getSetting("mcq_price"),
    ]).then(([s, limitStr, priceStr]) => {
      setSet(s);
      if (s) {
        markMcqVisited(s.id);
        updateMetaTags({
          title: `${s.title} – MCQs | OMPATH`,
          description: s.description ? stripRichText(s.description, 155) : `Practice ${s.title} MCQs on OMPATH. Interactive medical study quiz with answers and explanations.`,
        });
      }
      if (s && (!s.access_password || s.access_password === "")) setPasswordUnlocked(true);
      if (limitStr && !isNaN(Number(limitStr))) setMcqFreeLimit(Number(limitStr));
      if (priceStr && !isNaN(Number(priceStr))) setMcqPrice(Number(priceStr));
      if (s && unlocked.has(s.id)) setIsPaid(true);
    }).finally(() => setLoading(false));
  }, [id]);

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

  // Exam mode — if paid or no paywall needed
  if (examMode) {
    return (
      <div className="mx-auto max-w-3xl px-5 pb-20 pt-10 sm:px-6 sm:py-12">
        <ExamMode
          questions={set.questions}
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
