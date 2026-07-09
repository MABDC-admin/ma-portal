
-- Enums
CREATE TYPE public.teacher_status AS ENUM ('active', 'inactive');
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE public.dll_status AS ENUM ('draft', 'submitted', 'approved', 'returned');

-- Reusable updated_at trigger already exists as public.update_updated_at_column()

-- =========== teachers ===========
CREATE TABLE public.teachers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id text UNIQUE NOT NULL,
  department text NOT NULL DEFAULT '',
  subjects text[] NOT NULL DEFAULT '{}',
  status public.teacher_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO authenticated;
GRANT ALL ON public.teachers TO service_role;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage teachers" ON public.teachers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Directors read teachers" ON public.teachers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'academic_director'));
CREATE POLICY "Teachers read self" ON public.teachers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_teachers_updated BEFORE UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========== sections ===========
CREATE TABLE public.sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  grade_level int NOT NULL,
  adviser_id uuid REFERENCES public.teachers(user_id) ON DELETE SET NULL,
  academic_year text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, academic_year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sections TO authenticated;
GRANT ALL ON public.sections TO service_role;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage sections" ON public.sections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated read sections" ON public.sections FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER trg_sections_updated BEFORE UPDATE ON public.sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========== students ===========
CREATE TABLE public.students (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  student_number text UNIQUE NOT NULL,
  section_id uuid REFERENCES public.sections(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage students" ON public.students FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Directors read students" ON public.students FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'academic_director'));
CREATE POLICY "Students read self" ON public.students FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Teachers read students in their sections" ON public.students FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sections s
    WHERE s.id = students.section_id AND s.adviser_id = auth.uid()
  ));

CREATE TRIGGER trg_students_updated BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========== attendance ===========
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(user_id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  date date NOT NULL,
  status public.attendance_status NOT NULL,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, date)
);
CREATE INDEX idx_attendance_section_date ON public.attendance(section_id, date);
CREATE INDEX idx_attendance_student ON public.attendance(student_id, date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage attendance" ON public.attendance FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Directors read attendance" ON public.attendance FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'academic_director'));
CREATE POLICY "Students read own attendance" ON public.attendance FOR SELECT TO authenticated
  USING (auth.uid() = student_id);
CREATE POLICY "Teachers read attendance in their sections" ON public.attendance FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sections s
    WHERE s.id = attendance.section_id AND s.adviser_id = auth.uid()
  ));
CREATE POLICY "Teachers insert attendance for their sections" ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (
    recorded_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.sections s WHERE s.id = attendance.section_id AND s.adviser_id = auth.uid())
  );
CREATE POLICY "Teachers update attendance in their sections" ON public.attendance FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sections s WHERE s.id = attendance.section_id AND s.adviser_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sections s WHERE s.id = attendance.section_id AND s.adviser_id = auth.uid()));

CREATE TRIGGER trg_attendance_updated BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========== dlls ===========
CREATE TABLE public.dlls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(user_id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.sections(id) ON DELETE SET NULL,
  subject text NOT NULL,
  lesson_date date NOT NULL,
  objectives text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  procedures text NOT NULL DEFAULT '',
  assessment text NOT NULL DEFAULT '',
  status public.dll_status NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dlls_teacher_date ON public.dlls(teacher_id, lesson_date DESC);
CREATE INDEX idx_dlls_status ON public.dlls(status, submitted_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dlls TO authenticated;
GRANT ALL ON public.dlls TO service_role;
ALTER TABLE public.dlls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage dlls" ON public.dlls FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Directors read dlls" ON public.dlls FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'academic_director'));
CREATE POLICY "Directors update dll review" ON public.dlls FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'academic_director'))
  WITH CHECK (public.has_role(auth.uid(), 'academic_director'));
CREATE POLICY "Teachers read own dlls" ON public.dlls FOR SELECT TO authenticated
  USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers insert own dlls" ON public.dlls FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Teachers update own draft/returned dlls" ON public.dlls FOR UPDATE TO authenticated
  USING (auth.uid() = teacher_id AND status IN ('draft', 'returned'))
  WITH CHECK (auth.uid() = teacher_id);

CREATE TRIGGER trg_dlls_updated BEFORE UPDATE ON public.dlls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
