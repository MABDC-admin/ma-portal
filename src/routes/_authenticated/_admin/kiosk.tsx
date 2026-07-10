import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listEnrolledLearnersFn, logKioskAttendanceFn } from "@/lib/kiosk-attendance.functions";
import { useKioskSchedule } from "@/hooks/use-kiosk-schedule";
import { formatCountdown } from "@/lib/kiosk-schedule";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/_admin/kiosk")({
  head: () => ({ meta: [{ title: "Attendance Kiosk — AttendCloud" }] }),
  component: KioskPage,
});

type Enrolled = {
  userId: string;
  name: string;
  photo: string | null;
  sectionName: string | null;
  descriptor: Float32Array;
};

type Greeting = {
  name: string;
  photo: string | null;
  time: string;
  action: "in" | "out";
  columnLabel: string;
  alreadyLogged: boolean;
};

const COLUMN_LABELS: Record<string, string> = {
  am_time_in: "AM Time In",
  am_time_out: "AM Time Out",
  pm_time_in: "PM Time In",
  pm_time_out: "PM Time Out",
};

const AWAKE_MS = 60_000;
const GREETING_MS = 4000;
const DETECTION_INTERVAL_MS = 350;
const MATCH_THRESHOLD = 0.46;
const AMBIGUOUS_MARGIN = 0.045;
const MIN_DESCRIPTOR_LENGTH = 128;

