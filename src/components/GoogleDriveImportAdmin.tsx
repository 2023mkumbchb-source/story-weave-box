import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, HardDrive, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const OAUTH_FUNCTION = "google-drive-oauth";

export default function GoogleDriveImportAdmin() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [folderId, setFolderId] = useState("1WlGy6RNS6ICDqik8DzJ9T5avvjjRE9Ng");

  const loadConnection = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("google_drive_connections")
        .select("google_email")
        .maybeSingle();
      if (error) throw error;
      setEmail(data?.google_email ?? null);
    } catch (err: any) {
      toast({ title: "Could not check Google Drive connection", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnection();
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== "https://dekyjrfwvavtoivqivno.supabase.co") return;
      if (event.data?.source === "ompathstudy-google-drive") loadConnection();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const connect = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke(OAUTH_FUNCTION, { body: {} });
      if (error) throw new Error(error.message);
      if (!data?.auth_url) throw new Error("Google authorization URL was not returned.");
      const popup = window.open(data.auth_url, "ompathstudy-google-drive", "popup,width=620,height=760");
      if (!popup) {
        window.location.href = data.auth_url;
        return;
      }
      toast({ title: "Google authorization opened", description: "Approve access to the account that can view the Year 1 Drive folder." });
    } catch (err: any) {
      toast({ title: "Could not start Google authorization", description: err.message, variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-lg bg-primary/10 p-2"><HardDrive className="h-5 w-5 text-primary" /></div>
          <div>
            <h2 className="font-serif text-xl font-bold text-foreground">Google Drive Import</h2>
            <p className="text-sm text-muted-foreground">Connect the Google account that has Viewer access to the Year 1 resource folder.</p>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-border bg-background p-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Checking connection…</div>
          ) : email ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>Connected as <strong>{email}</strong></span>
              </div>
              <Button variant="outline" size="sm" onClick={connect} disabled={connecting} className="gap-2">
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Reconnect
              </Button>
            </div>
          ) : (
            <Button onClick={connect} disabled={connecting} className="gap-2">
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Connect Google Drive
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-foreground mb-1">Year 1 source folder</h3>
        <p className="text-sm text-muted-foreground mb-3">The importer will read this folder recursively. Your Google account must be able to view its contents.</p>
        <input
          value={folderId}
          onChange={(e) => setFolderId(e.target.value.trim())}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          aria-label="Google Drive folder ID"
        />
        <p className="mt-2 text-xs text-muted-foreground">Folder ID from the shared Drive URL.</p>
      </div>
    </div>
  );
}
