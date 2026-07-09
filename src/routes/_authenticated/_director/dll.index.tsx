import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Card, StatusPill } from "@/components/AppShell";
import { Icon } from "@/components/Icon";

export const Route = createFileRoute("/dll/")({
  head: () => ({
    meta: [
      { title: "DLL Review Portal — AttendCloud" },
      { name: "description", content: "Monitor Daily Lesson Log compliance across all departments and review pending submissions." },
      { property: "og:title", content: "DLL Review Portal — AttendCloud" },
      { property: "og:description", content: "Director dashboard for reviewing Daily Lesson Logs across departments." },
    ],
  }),
  component: DllPortal,
});

const kpis = [
  { icon: "upload_file", label: "Total Submissions", value: "342", delta: "+12% ↑", deltaTone: "up" },
  { icon: "pending_actions", label: "Pending Review", value: "24", delta: "Action Needed", deltaTone: "warn" },
  { icon: "assignment_return", label: "Needs Revision", value: "45", delta: "Track weekly", deltaTone: "neutral" },
  { icon: "verified", label: "Compliance", value: "92.4%", delta: "Above target", deltaTone: "up" },
] as const;

const queue = [
  { name: "Elena Rodriguez", dept: "Science Dept.", when: "Oct 24, 2023 · 08:30 AM", subject: "Advanced Biology", section: "Grade 11 - Einstein", status: "pending" as const, initials: "ER" },
  { name: "Marcus Thorne", dept: "History Dept.", when: "Oct 23, 2023 · 04:15 PM", subject: "World Civilizations", section: "Grade 10 - Socrates", status: "approved" as const, initials: "MT" },
  { name: "Dr. Samuel Rivera", dept: "CS Dept.", when: "Oct 24, 2023 · 07:45 AM", subject: "Advanced Machine Learning Models", section: "Grade 12 - Einstein", status: "pending" as const, initials: "SR" },
  { name: "Priya Patel", dept: "English Dept.", when: "Oct 22, 2023 · 02:00 PM", subject: "Modern Poetry", section: "Grade 11 - Curie", status: "revision" as const, initials: "PP" },
];

function DllPortal() {
  return (
    <AppShell
      title="DLL Review Portal"
      subtitle="Monitoring Daily Lesson Log compliance across all departments."
      actions={
        <div className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface px-4 py-2 text-sm">
          <Icon name="calendar_today" size={16} className="text-tertiary" />
          <span className="font-medium">Term 2, Week 7</span>
        </div>
      }
    >
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="flex flex-col justify-between p-5">
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container/40 text-primary">
                <Icon name={k.icon} filled />
              </div>
              <span className={
                "text-xs font-bold " + (k.deltaTone === "up" ? "text-status-present" : k.deltaTone === "warn" ? "text-status-late" : "text-tertiary")
              }>{k.delta}</span>
            </div>
            <div className="mt-4">
              <p className="text-xs uppercase tracking-widest text-tertiary">{k.label}</p>
              <p className="mt-1 num font-display text-3xl font-extrabold">{k.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Submissions Queue</h3>
            <button className="text-sm font-semibold text-primary hover:underline">View all</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-tertiary">
                  <th className="px-4 py-3">Teacher</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Section</th><th className="px-4 py-3">Status</th><th />
                </tr>
              </thead>
              <tbody>
                {queue.map((q) => (
                  <tr key={q.name + q.when} className="border-t border-outline-variant/40 hover:bg-surface-container-low/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-primary">{q.initials}</div>
                        <div>
                          <p className="font-semibold">{q.name}</p>
                          <p className="text-xs text-tertiary">{q.dept}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 num text-tertiary text-xs">{q.when}</td>
                    <td className="px-4 py-3">{q.subject}</td>
                    <td className="px-4 py-3 text-tertiary">{q.section}</td>
                    <td className="px-4 py-3">
                      {q.status === "pending" && <StatusPill tone="late" icon="pending">Pending</StatusPill>}
                      {q.status === "approved" && <StatusPill tone="present" icon="check_circle">Approved</StatusPill>}
                      {q.status === "revision" && <StatusPill tone="absent" icon="assignment_return">Revision</StatusPill>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to="/dll/$id" params={{ id: q.name.toLowerCase().replace(/[^a-z]/g, "-") }} className="rounded-lg bg-primary-container/40 px-4 py-1.5 text-xs font-semibold text-primary hover:bg-primary-container/60">
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-4 font-display text-lg font-bold">Submission Trends</h3>
            <div className="flex h-40 items-end gap-2">
              {[60, 72, 65, 80, 88, 75, 92, 85, 90, 95, 88, 96].map((v, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-t-md bg-gradient-to-t from-primary/80 to-primary/40" style={{ height: `${v}%` }} />
                  <span className="text-[9px] text-tertiary num">{i + 1}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-tertiary">Weekly submissions over the current term.</p>
          </Card>

          <Card className="p-6">
            <h3 className="mb-2 font-display text-lg font-bold">Director's Memo</h3>
            <p className="text-sm text-tertiary">
              Please prioritize reviews for the STEM strand this week. Two Physics logs are past the 48-hour SLA — expedite feedback and flag any missing MELCs.
            </p>
            <button className="mt-4 flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
              <Icon name="edit_note" size={16} /> Update memo
            </button>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
