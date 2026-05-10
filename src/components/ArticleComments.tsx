import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Loader2 } from "lucide-react";

interface Comment {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
}

export default function ArticleComments({ articleId }: { articleId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase
      .from("article_comments")
      .select("*")
      .eq("article_id", articleId)
      .order("created_at", { ascending: false })
      .limit(100);
    setComments((data as Comment[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    load();
  }, [articleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("article_comments").insert({
        article_id: articleId,
        author_name: name.trim() || "Anonymous",
        body: trimmed.slice(0, 2000),
      } as any);
      if (error) throw error;
      setBody("");
      toast({ title: "Comment posted" });
      await load();
    } catch (err: any) {
      toast({ title: "Failed to post", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-12 rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="h-4 w-4 text-primary" />
        <h2 className="font-serif text-xl font-bold text-foreground">
          Comments {comments.length > 0 && <span className="text-sm font-normal text-muted-foreground">({comments.length})</span>}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="mb-6 space-y-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional)"
          maxLength={60}
          className="text-sm"
        />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share your thoughts or ask a question…"
          rows={3}
          maxLength={2000}
          required
          className="text-sm"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{body.length}/2000</span>
          <Button type="submit" size="sm" disabled={submitting || !body.trim()}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Post comment"}
          </Button>
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Be the first to comment.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg border border-border bg-background/50 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-foreground">{c.author_name}</span>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">{c.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}