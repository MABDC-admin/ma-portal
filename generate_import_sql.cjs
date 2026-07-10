const fs = require("fs");
const crypto = require("crypto");
const xlsx = require("xlsx");

const excelPath = "C:\\Users\\DENNIS\\Downloads\\Complete_Sorted_Student_Details_Corrected.xlsx";
const wb = xlsx.readFile(excelPath);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(ws);

const academicYear = "2025-2026";
let sql = `-- MABDC Learner Import SQL for ${academicYear}\n\n`;

const sections = new Map();

rows.forEach((row, idx) => {
  const gradeStr = row["Grade Level"] ? row["Grade Level"].trim() : "Unknown";
  if (!sections.has(gradeStr)) {
    const sectionId = crypto.randomUUID();
    let gradeInt = 0;
    if (gradeStr.toLowerCase().includes("grade")) {
      const match = gradeStr.match(/\d+/);
      if (match) gradeInt = parseInt(match[0], 10);
    }
    sections.set(gradeStr, sectionId);

    // Insert section if not exists
    sql += `INSERT INTO public.sections (id, name, grade_level, academic_year)\n`;
    sql += `VALUES ('${sectionId}', '${gradeStr.replace(/'/g, "''")}', ${gradeInt}, '${academicYear}')\n`;
    sql += `ON CONFLICT (name, academic_year) DO UPDATE SET id = EXCLUDED.id RETURNING id;\n\n`;
  }
});

sql += `\n-- Inserting Students\n`;

let studentCounter = 1;
rows.forEach((row) => {
  const name = row["Student Name"] ? row["Student Name"].trim() : "Unknown Student";
  const gradeStr = row["Grade Level"] ? row["Grade Level"].trim() : "Unknown";
  const sectionId = sections.get(gradeStr);

  const userId = crypto.randomUUID();
  const emailName = name
    .split(",")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const email = `${emailName}.${studentCounter}@student.mabdc.edu.ph`;
  const studentNum = `2025${String(studentCounter).padStart(4, "0")}`;

  // Create auth.user
  sql += `INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)\n`;
  sql += `VALUES (\n  '${userId}', 'authenticated', 'authenticated', '${email}', crypt('mabdc2025', gen_salt('bf')),\n`;
  sql += `  now(), '{"provider":"email","providers":["email"]}', '{"full_name":"${name.replace(/'/g, "''")}"}', now(), now()\n);\n\n`;

  // Create student record
  sql += `INSERT INTO public.students (user_id, student_number, section_id, status)\n`;
  // We use a subquery to get the section_id in case it was already existing and ON CONFLICT updated it
  sql += `VALUES (\n  '${userId}', '${studentNum}', (SELECT id FROM public.sections WHERE name = '${gradeStr.replace(/'/g, "''")}' AND academic_year = '${academicYear}' LIMIT 1), 'active'\n);\n\n`;

  studentCounter++;
});

fs.writeFileSync("C:\\Users\\DENNIS\\Downloads\\import_learners.sql", sql, "utf8");
console.log("SQL generated successfully at C:\\Users\\DENNIS\\Downloads\\import_learners.sql");
