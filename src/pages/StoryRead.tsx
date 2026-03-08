import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BlogAudioPlayer from "@/components/BlogAudioPlayer";

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
        if (data) document.title = `${data.title} | OmPath`;
      });
  }, [id]);

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
        <p className="text-foreground font-medium">Story not found</p>
        <Link to="/stories" className="mt-4 inline-block text-primary hover:underline">← Back to stories</Link>
      </div>
    );
  }

  // Simple markdown render
  const renderContent = (content: string) => {
    return content.split("\n").map((line, i) => {
      if (line.startsWith("# ")) return <h1 key={i} className="text-2xl font-bold mt-6 mb-3 text-foreground">{line.slice(2)}</h1>;
      if (line.startsWith("## ")) return <h2 key={i} className="text-xl font-bold mt-5 mb-2 text-foreground">{line.slice(3)}</h2>;
      if (line.startsWith("### ")) return <h3 key={i} className="text-lg font-bold mt-4 mb-2 text-foreground">{line.slice(4)}</h3>;
      if (line.startsWith("- ")) return <li key={i} className="ml-4 text-foreground/90">{line.slice(2)}</li>;
      if (line.startsWith("---")) return <hr key={i} className="my-4 border-border" />;
      if (!line.trim()) return <br key={i} />;
      return <p key={i} className="text-foreground/90 leading-relaxed mb-2">{line}</p>;
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-5 sm:px-6 py-10">
      <Link to="/stories" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to stories
      </Link>

      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4">{story.title}</h1>
      
      {story.category && story.category !== "Uncategorized" && (
        <span className="inline-block rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary mb-4">
          {story.category}
        </span>
      )}

      <BlogAudioPlayer content={story.content} title={story.title} />

      <article className="prose prose-sm sm:prose max-w-none mt-6">
        {renderContent(story.content)}
      </article>
    </div>
  );
}
