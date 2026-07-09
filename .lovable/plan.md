## Goal

Send email notifications through the MABDC mail API (`https://api-mail.mabdc.com/v1/emails`) whenever key workflow events happen: DLL submission, DLL approval, DLL return (with feedback), and anecdotal entry creation.

## Secret handling

- Store the API key as a backend secret named `MABDC_MAIL_API_KEY` via the secret tool (never commit it, never expose to the browser).
- Since the key was pasted in chat, rotate it after setup is confirmed — mention this to the user.

## Email sender helper

Create `src/lib/mail.server.ts` with a single `sendMabdcEmail({ to, subject, html })` function:

- Reads `MABDC_MAIL_API_KEY` from `process.env` inside the function (not at module scope).
- POSTs to `https://api-mail.mabdc.com/v1/emails` with `Authorization: Bearer …` and JSON `{ to, from: "notifications@mabdc.org", subject, html }`.
- On non-2xx, log the status + body and throw; callers wrap in try/catch so a mail failure never blocks the DB write.

A small `renderEmail({ title, intro, bodyHtml, ctaLabel?, ctaUrl? })` helper produces branded HTML (header, body, CTA button, footer) reused across all notification types.

## Notification triggers

All triggers live inside existing server functions (or new ones) so RLS + auth are enforced. Each fires **after** the DB mutation succeeds and is best-effort.

1. **DLL submitted** (teacher → directors)
   - Trigger: DLL status transitions `draft → submitted`.
   - Recipients: all users with role `academic_director` (query `profiles` by role).
   - Content: teacher name, subject, section, lesson date, link to `/dll/<id>` (director view).

2. **DLL approved** (director → teacher)
   - Trigger: status → `approved`.
   - Recipient: the DLL's teacher (`teachers.user_id` → `profiles.email`).
   - Content: DLL title/subject/date, reviewer name, optional feedback, link to teacher DLL view.

3. **DLL returned** (director → teacher)
   - Trigger: status → `returned`.
   - Recipient: teacher owner.
   - Content: reviewer name, **required feedback text**, link to teacher DLL edit view.

4. **Anecdotal entry created** (teacher → student's guardians/self and section adviser)
   - Trigger: new row in the anecdotal table (need to confirm existence — see Open questions).
   - Recipients: the student's profile email (if present) + section adviser.
   - Content: entry date, category/severity if present, short excerpt, link to student profile.

## Server-function changes

Files to touch (add try/catch mail dispatch after the successful update/insert):

- `src/lib/dlls.functions.ts` (or wherever `submitDll` / `reviewDll` live — will confirm during build).
- The anecdotal server function (to confirm).
- New `src/lib/mail.server.ts`.

Each dispatch fetches the minimal recipient data with `context.supabase` (RLS-safe), builds the HTML via `renderEmail`, and calls `sendMabdcEmail`. Failures are logged and swallowed.

## Frontend

No UI changes required. Existing buttons (Submit, Approve, Return, Save anecdotal) already call the server functions; adding email inside those functions is transparent to the client.

## Verification

After build:
1. Sign in as a teacher, submit a DLL → confirm directors receive email.
2. Sign in as director, approve + return → confirm teacher receives both.
3. Create an anecdotal entry → confirm recipient list gets email.
4. Check server-function logs for any non-2xx responses from the mail API.

## Open questions (need answers before build)

1. **Anecdotal entries** — I don't see an anecdotal table in the current schema (only `attendance`, `dlls`, etc.). Should I add an `anecdotal_entries` table (student_id, teacher_id, date, category, notes, severity) as part of this change, or does it already exist under another name?
2. **Sender identity** — OK to use `notifications@mabdc.org` as the `from` address, or do you want a specific mailbox (e.g. `no-reply@mabdc.org`, `dll@mabdc.org`)?
3. **Base URL for links** — should email CTA links use the published domain (once known) or the current preview URL for now? I'll default to a `PUBLIC_APP_URL` env var, falling back to the request origin.
