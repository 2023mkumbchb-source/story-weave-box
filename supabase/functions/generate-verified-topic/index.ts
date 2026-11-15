import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { generateAndReviewTopic, persistVerifiedArticle } from "../_shared/verified-topic.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const admin = createClient(url, serviceKey);
    if (!auth?.startsWith("Bearer ")) return Response.json({ error: "Authentication required" }, { status: 401, headers: cors });
    const { data: userData, error: userError } = await admin.auth.getUser(auth.slice(7));
    if (userError || !userData.user) return Response.json({ error: "Invalid session" }, { status: 401, headers: cors });
    const { data: role } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!role) return Response.json({ error: "Admin access required" }, { status: 403, headers: cors });

    const body = await req.json();
    const topic = String(body.topic || body.title || "").trim();
    if (!topic) return Response.json({ error: "topic is required" }, { status: 400, headers: cors });
    const result = await generateAndReviewTopic(topic, String(body.context || ""), 2);
    const saved = await persistVerifiedArticle({
      page: result.page, result, articleId: body.article_id || null, category: body.category, originalNotes: String(body.context || ""),
    });
    return Response.json({ ...saved, title: result.page.title, content: (await import("../_shared/verified-topic.ts")).renderTopicMarkdown(result.page), review: result.review, loop_count: result.loopCount }, { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("generate-verified-topic failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Generation failed" }, { status: 500, headers: cors });
  }
});
