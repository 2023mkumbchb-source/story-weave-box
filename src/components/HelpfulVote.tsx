import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import type { ResourceType } from "@/lib/academic";

export default function HelpfulVote({ resourceType, resourceId }: { resourceType: ResourceType; resourceId: string }) {
  const { user } = useAuth();
  const [done, setDone] = useState<string | null>(null);

  const vote = async (value: "helpful" | "needs_improvement") => {
    setDone(value);
    await (supabase as unknown as { from: (t: string) => any })
      .from("resource_feedback")
      .insert({ resource_type: resourceType, resource_id: resourceId, vote: value, user_id: user?.id ?? null });
    toast({ description: "Thanks for the feedback." });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-medium text-foreground">Was this helpful?</p>
      <div className="flex gap-2">
        <Button variant={done === "helpful" ? "default" : "outline"} size="sm" onClick={() => vote("helpful")} disabled={!!done}>
          <ThumbsUp className="mr-1.5 h-4 w-4" /> Helpful
        </Button>
        <Button
          variant={done === "needs_improvement" ? "default" : "outline"}
          size="sm"
          onClick={() => vote("needs_improvement")}
          disabled={!!done}
        >
          <ThumbsDown className="mr-1.5 h-4 w-4" /> Needs improvement
        </Button>
      </div>
    </div>
  );
}
