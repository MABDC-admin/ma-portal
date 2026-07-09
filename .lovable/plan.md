# Teacher Portal Expansion + Attendance Kiosk

## Scope confirmed
- All 4 teacher-portal additions
- Anecdotal notifications → **Academic Director** only
- Attendance = **daily bulk grid** (one row per student per day)
- New: **Attendance Kiosk** with front-camera face recognition for student self check-in

---

## 1. Teacher — My DLLs
- Route `src/routes/_authenticated/_teacher/dll.index.tsx`
- Server fn `listMyDllsFn` (RLS-scoped by `teacher_id = auth.uid()`)
- Filter chips: All / Draft / Submitted / Approved / Returned
- Card list → click opens teacher detail

## 2. Teacher — DLL Detail (read-only + duplicate)
- Route `src/routes/_authenticated/_teacher/dll.$id.tsx`
- Shows lesson content + director feedback banner (color-coded by status)
- "Duplicate as new draft" action for `returned` entries → prefills `/dll/new`

## 3. Teacher — My Sections → Roster + Attendance
- Route `src/routes/_authenticated/_teacher/sections.$id.tsx` — roster + today's summary
- Route `src/routes/_authenticated/_teacher/sections.$id.attendance.tsx` — daily bulk grid
  - Date picker (defaults today), single row per student per day
  - Bulk toolbar: "Mark all present", per-row toggle (Present / Absent / Late / Excused), notes field
  - Save = upsert on `(student_id, date)`
- Server fns: `listSectionRosterFn`, `getSectionAttendanceFn(date)`, `upsertAttendanceFn` (teacher must advise the section)

## 4. Teacher — Anecdotal Entries
- **New table `anecdotal_entries`**: `student_id`, `teacher_id`, `category` (enum: academic / behavioral / social / achievement), `note` (text), `occurred_on` (date)
- Route `src/routes/_authenticated/_teacher/students.$id.anecdotal.tsx` — list + create form
- Server fn `createAnecdotalFn` → inserts row + emails **all Academic Directors** via `sendMabdcEmail` with student name, teacher, category, note excerpt, link to student profile
- Directors get a read-only surface too: `src/routes/_authenticated/_director/anecdotal.tsx` (list, filter by student/teacher)

## 5. Attendance Kiosk (public, per-section)
- Route `src/routes/_authenticated/_teacher/sections.$id.kiosk.tsx` (teacher launches it on a shared device; stays authenticated as the teacher)
- Fullscreen UI: live front-camera video, subtle scanning animation, big status area
- Uses **face-api.js** (browser, WASM/tiny models) — TinyFaceDetector + FaceLandmark68Net + FaceRecognitionNet
- Flow:
  1. On mount, load descriptors for all students in the section (from `students.face_descriptor`)
  2. Video loop → detect face → compute descriptor → nearest neighbor (euclidean < 0.5)
  3. Match → call `kioskCheckInFn({ studentId, sectionId })` → server verifies teacher advises section, upserts today's attendance as `present`, returns student name + time
  4. Show greeting card: photo/initials, "Welcome, {name} — 7:42 AM ✓", 3-second cooldown per student to prevent double-scan
  5. No match after N frames → "Face not recognized — please see your teacher"
- **Enrollment**: on `sections.$id.tsx` roster, each student row gets an "Enroll face" button that opens a modal, captures 3 samples, averages the descriptor, saves to `students.face_descriptor` (float[])

## Database migration
1. `students`: add `face_descriptor float8[]`, `photo_url text` (nullable)
2. `anecdotal_entries` table (CREATE → GRANT authenticated + service_role → RLS → policies):
   - Teacher can insert own; teacher can read own; academic_director can read all
3. `attendance`: ensure unique `(student_id, date)` for upsert; teacher policies scoped via `sections.adviser_id = auth.uid()`

## Navigation
- Extend `AppShell` teacher menu: Dashboard · My DLLs · New DLL · My Sections
- Section detail page has action buttons: **Take Attendance**, **Launch Kiosk**, **Enroll Faces**
- Director menu gains: **Anecdotal Log**

## Dependencies
- `face-api.js` (bun add) + copy model weights to `/public/models/` (tiny_face_detector, face_landmark_68, face_recognition)

## Tech notes
- All new writes go through `createServerFn` + `requireSupabaseAuth`; kiosk check-in verifies caller is section adviser server-side
- Face descriptors stay in DB (float[128]); matching happens client-side in kiosk (avoids uploading video)
- Email helper reused from `src/lib/mail.server.ts`; anecdotal notification queries `profiles` for role=`academic_director`
- Design: kiosk uses dark gradient bg, large rounded video frame, animated scan ring, MABDC brand tokens