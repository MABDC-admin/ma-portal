
## Attendance Kiosk — Final Plan

Note: the project already has face-api.js models in `/public/models/`, a per-section teacher kiosk, and `students.face_descriptor` populated via existing enrollment. This plan builds a **school-wide admin kiosk** on top of that infrastructure.

### 1. Session windows & attendance mapping

Hardcoded in `src/lib/kiosk-schedule.ts`:

| Window   | Time          | Writes to `attendance` |
|----------|---------------|------------------------|
| morning  | 07:30–08:15   | `am_time_in`  (late if >08:00) |
| lunch1   | 11:45–12:15   | `am_time_out` |
| lunch2   | 12:45–13:15   | `pm_time_in`  |
| dismiss  | 16:45–17:10   | `pm_time_out` |

**Both Time In and Time Out buttons are always visible and pressable** even outside the active window (per your answer). The active window only decides which `attendance` column gets written; the button decides in vs out semantics for edge cases (e.g. early arrival before 7:30 still records `am_time_in`).

### 2. Camera awake/sleep cycle (per your answer)

- Enter an active window → camera turns **on for 60 s**, screen bright.
- After 60 s with no scan → camera turns **off**, screen shows dim "Tap to scan" idle card.
- User taps the screen or the Time In / Time Out button → camera wakes for another 60 s.
- Successful scan → show greeting for ~4 s → camera turns off → idle "Tap to scan".
- Outside all windows → camera stays off, buttons dimmed, banner shows next window countdown.

Implemented via a small state machine `idle | awake | scanning | greeting | off-hours` in `useKioskCamera()`.

### 3. Files

**New**
- `src/routes/_authenticated/_admin/kiosk.tsx` — full-screen admin kiosk
- `src/lib/kiosk-schedule.ts` — window definitions, `getCurrentWindow(now)`, `getNextWindow(now)`, `windowToAttendanceColumn(key)`
- `src/hooks/use-kiosk-schedule.ts` — 1-s ticker returning `{ window, nextWindow, secondsUntilNext }`
- `src/hooks/use-kiosk-camera.ts` — camera on/off + 60-s awake timer, exposes `wake()`, `sleep()`, `videoRef`, `isAwake`
- `src/lib/kiosk-attendance.functions.ts` — `logKioskAttendance` server fn (`.middleware([requireSupabaseAuth])`, admin role check)
- `src/components/kiosk/CameraStage.tsx` — video + scan ring + tap-to-wake overlay
- `src/components/kiosk/ScanResultCard.tsx` — success card (photo, name, section, timestamp, in/out badge)
- `src/components/kiosk/SessionBanner.tsx` — current window pill + next-window countdown

**Edited**
- `src/routes/_authenticated/_admin/route.tsx` — add "Attendance Kiosk" nav item

No schema changes — reuses existing `students.face_descriptor` and `attendance` columns.

### 4. Scan flow

1. Camera awake, single-face detection loop at 400 ms (same as existing teacher kiosk).
2. Detected descriptor → Euclidean-distance match across all `students` with `face_descriptor` (loaded once at mount) → accept if distance < 0.5.
3. On match: capture frame → show greeting card with `photo_url` (or captured frame fallback) + name + section + timestamp + "TIME IN" or "TIME OUT" chip.
4. Call `logKioskAttendance({ studentId, action: 'in'|'out', windowKey })`.
5. Server fn upserts today's `attendance` row for that student, writing the correct column based on `windowKey` (or on `action` if no active window). Enforces one write per column per day; second scan of the same column returns `{ alreadyLogged: true }` and the UI shows a soft "Already recorded at 07:42 AM".
6. Sleep camera, return to idle.

### 5. UI shell

Dark gradient, kiosk-scale typography (matches existing teacher kiosk styling for consistency):

```
┌─────────────────────────────────────────────────────┐
│  School logo · 07:42 AM · Mon, Jul 13               │
├─────────────────────────────────────────────────────┤
│  Session: MORNING (open until 8:15)                 │
│                                                     │
│         ┌───────────────────────────┐               │
│         │      camera preview        │              │
│         │    (or "Tap to scan"       │              │
│         │       idle card)           │              │
│         └───────────────────────────┘               │
│                                                     │
│      [   TIME IN   ]     [  TIME OUT  ]             │
│                                                     │
│  Recent: Juan Dela Cruz · 07:38 · TIME IN           │
│          Maria Santos    · 07:36 · TIME IN          │
└─────────────────────────────────────────────────────┘
```

### 6. Assumptions I'm locking in

- Kiosk lives at `/_admin/kiosk` under the existing admin gate (only admin role opens it).
- Uses browser's local clock; recommend NTP-synced kiosk device.
- No liveness/anti-spoof in v1.
- Photos: uses whatever is already stored on the student; if none, greeting card shows the freshly-captured camera frame.
- Idempotency: one write per `attendance` column per student per day; repeat scans surface a friendly "already recorded" toast.
