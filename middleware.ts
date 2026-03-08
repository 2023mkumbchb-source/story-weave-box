const CRAWLER_REGEX =
  /bot|crawl|spider|facebookexternalhit|whatsapp|twitterbot|slackbot|telegrambot|discordbot|linkedinbot|googlebot|bingbot|yandex|baiduspider|duckduckbot|applebot|pinterestbot/i;

const SUPABASE_FUNCTIONS = "https://lkgfzjwhmfjvntzphbsh.supabase.co/functions/v1";

export const config = {
  matcher: ["/blog/:slug*", "/stories/:id*"],
};

export default async function middleware(request: Request) {
  const ua = request.headers.get("user-agent") || "";

  if (!CRAWLER_REGEX.test(ua)) {
    return undefined; // pass through to SPA
  }

  const url = new URL(request.url);
  const pathname = url.pathname;

  let ogUrl = "";

  const blogMatch = pathname.match(/^\/blog\/(.+)$/);
  if (blogMatch) {
    ogUrl = `${SUPABASE_FUNCTIONS}/og-preview?slug=${encodeURIComponent(blogMatch[1])}`;
  }

  const storyMatch = pathname.match(/^\/stories\/(.+)$/);
  if (storyMatch) {
    ogUrl = `${SUPABASE_FUNCTIONS}/og-preview?story=${encodeURIComponent(storyMatch[1])}`;
  }

  if (!ogUrl) return undefined;

  try {
    const ogRes = await fetch(ogUrl, {
      headers: { "User-Agent": ua },
    });
    const html = await ogRes.text();
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return undefined; // fallback to SPA
  }
}
