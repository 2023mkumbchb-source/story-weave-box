import { useState } from "react";
import { Flag, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ReportArticleError({ articleId }: { articleId: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  const submit = async () => {
    if (message.trim().length < 10) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("student-content-report", { body: { article_id: articleId, message: message.trim() } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Report submitted", description: "Thank you. This page has been added to the clinical review queue." });
      setMessage("");
      setOpen(false);
    } catch (error: any) {
      toast({ title: "Could not submit report", description: error.message || "Please sign in and try again.", variant: "destructive" });
    } finally { setSending(false); }
  };
  return <div className="not-prose mt-5 rounded-lg border border-border p-3">
    <button type="button" onClick={() => setOpen(value => !value)} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><Flag className="h-4 w-4"/>Found a mistake? Tell us</button>
    {open && <div className="mt-3 space-y-2">
      <Textarea value={message} onChange={event => setMessage(event.target.value)} placeholder="Describe the statement or section that may be incorrect. Include the correct wording or a reference if known." rows={4}/>
      <div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">Reports are reviewed by the OmpathStudy team.</span><Button size="sm" onClick={() => void submit()} disabled={sending || message.trim().length < 10}><Send className="mr-1.5 h-3.5 w-3.5"/>{sending ? "Submitting…" : "Submit report"}</Button></div>
    </div>}
  </div>;
}
