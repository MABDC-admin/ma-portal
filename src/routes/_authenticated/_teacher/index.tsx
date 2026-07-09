import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useMemo } from "react";
import { subDays, format } from "date-fns";

export const Route = createFileRoute("/_authenticated/_teacher/")({
  head: () => ({
    meta: [{ title: "Teacher Dashboard — AttendCloud" }],
  }),
  component: TeacherDashboard,
});

function TeacherDashboard() {
  const { user } = useAuth();
  const uid = user?.id;

  const sectionsQ = useQuery({
    queryKey: ["teacher-sections", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sections")
        .select("id, name, grade_level")
        .eq("adviser_id", uid!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const sectionIds = sectionsQ.data?.map((s) => s.id) ?? [];

  const weeklyAttendanceQ = useQuery({
    queryKey: ["weekly-attendance", sectionIds],
    enabled: sectionIds.length > 0,
    queryFn: async () => {
      const sevenDaysAgo = subDays(new Date(), 6).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("attendance")
        .select("date, status, section_id, student_id")
        .in("section_id", sectionIds)
        .gte("date", sevenDaysAgo);
      if (error) throw error;
      return data ?? [];
    },
  });

  const anecdotalsQ = useQuery({
    queryKey: ["recent-anecdotals", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anecdotal_entries")
        .select(`
          id, category, note, occurred_on,
          student:students!inner(
            student_number, section_id,
            profiles!students_user_id_profiles_fkey(full_name, avatar_url),
            sections(grade_level, name)
          )
        `)
        .eq("teacher_id", uid!)
        .order("occurred_on", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const studentsQ = useQuery({
    queryKey: ["teacher-students", sectionIds],
    enabled: sectionIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select(`
          user_id, student_number,
          profiles!students_user_id_profiles_fkey(full_name, avatar_url)
        `)
        .in("section_id", sectionIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const todayISO = new Date().toISOString().slice(0, 10);
  const todayAttendance = weeklyAttendanceQ.data?.filter((a) => a.date === todayISO) ?? [];
  const presentToday = todayAttendance.filter((a) => a.status === "present").length;
  const totalToday = todayAttendance.length;
  const attendancePercentage = totalToday > 0 ? Math.round((presentToday / totalToday) * 100) : 0;

  // Weekly Chart Data — real data only, 0% when no records
  const chartData = useMemo(() => {
    const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    const records = weeklyAttendanceQ.data ?? [];
    const today = new Date();
    return Array.from({ length: 7 }).map((_, i) => {
      const d = subDays(today, 6 - i);
      const iso = d.toISOString().slice(0, 10);
      const dayRecs = records.filter((r) => r.date === iso);
      const total = dayRecs.length;
      const present = dayRecs.filter((r) => r.status === "present").length;
      const pct = total > 0 ? Math.round((present / total) * 100) : 0;
      return { day: days[d.getDay() === 0 ? 6 : d.getDay() - 1], value: pct };
    });
  }, [weeklyAttendanceQ.data]);

  // At-risk = students with <75% attendance over the past 7 days
  const atRiskStudents = useMemo(() => {
    const students = studentsQ.data ?? [];
    const records = weeklyAttendanceQ.data ?? [];
    return students
      .map((s) => {
        const rec = records.filter((r) => r.student_id === s.user_id);
        const total = rec.length;
        const present = rec.filter((r) => r.status === "present").length;
        const pct = total > 0 ? Math.round((present / total) * 100) : null;
        return { ...s, percentage: pct };
      })
      .filter((s) => s.percentage !== null && s.percentage < 75)
      .sort((a, b) => (a.percentage ?? 0) - (b.percentage ?? 0));
  }, [studentsQ.data, weeklyAttendanceQ.data]);

  const urgentAnecdotalsCount =
    anecdotalsQ.data?.filter((a) => a.category === "behavioral").length ?? 0;

  return (
    <AppShell>
      <div className="flex flex-col gap-6 pb-20 animate-fade-in pt-2 max-w-[1400px] mx-auto">
        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-panel rounded-2xl p-5 relative overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 mb-6">
              <Icon name="verified_user" size={18} />
            </div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">TODAY'S ATTENDANCE</p>
            <h4 className="text-4xl font-extrabold text-slate-800">{attendancePercentage}%</h4>
            <p className="text-[12px] text-slate-400 font-medium mt-1">
              {presentToday}/{totalToday} present
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-5 relative overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 mb-6">
              <Icon name="menu_book" size={18} />
            </div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">ACTIVE CLASSES</p>
            <h4 className="text-4xl font-extrabold text-slate-800">{sectionsQ.data?.length ?? 0}</h4>
            <p className="text-[12px] text-slate-400 font-medium mt-1">Sections advised</p>
          </div>

          <div className="glass-panel rounded-2xl p-5 relative overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500 mb-6">
              <Icon name="notifications_active" size={18} />
            </div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">URGENT ANECDOTALS</p>
            <h4 className="text-4xl font-extrabold text-slate-800">{urgentAnecdotalsCount}</h4>
          </div>

          <div className="bg-white rounded-2xl p-5 border-t border-r border-b border-l-4 border-l-red-500 shadow-[0_2px_8px_rgba(0,0,0,0.04)] relative overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500 mb-6">
              <Icon name="error_outline" size={18} />
            </div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">AT-RISK STUDENTS</p>
            <h4 className="text-4xl font-extrabold text-slate-800">{atRiskStudents.length}</h4>
            <p className="text-[12px] text-red-400 font-medium mt-1">Below 75% threshold</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
            {/* My Classes */}
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-[15px] font-bold text-slate-800">My Classes</h3>
              </div>

              <div className="flex flex-col gap-3">
                {sectionsQ.data?.length ? (
                  sectionsQ.data.map((section) => {
                    const code = section.name.substring(0, 3).toUpperCase();
                    return (
                      <div
                        key={section.id}
                        className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold tracking-wider bg-[#f0f4ff] text-[#0e52db]">
                            {code}
                          </div>
                          <div>
                            <p className="text-[14px] font-bold text-slate-800">
                              Grade {section.grade_level} — {section.name}
                            </p>
                          </div>
                        </div>
                        <Link
                          to="/sections/$id/attendance"
                          params={{ id: section.id }}
                          className="bg-[#0e52db] text-white font-bold text-[12px] px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm"
                        >
                          Take Attendance
                        </Link>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-500 text-center py-6">No sections assigned yet.</p>
                )}
              </div>
            </div>

            {/* Attendance Trends */}
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-[15px] font-bold text-slate-800">Attendance Trends</h3>
                  <p className="text-[12px] text-slate-500 mt-1">Last 7 days across your sections</p>
                </div>
              </div>

              <div className="h-[200px] flex items-end justify-between gap-2 mt-4 px-2">
                {chartData.map((d, i) => {
                  const isToday = i === chartData.length - 1;
                  return (
                    <div key={i} className="flex flex-col items-center gap-3 flex-1 group">
                      <div className="w-full relative flex items-end justify-center h-[160px]">
                        <div
                          className={`w-10 rounded-t-lg transition-all duration-500 ${isToday ? "bg-[#0e52db]" : "bg-[#c5d5f6] group-hover:bg-[#a6bcf0]"}`}
                          style={{ height: `${d.value}%` }}
                        ></div>
                        {isToday && d.value > 0 && (
                          <div className="absolute -top-8 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                            Today: {d.value}%
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">{d.day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-1 flex flex-col gap-6">
            {/* At-Risk */}
            <div className="bg-white rounded-2xl p-5 border border-red-200 shadow-[0_2px_12px_rgba(220,38,38,0.06)]">
              <h3 className="text-[15px] font-bold text-slate-800 flex items-center gap-2 mb-5">
                <Icon name="warning_amber" size={20} className="text-red-500" /> At-Risk Students
              </h3>

              <div className="flex flex-col gap-4">
                {atRiskStudents.slice(0, 5).map((student) => {
                  const s = student.profiles;
                  const name = s?.full_name || "Unknown Student";
                  return (
                    <div key={student.user_id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {s?.avatar_url ? (
                          <img src={s.avatar_url} alt={name} className="w-10 h-10 rounded-full object-cover border border-slate-100" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm">
                            {name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-[13px] font-bold text-slate-800">{name}</p>
                          <p className="text-[11px] font-medium text-slate-400 mt-0.5">ID: #{student.student_number}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[14px] font-extrabold text-red-500">{student.percentage}%</p>
                      </div>
                    </div>
                  );
                })}
                {atRiskStudents.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">No at-risk students.</p>
                )}
              </div>
            </div>

            {/* Recent Anecdotals */}
            <div className="glass-panel rounded-2xl p-6 flex-1">
              <h3 className="text-[15px] font-bold text-slate-800 mb-5">Recent Anecdotals</h3>

              <div className="flex flex-col gap-6">
                {anecdotalsQ.data?.slice(0, 5).map((a) => {
                  const stu = a.student as any;
                  const name = stu?.profiles?.full_name || "Unknown Student";
                  const grade = stu?.sections?.grade_level;
                  const isBehavior = a.category.toLowerCase() === "behavioral";

                  return (
                    <div key={a.id} className="relative pl-4 border-l-2 border-slate-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isBehavior ? "bg-orange-100 text-orange-600" : "bg-emerald-100 text-emerald-600"}`}>
                          {a.category}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {format(new Date(a.occurred_on), "MMM dd")}
                        </span>
                      </div>
                      <p className="text-[13px] font-bold text-slate-800 mb-1">
                        {name}
                        {grade !== undefined && grade !== null ? ` — Grade ${grade}` : ""}
                      </p>
                      <p className="text-[12px] text-slate-500 leading-snug mb-2 line-clamp-2">{a.note}</p>
                    </div>
                  );
                })}

                {(!anecdotalsQ.data || anecdotalsQ.data.length === 0) && (
                  <p className="text-sm text-slate-500 text-center py-4">No recent anecdotals found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
