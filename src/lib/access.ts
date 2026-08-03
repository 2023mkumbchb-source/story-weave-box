import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSetting } from "@/lib/store";

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
const DEVICE_KEY = "ompath_device_id";
let settingsCache: { at: number; value: PaymentSettings } | null = null;

/** Stable per-device identifier so a pass can be limited to 2 devices. */
export function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = (crypto.randomUUID?.() || `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "unknown-device";
  }
}

/** Human label for the device list shown to the buyer ("Phone" / "Laptop"). */
export function deviceLabel(): string {
  try {
    const ua = navigator.userAgent;
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    return mobile ? "Phone / tablet" : "Laptop / desktop";
  } catch {
    return "Device";
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
    body: { action: "verify", code, device_id: deviceId(), device_label: deviceLabel() },
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
    body: { action: "issue", transaction_id: transactionId, plan, device_id: deviceId(), device_label: deviceLabel() },
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
    body: { action: "rename", code: currentCode, new_code: newCode, device_id: deviceId() },
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

/**
 * Site-wide access state: is content free right now, does this reader hold a
 * valid pass, and may they download the watermarked PDF.
 */
export function useAccess() {
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

  const refresh = useCallback(() => {
    setPass(readStoredPass());
    loadPaymentSettings(true).then(setSettings);
  }, []);

  const isFree = (settings?.price ?? 0) <= 0;
  const hasPass = !!pass;
  return {
    loading,
    settings: settings ?? DEFAULT_SETTINGS,
    pass,
    isFree,
    hasPass,
    /** unlocked = free site, or a valid pass */
    unlocked: isFree || hasPass,
    /** Answers/reveals are a subscriber feature — never unlocked for guests. */
    canReveal: hasPass,
    /** PDF handouts are a pro feature: subscribers only. */
    canDownload: (settings?.downloadEnabled ?? true) && !!pass?.allow_download,
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