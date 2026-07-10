import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "./auth-middleware";
import { db } from "./db";
import { subMonths, format, parseISO } from "date-fns";

export const getDashboardStatsFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const today = new Date();
    const startOfTodayUTC = new Date(today.toISOString().split("T")[0] + "T00:00:00.000Z");
    const sixMonthsAgo = subMonths(today, 5);

    const [
      students,
      teachersCount,
      sectionsCount,
      attendance,
      events,
      dlls,
      teachersList,
      pendingCount
    ] = await Promise.all([
      db.student.findMany({ select: { user_id: true, section: { select: { grade_level: true } } } }),
      db.user.count({ where: { role: "teacher" } }),
      db.section.count(),
      db.attendance.findMany({
        where: { date: { gte: sixMonthsAgo } },
        select: { status: true, date: true }
      }),
      db.schoolEvent.findMany({
        where: { end_date: { gte: startOfTodayUTC } },
        orderBy: { start_date: "asc" },
        take: 3
      }),
      db.dll.findMany({
        orderBy: { created_at: "desc" },
        take: 4,
        select: {
          id: true,
          subject: true,
          status: true,
          created_at: true,
          teacher: { select: { full_name: true } }
        }
      }),
      db.user.findMany({
        where: { role: "teacher" },
        take: 3,
        select: {
          id: true,
          full_name: true,
        }
      }),
      db.student.count({ where: { status: "pending" } })
    ]);

    const gradeCounts: Record<string, number> = {};
    students.forEach((s) => {
      const gl = s.section?.grade_level;
      if (gl !== undefined && gl !== null) {
        const label = gl === -1 ? "K1" : gl === 0 ? "K2" : `G${gl}`;
        gradeCounts[label] = (gradeCounts[label] || 0) + 1;
      }
    });
    const gradeData = Object.keys(gradeCounts).map((k) => ({ name: k, value: gradeCounts[k] }));

    const present = attendance.filter((a) => a.status === "present" || a.status === "late").length;
    const attRate = attendance.length > 0 ? Math.round((present / attendance.length) * 100) : 0;

    const attChartMap: Record<string, { total: number, present: number }> = {};
    attendance.forEach(a => {
      if (!a.date) return;
      const month = format(a.date, "MMM");
      if (!attChartMap[month]) attChartMap[month] = { total: 0, present: 0 };
      attChartMap[month].total++;
      if (a.status === "present" || a.status === "late") attChartMap[month].present++;
    });
    
    const attendanceChartData = Object.keys(attChartMap).map(k => ({
      name: k,
      val: Math.round((attChartMap[k].present / attChartMap[k].total) * 100)
    }));

    return {
      totalStudents: students.length,
      totalTeachers: teachersCount,
      totalClasses: sectionsCount,
      pendingEnrollees: pendingCount,
      attendanceRate: attRate,
      genderData: [
        { name: "Male", value: 0 },
        { name: "Female", value: 0 },
      ],
      gradeData,
      attendanceChartData,
      upcomingEvents: events.map(e => ({
        id: e.id,
        title: e.title,
        category: e.category,
        start_date: e.start_date.toISOString(),
      })),
      recentActivities: dlls.map(d => ({
        id: d.id,
        subject: d.subject,
        status: d.status,
        created_at: d.created_at.toISOString(),
        profiles: { full_name: d.teacher?.full_name }
      })),
      teachersList: teachersList.map(t => ({
        department: "General", // Placeholder as it was not in schema
        subjects: [],
        profiles: { full_name: t.full_name }
      }))
    };
  });
