import { useState } from "react";
import { Lock, Loader2, ShieldCheck, KeyRound, Smartphone, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AccessPass, AccessPlan, PaymentSettings, issuePassForPayment, verifyCode } from "@/lib/access";

/**
 * Paywall shown where the free portion of a page ends. Two ways in:
 *  1. M-Pesa (Palpluss STK push) -> a pass code is issued automatically
 *  2. Entering a pass code already bought on another device
 */
export function Paywall({
  settings,
  hiddenCount,
  label = "questions",
  onUnlocked,
}: {
  settings: PaymentSettings;
  hiddenCount: number;
  label?: string;
  onUnlocked: (pass: AccessPass) => void;
}) {
  const plans = settings.plans.length ? settings.plans : [];
  const [planId, setPlanId] = useState(plans[0]?.id || "day");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "waiting" | "error">("idle");
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"buy" | "code">("buy");
  const [code, setCode] = useState("");
  const [issued, setIssued] = useState<AccessPass | null>(null);

  const plan: AccessPlan = plans.find((p) => p.id === planId) || {
    id: "day", label: "Access pass", price: settings.price, days: 1, download: false,
  };

  const pollPayment = async (transactionId: string) => {
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-payment?transaction_id=${encodeURIComponent(transactionId)}`,
        );
        const json = await res.json().catch(() => ({}));
        if (json?.status === "completed") {
          const pass = await issuePassForPayment(transactionId, plan.id);
          if (pass) {
            setIssued(pass);
            onUnlocked(pass);
            return;
          }
          setState("error");
          setMessage("Payment received but the pass could not be issued. Contact support with your M-Pesa code.");
          return;
        }
        if (json?.status === "failed") {
          setState("error");
          setMessage("The payment was not completed. You can try again.");
          return;
        }
      } catch { /* keep polling */ }
    }
    setState("error");
    setMessage("Still waiting on M-Pesa. If you were charged, enter your pass code once you receive it.");
  };

  const pay = async () => {
    if (!/^(\+?254|0)?\d{9}$/.test(phone.replace(/\s+/g, ""))) {
      setState("error");
      setMessage("Enter a valid Safaricom number, e.g. 07XXXXXXXX.");
      return;
    }
    setState("sending");
    setMessage("");
    const { data, error } = await supabase.functions.invoke("initiate-payment", {
      body: { phone, amount: plan.price || settings.price, package_type: plan.id },
    });
    if (error || !data?.success) {
      setState("error");
      setMessage(data?.error || "Could not start the payment. Please try again.");
      return;
    }
    setState("waiting");
    setMessage("Check your phone and enter your M-Pesa PIN…");
    pollPayment(data.transaction_id);
  };

  const redeem = async () => {
    setState("sending");
    setMessage("");
    const res = await verifyCode(code.trim().toUpperCase());
    if (!res.ok || !res.pass) {
      setState("error");
      setMessage(res.error || "Invalid code.");
      return;
    }
    setIssued(res.pass);
    onUnlocked(res.pass);
  };

  if (issued) {
    return (
      <div className="not-prose my-8 rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
        <p className="mt-3 font-serif text-lg font-bold text-foreground">Access unlocked</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your pass code is <span className="font-mono font-bold text-foreground">{issued.code}</span> — valid until{" "}
          {new Date(issued.expires_at).toLocaleDateString()}. Keep it to sign in on another device.
        </p>
      </div>
    );
  }

  return (
    <div className="not-prose relative my-8 overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="mx-auto max-w-lg text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
          <Lock className="h-3 w-3" /> Members only
        </span>
        <h2 className="mt-4 font-serif text-2xl font-bold leading-snug text-foreground">
          {hiddenCount} more {label} are locked
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Unlock the full verified answer key on this page — plus every other paper on Ompath Study — with one pass.
        </p>

        <div className="mt-5 inline-flex overflow-hidden rounded-full border border-border">
          <button
            type="button"
            onClick={() => { setMode("buy"); setState("idle"); }}
            className={`px-4 py-1.5 text-xs font-bold ${mode === "buy" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Pay with M-Pesa
          </button>
          <button
            type="button"
            onClick={() => { setMode("code"); setState("idle"); }}
            className={`px-4 py-1.5 text-xs font-bold ${mode === "code" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            I have a code
          </button>
        </div>

        {mode === "buy" ? (
          <>
            <div className="mt-5 grid gap-2 text-left sm:grid-cols-3">
              {plans.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlanId(p.id)}
                  className={`rounded-xl border p-3 transition-colors ${planId === p.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{p.label}</p>
                  <p className="mt-1 font-serif text-lg font-bold text-foreground">KES {p.price}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {p.days} day{p.days === 1 ? "" : "s"}{p.download ? " · PDF download" : ""}
                  </p>
                  {planId === p.id && (
                    <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-primary"><Check className="h-3 w-3" /> Selected</p>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  placeholder="07XX XXX XXX"
                  className="w-full rounded-full border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
              <button
                type="button"
                onClick={pay}
                disabled={state === "sending" || state === "waiting"}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {state === "sending" || state === "waiting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                Pay KES {plan.price || settings.price}
              </button>
            </div>
          </>
        ) : (
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="OM-XXXXXXXX"
                className="w-full rounded-full border border-border bg-background py-2.5 pl-9 pr-3 font-mono text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
            <button
              type="button"
              onClick={redeem}
              disabled={state === "sending"}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Unlock
            </button>
          </div>
        )}

        {message && (
          <p className={`mt-3 text-xs font-semibold ${state === "error" ? "text-destructive" : "text-primary"}`}>{message}</p>
        )}
        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          One pass covers the whole site. Passes are personal — downloads are watermarked with your pass code.
        </p>
      </div>
    </div>
  );
}

/** Small banner used when the admin has set the site price to zero. */
export function FreeAccessBanner({ count, label = "questions" }: { count: number; label?: string }) {
  return (
    <div className="not-prose mb-5 flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
      <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
      <p className="text-[13px] font-semibold leading-snug text-foreground">
        This page is free to view — all {count} {label} and the full answer key are unlocked.
      </p>
    </div>
  );
}