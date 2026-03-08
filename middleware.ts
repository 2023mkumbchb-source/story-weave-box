import { NextRequest, NextResponse } from "next/server";

const CRAWLER_REGEX =
  /bot|crawl|spider|facebookexternalhit|whatsapp|twitterbot|slackbot|telegrambot|discordbot|linkedinbot|googlebot|bingbot|yandex|baiduspider|duckduckbot|applebot|pinterestbot/i;

const SUPABASE_URL = "https://lkgfzjwhmfjvntzphbsh.supabase.co";

export const config = {
  matcher: ["/blog/:slug*", "/stories/:id*"],
};

export default async function middleware(req: NextRequest) {
  const ua = req.headers.get("user-agent") || "";
  if (!CRAWLER_REGEX.test(ua)) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  // Blog article
  const blogMatch = pathname.match(/^\/blog\/(.+)$/);
  if (blogMatch) {
    const slug = blogMatch[1];
    const ogUrl = `${SUPABASE_URL}/functions/v1/og-preview?slug=${encodeURIComponent(slug)}`;
    const ogRes = await fetch(ogUrl, { headers: { "User-Agent": ua } });
    const html = await ogRes.text();
    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Story
  const storyMatch = pathname.match(/^\/stories\/(.+)$/);
  if (storyMatch) {
    const storyParam = storyMatch[1];
    const ogUrl = `${SUPABASE_URL}/functions/v1/og-preview?story=${encodeURIComponent(storyParam)}`;
    const ogRes = await fetch(ogUrl, { headers: { "User-Agent": ua } });
    const html = await ogRes.text();
    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return NextResponse.next();
}
