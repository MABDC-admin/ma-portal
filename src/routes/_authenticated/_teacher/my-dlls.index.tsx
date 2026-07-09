import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Card, StatusPill } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyDllsFn } from "@/lib/teacher.functions";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/_teacher/my-dlls/")({
  head: () => ({ meta: [{ title: "My Lesson Logs — AttendCloud" }] }),
  component: MyDllsPage,
});

type Filter = "all" | "draft" | "submitted" | "approved" | "returned";

function MyDllsPage() {
  const listFn = useServerFn(listMyDllsFn);
  const [filter, setFilter] = useState<Filter>("all");
  const q = useQuery({
    queryKey: ["my-dlls-full"],
    queryFn: () => listFn(),
  });

  const rows = (q.data ?? []).filter((r) => (filter === "all" ? true : r.status === filter));
  const counts = { draft: 0, submitted: 0, approved: 0, returned: 0 };
  for (const r of q.data ?? []) counts[r.status as keyof typeof counts]++;

  return (
    <AppShell
      title="My Lesson Logs"
      subtitle="Every DLL you've drafted, submitted, or had reviewed."
      actions={
        <Link
          to="/dll/new"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-110"
        >
          <Icon name="note_add" size={18} /> New Entry
        </Link>
      }
    >
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Drafts" value={counts.draft} icon="edit" tone="neutral" />
        <Kpi label="Pending" value={counts.submitted} icon="pending" tone="late" />
        <Kpi label="Approved" value={counts.approved} icon="check_circle" tone="present" />
        <Kpi label="Returned" value={counts.returned} icon="assignment_return" tone="absent" />
      </div>

      <Card className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-lg font-bold">All submissions</h3>
          <div className="flex gap-1 rounded-lg bg-surface-container p-1 text-xs font-semibold">
            {(["all", "draft", "submitted", "approved", "returned"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={
                  "rounded-md px-3 py-1 capitalize " +
                  (filter === f ? "bg-surface shadow-sm" : "text-tertiary")
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {q.isLoading && <p className="text-sm text-tertiary">Loading…</p>}
        {!q.isLoading && rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-outline-variant p-8 text-center">
            <p className="text-sm text-tertiary">No lesson logs match this filter.</p>
            <Link
              to="/dll/new"
              className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
            >
              Create your first DLL →
            </Link>
          </div>
        )}

        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-tertiary">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Section</th>
                  <th className="px-4 py-3">Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => {
                  const section = (d as unknown as { sections: { name: string } | null }).sections;
                  return (
                    <tr
                      key={d.id}
                      className="border-t border-outline-variant/40 hover:bg-surface-container-low/40"
                    >
                      <td className="px-4 py-3 num">{d.lesson_date}</td>
                      <td className="px-4 py-3 font-medium">{d.subject}</td>
                      <td className="px-4 py-3 text-tertiary">{section?.name || "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={d.status as string} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to="/my-dlls/$id"
                          params={{ id: d.id }}
                          className="rounded-lg bg-primary-container/40 px-4 py-1.5 text-xs font-semibold text-primary hover:bg-primary-container/60"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AppShell>
  );
}

function Kpi({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: string;
  tone: "present" | "late" | "absent" | "neutral";
}) {
  const c =
    tone === "present"
      ? "text-status-present"
      : tone === "late"
        ? "text-status-late"
        : tone === "absent"
          ? "text-status-absent"
          : "text-tertiary";
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <Icon name={icon} className={c} filled />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-tertiary">{label}</p>
          <p className={`num font-display text-2xl font-extrabold ${c}`}>{value}</p>
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "draft")
    return (
      <StatusPill tone="neutral" icon="edit">
        Draft
      </StatusPill>
    );
  if (status === "submitted")
    return (
      <StatusPill tone="late" icon="pending">
        Submitted
      </StatusPill>
    );
  if (status === "approved")
    return (
      <StatusPill tone="present" icon="check_circle">
        Approved
      </StatusPill>
    );
  if (status === "returned")
    return (
      <StatusPill tone="absent" icon="assignment_return">
        Returned
      </StatusPill>
    );
  return <StatusPill tone="neutral">{status}</StatusPill>;
}
