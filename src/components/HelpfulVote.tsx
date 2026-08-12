import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import type { ResourceType } from "@/lib/academic";

const VOTED_KEY = "study:voted";

function readVoted(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(VOTED_KEY) || "{}");
  } catch {
    return {};
  }
}

export default function HelpfulVote({ resourceType, resourceId }: { resourceType: ResourceType; resourceId: string }) {
  const { user } = useAuth();
  const voteKey = `${resourceType}:${resourceId}`;
  const [done, setDone] = useState<string | null>(() => readVoted()[voteKey] || null);
  const [busy, setBusy] = useState(false);

  const vote = async (value: "helpful" | "needs_improvement") => {
    if (done || busy) return;
    setBusy(true);
    try {
      const { error } = await (supabase as unknown as { from: (t: string) => any })
        .from("resource_feedback")
        .insert({ resource_type: resourceType, resource_id: resourceId, vote: value, user_id: user?.id ?? null });
      if (error) throw error;
      setDone(value);
      // Best-effort: prevents this device from voting again on a reload.
      // Not a substitute for server-side de-duplication, just a courtesy.
      try {
        const voted = readVoted();
        voted[voteKey] = value;
        localStorage.setItem(VOTED_KEY, JSON.stringify(voted));
      } catch { /* quota */ }
      toast({ description: "Thanks for the feedback." });
    } catch {
      toast({ description: "Could not record your feedback. Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-medium text-foreground">Was this helpful?</p>
      <div className="flex gap-2">
        <Button variant={done === "helpful" ? "default" : "outline"} size="sm" onClick={() => vote("helpful")} disabled={!!done || busy}>
          <ThumbsUp className="mr-1.5 h-4 w-4" /> Helpful
        </Button>
        <Button
          variant={done === "needs_improvement" ? "default" : "outline"}
          size="sm"
          onClick={() => vote("needs_improvement")}
          disabled={!!done || busy}
        >
          <ThumbsDown className="mr-1.5 h-4 w-4" /> Needs improvement
        </Button>
      </div>
    </div>
  );
}
