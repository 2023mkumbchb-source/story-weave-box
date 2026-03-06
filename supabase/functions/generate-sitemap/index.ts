import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error('Missing config');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const baseUrl = 'https://ompathstud.lovable.app';

    const [{ data: articles }, { data: mcqs }, { data: flashcards }, { data: essays }] = await Promise.all([
      supabase.from('articles').select('id, created_at').eq('published', true),
      supabase.from('mcq_sets').select('id, created_at').eq('published', true),
      supabase.from('flashcard_sets').select('id, created_at').eq('published', true),
      supabase.from('essays').select('id, created_at').eq('published', true),
    ]);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}/</loc><priority>1.0</priority><changefreq>daily</changefreq></url>
  <url><loc>${baseUrl}/blog</loc><priority>0.9</priority><changefreq>daily</changefreq></url>
  <url><loc>${baseUrl}/flashcards</loc><priority>0.8</priority><changefreq>daily</changefreq></url>
  <url><loc>${baseUrl}/mcqs</loc><priority>0.8</priority><changefreq>daily</changefreq></url>
  <url><loc>${baseUrl}/exams</loc><priority>0.8</priority><changefreq>weekly</changefreq></url>
  <url><loc>${baseUrl}/essays</loc><priority>0.8</priority><changefreq>daily</changefreq></url>
`;

    for (const a of (articles || [])) {
      xml += `  <url><loc>${baseUrl}/blog/${a.id}</loc><lastmod>${new Date(a.created_at).toISOString().split('T')[0]}</lastmod><priority>0.7</priority></url>\n`;
    }
    for (const m of (mcqs || [])) {
      xml += `  <url><loc>${baseUrl}/mcqs/${m.id}</loc><lastmod>${new Date(m.created_at).toISOString().split('T')[0]}</lastmod><priority>0.7</priority></url>\n`;
    }
    for (const f of (flashcards || [])) {
      xml += `  <url><loc>${baseUrl}/flashcards/${f.id}</loc><lastmod>${new Date(f.created_at).toISOString().split('T')[0]}</lastmod><priority>0.7</priority></url>\n`;
    }
    for (const e of (essays || [])) {
      xml += `  <url><loc>${baseUrl}/essays/${e.id}</loc><lastmod>${new Date(e.created_at).toISOString().split('T')[0]}</lastmod><priority>0.7</priority></url>\n`;
    }

    xml += `</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml', ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error('Sitemap error:', error);
    return new Response('Error generating sitemap', { status: 500, headers: corsHeaders });
  }
});
