import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/** Public landing page Google/OAuth returns to. Waits for the session, then continues. */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Finishing sign-in…");

  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      const back = sessionStorage.getItem("post_login_redirect") || "/account";
      sessionStorage.removeItem("post_login_redirect");
      navigate(back, { replace: true });
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) finish();
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) finish();
    });
    const timer = setTimeout(() => {
      if (!done) {
        setMessage("Sign-in did not complete. Returning to sign in…");
        navigate("/login", { replace: true });
      }
    }, 8000);

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
