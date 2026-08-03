import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSetting } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";

export interface AccessPlan {
  id: string;
  label: string;
  price: number;
  days: number;
  download?: boolean;
}

export interface PaymentSettings {
  /** 0 = everything free */
  price: number;
  /** fraction of a locked page that stays visible (0.25 = 75% hidden) */
  freeRatio: number;
  downloadEnabled: boolean;
  plans: AccessPlan[];
}

export const DEFAULT_PLANS: AccessPlan[] = [
  { id: "semester", label: "Semester pass (3 months)", price: 300, days: 90, download: true },
  { id: "annual", label: "Annual pass (12 months)", price: 1000, days: 365, download: true },
];

export const DEFAULT_SETTINGS: PaymentSettings = {
  price: 0,
  freeRatio: 0.25,
  downloadEnabled: true,
  plans: DEFAULT_PLANS,
};

const PASS_KEY = "ompath_access_pass";
let settingsCache: { at: number; value: PaymentSettings } | null = null;

/** Codes are matched punctuation-insensitively, so normalise before sending. */
export function normalizePassCode(value: string): string {
  return (value || "").trim().toUpperCase().replace(/\s+/g, "-").replace(/[^A-Z0-9-]/g, "");
}

/** Attach the signed-in account (if any) so subscriptions can be tracked. */
async function accountFields(): Promise<{ email?: string; user_id?: string }> {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) return {};
    return { user_id: user.id, email: user.email ?? undefined };
  } catch {
    return {};
  }
}

