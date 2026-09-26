import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLIENT_SECRET = Deno.env.get("GOOGLE_DRIVE_CLIENT_SECRET")!;
const REDIRECT_URI = "https://dekyjrfwvavtoivqivno.supabase.co/functions/v1/google-drive-oauth";
const APP_ORIGIN = "https://ompathstudy.com";
const BUCKET = "study-resources";
const MAX_BUFFER_BYTES = 45 * 1024 * 1024;

const corsHeaders = {
  "Access-Control-Allow-Origin": APP_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "content-type": "application/json" } });
}
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
async function decrypt(value: string) {
  const [ivText, cipherText] = value.split(".");
  const key = await cryptoKey();
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(ivText) }, key, unb64(cipherText));
  return new TextDecoder().decode(plain);
}
async function encrypt(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await cryptoKey();
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(value)));
  return `${b64(iv)}.${b64(encrypted)}`;
}

async function requireAdmin(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("Authentication required");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("Invalid session");
  const { data: role } = await admin.from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
  if (!role) throw new Error("Admin access required");
  return data.user;
}

async function getConnection(userId: string) {
  const { data, error } = await admin.from("google_drive_connections").select("*").eq("user_id", userId).maybeSingle();
  if (error || !data?.refresh_token_enc) throw new Error("Google Drive is not connected.");
  return data;
}

async function refreshAccessToken(connection: any) {
  const expires = connection.access_token_expires_at ? new Date(connection.access_token_expires_at).getTime() : 0;
  if (connection.access_token_enc && expires > Date.now() + 120000) return { token: await decrypt(connection.access_token_enc), connection };

  const refreshToken = await decrypt(connection.refresh_token_enc);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_DRIVE_CLIENT_ID")!,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const tokens = await response.json();
  if (!response.ok || !tokens.access_token) throw new Error("Google access token refresh failed. Reconnect Google Drive.");

  const expiresAt = new Date(Date.now() + Number(tokens.expires_in ?? 3600) * 1000).toISOString();
  const accessEnc = await encrypt(tokens.access_token);
  const { error } = await admin.from("google_drive_connections").update({
    access_token_enc: accessEnc,
    access_token_expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }).eq("user_id", connection.user_id);
  if (error) throw error;
  return { token: tokens.access_token, connection: { ...connection, access_token_enc: accessEnc, access_token_expires_at: expiresAt } };
}

