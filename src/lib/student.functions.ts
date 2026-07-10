import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "./auth-middleware";
import { db } from "./db";

export const getStudentDashboardDataFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .validator((input: { studentId?: string } | undefined) => input)
  .handler(async ({ context, data }) => {
    const user = context.user;
    if (!user) throw new Error("Unauthorized");

    let targetId = user.id;

    if (data?.studentId) {
      if (user.role !== "admin" && user.role !== "academic_director" && user.role !== "teacher") {
        throw new Error("Forbidden: Cannot impersonate student");
      }
      targetId = data.studentId;
    }

    const today = new Date();
    const startOfTodayUTC = new Date(today.toISOString().split("T")[0] + "T00:00:00.000Z");

    const [studentProfile, attendanceRecords, upcomingEvents] = await Promise.all([
      db.student.findUnique({
        where: { user_id: targetId },
        include: {
          user: { select: { full_name: true, email: true, avatar_url: true } },
          section: true,
        },
      }),
      db.attendance.findMany({
        where: { student_id: targetId },
        orderBy: { date: "desc" },
        take: 30, // Last 30 days of attendance
      }),
      db.schoolEvent.findMany({
        where: {
          start_date: { gte: startOfTodayUTC },
        },
        orderBy: { start_date: "asc" },
        take: 5,
      }),
    ]);

    // Calculate metrics
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter((a: any) => a.status === "present").length;
    const lateDays = attendanceRecords.filter((a: any) => a.status === "late").length;
    const absentDays = attendanceRecords.filter((a: any) => a.status === "absent").length;
    
    const attendancePercentage =
      totalDays > 0 ? Math.round(((presentDays + lateDays) / totalDays) * 100) : 0;

    return {
      profile: studentProfile,
      attendance: {
        records: attendanceRecords,
        total: totalDays,
        present: presentDays,
        late: lateDays,
        absent: absentDays,
        percentage: attendancePercentage,
      },
      upcomingEvents,
    };
  });
