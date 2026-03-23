import { supabase } from "@/integrations/supabase/client";

export const SITE_URL = "https://ompath.azaniispproject.co.ke";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function slugifyText(value: string): string {
  return (value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function stripRichText(input: string, maxLength?: number): string {
  const normalized = (input || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[[^\]]*\]\((.*?)\)/g, " ")
    .replace(/\[[^\]]+\]\((.*?)\)/g, "$1")
    .replace(/^#+\s+/gm, "")
    .replace(/[\*_`>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (typeof maxLength === "number" && maxLength > 0) {
    return normalized.slice(0, maxLength);
  }

  return normalized;
}

export function extractFirstImageFromContent(content: string): string | null {
  if (!content) return null;

  const markdownImage = content.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+|data:image\/[^\s)]+)\)/i)?.[1];
  if (markdownImage) return markdownImage;

  const htmlImage = content.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i)?.[1];
  return htmlImage || null;
}

export function buildStoryPath(story: { id: string; title: string }): string {
  const slug = slugifyText(story.title) || "story";
  return `/stories/${story.id}-${slug}`;
}

export function extractStoryIdFromParam(storyParam?: string): string | null {
  if (!storyParam) return null;
  if (UUID_REGEX.test(storyParam)) return storyParam;

  const match = storyParam.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:-|$)/i);
  return match?.[1] || null;
}

/**
 * Auto-index: fire-and-forget URL submission to Google Indexing after publish.
 * Silently fails — no user-facing errors.
 */
export function autoIndexUrls(urls: string[]) {
  if (!urls.length) return;
  supabase.functions.invoke("google-indexing", {
    body: { action: "auto_index", urls },
  }).catch(() => { /* silent */ });
}

interface MetaConfig {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article";
}

export function updateMetaTags({ title, description, image, url, type = "website" }: MetaConfig) {
  const fullTitle = `${title} | OMPATH`;
  document.title = fullTitle;

  const tags = [
    { name: "description", content: description },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: description },
    { property: "og:image", content: image || `${SITE_URL}/og-default.jpg` },
    { property: "og:url", content: url || window.location.href },
    { property: "og:type", content: type },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image || `${SITE_URL}/og-default.jpg` },
  ];

  tags.forEach(tag => {
    if (!tag.content) return;
    const selector = tag.name ? `meta[name="${tag.name}"]` : `meta[property="${tag.property}"]`;
    let element = document.querySelector(selector);
    if (!element) {
      element = document.createElement("meta");
      if (tag.name) element.setAttribute("name", tag.name);
      if (tag.property) element.setAttribute("property", tag.property);
      document.head.appendChild(element);
    }
    element.setAttribute("content", tag.content);
  });

  // Update canonical
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", url || window.location.href);
}
