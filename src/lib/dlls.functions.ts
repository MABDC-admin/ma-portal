import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "./auth-middleware";
import { getRequestHost } from "@tanstack/react-start/server";
import { db } from "./db";

type CreateDllInput = {
  section_id: string | null;
  subject: string;
  lesson_date: string;
  objectives: string;
  content: string;
  procedures: string;
  assessment: string;
  submit: boolean;
};

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

export const createDllFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: CreateDllInput) => input)
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const status = data.submit ? "submitted" : "draft";
    const inserted = await db.dll.create({
      data: {
        teacher_id: userId,
        section_id: data.section_id,
        subject: data.subject,
        lesson_date: new Date(data.lesson_date),
        objectives: data.objectives,
        content: data.content,
        procedures: data.procedures,
        assessment: data.assessment,
        status,
        submitted_at: data.submit ? new Date() : null,
      },
      select: { id: true, subject: true, lesson_date: true }
    });

    if (data.submit && inserted) {
      try {
        const { sendMabdcEmail, renderEmail } = await import("./mail.server");
        const [me, directors] = await Promise.all([
          db.user.findUnique({ where: { id: userId }, select: { full_name: true, email: true } }),
          db.user.findMany({ where: { role: "academic_director" }, select: { email: true } })
        ]);
        const recipients = directors.map(d => d.email).filter((e): e is string => !!e);
        const teacherName = me?.full_name || me?.email || "A teacher";
        const url = `${appOrigin()}/dll/${inserted.id}`;
        await sendMabdcEmail({
          to: recipients,
          subject: `New DLL submitted: ${inserted.subject}`,
          html: renderEmail({
            title: "DLL awaiting review",
            intro: `${teacherName} submitted a Daily Lesson Log for ${inserted.subject} (${inserted.lesson_date.toISOString().slice(0,10)}).`,
            ctaLabel: "Open in review portal",
            ctaUrl: url,
          }),
        });
      } catch (e) {
        console.error("[dll] notify on submit failed:", e);
      }
    }
    return { id: inserted?.id };
  });

type ReviewDllInput = {
  id: string;
  decision: "approve" | "return";
  feedback: string;
};

export const reviewDllFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: ReviewDllInput) => input)
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const status = data.decision === "approve" ? "approved" : "returned";
    const updated = await db.dll.update({
      where: { id: data.id },
      data: {
        status,
        reviewed_by: userId,
        reviewed_at: new Date(),
        feedback: data.feedback || null,
      },
      select: { id: true, subject: true, lesson_date: true, teacher_id: true }
    });

    if (updated) {
      try {
        const { sendMabdcEmail, renderEmail } = await import("./mail.server");
        const [teacher, reviewer] = await Promise.all([
          db.user.findUnique({ where: { id: updated.teacher_id }, select: { email: true, full_name: true } }),
          db.user.findUnique({ where: { id: userId }, select: { email: true, full_name: true } })
        ]);

        if (teacher?.email) {
          const reviewerName = reviewer?.full_name || reviewer?.email || "The Academic Director";
          const isApproved = data.decision === "approve";
          const url = `${appOrigin()}/`;
          await sendMabdcEmail({
            to: [teacher.email],
            subject: isApproved
              ? `DLL approved: ${updated.subject}`
              : `DLL returned for revision: ${updated.subject}`,
            html: renderEmail({
              title: isApproved ? "Your DLL was approved" : "Your DLL was returned for revision",
              intro: isApproved
                ? `${reviewerName} approved your DLL for ${updated.subject} (${updated.lesson_date.toISOString().slice(0,10)}).`
                : `${reviewerName} returned your DLL for ${updated.subject} (${updated.lesson_date.toISOString().slice(0,10)}) and asked for revisions.`,
              bodyHtml: data.feedback
                ? `<div style="background:#f9fafb;border-left:3px solid #2563eb;padding:12px 16px;border-radius:6px;color:#374151"><p style="margin:0;font-size:13px;color:#6b7280">Feedback</p><p style="margin:6px 0 0;white-space:pre-wrap">${escapeHtml(data.feedback)}</p></div>`
                : "",
              ctaLabel: "Open dashboard",
              ctaUrl: url,
            }),
          });
        }
      } catch (e) {
        console.error("[dll] notify on review failed:", e);
      }
    }
    return { ok: true };
  });

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const getDllFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .validator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const dll = await db.dll.findUnique({
      where: { id: data.id },
      include: {
        teacher: { include: { user: { select: { email: true, full_name: true } } } },
        section: { select: { name: true, grade_level: true } }
      }
    });
    if (!dll) throw new Error("Not found");
    return {
      ...dll,
      lesson_date: dll.lesson_date.toISOString().slice(0, 10),
      submitted_at: dll.submitted_at?.toISOString() ?? null,
      reviewed_at: dll.reviewed_at?.toISOString() ?? null,
      profiles: dll.teacher?.user ?? null,
      sections: dll.section ?? null
    };
  });

export const listDllsFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    if (context.user.role !== "admin" && context.user.role !== "academic_director") {
      throw new Error("Forbidden");
    }
    const dlls = await db.dll.findMany({
      where: { status: { not: "draft" } },
      include: {
        teacher: { include: { user: { select: { email: true, full_name: true, avatar_url: true } } } },
        section: { select: { name: true, grade_level: true } }
      },
      orderBy: { submitted_at: "desc" }
    });
    return dlls.map(d => ({
      ...d,
      lesson_date: d.lesson_date.toISOString().slice(0, 10),
      submitted_at: d.submitted_at?.toISOString() ?? null,
      reviewed_at: d.reviewed_at?.toISOString() ?? null,
      profiles: d.teacher?.user ?? null,
      sections: d.section ?? null,
      teachers: { department: d.teacher?.department ?? "" }
    }));
  });

export const getDllKpisFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    if (context.user.role !== "admin" && context.user.role !== "academic_director") {
      throw new Error("Forbidden");
    }
    const dlls = await db.dll.findMany({
      where: { status: { not: "draft" } },
      select: { status: true }
    });
    const c = { submitted: 0, approved: 0, returned: 0, total: dlls.length, compliance: 0 };
    for (const r of dlls) {
      if (r.status === "submitted") c.submitted++;
      if (r.status === "approved") c.approved++;
      if (r.status === "returned") c.returned++;
    }
    c.compliance = c.total ? Math.round((c.approved / c.total) * 1000) / 10 : 0;
    return c;
  });

export const getTeacherDepartmentsFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async () => {
    const teachers = await db.teacher.findMany({
      select: { department: true }
    });
    const set = new Set<string>();
    for (const t of teachers) if (t.department) set.add(t.department);
    return ["All Departments", ...Array.from(set).sort()];
  });
