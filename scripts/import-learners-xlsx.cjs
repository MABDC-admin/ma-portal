const crypto = require("node:crypto");
const XLSX = require("xlsx");
const { PrismaClient } = require("@prisma/client");

const workbookPath = process.argv[2];
if (!workbookPath) {
  console.error("Usage: node scripts/import-learners-xlsx.cjs <workbook.xlsx>");
  process.exit(1);
}

const db = new PrismaClient();

function clean(value) {
  return String(value ?? "").trim();
}

function parseNullableInt(value) {
  const parsed = Number.parseInt(clean(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseGradeLevel(gradeLevel) {
  const normalized = gradeLevel.toLowerCase();
  if (normalized.includes("kindergarten")) return 0;
  const match = normalized.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 0;
}

function parseBirthdate(value) {
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

async function main() {
  const workbook = XLSX.readFile(workbookPath, { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const activeYear = await db.schoolYear.findFirst({ where: { is_active: true } });
  if (!activeYear) throw new Error("No active school year found.");

  const yearPrefix = activeYear.year.match(/\d{4}/)?.[0] ?? String(new Date().getFullYear());
  const sectionIds = new Map();
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const studentName = clean(row["Student Name"]);
    if (!studentName) {
      skipped++;
      continue;
    }

    const sectionName = clean(row["Grade Level"]) || "Unassigned";
    let sectionId = sectionIds.get(sectionName);
    if (!sectionId) {
      const section = await db.section.upsert({
        where: {
          name_academic_year: {
            name: sectionName,
            academic_year: activeYear.year,
          },
        },
        update: { grade_level: parseGradeLevel(sectionName) },
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
      clean(row["Student Number"]) || `${yearPrefix}${String(index + 1).padStart(4, "0")}`;
    const email = clean(row.Email) || `${studentNumber}@learners.local`;
    let user = await db.user.findUnique({ where: { email } });

    if (!user) {
      user = await db.user.create({
        data: {
          id: crypto.randomUUID(),
          email,
          full_name: studentName,
          password: studentNumber,
          role: "student",
        },
      });
      created++;
    } else {
      user = await db.user.update({
        where: { id: user.id },
        data: { full_name: studentName, role: "student" },
      });
      updated++;
    }

    const studentData = {
      user_id: user.id,
      student_number: studentNumber,
      section_id: sectionId,
      status: "active",
      birthdate: parseBirthdate(row.Birthdate),
      age: parseNullableInt(row.Age),
      gender: clean(row.Gender),
      mother_contact: clean(row["MOTHER CONTACT"] || row.Contact),
      mother_name: clean(row["MOTHER NAME"] || row.Mother),
      father_contact: clean(row["FATHER CONTACT"] || row["Father Contact"]),
      father_name: clean(row["FATHER NAME"] || row.Father),
      philippine_address: clean(row["Philippine Address"]),
      uae_address: clean(row["UAE Address"]),
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
  }

  const [students, sections, users] = await Promise.all([
    db.student.count(),
    db.section.count(),
    db.user.count({ where: { role: "student" } }),
  ]);

  console.log(
    JSON.stringify(
      { rows: rows.length, created, updated, skipped, students, sections, studentUsers: users },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
