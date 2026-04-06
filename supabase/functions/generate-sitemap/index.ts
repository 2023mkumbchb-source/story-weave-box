import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_BASE_URL = "https://www.ompathstudy.com";

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

function escapeXml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function extractFirstImage(content: string | null): string | null {
  if (!content) return null;
  const md = content.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/i);
  if (md) return md[1];
  const html = content.match(/<img[^>]+src=["'](https?:\/\/[^\s"']+)["'][^>]*>/i);
  return html ? html[1] : null;
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
    const baseUrl = normalizeBaseUrl((siteUrlSetting as any)?.value);

    const [{ data: articles }, { data: mcqs }, { data: flashcards }, { data: stories }, { data: exams }] = await Promise.all([
      supabase.from("articles").select("id, title, slug, content, created_at, updated_at, category, og_image_url").eq("published", true).is("deleted_at", null),
      supabase.from("mcq_sets").select("id, title, slug, created_at, updated_at, category").eq("published", true).is("deleted_at", null),
      supabase.from("flashcard_sets").select("id, title, slug, created_at, updated_at, category").eq("published", true).is("deleted_at", null),
      supabase.from("stories").select("id, title, slug, created_at, category, cover_image_url, content").eq("published", true).is("deleted_at", null),
      supabase.from("mcq_sets").select("id, title, created_at, updated_at, category").eq("published", true).is("deleted_at", null).ilike("title", "%exam%"),
    ]);

    const years = new Set<number>();
    [...(articles || []), ...(mcqs || []), ...(flashcards || [])].forEach((item: any) => {
      const m = (item.category || "").match(/^Year (\d)/);
      if (m) years.add(parseInt(m[1]));
    });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url><loc>${baseUrl}/</loc><priority>1.0</priority><changefreq>daily</changefreq></url>
  <url><loc>${baseUrl}/blog</loc><priority>0.9</priority><changefreq>daily</changefreq></url>
  <url><loc>${baseUrl}/stories</loc><priority>0.8</priority><changefreq>daily</changefreq></url>
  <url><loc>${baseUrl}/flashcards</loc><priority>0.8</priority><changefreq>daily</changefreq></url>
  <url><loc>${baseUrl}/mcqs</loc><priority>0.8</priority><changefreq>daily</changefreq></url>
  <url><loc>${baseUrl}/exams</loc><priority>0.8</priority><changefreq>weekly</changefreq></url>
`;

    for (const y of Array.from(years).sort()) {
      xml += `  <url><loc>${baseUrl}/year/${y}</loc><priority>0.8</priority><changefreq>weekly</changefreq></url>\n`;
    }

    // Articles
    for (const a of (articles || []) as any[]) {
      const articleSlug = a.slug || slugify(a.title) || "article";
      const lastmod = (a.updated_at || a.created_at) ? new Date(a.updated_at || a.created_at).toISOString().split("T")[0] : "";
      const imageUrl = a.og_image_url || extractFirstImage(a.content);
      xml += `  <url>\n    <loc>${baseUrl}/blog/${articleSlug}</loc>\n`;
      if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <priority>0.7</priority>\n    <changefreq>weekly</changefreq>\n`;
      if (imageUrl) {
        xml += `    <image:image>\n      <image:loc>${escapeXml(imageUrl)}</image:loc>\n      <image:title>${escapeXml(a.title)}</image:title>\n    </image:image>\n`;
      }
      xml += `  </url>\n`;
    }

    // Stories
    for (const s of (stories || []) as any[]) {
      const storySlug = s.slug || slugify(s.title) || "story";
      const lastmod = s.created_at ? new Date(s.created_at).toISOString().split("T")[0] : "";
      const imageUrl = s.cover_image_url || extractFirstImage(s.content);
      xml += `  <url>\n    <loc>${baseUrl}/stories/${s.id}-${storySlug}</loc>\n`;
      if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <priority>0.7</priority>\n    <changefreq>weekly</changefreq>\n`;
      if (imageUrl) {
        xml += `    <image:image>\n      <image:loc>${escapeXml(imageUrl)}</image:loc>\n      <image:title>${escapeXml(s.title)}</image:title>\n    </image:image>\n`;
      }
      xml += `  </url>\n`;
    }

    // MCQs
    for (const m of (mcqs || []) as any[]) {
      const mcqSlug = m.slug || slugify(m.title) || m.id;
      const lastmod = (m.updated_at || m.created_at) ? new Date(m.updated_at || m.created_at).toISOString().split("T")[0] : "";
      xml += `  <url>\n    <loc>${baseUrl}/mcqs/${mcqSlug}</loc>\n`;
      if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <priority>0.6</priority>\n    <changefreq>weekly</changefreq>\n  </url>\n`;
    }

    // Flashcards
    for (const f of (flashcards || []) as any[]) {
      const flashcardSlug = f.slug || slugify(f.title) || f.id;
      const lastmod = (f.updated_at || f.created_at) ? new Date(f.updated_at || f.created_at).toISOString().split("T")[0] : "";
      xml += `  <url>\n    <loc>${baseUrl}/flashcards/${flashcardSlug}</loc>\n`;
      if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <priority>0.6</priority>\n    <changefreq>weekly</changefreq>\n  </url>\n`;
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
