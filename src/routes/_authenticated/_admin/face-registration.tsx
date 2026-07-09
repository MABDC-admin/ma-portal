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
                  <tr key={l.user_id} className="border-t border-outline-variant">
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
                          <p className="font-semibold">{l.full_name || l.email || "Learner"}</p>
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
                        onClick={() => setActive(l)}
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

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceApiRef = useRef<typeof import("face-api.js") | null>(null);

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
          video: { facingMode: "user", width: 640, height: 480 },
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
        setStatus("Capture 3 samples for a solid enrollment.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Setup failed");
      }
    })();
    return () => {
      cancelled = true;
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [mode]);

  async function captureFromCamera() {
    if (!videoRef.current || !faceApiRef.current) return;
    setError(null);
    setStatus("Detecting face…");
    try {
      const detection = await faceApiRef.current
        .detectSingleFace(
          videoRef.current,
          new faceApiRef.current.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }),
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
      setStatus(`Captured ${samples.length + 1} of 3 recommended samples.`);
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
          new faceApiRef.current.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }),
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
                setMode(m);
              }}
              className={`flex-1 rounded-lg px-3 py-1.5 font-semibold capitalize ${mode === m ? "bg-primary text-primary-foreground" : "text-tertiary"}`}
            >
              {m === "camera" ? "Webcam" : "Upload photo"}
            </button>
          ))}
        </div>

        {mode === "camera" ? (
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover [transform:scaleX(-1)]"
            />
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
