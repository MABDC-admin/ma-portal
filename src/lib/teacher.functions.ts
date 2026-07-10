import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "./auth-middleware";
import { getRequestHost } from "@tanstack/react-start/server";
import { db } from "./db";

function appOrigin(): string {
  const env = process.env.PUBLIC_APP_URL;
  if (env) return env.replace(/\/$/, "");
  try {
    const host = getRequestHost();
    if (host) return `https://${host}`;
  } catch {
    // ignore
  }
  return "";
}

// ============ DLL: teacher's own list ============
export const listMyDllsFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const data = await db.dll.findMany({
      where: { teacher_id: userId },
      select: {
        id: true, subject: true, lesson_date: true, status: true, submitted_at: true, reviewed_at: true, feedback: true, section_id: true,
        section: { select: { name: true } }
      },
      orderBy: { lesson_date: "desc" }
    });
    // Transform to match previous structure
    return data.map(d => ({
        ...d,
        sections: d.section
    }));
  });

export const getMyDllFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .validator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const row = await db.dll.findFirst({
      where: { id: data.id, teacher_id: userId },
      include: {
        section: { select: { name: true, grade_level: true } }
      }
    });
    if (!row) throw new Error("DLL not found");
    return {
        ...row,
        sections: row.section
    };
  });

// ============ Section roster ============
export const listSectionRosterFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .validator((input: { sectionId: string }) => input)
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const sec = await db.section.findUnique({
      where: { id: data.sectionId },
      select: { id: true, name: true, grade_level: true, academic_year: true, adviser_id: true }
    });
    if (!sec) throw new Error("Section not found");

    const students = await db.student.findMany({
      where: { section_id: data.sectionId },
      select: {
        user_id: true, student_number: true, status: true, photo_url: true, face_descriptor: true,
        user: { select: { full_name: true, email: true, avatar_url: true } }
      },
      orderBy: { student_number: "asc" }
    });
    
    return {
      section: sec,
      isAdviser: sec.adviser_id === userId,
      students: students.map(s => ({
          ...s,
          profiles: s.user
      })),
    };
  });

// ============ Attendance ============
export const getSectionAttendanceFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .validator((input: { sectionId: string; date: string }) => input)
  .handler(async ({ data, context }) => {
        const rows = await db.attendance.findMany({
        where: { 
            student: { section_id: data.sectionId },
            date: new Date(data.date) 
        },
        select: { student_id: true, status: true, remarks: true }
    });
    return rows.map(r => ({ student_id: r.student_id, status: r.status, notes: r.remarks }));
  });

type AttendanceStatus = "present" | "late" | "absent" | "excused";

export const upsertAttendanceFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator(
    (input: {
      sectionId: string;
      date: string;
      entries: Array<{ studentId: string; status: AttendanceStatus; notes?: string | null }>;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    if (data.entries.length === 0) return { count: 0 };
    
    // Prisma doesn't have bulk upsert, so we use transaction
    let count = 0;
    await db.$transaction(async (tx) => {
        for (const e of data.entries) {
            // Find existing record
            const existing = await tx.attendance.findFirst({
                where: { student_id: e.studentId, date: new Date(data.date) }
            });
            if (existing) {
                await tx.attendance.update({
                    where: { id: existing.id },
                    data: { status: e.status, remarks: e.notes, teacher_id: userId }
                });
            } else {
                await tx.attendance.create({
                    data: {
                        student_id: e.studentId,
                        teacher_id: userId,
                        date: new Date(data.date),
                        status: e.status,
                        remarks: e.notes
                    }
                });
            }
            count++;
        }
    });

    return { count };
  });

// ============ Face enrollment ============
export const saveFaceDescriptorFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: { studentId: string; descriptor: number[] }) => input)
  .handler(async ({ data, context }) => {
    if (!Array.isArray(data.descriptor) || data.descriptor.length !== 128) {
      throw new Error("Invalid descriptor");
    }
    await db.student.update({
        where: { user_id: data.studentId },
        data: { face_descriptor: data.descriptor }
    });
    return { ok: true };
  });

