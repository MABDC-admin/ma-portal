import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "./auth-middleware";
import { db } from "./db";

export const getFacultyTeachersFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    if (context.user.role !== "admin" && context.user.role !== "academic_director") {
      throw new Error("Forbidden");
    }
    const teachers = await db.teacher.findMany({
      include: {
        user: { select: { email: true, full_name: true } }
      },
      orderBy: { employee_id: "asc" }
    });
    return teachers.map(t => ({
      user_id: t.id,
      employee_id: t.employee_id,
      department: t.department,
      subjects: t.subjects,
      status: t.status,
      profiles: t.user
    }));
  });

export const getFacultyDllCountsFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    if (context.user.role !== "admin" && context.user.role !== "academic_director") {
      throw new Error("Forbidden");
    }
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const dlls = await db.dll.findMany({
      where: { lesson_date: { gte: since } },
      select: { teacher_id: true, status: true }
    });
    
    const map: Record<string, { total: number; approved: number; returned: number; submitted: number }> = {};
    for (const d of dlls) {
      const t = (map[d.teacher_id] ||= { total: 0, approved: 0, returned: 0, submitted: 0 });
      t.total++;
      if (d.status === "approved") t.approved++;
      else if (d.status === "returned") t.returned++;
      else if (d.status === "submitted") t.submitted++;
    }
    return map;
  });
