import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Paywall } from "@/components/Paywall";
import { AccessPass, PaymentSettings } from "@/lib/access";
import { onSubscribePrompt, snoozeSubscribePrompt } from "@/lib/subscribe-prompt";

/**
 * Global subscription prompt. Opens when a guest taps a locked Reveal button
 * or when the scroll nudge fires while reading a paper with MCQs.
 */
export function SubscribeModal({
  settings,
  onUnlocked,
}: {
  settings: PaymentSettings;
  onUnlocked: (pass: AccessPass) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>();

  useEffect(() => onSubscribePrompt((r) => { setReason(r); setOpen(true); }), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open]);

  const close = () => setOpen(false);
  const later = () => { snoozeSubscribePrompt(20); setOpen(false); };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-background/80 p-3 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0" onClick={later} aria-hidden />
      <div className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-7">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <Paywall
          bare
          settings={settings}
          label="answers"
          headline="Subscribe to reveal the answers"
          blurb={reason || "All questions are free to read. A subscription unlocks the verified answer key on every paper — plus watermarked PDF handouts."}
          onUnlocked={onUnlocked}
        />
        <div className="mt-4 text-center">
          <button type="button" onClick={later} className="text-xs font-semibold text-muted-foreground underline underline-offset-4">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}