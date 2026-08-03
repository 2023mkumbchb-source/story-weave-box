import { LovableAuthClient } from "@lovable.dev/cloud-auth-js";
import { supabase } from "@/integrations/supabase/client";

const lovable = new LovableAuthClient({
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  supabaseClient: supabase,
});

/** Google sign-in for students, so subscriptions can be tied to an account. */
export async function signInWithGoogle(): Promise<{ redirected?: boolean; error?: string }> {
  try {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
      extraParams: { prompt: "select_account" },
    });
    if (result.error) return { error: String(result.error.message || result.error) };
    if (result.redirected) return { redirected: true };
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Google sign-in failed" };
  }
}