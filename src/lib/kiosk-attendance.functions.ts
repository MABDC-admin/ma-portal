import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveTargetColumn } from "./kiosk-schedule";

type LogInput = {
  studentId: string; // students.user_id
  action: "in" | "out";
};

export const logKioskAttendanceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: LogInput) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Admin gate — kiosk is admin-only.
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Only admins can operate the kiosk");

    // Load student → section + profile
    const { data: student, error: sErr } = await supabase
      .from("students")
      .select(
        "user_id, section_id, photo_url, profiles!students_user_id_fkey(full_name, email, avatar_url)",
      )
      .eq("user_id", data.studentId)
      .single();
    if (sErr) throw new Error(sErr.message);
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
    const { data: existing } = await supabase
      .from("attendance")
      .select("id, am_time_in, am_time_out, pm_time_in, pm_time_out, status")
      .eq("student_id", data.studentId)
      .eq("date", today)
      .maybeSingle();

    if (existing && existing[column]) {
      return {
        alreadyLogged: true,
        column,
        time: existing[column] as string,
        student: {
          id: student.user_id,
          name: student.profiles?.full_name || student.profiles?.email || "Learner",
          photo: student.photo_url || student.profiles?.avatar_url || null,
        },
      };
    }

    const payload: Record<string, unknown> = {
      student_id: data.studentId,
      section_id: student.section_id,
      date: today,
      status: existing?.status ?? status,
      recorded_by: userId,
      [column]: now.toISOString(),
    };

    const { error: upErr } = await supabase
      .from("attendance")
      .upsert(payload, { onConflict: "student_id,date" });
    if (upErr) throw new Error(upErr.message);

    return {
      alreadyLogged: false,
      column,
      time: now.toISOString(),
      status,
      student: {
        id: student.user_id,
        name: student.profiles?.full_name || student.profiles?.email || "Learner",
        photo: student.photo_url || student.profiles?.avatar_url || null,
      },
    };
  });

// Load all enrolled learners with a face descriptor (admin only).
export const listEnrolledLearnersFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Only admins can operate the kiosk");

    const { data, error } = await supabase
      .from("students")
      .select(
        "user_id, section_id, photo_url, face_descriptor, sections:section_id(name, grade_level), profiles!students_user_id_fkey(full_name, email, avatar_url)",
      )
      .not("face_descriptor", "is", null);
    if (error) throw new Error(error.message);
    return (data ?? []).filter(
      (s) => Array.isArray(s.face_descriptor) && s.face_descriptor.length === 128,
    );
  });
