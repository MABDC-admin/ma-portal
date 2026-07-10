import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Icon } from "@/components/Icon";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export function StudentDashboard({ studentId }: { studentId?: string }) {
  const { user } = useAuth();
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ["student_dashboard_stats", studentId || user?.id],
    queryFn: async () => {
      const { getStudentDashboardDataFn } = await import("@/lib/student.functions");
      const data = await getStudentDashboardDataFn({ data: { studentId } });
      return data;
    },
  });

  if (isLoading || !stats) {
    return (
      <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8 bg-transparent min-h-screen relative z-0 items-center justify-center">
        <div className="text-slate-400 flex items-center gap-2">
          <Icon name="sync" className="animate-spin" /> Loading Dashboard...
        </div>
      </div>
    );
  }

  const { profile, attendance, upcomingEvents } = stats;
  const name = profile?.user?.full_name || profile?.user?.email || "Student";
  const avatar = profile?.user?.avatar_url;
  const gradeLevel = profile?.section?.grade_level ? `Grade ${profile.section.grade_level}` : "Unassigned Grade";
  const sectionName = profile?.section?.name ? `Section ${profile.section.name}` : "Unassigned Section";

  const getEventIcon = (category: string) => {
    switch (category) {
      case "academic":
        return { icon: "school", color: "text-emerald-500 bg-emerald-100" };
      case "holiday":
        return { icon: "celebration", color: "text-rose-500 bg-rose-100" };
      case "exam":
        return { icon: "history_edu", color: "text-purple-500 bg-purple-100" };
      case "sports":
        return { icon: "sports_soccer", color: "text-blue-500 bg-blue-100" };
      default:
        return { icon: "event", color: "text-slate-500 bg-slate-100" };
    }
  };

  const getAttendanceStatusInfo = (status: string) => {
    switch (status) {
      case "present": return { label: "Present", color: "text-status-present", bg: "bg-status-present/10", icon: "check_circle" };
      case "late": return { label: "Late", color: "text-status-late", bg: "bg-status-late/10", icon: "schedule" };
      case "absent": return { label: "Absent", color: "text-status-absent", bg: "bg-status-absent/10", icon: "cancel" };
      case "excused": return { label: "Excused", color: "text-status-excused", bg: "bg-status-excused/10", icon: "health_and_safety" };
      default: return { label: status, color: "text-slate-400", bg: "bg-surface-container", icon: "help" };
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 bg-transparent min-h-screen relative z-0">
      {/* Background gradients for the neon effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background -z-10" />
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-900/20 via-background to-transparent -z-10 pointer-events-none" />

      {/* Welcome Banner */}
      <div className="bg-surface/80 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-lg border border-secondary/30 neon-border-cyan flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 bg-secondary/10 w-48 h-48 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 bg-primary/10 w-48 h-48 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-secondary shadow-[0_0_15px_rgba(0,240,255,0.3)] overflow-hidden bg-surface-container flex items-center justify-center flex-shrink-0">
            {avatar ? (
              <img src={avatar} alt={name} className="w-full h-full object-cover" />
            ) : (
              <Icon name="person" size={40} className="text-secondary opacity-50" />
            )}
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-100 tracking-tight">
              Welcome back, <span className="text-secondary neon-text-cyan">{name.split(" ")[0]}</span>!
            </h1>
            <p className="text-sm sm:text-base font-medium text-slate-400 mt-1 flex items-center gap-2">
              <Icon name="badge" size={16} /> ID: {profile?.student_number || "---"}
            </p>
            <p className="text-sm sm:text-base font-bold text-primary mt-1 flex items-center gap-2">
              <Icon name="school" size={16} /> {gradeLevel} — {sectionName}
            </p>
          </div>
        </div>
        
        <div className="bg-background/50 rounded-xl p-4 border border-outline-variant min-w-[200px] relative z-10">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Icon name="event" size={14} /> Today's Date
          </p>
          <p className="text-lg font-bold text-slate-200">
            {format(new Date(), "EEEE, MMM d, yyyy")}
          </p>
        </div>
      </div>


      {studentId && (
        <div className="bg-status-late/20 border border-status-late/50 text-status-late px-4 py-3 rounded-2xl flex items-center gap-3">
          <Icon name="visibility" size={24} />
          <div>
            <p className="font-bold text-sm">Impersonation Mode</p>
            <p className="text-xs">You are currently viewing this portal exactly as the student sees it. Some actions may be restricted.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
        {/* LEFT COLUMN: Attendance Overview */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <h2 className="text-xl font-bold font-heading text-slate-200 flex items-center gap-2">
            <Icon name="fact_check" size={24} className="text-secondary" /> Attendance Overview
          </h2>
          
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-surface/80 backdrop-blur-xl rounded-xl p-5 border border-outline-variant shadow-sm flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold text-slate-100">{attendance.total}</span>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Total Days</span>
            </div>
            <div className="bg-surface/80 backdrop-blur-xl rounded-xl p-5 border border-status-present/30 shadow-[0_0_15px_rgba(16,185,129,0.1)] flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold text-status-present">{attendance.present}</span>
              <span className="text-[11px] font-bold text-status-present uppercase tracking-wider mt-1">Present</span>
            </div>
            <div className="bg-surface/80 backdrop-blur-xl rounded-xl p-5 border border-status-late/30 shadow-[0_0_15px_rgba(245,158,11,0.1)] flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold text-status-late">{attendance.late}</span>
              <span className="text-[11px] font-bold text-status-late uppercase tracking-wider mt-1">Late</span>
            </div>
            <div className="bg-surface/80 backdrop-blur-xl rounded-xl p-5 border border-status-absent/30 shadow-[0_0_15px_rgba(239,68,68,0.1)] flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold text-status-absent">{attendance.absent}</span>
              <span className="text-[11px] font-bold text-status-absent uppercase tracking-wider mt-1">Absent</span>
            </div>
          </div>

          {/* Recent Attendance Log */}
          <div className="bg-surface/80 backdrop-blur-xl rounded-xl shadow-sm border border-secondary/20 p-5 flex-1">
            <h3 className="font-bold font-heading text-slate-100 mb-5 flex items-center justify-between">
              Recent Log <Icon name="history" size={18} className="text-slate-400" />
            </h3>
            
            <div className="flex flex-col gap-4">
              {attendance.records.length === 0 && (
                <div className="text-sm text-slate-500 py-4 text-center">No attendance records found yet.</div>
              )}
              {attendance.records.slice(0, 5).map((record: any) => {
                const stat = getAttendanceStatusInfo(record.status);
                return (
                  <div key={record.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-container/50 border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${stat.bg} ${stat.color}`}>
                        <Icon name={stat.icon} size={20} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-200">
                          {format(parseISO(record.date), "EEEE, MMMM d, yyyy")}
                        </span>
                        {record.remarks && (
                          <span className="text-xs text-slate-400 mt-0.5">{record.remarks}</span>
                        )}
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-md text-xs font-bold ${stat.bg} ${stat.color}`}>
                      {stat.label}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {attendance.records.length > 5 && (
              <div className="mt-4 text-center">
                <Link to="/students/me" className="text-sm font-bold text-secondary hover:text-secondary/80 transition-colors">
                  View Full History &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Events & Profile */}
        <div className="flex flex-col gap-6">
          <div className="bg-surface/80 backdrop-blur-xl rounded-xl shadow-sm border border-secondary/20 p-5 flex flex-col items-center justify-center relative overflow-hidden group min-h-[220px]">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-secondary/50 via-transparent to-transparent bg-[length:12px_12px]" />
            <h3 className="font-bold text-[11px] uppercase tracking-widest text-slate-400 mb-2 relative z-10">Overall Attendance</h3>
            <div className="relative flex items-center justify-center z-10">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r="56" fill="transparent" stroke="currentColor" strokeWidth="12" className="text-surface-container" />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - attendance.percentage / 100)}`}
                  strokeLinecap="round"
                  className={`${attendance.percentage >= 90 ? "text-emerald-500 shadow-[0_0_15px_#10b981]" : attendance.percentage >= 75 ? "text-secondary neon-text-cyan" : "text-status-absent shadow-[0_0_15px_#ef4444]"}`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-3xl font-extrabold font-heading text-slate-100">{attendance.percentage}%</span>
              </div>
            </div>
            <p className="text-xs font-medium text-slate-400 mt-4 text-center relative z-10">
              {attendance.percentage >= 90 ? "Great job! Keep it up." : attendance.percentage >= 75 ? "You're doing okay." : "You're at risk. Try to attend more."}
            </p>
          </div>

          <div className="bg-surface/80 backdrop-blur-xl rounded-xl shadow-sm border border-primary/20 p-5 flex-1">
            <h3 className="font-bold font-heading text-slate-100 mb-5 flex items-center justify-between">
              Upcoming Events <Icon name="event_note" size={18} className="text-slate-400" />
            </h3>
            <div className="flex flex-col gap-4">
              {upcomingEvents.length === 0 && (
                <div className="text-sm text-slate-500 text-center py-4">No upcoming events.</div>
              )}
              {upcomingEvents.map((evt: any) => {
                const config = getEventIcon(evt.category);
                return (
                  <div key={evt.id} className="flex items-center gap-3 text-sm group">
                    <div className="flex flex-col items-center justify-center bg-surface-container rounded-lg p-2 min-w-[3rem] border border-secondary/20">
                      <span className="text-[10px] font-bold text-secondary uppercase leading-none mb-1">
                        {format(parseISO(evt.start_date), "MMM")}
                      </span>
                      <span className="text-lg font-extrabold text-slate-200 leading-none">
                        {format(parseISO(evt.start_date), "d")}
                      </span>
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="font-bold text-slate-200 line-clamp-1">{evt.title}</span>
                      <span className="text-xs font-medium text-slate-400 capitalize">{evt.category} event</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
