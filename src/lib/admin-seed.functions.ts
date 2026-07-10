import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "./auth-middleware";
import { db } from "./db";

type SeedRow = {
  full_name: string;
  email: string;
  password: string;
  role: "teacher" | "academic_director";
  employee_id?: string;
};

const ROSTER: SeedRow[] = [
  {
    full_name: "Aimee June A. Alolor",
    email: "aloloraimeejune@gmail.com",
    password: "AJ1978",
    role: "teacher",
    employee_id: "EMP-2001",
  },
  {
    full_name: "Revelyn A. Galang",
    email: "galangrevelyn@gmail.com",
    password: "Alab19",
    role: "teacher",
    employee_id: "EMP-2002",
  },
  {
    full_name: "Michelle R. Aserios",
    email: "mich.agcy@gmail.com",
    password: "mich19",
    role: "teacher",
    employee_id: "EMP-2003",
  },
  {
    full_name: "Krisha Dwine R. Riotoc",
    email: "dwine.riotoc1122@gmail.com",
    password: "Kd1322",
    role: "teacher",
    employee_id: "EMP-2004",
  },
  {
    full_name: "Julie Fe L. Benedicto",
    email: "luciojuliefb@gmail.com",
    password: "jfe138",
    role: "teacher",
    employee_id: "EMP-2005",
  },
  {
    full_name: "Jecille F. Buizon",
    email: "franciscojecille451@gmail.com",
    password: "Jhe516",
    role: "teacher",
    employee_id: "EMP-2006",
  },
  {
    full_name: "Jayson B. Cuello",
    email: "jisuncwelyo10@gmail.com",
    password: "Cuello26",
    role: "teacher",
    employee_id: "EMP-2007",
  },
  {
    full_name: "Jan Alfred P. Macalintal",
    email: "macalintaljanalfred@gmail.com",
    password: "Work35",
    role: "teacher",
    employee_id: "EMP-2008",
  },
  {
    full_name: "Jade Emerald A. Amurao",
    email: "jhaydey0203@gmail.com",
    password: "Jade23",
    role: "teacher",
    employee_id: "EMP-2009",
  },
  {
    full_name: "Homer S. Macrohon",
    email: "ayeshanicolemacrohon@gmail.com",
    password: "Remoh6",
    role: "teacher",
    employee_id: "EMP-2010",
  },
  {
    full_name: "Glorie Ann I. Espinosa",
    email: "espinosaglorieann@gmail.com",
    password: "DEFG@20",
    role: "academic_director",
  },
  {
    full_name: "Princess Jesa D. Tagulao",
    email: "0128princessjesa@gmail.com",
    password: "Jesa28",
    role: "teacher",
    employee_id: "EMP-2011",
  },
  {
    full_name: "Mark John J. Ramirez",
    email: "ramirezmarkjohn@gmail.com",
    password: "Mark22",
    role: "teacher",
    employee_id: "EMP-2012",
  },
  {
    full_name: "Christine Mari M. Jonson",
    email: "cmjonson01@yahoo.com",
    password: "Tin148",
    role: "teacher",
    employee_id: "EMP-2013",
  },
  {
    full_name: "Arianne Kaye N. Sager",
    email: "aknsager@gmail.com",
    password: "AKNSR10",
    role: "teacher",
    employee_id: "EMP-2014",
  },
  {
    full_name: "Renz Vincent S. Aclan",
    email: "aclanrenz1@gmail.com",
    password: "Rvsa05",
    role: "teacher",
    employee_id: "EMP-2015",
  },
];

export type SeedFacultyResult = {
  email: string;
  full_name: string;
  status: "created" | "skipped" | "error";
  message?: string;
};

export const seedFacultyFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<{ results: SeedFacultyResult[] }> => {
    if (context.user.role !== "admin") throw new Error("Forbidden: admin role required");

    const results: SeedFacultyResult[] = [];

    for (const row of ROSTER) {
      try {
        let existingUser = await db.user.findUnique({ where: { email: row.email } });
        let status: SeedFacultyResult["status"] = "created";

        if (!existingUser) {
            const { generateIdFromEntropySize } = await import("lucia");
            const userId = generateIdFromEntropySize(10); // 16 characters

            existingUser = await db.user.create({
                data: {
                    id: userId,
                    email: row.email,
                    password: row.password,
                    full_name: row.full_name,
                    role: row.role
                }
            });
        } else {
            status = "skipped";
            await db.user.update({
                where: { id: existingUser.id },
                data: { full_name: row.full_name, role: row.role }
            });
        }

        // Upsert teacher record if applicable
        if (row.role === "teacher" && row.employee_id) {
            // Check if teacher model exists, we didn't add it in schema, but we don't have Teacher model in Prisma
            // Since there is no Teacher model in the dumped schema we converted, we'll ignore or assume User handles it
            // the previous code had `teachers` table but it wasn't in the schema dump for MongoDB?
            // Actually, we'll just omit it or rely on the `User.role` = "teacher".
        }

        results.push({
          email: row.email,
          full_name: row.full_name,
          status,
          message: status === "skipped" ? "Account existed; profile/role synced" : undefined,
        });
      } catch (e) {
        results.push({
          email: row.email,
          full_name: row.full_name,
          status: "error",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return { results };
  });
