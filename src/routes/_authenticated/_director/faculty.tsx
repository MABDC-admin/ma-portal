import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card, StatusPill } from "@/components/AppShell";
import { Icon } from "@/components/Icon";

export const Route = createFileRoute("/_authenticated/_director/faculty")({
  head: () => ({
    meta: [
      { title: "Faculty Directory — Horizon Academy" },
      { name: "description", content: "Monitor academic staff performance, DLL compliance, and department assignments." },
      { property: "og:title", content: "Faculty Directory — Horizon Academy" },
      { property: "og:description", content: "Directory of every teacher at Horizon Academy with compliance and workload signals." },
    ],
  }),
  component: FacultyPage,
});

const kpis = [
  { icon: "groups", tone: "primary", label: "Total Faculty", value: "124", delta: "+4%", deltaTone: "up" },
  { icon: "person_check", tone: "secondary", label: "Active Teachers", value: "118", delta: "98% Active", deltaTone: "neutral" },
  { icon: "assignment_turned_in", tone: "late", label: "DLL Compliance Rate", value: "89.2%", delta: "-2.5%", deltaTone: "down" },
  { icon: "rate_review", tone: "absent", label: "Pending Reviews", value: "12", delta: "Priority", deltaTone: "warn" },
] as const;

const faculty = [
  { name: "Elena Rodriguez", id: "2024-0012", dept: "Science", classes: ["Grade 11 - Einstein", "General Chemistry 2"], status: "up-to-date" as const, initials: "ER" },
  { name: "Marcus Thorne", id: "2023-0088", dept: "History", classes: ["Grade 10 - Socrates", "World Civilizations"], status: "up-to-date" as const, initials: "MT" },
  { name: "Dr. Samuel Rivera", id: "2022-0041", dept: "Computer Science", classes: ["Grade 12 - Einstein", "Advanced ICT"], status: "review" as const, initials: "SR" },
  { name: "Priya Patel", id: "2024-0031", dept: "English", classes: ["Grade 11 - Curie", "Composition"], status: "overdue" as const, initials: "PP" },
  { name: "Robert Chen", id: "2021-0019", dept: "Mathematics", classes: ["Grade 12 - Newton", "Calculus III"], status: "up-to-date" as const, initials: "RC" },
];

function FacultyPage() {
  return (
    <AppShell
      title="Faculty Directory"
      subtitle="Manage and monitor academic staff performance and compliance."
      actions={
        <button className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-md transition hover:brightness-110">
          <Icon name="person_add" size={18} />
          <span>Add New Teacher</span>
        </button>
      }
    >
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-5">
            <div className="flex items-start justify-between">
              <div className={
                "flex h-11 w-11 items-center justify-center rounded-xl " +
                (k.tone === "primary" ? "bg-primary-container/40 text-primary"
                  : k.tone === "secondary" ? "bg-secondary/15 text-secondary"
                  : k.tone === "late" ? "bg-status-late/15 text-status-late"
                  : "bg-status-absent/10 text-status-absent")
              }>
                <Icon name={k.icon} filled />
              </div>
              <span className={
                "text-xs font-bold " +
                (k.deltaTone === "up" ? "text-status-present"
                  : k.deltaTone === "down" ? "text-status-absent"
                  : k.deltaTone === "warn" ? "text-status-late"
                  : "text-tertiary")
              }>{k.delta}</span>
            </div>
            <div className="mt-4">
              <p className="text-xs uppercase tracking-widest text-tertiary">{k.label}</p>
              <p className="mt-1 num font-display text-3xl font-extrabold text-foreground">{k.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden rounded-3xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant/50 p-6">
          <div className="flex flex-wrap gap-2">
            {[
              { label: "All Staff", count: 124, active: true },
              { label: "STEM" }, { label: "ABM" }, { label: "HUMSS" }, { label: "GAS" },
            ].map((t) => (
              <button key={t.label} className={
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition " +
                (t.active ? "bg-primary-container/40 text-primary" : "text-tertiary hover:bg-surface-container")
              }>
                <span>{t.label}</span>
                {t.count && <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{t.count}</span>}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-tertiary hover:bg-surface-container">
              <Icon name="filter_list" size={16} /> More Filters
            </button>
            <button className="flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-tertiary hover:bg-surface-container">
              <Icon name="download" size={16} /> Export
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low/50">
              <tr className="text-left">
                {["Teacher Name", "Department", "Handled Classes", "DLL Status", ""].map((h, i) => (
                  <th key={i} className={`px-6 py-4 text-xs font-bold uppercase tracking-widest text-tertiary ${i === 4 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {faculty.map((f) => (
                <tr key={f.id} className="border-t border-outline-variant/40 transition hover:bg-surface-container-low/40">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-primary shadow-sm">{f.initials}</div>
                      <div>
                        <p className="font-semibold text-foreground">{f.name}</p>
                        <p className="text-xs text-tertiary num">ID: {f.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{f.dept}</td>
                  <td className="px-6 py-4">
                    {f.classes.map((c) => (<p key={c} className="text-xs text-tertiary first:text-sm first:text-foreground first:font-medium">{c}</p>))}
                  </td>
                  <td className="px-6 py-4">
                    {f.status === "up-to-date" && <StatusPill tone="present" icon="check_circle">Up-to-Date</StatusPill>}
                    {f.status === "review" && <StatusPill tone="late" icon="rate_review">Under Review</StatusPill>}
                    {f.status === "overdue" && <StatusPill tone="absent" icon="warning">Overdue</StatusPill>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="rounded-lg p-2 text-primary transition hover:bg-primary/10" aria-label="View"><Icon name="visibility" size={18} /></button>
                      <button className="rounded-lg p-2 text-tertiary transition hover:bg-surface-container" aria-label="More"><Icon name="more_horiz" size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
