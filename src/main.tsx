import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { HelmetProvider } from "react-helmet-async";

// Register service worker for offline caching
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then(() => {
      // Pre-warm offline cache: fetch core lists in the background so they're
      // available even when the user is offline on first navigation.
      const SUPA = (import.meta as any).env?.VITE_SUPABASE_URL;
      const KEY = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (!SUPA || !KEY) return;
      const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
      const endpoints = [
        `${SUPA}/rest/v1/articles?select=id,title,category,slug,meta_description,created_at,updated_at&published=eq.true&deleted_at=is.null&order=created_at.desc&limit=200`,
        `${SUPA}/rest/v1/mcq_sets?select=id,title,category,questions,created_at,updated_at&published=eq.true&deleted_at=is.null&order=created_at.desc&limit=100`,
        `${SUPA}/rest/v1/flashcard_sets?select=id,title,category,cards,created_at,updated_at&published=eq.true&deleted_at=is.null&order=created_at.desc&limit=50`,
        `${SUPA}/rest/v1/stories?select=id,title,category,created_at&published=eq.true&deleted_at=is.null&order=created_at.desc&limit=50`,
      ];
      // Delay so it doesn't compete with the initial render
      setTimeout(() => {
        endpoints.forEach((url) => fetch(url, { headers }).catch(() => {}));
      }, 2500);
    }).catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
