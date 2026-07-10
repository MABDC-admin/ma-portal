import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card, StatusPill } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/_director/faculty")({
  head: () => ({
    meta: [
      { title: "Faculty Directory — AttendCloud" },
      { name: "description", content: "Faculty roster with DLL compliance signals." },
    ],
  }),
  component: FacultyPage,
});

function FacultyPage() {
  const teachersQ = useQuery({
    queryKey: ["faculty-teachers"],
    queryFn: async () => {
      const { getFacultyTeachersFn } = await import("@/lib/director-faculty.functions");
      return await getFacultyTeachersFn();
    },
  });

  const dllsQ = useQuery({
    queryKey: ["faculty-dll-counts"],
    queryFn: async () => {
      const { getFacultyDllCountsFn } = await import("@/lib/director-faculty.functions");
      return await getFacultyDllCountsFn();
    },
  });

  const teachers = teachersQ.data ?? [];
  const totalActive = teachers.filter((t) => t.status === "active").length;
  const totals = Object.values(dllsQ.data ?? {}).reduce(
    (acc, t) => ({
      total: acc.total + t.total,
      approved: acc.approved + t.approved,
      submitted: acc.submitted + t.submitted,
    }),
    { total: 0, approved: 0, submitted: 0 },
  );
  const compliance = totals.total ? Math.round((totals.approved / totals.total) * 100) : 0;

  const kpis = [
    { icon: "groups", label: "Total Faculty", value: teachers.length },
    { icon: "person_check", label: "Active", value: totalActive },
    { icon: "assignment_turned_in", label: "DLL Compliance (30d)", value: `${compliance}%` },
    { icon: "rate_review", label: "Pending Review", value: totals.submitted },
  ];

  return (
    <AppShell
      title="Faculty Directory"
      subtitle="Faculty roster with DLL compliance signals (last 30 days)."
    >
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container/40 text-primary">
              <Icon name={k.icon} filled />
            </div>
            <p className="mt-4 text-xs uppercase tracking-widest text-tertiary">{k.label}</p>
            <p className="mt-1 num font-display text-3xl font-extrabold">{k.value}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low/50 text-left">
              <tr>
                <th className="px-6 py-3 text-xs font-bold uppercase tracking-widest text-tertiary">
                  Teacher
                </th>
                <th className="px-6 py-3 text-xs font-bold uppercase tracking-widest text-tertiary">
                  Department
                </th>
                <th className="px-6 py-3 text-xs font-bold uppercase tracking-widest text-tertiary">
                  DLLs (30d)
                </th>
                <th className="px-6 py-3 text-xs font-bold uppercase tracking-widest text-tertiary">
                  Compliance
                </th>
                <th className="px-6 py-3 text-xs font-bold uppercase tracking-widest text-tertiary">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {teachersQ.isLoading && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-tertiary">
                    Loading…
                  </td>
                </tr>
              )}
              {teachers.length === 0 && !teachersQ.isLoading && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-tertiary">
                    No teachers yet.
                  </td>
                </tr>
              )}
              {teachers.map((t) => {
                const p = t.profiles as unknown as {
                  email: string | null;
                  full_name: string | null;
                } | null;
                const name = p?.full_name || p?.email || t.employee_id;
                const stats = dllsQ.data?.[t.user_id];
                const rate =
                  stats && stats.total ? Math.round((stats.approved / stats.total) * 100) : null;
                const tone: "present" | "late" | "absent" | "neutral" =
                  rate === null
                    ? "neutral"
                    : rate >= 80
                      ? "present"
                      : rate >= 50
                        ? "late"
                        : "absent";
                const label =
                  rate === null
                    ? "No data"
                    : rate >= 80
                      ? "Up-to-date"
                      : rate >= 50
                        ? "Under review"
                        : "Overdue";
                return (
                  <tr
                    key={t.user_id}
                    className="border-t border-outline-variant/40 hover:bg-surface-container-low/40"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-primary">
                          {name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{name}</p>
                          <p className="text-xs text-tertiary num">{t.employee_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{t.department}</td>
                    <td className="px-6 py-4 num text-tertiary">
                      {stats ? `${stats.approved}/${stats.total} approved` : "0"}
                    </td>
                    <td className="px-6 py-4 num">{rate === null ? "—" : `${rate}%`}</td>
                    <td className="px-6 py-4">
                      <StatusPill tone={tone}>{label}</StatusPill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
