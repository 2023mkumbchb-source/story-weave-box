import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return Response.json({ error: "Sign in to submit a report" }, { status: 401, headers: cors });
    const { data: auth, error: authError } = await db.auth.getUser(token);
    if (authError || !auth.user) return Response.json({ error: "Invalid session" }, { status: 401, headers: cors });
    const body = await req.json();
    const articleId = String(body.article_id || "");
    const message = String(body.message || "").trim().slice(0, 4000);
    if (!articleId || message.length < 10) return Response.json({ error: "Select an article and provide at least 10 characters describing the issue" }, { status: 400, headers: cors });
    const { data: article, error: articleError } = await db.from("articles").select("id").eq("id", articleId).eq("published", true).single();
    if (articleError || !article) return Response.json({ error: "Article not found" }, { status: 404, headers: cors });
    const { error } = await db.from("audit_findings").insert({
      article_id: articleId, section: String(body.section || "student_report"),
      claim: String(body.claim || "Student-reported possible error"),
      verdict: "unverifiable", severity: "medium", reference: "Student report",
      suggested_fix: "", status: "open", submitted_by: auth.user.id, student_message: message,
    });
    if (error) throw error;
    const { error: updateError } = await db.from("articles").update({ requires_review: true, ai_check_status: "needs_review" }).eq("id", articleId);
    if (updateError) throw updateError;
    return Response.json({ ok: true }, { headers: cors });
  } catch (error) {
    console.error("student-content-report error", error);
    return Response.json({ error: error instanceof Error ? error.message : "Could not submit report" }, { status: 500, headers: cors });
  }
});
