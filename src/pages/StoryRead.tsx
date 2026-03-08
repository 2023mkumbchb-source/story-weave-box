import { useState, useEffect } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { buildStoryPath, extractStoryIdFromParam, SITE_URL, stripRichText } from "@/lib/seo";
import ShareButtons from "@/components/ShareButtons";

export default function StoryRead() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [story, setStory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storyId = extractStoryIdFromParam(id);
    if (!storyId) {
      setStory(null);
      setLoading(false);
      return;
    }

    supabase
      .from("stories")
      .select("*")
      .eq("id", storyId)
      .maybeSingle()
      .then(({ data }) => {
        setStory(data);
        setLoading(false);
        if (data) {
          const canonicalPath = buildStoryPath({ id: data.id, title: data.title });
          if (location.pathname !== canonicalPath) {
            navigate(canonicalPath, { replace: true });
          }

          document.title = `${data.title} | Kenya Meds`;

          const url = `${SITE_URL}${canonicalPath}`;
          const desc = stripRichText(data.content || "", 160);
          const image = data.cover_image_url || `${SITE_URL}/icon-512.png`;

          const setMeta = (attr: string, key: string, content: string) => {
            let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
            if (!el) {
              el = document.createElement("meta");
              el.setAttribute(attr, key);
              document.head.appendChild(el);
            }
            el.content = content;
          };

          setMeta("name", "description", desc);
          setMeta("property", "og:title", data.title);
          setMeta("property", "og:description", desc);
          setMeta("property", "og:image", image);
          setMeta("property", "og:url", url);
          setMeta("property", "og:type", "article");
          setMeta("name", "twitter:card", "summary_large_image");
          setMeta("name", "twitter:title", data.title);
          setMeta("name", "twitter:description", desc);
          setMeta("name", "twitter:image", image);

          let canonical = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
          if (!canonical) {
            canonical = document.createElement("link");
            canonical.rel = "canonical";
            document.head.appendChild(canonical);
          }
          canonical.href = url;
        }
      });
  }, [id, location.pathname, navigate]);

  const storyUrl = story ? `${SITE_URL}${buildStoryPath({ id: story.id, title: story.title })}` : "";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-center">
        <p className="font-medium text-foreground">Story not found</p>
        <Link to="/stories" className="mt-4 inline-block text-primary hover:underline">← Back to stories</Link>
      </div>
    );
  }

  const storyContent = story.content || "";
  const isHtml = /<[a-z][\s\S]*>/i.test(storyContent);
  const plainForCount = stripRichText(storyContent);
  const readTime = Math.max(1, Math.ceil((plainForCount.split(/\s+/).filter(Boolean).length || 0) / 200));

  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={j} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
        return <em key={j} className="text-foreground/80">{part.slice(1, -1)}</em>;
      return <span key={j}>{part}</span>;
    });
  };

  const renderMarkdown = (content: string) => {
    const cleaned = content.replace(/^(\s*---\s*\n)+/, "");
    return cleaned.split("\n").map((line: string, i: number) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("# ")) return <h1 key={i} className="mb-4 mt-8 font-serif text-2xl font-bold text-foreground sm:text-3xl">{renderInline(trimmed.slice(2))}</h1>;
      if (trimmed.startsWith("## ")) return <h2 key={i} className="mb-3 mt-7 font-serif text-xl font-bold text-foreground sm:text-2xl">{renderInline(trimmed.slice(3))}</h2>;
      if (trimmed.startsWith("### ")) return <h3 key={i} className="mb-2 mt-5 font-serif text-lg font-bold text-foreground">{renderInline(trimmed.slice(4))}</h3>;
      if (/^[-*_]{3,}$/.test(trimmed)) return <hr key={i} className="my-6 border-border" />;
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) return <li key={i} className="mb-1 ml-5 text-foreground/90 leading-relaxed">{renderInline(trimmed.slice(2))}</li>;
      if (trimmed.startsWith("> ")) {
        return (
          <blockquote key={i} className="my-3 border-l-4 border-primary/30 pl-4 italic text-muted-foreground">
            {renderInline(trimmed.slice(2))}
          </blockquote>
        );
      }

      const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (imgMatch) {
        return <img key={i} src={imgMatch[2]} alt={imgMatch[1] || "Story image"} loading="lazy" className="my-4 w-full rounded-xl object-cover" />;
      }

      if (!trimmed) return <div key={i} className="h-3" />;
      return <p key={i} className="mb-3 text-[15px] leading-[1.8] text-foreground/90 sm:text-base">{renderInline(line)}</p>;
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-2xl px-5 py-8 sm:px-6 sm:py-12">
      <Link to="/stories" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to stories
      </Link>

      <header className="mb-8">
        {story.category && story.category !== "Uncategorized" && (
          <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {story.category}
          </span>
        )}
        <h1 className="font-serif text-2xl font-bold leading-tight text-foreground sm:text-4xl">
          {story.title}
        </h1>
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{new Date(story.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
            <span>·</span>
            <span>{readTime} min read</span>
          </div>
          <ShareButtons url={storyUrl} title={story.title} variant="full" />
        </div>
      </header>

      {story.cover_image_url && (
        <figure className="mb-8 overflow-hidden rounded-2xl border border-border">
          <img src={story.cover_image_url} alt={story.title} loading="lazy" className="max-h-[400px] w-full object-cover" />
        </figure>
      )}

      <article className="prose prose-sm max-w-none prose-blockquote:border-primary/30 prose-blockquote:text-muted-foreground prose-headings:font-serif prose-p:leading-[1.8] prose-p:text-foreground/90 dark:prose-invert">
        {isHtml ? <div dangerouslySetInnerHTML={{ __html: storyContent }} /> : renderMarkdown(storyContent)}
      </article>
    </motion.div>
  );
}
