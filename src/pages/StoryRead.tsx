import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, ArrowLeft, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

export default function StoryRead() {
  const { id } = useParams<{ id: string }>();
  const [story, setStory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("stories")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setStory(data);
        setLoading(false);
        if (data) document.title = `${data.title} | OmPath Study`;
      });
  }, [id]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: story.title, url: window.location.href });
      } catch { /* user cancelled */ }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

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

  const renderContent = (content: string) => {
    return content.split("\n").map((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("# ")) return <h1 key={i} className="mb-4 mt-8 font-serif text-2xl font-bold text-foreground sm:text-3xl">{trimmed.slice(2)}</h1>;
      if (trimmed.startsWith("## ")) return <h2 key={i} className="mb-3 mt-7 font-serif text-xl font-bold text-foreground sm:text-2xl">{trimmed.slice(3)}</h2>;
      if (trimmed.startsWith("### ")) return <h3 key={i} className="mb-2 mt-5 font-serif text-lg font-bold text-foreground">{trimmed.slice(4)}</h3>;
      if (trimmed.startsWith("---")) return <hr key={i} className="my-6 border-border" />;
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) return <li key={i} className="ml-5 mb-1 text-foreground/90 leading-relaxed">{trimmed.slice(2)}</li>;
      if (trimmed.startsWith("> ")) return (
        <blockquote key={i} className="my-3 border-l-4 border-primary/30 pl-4 italic text-muted-foreground">
          {trimmed.slice(2)}
        </blockquote>
      );
      if (trimmed.startsWith("*") && trimmed.endsWith("*") && !trimmed.startsWith("**")) {
        return <p key={i} className="mb-2 italic text-muted-foreground leading-relaxed">{trimmed.slice(1, -1)}</p>;
      }
      if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
        return <p key={i} className="mb-2 font-bold text-foreground leading-relaxed">{trimmed.slice(2, -2)}</p>;
      }
      if (!trimmed) return <div key={i} className="h-3" />;
      return <p key={i} className="mb-3 text-foreground/90 leading-[1.8] text-[15px] sm:text-base">{line}</p>;
    });
  };

  const readTime = Math.max(1, Math.ceil(story.content.split(/\s+/).length / 200));

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
        <h1 className="font-serif text-2xl font-bold text-foreground sm:text-4xl leading-tight">
          {story.title}
        </h1>
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{new Date(story.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
          <span>·</span>
          <span>{readTime} min read</span>
          <button onClick={handleShare} className="ml-auto inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs hover:bg-secondary transition-colors">
            <Share2 className="h-3 w-3" /> Share
          </button>
        </div>
      </header>

      <article className="prose-custom">
        {renderContent(story.content)}
      </article>
    </motion.div>
  );
}
