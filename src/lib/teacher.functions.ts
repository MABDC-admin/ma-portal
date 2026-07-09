import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestHost } from "@tanstack/react-start/server";

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
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("dlls")
      .select("id, subject, lesson_date, status, submitted_at, reviewed_at, feedback, section_id, sections:section_id(name)")
      .eq("teacher_id", userId)
      .order("lesson_date", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMyDllFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("dlls")
      .select("*, sections:section_id(name, grade_level)")
      .eq("id", data.id)
      .eq("teacher_id", userId)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ============ Section roster ============
export const listSectionRosterFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sectionId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Confirm the caller adviser-owns the section (RLS also blocks, but explicit is nicer)
    const { data: sec, error: secErr } = await supabase
      .from("sections")
      .select("id, name, grade_level, academic_year, adviser_id")
      .eq("id", data.sectionId)
      .single();
    if (secErr) throw new Error(secErr.message);
    const { data: students, error } = await supabase
      .from("students")
      .select("user_id, student_number, status, photo_url, face_descriptor, profiles!students_user_id_fkey(full_name, email, avatar_url)")
      .eq("section_id", data.sectionId)
      .order("student_number");
    if (error) throw new Error(error.message);
    return {
      section: sec,
      isAdviser: sec.adviser_id === userId,
      students: students ?? [],
    };
  });

// ============ Attendance ============
export const getSectionAttendanceFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sectionId: string; date: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("attendance")
      .select("student_id, status, notes")
      .eq("section_id", data.sectionId)
      .eq("date", data.date);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

type AttendanceStatus = "present" | "late" | "absent" | "excused";

export const upsertAttendanceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    sectionId: string;
    date: string;
    entries: Array<{ studentId: string; status: AttendanceStatus; notes?: string | null }>;
  }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.entries.length === 0) return { count: 0 };
    const rows = data.entries.map((e) => ({
      student_id: e.studentId,
      section_id: data.sectionId,
      date: data.date,
      status: e.status,
      notes: e.notes ?? null,
      recorded_by: userId,
    }));
    const { error, count } = await supabase
      .from("attendance")
      .upsert(rows, { onConflict: "student_id,date", count: "exact" });
    if (error) throw new Error(error.message);
    return { count: count ?? rows.length };
  });

// ============ Face enrollment ============
export const saveFaceDescriptorFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studentId: string; descriptor: number[] }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    if (!Array.isArray(data.descriptor) || data.descriptor.length !== 128) {
      throw new Error("Invalid descriptor");
    }
    const { error } = await supabase
      .from("students")
      .update({ face_descriptor: data.descriptor })
      .eq("user_id", data.studentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Kiosk check-in ============
export const kioskCheckInFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studentId: string; sectionId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Adviser check
    const { data: sec, error: secErr } = await supabase
      .from("sections")
      .select("id, adviser_id")
      .eq("id", data.sectionId)
      .single();
    if (secErr) throw new Error(secErr.message);
    if (sec.adviser_id !== userId) throw new Error("Not the adviser of this section");

    const today = new Date().toISOString().slice(0, 10);
    // Late threshold: 8:00 AM local (server clock)
    const now = new Date();
    const status: AttendanceStatus = now.getHours() >= 8 ? "late" : "present";

    const { error: upErr } = await supabase
      .from("attendance")
      .upsert(
        {
          student_id: data.studentId,
          section_id: data.sectionId,
          date: today,
          status,
          recorded_by: userId,
        },
        { onConflict: "student_id,date" },
      );
    if (upErr) throw new Error(upErr.message);

    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name, email, avatar_url")
      .eq("id", data.studentId)
      .single();

    return {
      status,
      time: now.toISOString(),
      student: prof ?? null,
    };
  });

// ============ Anecdotal entries ============
type AnecdotalCategory = "academic" | "behavioral" | "social" | "achievement";

export const listAnecdotalsForStudentFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studentId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("anecdotal_entries")
      .select("id, category, note, occurred_on, teacher_id, created_at, profiles:teacher_id(full_name, email)")
      .eq("student_id", data.studentId)
      .order("occurred_on", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listAllAnecdotalsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("anecdotal_entries")
      .select(
        "id, category, note, occurred_on, created_at, student_id, teacher_id, student:student_id(profiles:user_id(full_name, email)), teacher:teacher_id(full_name, email)",
      )
      .order("occurred_on", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createAnecdotalFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    studentId: string;
    category: AnecdotalCategory;
    note: string;
    occurredOn: string;
  }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: inserted, error } = await supabase
      .from("anecdotal_entries")
      .insert({
        student_id: data.studentId,
        teacher_id: userId,
        category: data.category,
        note: data.note,
        occurred_on: data.occurredOn,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Notify academic directors
    try {
      const { sendMabdcEmail, renderEmail } = await import("./mail.server");
      const [{ data: student }, { data: teacher }, { data: directors }] = await Promise.all([
        supabase.from("profiles").select("full_name, email").eq("id", data.studentId).single(),
        supabase.from("profiles").select("full_name, email").eq("id", userId).single(),
        supabase.from("profiles").select("email").eq("role", "academic_director"),
      ]);
      const recipients = (directors ?? [])
        .map((d) => d.email)
        .filter((e): e is string => !!e);
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

    return { id: inserted?.id };
  });

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
