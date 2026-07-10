import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "./auth-middleware";
import roster from "./learners-roster.json";
import { db } from "./db";

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
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<ImportLearnersResponse> => {
    if (context.user.role !== "admin") throw new Error("Forbidden: admin role required");

    // 1) Ensure sections exist
    const academicYear = roster.academic_year;
    for (const s of roster.sections) {
      const existing = await db.section.findFirst({
        where: { name: s.name, academic_year: academicYear },
      });
      if (existing) {
        await db.section.update({
          where: { id: existing.id },
          data: { grade_level: s.grade_level },
        });
      } else {
        await db.section.create({
          data: { name: s.name, grade_level: s.grade_level, academic_year: academicYear },
        });
      }
    }

    // Build section name → id map
    const sectionRows = await db.section.findMany({
      where: { academic_year: academicYear },
      select: { id: true, name: true },
    });
    const sectionMap = new Map<string, string>();
    for (const s of sectionRows) sectionMap.set(s.name, s.id);

    const results: ImportLearnerResult[] = [];

    for (const row of roster.learners) {
      try {
        const sectionId = sectionMap.get(row.section_name);
        if (!sectionId) {
          results.push({
            ...pick(row),
            status: "error",
            message: `Section not found: ${row.section_name}`,
          });
          continue;
        }

        let existingUser = await db.user.findUnique({ where: { email: row.email } });
        let status: ImportLearnerResult["status"] = "created";

        if (!existingUser) {
          const { generateIdFromEntropySize } = await import("lucia");
          const userId = generateIdFromEntropySize(10); // 16 characters

          existingUser = await db.user.create({
            data: {
              id: userId,
              email: row.email,
              password: row.password,
              full_name: row.full_name,
              role: "student",
            },
          });
        } else {
          status = "skipped";
        }

        const existingStudent = await db.student.findUnique({
          where: { user_id: existingUser.id },
        });
        if (existingStudent) {
          await db.student.update({
            where: { user_id: existingUser.id },
            data: { student_number: row.student_number, section_id: sectionId, status: "active" },
          });
        } else {
          await db.student.create({
            data: {
              user_id: existingUser.id,
              student_number: row.student_number,
              section_id: sectionId,
              status: "active",
            },
          });
        }

        results.push({ ...pick(row), status });
      } catch (e) {
        results.push({
          ...pick(row),
          status: "error",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return { sectionsEnsured: roster.sections.length, results };
  });

function pick(r: { email: string; full_name: string; student_number: string }) {
  return { email: r.email, full_name: r.full_name, student_number: r.student_number };
}

export const importExcelLearnersFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: { records: any[] }) => input)
  .handler(async ({ data, context }) => {
    if (context.user.role !== "admin") throw new Error("Forbidden: admin role required");

    const activeYear = data.records[0]?.school_year_id
      ? await db.schoolYear.findUnique({ where: { id: data.records[0].school_year_id } })
      : await db.schoolYear.findFirst({ where: { is_active: true } });

    if (!activeYear) throw new Error("No active school year found.");

    const { generateIdFromEntropySize } = await import("lucia");
    const yearPrefix = activeYear.year.match(/\d{4}/)?.[0] ?? String(new Date().getFullYear());
    const results: Array<{ student_number: string; full_name: string; status: string }> = [];
    const sectionIds = new Map<string, string>();

    for (let index = 0; index < data.records.length; index++) {
      const record = data.records[index];
      const studentName = clean(record.student_name);
      if (!studentName) continue;

      const sectionName = clean(record.grade_level) || "Unassigned";
      let sectionId = sectionIds.get(sectionName);
      if (!sectionId) {
        const section = await db.section.upsert({
          where: {
            name_academic_year: {
              name: sectionName,
              academic_year: activeYear.year,
            },
          },
          update: {
            grade_level: parseGradeLevel(sectionName),
          },
          create: {
            name: sectionName,
            grade_level: parseGradeLevel(sectionName),
            academic_year: activeYear.year,
          },
        });
        sectionId = section.id;
        sectionIds.set(sectionName, sectionId);
      }

      const studentNumber =
        clean(record.student_number) || `${yearPrefix}${String(index + 1).padStart(4, "0")}`;
      const email = clean(record.email) || `${studentNumber}@learners.local`;
      let user = await db.user.findUnique({ where: { email } });
      const status = user ? "updated" : "created";

      if (!user) {
        user = await db.user.create({
          data: {
            id: generateIdFromEntropySize(10),
            email,
            full_name: studentName,
            password: studentNumber,
            role: "student",
          },
        });
      } else {
        user = await db.user.update({
          where: { id: user.id },
          data: {
            full_name: studentName,
            role: "student",
          },
        });
      }

      const birthdate = parseBirthdate(record.birthdate);
      const studentData = {
        user_id: user.id,
        student_number: studentNumber,
        section_id: sectionId,
        status: "active",
        birthdate,
        age: parseNullableInt(record.age),
        gender: clean(record.gender),
        mother_contact: clean(record.mother_contact),
        mother_name: clean(record.mother_name),
        father_contact: clean(record.father_contact),
        father_name: clean(record.father_name),
        philippine_address: clean(record.philippine_address),
        uae_address: clean(record.uae_address),
      };

      const existingStudent = await db.student.findUnique({
        where: { student_number: studentNumber },
      });

      if (existingStudent) {
        await db.student.update({
          where: { user_id: existingStudent.user_id },
          data: studentData,
        });
      } else {
        await db.student.create({ data: studentData });
      }

      results.push({ student_number: studentNumber, full_name: studentName, status });
    }

    return {
      status: "success",
      count: results.length,
      sections: sectionIds.size,
      results,
    };
  });

export const getActiveSchoolYearFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async () => {
    return await db.schoolYear.findFirst({
      where: { is_active: true },
    });
  });

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function parseNullableInt(value: unknown) {
  const parsed = Number.parseInt(clean(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseGradeLevel(gradeLevel: string) {
  const normalized = gradeLevel.toLowerCase();
  if (normalized.includes("kindergarten")) return 0;
  const match = normalized.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 0;
}

function parseBirthdate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const raw = clean(value);
  if (!raw) return null;

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const match = raw.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,})[-/ ](\d{2,4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  const fullYear = year.length === 2 ? Number(`20${year}`) : Number(year);
  const date = new Date(`${month} ${day}, ${fullYear}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const assignLearnerSectionFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: { data: { studentId: string; sectionId: string } }) => input)
  .handler(async ({ data, context }) => {
    if (context.user.role !== "admin" && context.user.role !== "academic_director") {
      throw new Error("Forbidden: requires admin or academic_director role");
    }

    const { studentId, sectionId } = data.data;
    
    // Verify student exists
    const student = await db.student.findUnique({
      where: { user_id: studentId }
    });
    
    if (!student) {
      throw new Error("Student not found");
    }
    
    // Verify section exists
    const section = await db.section.findUnique({
      where: { id: sectionId }
    });
    
    if (!section) {
      throw new Error("Section not found");
    }

    await db.student.update({
      where: { user_id: studentId },
      data: { section_id: sectionId }
    });

    return { success: true };
  });
