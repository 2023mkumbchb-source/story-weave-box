import { useEffect, useState } from "react";
import { Loader2, Save, ShieldCheck, Trash2 } from "lucide-react";
import { getSetting, saveSetting } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { AccessPlan, DEFAULT_PLANS, loadPaymentSettings } from "@/lib/access";
import { toast } from "@/hooks/use-toast";

/** Admin panel: price, where the paywall starts, PDF downloads and the 3 plans. */
export default function PaymentSettingsAdmin() {
  const [price, setPrice] = useState("0");
  const [ratio, setRatio] = useState("0.25");
  const [downloads, setDownloads] = useState(true);
  const [plans, setPlans] = useState<AccessPlan[]>(DEFAULT_PLANS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passes, setPasses] = useState<{ code: string; plan: string; expires_at: string; amount: number }[]>([]);

  useEffect(() => {
    Promise.all([
      getSetting("access_price_kes"),
      getSetting("paywall_free_ratio"),
      getSetting("pdf_download_enabled"),
      getSetting("access_plans"),
    ]).then(([p, r, d, pl]) => {
      setPrice(p || "0");
      setRatio(r || "0.25");
      setDownloads((d || "true") !== "false");
      try {
        const parsed = JSON.parse(pl || "[]");
        if (Array.isArray(parsed) && parsed.length) setPlans(parsed);
      } catch { /* keep defaults */ }
      setLoading(false);
    });
  }, []);

  const loadPasses = async () => {
    const { data } = await (supabase as any)
      .from("access_grants")
      .select("code, plan, expires_at, amount")
      .order("created_at", { ascending: false })
      .limit(25);
    setPasses(data || []);
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveSetting("access_price_kes", String(Math.max(0, Number(price) || 0)));
      await saveSetting("paywall_free_ratio", String(Math.min(0.9, Math.max(0.05, Number(ratio) || 0.25))));
      await saveSetting("pdf_download_enabled", downloads ? "true" : "false");
      await saveSetting("access_plans", JSON.stringify(plans));
      await loadPaymentSettings(true);
      toast({ title: "Payment settings saved" });
    } catch (e) {
      toast({ title: "Could not save", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updatePlan = (i: number, patch: Partial<AccessPlan>) =>
    setPlans((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  if (loading) {
    return <div className="flex min-h-[30vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const isFree = (Number(price) || 0) <= 0;
  const hiddenPct = Math.round((1 - (Number(ratio) || 0.25)) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 font-serif text-xl font-bold text-foreground">Payments &amp; access</h2>
        <p className="text-sm text-muted-foreground">
          Set the site price, where the paywall starts, and the three subscription passes.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Site price (KES)</span>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="numeric"
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
            <span className="mt-1 block text-[11px] text-muted-foreground">
              {isFree
                ? "0 = everything free. Readers see a “this page is free to view” banner."
                : "Locked pages show the paywall after the free portion."}
            </span>
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Free portion of a page</span>
            <input
              type="range"
              min="0.05"
              max="0.9"
              step="0.05"
              value={ratio}
              onChange={(e) => setRatio(e.target.value)}
              className="mt-3 w-full accent-primary"
            />
            <span className="mt-1 block text-[11px] text-muted-foreground">
              {Math.round((Number(ratio) || 0.25) * 100)}% visible · <strong>{hiddenPct}% hidden</strong> (e.g. 20 questions →{" "}
              {Math.max(1, Math.floor(20 * (Number(ratio) || 0.25)))} free)
            </span>
          </label>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={downloads} onChange={(e) => setDownloads(e.target.checked)} className="accent-primary" />
          Allow watermarked PDF handout downloads
        </label>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          Handouts are deliberately abridged: about half the plates, no teaching notes, no reader corrections, and a diagonal
          watermark carrying the buyer’s pass code so leaks are traceable.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Subscription passes</p>
        <div className="space-y-3">
          {plans.map((p, i) => (
            <div key={p.id} className="grid gap-2 sm:grid-cols-[1.4fr_0.7fr_0.7fr_auto] sm:items-center">
              <input
                value={p.label}
                onChange={(e) => updatePlan(i, { label: e.target.value })}
                placeholder="Label"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
              <input
                value={String(p.price)}
                onChange={(e) => updatePlan(i, { price: Number(e.target.value) || 0 })}
                inputMode="numeric"
                placeholder="KES"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
              <input
                value={String(p.days)}
                onChange={(e) => updatePlan(i, { days: Number(e.target.value) || 1 })}
                inputMode="numeric"
                placeholder="Days"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
              <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <input type="checkbox" checked={p.download !== false} onChange={(e) => updatePlan(i, { download: e.target.checked })} className="accent-primary" />
                PDF
              </label>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save settings
      </button>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Issued passes
          </p>
          <button type="button" onClick={loadPasses} className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground">
            Load recent
          </button>
        </div>
        {passes.length === 0 ? (
          <p className="text-xs text-muted-foreground">No passes loaded.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {passes.map((p) => (
              <li key={p.code} className="flex items-center justify-between py-2">
                <span className="font-mono font-bold text-foreground">{p.code}</span>
                <span className="text-xs text-muted-foreground">
                  {p.plan} · KES {p.amount} · until {new Date(p.expires_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Trash2 className="h-3 w-3" /> Passes expire automatically — no manual cleanup needed.
        </p>
      </div>
    </div>
  );
}