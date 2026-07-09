import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { Card } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { listLearnersForEnrollmentFn } from "@/lib/kiosk-attendance.functions";
import { saveFaceDescriptorFn } from "@/lib/teacher.functions";

export const Route = createFileRoute("/_authenticated/_admin/face-registration")({
  head: () => ({ meta: [{ title: "Face Registration — AttendCloud" }] }),
  component: FaceRegistrationPage,
});

type Learner = {
  user_id: string;
  student_number: string;
  photo_url: string | null;
  section_name: string | null;
  grade_level: number | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  has_face: boolean;
};

function FaceRegistrationPage() {
  const listFn = useServerFn(listLearnersForEnrollmentFn);
  const q = useQuery({
    queryKey: ["learners-for-enrollment"],
    queryFn: () => listFn() as Promise<Learner[]>,
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "enrolled" | "missing">("all");
  const [active, setActive] = useState<Learner | null>(null);

  const learners = q.data ?? [];
  const enrolledCount = learners.filter((l) => l.has_face).length;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return learners.filter((l) => {
      if (filter === "enrolled" && !l.has_face) return false;
      if (filter === "missing" && l.has_face) return false;
      if (!term) return true;
      return [l.full_name, l.email, l.student_number, l.section_name]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(term));
    });
  }, [learners, search, filter]);

  return (
    <AppShell
      title="Face Registration"
      subtitle="Enroll learners for the attendance kiosk"
    >
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total learners" value={learners.length} icon="groups" />
        <StatCard label="Enrolled faces" value={enrolledCount} icon="face_retouching_natural" />
        <StatCard
          label="Missing enrollment"
          value={learners.length - enrolledCount}
          icon="person_off"
          tone="warn"
        />
      </div>

      <Card className="p-4">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Icon
              name="search"
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tertiary"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, LRN, section…"
              className="w-full rounded-xl border border-outline-variant bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-1 rounded-xl bg-surface-container p-1 text-sm">
            {(["all", "missing", "enrolled"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`rounded-lg px-3 py-1.5 font-semibold capitalize ${filter === k ? "bg-primary text-primary-foreground" : "text-tertiary hover:text-foreground"}`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        {q.isLoading ? (
          <p className="py-12 text-center text-tertiary">Loading learners…</p>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-tertiary">No learners match.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-outline-variant">
            <table className="w-full text-sm">
              <thead className="bg-surface-container text-left text-xs uppercase tracking-wider text-tertiary">
                <tr>
                  <th className="px-4 py-2">Learner</th>
                  <th className="px-4 py-2">LRN</th>
                  <th className="px-4 py-2">Section</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr
                    key={l.user_id}
                    onClick={() => setActive(l)}
                    className="cursor-pointer border-t border-outline-variant transition hover:bg-surface-container/60"
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        {l.photo_url || l.avatar_url ? (
                          <img
                            src={l.photo_url || l.avatar_url!}
                            alt=""
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-primary">
                            {(l.full_name || l.email || "?")
                              .split(/\s+/)
                              .map((n) => n[0])
                              .filter(Boolean)
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </div>
                        )}
                        <div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActive(l);
                            }}
                            className="text-left font-semibold text-foreground hover:text-primary hover:underline"
                          >
                            {l.full_name || l.email || "Learner"}
                          </button>
                          {l.email && (
                            <p className="text-xs text-tertiary">{l.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 num text-tertiary">{l.student_number}</td>
                    <td className="px-4 py-2 text-tertiary">
                      {l.section_name ?? <span className="italic">—</span>}
                    </td>
                    <td className="px-4 py-2">
                      {l.has_face ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                          <Icon name="check_circle" size={14} filled /> Enrolled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                          <Icon name="pending" size={14} filled /> Not enrolled
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActive(l);
                        }}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                      >
                        {l.has_face ? "Re-enroll" : "Enroll"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {active && (
        <EnrollModal learner={active} onClose={() => setActive(null)} />
      )}
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: string;
  tone?: "warn";
}) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl ${tone === "warn" ? "bg-amber-100 text-amber-700" : "bg-primary-container text-primary"}`}
      >
        <Icon name={icon} filled />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-tertiary">{label}</p>
        <p className="font-display text-3xl font-extrabold num">{value}</p>
      </div>
    </Card>
  );
}

// ---------- Enroll modal ----------
const TARGET_SAMPLES = 3;
const MIN_FACE_RATIO = 0.22; // face box vs. min(video w,h)
const MAX_CENTER_OFFSET = 0.18; // fraction of frame
const MIN_SHARPNESS = 12; // laplacian variance
const MIN_DETECTION_SCORE = 0.7;
const MIN_DESCRIPTOR_DISTANCE = 0.32; // diversity between samples
const AUTO_CAPTURE_COOLDOWN_MS = 900;

type QualityCheck = {
  ok: boolean;
  hint: string;
  score: number;
  ratio: number;
  centerOffset: number;
  sharpness: number;
};

function EnrollModal({ learner, onClose }: { learner: Learner; onClose: () => void }) {
  const qc = useQueryClient();
  const saveFn = useServerFn(saveFaceDescriptorFn);
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const [status, setStatus] = useState("Loading models…");
  const [error, setError] = useState<string | null>(null);
  const [samples, setSamples] = useState<Float32Array[]>([]);
  const [snapshots, setSnapshots] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoCapture, setAutoCapture] = useState(true);
  const [liveHint, setLiveHint] = useState<string>("Position your face in the frame");
  const [liveOk, setLiveOk] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceApiRef = useRef<typeof import("face-api.js") | null>(null);
  const samplesRef = useRef<Float32Array[]>([]);
  const lastCaptureRef = useRef<number>(0);
  const loopRef = useRef<number | null>(null);
  const autoRef = useRef(autoCapture);

  // keep refs in sync with state for the detection loop
  useEffect(() => {
    samplesRef.current = samples;
  }, [samples]);
  useEffect(() => {
    autoRef.current = autoCapture;
  }, [autoCapture]);

  // camera + models bootstrap
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const faceapi = await import("face-api.js");
        faceApiRef.current = faceapi;
        setStatus("Loading face models…");
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        ]);
        if (cancelled || mode !== "camera") return;
        setStatus("Starting camera…");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
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
        setStatus("Hold still — auto-capturing quality samples");
      } catch (e) {
        setError(
          e instanceof Error
            ? `Camera error: ${e.message}. Grant camera permission and reload.`
            : "Setup failed",
        );
      }
    })();
    return () => {
      cancelled = true;
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [mode]);

  // continuous detection loop w/ live overlay + auto-capture
  useEffect(() => {
    if (mode !== "camera" || !ready) return;
    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      const faceapi = faceApiRef.current;
      const video = videoRef.current;
      const canvas = overlayRef.current;
      if (!faceapi || !video || !canvas || video.readyState < 2) {
        loopRef.current = requestAnimationFrame(tick);
        return;
      }
      try {
        const detection = await faceapi
          .detectSingleFace(
            video,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }),
          )
          .withFaceLandmarks();

        // sync overlay size to displayed video
        const rect = video.getBoundingClientRect();
        if (canvas.width !== rect.width || canvas.height !== rect.height) {
          canvas.width = rect.width;
          canvas.height = rect.height;
        }
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          loopRef.current = requestAnimationFrame(tick);
          return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!detection) {
          setLiveHint("No face detected — face the camera");
          setLiveOk(false);
          loopRef.current = requestAnimationFrame(tick);
          return;
        }

        const box = detection.detection.box;
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const sx = canvas.width / vw;
        const sy = canvas.height / vh;
        // mirror the box because the video is mirrored via CSS
        const drawX = canvas.width - (box.x + box.width) * sx;
        const drawY = box.y * sy;
        const drawW = box.width * sx;
        const drawH = box.height * sy;

        const quality = evaluateQuality(
          detection.detection.score,
          box,
          vw,
          vh,
          video,
        );

        // draw guide rectangle
        ctx.lineWidth = 3;
        ctx.strokeStyle = quality.ok ? "#22c55e" : "#f59e0b";
        roundRect(ctx, drawX, drawY, drawW, drawH, 12);
        ctx.stroke();

        setLiveHint(quality.hint);
        setLiveOk(quality.ok);

        const now = performance.now();
        const cooled = now - lastCaptureRef.current > AUTO_CAPTURE_COOLDOWN_MS;
        const needMore = samplesRef.current.length < TARGET_SAMPLES;

        if (autoRef.current && quality.ok && cooled && needMore) {
          const full = await faceapi
            .detectSingleFace(
              video,
              new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }),
            )
            .withFaceLandmarks()
            .withFaceDescriptor();
          if (full) {
            const diverse = samplesRef.current.every(
              (s) => descriptorDistance(s, full.descriptor) >= MIN_DESCRIPTOR_DISTANCE,
            );
            if (diverse) {
              lastCaptureRef.current = now;
              const snap = snapshotFromVideo(video, full.detection.box);
              setSamples((prev) => [...prev, full.descriptor]);
              setSnapshots((prev) => [...prev, snap]);
            } else {
              setLiveHint("Great — now change angle slightly for a diverse sample");
            }
          }
        }
      } catch {
        // swallow transient detection errors
      }
      loopRef.current = requestAnimationFrame(tick);
    };

    loopRef.current = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
      const ctx = overlayRef.current?.getContext("2d");
      if (ctx && overlayRef.current)
        ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    };
  }, [mode, ready]);

  async function captureFromCamera() {
    if (!videoRef.current || !faceApiRef.current) return;
    setError(null);
    setStatus("Detecting face…");
    try {
      const detection = await faceApiRef.current
        .detectSingleFace(
          videoRef.current,
          new faceApiRef.current.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }),
        )
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!detection) {
        setStatus("No face detected — try again.");
        return;
      }
      const snap = snapshotFromVideo(videoRef.current, detection.detection?.box);
      setSamples((prev) => [...prev, detection.descriptor]);
      setSnapshots((prev) => [...prev, snap]);
      setStatus(`Captured ${samples.length + 1} of ${TARGET_SAMPLES} recommended samples.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Detection failed");
    }
  }

  async function captureFromFile(file: File) {
    if (!faceApiRef.current) {
      setError("Models still loading");
      return;
    }
    setError(null);
    setStatus("Reading photo…");
    try {
      const img = await faceApiRef.current.bufferToImage(file);
      const detection = await faceApiRef.current
        .detectSingleFace(
          img,
          new faceApiRef.current.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.5 }),
        )
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!detection) {
        setStatus("No face detected in that photo.");
        return;
      }
      const snap = snapshotFromImage(img, detection.detection?.box);
      setSamples((prev) => [...prev, detection.descriptor]);
      setSnapshots((prev) => [...prev, snap]);
      setStatus(`Captured ${samples.length + 1} sample${samples.length ? "s" : ""}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Photo detection failed");
    }
  }

  async function save() {
    if (samples.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const avg = new Array(128).fill(0);
      for (const s of samples) for (let i = 0; i < 128; i++) avg[i] += s[i];
      for (let i = 0; i < 128; i++) avg[i] /= samples.length;
      await saveFn({ data: { studentId: learner.user_id, descriptor: avg } });
      await qc.invalidateQueries({ queryKey: ["learners-for-enrollment"] });
      await qc.invalidateQueries({ queryKey: ["kiosk-enrolled-learners"] });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }


  const name = learner.full_name || learner.email || "Learner";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg overflow-hidden p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl font-bold">Register face</h3>
            <p className="text-sm text-tertiary">
              {name}
              {learner.section_name ? ` · ${learner.section_name}` : ""}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-surface-container">
            <Icon name="close" />
          </button>
        </div>

        <div className="mb-3 flex gap-1 rounded-xl bg-surface-container p-1 text-sm">
          {(["camera", "upload"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setSamples([]);
                setSnapshots([]);
                setMode(m);
              }}
              className={`flex-1 rounded-lg px-3 py-1.5 font-semibold capitalize ${mode === m ? "bg-primary text-primary-foreground" : "text-tertiary"}`}
            >
              {m === "camera" ? "Webcam" : "Upload photo"}
            </button>
          ))}
        </div>

        {mode === "camera" ? (
          <div className="space-y-2">
            <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover [transform:scaleX(-1)]"
              />
              <canvas
                ref={overlayRef}
                className="pointer-events-none absolute inset-0 h-full w-full"
              />
              <div
                className={`pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 px-3 py-2 text-center text-xs font-semibold text-white ${liveOk ? "bg-emerald-600/80" : "bg-black/60"}`}
              >
                <Icon
                  name={liveOk ? "check_circle" : "info"}
                  size={14}
                  filled
                />
                {liveHint}
              </div>
              <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white">
                {samples.length} / {TARGET_SAMPLES}
              </div>
            </div>
            <label className="flex cursor-pointer items-center justify-between rounded-lg bg-surface-container px-3 py-2 text-xs font-semibold">
              <span className="flex items-center gap-2">
                <Icon name="bolt" size={16} filled />
                Auto-capture quality samples
              </span>
              <input
                type="checkbox"
                checked={autoCapture}
                onChange={(e) => setAutoCapture(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
            </label>
          </div>
        ) : (
          <label className="flex aspect-video cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-outline-variant bg-surface-container text-tertiary hover:border-primary hover:text-primary">
            <Icon name="add_a_photo" size={40} />
            <p className="text-sm font-semibold">Choose a clear front-facing photo</p>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) captureFromFile(f);
              }}
            />
          </label>
        )}

        <p className="mt-3 text-sm text-tertiary">{error ?? status}</p>

        {snapshots.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-tertiary">
              Captured face samples
            </p>
            <div className="flex flex-wrap gap-2">
              {snapshots.map((src, i) => (
                <div
                  key={i}
                  className="relative h-20 w-20 overflow-hidden rounded-lg border border-outline-variant bg-surface-container"
                >
                  <img src={src} alt={`Sample ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setSamples((prev) => prev.filter((_, idx) => idx !== i));
                      setSnapshots((prev) => prev.filter((_, idx) => idx !== i));
                    }}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                    aria-label={`Remove sample ${i + 1}`}
                  >
                    <Icon name="close" size={12} />
                  </button>
                  <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm">
            Samples captured:{" "}
            <span className="font-display text-lg font-extrabold num">{samples.length}</span>
          </p>
          {mode === "camera" && (
            <button
              disabled={!ready}
              onClick={captureFromCamera}
              className="rounded-lg bg-surface-container px-3 py-2 text-sm font-semibold hover:bg-surface-container/80 disabled:opacity-50"
            >
              <Icon name="photo_camera" size={16} className="mr-1 inline align-[-3px]" />
              Capture sample
            </button>
          )}
        </div>


        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-tertiary hover:bg-surface-container"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={samples.length === 0 || saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Saving…" : `Save enrollment (${samples.length})`}
          </button>
        </div>
      </Card>
    </div>
  );
}

