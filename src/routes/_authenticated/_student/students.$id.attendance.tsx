import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Card, StatusPill } from "@/components/AppShell";
import { Icon } from "@/components/Icon";

export const Route = createFileRoute("/_authenticated/_student/students/$id/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance Profile — AttendCloud" },
      { name: "description", content: "Detailed month calendar, trailing trends, and per-day attendance log for a student." },
      { property: "og:title", content: "Attendance Profile — AttendCloud" },
      { property: "og:description", content: "Attendance calendar, 3-month trailing trend, and detailed log." },
    ],
  }),
  component: AttendanceProfile,
});

type Day = { n: number; s: "present" | "late" | "absent" | "excused" | "off" | "today" | "empty" };
const month: Day[] = [
  { n: 0, s: "empty" }, { n: 0, s: "empty" },
  { n: 1, s: "present" }, { n: 2, s: "present" }, { n: 3, s: "late" }, { n: 4, s: "present" }, { n: 5, s: "off" }, { n: 6, s: "off" },
  { n: 7, s: "present" }, { n: 8, s: "absent" }, { n: 9, s: "present" }, { n: 10, s: "excused" }, { n: 11, s: "present" }, { n: 12, s: "off" }, { n: 13, s: "off" },
  { n: 14, s: "present" }, { n: 15, s: "today" }, { n: 16, s: "present" }, { n: 17, s: "present" }, { n: 18, s: "late" }, { n: 19, s: "off" }, { n: 20, s: "off" },
  { n: 21, s: "present" }, { n: 22, s: "present" }, { n: 23, s: "present" }, { n: 24, s: "present" }, { n: 25, s: "present" }, { n: 26, s: "off" }, { n: 27, s: "off" },
  { n: 28, s: "present" }, { n: 29, s: "present" }, { n: 30, s: "present" }, { n: 31, s: "present" },
];

const trend = [92, 95, 88, 90, 96, 94, 93, 97, 91, 94, 95, 96];

function AttendanceProfile() {
  const { id } = Route.useParams() as { id: string };
  const displayName = id.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join(" ");

  return (
    <AppShell>
      <div className="mb-4 flex items-center gap-2 text-sm text-tertiary">
        <Link to="/faculty" className="hover:text-foreground">Students</Link>
        <Icon name="chevron_right" size={16} />
        <span className="font-medium text-foreground">{displayName}</span>
      </div>

      <Card className="relative mb-6 flex flex-col gap-6 overflow-hidden p-6 md:flex-row md:items-center md:justify-between">
        <div className="absolute right-0 top-0 -mr-32 -mt-32 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative z-10 flex items-center gap-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-surface bg-primary-container text-2xl font-bold text-primary shadow-sm">
            {displayName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
          </div>
          <div>
            <h2 className="font-display text-3xl font-extrabold text-foreground">{displayName}</h2>
            <div className="mt-2 flex items-center gap-4 text-sm text-tertiary">
              <span className="flex items-center gap-1"><Icon name="badge" size={16} /> ID: 89452</span>
              <span className="flex items-center gap-1"><Icon name="menu_book" size={16} /> Grade 11</span>
            </div>
          </div>
        </div>
        <div className="relative z-10 grid w-full grid-cols-2 gap-3 md:w-auto md:grid-cols-4">
          {[
            { l: "Attendance", v: "94%", tone: "text-status-present" },
            { l: "Total Classes", v: "142", tone: "text-foreground" },
            { l: "Late", v: "4", tone: "text-status-late" },
            { l: "Absent", v: "3", tone: "text-status-absent" },
          ].map((s) => (
            <div key={s.l} className="min-w-[110px] rounded-lg border border-outline-variant bg-surface p-3">
              <p className="text-xs uppercase text-tertiary">{s.l}</p>
              <p className={`num font-display text-2xl font-extrabold ${s.tone}`}>{s.v}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="flex flex-col p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Attendance Trends</h3>
            <StatusPill tone="present" icon="trending_up">On Track</StatusPill>
          </div>
          <p className="mb-4 text-xs text-tertiary">3-Month Trailing Overview</p>
          <div className="relative flex h-[220px] items-end gap-2 border-b border-outline-variant pb-2">
            {trend.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t-md bg-gradient-to-t from-primary/80 to-primary/40" style={{ height: `${v}%` }} />
                <span className="num text-[10px] text-tertiary">W{i + 1}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 font-display text-lg font-bold">Current Month</h3>
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-tertiary">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <div key={i}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center num text-sm">
            {month.map((d, i) => {
              if (d.s === "empty") return <div key={i} className="p-2" />;
              const cls =
                d.s === "present" ? "bg-status-present/10 text-status-present"
                : d.s === "late" ? "bg-status-late/15 text-status-late"
                : d.s === "absent" ? "bg-status-absent/10 text-status-absent"
                : d.s === "excused" ? "bg-status-excused/10 text-status-excused"
                : d.s === "today" ? "border-2 border-primary text-primary font-bold"
                : "bg-surface-container text-tertiary";
              return <div key={i} className={`rounded-md p-2 font-medium ${cls}`}>{d.n}</div>;
            })}
          </div>
          <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs">
            {[
              { l: "Present", c: "bg-status-present" },
              { l: "Late", c: "bg-status-late" },
              { l: "Absent", c: "bg-status-absent" },
              { l: "Excused", c: "bg-status-excused" },
            ].map((k) => (
              <div key={k.l} className="flex items-center gap-1.5 text-tertiary">
                <span className={`h-2.5 w-2.5 rounded-full ${k.c}`} /> {k.l}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="mb-4 font-display text-lg font-bold">Detailed Log</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-tertiary">
                <th className="px-4 py-3">Date</th><th className="px-4 py-3">Class</th><th className="px-4 py-3">Check-in</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { d: "Oct 15", c: "Physics 202", t: "08:58", m: "Face ID", s: "present" as const },
                { d: "Oct 14", c: "Calculus II", t: "09:11", m: "PIN", s: "late" as const },
                { d: "Oct 11", c: "Biology 101", t: "—", m: "—", s: "excused" as const },
                { d: "Oct 09", c: "English Lit", t: "—", m: "—", s: "absent" as const },
                { d: "Oct 08", c: "History", t: "10:02", m: "QR", s: "present" as const },
              ].map((r, i) => (
                <tr key={i} className="border-t border-outline-variant/40">
                  <td className="px-4 py-3 num text-tertiary">{r.d}</td>
                  <td className="px-4 py-3 font-medium">{r.c}</td>
                  <td className="px-4 py-3 num">{r.t}</td>
                  <td className="px-4 py-3 text-tertiary">{r.m}</td>
                  <td className="px-4 py-3"><StatusPill tone={r.s}>{r.s.toUpperCase()}</StatusPill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
