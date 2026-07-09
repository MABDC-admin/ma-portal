import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Card, StatusPill } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/_teacher/")({
  head: () => ({
    meta: [
      { title: "Teacher Dashboard — AttendCloud" },
      { name: "description", content: "Your sections, attendance snapshot, and recent DLL activity." },
    ],
  }),
  component: TeacherHome,
});

function TeacherHome() {
  const { user } = useAuth();
  const uid = user?.id;

  const sectionsQ = useQuery({
    queryKey: ["my-sections", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sections")
        .select("id, name, grade_level, academic_year")
        .eq("adviser_id", uid!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const todayISO = new Date().toISOString().slice(0, 10);
  const attendanceQ = useQuery({
    queryKey: ["today-attendance", uid, todayISO],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("status, section_id")
        .eq("date", todayISO);
      if (error) throw error;
      return data ?? [];
    },
  });

  const dllsQ = useQuery({
    queryKey: ["my-dlls", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dlls")
        .select("id, subject, lesson_date, status")
        .eq("teacher_id", uid!)
        .order("lesson_date", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const counts = { present: 0, late: 0, absent: 0, excused: 0 };
  for (const a of attendanceQ.data ?? []) counts[a.status as keyof typeof counts]++;

  return (
    <AppShell
      title="Teacher Dashboard"
      subtitle="Your sections and lesson logs at a glance."
      actions={
        <Link to="/dll/new" className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-110">
          <Icon name="note_add" size={18} />
          <span>New DLL Entry</span>
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Present today" value={counts.present} tone="present" />
        <Kpi label="Late today" value={counts.late} tone="late" />
        <Kpi label="Absent today" value={counts.absent} tone="absent" />
        <Kpi label="Excused today" value={counts.excused} tone="neutral" />
      </div>

      <section className="mt-8">
        <h3 className="mb-3 font-display text-lg font-bold">My Sections</h3>
        {sectionsQ.isLoading && <p className="text-sm text-tertiary">Loading…</p>}
        {sectionsQ.data?.length === 0 && (
          <Card className="p-6 text-sm text-tertiary">You aren't assigned as adviser to any section yet.</Card>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sectionsQ.data?.map((s) => (
            <Card key={s.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-lg font-bold">{s.name}</p>
                  <p className="text-xs text-tertiary">Grade {s.grade_level} · SY {s.academic_year}</p>
                </div>
                <Icon name="groups" filled className="text-primary" />
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h3 className="mb-3 font-display text-lg font-bold">Recent Lesson Logs</h3>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-outline-variant bg-surface-container-low/50 text-left">
              <tr>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-tertiary">Date</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-tertiary">Subject</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-tertiary">Status</th>
              </tr>
            </thead>
            <tbody>
              {dllsQ.data?.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-tertiary">No lesson logs yet.</td></tr>}
              {dllsQ.data?.map((d) => (
                <tr key={d.id} className="border-b border-outline-variant/40 last:border-0">
                  <td className="px-4 py-3 num">{d.lesson_date}</td>
                  <td className="px-4 py-3 font-medium">{d.subject}</td>
                  <td className="px-4 py-3">
                    <DllStatus status={d.status as string} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </AppShell>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone: "present" | "late" | "absent" | "neutral" }) {
  const c = tone === "present" ? "text-status-present" : tone === "late" ? "text-status-late" : tone === "absent" ? "text-status-absent" : "text-tertiary";
  return (
    <Card className="p-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-tertiary">{label}</p>
      <p className={`num font-display text-3xl font-extrabold ${c}`}>{value}</p>
    </Card>
  );
}

function DllStatus({ status }: { status: string }) {
  if (status === "draft") return <StatusPill tone="neutral" icon="edit">Draft</StatusPill>;
  if (status === "submitted") return <StatusPill tone="late" icon="pending">Submitted</StatusPill>;
  if (status === "approved") return <StatusPill tone="present" icon="check_circle">Approved</StatusPill>;
  if (status === "returned") return <StatusPill tone="absent" icon="assignment_return">Returned</StatusPill>;
  return <StatusPill tone="neutral">{status}</StatusPill>;
}