function KioskPage() {
  const listFn = useServerFn(listEnrolledLearnersFn);
  const logFn = useServerFn(logKioskAttendanceFn);
  const { logout } = useAuth();
  const rosterQ = useQuery({
    queryKey: ["kiosk-enrolled-learners"],
    queryFn: () => listFn(),
    staleTime: 60_000,
  });

  const schedule = useKioskSchedule();
  const inWindow = !!schedule.currentWindow;

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectTimerRef = useRef<number | null>(null);
  const sleepTimerRef = useRef<number | null>(null);
  const faceApiRef = useRef<typeof import("face-api.js") | null>(null);
  const modelsReadyRef = useRef(false);
  const scanningRef = useRef(false);
  const cooldownRef = useRef(0);
  const pendingActionRef = useRef<"in" | "out">("in");

  const [isAwake, setIsAwake] = useState(false);
  const [status, setStatus] = useState("Tap to scan");
  const [error, setError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState<Greeting | null>(null);
  const [pendingAction, setPendingAction] = useState<"in" | "out">("in");
  const [recent, setRecent] = useState<Greeting[]>([]);

  const setAction = useCallback((action: "in" | "out") => {
    pendingActionRef.current = action;
    setPendingAction(action);
  }, []);

  const enrolled: Enrolled[] = useMemo(() => {
    const rows = (rosterQ.data ?? []) as Array<{
      user_id: string;
      photo_url: string | null;
      face_descriptor: number[] | null;
      sections: { name: string } | null;
      profiles: {
        full_name: string | null;
        email: string | null;
        avatar_url: string | null;
      } | null;
    }>;
    return rows
      .filter(
        (r) =>
          Array.isArray(r.face_descriptor) &&
          r.face_descriptor.length === MIN_DESCRIPTOR_LENGTH &&
          r.face_descriptor.every((n) => Number.isFinite(n)),
      )
      .map((r) => ({
        userId: r.user_id,
        name: r.profiles?.full_name || r.profiles?.email || "Learner",
        photo: r.photo_url || r.profiles?.avatar_url || null,
        sectionName: r.sections?.name ?? null,
        descriptor: new Float32Array(r.face_descriptor as number[]),
      }));
  }, [rosterQ.data]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (detectTimerRef.current) {
      window.clearTimeout(detectTimerRef.current);
      detectTimerRef.current = null;
    }
  }, []);

  const sleep = useCallback(() => {
    if (sleepTimerRef.current) {
      window.clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    stopCamera();
    setIsAwake(false);
    setStatus("Tap to scan");
  }, [stopCamera]);

  const armSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) window.clearTimeout(sleepTimerRef.current);
    sleepTimerRef.current = window.setTimeout(() => sleep(), AWAKE_MS);
  }, [sleep]);

  const detectLoop = useCallback(async () => {
    if (!videoRef.current || !faceApiRef.current || !streamRef.current) return;
    if (scanningRef.current || greeting) {
      detectTimerRef.current = window.setTimeout(detectLoop, DETECTION_INTERVAL_MS);
      return;
    }
    const now = Date.now();
    if (now - cooldownRef.current < 1500) {
      detectTimerRef.current = window.setTimeout(detectLoop, DETECTION_INTERVAL_MS);
      return;
    }
    if (enrolled.length === 0) {
      setStatus("No learners with registered faces yet");
      detectTimerRef.current = window.setTimeout(detectLoop, 1200);
      return;
    }
    try {
      const faceapi = faceApiRef.current;
      const detection = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }),
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection && enrolled.length > 0) {
        let best: { entry: Enrolled; dist: number } | null = null;
        let second: number | null = null;
        for (const e of enrolled) {
          let sum = 0;
          for (let i = 0; i < MIN_DESCRIPTOR_LENGTH; i++) {
            const d = detection.descriptor[i] - e.descriptor[i];
            sum += d * d;
          }
          const dist = Math.sqrt(sum);
          if (!best || dist < best.dist) {
            second = best?.dist ?? null;
            best = { entry: e, dist };
          } else if (second === null || dist < second) {
            second = dist;
          }
        }
        const confidence = best
          ? Math.max(0, Math.round((1 - best.dist / MATCH_THRESHOLD) * 100))
          : 0;
        const ambiguous = best && second !== null && second - best.dist < AMBIGUOUS_MARGIN;

        if (!best || best.dist >= MATCH_THRESHOLD) {
          setStatus("Face not recognized. Please try again.");
        } else if (ambiguous) {
          setStatus("Match is too close to another learner. Re-center and scan again.");
        } else {
          const action = pendingActionRef.current;
          scanningRef.current = true;
          cooldownRef.current = Date.now();
          setStatus(`Recognized with ${confidence}% confidence · logging attendance…`);
          try {
            const res = (await logFn({
              data: { studentId: best.entry.userId, action },
            })) as {
              alreadyLogged: boolean;
              column: string;
              time: string;
              student: { name: string; photo: string | null };
            };
            const g: Greeting = {
              name: res.student.name || best.entry.name,
              photo: res.student.photo ?? best.entry.photo,
              time: new Date(res.time).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              }),
              action,
              columnLabel: COLUMN_LABELS[res.column] ?? res.column,
              alreadyLogged: res.alreadyLogged,
            };
            setGreeting(g);
            setRecent((r) => [g, ...r].slice(0, 5));
            window.setTimeout(() => {
              setGreeting(null);
              scanningRef.current = false;
              sleep();
            }, GREETING_MS);
            return;
          } catch (e) {
            scanningRef.current = false;
            setStatus(e instanceof Error ? e.message : "Log failed");
          }
        }
      } else {
        setStatus("Looking for a centered face…");
      }
    } catch (e) {
      console.error(e);
      setStatus("Scanner is recovering. Keep facing the camera.");
    }
    detectTimerRef.current = window.setTimeout(detectLoop, DETECTION_INTERVAL_MS);
  }, [enrolled, greeting, logFn, sleep]);

  const wake = useCallback(
    async (action?: "in" | "out") => {
      if (action) setAction(action);
      if (isAwake) {
        armSleepTimer();
        return;
      }
      setError(null);
      try {
        if (!faceApiRef.current) {
          setStatus("Loading recognition models…");
          const faceapi = await import("face-api.js");
          faceApiRef.current = faceapi;
          if (!modelsReadyRef.current) {
            await Promise.all([
              faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
              faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
              faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
            ]);
            modelsReadyRef.current = true;
          }
        }
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera access is not available in this browser.");
        }
        setStatus("Starting camera…");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await new Promise<void>((resolve) => {
            if (!videoRef.current) return resolve();
            if (videoRef.current.readyState >= 2) return resolve();
            videoRef.current.onloadedmetadata = () => resolve();
          });
          await videoRef.current.play();
        }
        setIsAwake(true);
        setStatus("Look at the camera");
        armSleepTimer();
        detectTimerRef.current = window.setTimeout(detectLoop, 500);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Camera unavailable";
        setError(message);
        setStatus(message);
        stopCamera();
      }
    },
    [armSleepTimer, detectLoop, isAwake, setAction, stopCamera],
  );

  // Auto-wake when entering an active window
  useEffect(() => {
    if (inWindow && !isAwake && !greeting) {
      // Preload default action based on window intent
      setAction(schedule.currentWindow!.action);
      wake(schedule.currentWindow!.action);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inWindow]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sleepTimerRef.current) window.clearTimeout(sleepTimerRef.current);
      stopCamera();
    };
  }, [stopCamera]);

  const dateLabel = schedule.now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timeLabel = schedule.now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div
      className="min-h-screen w-full bg-[radial-gradient(ellipse_at_top,_#1e3a8a_0%,_#0f172a_45%,_#020617_100%)] text-white"
      onClick={() => wake()}
    >
      {/* Top bar */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-8 pt-4 sm:pt-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md ring-1 ring-white/20">
            <Icon name="face_retouching_natural" filled className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-base sm:text-xl font-extrabold tracking-tight">
              Attendance Kiosk
            </p>
            <p className="truncate text-[11px] sm:text-xs text-white/60">
              {timeLabel} · {dateLabel}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white/90 backdrop-blur-md ring-1 ring-white/20 hover:bg-white/20"
          onClick={async (e) => {
            e.stopPropagation();
            await logout();
            window.location.assign("/auth");
          }}
        >
          <Icon name="logout" size={18} /> <span className="hidden sm:inline">Sign out</span>
          <span className="sm:hidden">Exit</span>
        </button>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:gap-8 px-4 sm:px-8 py-6 sm:py-8 md:grid-cols-[1fr_320px]">
        {/* Camera stage */}
        <div className="space-y-4">
          <SessionBanner
            currentLabel={schedule.currentWindow?.label ?? null}
            nextLabel={schedule.nextWindow.label}
            secondsUntilNext={schedule.secondsUntilNext}
          />
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-black shadow-2xl ring-1 ring-white/10">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover [transform:scaleX(-1)] transition-opacity duration-300 ${isAwake ? "opacity-100" : "opacity-0"}`}
            />
            {/* Scan ring */}
            {isAwake && (
              <>
                <div className="pointer-events-none absolute inset-8 rounded-[36px] border-2 border-white/25" />
                <div className="scan-ring pointer-events-none absolute inset-8 rounded-[36px] border-2 border-primary/70" />
                {[
                  "top-6 left-6 border-l-2 border-t-2 rounded-tl-3xl",
                  "top-6 right-6 border-r-2 border-t-2 rounded-tr-3xl",
                  "bottom-6 left-6 border-l-2 border-b-2 rounded-bl-3xl",
                  "bottom-6 right-6 border-r-2 border-b-2 rounded-br-3xl",
                ].map((c, i) => (
                  <div
                    key={i}
                    className={`pointer-events-none absolute h-14 w-14 border-primary/90 ${c}`}
                  />
                ))}
              </>
            )}

            {/* Idle overlay */}
            {!isAwake && !greeting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 sm:gap-4 bg-black/40 px-4 text-center">
                <div className="flex h-16 w-16 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
                  <Icon
                    name="touch_app"
                    filled
                    size={40}
                    className="text-white/80 sm:!text-[56px]"
                  />
                </div>
                <p className="font-display text-xl sm:text-3xl font-extrabold">Tap to scan</p>
                <p className="text-xs sm:text-sm text-white/60">Camera sleeps between scans</p>
              </div>
            )}

            {/* Status overlay */}
            {isAwake && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 sm:p-6">
                <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-white/60">
                  Status
                </p>
                <p className="mt-1 font-display text-lg sm:text-2xl font-bold">{error ?? status}</p>
              </div>
            )}

            {/* Greeting card */}
            {greeting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                <div className="flex w-full max-w-md flex-col sm:flex-row items-center gap-4 sm:gap-5 rounded-3xl bg-surface/95 backdrop-blur-xl border border-secondary/30 p-5 sm:p-8 text-slate-100 shadow-2xl animate-in fade-in zoom-in duration-300">
                  {greeting.photo ? (
                    <img
                      src={greeting.photo}
                      alt=""
                      className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-2xl object-cover ring-2 ring-primary/40"
                    />
                  ) : (
                    <div
                      className={`flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-2xl ${greeting.alreadyLogged ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}
                    >
                      <Icon name="check_circle" filled size={48} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-slate-400">
                      {greeting.alreadyLogged
                        ? "Already logged"
                        : greeting.action === "in"
                          ? "Welcome"
                          : "Goodbye"}
                    </p>
                    <p className="mt-1 font-display text-xl sm:text-2xl font-extrabold leading-tight break-words">
                      {greeting.name}
                    </p>
                    <p className="mt-1 text-xs sm:text-sm text-slate-400 num">
                      {greeting.columnLabel} · {greeting.time}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons — always visible */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                wake("in");
              }}
              className={`flex items-center justify-center gap-2 sm:gap-3 rounded-2xl px-3 sm:px-6 py-4 sm:py-5 font-display text-lg sm:text-2xl font-extrabold ring-1 transition ${pendingAction === "in" ? "bg-emerald-500 text-white ring-emerald-300 shadow-lg" : "bg-white/5 text-white/80 ring-white/15 hover:bg-white/10"}`}
            >
              <Icon name="login" filled size={22} className="sm:!text-[28px]" />
              Time In
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                wake("out");
              }}
              className={`flex items-center justify-center gap-2 sm:gap-3 rounded-2xl px-3 sm:px-6 py-4 sm:py-5 font-display text-lg sm:text-2xl font-extrabold ring-1 transition ${pendingAction === "out" ? "bg-rose-500 text-white ring-rose-300 shadow-lg" : "bg-white/5 text-white/80 ring-white/15 hover:bg-white/10"}`}
            >
              <Icon name="logout" filled size={22} className="sm:!text-[28px]" />
              Time Out
            </button>
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
          <div className="rounded-3xl bg-white/5 p-5 sm:p-6 backdrop-blur-md ring-1 ring-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
              Enrolled learners
            </p>
            <p className="mt-2 font-display text-4xl sm:text-5xl font-extrabold num">
              {enrolled.length}
            </p>
            <p className="mt-1 text-sm text-white/60">
              {rosterQ.isLoading ? "Loading…" : "with face profiles"}
            </p>
            {!rosterQ.isLoading && enrolled.length === 0 && (
              <p className="mt-3 rounded-2xl bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200">
                Register learner faces before using live recognition.
              </p>
            )}
          </div>
          <div className="rounded-3xl bg-white/5 p-6 backdrop-blur-md ring-1 ring-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
              Recent scans
            </p>
            {recent.length === 0 ? (
              <p className="mt-2 text-sm text-white/50">No scans yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {recent.map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-semibold text-white/90">{r.name}</span>
                    <span className="shrink-0 text-white/60 num">{r.time}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${r.action === "in" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}
                    >
                      {r.action}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-3xl bg-white/5 p-6 backdrop-blur-md ring-1 ring-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
              Schedule
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-white/80">
              <li>7:30–8:15 · AM Time In</li>
              <li>11:45–12:15 · AM Time Out</li>
              <li>12:45–1:15 · PM Time In</li>
              <li>4:45–5:10 · PM Time Out</li>
            </ul>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan-ring {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.015); }
        }
        .scan-ring { animation: scan-ring 2.2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

function SessionBanner({
  currentLabel,
  nextLabel,
  secondsUntilNext,
}: {
  currentLabel: string | null;
  nextLabel: string;
  secondsUntilNext: number;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-2xl bg-white/5 px-4 sm:px-5 py-3 ring-1 ring-white/10">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${currentLabel ? "bg-emerald-400 animate-pulse" : "bg-white/30"}`}
        />
        <p className="truncate text-sm">
          <span className="font-semibold text-white">
            {currentLabel ? `Active: ${currentLabel}` : "Outside session windows"}
          </span>
        </p>
      </div>
      <p className="text-[11px] sm:text-xs text-white/60">
        Next: <span className="font-semibold text-white/80">{nextLabel}</span> in{" "}
        <span className="num">{formatCountdown(secondsUntilNext)}</span>
      </p>
    </div>
  );
}
