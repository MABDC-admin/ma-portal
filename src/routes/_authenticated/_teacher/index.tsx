import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card, StatusPill } from "@/components/AppShell";
import { Icon } from "@/components/Icon";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Live Attendance — AttendCloud" },
      { name: "description", content: "See today's attendance in real time, weekly summary, and recent check-ins." },
      { property: "og:title", content: "Live Attendance — AttendCloud" },
      { property: "og:description", content: "Real-time class check-in board with weekly summary and activity feed." },
    ],
  }),
  component: LivePage,
});

const week = [
  { d: "M", tone: "present" as const },
  { d: "T", tone: "present" as const },
  { d: "W", tone: "late" as const },
  { d: "T", tone: "present" as const },
  { d: "F", tone: "neutral" as const },
];

const activity = [
  { subject: "Physics 202", when: "Today, 09:12 AM", method: "Face ID", methodIcon: "face", status: "present", icon: "person_check" },
  { subject: "Calculus II", when: "Yesterday, 11:30 AM", method: "PIN", methodIcon: "dialpad", status: "late", icon: "schedule" },
  { subject: "Biology 101", when: "Oct 22, 08:00 AM", method: "QR Scan", methodIcon: "qr_code", status: "present", icon: "qr_code" },
  { subject: "English Lit", when: "Oct 21, 10:15 AM", method: "Face ID", methodIcon: "face", status: "present", icon: "person_check" },
] as const;

function LivePage() {
  return (
    <AppShell
      title="Live Attendance"
      subtitle="Punch-in feed, weekly trend, and your check-in status."
      actions={
        <>
          <button className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface-container">
            <Icon name="calendar_month" size={18} />
            <span>This week</span>
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110">
            <Icon name="fingerprint" size={18} />
            <span>Punch In</span>
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="relative overflow-hidden p-6 lg:col-span-2">
          <Icon name="check_circle" size={140} filled className="pointer-events-none absolute -right-4 -top-6 text-status-present/10" />
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-status-present">
            <Icon name="check_circle" size={18} filled />
            <span>Today's Status</span>
          </div>
          <p className="font-display text-4xl font-extrabold text-foreground">Present</p>
          <p className="mt-2 text-sm text-tertiary">
            Physics 202 · <span className="num">Punched in at 09:12 AM</span>
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground transition hover:brightness-110">
              <Icon name="qr_code_scanner" size={16} />
              View Ticket
            </button>
            <button className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface px-4 py-2 text-xs font-bold uppercase tracking-wider text-foreground transition hover:bg-surface-container">
              <Icon name="download" size={16} />
              Download Log
            </button>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-3 lg:col-span-1">
          <Kpi label="Overall Rate" value="94%" tone="present" />
          <Kpi label="On Time" value="88%" tone="primary" />
          <Kpi label="Absences" value="2" tone="absent" />
        </div>
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <h3 className="font-display text-lg font-bold">Weekly Summary</h3>
          <span className="num text-xs uppercase tracking-widest text-tertiary">OCT 21 – 25</span>
        </div>
        <Card className="p-6">
          <div className="flex items-end justify-between">
            {week.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-3">
                <span className="text-xs font-semibold text-tertiary">{day.d}</span>
                <div className={
                  "h-16 w-4 rounded-full " +
                  (day.tone === "present" ? "bg-status-present" : day.tone === "late" ? "bg-status-late" : "bg-surface-container-high")
                } />
                <div className={
                  "h-3 w-3 rounded-full " +
                  (day.tone === "present" ? "bg-status-present" : day.tone === "late" ? "bg-status-late" : "bg-surface-container-high")
                } />
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="mt-8">
        <h3 className="mb-3 font-display text-lg font-bold">Recent Activity</h3>
        <div className="flex flex-col gap-3">
          {activity.map((a) => (
            <Card key={a.subject + a.when} className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-start gap-4">
                <div className={
                  "flex h-10 w-10 items-center justify-center rounded-full " +
                  (a.status === "present" ? "bg-status-present/10 text-status-present" : "bg-status-late/15 text-status-late")
                }>
                  <Icon name={a.icon} size={20} filled />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{a.subject}</p>
                  <p className="text-xs text-tertiary num">{a.when}</p>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-tertiary">
                    <Icon name={a.methodIcon} size={14} />
                    <span>Method: {a.method}</span>
                  </div>
                </div>
              </div>
              <StatusPill tone={a.status as "present" | "late"}>{a.status.toUpperCase()}</StatusPill>
            </Card>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: "present" | "primary" | "absent" }) {
  const c = tone === "present" ? "text-status-present" : tone === "absent" ? "text-status-absent" : "text-primary";
  return (
    <Card className="flex flex-col items-center gap-1 p-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-tertiary">{label}</p>
      <p className={`num font-display text-2xl font-extrabold ${c}`}>{value}</p>
    </Card>
  );
}
