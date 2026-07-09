import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell, Card, StatusPill } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { seedFacultyFn, type SeedFacultyResult } from "@/lib/admin-seed.functions";

export const Route = createFileRoute("/_authenticated/_admin/seed-faculty")({
  head: () => ({
    meta: [
      { title: "Seed Faculty — AttendCloud" },
      { name: "description", content: "One-time bulk import of MABDC faculty accounts." },
    ],
  }),
  component: SeedFacultyPage,
});

const ROSTER_PREVIEW = [
  { name: "Aimee June A. Alolor", email: "aloloraimeejune@gmail.com", role: "teacher" as const },
  { name: "Revelyn A. Galang", email: "galangrevelyn@gmail.com", role: "teacher" as const },
  { name: "Michelle R. Aserios", email: "mich.agcy@gmail.com", role: "teacher" as const },
  { name: "Krisha Dwine R. Riotoc", email: "dwine.riotoc1122@gmail.com", role: "teacher" as const },
  { name: "Julie Fe L. Benedicto", email: "luciojuliefb@gmail.com", role: "teacher" as const },
  { name: "Jecille F. Buizon", email: "franciscojecille451@gmail.com", role: "teacher" as const },
  { name: "Jayson B. Cuello", email: "jisuncwelyo10@gmail.com", role: "teacher" as const },
  { name: "Jan Alfred P. Macalintal", email: "macalintaljanalfred@gmail.com", role: "teacher" as const },
  { name: "Jade Emerald A. Amurao", email: "jhaydey0203@gmail.com", role: "teacher" as const },
  { name: "Homer S. Macrohon", email: "ayeshanicolemacrohon@gmail.com", role: "teacher" as const },
  { name: "Glorie Ann I. Espinosa", email: "espinosaglorieann@gmail.com", role: "academic_director" as const },
  { name: "Princess Jesa D. Tagulao", email: "0128princessjesa@gmail.com", role: "teacher" as const },
  { name: "Mark John J. Ramirez", email: "ramirezmarkjohn@gmail.com", role: "teacher" as const },
  { name: "Christine Mari M. Jonson", email: "cmjonson01@yahoo.com", role: "teacher" as const },
  { name: "Arianne Kaye N. Sager", email: "aknsager@gmail.com", role: "teacher" as const },
  { name: "Renz Vincent S. Aclan", email: "aclanrenz1@gmail.com", role: "teacher" as const },
];

function SeedFacultyPage() {
  const seed = useServerFn(seedFacultyFn);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<SeedFacultyResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      const { results } = await seed({ data: undefined as never });
      setResults(results);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  const created = results?.filter((r) => r.status === "created").length ?? 0;
  const skipped = results?.filter((r) => r.status === "skipped").length ?? 0;
  const errored = results?.filter((r) => r.status === "error").length ?? 0;

  return (
    <AppShell
      title="Seed Faculty"
      subtitle="One-time bulk import of 15 teachers and 1 academic director. Idempotent — safe to re-run."
      actions={
        <button
          onClick={run}
          disabled={running}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-110 disabled:opacity-60"
        >
          <Icon name={running ? "hourglass_top" : "cloud_upload"} size={18} />
          <span>{running ? "Seeding…" : "Seed Faculty (16)"}</span>
        </button>
      }
    >
      {error && (
        <Card className="mb-4 border-status-absent/30 bg-status-absent/5 p-4">
          <p className="text-sm font-semibold text-status-absent">Error: {error}</p>
        </Card>
      )}

      {results && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          <Card className="p-4"><p className="text-xs uppercase tracking-widest text-tertiary">Created</p><p className="mt-1 font-display text-3xl font-bold text-status-present">{created}</p></Card>
          <Card className="p-4"><p className="text-xs uppercase tracking-widest text-tertiary">Skipped (existed)</p><p className="mt-1 font-display text-3xl font-bold text-status-late">{skipped}</p></Card>
          <Card className="p-4"><p className="text-xs uppercase tracking-widest text-tertiary">Errors</p><p className="mt-1 font-display text-3xl font-bold text-status-absent">{errored}</p></Card>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-outline-variant bg-surface-container-low/50">
              <tr className="text-left">
                {["Name", "Email", "Role", "Status", "Message"].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-bold uppercase tracking-widest text-tertiary">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROSTER_PREVIEW.map((row) => {
                const r = results?.find((x) => x.email === row.email);
                return (
                  <tr key={row.email} className="border-b border-outline-variant/40 last:border-0">
                    <td className="px-5 py-3 font-semibold">{row.name}</td>
                    <td className="px-5 py-3 text-tertiary">{row.email}</td>
                    <td className="px-5 py-3">
                      {row.role === "academic_director"
                        ? <span className="rounded-full bg-status-late/15 px-2 py-0.5 text-xs font-semibold text-status-late">Director</span>
                        : <span className="rounded-full bg-primary-container/40 px-2 py-0.5 text-xs font-semibold text-primary">Teacher</span>}
                    </td>
                    <td className="px-5 py-3">
                      {!r && <span className="text-xs text-tertiary">—</span>}
                      {r?.status === "created" && <StatusPill tone="present" icon="check_circle">Created</StatusPill>}
                      {r?.status === "skipped" && <StatusPill tone="neutral" icon="info">Skipped</StatusPill>}
                      {r?.status === "error" && <StatusPill tone="absent" icon="error">Error</StatusPill>}
                    </td>
                    <td className="px-5 py-3 text-xs text-tertiary">{r?.message ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