export async function loadPaymentSettings(force = false): Promise<PaymentSettings> {
  if (!force && settingsCache && Date.now() - settingsCache.at < 5 * 60_000) return settingsCache.value;
  try {
    const [priceRaw, ratioRaw, downloadRaw, plansRaw] = await Promise.all([
      getSetting("access_price_kes"),
      getSetting("paywall_free_ratio"),
      getSetting("pdf_download_enabled"),
      getSetting("access_plans"),
    ]);
    let plans = DEFAULT_PLANS;
    try {
      const parsed = JSON.parse(plansRaw || "[]");
      if (Array.isArray(parsed) && parsed.length) plans = parsed as AccessPlan[];
    } catch { /* keep defaults */ }
    const ratio = Number(ratioRaw);
    const value: PaymentSettings = {
      price: priceRaw === "" ? 0 : Math.max(0, Number(priceRaw) || 0),
      freeRatio: Number.isFinite(ratio) && ratio > 0 && ratio < 1 ? ratio : 0.25,
      downloadEnabled: (downloadRaw || "true") !== "false",
      plans,
    };
    settingsCache = { at: Date.now(), value };
    return value;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export interface AccessPass {
  code: string;
  plan: string;
  expires_at: string;
  allow_download: boolean;
}

export function readStoredPass(): AccessPass | null {
  try {
    const raw = localStorage.getItem(PASS_KEY);
    if (!raw) return null;
    const pass = JSON.parse(raw) as AccessPass;
    if (!pass?.code || !pass?.expires_at) return null;
    if (new Date(pass.expires_at).getTime() < Date.now()) {
      localStorage.removeItem(PASS_KEY);
      return null;
    }
    return pass;
  } catch {
    return null;
  }
}

export function storePass(pass: AccessPass) {
  try { localStorage.setItem(PASS_KEY, JSON.stringify(pass)); } catch { /* ignore */ }
}

export function clearPass() {
  try { localStorage.removeItem(PASS_KEY); } catch { /* ignore */ }
}

export async function verifyCode(code: string): Promise<{ ok: boolean; pass?: AccessPass; error?: string }> {
  const { data, error } = await supabase.functions.invoke("access-code", {
    body: {
      action: "verify",
      code: normalizePassCode(code),
      ...(await accountFields()),
    },
  });
  if (error) return { ok: false, error: "Could not check that code. Try again." };
  if (!data?.valid) return { ok: false, error: data?.error || "Invalid code." };
  const pass: AccessPass = {
    code: data.code,
    plan: data.plan,
    expires_at: data.expires_at,
    allow_download: data.allow_download !== false,
  };
  storePass(pass);
  return { ok: true, pass };
}

export async function issuePassForPayment(transactionId: string, plan?: string): Promise<AccessPass | null> {
  const { data, error } = await supabase.functions.invoke("access-code", {
    body: {
      action: "issue",
      transaction_id: transactionId,
      plan,
      ...(await accountFields()),
    },
  });
  if (error || !data?.success) return null;
  const pass: AccessPass = {
    code: data.code,
    plan: data.plan,
    expires_at: data.expires_at,
    allow_download: data.allow_download !== false,
  };
  storePass(pass);
  return pass;
}

/** Let the buyer pick their own memorable pass code on the success screen. */
export async function renamePassCode(currentCode: string, newCode: string): Promise<{ ok: boolean; pass?: AccessPass; error?: string }> {
  const { data, error } = await supabase.functions.invoke("access-code", {
    body: { action: "rename", code: currentCode, new_code: normalizePassCode(newCode), ...(await accountFields()) },
  });
  if (error) return { ok: false, error: "Could not change the code. Try again." };
  if (!data?.success) return { ok: false, error: data?.error || "Could not change the code." };
  const pass: AccessPass = {
    code: data.code,
    plan: data.plan,
    expires_at: data.expires_at,
    allow_download: data.allow_download !== false,
  };
  storePass(pass);
  return { ok: true, pass };
}

export interface AccountInfo {
  found: boolean;
  code?: string;
  plan?: string;
  amount?: number;
  expires_at?: string;
  expired?: boolean;
  allow_download?: boolean;
}

/** Subscriber account lookup — by stored pass code, or by the signed-in account. */
export async function fetchAccount(code?: string): Promise<AccountInfo> {
  const { data, error } = await supabase.functions.invoke("access-code", {
    body: { action: "account", code: code ? normalizePassCode(code) : undefined, ...(await accountFields()) },
  });
  if (error || !data) return { found: false };
  return data as AccountInfo;
}

/**
 * Site-wide access state: is content free right now, does this reader hold a
 * valid pass, and may they download the watermarked PDF.
 */
export function useAccess() {
  const { isAdmin, user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [pass, setPass] = useState<AccessPass | null>(() => readStoredPass());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadPaymentSettings().then((s) => {
      if (!active) return;
      setSettings(s);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  // Restore a subscription from the signed-in account on every browser.
  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;
    fetchAccount().then((info) => {
      if (!active || !info.found || info.expired || !info.code || !info.expires_at) return;
      const linked: AccessPass = {
        code: info.code,
        plan: info.plan || "subscription",
        expires_at: info.expires_at,
        allow_download: info.allow_download !== false,
      };
      storePass(linked);
      setPass(linked);
    });
    return () => { active = false; };
  }, [authLoading, user]);

  const refresh = useCallback(() => {
    setPass(readStoredPass());
    loadPaymentSettings(true).then(setSettings);
  }, []);

  const isFree = (settings?.price ?? 0) <= 0;
  const hasPass = !!pass;
  const ownerAccess = isAdmin;
  return {
    loading,
    settings: settings ?? DEFAULT_SETTINGS,
    pass,
    isFree,
    hasPass,
    /** unlocked = free site, or a valid pass */
    unlocked: isFree || hasPass || ownerAccess,
    /** Answers/reveals are a subscriber feature — never unlocked for guests. */
    canReveal: hasPass || ownerAccess,
    /** PDF handouts are a pro feature: subscribers only. */
    canDownload: ownerAccess || ((settings?.downloadEnabled ?? true) && !!pass?.allow_download),
    applyPass: (p: AccessPass) => setPass(p),
    signOutPass: () => { clearPass(); setPass(null); },
    refresh,
  };
}

/** How many of `total` items stay visible before the paywall. */
export function freeItemCount(total: number, freeRatio: number): number {
  if (total <= 2) return total;
  return Math.max(1, Math.floor(total * freeRatio));
}