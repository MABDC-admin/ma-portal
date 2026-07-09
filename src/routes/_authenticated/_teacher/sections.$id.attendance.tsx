import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Card } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSectionRosterFn, getSectionAttendanceFn, upsertAttendanceFn } from "@/lib/teacher.functions";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/_teacher/sections/$id/attendance")({
  head: () => ({ meta: [{ title: "Attendance — AttendCloud" }] }),
  component: SectionAttendance,
});

type Status = "present" | "late" | "absent" | "excused";
const STATUSES: Status[] = ["present", "late", "absent", "excused"];
const TONES: Record<Status, string> = {
  present: "bg-status-present/10 text-status-present ring-status-present/40",
  late: "bg-status-late/15 text-status-late ring-status-late/40",
  absent: "bg-status-absent/10 text-status-absent ring-status-absent/40",
  excused: "bg-status-excused/10 text-status-excused ring-status-excused/40",
};

function SectionAttendance() {
  const { id } = Route.useParams();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const rosterFn = useServerFn(listSectionRosterFn);
  const getFn = useServerFn(getSectionAttendanceFn);
  const upsertFn = useServerFn(upsertAttendanceFn);
  const qc = useQueryClient();

  const rosterQ = useQuery({
    queryKey: ["section-roster", id],
    queryFn: () => rosterFn({ data: { sectionId: id } }),
  });
  const attQ = useQuery({
    queryKey: ["section-attendance", id, date],
    queryFn: () => getFn({ data: { sectionId: id, date } }),
  });

  const [edits, setEdits] = useState<Record<string, { status: Status; notes: string }>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const map: Record<string, { status: Status; notes: string }> = {};
    for (const r of attQ.data ?? []) {
      map[r.student_id as string] = { status: r.status as Status, notes: (r.notes as string) ?? "" };
    }
    setEdits(map);
  }, [attQ.data]);

  const students = useMemo(() => {
    const raw = (rosterQ.data as unknown as { students: Array<{ user_id: string; student_number: string; profiles: { full_name: string | null; email: string | null } | null }> } | undefined)?.students ?? [];
    return raw;
  }, [rosterQ.data]);

  const counts = useMemo(() => {
    const c = { present: 0, late: 0, absent: 0, excused: 0, unmarked: 0 };
    for (const s of students) {
      const e = edits[s.user_id];
      if (!e) c.unmarked++;
      else c[e.status]++;
    }
    return c;
  }, [students, edits]);

  function setAll(status: Status) {
    setEdits((prev) => {
      const next = { ...prev };
      for (const s of students) next[s.user_id] = { status, notes: next[s.user_id]?.notes ?? "" };
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const entries = Object.entries(edits).map(([studentId, v]) => ({ studentId, status: v.status, notes: v.notes || null }));
      const res = await upsertFn({ data: { sectionId: id, date, entries } });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["section-attendance", id, date] }),
        qc.invalidateQueries({ queryKey: ["today-attendance"] }),
      ]);
      setMessage(`Saved ${res.count} record${res.count === 1 ? "" : "s"}.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const section = (rosterQ.data as unknown as { section: { name: string; grade_level: number } } | undefined)?.section;

  return (
    <AppShell>
      <Link to="/sections/$id" params={{ id }} className="mb-3 flex items-center gap-1 text-sm text-tertiary hover:text-foreground">
        <Icon name="arrow_back" size={16} /> Back to section
      </Link>
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Daily attendance</h1>
          <p className="mt-1 text-sm text-tertiary">{section?.name ?? "Section"} · Grade {section?.grade_level ?? "—"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm">
            <Icon name="calendar_today" size={16} />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent outline-none num" />
          </label>
          <button
            onClick={() => setAll("present")}
            className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold hover:bg-surface-container"
          >
            Mark all present
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-110 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save attendance"}
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Present" value={counts.present} tone="present" />
        <Kpi label="Late" value={counts.late} tone="late" />
        <Kpi label="Absent" value={counts.absent} tone="absent" />
        <Kpi label="Excused" value={counts.excused} tone="excused" />
        <Kpi label="Unmarked" value={counts.unmarked} tone="neutral" />
      </div>

      {message && <div className="mb-4 rounded-lg bg-primary-container/30 p-3 text-sm text-primary">{message}</div>}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-outline-variant bg-surface-container-low/40 text-left text-xs uppercase tracking-widest text-tertiary">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rosterQ.isLoading && <tr><td colSpan={4} className="px-4 py-8 text-center text-tertiary">Loading…</td></tr>}
            {students.map((s) => {
              const name = s.profiles?.full_name || s.profiles?.email || "Student";
              const cur = edits[s.user_id];
              return (
                <tr key={s.user_id} className="border-t border-outline-variant/40">
                  <td className="px-4 py-3 num text-tertiary">{s.student_number}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{name}</p>
                    <p className="text-xs text-tertiary">{s.profiles?.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {STATUSES.map((st) => (
                        <button
                          key={st}
                          onClick={() => setEdits((p) => ({ ...p, [s.user_id]: { status: st, notes: p[s.user_id]?.notes ?? "" } }))}
                          className={
                            "rounded-lg px-3 py-1 text-xs font-bold capitalize ring-1 transition " +
                            (cur?.status === st
                              ? `${TONES[st]} ring-2`
                              : "bg-surface-container text-tertiary ring-outline-variant/40 hover:bg-surface-container-high")
                          }
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={cur?.notes ?? ""}
                      onChange={(e) => setEdits((p) => ({ ...p, [s.user_id]: { status: p[s.user_id]?.status ?? "present", notes: e.target.value } }))}
                      placeholder="Optional note…"
                      className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </AppShell>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone: Status | "neutral" }) {
  const c =
    tone === "present" ? "text-status-present"
    : tone === "late" ? "text-status-late"
    : tone === "absent" ? "text-status-absent"
    : tone === "excused" ? "text-status-excused"
    : "text-tertiary";
  return (
    <Card className="p-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-tertiary">{label}</p>
      <p className={`num font-display text-2xl font-extrabold ${c}`}>{value}</p>
    </Card>
  );
}
