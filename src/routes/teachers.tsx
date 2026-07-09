import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Card, StatusPill } from "@/components/AppShell";
import { Icon } from "@/components/Icon";

export const Route = createFileRoute("/teachers")({
  head: () => ({
    meta: [
      { title: "Teacher Management — AttendCloud" },
      { name: "description", content: "Manage staff accounts and teaching assignments across departments." },
      { property: "og:title", content: "Teacher Management — AttendCloud" },
      { property: "og:description", content: "Searchable teacher roster with departments, assignments, and status." },
    ],
  }),
  component: TeachersPage,
});

type Teacher = {
  id: string; name: string; dept: string; email: string; classes: string[]; status: "active" | "inactive"; initials: string;
};

const teachers: Teacher[] = [
  { id: "TCH-9042", name: "Dr. Robert Chen", dept: "Mathematics", email: "rchen@horizon.edu", classes: ["Calc 301", "Alg 102"], status: "active", initials: "RC" },
  { id: "TCH-8821", name: "Sarah Al-Fayed", dept: "Science", email: "salfayed@horizon.edu", classes: ["Bio 201", "Chem 302"], status: "active", initials: "SA" },
  { id: "TCH-7539", name: "Elena Rodriguez", dept: "History", email: "erodriguez@horizon.edu", classes: ["Unassigned"], status: "inactive", initials: "ER" },
  { id: "TCH-9102", name: "Marcus Johnson", dept: "Physical Ed", email: "mjohnson@horizon.edu", classes: ["PE 101", "Health 201"], status: "active", initials: "MJ" },
  { id: "TCH-6420", name: "Priya Patel", dept: "English", email: "ppatel@horizon.edu", classes: ["Lit 201", "Comp 102"], status: "active", initials: "PP" },
  { id: "TCH-5511", name: "Samuel Rivera", dept: "Computer Science", email: "srivera@horizon.edu", classes: ["ICT 302", "AI 401"], status: "active", initials: "SR" },
];

function TeachersPage() {
  return (
    <AppShell
      title="Teacher Management"
      subtitle="Manage staff accounts and teaching assignments."
      actions={
        <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110">
          <Icon name="person_add" size={18} />
          <span>Add New Teacher</span>
        </button>
      }
    >
      <Card className="mb-6 flex flex-wrap items-center gap-4 p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Icon name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
          <input placeholder="Search by name, ID, or email…" className="h-10 w-full rounded-lg border border-outline-variant bg-surface pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
        <select className="h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm">
          <option>All Departments</option><option>Mathematics</option><option>Science</option><option>History</option>
        </select>
        <select className="h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm">
          <option>All Statuses</option><option>Active</option><option>Inactive</option>
        </select>
        <button className="flex items-center gap-1 text-sm text-tertiary hover:text-foreground">
          <Icon name="filter_list" size={16} /> More Filters
        </button>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-outline-variant bg-surface-container-low/50">
              <tr className="text-left">
                {["TEACHER", "ID & CONTACT", "ASSIGNED CLASSES", "STATUS", ""].map((h, i) => (
                  <th key={i} className={`px-6 py-3 text-xs font-bold uppercase tracking-widest text-tertiary ${i === 4 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id} className="border-b border-outline-variant/40 last:border-0 transition hover:bg-surface-container-low/40">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-primary">{t.initials}</div>
                      <div>
                        <p className="font-semibold text-foreground">{t.name}</p>
                        <p className="text-xs text-tertiary">{t.dept}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="num text-sm">{t.id}</p>
                    <p className="text-xs text-tertiary">{t.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {t.classes.map((c) => (
                        <span key={c} className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-medium text-tertiary">{c}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {t.status === "active"
                      ? <StatusPill tone="present" icon="check_circle">Active</StatusPill>
                      : <StatusPill tone="neutral" icon="pause_circle">Inactive</StatusPill>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="rounded p-1.5 text-tertiary transition hover:bg-surface-container hover:text-primary" aria-label="Edit"><Icon name="edit" size={18} /></button>
                      <Link to="/faculty" className="rounded p-1.5 text-tertiary transition hover:bg-surface-container hover:text-primary" aria-label="View"><Icon name="visibility" size={18} /></Link>
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
