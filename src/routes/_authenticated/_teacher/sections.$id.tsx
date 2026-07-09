import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Card, StatusPill } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSectionRosterFn, saveFaceDescriptorFn } from "@/lib/teacher.functions";
import { useEffect, useRef, useState } from "react";
// (no browser supabase import — all data flows through server functions)

export const Route = createFileRoute("/_authenticated/_teacher/sections/$id")({
  head: () => ({ meta: [{ title: "Section — AttendCloud" }] }),
  component: SectionDetail,
});

type RosterStudent = {
  user_id: string;
  student_number: string;
  status: string;
  photo_url: string | null;
  face_descriptor: number[] | null;
  profiles: { full_name: string | null; email: string | null; avatar_url: string | null } | null;
};

function SectionDetail() {
  const { id } = Route.useParams();
  const rosterFn = useServerFn(listSectionRosterFn);
  const q = useQuery({
    queryKey: ["section-roster", id],
    queryFn: () => rosterFn({ data: { sectionId: id } }),
  });
  const [enrollStudent, setEnrollStudent] = useState<RosterStudent | null>(null);

  if (q.isLoading) return <AppShell><p className="text-tertiary">Loading roster…</p></AppShell>;
  if (q.error || !q.data) return <AppShell><p className="text-status-absent">Unable to load section.</p></AppShell>;

  const { section, students, isAdviser } = q.data as unknown as {
    section: { id: string; name: string; grade_level: number; academic_year: string };
    students: RosterStudent[];
    isAdviser: boolean;
  };
  const enrolled = students.filter((s) => Array.isArray(s.face_descriptor) && s.face_descriptor.length === 128).length;

  return (
    <AppShell>
      <Link to="/" className="mb-3 flex items-center gap-1 text-sm text-tertiary hover:text-foreground">
        <Icon name="arrow_back" size={16} /> Dashboard
      </Link>
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-3xl font-extrabold">{section.name}</h1>
          <p className="mt-1 text-sm text-tertiary">Grade {section.grade_level} · SY {section.academic_year} · {students.length} students · {enrolled} enrolled faces</p>
        </div>
        {isAdviser && (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/sections/$id/attendance"
              params={{ id }}
              className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface px-4 py-2 text-sm font-semibold hover:bg-surface-container"
            >
              <Icon name="fact_check" size={18} /> Take attendance
            </Link>
            <Link
              to="/sections/$id/kiosk"
              params={{ id }}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-110"
            >
              <Icon name="face_retouching_natural" size={18} /> Launch kiosk
            </Link>
          </div>
        )}
      </div>

      {!isAdviser && (
        <Card className="mb-6 border border-status-late/30 bg-status-late/5 p-4 text-sm">
          You are not the assigned adviser for this section. Attendance and kiosk actions are disabled.
        </Card>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-outline-variant bg-surface-container-low/40 text-left text-xs uppercase tracking-widest text-tertiary">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Face</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-tertiary">No students in this section yet.</td></tr>
            )}
            {students.map((s) => {
              const name = s.profiles?.full_name || s.profiles?.email || "Student";
              const has = Array.isArray(s.face_descriptor) && s.face_descriptor.length === 128;
              return (
                <tr key={s.user_id} className="border-t border-outline-variant/40">
                  <td className="px-4 py-3 num text-tertiary">{s.student_number}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-primary">
                        {initials(name)}
                      </div>
                      <div>
                        <p className="font-semibold">{name}</p>
                        <p className="text-xs text-tertiary">{s.profiles?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill tone={s.status === "active" ? "present" : "neutral"}>{s.status}</StatusPill>
                  </td>
                  <td className="px-4 py-3">
                    {has ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-status-present">
                        <Icon name="check_circle" size={14} filled /> Enrolled
                      </span>
                    ) : (
                      <span className="text-xs text-tertiary">Not enrolled</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        to="/students/$id/anecdotal"
                        params={{ id: s.user_id }}
                        className="rounded-lg bg-surface-container px-3 py-1.5 text-xs font-semibold hover:bg-surface-container-high"
                      >
                        Anecdotals
                      </Link>
                      {isAdviser && (
                        <button
                          onClick={() => setEnrollStudent(s)}
                          className="rounded-lg bg-primary-container/40 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-container/60"
                        >
                          {has ? "Re-enroll face" : "Enroll face"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {enrollStudent && (
        <FaceEnrollModal
          student={enrollStudent}
          sectionId={id}
          onClose={() => setEnrollStudent(null)}
        />
      )}
    </AppShell>
  );
}

function initials(name: string) {
  return name.split(/\s+/).map((n) => n[0]?.toUpperCase()).filter(Boolean).slice(0, 2).join("");
}

// -------- Face enrollment modal --------
function FaceEnrollModal({ student, sectionId, onClose }: { student: RosterStudent; sectionId: string; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState("Loading models…");
  const [samples, setSamples] = useState<Float32Array[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();
  const saveFn = useServerFn(saveFaceDescriptorFn);
  // Refs for cleanup across async loads
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;

    (async () => {
      try {
        const faceapi = await import("face-api.js");
        if (cancelled) return;
        setStatus("Loading face models…");
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        ]);
        if (cancelled) return;
        setStatus("Requesting camera…");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
        streamRef.current = stream;
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
        setStatus("Position your face inside the frame, then capture 3 samples.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to start camera");
      }
    })();

    return () => {
      cancelled = true;
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function captureSample() {
    if (!videoRef.current) return;
    setError(null);
    setStatus("Detecting face…");
    try {
      const faceapi = await import("face-api.js");
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!detection) {
        setStatus("No face detected — try again.");
        return;
      }
      setSamples((prev) => [...prev, detection.descriptor]);
      setStatus(`Sample ${samples.length + 1} of 3 captured.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Detection failed");
    }
  }

  async function save() {
    if (samples.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      // Average the descriptors
      const avg = new Array(128).fill(0);
      for (const s of samples) for (let i = 0; i < 128; i++) avg[i] += s[i];
      for (let i = 0; i < 128; i++) avg[i] /= samples.length;
      await saveFn({ data: { studentId: student.user_id, descriptor: avg } });
      await qc.invalidateQueries({ queryKey: ["section-roster", sectionId] });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save descriptor");
    } finally {
      setSaving(false);
    }
  }

  const name = student.profiles?.full_name || student.profiles?.email || "Student";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg overflow-hidden p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl font-bold">Enroll face</h3>
            <p className="text-sm text-tertiary">{name}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-surface-container"><Icon name="close" /></button>
        </div>

        <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover [transform:scaleX(-1)]" />
          <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-primary/70" />
        </div>

        <p className="mt-3 text-sm text-tertiary">{status}</p>
        {error && <p className="mt-2 text-sm text-status-absent">{error}</p>}

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`h-2.5 w-8 rounded-full ${i < samples.length ? "bg-primary" : "bg-surface-container"}`} />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={captureSample}
              disabled={!ready || samples.length >= 3}
              className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold hover:bg-surface-container disabled:opacity-50"
            >
              Capture sample ({samples.length}/3)
            </button>
            <button
              onClick={save}
              disabled={samples.length === 0 || saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-110 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save enrollment"}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Silence unused-import warning if `supabase` optimization ever removes it — keep reference
void supabase;
