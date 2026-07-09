import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell, Card, StatusPill } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import {
  importLearnersFn,
  type ImportLearnerResult,
} from "@/lib/admin-import-learners.functions";
import roster from "@/lib/learners-roster.json";

export const Route = createFileRoute("/_authenticated/_admin/import-learners")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Import Learners — AttendCloud" },
      { name: "description", content: "One-time bulk import of MABDC learners for 2025-2026." },
    ],
  }),
  component: ImportLearnersPage,
});

function ImportLearnersPage() {
  const run = useServerFn(importLearnersFn);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ImportLearnerResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await run();
      if (!res || !Array.isArray(res.results)) {
        throw new Error("Server returned no results. Check server logs (import may have timed out).");
      }
      setResults(res.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const created = results?.filter((r) => r.status === "created").length ?? 0;
  const skipped = results?.filter((r) => r.status === "skipped").length ?? 0;
  const errored = results?.filter((r) => r.status === "error").length ?? 0;

  return (
    <AppShell
      title="Import Learners"
      subtitle={`Bulk import ${roster.learners.length} learners across ${roster.sections.length} sections for ${roster.academic_year}. Idempotent — safe to re-run.`}
      actions={
        <button
          onClick={start}
          disabled={busy}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-110 disabled:opacity-60"
        >
          <Icon name={busy ? "hourglass_top" : "cloud_upload"} size={18} />
          <span>{busy ? "Importing… (may take ~1 min)" : `Import Learners (${roster.learners.length})`}</span>
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
          <Card className="p-4"><p className="text-xs uppercase tracking-widest text-tertiary">Skipped</p><p className="mt-1 font-display text-3xl font-bold text-status-late">{skipped}</p></Card>
          <Card className="p-4"><p className="text-xs uppercase tracking-widest text-tertiary">Errors</p><p className="mt-1 font-display text-3xl font-bold text-status-absent">{errored}</p></Card>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 border-b border-outline-variant bg-surface-container-low">
              <tr className="text-left">
                {["#", "Name", "Email", "Section", "Status", "Message"].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-tertiary">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roster.learners.map((row) => {
                const r = results?.find((x) => x.email === row.email);
                return (
                  <tr key={row.email} className="border-b border-outline-variant/40 last:border-0">
                    <td className="px-4 py-2 text-tertiary">{row.student_number}</td>
                    <td className="px-4 py-2 font-semibold">{row.full_name}</td>
                    <td className="px-4 py-2 text-tertiary">{row.email}</td>
                    <td className="px-4 py-2">{row.section_name}</td>
                    <td className="px-4 py-2">
                      {!r && <span className="text-xs text-tertiary">—</span>}
                      {r?.status === "created" && <StatusPill tone="present" icon="check_circle">Created</StatusPill>}
                      {r?.status === "skipped" && <StatusPill tone="neutral" icon="info">Skipped</StatusPill>}
                      {r?.status === "error" && <StatusPill tone="absent" icon="error">Error</StatusPill>}
                    </td>
                    <td className="px-4 py-2 text-xs text-tertiary">{r?.message ?? ""}</td>
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
