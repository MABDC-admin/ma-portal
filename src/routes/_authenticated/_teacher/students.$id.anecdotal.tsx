import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Card } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAnecdotalsForStudentFn, createAnecdotalFn } from "@/lib/teacher.functions";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_teacher/students/$id/anecdotal")({
  head: () => ({ meta: [{ title: "Anecdotal Entries — AttendCloud" }] }),
  component: AnecdotalsPage,
});

type Category = "academic" | "behavioral" | "social" | "achievement";
const CATEGORIES: { value: Category; label: string; icon: string; tone: string }[] = [
  { value: "academic", label: "Academic", icon: "school", tone: "bg-primary/10 text-primary" },
  { value: "behavioral", label: "Behavioral", icon: "psychology", tone: "bg-status-late/15 text-status-late" },
  { value: "social", label: "Social", icon: "groups", tone: "bg-status-excused/15 text-status-excused" },
  { value: "achievement", label: "Achievement", icon: "emoji_events", tone: "bg-status-present/15 text-status-present" },
];

function AnecdotalsPage() {
  const { id } = Route.useParams();
  const listFn = useServerFn(listAnecdotalsForStudentFn);
  const createFn = useServerFn(createAnecdotalFn);
  const qc = useQueryClient();

  const listQ = useQuery({
    queryKey: ["anecdotals", id],
    queryFn: () => listFn({ data: { studentId: id } }),
  });

  const studentQ = useQuery({
    queryKey: ["student-lite", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("full_name, email, avatar_url").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const [category, setCategory] = useState<Category>("academic");
  const [note, setNote] = useState("");
  const [occurredOn, setOccurredOn] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!note.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createFn({ data: { studentId: id, category, note: note.trim(), occurredOn } });
      setNote("");
      await qc.invalidateQueries({ queryKey: ["anecdotals", id] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const name = studentQ.data?.full_name || studentQ.data?.email || "Student";

  return (
    <AppShell>
      <Link to="/" className="mb-3 flex items-center gap-1 text-sm text-tertiary hover:text-foreground">
        <Icon name="arrow_back" size={16} /> Dashboard
      </Link>
      <header className="mb-6 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-container text-lg font-bold text-primary">
          {name.split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h1 className="font-display text-3xl font-extrabold">{name}</h1>
          <p className="text-sm text-tertiary">Anecdotal record · Academic Director is notified on new entries</p>
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Create form */}
        <Card className="p-6">
          <h3 className="mb-4 font-display text-lg font-bold">New anecdotal note</h3>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={
                  "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition " +
                  (category === c.value
                    ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/20"
                    : "border-outline-variant bg-surface hover:bg-surface-container")
                }
              >
                <Icon name={c.icon} filled size={18} />
                {c.label}
              </button>
            ))}
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-tertiary">Date observed</label>
            <input
              type="date"
              value={occurredOn}
              onChange={(e) => setOccurredOn(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm num outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-tertiary">Observation</label>
            <textarea
              rows={6}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Describe what happened, when, and any relevant context…"
              className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {error && <p className="mb-3 text-sm text-status-absent">{error}</p>}
          <button
            onClick={submit}
            disabled={!note.trim() || saving}
            className="w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground shadow-sm hover:brightness-110 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Log entry & notify Director"}
          </button>
        </Card>

        {/* Timeline */}
        <div className="space-y-4">
          <h3 className="font-display text-lg font-bold">History</h3>
          {listQ.isLoading && <p className="text-sm text-tertiary">Loading…</p>}
          {!listQ.isLoading && (listQ.data?.length ?? 0) === 0 && (
            <Card className="p-6 text-center text-sm text-tertiary">No anecdotal entries yet.</Card>
          )}
          {listQ.data?.map((e) => {
            const cat = CATEGORIES.find((c) => c.value === e.category) ?? CATEGORIES[0];
            const teacher = (e as unknown as { profiles: { full_name: string | null; email: string | null } | null }).profiles;
            return (
              <Card key={e.id} className="p-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${cat.tone}`}>
                    <Icon name={cat.icon} size={14} filled /> {cat.label}
                  </span>
                  <span className="text-xs text-tertiary num">{e.occurred_on}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{e.note}</p>
                <p className="mt-2 text-xs text-tertiary">by {teacher?.full_name || teacher?.email || "Teacher"}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
