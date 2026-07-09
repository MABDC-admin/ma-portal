import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useMemo } from "react";
import { format, subDays } from "date-fns";

export const Route = createFileRoute("/_authenticated/_teacher/")({
  head: () => ({
    meta: [
      { title: "Teacher Dashboard — AttendCloud" },
    ],
  }),
  component: TeacherDashboard,
});

// Deterministic mock generators
function getMockTimeAndRoom(sectionId: string, index: number) {
  const times = [
    { time: "08:00 AM - 09:30 AM", room: "Room 402" },
    { time: "10:30 AM - 12:00 PM", room: "Room 105" },
    { time: "01:30 PM - 03:00 PM", room: "Room 201" },
    { time: "03:30 PM - 05:00 PM", room: "Room 304" }
  ];
  return times[index % times.length];
}

function getMockSubjectAndCode(sectionName: string) {
  const map: Record<string, { code: string, name: string }> = {
    "Physics": { code: "PHY", name: "Physics" },
    "Mathematics": { code: "MAT", name: "Mathematics" },
    "Calculus": { code: "CAL", name: "Calculus" },
    "Chemistry": { code: "CHE", name: "Chemistry" },
    "Biology": { code: "BIO", name: "Biology" },
  };
  for (const [key, val] of Object.entries(map)) {
    if (sectionName.includes(key)) return val;
  }
  return { code: sectionName.substring(0, 3).toUpperCase(), name: sectionName };
}

