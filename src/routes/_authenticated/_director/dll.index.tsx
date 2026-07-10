import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";

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
  profiles: { email: string | null; full_name: string | null; avatar_url: string | null } | null;
  sections: { name: string | null; grade_level: number } | null;
  teachers: { department: string } | null;
};

function DllPortal() {
  const [statusFilter, setStatusFilter] = useState<string>("All Status");
  const [deptFilter, setDeptFilter] = useState<string>("All Departments");

  const dllsQ = useQuery({
    queryKey: ["dlls-all", statusFilter, deptFilter],
    queryFn: async () => {
      const { listDllsFn } = await import("@/lib/dlls.functions");
      let rows = await listDllsFn() as unknown as DllRow[];

      if (statusFilter !== "All Status") {
        rows = rows.filter((r) => r.status.toLowerCase() === statusFilter.toLowerCase());
      }
      if (deptFilter !== "All Departments") {
        rows = rows.filter((r) => r.teachers?.department === deptFilter);
      }
      return rows;
    },
  });

  const kpiQ = useQuery({
    queryKey: ["dll-kpis"],
    queryFn: async () => {
      const { getDllKpisFn } = await import("@/lib/dlls.functions");
      return await getDllKpisFn();
    },
  });

  const deptsQ = useQuery({
    queryKey: ["dll-departments"],
    queryFn: async () => {
      const { getTeacherDepartmentsFn } = await import("@/lib/dlls.functions");
      return await getTeacherDepartmentsFn();
    },
  });

  const departments = deptsQ.data ?? ["All Departments"];
  const statuses = ["All Status", "Submitted", "Approved", "Returned"];

  return (
    <AppShell>
      <div className="flex flex-col gap-8 pb-20 animate-fade-in pt-2">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
              DLL Review Portal
            </h1>
            <p className="text-[13px] text-slate-400 mt-1">
              Monitoring Daily Lesson Log compliance across all departments.
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          <KpiCard
            icon="description"
            iconBg="bg-secondary/20 text-primary"
            title="TOTAL SUBMISSIONS"
            value={kpiQ.data?.total ?? 0}
            badge=""
            badgeColor=""
          />
          <KpiCard
            icon="assignment_late"
            iconBg="bg-orange-500/20 text-orange-400"
            title="PENDING REVIEW"
            value={kpiQ.data?.submitted ?? 0}
            badge={kpiQ.data?.submitted ? "Action Needed" : ""}
            badgeColor="text-red-500"
          />
          <KpiCard
            icon="check_circle"
            iconBg="bg-emerald-500/20 text-emerald-400"
            title="APPROVED"
            value={kpiQ.data?.approved ?? 0}
            badge=""
            badgeColor=""
          />

          <div
            className="glass-panel rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] animate-slide-up flex flex-col justify-between relative overflow-hidden"
            style={{ animationDelay: "0.15s" }}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-secondary/20 text-primary">
                  <Icon name="bar_chart" size={18} />
                </div>
                <span className="text-[11px] font-bold text-primary">Target: 95%</span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                COMPLIANCE RATE %
              </p>
              <h4 className="text-3xl font-extrabold text-slate-100">
                {kpiQ.data?.compliance ?? 0}%
              </h4>
            </div>
            <div className="absolute bottom-0 left-0 h-1.5 bg-surface-container w-full">
              <div
                className="h-full bg-primary"
                style={{ width: `${kpiQ.data?.compliance ?? 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div
          className="glass-panel rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] animate-slide-up"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-slate-100">Submissions Queue</h3>
              <span className="bg-secondary/20 text-secondary text-[10px] font-bold px-2 py-0.5 rounded-full">
                {kpiQ.data?.submitted ?? 0} New
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="border border-secondary/20 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-slate-300 bg-surface-container hover:bg-white/5 outline-none"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-secondary/20 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-slate-300 bg-surface-container hover:bg-white/5 outline-none"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button className="border border-secondary/20 rounded-lg p-1.5 text-slate-300 bg-surface-container hover:bg-white/5 outline-none">
                <Icon name="filter_list" size={18} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container/50">
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    TEACHER NAME
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    DATE SUBMITTED
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    SUBJECT
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    GRADE & SECTION
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    STATUS
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {dllsQ.data?.map((d) => {
                  const teacherName = d.profiles?.full_name || d.profiles?.email || "Unknown";
                  const initial = teacherName.charAt(0).toUpperCase();
                  const dept = d.teachers?.department || "General Dept.";
                  return (
                    <tr
                      key={d.id}
                      className="border-t border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {d.profiles?.avatar_url ? (
                            <img
                              src={d.profiles.avatar_url}
                              alt={teacherName}
                              className="w-9 h-9 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-surface-container text-slate-300 flex items-center justify-center font-bold text-sm">
                              {initial}
                            </div>
                          )}
                          <div>
                            <p className="text-[13px] font-bold text-slate-100">{teacherName}</p>
                            <p className="text-[11px] text-slate-400">{dept}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[12px] text-slate-300">
                        {d.submitted_at
                          ? format(new Date(d.submitted_at), "MMM dd, yyyy - hh:mm a")
                          : d.lesson_date}
                      </td>
                      <td className="px-5 py-4 text-[13px] font-semibold text-slate-200">
                        {d.subject}
                      </td>
                      <td className="px-5 py-4">
                        <span className="bg-surface-container text-slate-300 px-2.5 py-1 rounded-full text-[11px] font-medium">
                          {d.sections
                            ? `Grade ${d.sections.grade_level} - ${d.sections.name}`
                            : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        {d.status === "approved" ? (
                          <Link
                            to="/dll/$id"
                            params={{ id: d.id }}
                            className="text-[12px] font-bold text-primary hover:underline"
                          >
                            View Log
                          </Link>
                        ) : (
                          <Link
                            to="/dll/$id"
                            params={{ id: d.id }}
                            className="inline-block bg-primary text-white px-4 py-1.5 rounded text-[12px] font-bold hover:bg-opacity-90 shadow-sm transition"
                          >
                            Review
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {dllsQ.data?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">
                      No submissions found matching the criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-4 border-t border-white/10">
            <span className="text-[12px] text-slate-400 font-medium">
              {dllsQ.data?.length ?? 0} of {kpiQ.data?.total ?? 0} submissions
            </span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

type KpiCardProps = {
  icon: string;
  iconBg: string;
  title: string;
  value: string | number;
  badge: string;
  badgeColor: string;
};

function KpiCard({ icon, iconBg, title, value, badge, badgeColor }: KpiCardProps) {
  return (
    <div
      className="glass-panel rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] animate-slide-up"
      style={{ animationDelay: "0.05s" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon name={icon} size={18} />
        </div>
        <span className={`text-[11px] font-bold ${badgeColor}`}>{badge}</span>
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
      <h4 className="text-3xl font-extrabold text-slate-100">{value}</h4>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "submitted") {
    return (
      <span className="inline-flex items-center gap-1.5 bg-orange-500/20 text-orange-400 px-2.5 py-1 rounded-full text-[11px] font-bold border border-orange-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Pending
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full text-[11px] font-bold border border-emerald-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Approved
      </span>
    );
  }
  if (status === "returned") {
    return (
      <span className="inline-flex items-center gap-1.5 bg-primary/20 text-primary px-2.5 py-1 rounded-full text-[11px] font-bold border border-primary/30">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Returned
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 bg-surface-container text-slate-300 px-2.5 py-1 rounded-full text-[11px] font-bold">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Draft
    </span>
  );
}
