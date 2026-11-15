import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateAndReviewTopic, persistVerifiedArticle } from "../_shared/verified-topic.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(url, serviceKey);
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return Response.json({ error: "Authentication required" }, { status: 401, headers: cors });
    const { data: auth, error: authError } = await db.auth.getUser(token);
    if (authError || !auth.user) return Response.json({ error: "Invalid session" }, { status: 401, headers: cors });
    const { data: role } = await db.from("user_roles").select("role").eq("user_id", auth.user.id).eq("role", "admin").maybeSingle();
    if (!role) return Response.json({ error: "Admin access required" }, { status: 403, headers: cors });
    const body = await req.json();
    const action = String(body.action || "queue");

    if (action === "queue") {
      const { data: articles, error } = await db.from("articles").select("id,title,slug,category,published,requires_review,ai_check_status,ai_checked_at,review_loop_count,created_at")
        .eq("requires_review", true).is("deleted_at", null).order("created_at", { ascending: true }).limit(100);
      if (error) throw error;
      const ids = (articles || []).map((a: any) => a.id);
      const { data: findings, error: findingError } = ids.length
        ? await db.from("audit_findings").select("*").in("article_id", ids).eq("status", "open").order("created_at", { ascending: false })
        : { data: [], error: null };
      if (findingError) throw findingError;
      return Response.json({ articles: articles || [], findings: findings || [] }, { headers: cors });
    }

    const articleId = String(body.article_id || "");
    if (!articleId) return Response.json({ error: "article_id is required" }, { status: 400, headers: cors });

    if (action === "mark-reviewed") {
      const reviewerName = String(auth.user.user_metadata?.full_name || auth.user.user_metadata?.name || auth.user.email || "OmpathStudy reviewer");
      const now = new Date().toISOString();
      const { error } = await db.from("articles").update({
        reviewed_by: auth.user.id, reviewed_at: now, reviewer_name: reviewerName,
        ai_check_status: "human_reviewed", requires_review: false,
      }).eq("id", articleId);
      if (error) throw error;
      return Response.json({ ok: true, reviewer_name: reviewerName, reviewed_at: now }, { headers: cors });
    }

    if (action === "rewrite") {
      const { data: article, error } = await db.from("articles").select("title,content,original_notes,category").eq("id", articleId).single();
      if (error) throw error;
      const result = await generateAndReviewTopic(article.title, article.original_notes || article.content || "", 2);
      const saved = await persistVerifiedArticle({ page: result.page, result, articleId, category: article.category });
      return Response.json({ ...saved, title: result.page.title, content: (await import("../_shared/verified-topic.ts")).renderTopicMarkdown(result.page) }, { headers: cors });
    }

    if (action === "apply-fix" || action === "dismiss") {
      const findingId = String(body.finding_id || "");
      if (!findingId) return Response.json({ error: "finding_id is required" }, { status: 400, headers: cors });
      const { data: finding, error: findingError } = await db.from("audit_findings").select("*").eq("id", findingId).eq("article_id", articleId).single();
      if (findingError) throw findingError;
      if (action === "dismiss") {
        const { error } = await db.from("audit_findings").update({ status: "dismissed" }).eq("id", findingId);
        if (error) throw error;
        return Response.json({ ok: true }, { headers: cors });
      }
      const { data: article, error: articleError } = await db.from("articles").select("content").eq("id", articleId).single();
      if (articleError) throw articleError;
      const oldContent = article.content || "";
      const suggested = String(finding.suggested_fix || "").trim();
      if (!suggested) return Response.json({ error: "This finding has no suggested fix. Rewrite the page instead." }, { status: 422, headers: cors });
      const revised = oldContent.includes(finding.claim) ? oldContent.replace(finding.claim, suggested) : `${oldContent}\n\n> Admin review fix (${finding.section}): ${suggested}`;
      const { error: revisionError } = await db.from("article_revisions").insert({ article_id: articleId, old_content: oldContent, new_content: revised, reason: `Applied audit finding ${findingId}`, source: "admin" });
      if (revisionError) throw revisionError;
      const { error: updateError } = await db.from("articles").update({ content: revised, published: false, requires_review: true, ai_check_status: "needs_review" }).eq("id", articleId);
      if (updateError) throw updateError;
      const { error: findingUpdateError } = await db.from("audit_findings").update({ status: "applied" }).eq("id", findingId);
      if (findingUpdateError) throw findingUpdateError;
      return Response.json({ ok: true, requires_review: true }, { headers: cors });
    }

    return Response.json({ error: "Unknown action" }, { status: 400, headers: cors });
  } catch (error) {
    console.error("admin-review-queue error", error);
    return Response.json({ error: error instanceof Error ? error.message : "Review action failed" }, { status: 500, headers: cors });
  }
});