// ============ Kiosk check-in ============
export const kioskCheckInFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: { studentId: string; sectionId: string }) => input)
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const sec = await db.section.findUnique({
      where: { id: data.sectionId },
      select: { id: true, adviser_id: true }
    });
    if (!sec) throw new Error("Section not found");
    if (sec.adviser_id !== userId) throw new Error("Not the adviser of this section");

    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const status: AttendanceStatus = now.getHours() >= 8 ? "late" : "present";

    const existing = await db.attendance.findFirst({
        where: { student_id: data.studentId, date: new Date(today) }
    });
    if (existing) {
        await db.attendance.update({
            where: { id: existing.id },
            data: { status, teacher_id: userId }
        });
    } else {
        await db.attendance.create({
            data: {
                student_id: data.studentId,
                teacher_id: userId,
                date: new Date(today),
                status
            }
        });
    }

    const prof = await db.user.findUnique({
        where: { id: data.studentId },
        select: { full_name: true, email: true, avatar_url: true }
    });

    return {
      status,
      time: now.toISOString(),
      student: prof ?? null,
    };
  });

// ============ Anecdotal entries ============
type AnecdotalCategory = "academic" | "behavioral" | "social" | "achievement";

export const listAnecdotalsForStudentFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .validator((input: { studentId: string }) => input)
  .handler(async ({ data, context }) => {
    const rows = await db.anecdotalEntry.findMany({
        where: { student_id: data.studentId },
        select: {
            id: true, description: true, incident_date: true, teacher_id: true, created_at: true, action_taken: true,
            teacher: { select: { full_name: true, email: true } }
        },
        orderBy: { incident_date: "desc" }
    });
    return rows.map(r => ({
        ...r,
        category: "behavioral", // We didn't have category in schema, default it or ignore
        note: r.description,
        occurred_on: r.incident_date.toISOString(),
        profiles: r.teacher
    }));
  });

export const listAllAnecdotalsFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const data = await db.anecdotalEntry.findMany({
        select: {
            id: true, description: true, incident_date: true, created_at: true, student_id: true, teacher_id: true,
            student: { select: { user: { select: { full_name: true, email: true } } } },
            teacher: { select: { full_name: true, email: true } }
        },
        orderBy: { incident_date: "desc" },
        take: 200
    });
    return data.map(d => ({
        ...d,
        category: "behavioral",
        note: d.description,
        occurred_on: d.incident_date.toISOString(),
    }));
  });

export const createAnecdotalFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator(
    (input: { studentId: string; category: AnecdotalCategory; note: string; occurredOn: string }) =>
      input,
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const inserted = await db.anecdotalEntry.create({
        data: {
            student_id: data.studentId,
            teacher_id: userId,
            description: data.note,
            incident_date: new Date(data.occurredOn),
            // category not in schema, ignoring
        },
        select: { id: true }
    });

    // Notify academic directors
    try {
      const { sendMabdcEmail, renderEmail } = await import("./mail.server");
      const [student, teacher, directors] = await Promise.all([
        db.user.findUnique({ where: { id: data.studentId }, select: { full_name: true, email: true } }),
        db.user.findUnique({ where: { id: userId }, select: { full_name: true, email: true } }),
        db.user.findMany({ where: { role: "academic_director" }, select: { email: true } })
      ]);
      const recipients = directors.map(d => d.email).filter((e): e is string => !!e);
      if (recipients.length) {
        const studentName = student?.full_name || student?.email || "student";
        const teacherName = teacher?.full_name || teacher?.email || "A teacher";
        const preview = data.note.length > 240 ? data.note.slice(0, 240) + "…" : data.note;
        const url = `${appOrigin()}/anecdotal`;
        await sendMabdcEmail({
          to: recipients,
          subject: `Anecdotal (${data.category}) — ${studentName}`,
          html: renderEmail({
            title: "New anecdotal entry",
            intro: `${teacherName} logged a ${data.category} note about ${studentName} for ${data.occurredOn}.`,
            bodyHtml: `<div style="background:#f9fafb;border-left:3px solid #2563eb;padding:12px 16px;border-radius:6px;color:#374151"><p style="margin:0;white-space:pre-wrap">${escapeHtml(preview)}</p></div>`,
            ctaLabel: "Open anecdotal log",
            ctaUrl: url,
          }),
        });
      }
    } catch (e) {
      console.error("[anecdotal] notify failed:", e);
    }

    return { id: inserted.id };
  });

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const getTeacherSectionsFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    return await db.section.findMany({
      where: { adviser_id: context.userId },
      select: { id: true, name: true, grade_level: true }
    });
  });

