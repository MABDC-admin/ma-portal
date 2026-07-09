export type KioskWindowKey = "morning" | "lunch1" | "lunch2" | "dismiss";

export type KioskWindow = {
  key: KioskWindowKey;
  label: string;
  startMinutes: number; // minutes past midnight
  endMinutes: number;
  column: "am_time_in" | "am_time_out" | "pm_time_in" | "pm_time_out";
  action: "in" | "out";
};

const hm = (h: number, m: number) => h * 60 + m;

export const KIOSK_WINDOWS: KioskWindow[] = [
  {
    key: "morning",
    label: "Morning Arrival",
    startMinutes: hm(7, 30),
    endMinutes: hm(8, 15),
    column: "am_time_in",
    action: "in",
  },
  {
    key: "lunch1",
    label: "Morning Dismissal",
    startMinutes: hm(11, 45),
    endMinutes: hm(12, 15),
    column: "am_time_out",
    action: "out",
  },
  {
    key: "lunch2",
    label: "Afternoon Return",
    startMinutes: hm(12, 45),
    endMinutes: hm(13, 15),
    column: "pm_time_in",
    action: "in",
  },
  {
    key: "dismiss",
    label: "Afternoon Dismissal",
    startMinutes: hm(16, 45),
    endMinutes: hm(17, 10),
    column: "pm_time_out",
    action: "out",
  },
];

function minutesOf(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function getCurrentWindow(now: Date = new Date()): KioskWindow | null {
  const m = minutesOf(now);
  return KIOSK_WINDOWS.find((w) => m >= w.startMinutes && m < w.endMinutes) ?? null;
}

export function getNextWindow(now: Date = new Date()): { window: KioskWindow; startsAt: Date } {
  const m = minutesOf(now);
  const upcoming = KIOSK_WINDOWS.find((w) => m < w.startMinutes);
  const target = upcoming ?? KIOSK_WINDOWS[0];
  const startsAt = new Date(now);
  startsAt.setSeconds(0, 0);
  startsAt.setHours(Math.floor(target.startMinutes / 60), target.startMinutes % 60);
  if (!upcoming) startsAt.setDate(startsAt.getDate() + 1);
  return { window: target, startsAt };
}

/**
 * Resolve which attendance column a scan should write to.
 * If we are inside a window, that window wins.
 * Otherwise fall back to a sensible default based on the operator's In/Out button
 * and the current time (early arrival before morning window still counts as am_time_in).
 */
export function resolveTargetColumn(
  action: "in" | "out",
  now: Date = new Date(),
): KioskWindow["column"] {
  const w = getCurrentWindow(now);
  if (w) return w.column;
  const m = minutesOf(now);
  // Before noon: AM slot. Afternoon: PM slot.
  const isAm = m < hm(12, 30);
  if (action === "in") return isAm ? "am_time_in" : "pm_time_in";
  return isAm ? "am_time_out" : "pm_time_out";
}

export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "now";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}
