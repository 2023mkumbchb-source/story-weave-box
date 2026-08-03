import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return "OM-" + Array.from(bytes).map((b) => ALPHABET[b % ALPHABET.length]).join("").slice(0, 8);
}

interface Plan { id: string; label: string; price: number; days: number; download?: boolean }

interface DeviceEntry { id: string; label?: string; first_seen: string; last_seen: string }

/** Register a device against a pass, enforcing the 2-device limit. */
function registerDevice(
  devices: DeviceEntry[],
  limit: number,
  deviceId?: string,
  label?: string,
): { ok: boolean; devices: DeviceEntry[]; error?: string } {
  const list = Array.isArray(devices) ? devices.filter((d) => d && d.id) : [];
  if (!deviceId) return { ok: true, devices: list };
  const now = new Date().toISOString();
  const existing = list.find((d) => d.id === deviceId);
  if (existing) {
    existing.last_seen = now;
    if (label) existing.label = label;
    return { ok: true, devices: list };
  }
  if (list.length >= Math.max(1, limit || 2)) {
    return {
      ok: false,
      devices: list,
      error: `This pass is already in use on ${list.length} devices (limit ${limit || 2}: one laptop and one phone).`,
    };
  }
  list.push({ id: deviceId, label: label || "Device", first_seen: now, last_seen: now });
  return { ok: true, devices: list };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error("Backend credentials not configured");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "verify");

    if (action === "list") {
      // Masked summary for the admin dashboard — never returns full codes.
      const { data } = await supabase
        .from("access_grants")
        .select("code, plan, amount, expires_at, redeem_count, created_at")
        .order("created_at", { ascending: false })
        .limit(25);
      return json({
        passes: (data || []).map((g: Record<string, unknown>) => ({
          code: String(g.code).slice(0, 3) + "•••" + String(g.code).slice(-3),
          plan: g.plan,
          amount: g.amount,
          expires_at: g.expires_at,
          redeem_count: g.redeem_count,
        })),
      });
    }

    if (action === "verify") {
      const code = String(body?.code || "").trim().toUpperCase();
      const deviceIdIn = String(body?.device_id || "").trim() || undefined;
      const deviceLabel = String(body?.device_label || "").trim() || undefined;
      if (!code) return json({ valid: false, error: "Code required" }, 400);

      const { data: grant } = await supabase
        .from("access_grants")
        .select("*")
        .eq("code", code)
        .maybeSingle();

      if (!grant) return json({ valid: false, error: "That code was not found." }, 200);
      if (new Date(grant.expires_at).getTime() < Date.now()) {
        return json({ valid: false, expired: true, error: "That pass has expired." }, 200);
      }

      const reg = registerDevice(grant.devices || [], grant.device_limit || 2, deviceIdIn, deviceLabel);
      if (!reg.ok) return json({ valid: false, error: reg.error }, 200);

      await supabase
        .from("access_grants")
        .update({
          redeem_count: (grant.redeem_count || 0) + 1,
          last_redeemed_at: new Date().toISOString(),
          devices: reg.devices,
        })
        .eq("id", grant.id);

      return json({
        valid: true,
        code: grant.code,
        plan: grant.plan,
        expires_at: grant.expires_at,
        allow_download: grant.allow_download !== false,
        devices: reg.devices.length,
        device_limit: grant.device_limit || 2,
      });
    }

    if (action === "rename") {
      const code = String(body?.code || "").trim().toUpperCase();
      const raw = String(body?.new_code || "").trim().toUpperCase();
      const deviceIdIn = String(body?.device_id || "").trim();
      const newCode = raw.replace(/[^A-Z0-9-]/g, "");
      if (!code || !newCode) return json({ success: false, error: "Both the current and new code are required." }, 400);
      if (newCode.length < 6 || newCode.length > 24) {
        return json({ success: false, error: "Choose a code between 6 and 24 characters (letters, numbers, dashes)." }, 200);
      }

      const { data: grant } = await supabase.from("access_grants").select("*").eq("code", code).maybeSingle();
      if (!grant) return json({ success: false, error: "That pass was not found." }, 200);
      if (new Date(grant.expires_at).getTime() < Date.now()) {
        return json({ success: false, error: "That pass has expired." }, 200);
      }
      const devices: DeviceEntry[] = Array.isArray(grant.devices) ? grant.devices : [];
      if (devices.length && deviceIdIn && !devices.some((d) => d.id === deviceIdIn)) {
        return json({ success: false, error: "Only a device already signed in with this pass can change the code." }, 200);
      }
      if (newCode !== code) {
        const { data: clash } = await supabase.from("access_grants").select("id").eq("code", newCode).maybeSingle();
        if (clash) return json({ success: false, error: "That code is already taken — pick another." }, 200);
      }

      const { data: updated, error: updateError } = await supabase
        .from("access_grants")
        .update({ code: newCode })
        .eq("id", grant.id)
        .select()
        .maybeSingle();
      if (updateError || !updated) return json({ success: false, error: "Could not change the code." }, 200);

      return json({
        success: true,
        code: updated.code,
        plan: updated.plan,
        expires_at: updated.expires_at,
        allow_download: updated.allow_download !== false,
      });
    }

    if (action === "issue") {
      const transactionId = String(body?.transaction_id || "").trim();
      const deviceIdIn = String(body?.device_id || "").trim() || undefined;
      const deviceLabelIn = String(body?.device_label || "").trim() || undefined;
      if (!transactionId) return json({ success: false, error: "transaction_id required" }, 400);

      const { data: payment } = await supabase
        .from("payments")
        .select("*")
        .eq("transaction_id", transactionId)
        .maybeSingle();

      if (!payment) return json({ success: false, error: "Payment not found" }, 404);
      if (payment.payment_status !== "completed") {
        return json({ success: false, error: "Payment not completed", status: payment.payment_status }, 200);
      }

      // Already issued for this payment? Return it (idempotent).
      const { data: existing } = await supabase
        .from("access_grants")
        .select("*")
        .eq("payment_id", payment.id)
        .maybeSingle();
      if (existing) {
        const reg = registerDevice(existing.devices || [], existing.device_limit || 2, deviceIdIn, deviceLabelIn);
        if (reg.ok) {
          await supabase.from("access_grants").update({ devices: reg.devices }).eq("id", existing.id);
        }
        return json({
          success: true,
          code: existing.code,
          plan: existing.plan,
          expires_at: existing.expires_at,
          allow_download: existing.allow_download !== false,
        });
      }

      // Resolve plan config from app_settings
      const { data: setting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "access_plans")
        .maybeSingle();

      let plans: Plan[] = [];
      try { plans = JSON.parse(setting?.value || "[]"); } catch { plans = []; }

      const requestedPlan = String(body?.plan || payment.package_type || "semester");
      const plan =
        plans.find((p) => p.id === requestedPlan) ??
        plans.find((p) => Number(p.price) === Number(payment.amount)) ??
        { id: "semester", label: "Semester pass (3 months)", price: Number(payment.amount || 0), days: 90, download: true };

      const expires = new Date(Date.now() + Math.max(1, Number(plan.days) || 1) * 86_400_000).toISOString();

      let code = newCode();
      let inserted = null;
      for (let attempt = 0; attempt < 4 && !inserted; attempt++) {
        const { data, error } = await supabase
          .from("access_grants")
          .insert({
            code,
            plan: plan.id,
            expires_at: expires,
            payment_id: payment.id,
            phone_number: payment.phone_number,
            amount: Number(payment.amount || 0),
            allow_download: plan.download !== false,
            devices: deviceIdIn
              ? [{ id: deviceIdIn, label: deviceLabelIn || "Device", first_seen: new Date().toISOString(), last_seen: new Date().toISOString() }]
              : [],
          })
          .select()
          .maybeSingle();
        if (data) { inserted = data; break; }
        if (error && !String(error.message).includes("duplicate")) throw error;
        code = newCode();
      }

      if (!inserted) return json({ success: false, error: "Could not issue a pass" }, 500);

      return json({
        success: true,
        code: inserted.code,
        plan: inserted.plan,
        expires_at: inserted.expires_at,
        allow_download: inserted.allow_download !== false,
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error: unknown) {
    console.error("access-code error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
