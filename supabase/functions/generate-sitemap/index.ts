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

function cleanPublicSlug(rawSlug: string | null | undefined, fallbackTitle: string, fallback = "study"): string {
  const base = String(rawSlug || slugify(fallbackTitle) || fallback).trim().toLowerCase();
  return base
    .replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, "")
    .replace(/-[0-9a-f]{6}$/i, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || fallback;
}

function normalizeBaseUrl(url: string | null | undefined): string {
  const trimmed = String(url || "").trim();
  if (!trimmed) return DEFAULT_BASE_URL;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  // Force canonical www host so sitemap entries match robots.txt + canonical tags.
  // Google rejects sitemap URLs that don't share the sitemap's hostname.
  const cleaned = withProtocol.replace(/\/+$/, "");
  try {
    const u = new URL(cleaned);
    if (/(^|\.)ompathstudy\.com$/i.test(u.hostname) && u.hostname.toLowerCase() !== "www.ompathstudy.com") {
      u.hostname = "www.ompathstudy.com";
    }
    u.protocol = "https:";
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return cleaned;
  }
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

async function fetchAllPublished(sb: any, table: string, select: string) {
  const rows: any[] = [];
  const batchSize = 1000;
  for (let from = 0; ; from += batchSize) {
    const { data, error } = await sb
      .from(table)
      .select(select)
      .eq("published", true)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .range(from, from + batchSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < batchSize) break;
  }
  return rows;
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

    const [articles, mcqs, flashcards, stories] = await Promise.all([
      fetchAllPublished(supabase, "articles", "id, title, slug, created_at, updated_at, category, og_image_url"),
      fetchAllPublished(supabase, "mcq_sets", "id, title, slug, og_image_url, created_at, updated_at, category"),
      fetchAllPublished(supabase, "flashcard_sets", "id, title, slug, og_image_url, created_at, updated_at, category"),
      fetchAllPublished(supabase, "stories", "id, title, slug, created_at, category, cover_image_url"),
    ]);

    const years = new Set<number>();
    [...(articles || []), ...(mcqs || []), ...(flashcards || [])].forEach((item: any) => {
      const m = (item.category || "").match(/^Year (\d)/);
      if (m) years.add(parseInt(m[1]));
    });

    const emittedPaths = new Set<string>(["/", "/blog", "/stories", "/flashcards", "/mcqs", "/exams"]);
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
      const path = `/year/${y}`;
      emittedPaths.add(path);
      xml += `  <url><loc>${baseUrl}${path}</loc><priority>0.8</priority><changefreq>weekly</changefreq></url>\n`;
    }

    // Articles
    for (const a of (articles || []) as any[]) {
      const articleSlug = cleanPublicSlug(a.slug, a.title, "article");
      const path = `/blog/${articleSlug}`;
      if (emittedPaths.has(path)) continue;
      emittedPaths.add(path);
      const lastmod = (a.updated_at || a.created_at) ? new Date(a.updated_at || a.created_at).toISOString().split("T")[0] : "";
      const imageUrl = a.og_image_url || null;
      xml += `  <url>\n    <loc>${baseUrl}${path}</loc>\n`;
      if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <priority>0.7</priority>\n    <changefreq>weekly</changefreq>\n`;
      if (imageUrl) {
        xml += `    <image:image>\n      <image:loc>${escapeXml(imageUrl)}</image:loc>\n      <image:title>${escapeXml(a.title)}</image:title>\n    </image:image>\n`;
      }
      xml += `  </url>\n`;
    }

    // Stories
    for (const s of (stories || []) as any[]) {
      const storySlug = cleanPublicSlug(s.slug, s.title, "story");
      const path = `/stories/${s.id}-${storySlug}`;
      if (emittedPaths.has(path)) continue;
      emittedPaths.add(path);
      const lastmod = s.created_at ? new Date(s.created_at).toISOString().split("T")[0] : "";
      const imageUrl = s.cover_image_url || null;
      xml += `  <url>\n    <loc>${baseUrl}${path}</loc>\n`;
      if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <priority>0.7</priority>\n    <changefreq>weekly</changefreq>\n`;
      if (imageUrl) {
        xml += `    <image:image>\n      <image:loc>${escapeXml(imageUrl)}</image:loc>\n      <image:title>${escapeXml(s.title)}</image:title>\n    </image:image>\n`;
      }
      xml += `  </url>\n`;
    }

    // MCQs
    for (const m of (mcqs || []) as any[]) {
      const mcqSlug = cleanPublicSlug(m.slug, m.title, "quiz");
      const path = `/mcqs/${mcqSlug}`;
      if (emittedPaths.has(path)) continue;
      emittedPaths.add(path);
      const lastmod = (m.updated_at || m.created_at) ? new Date(m.updated_at || m.created_at).toISOString().split("T")[0] : "";
      xml += `  <url>\n    <loc>${baseUrl}${path}</loc>\n`;
      if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <priority>0.7</priority>\n    <changefreq>weekly</changefreq>\n`;
      if (m.og_image_url) {
        xml += `    <image:image>\n      <image:loc>${escapeXml(m.og_image_url)}</image:loc>\n      <image:title>${escapeXml(m.title)}</image:title>\n    </image:image>\n`;
      }
      xml += `  </url>\n`;
    }

    // Flashcards
    for (const f of (flashcards || []) as any[]) {
      const flashcardSlug = cleanPublicSlug(f.slug, f.title, "flashcards");
      const path = `/flashcards/${flashcardSlug}`;
      if (emittedPaths.has(path)) continue;
      emittedPaths.add(path);
      const lastmod = (f.updated_at || f.created_at) ? new Date(f.updated_at || f.created_at).toISOString().split("T")[0] : "";
      xml += `  <url>\n    <loc>${baseUrl}${path}</loc>\n`;
      if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <priority>0.7</priority>\n    <changefreq>weekly</changefreq>\n`;
      if (f.og_image_url) {
        xml += `    <image:image>\n      <image:loc>${escapeXml(f.og_image_url)}</image:loc>\n      <image:title>${escapeXml(f.title)}</image:title>\n    </image:image>\n`;
      }
      xml += `  </url>\n`;
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
