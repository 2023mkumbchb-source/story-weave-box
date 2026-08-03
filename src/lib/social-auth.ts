import { lovable } from "@/integrations/lovable";

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