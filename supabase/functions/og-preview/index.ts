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
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    if (!slug) {
      return new Response(JSON.stringify({ error: 'Missing slug' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Try slug first, then ID
    let { data: article } = await supabase
      .from('articles')
      .select('title, meta_title, meta_description, og_image_url, slug, id')
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle();

    if (!article) {
      const { data: byId } = await supabase
        .from('articles')
        .select('title, meta_title, meta_description, og_image_url, slug, id')
        .eq('id', slug)
        .eq('published', true)
        .maybeSingle();
      article = byId;
    }

    if (!article) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const baseUrl = 'https://ompathstud.lovable.app';
    const title = article.meta_title || article.title;
    const description = article.meta_description || `Study ${article.title} - medical notes on Ompath Study.`;
    const image = article.og_image_url || `${baseUrl}/icon-512.png`;
    const canonicalPath = article.slug ? `/blog/${article.slug}` : `/blog/${article.id}`;
    const canonical = `${baseUrl}${canonicalPath}`;

    // Return HTML page with meta tags that redirects to the SPA
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)} | Ompath Study</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta http-equiv="refresh" content="0;url=${escapeHtml(canonical)}">
  <script>window.location.replace("${canonical}");</script>
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(canonical)}">${escapeHtml(title)}</a>...</p>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders },
    });
  } catch (error) {
    console.error('OG preview error:', error);
    return new Response('Error', { status: 500, headers: corsHeaders });
  }
});

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
