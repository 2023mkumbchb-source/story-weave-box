import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLIENT_ID = Deno.env.get("GOOGLE_DRIVE_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("GOOGLE_DRIVE_CLIENT_SECRET")!;
const REDIRECT_URI = "https://dekyjrfwvavtoivqivno.supabase.co/functions/v1/google-drive-oauth";
const APP_ORIGIN = "https://ompathstudy.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": APP_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
};

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function b64(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function unb64(s: string) {
  const bin = atob(s);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}
async function cryptoKey() {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(CLIENT_SECRET));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function encrypt(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await cryptoKey();
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(value)));
  return `${b64(iv)}.${b64(encrypted)}`;
}

function html(message: string, ok = true) {
  const safe = message.replace(/[<>&"]/g, c => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;", '"':"&quot;" }[c]!));
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><title>OmpathStudy Drive</title></head><body style="font-family:system-ui;padding:40px"><h2>${ok ? "Google Drive connected" : "Connection failed"}</h2><p>${safe}</p><script>if(window.opener){window.opener.postMessage({source:"ompathstudy-google-drive",ok:${ok}}, "https://ompathstudy.com");}</script></body></html>`, { status: ok ? 200 : 400, headers: { "content-type": "text/html; charset=utf-8" }});
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);

  if (req.method === "GET") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    if (error) return html(`Google authorization was cancelled: ${error}`, false);
    if (!code || !state) return html("Missing OAuth code or state.", false);

    const { data: stateRow, error: stateError } = await admin
      .from("google_drive_oauth_states")
      .select("state,user_id,expires_at")
      .eq("state", state)
      .maybeSingle();

    if (stateError || !stateRow) return html("This authorization session is invalid or has already been used.", false);
    if (new Date(stateRow.expires_at).getTime() < Date.now()) {
      await admin.from("google_drive_oauth_states").delete().eq("state", state);
      return html("This authorization session expired. Please start again.", false);
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok || !tokens.access_token) {
      await admin.from("google_drive_oauth_states").delete().eq("state", state);
      return html("Google token exchange failed. Check the OAuth client and redirect URI.", false);
    }

    const infoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { authorization: `Bearer ${tokens.access_token}` },
    });
    const info = infoResponse.ok ? await infoResponse.json() : {};

    const { data: existing } = await admin
      .from("google_drive_connections")
      .select("refresh_token_enc")
      .eq("user_id", stateRow.user_id)
      .maybeSingle();

    const refreshTokenEnc = tokens.refresh_token
      ? await encrypt(tokens.refresh_token)
      : existing?.refresh_token_enc ?? null;

    if (!refreshTokenEnc) {
      await admin.from("google_drive_oauth_states").delete().eq("state", state);
      return html("Google did not return a refresh token. Please reconnect and approve offline access.", false);
    }

    const accessTokenEnc = await encrypt(tokens.access_token);
    const expiresAt = new Date(Date.now() + Number(tokens.expires_in ?? 3600) * 1000).toISOString();

    const { error: upsertError } = await admin.from("google_drive_connections").upsert({
      user_id: stateRow.user_id,
      google_email: info.email ?? null,
      refresh_token_enc: refreshTokenEnc,
      access_token_enc: accessTokenEnc,
      access_token_expires_at: expiresAt,
      scope: tokens.scope ?? "https://www.googleapis.com/auth/drive.readonly",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    await admin.from("google_drive_oauth_states").delete().eq("state", state);

    if (upsertError) return html("Google connected, but saving the connection failed.", false);
    return html(`Connected to Google Drive${info.email ? ` as ${info.email}` : ""}. You can close this window.`);
  }

  if (req.method === "POST") {
    const auth = req.headers.get("authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (!token) return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });

    const state = crypto.randomUUID();
    const { error: stateInsertError } = await admin.from("google_drive_oauth_states").insert({
      state,
      user_id: userData.user.id,
      redirect_to: APP_ORIGIN,
    });
    if (stateInsertError) return new Response(JSON.stringify({ error: "Could not start Google authorization" }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email https://www.googleapis.com/auth/drive.readonly");
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);

    return new Response(JSON.stringify({ auth_url: authUrl.toString() }), { headers: { ...corsHeaders, "content-type": "application/json" } });
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});