import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAllAnecdotalsFn } from "@/lib/teacher.functions";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/_director/anecdotal")({
  head: () => ({ meta: [{ title: "Anecdotal Log — AttendCloud" }] }),
  component: DirectorAnecdotalPage,
});

type Category = "academic" | "behavioral" | "social" | "achievement";
const CAT_TONES: Record<Category, string> = {
  academic: "bg-primary/10 text-primary",
  behavioral: "bg-status-late/15 text-status-late",
  social: "bg-status-excused/15 text-status-excused",
  achievement: "bg-status-present/15 text-status-present",
};
const CAT_ICONS: Record<Category, string> = {
  academic: "school",
  behavioral: "psychology",
  social: "groups",
  achievement: "emoji_events",
};

function DirectorAnecdotalPage() {
  const listFn = useServerFn(listAllAnecdotalsFn);
  const q = useQuery({ queryKey: ["all-anecdotals"], queryFn: () => listFn() });
  const [filter, setFilter] = useState<Category | "all">("all");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const all = q.data ?? [];
    const f = filter === "all" ? all : all.filter((r) => r.category === filter);
    if (!search.trim()) return f;
    const s = search.toLowerCase();
    return f.filter((r) => {
      const student = (r as unknown as { student: { profiles: { full_name: string | null; email: string | null } | null } | null }).student;
      const teacher = (r as unknown as { teacher: { full_name: string | null; email: string | null } | null }).teacher;
      const sn = (student?.profiles?.full_name || student?.profiles?.email || "").toLowerCase();
      const tn = (teacher?.full_name || teacher?.email || "").toLowerCase();
      return sn.includes(s) || tn.includes(s) || r.note.toLowerCase().includes(s);
    });
  }, [q.data, filter, search]);

  const counts = useMemo(() => {
    const c: Record<Category | "all", number> = { all: 0, academic: 0, behavioral: 0, social: 0, achievement: 0 };
    for (const r of q.data ?? []) { c.all++; c[r.category as Category]++; }
    return c;
  }, [q.data]);

  return (
    <AppShell
      title="Anecdotal Log"
      subtitle="All teacher observations across sections."
    >
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Total" value={counts.all} icon="notes" tone="primary" />
        {(["academic", "behavioral", "social", "achievement"] as Category[]).map((c) => (
          <Kpi key={c} label={cap(c)} value={counts[c]} icon={CAT_ICONS[c]} tone={c} />
        ))}
      </div>

      <Card className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-lg bg-surface-container p-1 text-xs font-semibold">
            {(["all", "academic", "behavioral", "social", "achievement"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={"rounded-md px-3 py-1 capitalize " + (filter === f ? "bg-surface shadow-sm" : "text-tertiary")}
              >{f}</button>
            ))}
          </div>
          <label className="relative">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student, teacher, or text…"
              className="h-9 w-72 rounded-lg border border-outline-variant bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </label>
        </div>

        {q.isLoading && <p className="text-sm text-tertiary">Loading…</p>}
        {!q.isLoading && rows.length === 0 && (
          <p className="rounded-xl border border-dashed border-outline-variant p-8 text-center text-sm text-tertiary">No entries match.</p>
        )}

        <div className="space-y-3">
          {rows.map((r) => {
            const student = (r as unknown as { student: { profiles: { full_name: string | null; email: string | null } | null } | null }).student;
            const teacher = (r as unknown as { teacher: { full_name: string | null; email: string | null } | null }).teacher;
            const cat = r.category as Category;
            return (
              <div key={r.id} className="rounded-xl border border-outline-variant/60 p-4 hover:bg-surface-container-low/50">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${CAT_TONES[cat]}`}>
                      <Icon name={CAT_ICONS[cat]} size={14} filled /> {cap(cat)}
                    </span>
                    <span className="text-sm font-semibold">{student?.profiles?.full_name || student?.profiles?.email || "Student"}</span>
                  </div>
                  <span className="text-xs text-tertiary num">{r.occurred_on}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{r.note}</p>
                <p className="mt-2 text-xs text-tertiary">Logged by {teacher?.full_name || teacher?.email || "Teacher"}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </AppShell>
  );
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function Kpi({ label, value, icon, tone }: { label: string; value: number; icon: string; tone: string }) {
  const c =
    tone === "primary" ? "text-primary"
    : tone === "academic" ? "text-primary"
    : tone === "behavioral" ? "text-status-late"
    : tone === "social" ? "text-status-excused"
    : "text-status-present";
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <Icon name={icon} className={c} filled />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-tertiary">{label}</p>
          <p className={`num font-display text-2xl font-extrabold ${c}`}>{value}</p>
        </div>
      </div>
    </Card>
  );
}
