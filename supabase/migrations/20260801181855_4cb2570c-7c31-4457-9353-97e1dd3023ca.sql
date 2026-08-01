-- 1. Security: essays manageable by admins only
DROP POLICY IF EXISTS "Authenticated users can manage essays" ON public.essays;
CREATE POLICY "Admins can manage essays" ON public.essays
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Security: institution moderation restricted to admins
DROP POLICY IF EXISTS "Admin can manage all institutions" ON public.pending_institutions;
CREATE POLICY "Admins can manage all institutions" ON public.pending_institutions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Hide empty / non-functional question sets
UPDATE public.mcq_sets
SET published = false
WHERE published = true
  AND deleted_at IS NULL
  AND COALESCE(jsonb_array_length(questions), 0) < 3;

UPDATE public.articles
SET published = false
WHERE published = true
  AND deleted_at IS NULL
  AND length(regexp_replace(COALESCE(content, ''), '\s', '', 'g')) < 200;

-- 4. Year 3 subcategorisation by content kind
UPDATE public.articles a
SET content_kind = CASE
    WHEN (a.content ~* '(^|\n)\s*\*{0,2}\s*[A-E]\s*[.)]\s' OR a.content ~* 'multiple choice|\bMCQs?\b')
     AND (a.content ~* 'essay|short answer|long answer|section\s+b|section\s+c|discuss |describe ') THEN 'mcq_essay'
    WHEN (a.content ~* '(^|\n)\s*\*{0,2}\s*[A-E]\s*[.)]\s' OR a.content ~* 'multiple choice|\bMCQs?\b') THEN 'mcq'
    WHEN a.content ~* 'essay|short answer|long answer|section\s+b|section\s+c' THEN 'essay'
    ELSE 'notes'
  END
WHERE a.deleted_at IS NULL
  AND a.category ILIKE 'Year 3%';