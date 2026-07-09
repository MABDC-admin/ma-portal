CREATE INDEX IF NOT EXISTS idx_students_section_id ON public.students(section_id);
CREATE INDEX IF NOT EXISTS idx_students_student_number ON public.students(student_number);
CREATE INDEX IF NOT EXISTS idx_sections_adviser_id ON public.sections(adviser_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
ANALYZE public.students;
ANALYZE public.sections;
ANALYZE public.profiles;
ANALYZE public.user_roles;