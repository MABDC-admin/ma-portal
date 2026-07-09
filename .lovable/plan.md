## AttendCloud — build plan

A directors-and-teachers portal for tracking student attendance and reviewing Daily Lesson Logs (DLLs). Port the 8 provided HTML screens as pixel-faithfully as reasonable into the existing TanStack Start template, with a shared sidebar shell, client-side routing, and static mock data (no backend).

### Screens & routes

| # | Route | Screen (from HTML) |
|---|---|---|
| 1 | `/` (index) | **Live Attendance** — real-time class check-in board with weekly summary and activity feed (file 8) |
| 2 | `/teachers` | **Teacher Management** — searchable/filterable teacher roster with role, subjects, status (file 5) |
| 3 | `/faculty` | **Faculty Directory** (Horizon Academy) — richer directory view with headline stats (file 12) |
| 4 | `/students/:id` | **Student Profile** — Alex Chen overview: 30-day trend, subject breakdown, activity log (file 6) |
| 5 | `/students/:id/attendance` | **Student Attendance Profile** — Eleanor Shellstrop: trends, current month calendar, detailed log (file 7) |
| 6 | `/dll/new` | **New DLL Entry** — multi-section form: Lesson Identity, Curriculum Delivery, Reflection & Action Plan (file 9) |
| 7 | `/dll` | **DLL Review Portal** — director dashboard with submissions queue, trends chart, memo (file 10) |
| 8 | `/dll/:id` | **DLL Review Detail** — single submission review with feedback + history logs (file 11) |

Home (`/`) is Live Attendance so a first-time visitor lands on something concrete.

### Design system

Pulled straight from the mockups so all 8 screens feel like one product:

- **Fonts:** Manrope (600/700/800) for headings, Inter (400/500/600/700) for body, JetBrains Mono (500) for numeric/kpi values. Load via `@fontsource` packages, imported once in `src/router.tsx` (client entry). Wire into Tailwind v4 via `--font-*` tokens in `src/styles.css`.
- **Icons:** Material Symbols Outlined via Google Fonts `<link>` in `src/routes/__root.tsx` head (per template rule — no CSS `@import` for remote fonts).
- **Palette:** neutral canvas with a single brand accent. Semantic tokens in `src/styles.css` (`--background`, `--foreground`, `--primary`, `--muted`, `--card`, `--border`, `--accent`, plus status colors `--success`, `--warning`, `--destructive`). Values sampled from the mockups (soft off-white background, deep ink foreground, indigo/blue primary, mint success, amber warning, coral destructive). No hardcoded hex in components.
- **Radii & spacing:** `--radius: 0.75rem`; cards use `rounded-2xl`, chips `rounded-full`.
- **Charts:** Recharts (already OK for TanStack) for the 30-day trend, subject breakdown, submission trends, weekly summary sparklines.

### Shared shell

`src/components/AppShell.tsx` renders:
- Left sidebar: AttendCloud wordmark, nav items (Live, Teachers, Faculty, Students, DLL, Review), user chip.
- Top bar: page title slot, search, notifications, avatar.
- `<Outlet />` content area with consistent max-width and padding.

Applied via a pathless layout route `src/routes/_app.tsx` so every screen except a future login inherits it. Every leaf route sets its own `head()` (title + description + og text).

### Data

Static mock data in `src/lib/mock/` (teachers, students, dll-submissions, attendance-events). Screens read from these modules synchronously — no loaders, no server functions. Interactive bits (filters, form field state, review actions) use local `useState`; nothing persists across reloads. This keeps the port faithful without introducing Cloud/DB scope the user didn't ask for.

### Fidelity approach

For each screen I'll open the source HTML, extract the visual structure (grid, cards, table columns, badge variants, icon choices, copy), and rebuild it in React + Tailwind using the shared tokens. Copy (names, numbers, subject lists, memo text) is preserved verbatim so the ported screen reads the same as the mockup. Charts get realistic-looking generated series matching the shape shown in the HTML.

### Files to add / change

```text
src/
  routes/
    __root.tsx                 (update: add Material Symbols <link>, real title/meta)
    _app.tsx                   (new: shell layout with <Outlet />)
    index.tsx                  (replace placeholder → Live Attendance)
    teachers.tsx
    faculty.tsx
    students.$id.tsx
    students.$id.attendance.tsx
    dll.tsx                    (review portal list)
    dll.new.tsx
    dll.$id.tsx                (review detail)
  components/
    AppShell.tsx, Sidebar.tsx, TopBar.tsx
    ui/  (Card, Badge, Button, Input, Select, Tabs, Table, KpiTile, MiniChart, Avatar, StatusDot)
    attendance/ (LiveBoard, WeeklySummary, ActivityFeed, MonthCalendar)
    students/   (ProfileHeader, TrendChart, SubjectBreakdown, ActivityLog)
    dll/        (DllForm sections, SubmissionsQueue, ReviewPanel, HistoryLogs, DirectorMemo)
  lib/
    mock/ (teachers.ts, students.ts, dll.ts, attendance.ts)
    icons.tsx (small <Icon name="..." /> wrapper over Material Symbols span)
  styles.css   (update: tokens, font-family vars, base rules)
```

### Out of scope (call out)

- No auth, no Lovable Cloud, no persistence — pure UI port with mock data.
- No mobile-specific redesign; layouts follow the desktop HTML mockups and adapt down with sensible stacking.
- Screens for files 1–4 and 13 (login/dashboard/etc.) are **not** built — you chose to proceed with the 8 available. Nav links only route to what exists.
- Charts approximate the shapes shown; exact pixel-identical curves aren't guaranteed.

### Verification

After the build I'll run the app in the sandbox with Playwright, screenshot each of the 8 routes at 1280×1800, and compare against the source HTML for layout, typography, and content parity. Fix anything visibly off before handing back.
