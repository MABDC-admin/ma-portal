import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "./auth-middleware";
import { db } from "./db";

export const listTeachersFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    if (context.user.role !== "admin") throw new Error("Forbidden: admin role required");
    const teachers = await db.teacher.findMany({
      include: {
        user: { select: { email: true, full_name: true } }
      },
      orderBy: { employee_id: "asc" }
    });
    return teachers.map(t => ({
      ...t,
      profiles: t.user
    }));
  });

export const toggleTeacherStatusFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: { user_id: string; status: "active" | "inactive" }) => input)
  .handler(async ({ data, context }) => {
    if (context.user.role !== "admin") throw new Error("Forbidden: admin role required");
    await db.teacher.update({
      where: { user_id: data.user_id },
      data: { status: data.status }
    });
    return { ok: true };
  });

export const getEligibleTeacherProfilesFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    if (context.user.role !== "admin") throw new Error("Forbidden: admin role required");
    
    // Find users who are NOT already in the teacher table
    const existingTeacherUserIds = (await db.teacher.findMany({ select: { user_id: true } })).map(t => t.user_id);
    
    const users = await db.user.findMany({
      where: {
        id: { notIn: existingTeacherUserIds }
      },
      select: { id: true, email: true, full_name: true, role: true },
      orderBy: { email: "asc" }
    });
    return users;
  });

export const addTeacherFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: {
    user_id: string;
    employee_id: string;
    department: string;
    subjects: string[];
  }) => input)
  .handler(async ({ data, context }) => {
    if (context.user.role !== "admin") throw new Error("Forbidden: admin role required");
    
    // Create teacher record
    await db.teacher.create({
      data: {
        user_id: data.user_id,
        employee_id: data.employee_id,
        department: data.department,
        subjects: data.subjects,
        status: "active"
      }
    });

    // Update user role to teacher
    await db.user.update({
      where: { id: data.user_id },
      data: { role: "teacher" }
    });

    return { ok: true };
  });
