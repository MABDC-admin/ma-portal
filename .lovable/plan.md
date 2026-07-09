# Role-Based Auth Plan for AttendCloud

## Goal
Add email/password authentication and four role-based portals: **Admin**, **Academic Director**, **Teacher**, and **Student**. Admin assigns roles manually. Existing screens will be gated by role.

## Roles & Portal Mapping

| Role | Screens / Access |
|------|------------------|
| **Admin** | Teacher Management, Faculty Directory, User Management (assign roles), all read access |
| **Academic Director** | DLL Review Portal, DLL Review Detail, Faculty Directory (read), DLL approval/feedback |
| **Teacher** | Live Attendance, New DLL Entry, own Teacher/Faculty view, submit lesson logs |
| **Student** | Student Profile, Student Attendance (own records only) |

## Database Schema

1. **Enum**: `app_role` (`admin`, `academic_director`, `teacher`, `student`).
2. **Table**: `public.profiles`
   - `id uuid` (PK, refs `auth.users` on delete cascade)
   - `email text`
   - `full_name text`
   - `avatar_url text` (optional)
   - `role app_role` (default `student` until admin changes)
   - `created_at`, `updated_at` timestamps
   - GRANTs + RLS: users read own profile; admins read all; admins update role.
3. **Table**: `public.user_roles`
   - `id uuid` PK
   - `user_id uuid` (refs `auth.users`)
   - `role app_role`
   - unique `(user_id, role)`
   - GRANTs + RLS: authenticated select; service_role all.
4. **Function**: `public.has_role(_user_id uuid, _role app_role)` — security definer for RLS/policy checks.
5. **Trigger**: auto-create `profiles` row on `auth.users` insert with default role `student`.

## Auth Flow

1. **Sign-up / Sign-in page** at `/auth`
   - Tabs for login and register.
   - Uses `supabase.auth.signInWithPassword` and `supabase.auth.signUp`.
   - Email confirmation required (no auto-confirm unless requested).
2. **Reset password page** at `/reset-password`
   - Handles `type=recovery` hash param.
   - Calls `supabase.auth.updateUser({ password })`.
3. **Protected layout** `src/routes/_authenticated/route.tsx`
   - Integration-managed, `ssr: false`, redirects to `/auth` if no session.
4. **Role-gated pathless layouts**
   - `/_authenticated/_admin`
   - `/_authenticated/_director`
   - `/_authenticated/_teacher`
   - `/_authenticated/_student`
   - Each uses `beforeLoad` + `hasRole` check, redirecting to `/unauthorized` if role mismatch.
5. **Sign-out affordance**
   - Update `AppShell` header to show user avatar/menu with sign-out when authenticated.
   - Sign-out clears TanStack Query cache, calls `supabase.auth.signOut()`, then navigates to `/auth`.

## Server Functions

Create `src/lib/auth.functions.ts` (client-safe path):

- `getCurrentUser()` — returns current `profiles` row + roles; uses `requireSupabaseAuth`.
- `listUsers()` — admin only; returns all profiles with roles.
- `assignRole({ userId, role })` — admin only; updates `profiles.role` and upserts `user_roles`.
- `updateProfile({ fullName, avatarUrl })` — own profile only.

Admin-only functions verify caller via `context.supabase.rpc('has_role', ...)` before using `supabaseAdmin` where needed.

## UI Additions

1. **Auth page** (`src/routes/auth.tsx`) — login/register form.
2. **Reset password page** (`src/routes/reset-password.tsx`).
3. **User Management page** (`src/routes/_authenticated/_admin/users.tsx`) — table of users, role dropdown per row, save action.
4. **Unauthorized page** (`src/routes/unauthorized.tsx`) — friendly message + link back.
5. **Update AppShell**
   - Replace static header with session-aware user menu.
   - Show role badge.
   - Add sign-out button.

## Route Reorganization

Move existing screens under the correct role-gated layouts:

- `/` Live Attendance → `/_authenticated/_teacher/`
- `/teachers` → `/_authenticated/_admin/teachers.tsx`
- `/faculty` → `/_authenticated/_director/faculty.tsx` (also readable by admin)
- `/students/:id` → `/_authenticated/_student/students.$id.tsx`
- `/students/:id/attendance` → `/_authenticated/_student/students.$id.attendance.tsx`
- `/dll` → `/_authenticated/_director/dll.index.tsx`
- `/dll/new` → `/_authenticated/_teacher/dll.new.tsx`
- `/dll/:id` → `/_authenticated/_director/dll.$id.tsx`

Admin routes will also allow director/teacher views where appropriate via `hasAnyRole(['admin', ...])`.

## Configuration

- Enable email auth in Lovable Cloud.
- Keep HIBP password protection enabled.
- Ensure `attachSupabaseAuth` is registered in `src/start.ts` (already present).
- Update `src/integrations/supabase/types.ts` by regenerating types after schema changes.

## Out of Scope (unless requested)

- Social login (Google/Apple).
- Auto role assignment by email domain.
- Email customization / custom auth templates.
- Profile avatars upload (URL only for now).

## Next Step

Approve this plan and I will implement the schema, auth pages, role gates, and user management screen.