import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import roster from "./learners-roster.json";

export type ImportLearnerResult = {
  email: string;
  full_name: string;
  student_number: string;
  status: "created" | "skipped" | "error";
  message?: string;
};

export type ImportLearnersResponse = {
  sectionsEnsured: number;
  results: ImportLearnerResult[];
};

export const importLearnersFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ImportLearnersResponse> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: admin role required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Ensure sections exist
    const academicYear = roster.academic_year;
    for (const s of roster.sections) {
      await supabaseAdmin
        .from("sections")
        .upsert(
          { name: s.name, grade_level: s.grade_level, academic_year: academicYear },
          { onConflict: "name,academic_year" },
        );
    }

    // Build section name → id map
    const { data: sectionRows, error: secErr } = await supabaseAdmin
      .from("sections")
      .select("id, name")
      .eq("academic_year", academicYear);
    if (secErr) throw new Error(`sections lookup: ${secErr.message}`);
    const sectionMap = new Map<string, string>();
    for (const s of sectionRows ?? []) sectionMap.set(s.name, s.id);

    // 2) Prefetch existing users (paged) → email → id
    const existing = new Map<string, string>();
    for (let page = 1; page <= 40; page++) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (!list) break;
      for (const u of list.users) if (u.email) existing.set(u.email.toLowerCase(), u.id);
      if (list.users.length < 200) break;
    }

    const results: ImportLearnerResult[] = [];

    for (const row of roster.learners) {
      try {
        const sectionId = sectionMap.get(row.section_name);
        if (!sectionId) {
          results.push({ ...pick(row), status: "error", message: `Section not found: ${row.section_name}` });
          continue;
        }

        let userId = existing.get(row.email.toLowerCase()) ?? null;
        let status: ImportLearnerResult["status"] = "created";

        if (!userId) {
          const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: row.email,
            password: row.password,
            email_confirm: true,
            user_metadata: { full_name: row.full_name },
          });
          if (createErr || !created?.user) {
            results.push({ ...pick(row), status: "error", message: createErr?.message ?? "no user returned" });
            continue;
          }
          userId = created.user.id;
        } else {
          status = "skipped";
        }

        // Upsert profile
        const { error: profErr } = await supabaseAdmin.from("profiles").upsert({
          id: userId,
          email: row.email,
          full_name: row.full_name,
          role: "student",
        });
        if (profErr) {
          results.push({ ...pick(row), status: "error", message: `profile: ${profErr.message}` });
          continue;
        }

        // Ensure student role
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId, role: "student" }, { onConflict: "user_id,role" });

        // Upsert student record
        const { error: stuErr } = await supabaseAdmin.from("students").upsert(
          {
            user_id: userId,
            student_number: row.student_number,
            section_id: sectionId,
            status: "active",
          },
          { onConflict: "user_id" },
        );
        if (stuErr) {
          results.push({ ...pick(row), status: "error", message: `student: ${stuErr.message}` });
          continue;
        }

        results.push({ ...pick(row), status });
      } catch (e) {
        results.push({ ...pick(row), status: "error", message: e instanceof Error ? e.message : String(e) });
      }
    }

    return { sectionsEnsured: roster.sections.length, results };
  });

function pick(r: { email: string; full_name: string; student_number: string }) {
  return { email: r.email, full_name: r.full_name, student_number: r.student_number };
}
