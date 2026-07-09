import { useEffect, useState } from "react";
import { getCurrentWindow, getNextWindow, type KioskWindow } from "@/lib/kiosk-schedule";

export type KioskScheduleState = {
  now: Date;
  currentWindow: KioskWindow | null;
  nextWindow: KioskWindow;
  secondsUntilNext: number;
};

function compute(): KioskScheduleState {
  const now = new Date();
  const currentWindow = getCurrentWindow(now);
  const { window: nextWindow, startsAt } = getNextWindow(now);
  return {
    now,
    currentWindow,
    nextWindow,
    secondsUntilNext: Math.max(0, Math.round((startsAt.getTime() - now.getTime()) / 1000)),
  };
}

export function useKioskSchedule(): KioskScheduleState {
  const [state, setState] = useState<KioskScheduleState>(() => compute());
  useEffect(() => {
    const id = window.setInterval(() => setState(compute()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return state;
}
