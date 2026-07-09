import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Card, StatusPill } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_student/students/$id/")({
  head: () => ({ meta: [{ title: "Student Profile — AttendCloud" }] }),
  component: StudentProfile,
});

function StudentProfile() {
  const { id } = Route.useParams();

  const studentQ = useQuery({
    queryKey: ["student", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select(
          "user_id, student_number, status, section_id, profiles!students_user_id_profiles_fkey(email, full_name), sections:section_id(name, grade_level, academic_year)",
        )
        .eq("user_id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const attendanceQ = useQuery({
    queryKey: ["student-attendance", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("date, status")
        .eq("student_id", id)
        .order("date", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (studentQ.isLoading)
    return (
      <AppShell>
        <p className="text-tertiary">Loading…</p>
      </AppShell>
    );
  if (!studentQ.data)
    return (
      <AppShell>
        <p className="text-status-absent">Student record not found.</p>
      </AppShell>
    );

  const s = studentQ.data;
  const p = s.profiles as unknown as { email: string | null; full_name: string | null } | null;
  const sec = s.sections as unknown as {
    name: string;
    grade_level: number;
    academic_year: string;
  } | null;
  const displayName = p?.full_name || p?.email || "Student";
  const initials = displayName
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const records = attendanceQ.data ?? [];
  const counts = { present: 0, late: 0, absent: 0, excused: 0 };
  for (const r of records) counts[r.status as keyof typeof counts]++;
  const total = records.length || 1;
  const rate = Math.round(((counts.present + counts.late) / total) * 100);

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold">Student Profile</h1>
        <Link
          to="/students/$id/attendance"
          params={{ id }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110"
        >
          <Icon name="calendar_month" size={16} /> View Attendance
        </Link>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <Card className="col-span-12 flex flex-col items-center p-8 text-center lg:col-span-4">
          <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
            {initials}
          </div>
          <h2 className="font-display text-2xl font-extrabold">{displayName}</h2>
          <p className="mt-2 num text-xs text-tertiary">{s.student_number}</p>
          {sec && (
            <p className="mt-1 text-sm text-tertiary">
              Grade {sec.grade_level} · {sec.name}
            </p>
          )}
          <p className="mt-1 text-xs text-tertiary">{p?.email}</p>
        </Card>

        <div className="col-span-12 grid grid-cols-2 gap-4 lg:col-span-8 md:grid-cols-4">
          <Metric label="Attendance Rate" value={`${rate}%`} tone="primary" />
          <Metric label="Days Present" value={String(counts.present)} tone="present" />
          <Metric label="Late" value={String(counts.late)} tone="late" />
          <Metric label="Absences" value={String(counts.absent)} tone="absent" />
        </div>
      </div>

      <Card className="mt-6 p-6">
        <h3 className="mb-4 font-display text-lg font-bold">Recent Attendance</h3>
        {records.length === 0 && (
          <p className="text-sm text-tertiary">No attendance records yet.</p>
        )}
        <div className="space-y-2">
          {records.slice(0, 10).map((r) => (
            <div
              key={r.date}
              className="flex items-center justify-between rounded-lg border border-outline-variant/40 bg-surface-container-low/40 p-3"
            >
              <span className="num text-sm text-tertiary">{r.date}</span>
              <StatusPill tone={r.status as "present" | "late" | "absent" | "excused"}>
                {String(r.status).toUpperCase()}
              </StatusPill>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "present" | "absent" | "late";
}) {
  const c =
    tone === "present"
      ? "text-status-present"
      : tone === "absent"
        ? "text-status-absent"
        : tone === "late"
          ? "text-status-late"
          : "text-primary";
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-tertiary">{label}</p>
      <p className={`mt-1 num font-display text-3xl font-extrabold ${c}`}>{value}</p>
    </Card>
  );
}