type Box = { x: number; y: number; width: number; height: number };

function snapshotFromVideo(video: HTMLVideoElement, box?: Box): string {
  return snapshotFromSource(video, video.videoWidth, video.videoHeight, box, true);
}

function snapshotFromImage(img: HTMLImageElement, box?: Box): string {
  return snapshotFromSource(img, img.naturalWidth, img.naturalHeight, box, false);
}

function snapshotFromSource(
  source: CanvasImageSource,
  sw: number,
  sh: number,
  box: Box | undefined,
  mirror: boolean,
): string {
  const size = 160;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const pad = 0.4;
  let sx: number, sy: number, sSize: number;
  if (box) {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    sSize = Math.max(box.width, box.height) * (1 + pad);
    sx = Math.max(0, cx - sSize / 2);
    sy = Math.max(0, cy - sSize / 2);
    sSize = Math.min(sSize, Math.min(sw - sx, sh - sy));
  } else {
    sSize = Math.min(sw, sh);
    sx = (sw - sSize) / 2;
    sy = (sh - sSize) / 2;
  }
  if (mirror) {
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, sx, sy, sSize, sSize, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function descriptorDistance(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

function evaluateQuality(
  score: number,
  box: { x: number; y: number; width: number; height: number },
  vw: number,
  vh: number,
  video: HTMLVideoElement,
): QualityCheck {
  const minSide = Math.min(vw, vh);
  const ratio = box.width / minSide;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const centerOffset = Math.max(Math.abs(cx / vw - 0.5), Math.abs(cy / vh - 0.5));
  const sharpness = estimateSharpness(video, box);

  let hint = "Perfect — hold still";
  let ok = true;
  if (score < MIN_DETECTION_SCORE) {
    hint = "Face unclear — improve lighting";
    ok = false;
  } else if (ratio < MIN_FACE_RATIO) {
    hint = "Move closer to the camera";
    ok = false;
  } else if (ratio > 0.75) {
    hint = "Move back a little";
    ok = false;
  } else if (centerOffset > MAX_CENTER_OFFSET) {
    hint = "Center your face in the frame";
    ok = false;
  } else if (sharpness < MIN_SHARPNESS) {
    hint = "Hold still — image is blurry";
    ok = false;
  }
  return { ok, hint, score, ratio, centerOffset, sharpness };
}

function estimateSharpness(
  video: HTMLVideoElement,
  box: { x: number; y: number; width: number; height: number },
): number {
  try {
    const size = 64;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return 999;
    ctx.drawImage(video, box.x, box.y, box.width, box.height, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    const gray = new Float32Array(size * size);
    for (let i = 0; i < size * size; i++) {
      const o = i * 4;
      gray[i] = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
    }
    const lap = new Float32Array(size * size);
    let mean = 0;
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const i = y * size + x;
        const v = -gray[i - size] - gray[i - 1] + 4 * gray[i] - gray[i + 1] - gray[i + size];
        lap[i] = v;
        mean += v;
      }
    }
    const n = (size - 2) * (size - 2);
    mean /= n;
    let variance = 0;
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const d = lap[y * size + x] - mean;
        variance += d * d;
      }
    }
    return variance / n;
  } catch {
    return 999;
  }
}


