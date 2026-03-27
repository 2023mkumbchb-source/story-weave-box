import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Loader2, Send, BookOpen, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import RichTextEditor from "@/components/RichTextEditor";
import { Helmet } from "react-helmet-async";

export default function SubmitStory() {
  const location = useLocation();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const ogUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${location.pathname}${location.search}`
      : location.pathname;
  const metaTitle = "Submit a Story | OmpathStudy Kenya";
  const description =
    "Share your medical school experience or health story on OmpathStudy. Stories are reviewed before publishing for Kenyan medical and health students.";
  const keywords =
    "OmpathStudy, submit story, medical stories Kenya, health student stories, reflective writing, medical education Kenya";

  // Strip HTML tags for length check
  const plainText = content.replace(/<[^>]*>/g, "").trim();

  const handleSubmit = async () => {
    if (!title.trim() || plainText.length < 10) {
      toast({ title: "Please fill in both the title and story content", variant: "destructive" });
      return;
    }
    if (plainText.length < 200) {
      toast({ title: "Your story is too short", description: "Please write at least 200 characters", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // AI moderation + grammar fix via edge function
      const { data: modResult, error: modError } = await supabase.functions.invoke("generate-content", {
        body: { notes: content, type: "moderate-and-fix-story", title },
      });

      if (modError) throw new Error(modError.message);
      if (modResult?.rejected) {
        toast({
          title: "Story not accepted",
          description: modResult.reason || "The content doesn't appear to be a valid story. Please try again.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      const finalContent = authorName.trim()
        ? `<p><em>By ${authorName.trim()}</em></p>${modResult?.content || content}`
        : (modResult?.content || content);

      const { error } = await supabase.from("stories").insert({
        title: modResult?.title || title.trim(),
        content: finalContent,
        category: modResult?.category || "Stories",
        published: false,
      });

      if (error) throw new Error(error.message);
      setSubmitted(true);
      toast({ title: "Story submitted for review!" });
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <Helmet>
          <title>{metaTitle}</title>
          <meta name="description" content={description} />
          <meta name="keywords" content={keywords} />
          <meta property="og:title" content={metaTitle} />
          <meta property="og:description" content={description} />
          <meta property="og:type" content="website" />
          <meta property="og:url" content={ogUrl} />
          <meta name="twitter:card" content="summary" />
          <meta name="twitter:title" content={metaTitle} />
          <meta name="twitter:description" content={description} />
        </Helmet>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <CheckCircle className="mx-auto mb-4 h-16 w-16 text-primary" />
          <h1 className="font-serif text-3xl font-bold text-foreground mb-3">Story Submitted!</h1>
          <p className="text-muted-foreground mb-6">
            Your story has been submitted for review. Once approved, it will appear in our Stories section.
          </p>
          <Button onClick={() => { setSubmitted(false); setTitle(""); setContent(""); setAuthorName(""); }}>
            Submit Another Story
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:py-12">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={ogUrl} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={description} />
      </Helmet>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
            <BookOpen className="h-3.5 w-3.5" /> Share Your Story
          </div>
          <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl mb-2">
            Submit a Story
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Share your medical school experiences, personal reflections, or creative writing.
            Stories are reviewed before publishing. Grammar and formatting will be auto-improved.
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Story Title *</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Give your story a compelling title"
              maxLength={150}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Author Name (optional)</label>
            <Input
              value={authorName}
              onChange={e => setAuthorName(e.target.value)}
              placeholder="Your name or pen name"
              maxLength={80}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Your Story *</label>
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Write your story here..."
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {plainText.length} characters · Minimum 200 required
            </p>
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-2" size="lg">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {submitting ? "Checking & Submitting..." : "Submit Story"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