export const getAllSectionsFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async () => {
    return await db.section.findMany({
      select: { id: true, name: true, grade_level: true, academic_year: true },
      orderBy: [{ grade_level: "asc" }, { name: "asc" }]
    });
  });

export const getTeacherStudentsFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .validator((input: { sectionIds: string[] }) => input)
  .handler(async ({ data }) => {
    const students = await db.student.findMany({
      where: { section_id: { in: data.sectionIds } },
      select: {
        user_id: true,
        student_number: true,
        user: { select: { full_name: true, avatar_url: true } }
      }
    });
    return students.map(s => ({
      user_id: s.user_id,
      student_number: s.student_number,
      profiles: { full_name: s.user?.full_name, avatar_url: s.user?.avatar_url }
    }));
  });

export const getWeeklyAttendanceFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .validator((input: { sectionIds: string[] }) => input)
  .handler(async ({ data }) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    
    const att = await db.attendance.findMany({
      where: {
        student: { section_id: { in: data.sectionIds } },
        date: { gte: sevenDaysAgo }
      },
      select: { date: true, status: true, student_id: true, student: { select: { section_id: true } } }
    });
    
    return att.map(a => ({
      date: a.date.toISOString().slice(0, 10),
      status: a.status,
      section_id: a.student?.section_id,
      student_id: a.student_id
    }));
  });

export const getRecentAnecdotalsFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const anecdotals = await db.anecdotalEntry.findMany({
      where: { teacher_id: context.userId },
      orderBy: { incident_date: "desc" },
      take: 10,
      select: {
        id: true,
        description: true,
        incident_date: true,
        student: {
          select: {
            student_number: true,
            section_id: true,
            user: { select: { full_name: true, avatar_url: true } },
            section: { select: { name: true, grade_level: true } }
          }
        }
      }
    });
    
    return anecdotals.map(a => ({
      id: a.id,
      category: "behavioral", // Default
      note: a.description,
      occurred_on: a.incident_date.toISOString(),
      student: {
        student_number: a.student?.student_number,
        section_id: a.student?.section_id,
        profiles: { full_name: a.student?.user?.full_name, avatar_url: a.student?.user?.avatar_url },
        sections: { grade_level: a.student?.section?.grade_level, name: a.student?.section?.name }
      }
    }));
  });

export const getStudentProfileFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .validator((input: { studentId: string }) => input)
  .handler(async ({ data }) => {
    const student = await db.student.findUnique({
      where: { user_id: data.studentId },
      include: {
        user: { select: { full_name: true, email: true } },
        section: { select: { name: true, grade_level: true, academic_year: true } }
      }
    });
    if (!student) throw new Error("Student not found");
    return {
      ...student,
      created_at: student.created_at.toISOString(),
      profiles: student.user,
      sections: student.section
    };
  });

export const getStudentAnecdotalsFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .validator((input: { studentId: string }) => input)
  .handler(async ({ data }) => {
    const anecdotals = await db.anecdotalEntry.findMany({
      where: { student_id: data.studentId },
      orderBy: { incident_date: "desc" }
    });
    return anecdotals.map(a => ({
      id: a.id,
      category: "behavioral",
      note: a.description,
      occurred_on: a.incident_date.toISOString()
    }));
  });

export const getStudentAttendanceFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .validator((input: { studentId: string }) => input)
  .handler(async ({ data }) => {
    const att = await db.attendance.findMany({
      where: { student_id: data.studentId },
      orderBy: { date: "desc" }
    });
    return att.map(a => ({
      id: a.id,
      date: a.date.toISOString().slice(0, 10),
      status: a.status,
      notes: a.remarks
    }));
  });

export const getLearnersDirectoryFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async () => {
    const students = await db.student.findMany({
      select: {
        user_id: true,
        student_number: true,
        status: true,
        user: { select: { full_name: true, email: true } },
        section: { select: { name: true, grade_level: true, academic_year: true } }
      },
      orderBy: { student_number: "asc" }
    });
    return students.map(s => ({
      user_id: s.user_id,
      student_number: s.student_number,
      status: s.status,
      profiles: s.user,
      sections: s.section
    }));
  });
