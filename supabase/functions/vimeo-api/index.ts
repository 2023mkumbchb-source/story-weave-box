import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishable = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (!supabaseUrl || !publishable) return null;
  const keys = JSON.parse(publishable);
  const caller = createClient(supabaseUrl, keys.default, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await caller.auth.getUser();
  if (!user) return null;
  const { data: isAdmin } = await caller.rpc("has_role", { _user_id: user.id, _role: "admin" });
  return isAdmin ? user : null;
}

async function vimeo(path: string, init: RequestInit = {}) {
  const token = Deno.env.get("VIMEO_ACCESS_TOKEN");
  if (!token) throw new Error("Vimeo is not connected. Add VIMEO_ACCESS_TOKEN to Supabase Edge Function secrets.");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/vnd.vimeo.*+json;version=3.4");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`https://api.vimeo.com${path}`, { ...init, headers });
  const text = await response.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const message = typeof body === "object" && body && "error" in body
      ? String((body as any).error)
      : `Vimeo API returned ${response.status}`;
    throw new Error(message);
  }
  return body;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await requireAdmin(req);
    if (!user) return json({ error: "Administrator access required" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "status");

    if (action === "status") {
      const me = await vimeo("/me");
      return json({
        connected: true,
        account: {
          id: me?.uri?.split("/").pop() || null,
          name: me?.name || null,
          email: me?.email || null,
          link: me?.link || null,
        },
      });
    }

    if (action === "list") {
      const page = Math.max(1, Number(body?.page || 1));
      const perPage = Math.min(100, Math.max(1, Number(body?.per_page || 25)));
      return json(await vimeo(`/me/videos?page=${page}&per_page=${perPage}&sort=date`));
    }

    if (action === "video") {
      const id = String(body?.video_id || "").replace(/^\/videos\//, "");
      if (!/^\d+$/.test(id)) return json({ error: "Valid Vimeo video_id is required" }, 400);
      return json(await vimeo(`/videos/${id}`));
    }

    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Vimeo request failed" }, 500);
  }
});
