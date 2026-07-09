import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, Card, StatusPill } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/learners/$id")({
  component: LearnerProfilePage,
});

function gradeLabel(g: number) {
  if (g === -1) return "Kindergarten 1";
  if (g === 0) return "Kindergarten 2";
  return `Grade ${g}`;
}

function LearnerProfilePage() {
  const { id } = Route.useParams();

  const { data: student, isLoading, error } = useQuery({
    queryKey: ["student_profile", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select(`
          user_id, student_number, status, photo_url, created_at,
          profiles!students_user_id_profiles_fkey(full_name, email),
          sections(name, grade_level, academic_year)
        `)
        .eq("user_id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: anecdotals } = useQuery({
    queryKey: ["student_anecdotals", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anecdotal_entries")
        .select("*")
        .eq("student_id", id)
        .order("occurred_on", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: attendance } = useQuery({
    queryKey: ["student_attendance", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", id)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: record } = useQuery({
    queryKey: ["learner_record", student?.profiles?.full_name],
    enabled: !!student?.profiles?.full_name,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learner_records" as any)
        .select("*")
        .eq("student_name", student?.profiles?.full_name)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      // If no record is found, it throws PGRST116 (0 rows returned), which we can safely ignore
      if (error && error.code !== "PGRST116") throw error;
      return (data || null) as any;
    },
  });

  if (isLoading) {
    return (
      <AppShell title="Loading Profile...">
        <div className="flex h-64 items-center justify-center">
          <Icon name="progress_activity" size={32} className="animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (error || !student) {
    return (
      <AppShell title="Error">
        <div className="p-8 text-status-absent">Failed to load student profile.</div>
      </AppShell>
    );
  }

  // Calculate Attendance Stats
  const totalDays = attendance?.length || 0;
  const presentDays = attendance?.filter((a) => a.status === "present" || a.status === "late" || a.status === "excused").length || 0;
  const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
  const isAtRisk = attendanceRate > 0 && attendanceRate < 80;

  return (
    <AppShell>
      <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
        <div className="flex items-center gap-3">
          <Link to="/learners" className="flex items-center justify-center h-10 w-10 -ml-2 rounded-full hover:bg-surface-container transition-colors text-tertiary hover:text-foreground">
            <Icon name="arrow_back" size={24} />
          </Link>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
            Learner Profile
          </h1>
        </div>
        
        {/* TOP HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-surface-container-low/50 backdrop-blur-md border border-outline-variant/30 p-6 rounded-3xl shadow-sm">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="h-20 w-20 rounded-2xl overflow-hidden bg-primary/10 flex items-center justify-center shadow-inner border border-outline-variant/20">
                {student.photo_url ? (
                  <img src={student.photo_url} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <Icon name="person" size={40} className="text-primary/50" />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 h-6 w-6 bg-status-present rounded-full border-2 border-surface flex items-center justify-center">
                <Icon name="check" size={14} className="text-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold font-heading text-foreground">
                  {student.profiles?.full_name || "Unknown Student"}
                </h1>
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md text-xs font-bold font-mono">
                  #{student.student_number}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-tertiary mb-3">
                <div className="flex items-center gap-1.5">
                  <Icon name="school" size={16} />
                  <span>
                    {student.sections ? `${gradeLabel(student.sections.grade_level)} - ${student.sections.name}` : "Unassigned"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Icon name="mail" size={16} />
                  <span>{student.profiles?.email || "No email"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill tone="present">Active Student</StatusPill>
                {isAtRisk && <StatusPill tone="absent">At Risk (Attendance)</StatusPill>}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <button className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-bold shadow-sm hover:brightness-110 transition">
              <Icon name="mail" size={18} />
              Message Parent
            </button>
            <button className="flex items-center justify-center gap-2 bg-primary/10 text-primary px-6 py-2.5 rounded-xl font-bold hover:bg-primary/20 transition">
              <Icon name="download" size={18} />
              Download Report
            </button>
          </div>
        </div>

        {/* STUDENT INFORMATION DROPDOWN */}
        <details className="group bg-surface-container-low/50 border border-outline-variant/30 rounded-3xl shadow-sm overflow-hidden open:bg-surface-container-low transition-all duration-300">
          <summary className="flex items-center justify-between p-6 cursor-pointer list-none select-none">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold font-heading text-foreground">Student Information</h2>
              <Icon name="expand_more" size={24} className="text-tertiary group-open:rotate-180 transition-transform duration-300" />
            </div>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 bg-status-present/10 text-status-present px-3 py-1 rounded-full text-xs font-bold border border-status-present/20">
                <Icon name="verified_user" size={14} /> Face ID Registered
              </span>
              <span className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold border border-primary/20">
                <Icon name="fingerprint" size={14} /> Fingerprint Verified
              </span>
            </div>
          </summary>
          
          <div className="p-6 pt-2 border-t border-outline-variant/20 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* PERSONAL INFORMATION */}
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Personal Information</h3>
              <div>
                <p className="text-[10px] text-tertiary uppercase tracking-wider mb-0.5">Full Name</p>
                <p className="text-sm font-semibold">{student.profiles?.full_name || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-tertiary uppercase tracking-wider mb-0.5">Student ID</p>
                <p className="text-sm font-semibold font-mono">#{student.student_number}</p>
              </div>
              <div>
                <p className="text-[10px] text-tertiary uppercase tracking-wider mb-0.5">Date of Birth</p>
                <p className="text-sm font-semibold">{record?.birthdate || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-tertiary uppercase tracking-wider mb-0.5">Gender</p>
                <p className="text-sm font-semibold capitalize">{record?.gender || "—"}</p>
              </div>
            </div>

            {/* ACADEMIC DETAILS */}
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Academic Details</h3>
              <div>
                <p className="text-[10px] text-tertiary uppercase tracking-wider mb-0.5">Current Grade</p>
                <p className="text-sm font-semibold">{student.sections ? gradeLabel(student.sections.grade_level) : "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-tertiary uppercase tracking-wider mb-0.5">Section</p>
                <p className="text-sm font-semibold">{student.sections?.name || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-tertiary uppercase tracking-wider mb-0.5">Date Enrolled</p>
                <p className="text-sm font-semibold">
                  {student.created_at ? new Date(student.created_at).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' }) : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-tertiary uppercase tracking-wider mb-0.5">Advisor</p>
                <p className="text-sm font-semibold">—</p>
              </div>
            </div>

            {/* EMERGENCY CONTACT */}
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Emergency Contact</h3>
              <div>
                <p className="text-[10px] text-tertiary uppercase tracking-wider mb-0.5">Guardian Name</p>
                <p className="text-sm font-semibold">{record?.mother_name || record?.father_name || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-tertiary uppercase tracking-wider mb-0.5">Relationship</p>
                <p className="text-sm font-semibold">{record?.mother_name ? "Mother" : record?.father_name ? "Father" : "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-tertiary uppercase tracking-wider mb-0.5">Contact Number</p>
                <p className="text-sm font-semibold">{record?.mother_contact || record?.father_contact || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-tertiary uppercase tracking-wider mb-0.5">Email</p>
                <p className="text-sm font-semibold">{student.profiles?.email || "—"}</p>
              </div>
            </div>
          </div>
        </details>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 border-l-4 border-l-status-absent">
            <p className="text-xs font-bold text-tertiary uppercase tracking-wider mb-2">Overall Attendance</p>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-3xl font-bold font-heading text-status-absent">{attendanceRate}%</span>
              <span className="text-sm font-semibold text-status-absent mb-1 flex items-center">
                <Icon name="trending_down" size={16} className="mr-0.5" />
                ~4%
              </span>
            </div>
            <div className="h-1.5 w-full bg-outline-variant/30 rounded-full overflow-hidden">
              <div className="h-full bg-status-absent rounded-full" style={{ width: `${attendanceRate}%` }} />
            </div>
          </Card>

          <Card className="p-5 border-l-4 border-l-primary">
            <p className="text-xs font-bold text-tertiary uppercase tracking-wider mb-2">Anecdotal Entries</p>
            <div className="flex items-end gap-2 mb-1">
              <span className="text-3xl font-bold font-heading">{anecdotals?.length || 0}</span>
              <span className="text-sm font-medium text-tertiary mb-1">Total Record</span>
            </div>
            <p className="text-sm text-tertiary">{anecdotals?.filter(a => a.category === 'behavioral').length || 0} Urgent concerns</p>
          </Card>

          <Card className="p-5 border-l-4 border-l-status-present">
            <p className="text-xs font-bold text-tertiary uppercase tracking-wider mb-2">GPA / Rank</p>
            <div className="flex items-end gap-2 mb-1">
              <span className="text-3xl font-bold font-heading">3.2</span>
              <span className="bg-status-present/10 text-status-present px-1.5 py-0.5 rounded text-[10px] font-bold mb-1.5">
                TOP 15%
              </span>
            </div>
            <p className="text-sm text-tertiary">Consistent in STEM</p>
          </Card>

          <Card className="p-5 border-l-4 border-l-primary">
            <p className="text-xs font-bold text-tertiary uppercase tracking-wider mb-2">Classes Enrolled</p>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-3xl font-bold font-heading">6</span>
              <span className="text-sm font-medium text-tertiary mb-1">Core subjects</span>
            </div>
            <div className="flex gap-1 h-1.5 w-full">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="flex-1 bg-primary rounded-full" />
              ))}
            </div>
          </Card>
        </div>

        {/* MAIN CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COL (Graphs & Logs) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* ATTENDANCE TRENDS (Mock Chart) */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold font-heading">Attendance Trends</h3>
                <div className="flex bg-surface-container border border-outline-variant/30 rounded-lg p-1">
                  <button className="px-3 py-1 text-xs font-bold bg-white text-primary rounded-md shadow-sm">30 Days</button>
                  <button className="px-3 py-1 text-xs font-bold text-tertiary hover:text-foreground transition">90 Days</button>
                </div>
              </div>
              <div className="h-48 flex items-end justify-between gap-2">
                {/* Mock bars for the chart */}
                {[80, 90, 100, 40, 100, 100, 95, 85, 90, 100, 40, 90, 100].map((h, i) => (
                  <div key={i} className="w-full relative group flex flex-col justify-end h-full">
                    <div 
                      className={`w-full rounded-t-sm transition-all duration-300 ${h < 50 ? 'bg-status-absent' : h === 100 ? 'bg-primary' : 'bg-status-present/60'}`} 
                      style={{ height: `${h}%` }}
                    />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-inverse-surface text-inverse-on-surface text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {h}%
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-tertiary mt-2 font-bold uppercase tracking-wider">
                <span>Nov 01</span>
                <span>Nov 15</span>
                <span>Nov 30</span>
              </div>
            </Card>

            {/* ATTENDANCE LOG (Mock Calendar) */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold font-heading">Attendance Log: November</h3>
                <div className="flex gap-3 text-xs font-semibold text-tertiary">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-status-present" /> Present</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-status-late" /> Late</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-status-absent" /> Absent</span>
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(d => (
                  <div key={d} className="text-[10px] font-bold text-center text-tertiary py-2">{d}</div>
                ))}
                
                {/* Mock Days */}
                {Array.from({ length: 28 }).map((_, i) => {
                  const day = i + 1;
                  const isWeekend = i % 7 === 5 || i % 7 === 6;
                  const isSelected = day === 9;
                  
                  let status: string | null = "present";
                  if (day === 5 || day === 12) status = "absent";
                  if (day === 8 || day === 17) status = "late";
                  if (isWeekend) status = null;

                  return (
                    <div 
                      key={i} 
                      className={`
                        flex flex-col items-center justify-center p-2 rounded-xl border h-16
                        ${isWeekend ? 'border-transparent bg-transparent opacity-30' : 'border-outline-variant/30 bg-surface/30'}
                        ${isSelected ? 'border-primary shadow-sm bg-primary/5' : ''}
                      `}
                    >
                      <span className={`text-sm font-semibold mb-2 ${isSelected ? 'text-primary' : 'text-foreground'}`}>{day}</span>
                      {status && (
                        <div className={`w-1.5 h-1.5 rounded-full ${status === 'present' ? 'bg-status-present' : status === 'absent' ? 'bg-status-absent' : 'bg-status-late'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* ENROLLED CLASSES */}
            <div className="mt-2">
              <h3 className="text-lg font-bold font-heading mb-4 px-2">Enrolled Classes</h3>
              <Card className="overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container/50 border-b border-outline-variant/30">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold text-tertiary">Class Name</th>
                      <th className="px-4 py-3 text-xs font-bold text-tertiary">Instructor</th>
                      <th className="px-4 py-3 text-xs font-bold text-tertiary">Attendance</th>
                      <th className="px-4 py-3 text-xs font-bold text-tertiary">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    <tr>
                      <td className="px-4 py-4">
                        <p className="font-bold">Physics Honors</p>
                        <p className="text-[10px] text-tertiary mt-0.5">PHY-A</p>
                      </td>
                      <td className="px-4 py-4 text-tertiary">Dr. Arthur Vance</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-status-absent w-8">64%</span>
                          <div className="h-1.5 w-16 bg-outline-variant/30 rounded-full overflow-hidden">
                            <div className="h-full bg-status-absent rounded-full w-[64%]" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="bg-status-absent/10 text-status-absent text-[10px] font-bold px-2 py-1 rounded-md">WARNING</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-4">
                        <p className="font-bold">Calculus II</p>
                        <p className="text-[10px] text-tertiary mt-0.5">MA22-C</p>
                      </td>
                      <td className="px-4 py-4 text-tertiary">Ms. Clara Smith</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary w-8">88%</span>
                          <div className="h-1.5 w-16 bg-outline-variant/30 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full w-[88%]" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded-md">STABLE</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Card>
            </div>
          </div>

          {/* RIGHT COL (Sidebars) */}
          <div className="flex flex-col gap-6">
            
            {/* QUICK ACTIONS */}
            <div className="bg-primary text-white rounded-3xl p-6 shadow-md shadow-primary/20">
              <h3 className="font-bold mb-4">Quick Actions</h3>
              <div className="flex flex-col gap-2">
                <button className="flex items-center justify-center gap-2 w-full py-2.5 bg-white/10 hover:bg-white/20 transition rounded-xl text-sm font-semibold border border-white/10">
                  <Icon name="add_circle" size={18} />
                  Add Anecdotal Entry
                </button>
                <button className="flex items-center justify-center gap-2 w-full py-2.5 bg-white/10 hover:bg-white/20 transition rounded-xl text-sm font-semibold border border-white/10">
                  <Icon name="warning" size={18} />
                  Issue Warning
                </button>
                <button className="flex items-center justify-center gap-2 w-full py-2.5 bg-white text-primary hover:brightness-95 transition rounded-xl text-sm font-bold shadow-sm">
                  <Icon name="schedule" size={18} />
                  Schedule Meeting
                </button>
              </div>
            </div>

            {/* BEHAVIORAL RECORDS */}
            <Card className="flex flex-col h-[500px]">
              <div className="flex items-center justify-between p-5 border-b border-outline-variant/30">
                <h3 className="font-bold font-heading">Behavioral Records</h3>
                <button className="text-xs font-bold text-primary hover:underline">View All</button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                {anecdotals && anecdotals.length > 0 ? (
                  anecdotals.map(entry => (
                    <div key={entry.id} className="bg-surface-container-low border border-outline-variant/50 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          entry.category === 'behavioral' ? 'bg-status-absent/10 text-status-absent' : 
                          'bg-tertiary/10 text-tertiary'
                        }`}>
                          {entry.category === 'behavioral' ? 'URGENT' : 'MONITOR'}
                        </span>
                        <span className="text-[10px] font-semibold text-tertiary">
                          {new Date(entry.occurred_on).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold mb-1 line-clamp-1">{entry.category === 'behavioral' ? 'Repeated Issue' : 'General Note'}</h4>
                      <p className="text-xs text-tertiary line-clamp-2 mb-3">{entry.note}</p>
                      <div className="flex items-center gap-1.5 text-[10px] font-medium text-tertiary bg-surface-container/50 self-start px-2 py-1 rounded">
                        <Icon name="person" size={12} />
                        Reported by Teacher
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-sm text-tertiary py-8">No records found.</div>
                )}
                
                {/* MOCK EXTRA CARDS FOR VISUAL PURPOSES IF NO DATA */}
                {(!anecdotals || anecdotals.length === 0) && (
                  <>
                    <div className="bg-surface-container-low border border-outline-variant/50 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-status-absent/10 text-status-absent">
                          URGENT
                        </span>
                        <span className="text-[10px] font-semibold text-tertiary">Nov 29, 2023</span>
                      </div>
                      <h4 className="text-sm font-bold mb-1">Repeated Unexcused Absence</h4>
                      <p className="text-xs text-tertiary line-clamp-2 mb-3">Marcus missed the Physics lab for the 3rd time this month without providing a doctor's note...</p>
                      <div className="flex items-center gap-1.5 text-[10px] font-medium text-tertiary bg-surface-container/50 self-start px-2 py-1 rounded w-fit">
                        <Icon name="person" size={12} />
                        Reported by Dr. Vance
                      </div>
                    </div>
                    
                    <div className="bg-surface-container-low border border-outline-variant/50 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-tertiary/10 text-tertiary">
                          MONITOR
                        </span>
                        <span className="text-[10px] font-semibold text-tertiary">Nov 22, 2023</span>
                      </div>
                      <h4 className="text-sm font-bold mb-1">Late to Morning Assembly</h4>
                      <p className="text-xs text-tertiary line-clamp-2 mb-3">Arrived 20 minutes late citing transportation issues. This is the fourth instance this term.</p>
                      <div className="flex items-center gap-1.5 text-[10px] font-medium text-tertiary bg-surface-container/50 self-start px-2 py-1 rounded w-fit">
                        <Icon name="person" size={12} />
                        Reported by Mr. Sarah
                      </div>
                    </div>
                  </>
                )}
              </div>
              <button className="flex items-center justify-center gap-2 py-4 border-t border-outline-variant/30 text-xs font-bold text-tertiary hover:bg-surface-container-low/50 transition mt-auto">
                <Icon name="history" size={16} />
                View Full History
              </button>
            </Card>

            {/* RESIDENTIAL ZONE (Map Placeholder) */}
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-outline-variant/30">
                <h3 className="text-sm font-bold font-heading">Residential Zone</h3>
              </div>
              <div className="h-32 bg-primary/10 relative flex flex-col items-center justify-center border-b border-outline-variant/30">
                 {/* Decorative map illustration */}
                 <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDIwaDQwTTIwIDB2NDAiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLW9wYWNpdHk9Ii4wNSIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+PC9zdmc+')", backgroundSize: '20px' }} />
                 <div className="w-8 h-8 bg-primary rounded-full border-4 border-white shadow-md z-10 flex items-center justify-center animate-bounce">
                    <Icon name="home" size={14} className="text-white" />
                 </div>
              </div>
              <div className="p-4">
                <p className="text-[10px] font-bold text-tertiary uppercase tracking-wider mb-1">Registered Address</p>
                <p className="text-sm font-semibold">822 Oakwood Heights, North Wing</p>
              </div>
            </Card>
            
          </div>
        </div>
      </div>
    </AppShell>
  );
}
