import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestHost } from "@tanstack/react-start/server";

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
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreateDllInput) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const status = data.submit ? "submitted" : "draft";
    const { data: inserted, error } = await supabase
      .from("dlls")
      .insert({
        teacher_id: userId,
        section_id: data.section_id,
        subject: data.subject,
        lesson_date: data.lesson_date,
        objectives: data.objectives,
        content: data.content,
        procedures: data.procedures,
        assessment: data.assessment,
        status,
        submitted_at: data.submit ? new Date().toISOString() : null,
      })
      .select("id, subject, lesson_date")
      .single();
    if (error) throw new Error(error.message);

    if (data.submit && inserted) {
      try {
        const { sendMabdcEmail, renderEmail } = await import("./mail.server");
        const { data: me } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", userId)
          .single();
        const { data: directors } = await supabase
          .from("profiles")
          .select("email")
          .eq("role", "academic_director");
        const recipients = (directors ?? []).map((d) => d.email).filter((e): e is string => !!e);
        const teacherName = me?.full_name || me?.email || "A teacher";
        const url = `${appOrigin()}/dll/${inserted.id}`;
        await sendMabdcEmail({
          to: recipients,
          subject: `New DLL submitted: ${inserted.subject}`,
          html: renderEmail({
            title: "DLL awaiting review",
            intro: `${teacherName} submitted a Daily Lesson Log for ${inserted.subject} (${inserted.lesson_date}).`,
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
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ReviewDllInput) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const status = data.decision === "approve" ? "approved" : "returned";
    const { data: updated, error } = await supabase
      .from("dlls")
      .update({
        status,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        feedback: data.feedback || null,
      })
      .eq("id", data.id)
      .select("id, subject, lesson_date, teacher_id")
      .single();
    if (error) throw new Error(error.message);

    if (updated) {
      try {
        const { sendMabdcEmail, renderEmail } = await import("./mail.server");
        const [{ data: teacher }, { data: reviewer }] = await Promise.all([
          supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", updated.teacher_id)
            .single(),
          supabase.from("profiles").select("email, full_name").eq("id", userId).single(),
        ]);
        if (teacher?.email) {
          const reviewerName = reviewer?.full_name || reviewer?.email || "The Academic Director";
          const isApproved = data.decision === "approve";
          const url = `${appOrigin()}/`;
          await sendMabdcEmail({
            to: teacher.email,
            subject: isApproved
              ? `DLL approved: ${updated.subject}`
              : `DLL returned for revision: ${updated.subject}`,
            html: renderEmail({
              title: isApproved ? "Your DLL was approved" : "Your DLL was returned for revision",
              intro: isApproved
                ? `${reviewerName} approved your DLL for ${updated.subject} (${updated.lesson_date}).`
                : `${reviewerName} returned your DLL for ${updated.subject} (${updated.lesson_date}) and asked for revisions.`,
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
