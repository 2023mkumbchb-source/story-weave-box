import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const baseUrl = "https://medicine.kenyaadverts.co.ke";

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error("Missing config");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const [{ data: articles }, { data: mcqs }, { data: flashcards }, { data: essays }, { data: stories }] = await Promise.all([
      supabase.from("articles").select("id, title, slug, created_at").eq("published", true).is("deleted_at", null),
      supabase.from("mcq_sets").select("id, created_at").eq("published", true).is("deleted_at", null),
      supabase.from("flashcard_sets").select("id, created_at").eq("published", true).is("deleted_at", null),
      supabase.from("essays").select("id, created_at").eq("published", true).is("deleted_at", null),
      supabase.from("stories").select("id, title, created_at").eq("published", true).is("deleted_at", null),
    ]);

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

    for (const a of articles || []) {
      const articleSlug = a.slug || slugify(a.title) || a.id;
      xml += `  <url><loc>${baseUrl}/blog/${articleSlug}</loc><lastmod>${new Date(a.created_at).toISOString().split("T")[0]}</lastmod><priority>0.7</priority></url>\n`;
    }
    for (const s of stories || []) {
      const storySlug = slugify(s.title) || "story";
      xml += `  <url><loc>${baseUrl}/stories/${s.id}-${storySlug}</loc><lastmod>${new Date(s.created_at).toISOString().split("T")[0]}</lastmod><priority>0.7</priority></url>\n`;
    }
    for (const m of mcqs || []) {
      xml += `  <url><loc>${baseUrl}/mcqs/${m.id}</loc><lastmod>${new Date(m.created_at).toISOString().split("T")[0]}</lastmod><priority>0.7</priority></url>\n`;
    }
    for (const f of flashcards || []) {
      xml += `  <url><loc>${baseUrl}/flashcards/${f.id}</loc><lastmod>${new Date(f.created_at).toISOString().split("T")[0]}</lastmod><priority>0.7</priority></url>\n`;
    }
    for (const e of essays || []) {
      xml += `  <url><loc>${baseUrl}/essays/${e.id}</loc><lastmod>${new Date(e.created_at).toISOString().split("T")[0]}</lastmod><priority>0.7</priority></url>\n`;
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
