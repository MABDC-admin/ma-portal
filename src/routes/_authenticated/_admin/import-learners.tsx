import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Card, StatusPill } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/_authenticated/_admin/import-learners")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Import Learners — AttendCloud" },
      { name: "description", content: "Import learner records from Excel." },
    ],
  }),
  component: ImportLearnersPage,
});

type ExcelRow = {
  "Student Number"?: string;
  Email?: string;
  "Grade Level": string;
  "Student Name": string;
  Birthdate: string;
  Age: number;
  Gender: string;
  "MOTHER CONTACT"?: string;
  "MOTHER NAME"?: string;
  "FATHER CONTACT"?: string;
  "FATHER NAME"?: string;
  Contact?: string;
  Mother?: string;
  "Father Contact"?: string;
  Father?: string;
  "Philippine Address": string;
  "UAE Address": string;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function ImportLearnersPage() {
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<{ status: string; count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError(null);
    setResults(null);

    try {
      const { getActiveSchoolYearFn, importExcelLearnersFn } =
        await import("@/lib/admin-import-learners.functions");
      const activeYear = await getActiveSchoolYearFn();

      if (!activeYear) {
        throw new Error("No active school year found. Please activate one in School Years first.");
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: ExcelRow[] = XLSX.utils.sheet_to_json(firstSheet);

          if (!rows || rows.length === 0) {
            throw new Error("No data found in the Excel file.");
          }

          const recordsToInsert = rows.map((row) => ({
            school_year_id: activeYear.id,
            student_number: String(row["Student Number"] || ""),
            email: String(row["Email"] || ""),
            grade_level: String(row["Grade Level"] || ""),
            student_name: String(row["Student Name"] || ""),
            birthdate: String(row["Birthdate"] || ""),
            age: parseInt(String(row["Age"])) || null,
            gender: String(row["Gender"] || ""),
            mother_contact: String(row["MOTHER CONTACT"] || row["Contact"] || ""),
            mother_name: String(row["MOTHER NAME"] || row["Mother"] || ""),
            father_contact: String(row["FATHER CONTACT"] || row["Father Contact"] || ""),
            father_name: String(row["FATHER NAME"] || row["Father"] || ""),
            philippine_address: String(row["Philippine Address"] || ""),
            uae_address: String(row["UAE Address"] || ""),
          }));

          const res = await importExcelLearnersFn({ data: { records: recordsToInsert } });
          if (res.status === "error") throw new Error("Failed to import learners");

          setResults({ status: "success", count: recordsToInsert.length });
          toast.success(`Successfully imported ${recordsToInsert.length} learners!`);
        } catch (err: unknown) {
          setError(errorMessage(err));
        } finally {
          setBusy(false);
        }
      };
      reader.onerror = () => {
        setError("Failed to read file");
        setBusy(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (e: unknown) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <AppShell
      title="Import Learners"
      subtitle="Upload an Excel file to import learner records for the active school year."
    >
      {error && (
        <Card className="mb-4 border-status-absent/30 bg-status-absent/5 p-4">
          <p className="text-sm font-semibold text-status-absent">Error: {error}</p>
        </Card>
      )}

      {results && (
        <div className="mb-4">
          <Card className="p-4 border-status-present/30 bg-status-present/5">
            <p className="text-sm font-semibold text-status-present">
              Successfully imported {results.count} records.
            </p>
          </Card>
        </div>
      )}

      <Card className="p-6">
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-outline-variant rounded-2xl bg-surface-container-low/50">
          <Icon name="upload_file" size={48} className="text-tertiary mb-4" />
          <h3 className="text-lg font-bold mb-2">Upload Excel File</h3>
          <p className="text-sm text-tertiary mb-6 text-center max-w-md">
            The Excel file must contain headers: Grade Level, Student Name, Birthdate, Age, Gender,
            MOTHER CONTACT, MOTHER NAME, FATHER CONTACT, FATHER NAME, Philippine Address, UAE
            Address.
          </p>

          <label className="relative cursor-pointer bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold text-sm shadow hover:brightness-110 transition disabled:opacity-50">
            {busy ? "Importing..." : "Choose Excel File"}
            <input
              type="file"
              accept=".xlsx,.xls"
              className="absolute hidden"
              onChange={handleFileUpload}
              disabled={busy}
            />
          </label>
        </div>
      </Card>
    </AppShell>
  );
}
