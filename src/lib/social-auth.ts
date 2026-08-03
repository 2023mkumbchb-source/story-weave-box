import { lovable } from "@/integrations/lovable";

/** Canonical public origin used for OAuth redirects (production must be the .com domain). */
export function canonicalOrigin(): string {
  if (typeof window === "undefined") return "https://www.ompathstudy.com";
  const host = window.location.hostname;
  if (host.endsWith("ompathstudy.com")) return "https://www.ompathstudy.com";
  return window.location.origin;
}

/** Google sign-in for students, so subscriptions can be tied to an account. */
export async function signInWithGoogle(): Promise<{ redirected?: boolean; error?: string }> {
  try {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${canonicalOrigin()}/auth/callback`,
      extraParams: { prompt: "select_account" },
    });
    if (result.error) return { error: String(result.error.message || result.error) };
    if (result.redirected) return { redirected: true };
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Google sign-in failed" };
  }
}
