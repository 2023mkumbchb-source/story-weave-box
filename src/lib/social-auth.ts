import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import { supabase } from "@/integrations/supabase/client";

const lovableAuth = createLovableAuth();

/** Google sign-in for students, so subscriptions can be tied to an account. */
export async function signInWithGoogle(): Promise<{ redirected?: boolean; error?: string }> {
  try {
    const result = await lovableAuth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
      extraParams: { prompt: "select_account" },
    });
    if (result.error) return { error: String(result.error.message || result.error) };
    if (result.redirected) return { redirected: true };
    if (result.tokens) {
      const { error } = await supabase.auth.setSession({
        access_token: result.tokens.access_token,
        refresh_token: result.tokens.refresh_token,
      });
      if (error) return { error: error.message };
    }
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Google sign-in failed" };
  }
}