import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "./auth-middleware";
import { resolveTargetColumn } from "./kiosk-schedule";
import { db } from "./db";

type LogInput = {
  studentId: string; // students.user_id
  action: "in" | "out";
};

function assertKioskOperator(role: string) {
  if (role !== "admin" && role !== "kiosk") {
    throw new Error("Only attendance kiosk operators can use the kiosk");
  }
}

export const logKioskAttendanceFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: LogInput) => input)
  .handler(async ({ data, context }) => {
    const { userId } = context;

    assertKioskOperator(context.user.role);

    // Load student → section + profile
    const student = await db.student.findUnique({
      where: { user_id: data.studentId },
      select: {
        user_id: true,
        section_id: true,
        photo_url: true,
        user: { select: { full_name: true, email: true, avatar_url: true } },
      },
    });

    if (!student) throw new Error("Student not found");
    if (!student.section_id) throw new Error("Learner has no assigned section");

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const column = resolveTargetColumn(data.action, now);

    // Late rule: past 8:00 for am_time_in only.
    const isMorningIn = column === "am_time_in";
    const status =
      isMorningIn && (now.getHours() > 8 || (now.getHours() === 8 && now.getMinutes() > 0))
        ? "late"
        : "present";

    // Check existing row
    const existing = await db.attendance.findFirst({
      where: { student_id: data.studentId, date: new Date(today) },
    });

    const existingTime = existing ? (existing as any)[column] : null;

    if (existing && existingTime) {
      return {
        alreadyLogged: true,
        column,
        time: existingTime.toISOString(),
        student: {
          id: student.user_id,
          name: student.user?.full_name || student.user?.email || "Learner",
          photo: student.photo_url || student.user?.avatar_url || null,
        },
      };
    }

    const payload = {
      status: existing?.status ?? status,
      teacher_id: userId,
      [column]: now,
    };

    if (existing) {
      await db.attendance.update({
        where: { id: existing.id },
        data: payload,
      });
    } else {
      await db.attendance.create({
        data: {
          student_id: data.studentId,
          date: new Date(today),
          status: payload.status,
          teacher_id: userId,
          [column]: now,
        },
      });
    }

    return {
      alreadyLogged: false,
      column,
      time: now.toISOString(),
      status,
      student: {
        id: student.user_id,
        name: student.user?.full_name || student.user?.email || "Learner",
        photo: student.photo_url || student.user?.avatar_url || null,
      },
    };
  });

// Load all enrolled learners with a face descriptor (admin only).
export const listEnrolledLearnersFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    assertKioskOperator(context.user.role);

    const data = await db.student.findMany({
      where: {
        face_descriptor: { isEmpty: false }, // Prisma MongoDB syntax for arrays
      },
      select: {
        user_id: true,
        section_id: true,
        photo_url: true,
        face_descriptor: true,
        section: { select: { name: true, grade_level: true } },
        user: { select: { full_name: true, email: true, avatar_url: true } },
      },
    });

    return data
      .filter((s) => Array.isArray(s.face_descriptor) && s.face_descriptor.length === 128)
      .map((s) => ({
        ...s,
        sections: s.section,
        profiles: s.user,
      }));
  });

// List every learner (admin only) for face registration.
export const listLearnersForEnrollmentFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    if (context.user.role !== "admin") throw new Error("Only admins can register faces");

    const data = await db.student.findMany({
      select: {
        user_id: true,
        student_number: true,
        section_id: true,
        photo_url: true,
        face_descriptor: true,
        section: { select: { name: true, grade_level: true } },
        user: { select: { full_name: true, email: true, avatar_url: true } },
      },
      orderBy: { student_number: "asc" },
    });

    return data.map((s) => ({
      user_id: s.user_id,
      student_number: s.student_number,
      photo_url: s.photo_url,
      section_name: s.section?.name ?? null,
      grade_level: s.section?.grade_level ?? null,
      full_name: s.user?.full_name ?? null,
      email: s.user?.email ?? null,
      avatar_url: s.user?.avatar_url ?? null,
      has_face: Array.isArray(s.face_descriptor) && s.face_descriptor.length === 128,
    }));
  });
