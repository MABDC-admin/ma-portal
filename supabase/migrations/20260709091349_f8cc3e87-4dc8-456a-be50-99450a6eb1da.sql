
-- Face descriptor + photo for students (used by kiosk face recognition)
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS face_descriptor double precision[],
  ADD COLUMN IF NOT EXISTS photo_url text;

-- Anecdotal entries
DO $$ BEGIN
  CREATE TYPE public.anecdotal_category AS ENUM ('academic','behavioral','social','achievement');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.anecdotal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(user_id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL,
  category public.anecdotal_category NOT NULL,
  note text NOT NULL,
  occurred_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.anecdotal_entries TO authenticated;
GRANT ALL ON public.anecdotal_entries TO service_role;

ALTER TABLE public.anecdotal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers insert own anecdotals"
  ON public.anecdotal_entries FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id = auth.uid() AND (
      public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Teachers read own anecdotals"
  ON public.anecdotal_entries FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());

CREATE POLICY "Directors and admins read all anecdotals"
  ON public.anecdotal_entries FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'academic_director') OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Students read own anecdotals"
  ON public.anecdotal_entries FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Teachers update own anecdotals"
  ON public.anecdotal_entries FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Admins manage anecdotals"
  ON public.anecdotal_entries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER anecdotal_entries_updated_at
  BEFORE UPDATE ON public.anecdotal_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_anecdotal_student ON public.anecdotal_entries(student_id, occurred_on DESC);
CREATE INDEX IF NOT EXISTS idx_anecdotal_teacher ON public.anecdotal_entries(teacher_id, occurred_on DESC);
