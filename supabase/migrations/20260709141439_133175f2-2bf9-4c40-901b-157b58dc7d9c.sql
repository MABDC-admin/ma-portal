
CREATE OR REPLACE FUNCTION public.is_student_of_section(_user_id uuid, _section_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students
    WHERE user_id = _user_id AND section_id = _section_id
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_student_of_section(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_student_of_section(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Users read relevant sections" ON public.sections;

CREATE POLICY "Users read relevant sections"
ON public.sections
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'academic_director'::app_role)
  OR public.has_role(auth.uid(), 'teacher'::app_role)
  OR adviser_id = auth.uid()
  OR public.is_student_of_section(auth.uid(), sections.id)
);
