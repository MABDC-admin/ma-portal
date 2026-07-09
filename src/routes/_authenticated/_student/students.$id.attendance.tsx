import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Card, StatusPill } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_student/students/$id/attendance")({
  head: () => ({ meta: [{ title: "Attendance — AttendCloud" }] }),
  component: AttendanceProfile,
});

type Status = "present" | "late" | "absent" | "excused";

function AttendanceProfile() {
  const { id } = Route.useParams();

  const attendanceQ = useQuery({
    queryKey: ["student-attendance-full", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("date, status, notes")
        .eq("student_id", id)
        .order("date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const records = attendanceQ.data ?? [];
  const counts = { present: 0, late: 0, absent: 0, excused: 0 };
  for (const r of records) counts[r.status as Status]++;
  const total = records.length || 1;
  const rate = Math.round(((counts.present + counts.late) / total) * 100);

  // Build current-month calendar
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (first.getDay() + 6) % 7; // Monday-first
  const byDate = new Map<string, Status>();
  for (const r of records) byDate.set(r.date, r.status as Status);
  const cells: Array<{ n: number; s: Status | "empty" | "off" | "none" }> = [];
  for (let i = 0; i < leading; i++) cells.push({ n: 0, s: "empty" });
  for (let d = 1; d <= daysInMonth; d++) {
    const key = new Date(year, month, d).toISOString().slice(0, 10);
    const dow = new Date(year, month, d).getDay();
    if (byDate.has(key)) cells.push({ n: d, s: byDate.get(key)! });
    else if (dow === 0 || dow === 6) cells.push({ n: d, s: "off" });
    else cells.push({ n: d, s: "none" });
  }

  return (
    <AppShell>
      <div className="mb-6 flex items-center gap-2 text-sm text-tertiary">
        <Link to="/students/$id" params={{ id }} className="hover:text-foreground">Profile</Link>
        <Icon name="chevron_right" size={16} />
        <span className="font-medium text-foreground">Attendance</span>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Rate" value={`${rate}%`} tone="primary" />
        <Kpi label="Present" value={counts.present} tone="present" />
        <Kpi label="Late" value={counts.late} tone="late" />
        <Kpi label="Absent" value={counts.absent} tone="absent" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-4 font-display text-lg font-bold">{first.toLocaleString(undefined, { month: "long", year: "numeric" })}</h3>
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-tertiary">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <div key={i}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center num text-sm">
            {cells.map((c, i) => {
              if (c.s === "empty") return <div key={i} className="p-2" />;
              const cls =
                c.s === "present" ? "bg-status-present/10 text-status-present"
                : c.s === "late" ? "bg-status-late/15 text-status-late"
                : c.s === "absent" ? "bg-status-absent/10 text-status-absent"
                : c.s === "excused" ? "bg-status-excused/10 text-status-excused"
                : c.s === "off" ? "bg-surface-container/50 text-tertiary/50"
                : "bg-surface-container text-tertiary";
              return <div key={i} className={`rounded-md p-2 font-medium ${cls}`}>{c.n}</div>;
            })}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 font-display text-lg font-bold">Detailed Log</h3>
          {records.length === 0 && <p className="text-sm text-tertiary">No attendance records yet.</p>}
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <tbody>
                {records.map((r) => (
                  <tr key={r.date} className="border-b border-outline-variant/40 last:border-0">
                    <td className="py-3 num text-tertiary">{r.date}</td>
                    <td className="py-3 text-right">
                      <StatusPill tone={r.status as Status}>{String(r.status).toUpperCase()}</StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string | number; tone: "primary" | "present" | "late" | "absent" }) {
  const c = tone === "present" ? "text-status-present" : tone === "late" ? "text-status-late" : tone === "absent" ? "text-status-absent" : "text-primary";
  return (
    <Card className="p-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-tertiary">{label}</p>
      <p className={`num font-display text-3xl font-extrabold ${c}`}>{value}</p>
    </Card>
  );
}
