import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_BASE_URL = "https://ompath.azaniispproject.co.ke";

function slugify(value: string): string {
  return (value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeBaseUrl(url: string | null | undefined): string {
  const trimmed = String(url || "").trim();
  if (!trimmed) return DEFAULT_BASE_URL;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error("Missing config");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: siteUrlSetting } = await supabase.from("app_settings").select("value").eq("key", "site_url").maybeSingle();
    const baseUrl = normalizeBaseUrl(siteUrlSetting?.value);

    const [{ data: articles }, { data: mcqs }, { data: flashcards }, { data: essays }, { data: stories }] = await Promise.all([
      supabase.from("articles").select("id, title, slug, created_at, updated_at, category").eq("published", true).is("deleted_at", null),
      supabase.from("mcq_sets").select("id, title, slug, created_at, updated_at, category").eq("published", true).is("deleted_at", null),
      supabase.from("flashcard_sets").select("id, title, slug, created_at, updated_at, category").eq("published", true).is("deleted_at", null),
      supabase.from("essays").select("id, title, slug, created_at, updated_at, category").eq("published", true).is("deleted_at", null),
      supabase.from("stories").select("id, title, slug, created_at, updated_at, category").eq("published", true).is("deleted_at", null),
    ]);

    const years = new Set<number>();
    [...(articles || []), ...(mcqs || []), ...(flashcards || []), ...(essays || [])].forEach((item) => {
      const m = (item.category || "").match(/^Year (\d)/);
      if (m) years.add(parseInt(m[1]));
    });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}/</loc><priority>1.0</priority><changefreq>daily</changefreq></url>
  <url><loc>${baseUrl}/blog</loc><priority>0.9</priority><changefreq>daily</changefreq></url>
  <url><loc>${baseUrl}/stories</loc><priority>0.8</priority><changefreq>daily</changefreq></url>
  <url><loc>${baseUrl}/flashcards</loc><priority>0.8</priority><changefreq>daily</changefreq></url>
  <url><loc>${baseUrl}/mcqs</loc><priority>0.8</priority><changefreq>daily</changefreq></url>
  <url><loc>${baseUrl}/exams</loc><priority>0.8</priority><changefreq>weekly</changefreq></url>
  <url><loc>${baseUrl}/essays</loc><priority>0.8</priority><changefreq>daily</changefreq></url>
`;

    for (const y of Array.from(years).sort()) {
      xml += `  <url><loc>${baseUrl}/year/${y}</loc><priority>0.8</priority><changefreq>weekly</changefreq></url>\n`;
    }

    // Articles — use {id}-{slug} format
    for (const a of articles || []) {
      const articleSlug = a.slug || slugify(a.title) || "article";
      const lastmod = (a.updated_at || a.created_at) ? new Date(a.updated_at || a.created_at).toISOString().split("T")[0] : "";
      xml += `  <url><loc>${baseUrl}/blog/${a.id}-${articleSlug}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<priority>0.7</priority><changefreq>weekly</changefreq></url>\n`;
    }

    // Stories — use {id}-{slug} format
    for (const s of stories || []) {
      const storySlug = s.slug || slugify(s.title) || "story";
      const lastmod = (s.updated_at || s.created_at) ? new Date(s.updated_at || s.created_at).toISOString().split("T")[0] : "";
      xml += `  <url><loc>${baseUrl}/stories/${s.id}-${storySlug}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<priority>0.7</priority><changefreq>weekly</changefreq></url>\n`;
    }

    // MCQs — use slug if available, fallback to slugified title
    for (const m of mcqs || []) {
      const mcqSlug = m.slug || slugify(m.title) || m.id;
      const lastmod = (m.updated_at || m.created_at) ? new Date(m.updated_at || m.created_at).toISOString().split("T")[0] : "";
      xml += `  <url><loc>${baseUrl}/mcqs/${mcqSlug}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<priority>0.6</priority><changefreq>weekly</changefreq></url>\n`;
    }

    // Flashcards — use slug if available, fallback to slugified title
    for (const f of flashcards || []) {
      const flashcardSlug = f.slug || slugify(f.title) || f.id;
      const lastmod = (f.updated_at || f.created_at) ? new Date(f.updated_at || f.created_at).toISOString().split("T")[0] : "";
      xml += `  <url><loc>${baseUrl}/flashcards/${flashcardSlug}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<priority>0.6</priority><changefreq>weekly</changefreq></url>\n`;
    }

    // Essays — use slug (we just added these to the DB)
    for (const e of essays || []) {
      const essaySlug = e.slug || slugify(e.title) || e.id;
      const lastmod = (e.updated_at || e.created_at) ? new Date(e.updated_at || e.created_at).toISOString().split("T")[0] : "";
      xml += `  <url><loc>${baseUrl}/essays/${essaySlug}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<priority>0.6</priority><changefreq>weekly</changefreq></url>\n`;
    }

    xml += `</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: { "Content-Type": "application/xml", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Sitemap error:", error);
    return new Response("Error generating sitemap", { status: 500, headers: corsHeaders });
  }
});
