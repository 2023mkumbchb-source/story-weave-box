// Canonical production backend (the project's own Supabase instance).
// Kept here so every direct REST / edge-function call uses the same host as
// the generated client, regardless of build-time environment variables.
export const SUPABASE_URL = "https://lkgfzjwhmfjvntzphbsh.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrZ2Z6andobWZqdm50enBoYnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3Nzk5MjIsImV4cCI6MjA4NzM1NTkyMn0.a2QY6TxzKNM2AhuuoDkgdKifI3XhSGhYRlhpqZpvAwo";
export const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
