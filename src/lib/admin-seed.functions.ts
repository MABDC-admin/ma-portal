import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type SeedRow = {
  full_name: string;
  email: string;
  password: string;
  role: "teacher" | "academic_director";
  employee_id?: string;
};

const ROSTER: SeedRow[] = [
  { full_name: "Aimee June A. Alolor", email: "aloloraimeejune@gmail.com", password: "AJ1978", role: "teacher", employee_id: "EMP-2001" },
  { full_name: "Revelyn A. Galang", email: "galangrevelyn@gmail.com", password: "Alab19", role: "teacher", employee_id: "EMP-2002" },
  { full_name: "Michelle R. Aserios", email: "mich.agcy@gmail.com", password: "mich19", role: "teacher", employee_id: "EMP-2003" },
  { full_name: "Krisha Dwine R. Riotoc", email: "dwine.riotoc1122@gmail.com", password: "Kd1322", role: "teacher", employee_id: "EMP-2004" },
  { full_name: "Julie Fe L. Benedicto", email: "luciojuliefb@gmail.com", password: "jfe138", role: "teacher", employee_id: "EMP-2005" },
  { full_name: "Jecille F. Buizon", email: "franciscojecille451@gmail.com", password: "Jhe516", role: "teacher", employee_id: "EMP-2006" },
  { full_name: "Jayson B. Cuello", email: "jisuncwelyo10@gmail.com", password: "Cuello26", role: "teacher", employee_id: "EMP-2007" },
  { full_name: "Jan Alfred P. Macalintal", email: "macalintaljanalfred@gmail.com", password: "Work35", role: "teacher", employee_id: "EMP-2008" },
  { full_name: "Jade Emerald A. Amurao", email: "jhaydey0203@gmail.com", password: "Jade23", role: "teacher", employee_id: "EMP-2009" },
  { full_name: "Homer S. Macrohon", email: "ayeshanicolemacrohon@gmail.com", password: "Remoh6", role: "teacher", employee_id: "EMP-2010" },
  { full_name: "Glorie Ann I. Espinosa", email: "espinosaglorieann@gmail.com", password: "DEFG@20", role: "academic_director" },
  { full_name: "Princess Jesa D. Tagulao", email: "0128princessjesa@gmail.com", password: "Jesa28", role: "teacher", employee_id: "EMP-2011" },
  { full_name: "Mark John J. Ramirez", email: "ramirezmarkjohn@gmail.com", password: "Mark22", role: "teacher", employee_id: "EMP-2012" },
  { full_name: "Christine Mari M. Jonson", email: "cmjonson01@yahoo.com", password: "Tin148", role: "teacher", employee_id: "EMP-2013" },
  { full_name: "Arianne Kaye N. Sager", email: "aknsager@gmail.com", password: "AKNSR10", role: "teacher", employee_id: "EMP-2014" },
  { full_name: "Renz Vincent S. Aclan", email: "aclanrenz1@gmail.com", password: "Rvsa05", role: "teacher", employee_id: "EMP-2015" },
];

export type SeedFacultyResult = {
  email: string;
  full_name: string;
  status: "created" | "skipped" | "error";
  message?: string;
};

export const seedFacultyFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ results: SeedFacultyResult[] }> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: admin role required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const results: SeedFacultyResult[] = [];

    for (const row of ROSTER) {
      try {
        // Try to create the auth user
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: row.email,
          password: row.password,
          email_confirm: true,
          user_metadata: { full_name: row.full_name },
        });

        let userId = created?.user?.id ?? null;
        let status: SeedFacultyResult["status"] = "created";

        if (createErr) {
          // If email exists, find the existing user id and continue
          const msg = createErr.message || "";
          if (/already been registered|already registered|duplicate|exists/i.test(msg)) {
            // Look up existing user by listing (paginate up to a few pages just in case)
            let foundId: string | null = null;
            for (let page = 1; page <= 20 && !foundId; page++) {
              const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
              const match = list?.users.find((u) => (u.email || "").toLowerCase() === row.email.toLowerCase());
              if (match) foundId = match.id;
              if (!list || list.users.length < 200) break;
            }
            if (!foundId) {
              results.push({ email: row.email, full_name: row.full_name, status: "error", message: `Exists but not found on list: ${msg}` });
              continue;
            }
            userId = foundId;
            status = "skipped";
          } else {
            results.push({ email: row.email, full_name: row.full_name, status: "error", message: msg });
            continue;
          }
        }

        if (!userId) {
          results.push({ email: row.email, full_name: row.full_name, status: "error", message: "No user id returned" });
          continue;
        }

        // Upsert profile
        const { error: profErr } = await supabaseAdmin.from("profiles").upsert({
          id: userId,
          email: row.email,
          full_name: row.full_name,
          role: row.role,
        });
        if (profErr) {
          results.push({ email: row.email, full_name: row.full_name, status: "error", message: `profile: ${profErr.message}` });
          continue;
        }

        // Upsert user_roles
        const { error: roleErr } = await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId, role: row.role }, { onConflict: "user_id,role" });
        if (roleErr) {
          results.push({ email: row.email, full_name: row.full_name, status: "error", message: `role: ${roleErr.message}` });
          continue;
        }

        // Also remove default student role from user_roles (created by handle_new_user trigger)
        if (row.role !== "student") {
          await supabaseAdmin.from("user_roles").delete().eq("user_id", userId).eq("role", "student");
        }

        // Upsert teacher record if applicable
        if (row.role === "teacher" && row.employee_id) {
          const { error: teachErr } = await supabaseAdmin.from("teachers").upsert(
            {
              user_id: userId,
              employee_id: row.employee_id,
              department: "",
              subjects: [],
              status: "active",
            },
            { onConflict: "user_id" },
          );
          if (teachErr) {
            results.push({ email: row.email, full_name: row.full_name, status: "error", message: `teacher: ${teachErr.message}` });
            continue;
          }
        }

        results.push({ email: row.email, full_name: row.full_name, status, message: status === "skipped" ? "Account existed; profile/role synced" : undefined });
      } catch (e) {
        results.push({ email: row.email, full_name: row.full_name, status: "error", message: e instanceof Error ? e.message : String(e) });
      }
    }

    return { results };
  });
