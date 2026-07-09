
-- 1. Fix profiles policies: scope teacher/director access
DROP POLICY IF EXISTS "Enable read access for teachers on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for directors on profiles" ON public.profiles;

CREATE POLICY "Teachers read profiles of students in their sections"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.sections sec ON sec.id = s.section_id
    WHERE s.user_id = profiles.id
      AND sec.adviser_id = auth.uid()
  )
);

CREATE POLICY "Directors read non-admin profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'academic_director'::app_role)
  AND NOT public.has_role(profiles.id, 'admin'::app_role)
);

-- 2. Fix sections policy: restrict "read all"
DROP POLICY IF EXISTS "Authenticated read sections" ON public.sections;

CREATE POLICY "Users read relevant sections"
ON public.sections
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'academic_director'::app_role)
  OR public.has_role(auth.uid(), 'teacher'::app_role)
  OR adviser_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.user_id = auth.uid() AND s.section_id = sections.id
  )
);

-- 3. Revoke EXECUTE from authenticated/anon on internal trigger functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
