import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
      let q = supabase
        .from("dlls")
        .select(
          "id, subject, lesson_date, status, submitted_at, teacher_id, section_id, profiles!dlls_teacher_profile_fkey(email, full_name, avatar_url), sections:section_id(name, grade_level), teachers!dlls_teacher_id_fkey(department)",
        )
        .neq("status", "draft")
        .order("submitted_at", { ascending: false, nullsFirst: false });
      
      const { data, error } = await q;
      if (error) throw error;
      
      let rows = (data ?? []) as unknown as DllRow[];
      if (statusFilter !== "All Status") {
        rows = rows.filter(r => r.status.toLowerCase() === statusFilter.toLowerCase());
      }
      if (deptFilter !== "All Departments") {
        rows = rows.filter(r => r.teachers?.department === deptFilter);
      }
      return rows;
    },
  });

  const kpiQ = useQuery({
    queryKey: ["dll-kpis"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dlls").select("status").neq("status", "draft");
      if (error) throw error;
      const c = { submitted: 0, approved: 0, returned: 0 };
      for (const r of data ?? []) c[r.status as keyof typeof c]++;
      const total = (data ?? []).length;
      return { ...c, total, compliance: total ? Math.round((c.approved / total) * 1000)/10 : 0 };
    },
  });

  // Mocking departments for the filter dropdown
  const departments = ["All Departments", "Science", "History", "Math", "English"];
  const statuses = ["All Status", "Submitted", "Approved", "Returned"];

  return (
    <AppShell>
      <div className="flex flex-col gap-8 pb-20 animate-fade-in pt-2">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">DLL Review Portal</h1>
            <p className="text-[13px] text-slate-500 mt-1">Monitoring Daily Lesson Log compliance across all departments.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:bg-slate-50 transition">
            <Icon name="calendar_today" size={16} className="text-primary" />
            <span className="text-[13px] font-semibold text-slate-700">Term 2, Week 7</span>
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <KpiCard 
            icon="description" iconBg="bg-blue-50 text-primary"
            title="TOTAL SUBMISSIONS" value={kpiQ.data?.total ?? 0}
            badge="+12% ↑" badgeColor="text-emerald-500"
          />
          <KpiCard 
            icon="assignment_late" iconBg="bg-orange-50 text-orange-500"
            title="PENDING REVIEW" value={kpiQ.data?.submitted ?? 0}
            badge="Action Needed" badgeColor="text-red-500"
          />
          <KpiCard 
            icon="check_circle" iconBg="bg-emerald-50 text-emerald-500"
            title="APPROVED TODAY" value={kpiQ.data?.approved ?? 0}
            badge="Last hour: 8" badgeColor="text-slate-400"
          />
          <div className="glass-panel rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] animate-slide-up flex flex-col justify-between relative overflow-hidden" style={{ animationDelay: '0.15s' }}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50 text-primary">
                  <Icon name="bar_chart" size={18} />
                </div>
                <span className="text-[11px] font-bold text-primary">Target: 95%</span>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">COMPLIANCE RATE %</p>
              <h4 className="text-3xl font-extrabold text-slate-800">{kpiQ.data?.compliance ?? 0}%</h4>
            </div>
            <div className="absolute bottom-0 left-0 h-1.5 bg-slate-100 w-full">
              <div className="h-full bg-primary" style={{ width: `${kpiQ.data?.compliance ?? 0}%` }} />
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="glass-panel rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-slate-800">Submissions Queue</h3>
              <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {kpiQ.data?.submitted ?? 0} New
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-slate-600 bg-white hover:bg-slate-50 outline-none">
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-slate-600 bg-white hover:bg-slate-50 outline-none">
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className="border border-slate-200 rounded-lg p-1.5 text-slate-600 bg-white hover:bg-slate-50 outline-none">
                <Icon name="filter_list" size={18} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">TEACHER NAME</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">DATE SUBMITTED</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">SUBJECT</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">GRADE & SECTION</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">STATUS</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {dllsQ.data?.map(d => {
                  const teacherName = d.profiles?.full_name || d.profiles?.email || "Unknown";
                  const initial = teacherName.charAt(0).toUpperCase();
                  const dept = d.teachers?.department || "General Dept.";
                  return (
                    <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {d.profiles?.avatar_url ? (
                            <img src={d.profiles.avatar_url} alt={teacherName} className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm">
                              {initial}
                            </div>
                          )}
                          <div>
                            <p className="text-[13px] font-bold text-slate-800">{teacherName}</p>
                            <p className="text-[11px] text-slate-500">{dept}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[12px] text-slate-600">
                        {d.submitted_at ? format(new Date(d.submitted_at), "MMM dd, yyyy - hh:mm a") : d.lesson_date}
                      </td>
                      <td className="px-5 py-4 text-[13px] font-semibold text-slate-700">
                        {d.subject}
                      </td>
                      <td className="px-5 py-4">
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-[11px] font-medium">
                          {d.sections ? `Grade ${d.sections.grade_level} - ${d.sections.name}` : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        {d.status === "approved" ? (
                          <Link to="/dll/$id" params={{ id: d.id }} className="text-[12px] font-bold text-primary hover:underline">
                            View Log
                          </Link>
                        ) : (
                          <Link to="/dll/$id" params={{ id: d.id }} className="inline-block bg-primary text-white px-4 py-1.5 rounded text-[12px] font-bold hover:bg-opacity-90 shadow-sm transition">
                            Review
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {dllsQ.data?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-500">
                      No submissions found matching the criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Mock */}
          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[12px] text-slate-500 font-medium">Showing 1-10 of {kpiQ.data?.total ?? 0} submissions</span>
            <div className="flex gap-1">
              <button className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50"><Icon name="chevron_left" size={16} /></button>
              <button className="w-7 h-7 rounded bg-primary text-white text-[12px] font-bold flex items-center justify-center">1</button>
              <button className="w-7 h-7 rounded border border-slate-200 text-slate-600 text-[12px] font-bold flex items-center justify-center hover:bg-slate-50">2</button>
              <button className="w-7 h-7 rounded border border-slate-200 text-slate-600 text-[12px] font-bold flex items-center justify-center hover:bg-slate-50">3</button>
              <button className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"><Icon name="chevron_right" size={16} /></button>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '0.25s' }}>
          
          <div className="lg:col-span-2 glass-panel rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Submission Trends</h3>
            <div className="bg-[#f8fafc] rounded-xl p-6 h-64 flex items-end justify-between gap-4">
              {/* Mock Bar Chart */}
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="w-full bg-blue-200 rounded-t-sm h-12"></div>
                <span className="text-[10px] font-bold text-slate-400">MON</span>
              </div>
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="w-full bg-blue-300 rounded-t-sm h-20"></div>
                <span className="text-[10px] font-bold text-slate-400">TUE</span>
              </div>
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="w-full bg-blue-400 rounded-t-sm h-32"></div>
                <span className="text-[10px] font-bold text-slate-400">WED</span>
              </div>
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="w-full bg-blue-100 rounded-t-sm h-16 border-2 border-primary/20 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-lg border-2 border-primary/30 flex items-center justify-center">
                      <div className="w-2 h-4 bg-primary/20"></div>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-400">THU</span>
              </div>
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="w-full bg-blue-500 rounded-t-sm h-40"></div>
                <span className="text-[10px] font-bold text-slate-400">FRI</span>
              </div>
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="w-full bg-primary rounded-t-sm h-48"></div>
                <span className="text-[10px] font-bold text-slate-400">SAT</span>
              </div>
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="w-full bg-primary rounded-t-sm h-44"></div>
                <span className="text-[10px] font-bold text-slate-400">SUN</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-primary rounded-xl p-6 shadow-md text-white flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold mb-3">Director's Memo</h3>
              <p className="text-[13px] leading-relaxed text-blue-50 mb-6">
                Science department has achieved 100% submission rate for 3 consecutive weeks. Great job, Team!
              </p>
              
              <div className="bg-white/10 border border-white/20 rounded-lg p-4 flex gap-4 items-center backdrop-blur-md">
                <Icon name="campaign" size={24} className="text-blue-100" />
                <div>
                  <p className="text-[12px] font-bold text-white">Next Faculty Meeting</p>
                  <p className="text-[11px] text-blue-100">Friday, Oct 27 - 3:00 PM</p>
                </div>
              </div>
            </div>
            
            <button className="w-full bg-white text-primary rounded-lg py-2.5 text-[13px] font-bold mt-6 shadow-sm hover:bg-slate-50 transition">
              Broadcast Announcement
            </button>
          </div>

        </div>

      </div>
    </AppShell>
  );
}

function KpiCard({ icon, iconBg, title, value, badge, badgeColor }: any) {
  return (
    <div className="glass-panel rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] animate-slide-up" style={{ animationDelay: '0.05s' }}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon name={icon} size={18} />
        </div>
        <span className={`text-[11px] font-bold ${badgeColor}`}>{badge}</span>
      </div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
      <h4 className="text-3xl font-extrabold text-slate-800">{value}</h4>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'submitted') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full text-[11px] font-bold border border-orange-100">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Pending
      </span>
    );
  }
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full text-[11px] font-bold border border-emerald-100">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Approved
      </span>
    );
  }
  if (status === 'returned') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 px-2.5 py-1 rounded-full text-[11px] font-bold border border-red-100">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Returned
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-[11px] font-bold">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Draft
    </span>
  );
}
