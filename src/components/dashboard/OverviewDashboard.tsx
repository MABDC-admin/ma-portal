import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Icon } from "@/components/Icon";
import { PieChart, Pie, Cell, BarChart, Bar, ResponsiveContainer, XAxis, Tooltip } from "recharts";
import { Link } from "@tanstack/react-router";

// --- Color Palette ---
const COLORS = ["#00f0ff", "#ff3366", "#a855f7", "#3b82f6", "#eab308", "#ec4899", "#f97316"];
const GENDER_COLORS = { Male: "#00f0ff", Female: "#ff3366" };

export function OverviewDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard_stats"],
    queryFn: async () => {
      const { getDashboardStatsFn } = await import("@/lib/dashboard.functions");
      const data = await getDashboardStatsFn();
      return data;
    },
  });

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

  const getDllStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "text-green-500 bg-green-100";
      case "submitted":
        return "text-blue-500 bg-blue-100";
      case "returned":
        return "text-red-500 bg-red-100";
      default:
        return "text-yellow-500 bg-yellow-100";
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8 bg-transparent min-h-screen relative z-0">
      {/* Background gradients for the neon effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background -z-10" />
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-900/20 via-background to-transparent -z-10 pointer-events-none" />

      {/* 1. TOP KPI ROW */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 lg:gap-4">
        <div className="bg-surface/80 backdrop-blur-xl rounded-xl p-4 flex justify-between items-center shadow-lg border border-secondary/30 neon-border-cyan group relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 bg-secondary/10 w-24 h-24 rounded-full transition-transform group-hover:scale-110" />
          <div className="flex flex-col relative z-10">
            <span className="text-4xl font-extrabold font-heading text-secondary neon-text-cyan">
              {stats?.totalStudents || 0}
            </span>
            <span className="text-[10px] sm:text-xs uppercase font-bold text-slate-300 mt-1">
              Total Students
            </span>
          </div>
        </div>

        <div className="bg-surface/80 backdrop-blur-xl rounded-xl p-4 flex justify-between items-center shadow-lg border border-primary/30 neon-border-pink group relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 bg-primary/10 w-24 h-24 rounded-full transition-transform group-hover:scale-110" />
          <div className="flex flex-col relative z-10">
            <span className="text-4xl font-extrabold font-heading text-primary neon-text-pink">
              {stats?.totalTeachers || 0}
            </span>
            <span className="text-[10px] sm:text-xs uppercase font-bold text-slate-300 mt-1">
              Teachers
            </span>
          </div>
        </div>

        <div className="bg-surface/80 backdrop-blur-xl rounded-xl p-4 flex justify-between items-center shadow-lg border border-secondary/30 neon-border-cyan group relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 bg-secondary/10 w-24 h-24 rounded-full transition-transform group-hover:scale-110" />
          <div className="flex flex-col relative z-10">
            <span className="text-4xl font-extrabold font-heading text-secondary neon-text-cyan">
              {stats?.totalClasses || 0}
            </span>
            <span className="text-[10px] sm:text-xs uppercase font-bold text-slate-300 mt-1">
              Classes
            </span>
          </div>
        </div>

        <div className="bg-surface/80 backdrop-blur-xl rounded-xl p-4 flex justify-between items-center shadow-lg border border-primary/30 neon-border-pink group relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 bg-primary/10 w-24 h-24 rounded-full transition-transform group-hover:scale-110" />
          <div className="flex flex-col relative z-10">
            <span className="text-4xl font-extrabold font-heading text-primary neon-text-pink">
              {stats?.pendingEnrollees || 0}
            </span>
            <span className="text-[10px] sm:text-xs uppercase font-bold text-slate-300 mt-1">
              Pending Enrollees
            </span>
          </div>
        </div>

        <div className="bg-surface/80 backdrop-blur-xl rounded-xl p-4 flex justify-between items-center shadow-[0_0_20px_rgba(0,240,255,0.2)] border border-secondary neon-border-cyan col-span-2 md:col-span-1 group relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-secondary/50 via-transparent to-transparent bg-[length:12px_12px]" />
          <div className="flex flex-col relative z-10 w-full">
            <div className="flex justify-between items-center w-full">
              <span className="text-4xl font-extrabold font-heading text-secondary neon-text-cyan">
                {stats?.attendanceRate || 0}%
              </span>
              <Icon
                name="fact_check"
                size={32}
                className="text-secondary opacity-80 group-hover:neon-text-cyan transition-all"
              />
            </div>
            <span className="text-[10px] sm:text-xs uppercase font-bold text-slate-300 mt-1">
              Attendance Rate
            </span>
          </div>
        </div>
      </div>

      {/* 3. MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-2">
        {/* COLUMN 1 */}
        <div className="flex flex-col gap-4">
          <div className="bg-surface/80 backdrop-blur-xl rounded-xl shadow-sm border border-secondary/20 p-5 flex-1">
            <h3 className="font-bold font-heading text-slate-100 mb-5 flex items-center justify-between">
              Upcoming Events <Icon name="event_note" size={18} className="text-slate-400" />
            </h3>
            <div className="flex flex-col gap-5">
              {(stats?.upcomingEvents || []).length === 0 && (
                <div className="text-sm text-slate-500">No upcoming events.</div>
              )}
              {(stats?.upcomingEvents || []).map((evt) => {
                const config = getEventIcon(evt.category);
                return (
                  <div
                    key={evt.id}
                    className="flex items-center justify-between text-sm group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg bg-surface-container border border-secondary/30 text-secondary group-hover:neon-border-cyan group-hover:neon-text-cyan transition-all`}
                      >
                        <Icon name={config.icon} size={18} />
                      </div>
                      <span className="font-bold text-slate-200 group-hover:text-white transition-colors">
                        {evt.title}
                      </span>
                    </div>
                    <span className="text-secondary text-xs font-bold bg-secondary/10 px-2 py-1 rounded border border-secondary/20">
                      {format(parseISO(evt.start_date), "MMM d")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-surface/80 backdrop-blur-xl rounded-xl shadow-sm border border-primary/20 p-5 flex-1">
            <h3 className="font-bold font-heading text-slate-100 mb-5 flex items-center justify-between">
              Teacher Schedule <Icon name="list" size={18} className="text-slate-400" />
            </h3>
            <div className="flex flex-col gap-5">
              {(stats?.teachersList || []).length === 0 && (
                <div className="text-sm text-slate-500">No teachers found.</div>
              )}
              {(stats?.teachersList || []).map((t, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm pb-3 border-b border-white/5 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center border border-primary/30 shadow-[0_0_10px_rgba(255,51,102,0.1)]">
                      <Icon name="person" size={20} className="text-primary neon-text-pink" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-200">
                        {t.profiles?.full_name || "Unknown"}
                      </span>
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                        {t.department || "General"}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400 text-right w-24 truncate">
                    {t.subjects?.[0] || "No Subject"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Link
            to="/learners"
            className="bg-gradient-to-r from-secondary/10 to-transparent rounded-xl shadow-sm border border-secondary/50 p-4 flex items-center justify-between text-slate-200 hover:text-white hover:border-secondary transition-all cursor-pointer font-bold group neon-border-cyan"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary/20 rounded-lg group-hover:bg-secondary/30 transition-colors border border-secondary/30">
                <Icon name="groups" size={20} className="text-secondary neon-text-cyan" />
              </div>
              Manage Students
            </div>
            <Icon
              name="arrow_forward"
              size={20}
              className="text-secondary group-hover:translate-x-1 transition-transform"
            />
          </Link>
        </div>

        {/* COLUMN 2 */}
        <div className="flex flex-col gap-4">
          <div className="bg-surface/80 backdrop-blur-xl rounded-xl shadow-sm border border-secondary/20 p-5 flex-1">
            <h3 className="font-bold font-heading text-slate-100 mb-5 flex items-center justify-between">
              Recent Activities <Icon name="refresh" size={18} className="text-slate-400" />
            </h3>
            <div className="flex flex-col gap-5">
              {(stats?.recentActivities || []).length === 0 && (
                <div className="text-sm text-slate-500">No recent activity.</div>
              )}
              {(stats?.recentActivities || []).map((act: any) => (
                <div key={act.id} className="flex items-start gap-3 text-sm">
                  <div
                    className={`p-1.5 rounded-lg mt-0.5 bg-surface-container border border-white/10`}
                  >
                    <Icon name="description" size={14} className="text-secondary" />
                  </div>
                  <span className="text-slate-400 font-medium leading-snug pt-0.5">
                    <span className="font-bold text-slate-200">
                      {act.profiles?.full_name || "Teacher"}
                    </span>{" "}
                    submitted a DLL for {act.subject} ({act.status}).
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface/80 backdrop-blur-xl rounded-xl shadow-sm border border-primary/20 p-5 flex flex-col items-center flex-1">
            <div className="w-full flex justify-end">
              <Icon
                name="close"
                size={16}
                className="text-slate-500 hover:text-slate-300 cursor-pointer transition-colors"
              />
            </div>
            <div className="h-36 w-full flex items-center justify-center relative -mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.genderData || []}
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {(stats?.genderData || []).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          GENDER_COLORS[entry.name as keyof typeof GENDER_COLORS] ||
                          COLORS[index % COLORS.length]
                        }
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">
                  Male
                </span>
                <span className="text-2xl font-bold font-heading text-white leading-none mt-1 neon-text-cyan">
                  {stats?.genderData?.find((d) => d.name === "Male")?.value || 0}%
                </span>
              </div>
            </div>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <div className="w-2.5 h-2.5 bg-[#00f0ff] rounded-sm shadow-[0_0_8px_#00f0ff]" />{" "}
                Male
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <div className="w-2.5 h-2.5 bg-[#ff3366] rounded-sm shadow-[0_0_8px_#ff3366]" />{" "}
                Female
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-primary/10 to-transparent rounded-xl shadow-sm border border-primary/50 p-4 flex items-center justify-between text-slate-200 hover:text-white hover:border-primary transition-all cursor-pointer font-bold group neon-border-pink">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg group-hover:bg-primary/30 transition-colors border border-primary/30">
                <Icon name="class" size={20} className="text-primary neon-text-pink" />
              </div>
              Organize Classes
            </div>
            <Icon
              name="arrow_forward"
              size={20}
              className="text-primary group-hover:translate-x-1 transition-transform"
            />
          </div>
        </div>

        {/* COLUMN 3 */}
        <div className="flex flex-col gap-4">
          <div className="bg-surface/80 backdrop-blur-xl rounded-xl shadow-sm border border-secondary/20 p-5 flex-1 flex flex-col">
            <h3 className="font-bold font-heading text-slate-100 mb-4 flex justify-between items-center">
              Student Overview
              <div className="flex gap-3">
                <Icon
                  name="open_in_full"
                  size={16}
                  className="text-slate-500 hover:text-slate-300 cursor-pointer transition-colors"
                />
                <Icon
                  name="menu"
                  size={16}
                  className="text-slate-500 hover:text-slate-300 cursor-pointer transition-colors"
                />
              </div>
            </h3>

            <div className="h-44 w-full flex">
              <ResponsiveContainer width="60%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.gradeData || []}
                    innerRadius={0}
                    outerRadius={70}
                    dataKey="value"
                    stroke="#1a1d36" /* surface color */
                    strokeWidth={2}
                  >
                    {(stats?.gradeData || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="w-[40%] flex flex-col justify-center gap-2 text-xs font-bold text-slate-300">
                {(stats?.gradeData || []).map((entry, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shadow-[0_0_5px_currentColor]"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      {entry.name}
                    </div>
                    <span className="text-slate-400 font-semibold">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-28 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.attendanceChartData || []}>
                  <XAxis
                    dataKey="name"
                    fontSize={10}
                    axisLine={false}
                    tickLine={false}
                    stroke="#94a3b8"
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    contentStyle={{
                      backgroundColor: "#1a1d36",
                      border: "1px solid rgba(0,240,255,0.2)",
                    }}
                    formatter={(value: number) => [`${value}%`, "Attendance"]}
                  />
                  <Bar dataKey="val" fill="#00f0ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-surface/80 backdrop-blur-xl rounded-xl shadow-lg p-5 border border-secondary/50 neon-border-cyan relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,240,255,0.05)_50%,transparent_75%,transparent_100%)] bg-[length:250px_250px] animate-[pulse_3s_infinite]" />
            <div className="flex justify-between items-center mb-4 font-bold text-sm relative z-10">
              <span className="font-heading tracking-wide text-secondary neon-text-cyan">
                {format(new Date(), "MMMM yyyy")}
              </span>
            </div>
            {/* Minimal static calendar representation to match layout exactly without breaking CSS */}
            <div className="grid grid-cols-7 text-center text-[11px] gap-y-3 mt-4 font-bold opacity-80 text-slate-300 relative z-10">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <div key={d}>{d}</div>
              ))}
              {[...Array(30)].map((_, i) => (
                <div
                  key={i}
                  className={`p-1.5 ${i === 5 ? "bg-secondary text-surface rounded-full font-extrabold shadow-[0_0_10px_#00f0ff] transform scale-110" : ""}`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-r from-secondary to-blue-500 text-white rounded-xl shadow-lg p-4 flex items-center justify-between hover:brightness-110 transition cursor-pointer font-bold group border border-secondary neon-border-cyan">
            <div className="flex items-center gap-3">
              <div className="p-1 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors backdrop-blur-sm">
                <Icon name="add" size={20} />
              </div>
              Track Attendance
            </div>
            <Icon
              name="arrow_forward"
              size={20}
              className="group-hover:translate-x-1 transition-transform"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
