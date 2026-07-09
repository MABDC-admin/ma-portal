import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Card, StatusPill } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/_director/dll/")({
  head: () => ({
    meta: [
      { title: "DLL Review Portal — AttendCloud" },
      { name: "description", content: "Review Daily Lesson Log submissions." },
    ],
  }),
  component: DllPortal,
});

type DllStatus = "draft" | "submitted" | "approved" | "returned";

type DllRow = {
  id: string;
  subject: string;
  lesson_date: string;
  status: DllStatus;
  submitted_at: string | null;
  teacher_id: string;
  section_id: string | null;
  profiles: { email: string | null; full_name: string | null } | null;
  sections: { name: string | null } | null;
};

function DllPortal() {
  const [filter, setFilter] = useState<DllStatus | "all">("submitted");

  const dllsQ = useQuery({
    queryKey: ["dlls-all", filter],
    queryFn: async () => {
      let q = supabase
        .from("dlls")
        .select("id, subject, lesson_date, status, submitted_at, teacher_id, section_id, profiles:teacher_id(email, full_name), sections:section_id(name)")
        .order("submitted_at", { ascending: false, nullsFirst: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as DllRow[];
    },
  });

  const kpiQ = useQuery({
    queryKey: ["dll-kpis"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dlls").select("status");
      if (error) throw error;
      const c = { draft: 0, submitted: 0, approved: 0, returned: 0 };
      for (const r of data ?? []) c[r.status as DllStatus]++;
      const total = (data ?? []).length;
      return { ...c, total, compliance: total ? Math.round((c.approved / total) * 100) : 0 };
    },
  });

  const kpis = [
    { icon: "upload_file", label: "Total DLLs", value: kpiQ.data?.total ?? 0 },
    { icon: "pending_actions", label: "Pending Review", value: kpiQ.data?.submitted ?? 0 },
    { icon: "assignment_return", label: "Returned", value: kpiQ.data?.returned ?? 0 },
    { icon: "verified", label: "Approved", value: kpiQ.data?.approved ?? 0 },
  ];

  return (
    <AppShell title="DLL Review Portal" subtitle="Monitor Daily Lesson Log submissions across faculty.">
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

      <Card className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-lg font-bold">Submissions</h3>
          <div className="flex gap-1 rounded-lg bg-surface-container p-1 text-xs font-semibold">
            {(["submitted", "approved", "returned", "draft", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={"rounded-md px-3 py-1 " + (filter === f ? "bg-surface shadow-sm" : "text-tertiary")}
              >{f}</button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-tertiary">
                <th className="px-4 py-3">Teacher</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3">Lesson Date</th>
                <th className="px-4 py-3">Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {dllsQ.isLoading && <tr><td colSpan={6} className="px-4 py-6 text-center text-tertiary">Loading…</td></tr>}
              {dllsQ.data?.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-tertiary">No submissions match this filter.</td></tr>}
              {dllsQ.data?.map((d) => (
                <tr key={d.id} className="border-t border-outline-variant/40 hover:bg-surface-container-low/40">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{d.profiles?.full_name || d.profiles?.email || "—"}</p>
                    <p className="text-xs text-tertiary">{d.profiles?.email}</p>
                  </td>
                  <td className="px-4 py-3">{d.subject}</td>
                  <td className="px-4 py-3 text-tertiary">{d.sections?.name || "—"}</td>
                  <td className="px-4 py-3 num">{d.lesson_date}</td>
                  <td className="px-4 py-3">
                    {d.status === "submitted" && <StatusPill tone="late" icon="pending">Pending</StatusPill>}
                    {d.status === "approved" && <StatusPill tone="present" icon="check_circle">Approved</StatusPill>}
                    {d.status === "returned" && <StatusPill tone="absent" icon="assignment_return">Returned</StatusPill>}
                    {d.status === "draft" && <StatusPill tone="neutral" icon="edit">Draft</StatusPill>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to="/dll/$id" params={{ id: d.id }} className="rounded-lg bg-primary-container/40 px-4 py-1.5 text-xs font-semibold text-primary hover:bg-primary-container/60">
                      Review
                    </Link>
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
