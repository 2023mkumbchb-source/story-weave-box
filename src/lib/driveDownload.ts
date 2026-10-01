import { toast } from "@/hooks/use-toast";
import { cleanName, downloadUrl } from "@/components/DriveFileViewer";

// Start the download without leaving the site: the file is served as an attachment, so
// loading it in a hidden frame makes the browser save it and the page never navigates.
export function startDownload(id: string, name: string) {
  const frame = document.createElement("iframe");
  frame.style.display = "none";
  frame.setAttribute("aria-hidden", "true");
  frame.src = downloadUrl(id);
  document.body.appendChild(frame);
  window.setTimeout(() => frame.remove(), 5 * 60 * 1000);
  toast({ title: "Download started", description: cleanName(name) });
}
