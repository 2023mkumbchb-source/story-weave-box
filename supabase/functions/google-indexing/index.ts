import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "https://ompathstud.lovable.app";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Action: list_batches - get all articles grouped in batches of 50
    if (action === "list_batches") {
      const yearFilter = body?.year || null;

      let query = sb
        .from("articles")
        .select("id, title, category, created_at, meta_title, meta_description, slug")
        .eq("published", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (yearFilter && /^Year [1-5]$/.test(yearFilter)) {
        query = query.like("category", `${yearFilter}:%`);
      }

      const { data: articles, error } = await query;
      if (error) throw error;

      const batchSize = 50;
      const batches: Array<{ batch_number: number; count: number; articles: any[] }> = [];

      for (let i = 0; i < (articles || []).length; i += batchSize) {
        const batch = articles!.slice(i, i + batchSize);
        batches.push({
          batch_number: Math.floor(i / batchSize) + 1,
          count: batch.length,
          articles: batch.map((a) => ({
            id: a.id,
            title: a.title,
            category: a.category,
            url: `${BASE_URL}/blog/${a.slug || a.id}`,
            has_meta: !!(a.meta_title && a.meta_description),
          })),
        });
      }

      return json({ total: (articles || []).length, batch_count: batches.length, batches });
    }

    // Action: generate_sitemap_urls - generate a flat list of URLs for a batch
    if (action === "generate_urls") {
      const batchNumber = body?.batch_number || 1;
      const yearFilter = body?.year || null;

      let query = sb
        .from("articles")
        .select("id, title, slug")
        .eq("published", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (yearFilter && /^Year [1-5]$/.test(yearFilter)) {
        query = query.like("category", `${yearFilter}:%`);
      }

      const { data: articles, error } = await query;
      if (error) throw error;

      const batchSize = 50;
      const start = (batchNumber - 1) * batchSize;
      const batch = (articles || []).slice(start, start + batchSize);

      const urls = batch.map((a) => {
        const slug = a.slug || a.title
          .toLowerCase()
          .replace(/&/g, " and ")
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");
        return `${BASE_URL}/blog/${slug || a.id}`;
      });

      return json({
        batch_number: batchNumber,
        count: urls.length,
        urls,
        urls_text: urls.join("\n"),
      });
    }

    // Action: submit_to_google - submit URLs to Google Indexing API
    if (action === "submit_to_google") {
      const googleApiKey = body?.google_api_key;
      const urls: string[] = body?.urls || [];

      if (!urls.length) throw new Error("No URLs provided");

      // If no API key, just return the URLs in a format ready for Google Search Console manual submission
      if (!googleApiKey) {
        return json({
          method: "manual",
          message: "No Google API key provided. Copy these URLs and paste them into Google Search Console > URL Inspection > Submit to Google.",
          urls,
          urls_text: urls.join("\n"),
        });
      }

      // Use Google Indexing API with service account
      const results: Array<{ url: string; status: string; error?: string }> = [];

      for (const url of urls) {
        try {
          const response = await fetch(
            `https://indexing.googleapis.com/v3/urlNotifications:publish?key=${googleApiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url,
                type: "URL_UPDATED",
              }),
            }
          );

          if (response.ok) {
            results.push({ url, status: "submitted" });
          } else {
            const errData = await response.text();
            results.push({ url, status: "failed", error: errData.slice(0, 200) });
          }
        } catch (e: any) {
          results.push({ url, status: "failed", error: e.message });
        }
      }

      const submitted = results.filter((r) => r.status === "submitted").length;
      const failed = results.filter((r) => r.status === "failed").length;

      return json({
        method: "api",
        submitted,
        failed,
        total: urls.length,
        results,
      });
    }

    throw new Error("Unknown action");
  } catch (e: any) {
    return json({ error: e?.message || "Unknown error" }, 500);
  }
});
