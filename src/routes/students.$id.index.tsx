import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Card } from "@/components/AppShell";
import { Icon } from "@/components/Icon";

export const Route = createFileRoute("/students/$id/")({
  head: () => ({
    meta: [
      { title: "Student Profile — AttendCloud" },
      { name: "description", content: "Attendance overview, subject breakdown, and recent activity for a student." },
      { property: "og:title", content: "Student Profile — AttendCloud" },
      { property: "og:description", content: "30-day attendance trend, subject breakdown, and recent activity log." },
    ],
  }),
  component: StudentProfile,
});

const trend = [95, 100, 100, 90, 40, 100, 100, 85, 95, 70, 100, 100, 100, 100, 95, 100, 0, 100, 100, 95, 100, 100, 100, 90, 100, 100, 88, 100, 92, 100];
const subjects = [
  { name: "Physics 202", rate: 96 },
  { name: "Calculus II", rate: 88 },
  { name: "Biology 101", rate: 92 },
  { name: "English Lit", rate: 100 },
  { name: "World History", rate: 84 },
];

function StudentProfile() {
  const { id } = Route.useParams() as { id: string };
  const displayName = id.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join(" ");
  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-tertiary">
          <Link to="/faculty" className="hover:text-foreground">Students</Link>
          <Icon name="chevron_right" size={16} />
          <span className="font-medium text-foreground">{displayName}</span>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-container">
            <Icon name="edit" size={16} /> Edit Profile
          </button>
          <Link to="/students/$id/attendance" params={{ id }} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110">
            <Icon name="download" size={16} /> Export Report
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <Card className="relative col-span-12 flex flex-col items-center overflow-hidden p-8 text-center lg:col-span-4">
          <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-primary/5" />
          <div className="relative mb-4 h-24 w-24 rounded-full bg-primary-container p-1">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
              {displayName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div className="absolute bottom-1 right-1 h-6 w-6 rounded-full border-2 border-surface bg-status-present" />
          </div>
          <h2 className="font-display text-2xl font-extrabold text-foreground">{displayName}</h2>
          <div className="mt-2 flex items-center gap-2 text-xs text-tertiary">
            <span className="num rounded-full bg-surface-container px-2 py-0.5 font-semibold">STU-8821</span>
            <span>Grade 11</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-tertiary">
            <Icon name="mail" size={16} />
            <span>{id}@horizon.edu</span>
          </div>
          <Link to="/students/$id/attendance" params={{ id }} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-container/40 py-2 text-sm font-semibold text-primary hover:bg-primary-container/60">
            View Full Attendance
          </Link>
        </Card>

        <div className="col-span-12 grid grid-cols-2 gap-4 lg:col-span-8 md:grid-cols-4">
          <Metric label="Overall Attendance" value="92%" delta="+2% this month" deltaTone="up" icon="monitoring" tone="primary" />
          <Metric label="Enrolled Classes" value="6" delta="Fall Semester 2024" icon="local_library" tone="neutral" />
          <Metric label="Days Present" value="112" delta="YTD Total" icon="check_circle" tone="present" />
          <Metric label="Total Absences" value="8" delta="Requires Review" deltaTone="warn" deltaIcon="warning" icon="cancel" tone="absent" />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="col-span-1 flex flex-col p-6 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-foreground">30-Day Attendance Trend</h3>
            <div className="flex gap-1 rounded-lg bg-surface-container p-1 text-xs font-semibold">
              <button className="rounded-md bg-surface px-3 py-1 shadow-sm">Last 30 Days</button>
              <button className="px-3 py-1 text-tertiary">This Semester</button>
              <button className="px-3 py-1 text-tertiary">YTD</button>
            </div>
          </div>
          <div className="relative flex h-[220px] items-end gap-1 border-b border-outline-variant pb-2 pl-8">
            <div className="absolute left-0 top-0 flex h-full flex-col justify-between text-[10px] text-tertiary num">
              <span>100</span><span>75</span><span>50</span><span>25</span><span>0</span>
            </div>
            {trend.map((h, i) => {
              const tone = h === 0 ? "bg-status-absent/40" : h < 50 ? "bg-status-absent/40" : h < 80 ? "bg-status-late/50" : "bg-primary/50 hover:bg-primary";
              return (
                <div key={i} title={`Day ${i + 1}: ${h}%`} className={`w-full rounded-t-sm transition-all ${tone}`} style={{ height: `${Math.max(h, 4)}%` }} />
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 font-display text-lg font-bold text-foreground">Subject Breakdown</h3>
          <div className="space-y-4">
            {subjects.map((s) => (
              <div key={s.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className="num text-xs text-tertiary">{s.rate}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container">
                  <div className={"h-full rounded-full " + (s.rate >= 90 ? "bg-status-present" : s.rate >= 85 ? "bg-primary" : "bg-status-late")} style={{ width: `${s.rate}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <h3 className="mb-4 font-display text-lg font-bold text-foreground">Recent Activity Log</h3>
        <div className="space-y-3">
          {[
            { d: "Oct 25", txt: "Marked Present in Physics 202", icon: "check_circle", tone: "present" as const },
            { d: "Oct 24", txt: "Late arrival to Calculus II (11 min)", icon: "schedule", tone: "late" as const },
            { d: "Oct 22", txt: "Excused absence: Family emergency", icon: "info", tone: "excused" as const },
            { d: "Oct 21", txt: "Marked Present in Biology 101", icon: "check_circle", tone: "present" as const },
          ].map((row, i) => (
            <div key={i} className="flex items-center gap-4 rounded-lg border border-outline-variant/40 bg-surface-container-low/40 p-3">
              <div className={
                "flex h-9 w-9 items-center justify-center rounded-full " +
                (row.tone === "present" ? "bg-status-present/10 text-status-present"
                  : row.tone === "late" ? "bg-status-late/15 text-status-late"
                  : "bg-status-excused/10 text-status-excused")
              }>
                <Icon name={row.icon} size={18} filled />
              </div>
              <p className="flex-1 text-sm">{row.txt}</p>
              <span className="num text-xs text-tertiary">{row.d}</span>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}

function Metric({ label, value, delta, deltaTone = "neutral", deltaIcon, icon, tone }: {
  label: string; value: string; delta: string; deltaTone?: "up" | "warn" | "neutral"; deltaIcon?: string; icon: string; tone: "primary" | "present" | "absent" | "neutral";
}) {
  const iconBg = tone === "primary" ? "bg-primary-container/40 text-primary" : tone === "present" ? "bg-status-present/10 text-status-present" : tone === "absent" ? "bg-status-absent/10 text-status-absent" : "bg-surface-container text-tertiary";
  const dc = deltaTone === "up" ? "text-status-present" : deltaTone === "warn" ? "text-status-late" : "text-tertiary";
  const dIcon = deltaIcon ?? (deltaTone === "up" ? "trending_up" : "");
  return (
    <Card className="flex flex-col justify-between p-5">
      <div className="mb-4 flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-tertiary">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${iconBg}`}><Icon name={icon} size={16} filled /></div>
      </div>
      <div>
        <p className="num font-display text-3xl font-extrabold text-foreground">{value}</p>
        <p className={`mt-1 flex items-center gap-1 text-xs ${dc}`}>
          {dIcon && <Icon name={dIcon} size={14} />}
          <span>{delta}</span>
        </p>
      </div>
    </Card>
  );
}