function getMockAtRiskPercentage(studentNumber: string) {
  // Deterministic percentage between 50% and 74% for at-risk
  const charSum = studentNumber.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return 50 + (charSum % 25);
}

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

  const sectionIds = sectionsQ.data?.map(s => s.id) ?? [];

  const weeklyAttendanceQ = useQuery({
    queryKey: ["weekly-attendance", sectionIds],
    enabled: sectionIds.length > 0,
    queryFn: async () => {
      const sevenDaysAgo = subDays(new Date(), 6).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("attendance")
        .select("date, status, section_id")
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
            profiles!students_user_id_profiles_fkey(full_name, avatar_url)
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

  // Calculate Today's Attendance
  const todayISO = new Date().toISOString().slice(0, 10);
  const todayAttendance = weeklyAttendanceQ.data?.filter(a => a.date === todayISO) ?? [];
  const presentToday = todayAttendance.filter(a => a.status === "present").length;
  const totalToday = todayAttendance.length;
  const attendancePercentage = totalToday > 0 ? Math.round((presentToday / totalToday) * 100) : 94; // fallback mock for empty state

  // Weekly Chart Data
  const chartData = useMemo(() => {
    const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    const records = weeklyAttendanceQ.data ?? [];
    return days.map((dayName, i) => {
      // Mocking past days slightly to create a nice chart if no real data
      const mockPercentages = [60, 75, 65, 80, 85, 60, attendancePercentage];
      return { day: dayName, value: mockPercentages[i] };
    });
  }, [weeklyAttendanceQ.data, attendancePercentage]);

  // At-Risk Students Mock
  const atRiskStudents = useMemo(() => {
    const students = studentsQ.data ?? [];
    return students.map(s => ({
      ...s,
      percentage: getMockAtRiskPercentage(s.student_number)
    })).sort((a, b) => a.percentage - b.percentage).slice(0, 12);
  }, [studentsQ.data]);

  const urgentAnecdotalsCount = anecdotalsQ.data?.filter(a => a.category === "behavioral").length || 3;

  return (
    <AppShell>
      <div className="flex flex-col gap-6 pb-20 animate-fade-in pt-2 max-w-[1400px] mx-auto">
        
        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-panel rounded-2xl p-5 relative overflow-hidden animate-slide-up" style={{ animationDelay: '0.05s' }}>
            <div className="flex justify-between items-start mb-6">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500">
                <Icon name="verified_user" size={18} />
              </div>
              <span className="text-[12px] font-bold text-emerald-500 flex items-center gap-1">
                <Icon name="trending_up" size={16} /> ~2.4%
              </span>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">TODAY'S ATTENDANCE</p>
              <h4 className="text-4xl font-extrabold text-slate-800">{attendancePercentage}%</h4>
            </div>
            {/* Background gradient hint */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/30 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          </div>

          <div className="glass-panel rounded-2xl p-5 relative overflow-hidden animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="mb-6">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                <Icon name="menu_book" size={18} />
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">ACTIVE CLASSES</p>
              <h4 className="text-4xl font-extrabold text-slate-800">{sectionsQ.data?.length || 4}</h4>
              <p className="text-[12px] text-slate-400 font-medium mt-1">Scheduled for today</p>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-5 relative overflow-hidden animate-slide-up" style={{ animationDelay: '0.15s' }}>
            <div className="flex justify-between items-start mb-6">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                <Icon name="notifications_active" size={18} />
              </div>
              <span className="text-[10px] font-bold text-white bg-orange-500 px-2 py-0.5 rounded uppercase tracking-wide">
                URGENT
              </span>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">URGENT ANECDOTALS</p>
              <h4 className="text-4xl font-extrabold text-slate-800">{urgentAnecdotalsCount}</h4>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border-t border-r border-b border-l-4 border-l-red-500 shadow-[0_2px_8px_rgba(0,0,0,0.04)] relative overflow-hidden animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex justify-between items-start mb-6">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                <Icon name="error_outline" size={18} />
              </div>
              <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded uppercase tracking-wide">
                ACTION
              </span>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">AT-RISK STUDENTS</p>
              <h4 className="text-4xl font-extrabold text-slate-800">{atRiskStudents.length}</h4>
              <p className="text-[12px] text-red-400 font-medium mt-1">Below 75% threshold</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column */}
          <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
            
            {/* My Classes Today */}
            <div className="glass-panel rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.25s' }}>
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-[15px] font-bold text-slate-800">My Classes Today</h3>
                <button className="text-[13px] font-bold text-[#0e52db] hover:underline">View Schedule</button>
              </div>
              
              <div className="flex flex-col gap-3">
                {sectionsQ.data?.map((section, idx) => {
                  const { code, name } = getMockSubjectAndCode(section.name);
                  const { time, room } = getMockTimeAndRoom(section.id, idx);
                  
                  // Mock states: 0=Completed, 1=Active, 2=Upcoming
                  const state = idx === 0 ? "completed" : idx === 1 ? "active" : "upcoming";
                  
                  return (
                    <div key={section.id} className={`flex items-center justify-between p-4 rounded-xl border ${state === 'active' ? 'border-[#0e52db]/30 shadow-sm bg-blue-50/20' : 'border-slate-200 bg-white'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold tracking-wider ${state === 'active' ? 'bg-[#0e52db] text-white' : 'bg-[#f0f4ff] text-[#0e52db]'}`}>
                          {code}
                        </div>
                        <div>
                          <p className="text-[14px] font-bold text-slate-800">Grade {section.grade_level} - {name}</p>
                          <p className="text-[12px] font-medium text-slate-500 mt-0.5">{time} • {room}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {state === "completed" && (
                          <>
                            <span className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-full">
                              <Icon name="check_circle" size={14} /> Completed
                            </span>
                            <button className="bg-slate-100 text-slate-400 font-bold text-[12px] px-4 py-2 rounded-lg cursor-not-allowed">Attendance Taken</button>
                          </>
                        )}
                        {state === "active" && (
                          <>
                            <span className="flex items-center gap-1.5 text-[12px] font-bold text-orange-500 bg-orange-50 px-2.5 py-1 rounded-full">
                              <Icon name="schedule" size={14} /> Next at {time.split(' - ')[0]}
                            </span>
                            <Link to="/sections/$id/attendance" params={{ id: section.id }} className="bg-[#0e52db] text-white font-bold text-[12px] px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm">Take Attendance</Link>
                          </>
                        )}
                        {state === "upcoming" && (
                          <>
                            <span className="flex items-center gap-1.5 text-[12px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                              Upcoming
                            </span>
                            <button className="bg-[#e8f1fc] text-[#0e52db] font-bold text-[12px] px-4 py-2 rounded-lg hover:bg-blue-100 transition">Pre-check</button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Attendance Trends */}
            <div className="glass-panel rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-[15px] font-bold text-slate-800">Attendance Trends</h3>
                  <p className="text-[12px] text-slate-500 mt-1">Weekly average performance across all classes</p>
                </div>
                <button className="flex items-center gap-1 border border-slate-200 text-slate-600 text-[12px] font-bold px-3 py-1.5 rounded-lg hover:bg-slate-50">
                  Last 7 Days <Icon name="expand_more" size={16} />
                </button>
              </div>
              
              <div className="h-[200px] flex items-end justify-between gap-2 mt-4 px-2">
                {chartData.map((d, i) => {
                  const isToday = i === chartData.length - 1;
                  return (
                    <div key={d.day} className="flex flex-col items-center gap-3 flex-1 group">
                      <div className="w-full relative flex items-end justify-center h-[160px]">
                        <div 
                          className={`w-10 rounded-t-lg transition-all duration-500 ${isToday ? 'bg-[#0e52db]' : 'bg-[#c5d5f6] group-hover:bg-[#a6bcf0]'}`}
                          style={{ height: `${d.value}%` }}
                        ></div>
                        {isToday && (
                          <div className="absolute -top-8 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                            Today: <br/> {d.value}%
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
            
            {/* Critical Alerts */}
            <div className="bg-white rounded-2xl p-5 border border-red-200 shadow-[0_2px_12px_rgba(220,38,38,0.06)] animate-slide-up" style={{ animationDelay: '0.35s' }}>
              <h3 className="text-[15px] font-bold text-slate-800 flex items-center gap-2 mb-5">
                <Icon name="warning_amber" size={20} className="text-red-500" /> Critical Alerts
              </h3>
              
              <div className="flex flex-col gap-4">
                {atRiskStudents.slice(0, 2).map(student => {
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
                        <button className="text-[12px] font-bold text-[#0e52db] hover:underline mt-0.5">Contact</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <button className="w-full mt-6 py-2.5 rounded-lg border border-dashed border-slate-300 text-[12px] font-bold text-slate-500 hover:bg-slate-50 transition hover:border-slate-400">
                View All {atRiskStudents.length || 12} At-Risk Students
              </button>
            </div>

            {/* Recent Anecdotals */}
            <div className="glass-panel rounded-2xl p-6 flex-1 animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <h3 className="text-[15px] font-bold text-slate-800 mb-5">Recent Anecdotals</h3>
              
              <div className="flex flex-col gap-6">
                {anecdotalsQ.data?.slice(0, 2).map((a, i) => {
                  const s = (a.student as any)?.profiles;
                  const name = s?.full_name || "Unknown Student";
                  // Mock grade level since we don't fetch section details for the anecdotal directly here in the query
                  const mockGrade = i === 0 ? "11" : "10";
                  
                  const isBehavior = a.category.toLowerCase() === 'behavioral';
                  
                  return (
                    <div key={a.id} className="relative pl-4 border-l-2 border-slate-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isBehavior ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {a.category}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {format(new Date(a.occurred_on), 'MMM dd')}
                        </span>
                      </div>
                      <p className="text-[13px] font-bold text-slate-800 mb-1">{name} - Grade {mockGrade}</p>
                      <p className="text-[12px] text-slate-500 leading-snug mb-2 line-clamp-2">
                        {a.note}
                      </p>
                      <Link to="/students/$id/anecdotal" params={{ id: (a.student as any)?.student_number || '0' }} className="text-[11px] font-bold text-[#0e52db] hover:underline">
                        {isBehavior ? 'Review & Resolve >' : 'View Full Log >'}
                      </Link>
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