async function driveFetch(url: string, token: string, init: RequestInit = {}) {
  const response = await fetch(url, { ...init, headers: { ...(init.headers || {}), authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Drive API ${response.status}: ${body.slice(0, 500)}`);
  }
  return response;
}

function safeSegment(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim().slice(0, 180) || "untitled";
}
function extensionForMime(mime: string) {
  const map: Record<string,string> = {
    "application/vnd.google-apps.document": ".pdf",
    "application/vnd.google-apps.spreadsheet": ".xlsx",
    "application/vnd.google-apps.presentation": ".pdf",
    "application/vnd.google-apps.drawing": ".pdf",
  };
  return map[mime] || "";
}
function contentTypeForMime(mime: string, name: string) {
  if (mime.startsWith("application/vnd.google-apps.")) {
    return mime.includes("spreadsheet") ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf";
  }
  if (mime) return mime;
  const ext = name.toLowerCase().split(".").pop();
  const map: Record<string,string> = { pdf:"application/pdf", doc:"application/msword", docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document", pptx:"application/vnd.openxmlformats-officedocument.presentationml.presentation", xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", txt:"text/plain" };
  return map[ext || ""] || "application/octet-stream";
}
function inferCategory(path: string) {
  const p = path.toLowerCase();
  if (/(past paper|past papers|previous exam)/.test(p)) return "Past Papers";
  if (/(mcq|question bank|questions)/.test(p)) return "MCQs";
  if (/(cat|continuous assessment|assessment)/.test(p)) return "CATs";
  if (/(clinical|case|cases)/.test(p)) return "Clinical Cases";
  if (/(spotter|practical|ospe|osce)/.test(p)) return "Practical / Spotter";
  if (/(lecture|slides|powerpoint|ppt)/.test(p)) return "Lecture Materials";
  if (/(revision|review|summary)/.test(p)) return "Revision Materials";
  if (/(note|notes)/.test(p)) return "Notes";
  return "Other Resources";
}

async function startJob(userId: string, folderId: string) {
  const { data: active } = await admin.from("google_drive_import_jobs").select("id,status").eq("user_id", userId).eq("root_folder_id", folderId).in("status", ["queued","running"]).maybeSingle();
  if (active) return active;

  const { data: job, error } = await admin.from("google_drive_import_jobs").insert({ user_id: userId, root_folder_id: folderId, status: "queued" }).select().single();
  if (error) throw error;

  await admin.from("google_drive_import_items").insert({
    job_id: job.id, user_id: userId, google_file_id: folderId, name: "Year 1 source folder",
    mime_type: "application/vnd.google-apps.folder", relative_path: "", status: "pending",
  });
  return job;
}

async function processJob(userId: string, jobId: string) {
  const { data: job, error: jobError } = await admin.from("google_drive_import_jobs").select("*").eq("id", jobId).eq("user_id", userId).maybeSingle();
  if (jobError || !job) throw new Error("Import job not found.");

  await admin.from("google_drive_import_jobs").update({ status: "running", updated_at: new Date().toISOString() }).eq("id", jobId);

  const { data: item } = await admin.from("google_drive_import_items").select("*").eq("job_id", jobId).eq("status", "pending").order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (!item) {
    await admin.from("google_drive_import_jobs").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", jobId);
    return { done: true };
  }

  await admin.from("google_drive_import_items").update({ status: "processing", updated_at: new Date().toISOString() }).eq("id", item.id);

  try {
    const connection = await getConnection(userId);
    const { token } = await refreshAccessToken(connection);

    if (item.mime_type === "application/vnd.google-apps.folder") {
      let pageToken: string | undefined;
      let discovered = 0;
      let bytes = 0;
      do {
        const params = new URLSearchParams({
          q: `'${item.google_file_id}' in parents and trashed = false`,
          pageSize: "1000",
          fields: "nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink,parents,md5Checksum)",
          orderBy: "name",
          includeItemsFromAllDrives: "true",
          supportsAllDrives: "true",
        });
        if (pageToken) params.set("pageToken", pageToken);
        const response = await driveFetch(`https://www.googleapis.com/drive/v3/files?${params}`, token);
        const payload = await response.json();
        const children = payload.files || [];
        for (const child of children) {
          if (child.mimeType === "application/vnd.google-apps.shortcut") continue;
          const childPath = item.relative_path ? `${item.relative_path}/${child.name}` : child.name;
          const size = Number(child.size || 0);
          const { error } = await admin.from("google_drive_import_items").upsert({
            job_id: jobId, user_id: userId, google_file_id: child.id, parent_google_file_id: item.google_file_id,
            name: child.name, mime_type: child.mimeType, size_bytes: size, modified_time: child.modifiedTime ?? null,
            relative_path: childPath, web_url: child.webViewLink ?? null, status: "pending", updated_at: new Date().toISOString(),
          }, { onConflict: "job_id,google_file_id", ignoreDuplicates: true });
          if (!error && child.mimeType !== "application/vnd.google-apps.folder") { discovered++; bytes += size; }
        }
        pageToken = payload.nextPageToken;
      } while (pageToken);

      await admin.from("google_drive_import_items").update({ status: "imported", updated_at: new Date().toISOString() }).eq("id", item.id);
      const { count } = await admin.from("google_drive_import_items").select("id", { count: "exact", head: true }).eq("job_id", jobId).eq("status", "pending");
      await admin.from("google_drive_import_jobs").update({
        total_items: Math.max(Number(job.total_items || 0) + discovered, Number(count || 0) + Number(job.completed_items || 0)),
        discovered_bytes: Number(job.discovered_bytes || 0) + bytes,
        updated_at: new Date().toISOString(),
      }).eq("id", jobId);
      return { done: false, kind: "folder", discovered };
    }

    const fileSize = Number(item.size_bytes || 0);
    if (fileSize > MAX_BUFFER_BYTES) throw new Error(`File is ${Math.round(fileSize / 1024 / 1024)} MB; this importer buffers files in an Edge Function and skips files over 45 MB.`);

    let response: Response;
    let outputName = item.name;
    if (item.mime_type.startsWith("application/vnd.google-apps.")) {
      const exportMime = item.mime_type.includes("spreadsheet")
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/pdf";
      const params = new URLSearchParams({ mimeType: exportMime });
      response = await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(item.google_file_id)}/export?${params}`, token);
      outputName = `${item.name}${extensionForMime(item.mime_type)}`;
    } else {
      response = await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(item.google_file_id)}?alt=media&supportsAllDrives=true`, token);
    }

    const body = new Uint8Array(await response.arrayBuffer());
    if (body.byteLength > MAX_BUFFER_BYTES) throw new Error(`Downloaded file is ${Math.round(body.byteLength / 1024 / 1024)} MB; over the 45 MB safety limit.`);

    const relative = (item.relative_path || outputName).split("/").slice(0, -1).map(safeSegment).join("/");
    const filename = safeSegment(outputName);
    const storagePath = ["year-1", relative, filename].filter(Boolean).join("/");
    const contentType = contentTypeForMime(item.mime_type, outputName);

    const { error: uploadError } = await admin.storage.from(BUCKET).upload(storagePath, body, { contentType, cacheControl: "31536000", upsert: true });
    if (uploadError) throw uploadError;

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath.split("/").map(encodeURIComponent).join("/")}`;
    const baseTitle = outputName.replace(/\.[^.]+$/, "").trim();
    const category = inferCategory(item.relative_path || outputName);

    const { data: resource, error: resourceError } = await admin.from("study_resources").upsert({
      year: 1, title: baseTitle || "Untitled resource", category, file_name: outputName,
      file_path: storagePath, file_type: contentType, file_size: body.byteLength, storage_url: publicUrl,
      google_drive_file_id: item.google_file_id, source_modified_at: item.modified_time, download_enabled: true,
      published: true, updated_at: new Date().toISOString(),
    }, { onConflict: "file_path" }).select("id").single();
    if (resourceError) throw resourceError;

    await admin.from("google_drive_import_items").update({
      status: "imported", storage_path: storagePath, public_url: publicUrl, updated_at: new Date().toISOString(), error: null,
    }).eq("id", item.id);

    const { data: latest } = await admin.from("google_drive_import_jobs").select("completed_items,imported_bytes").eq("id", jobId).single();
    await admin.from("google_drive_import_jobs").update({
      completed_items: Number(latest?.completed_items || 0) + 1,
      imported_bytes: Number(latest?.imported_bytes || 0) + body.byteLength,
      updated_at: new Date().toISOString(),
    }).eq("id", jobId);

    return { done: false, kind: "file", resource_id: resource.id, name: outputName, bytes: body.byteLength };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await admin.from("google_drive_import_items").update({ status: "failed", error: message, updated_at: new Date().toISOString() }).eq("id", item.id);
    const { data: latest } = await admin.from("google_drive_import_jobs").select("failed_items").eq("id", jobId).single();
    await admin.from("google_drive_import_jobs").update({
      failed_items: Number(latest?.failed_items || 0) + 1, last_error: message, updated_at: new Date().toISOString(),
    }).eq("id", jobId);
    return { done: false, kind: "error", error: message, item: item.name };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);

  try {
    const user = await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action || "status";

    if (action === "start") {
      const folderId = String(body.folder_id || "").trim();
      if (!folderId) throw new Error("folder_id is required");
      const job = await startJob(user.id, folderId);
      return json({ job });
    }

    if (action === "status") {
      const jobId = String(body.job_id || "").trim();
      if (jobId) {
        const { data: job } = await admin.from("google_drive_import_jobs").select("*").eq("id", jobId).eq("user_id", user.id).maybeSingle();
        const { count: pending } = await admin.from("google_drive_import_items").select("id", { count: "exact", head: true }).eq("job_id", jobId).eq("status", "pending");
        return json({ job, pending: pending || 0 });
      }
      const { data: jobs } = await admin.from("google_drive_import_jobs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
      return json({ jobs: jobs || [] });
    }

    if (action === "process") {
      const jobId = String(body.job_id || "").trim();
      if (!jobId) throw new Error("job_id is required");
      const result = await processJob(user.id, jobId);
      return json(result);
    }

    throw new Error("Unknown action");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, /Authentication|required|Admin access/.test(message) ? 401 : 400);
  }
});