import { createFileRoute, Link } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSectionRosterFn, kioskCheckInFn } from "@/lib/teacher.functions";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/_authenticated/_teacher/sections/$id/kiosk")({
  head: () => ({ meta: [{ title: "Attendance Kiosk — AttendCloud" }] }),
  component: KioskPage,
});

type Enrolled = {
  userId: string;
  name: string;
  descriptor: Float32Array;
};

type Greeting = {
  name: string;
  time: string;
  status: "present" | "late";
};

function KioskPage() {
  const { id } = Route.useParams();
  const rosterFn = useServerFn(listSectionRosterFn);
  const checkInFn = useServerFn(kioskCheckInFn);
  const rosterQ = useQuery({
    queryKey: ["section-roster", id],
    queryFn: () => rosterFn({ data: { sectionId: id } }),
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const cooldownRef = useRef<Map<string, number>>(new Map());
  const [status, setStatus] = useState("Preparing kiosk…");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState<Greeting | null>(null);
  const [checkedInCount, setCheckedInCount] = useState(0);

  const rosterData = rosterQ.data as unknown as
    | {
        section: { name: string; grade_level: number };
        students: Array<{
          user_id: string;
          face_descriptor: number[] | null;
          profiles: { full_name: string | null; email: string | null } | null;
        }>;
        isAdviser: boolean;
      }
    | undefined;

  const enrolled: Enrolled[] = (rosterData?.students ?? [])
    .filter((s) => Array.isArray(s.face_descriptor) && s.face_descriptor.length === 128)
    .map((s) => ({
      userId: s.user_id,
      name: s.profiles?.full_name || s.profiles?.email || "Student",
      descriptor: new Float32Array(s.face_descriptor as number[]),
    }));

  useEffect(() => {
    if (!rosterData) return;
    if (!rosterData.isAdviser) {
      setError("Only the section adviser can launch the kiosk.");
      return;
    }
    let cancelled = false;
    let faceapiRef: typeof import("face-api.js") | null = null;

    (async () => {
      try {
        setStatus("Loading face recognition models…");
        const faceapi = await import("face-api.js");
        faceapiRef = faceapi;
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        ]);
        if (cancelled) return;
        setStatus("Requesting camera access…");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        streamRef.current = stream;
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
        setStatus("Look at the camera to check in.");
        loop();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to start kiosk");
      }
    })();

    async function loop() {
      if (cancelled || !videoRef.current || !faceapiRef) return;
      try {
        const detection = await faceapiRef
          .detectSingleFace(
            videoRef.current,
            new faceapiRef.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }),
          )
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection && enrolled.length > 0) {
          // nearest match
          let best: { userId: string; name: string; dist: number } | null = null;
          for (const e of enrolled) {
            let sum = 0;
            for (let i = 0; i < 128; i++) {
              const d = detection.descriptor[i] - e.descriptor[i];
              sum += d * d;
            }
            const dist = Math.sqrt(sum);
            if (!best || dist < best.dist) best = { userId: e.userId, name: e.name, dist };
          }
          if (best && best.dist < 0.5) {
            const now = Date.now();
            const last = cooldownRef.current.get(best.userId) ?? 0;
            if (now - last > 10_000) {
              cooldownRef.current.set(best.userId, now);
              try {
                const res = await checkInFn({ data: { studentId: best.userId, sectionId: id } });
                if (!cancelled) {
                  setGreeting({
                    name: (res.student?.full_name as string | undefined) || best.name,
                    time: new Date(res.time).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    }),
                    status: res.status,
                  });
                  setCheckedInCount((c) => c + 1);
                  setTimeout(() => setGreeting(null), 3500);
                }
              } catch (e) {
                console.error("check-in failed", e);
              }
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
      rafRef.current = window.setTimeout(loop, 400) as unknown as number;
    }

    return () => {
      cancelled = true;
      if (rafRef.current) window.clearTimeout(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterData, id]);

  const now = new Date();
  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_top,_#1e3a8a_0%,_#0f172a_45%,_#020617_100%)] text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 pt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md ring-1 ring-white/20">
            <Icon name="face_retouching_natural" filled className="text-white" />
          </div>
          <div>
            <p className="font-display text-xl font-extrabold tracking-tight">Attendance Kiosk</p>
            <p className="text-xs text-white/60">
              {rosterData?.section?.name ?? "Section"} · {dateLabel}
            </p>
          </div>
        </div>
        <Link
          to="/sections/$id"
          params={{ id }}
          className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 backdrop-blur-md ring-1 ring-white/20 hover:bg-white/20"
        >
          <Icon name="close" size={18} /> Exit kiosk
        </Link>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-8 py-8 md:grid-cols-[1fr_320px]">
        {/* Camera stage */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-black shadow-2xl ring-1 ring-white/10">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover [transform:scaleX(-1)]"
          />
          {/* Scan ring */}
          <div className="pointer-events-none absolute inset-8 rounded-[36px] border-2 border-white/25" />
          <div className="scan-ring pointer-events-none absolute inset-8 rounded-[36px] border-2 border-primary/70" />
          {/* Corner brackets */}
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

          {/* Status overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">Status</p>
            <p className="mt-1 font-display text-2xl font-bold">
              {error ? error : ready ? status : status}
            </p>
          </div>

          {/* Greeting card */}
          {greeting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md">
              <div className="mx-4 max-w-md rounded-3xl bg-white p-10 text-center text-slate-900 shadow-2xl animate-in fade-in zoom-in duration-300">
                <div
                  className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${greeting.status === "late" ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"}`}
                >
                  <Icon name="check_circle" filled size={48} />
                </div>
                <p className="mt-4 text-sm font-semibold uppercase tracking-widest text-slate-500">
                  Welcome
                </p>
                <p className="mt-1 font-display text-3xl font-extrabold">{greeting.name}</p>
                <p className="mt-2 text-lg text-slate-600 num">{greeting.time}</p>
                <p
                  className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${greeting.status === "late" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
                >
                  {greeting.status === "late" ? "Marked late" : "On time"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          <div className="rounded-3xl bg-white/5 p-6 backdrop-blur-md ring-1 ring-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
              Enrolled today
            </p>
            <p className="mt-2 font-display text-5xl font-extrabold num">{checkedInCount}</p>
            <p className="mt-1 text-sm text-white/60">check-ins recorded</p>
          </div>
          <div className="rounded-3xl bg-white/5 p-6 backdrop-blur-md ring-1 ring-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
              Face profiles
            </p>
            <p className="mt-2 font-display text-2xl font-bold">
              {enrolled.length} of {rosterData?.students.length ?? 0}
            </p>
            <p className="mt-1 text-sm text-white/60">
              {enrolled.length < (rosterData?.students.length ?? 0)
                ? "Enroll remaining students from the section page."
                : "All students are enrolled."}
            </p>
          </div>
          <div className="rounded-3xl bg-white/5 p-6 backdrop-blur-md ring-1 ring-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
              How it works
            </p>
            <ol className="mt-2 space-y-1.5 text-sm text-white/80">
              <li>1. Student steps in front of the camera.</li>
              <li>2. Face is matched against enrolled profiles.</li>
              <li>3. Attendance is marked automatically.</li>
            </ol>
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
