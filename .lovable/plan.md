
# Wire all portals to real data

## Schema (new tables in `public`)

- **teachers** — `user_id` (PK/FK auth.users), `employee_id`, `department`, `subjects` text[], `status` (active/inactive)
- **sections** — `id`, `name` (e.g. "Grade 10 - Rizal"), `grade_level`, `adviser_id` (FK teachers), `academic_year`
- **students** — `user_id` (PK/FK auth.users), `student_number` (LRN), `section_id`, `status`
- **attendance** — `id`, `student_id`, `section_id`, `date`, `status` (present/absent/late/excused), `recorded_by` (teacher), unique(student, date)
- **dlls** — `id`, `teacher_id`, `section_id`, `subject`, `lesson_date`, `objectives`, `content`, `procedures`, `assessment`, `status` (draft/submitted/approved/returned), `submitted_at`, `reviewed_by`, `reviewed_at`, `feedback`

Enums: `attendance_status`, `dll_status`, `teacher_status`.

All tables: `created_at`/`updated_at`, GRANTs to `authenticated`+`service_role`, RLS on.

## RLS policies

- **teachers**: admin manages all; teacher reads own; director reads all.
- **sections**: admin manages; teacher/director/student can read.
- **students**: admin manages; student reads own; teacher reads students in their sections; director reads all.
- **attendance**: admin all; student reads own; teacher inserts/reads for their section.
- **dlls**: admin all; teacher CRUD own drafts, read own; director reads all + updates status/feedback.

## Seed (one-time, in a migration)

- 3 demo auth users are already created; add 2 more teachers, 8 students, 2 sections, ~2 weeks of attendance, 6 DLLs across statuses. Idempotent — only inserts if the email exists in `profiles`.

## Server functions (`src/lib/*.functions.ts`)

- `teachers.functions.ts` — list/create/update/deactivate
- `students.functions.ts` — list, get by id, list-my-section
- `attendance.functions.ts` — mark bulk, get by student, get by section+date
- `dlls.functions.ts` — list (filtered by role), get, create draft, submit, review (approve/return with feedback)
- `faculty.functions.ts` — compliance aggregate: submissions per teacher over date range

All use `requireSupabaseAuth`; RLS enforces the access.

## UI rewiring (existing files, keep design)

- **Admin → Teachers** — replace mock with `listTeachers()` + create dialog (creates auth user + profile + role + teacher row via admin fn).
- **Teacher → Home (index)** — today's schedule = sections adviser-of, quick "Mark attendance" + "New DLL" using real sections.
- **Teacher → New DLL** — dropdowns from real sections; save as draft or submit.
- **Director → DLL index / DLL detail** — real list filtered by status; approve/return with feedback.
- **Director → Faculty compliance** — real aggregate.
- **Student → Me / Profile / Attendance** — real profile + attendance history.

## Out of scope this turn

- Bulk import, notifications, calendar UI beyond a simple date picker, exports.

## Sequencing (one turn each, in order)

1. Schema migration (tables + enums + RLS + grants).
2. Seed migration.
3. Server functions + UI rewiring.

Step 1 posts a migration for your approval first.
