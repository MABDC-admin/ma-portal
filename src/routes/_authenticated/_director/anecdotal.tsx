import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/_director/anecdotal")({
  head: () => ({ meta: [{ title: "Anecdotal Entry Log — AttendCloud" }] }),
  component: DirectorAnecdotalPage,
});

type Category = "academic" | "behavioral" | "social" | "achievement";

type AnecdotalRow = {
  id: string;
  category: Category;
  note: string;
  occurred_on: string;
  student: {
    student_number: string;
    profiles: {
      email: string | null;
      full_name: string | null;
      avatar_url: string | null;
    } | null;
  } | null;
};

function getCategoryPill(cat: string) {
  const c = cat.toLowerCase();
  if (c === "academic") return "bg-blue-100 text-blue-700";
  if (c === "behavioral" || c === "discipline") return "bg-slate-100 text-slate-600";
  if (c === "social") return "bg-slate-100 text-slate-600";
  if (c === "emotional") return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-600";
}


function DirectorAnecdotalPage() {
  const [categoryFilter, setCategoryFilter] = useState("All Categories");

  const q = useQuery({
    queryKey: ["director-anecdotals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anecdotal_entries")
        .select(`
          id, category, note, occurred_on,
          student:students!inner(
            student_number,
            profiles!students_user_id_profiles_fkey(full_name, email, avatar_url)
          )
        `)
        .order("occurred_on", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as AnecdotalRow[];
    },
  });

  const rows = useMemo(() => {
    let all = q.data ?? [];
    if (categoryFilter !== "All Categories") {
      all = all.filter(r => r.category.toLowerCase() === categoryFilter.toLowerCase());
    }
    return all;
  }, [q.data, categoryFilter]);

  const totalEntries = q.data?.length ?? 0;
  const behavioralCount = q.data?.filter(r => r.category.toLowerCase() === "behavioral").length ?? 0;
  const academicCount = q.data?.filter(r => r.category.toLowerCase() === "academic").length ?? 0;


  return (
    <AppShell>
      <div className="flex flex-col gap-6 pb-20 animate-fade-in pt-2">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold text-slate-800 tracking-tight">Anecdotal Entry Log</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">History of student observations and critical behavior records.</p>
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-[#0e52db] text-white rounded-lg shadow-sm hover:bg-blue-700 transition">
            <Icon name="print" size={18} />
            <span className="text-[13px] font-bold">Print Summary Report</span>
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="glass-panel rounded-xl p-5 flex items-center gap-4 animate-slide-up" style={{ animationDelay: '0.05s' }}>
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Icon name="trending_up" size={24} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">TOTAL ENTRIES (TERM)</p>
              <h4 className="text-2xl font-extrabold text-slate-800">{totalEntries}</h4>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-5 flex items-center gap-4 border-l-4 border-red-500 shadow-[0_2px_8px_rgba(0,0,0,0.04)] animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-500 shrink-0">
              <Icon name="error" size={24} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">BEHAVIORAL</p>
              <h4 className="text-2xl font-extrabold text-red-600">{behavioralCount}</h4>
            </div>
          </div>

          <div className="glass-panel rounded-xl p-5 flex items-center gap-4 animate-slide-up" style={{ animationDelay: '0.15s' }}>
            <div className="w-12 h-12 rounded-full bg-[#e8f1fc] flex items-center justify-center text-[#3575da] shrink-0">
              <Icon name="assignment_late" size={24} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">ACADEMIC</p>
              <h4 className="text-2xl font-extrabold text-[#3575da]">{academicCount}</h4>
            </div>
          </div>

        </div>

        {/* Filters Section */}
        <div className="glass-panel rounded-xl p-4 flex flex-wrap items-end gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">BEHAVIOR CATEGORY</label>
            <div className="relative">
              <select 
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-[13px] font-semibold rounded-lg px-4 py-2 outline-none focus:border-primary"
              >
                <option>All Categories</option>
                <option value="academic">Academic</option>
                <option value="social">Social</option>
                <option value="emotional">Emotional</option>
                <option value="discipline">Discipline</option>
              </select>
              <Icon name="expand_more" size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          
          <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">CONCERN LEVEL</label>
            <div className="relative">
              <select 
                value={concernFilter}
                onChange={e => setConcernFilter(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-[13px] font-semibold rounded-lg px-4 py-2 outline-none focus:border-primary"
              >
                <option>All Levels</option>
                <option>Urgent</option>
                <option>Monitor</option>
                <option>Normal</option>
              </select>
              <Icon name="expand_more" size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 flex-[1.5] min-w-[200px]">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">DATE RANGE</label>
            <div className="relative">
              <Icon name="calendar_today" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                defaultValue="Oct 01 - Oct 31"
                className="w-full bg-white border border-slate-200 text-slate-700 text-[13px] font-semibold rounded-lg pl-9 pr-4 py-2 outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="ml-auto">
            <button 
              onClick={() => { setCategoryFilter("All Categories"); setConcernFilter("All Levels"); }}
              className="bg-[#e4ebfb] text-[#2c65cc] font-bold text-[13px] px-5 py-2.5 rounded-lg hover:bg-blue-100 transition"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="glass-panel rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] animate-slide-up" style={{ animationDelay: '0.25s' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">STUDENT</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">DATE</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">CATEGORY</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">CONCERN LEVEL</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">OBSERVATION SUMMARY</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">STATUS</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const s = r.student?.profiles;
                  const studentName = s?.full_name || s?.email || "Unknown Student";
                  const initial = studentName.charAt(0).toUpperCase();
                  
                  const concern = getMockConcernLevel(r.id);
                  const status = getMockStatus(r.id);
                  
                  // For the sake of matching the screenshot perfectly, we'll map category strings to those exact terms if possible, or just use DB category
                  let displayCategory = r.category.toUpperCase();
                  if (displayCategory === 'BEHAVIORAL') displayCategory = 'DISCIPLINE'; // Mock mapping to match screenshot style
                  
                  return (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {s?.avatar_url ? (
                            <img src={s.avatar_url} alt={studentName} className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm">
                              {initial}
                            </div>
                          )}
                          <div>
                            <p className="text-[13px] font-bold text-slate-800">{studentName}</p>
                            <p className="text-[11px] font-medium text-slate-400">ID: #{r.student?.student_number || "0000"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-[12px] font-semibold text-slate-600">
                          <span>{format(new Date(r.occurred_on), "MMM dd,")}</span>
                          <span>{format(new Date(r.occurred_on), "yyyy")}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${getCategoryPill(displayCategory)}`}>
                          {displayCategory}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${concern.tone}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${concern.dot}`} />
                          {concern.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-[250px]">
                        <p className="text-[12px] text-slate-500 leading-snug truncate" title={r.note}>
                          {r.note.length > 60 ? r.note.substring(0, 60) + '...' : r.note}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-1 rounded text-[11px] font-bold border ${status.tone}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition" aria-label="Edit">
                            <Icon name="edit" size={16} />
                          </button>
                          <button className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition" aria-label="Document">
                            <Icon name="save" size={16} />
                          </button>
                          <button className="w-7 h-7 rounded-full bg-[#e8f1fc] text-[#3575da] flex items-center justify-center hover:bg-blue-100 transition" aria-label="View">
                            <Icon name="visibility" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {!q.isLoading && rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                      No anecdotal entries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[12px] text-slate-500 font-medium">Showing <strong className="text-slate-700 font-bold">1 - {Math.min(4, rows.length)}</strong> of <strong className="text-slate-700 font-bold">{totalEntries}</strong> entries</span>
            <div className="flex gap-1.5">
              <button className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50"><Icon name="chevron_left" size={16} /></button>
              <button className="w-7 h-7 rounded bg-[#0e52db] text-white text-[12px] font-bold flex items-center justify-center">1</button>
              <button className="w-7 h-7 rounded border border-slate-200 text-slate-600 text-[12px] font-bold flex items-center justify-center hover:bg-slate-50">2</button>
              <button className="w-7 h-7 rounded border border-slate-200 text-slate-600 text-[12px] font-bold flex items-center justify-center hover:bg-slate-50">3</button>
              <button className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"><Icon name="chevron_right" size={16} /></button>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
