-- Vimeo integration foundation.
-- Account credentials stay in Supabase Edge Function secrets; they are never stored in the browser or database.
alter table public.articles add column if not exists vimeo_video jsonb;
alter table public.mcq_sets add column if not exists vimeo_video jsonb;
alter table public.stories add column if not exists vimeo_video jsonb;
