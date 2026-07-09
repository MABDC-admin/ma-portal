## Goal

Provision 16 real accounts from the pasted roster into the app:
- **15 teachers**
- **Glorie Ann I. Espinosa** as **academic_director**

Each account gets: auth user (email + password) → `profiles` → `user_roles` → `teachers` row (teachers only).

## Decisions (locked in)

- **Passwords**: use the exact codes provided (option A). `auth.admin.createUser` bypasses HIBP, so seeding succeeds; users will only hit HIBP when they later change their own password.
- **Department**: left blank (`''`) — editable per teacher later on the Teachers page.
- **Subjects**: left empty (`{}`) — editable later.
- **Employee IDs**: auto-assigned sequentially `EMP-2001 … EMP-2015` in the order pasted (Glorie Ann is the academic director, so no `teachers` row / no employee ID for her).

If any of the three defaults above is wrong, tell me before I run it.

## Implementation

1. **`src/lib/admin-seed.functions.ts`** — new server function `seedFacultyFn`:
   - `createServerFn({ method: "POST" })` + `.middleware([requireSupabaseAuth])`
   - Verifies caller has role `admin` via `has_role` RPC (rejects otherwise)
   - Dynamic-imports `supabaseAdmin` inside the handler (per server-fn rules)
   - Hardcoded roster array (16 rows: `full_name`, `email`, `password`, `role`)
   - For each row:
     - `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } })`
     - If email already exists → skip and record
     - Upsert `profiles` (`id`, `email`, `full_name`, `role`)
     - Upsert `user_roles` (`user_id`, `role`)
     - If `role === 'teacher'` → upsert `teachers` (`user_id`, `employee_id`, `department=''`, `subjects='{}'`)
   - Returns `{ created: [...], skipped: [...], errors: [...] }`

2. **`src/routes/_authenticated/_admin/seed-faculty.tsx`** — one-button admin page:
   - Shows the 16-row roster preview
   - "Seed Faculty" button calls `seedFacultyFn` via `useServerFn`
   - Renders per-row status (created / skipped / error) after run
   - Idempotent — safe to re-click

3. Add a "Seed Faculty" link in the admin nav (removable after use).

## After the seed

- Confirm in `/teachers` that all 15 appear.
- Confirm Glorie Ann shows up in the Academic Director surfaces (Faculty Directory, DLL review queue).
- Share the credentials with each teacher via your own channel.
