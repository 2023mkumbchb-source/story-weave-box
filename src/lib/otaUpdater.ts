import { supabase } from "@/integrations/supabase/client";

export interface LiveBundleInfo { version: string; url: string }

const RELEASE_API = "https://api.github.com/repos/2023mkumbchb-source/ompathstudy-mobile/releases/latest";

export async function getLatestBundle(): Promise<LiveBundleInfo | null> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "app_live_bundle")
    .maybeSingle();

  if (data?.value) {
    try {
      const configured = JSON.parse(data.value) as { version?: string; url?: string };
      if (configured.version && configured.url) return { version: configured.version, url: configured.url };
    } catch {
      // Fall through to the public mobile release.
    }
  }

  const response = await fetch(RELEASE_API, { headers: { Accept: "application/vnd.github+json" } });
  if (!response.ok) return null;
  const release = await response.json() as {
    tag_name?: string;
    assets?: Array<{ name?: string; browser_download_url?: string }>;
  };
  const asset = release.assets?.find((item) => item.name === "OmpathStudy-web-bundle.zip");
  const version = release.tag_name?.replace(/^v/, "").replace(/-apk$/, "");
  return version && asset?.browser_download_url ? { version, url: asset.browser_download_url } : null;
}

export async function checkForAppUpdate(): Promise<{
  available: boolean;
  latest: LiveBundleInfo | null;
  currentVersion: string;
}> {
  const latest = await getLatestBundle();
  return { available: false, latest, currentVersion: "web" };
}

export async function installAppUpdate(
  _latest: LiveBundleInfo,
  _onProgress?: (percent: number) => void,
): Promise<never> {
  throw new Error("Updates are installed only inside the Android app.");
}
