-- Two-provider clinical content verification.
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS ai_check_status text NOT NULL DEFAULT 'unchecked'
    CHECK (ai_check_status IN ('unchecked','ai_checked','needs_review','human_reviewed')),
  ADD COLUMN IF NOT EXISTS ai_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_check_model text,
  ADD COLUMN IF NOT EXISTS ai_generator_model text,
  ADD COLUMN IF NOT EXISTS ai_confidence numeric CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1)),
  ADD COLUMN IF NOT EXISTS review_loop_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.article_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  old_content text NOT NULL DEFAULT '',
  new_content text NOT NULL DEFAULT '',
  reason text NOT NULL,
  source text NOT NULL CHECK (source IN ('groq','gemini_fix','admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.article_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.article_revisions FROM anon, authenticated;
GRANT ALL ON public.article_revisions TO service_role;
GRANT SELECT, INSERT ON public.article_revisions TO authenticated;
CREATE POLICY "Admins manage article revisions" ON public.article_revisions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.audit_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  section text NOT NULL DEFAULT '',
  claim text NOT NULL DEFAULT '',
  verdict text NOT NULL CHECK (verdict IN ('supported','unsupported','contradicted','unverifiable')),
  severity text NOT NULL CHECK (severity IN ('high','medium','low')),
  reference text NOT NULL DEFAULT '',
  suggested_fix text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','applied','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_findings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.audit_findings FROM anon, authenticated;
GRANT ALL ON public.audit_findings TO service_role;

-- A durable review row is required before an article can be marked ai_checked.
CREATE TABLE IF NOT EXISTS public.article_ai_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('gemini','validator')),
  content_hash text NOT NULL,
  model text NOT NULL,
  verdict text NOT NULL CHECK (verdict IN ('approved','needs_fix','rejected')),
  overall_confidence numeric NOT NULL CHECK (overall_confidence >= 0 AND overall_confidence <= 1),
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  loop_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.article_ai_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.article_ai_reviews FROM anon, authenticated;
GRANT ALL ON public.article_ai_reviews TO service_role;

ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS ai_review_id uuid REFERENCES public.article_ai_reviews(id);

CREATE INDEX IF NOT EXISTS article_revisions_article_created_idx ON public.article_revisions(article_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_findings_queue_idx ON public.audit_findings(status, severity, created_at);
CREATE INDEX IF NOT EXISTS articles_ai_review_queue_idx ON public.articles(requires_review, ai_check_status) WHERE published = true;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.enforce_article_ai_review_gate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $
BEGIN
  IF NEW.ai_check_status = 'ai_checked' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.article_ai_reviews r
      WHERE r.id = NEW.ai_review_id AND r.article_id = NEW.id AND r.provider = 'gemini' AND r.verdict = 'approved' AND r.content_hash = encode(digest(COALESCE(NEW.content, ''), 'sha256'), 'hex')
    ) THEN
      RAISE EXCEPTION 'An approved Gemini review must be saved before ai_check_status can be ai_checked';
    END IF;
    IF NEW.requires_review IS TRUE THEN
      RAISE EXCEPTION 'An article requiring human review cannot be marked ai_checked';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS articles_ai_review_gate ON public.articles;
CREATE TRIGGER articles_ai_review_gate BEFORE INSERT OR UPDATE
ON public.articles FOR EACH ROW EXECUTE FUNCTION public.enforce_article_ai_review_gate();

-- Only service_role can access private review/audit/revision records. Admin UI reads
-- them through authenticated, admin-checked Edge Functions rather than direct table access.

ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS reviewer_name text;
ALTER TABLE public.audit_findings ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.audit_findings ADD COLUMN IF NOT EXISTS student_message text;
ALTER TABLE public.audit_findings ADD COLUMN IF NOT EXISTS review_loop integer NOT NULL DEFAULT 0;
