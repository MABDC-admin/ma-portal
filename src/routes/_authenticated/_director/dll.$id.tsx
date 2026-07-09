import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell, Card, StatusPill } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/_director/dll/$id")({
  head: () => ({ meta: [{ title: "Review DLL — AttendCloud" }] }),
  component: DllReviewDetail,
});

function DllReviewDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState<null | "approve" | "return">(null);
  const [error, setError] = useState<string | null>(null);

  const dllQ = useQuery({
    queryKey: ["dll", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dlls")
        .select("*, profiles:teacher_id(email, full_name), sections:section_id(name, grade_level)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (dllQ.data?.feedback) setFeedback(dllQ.data.feedback);
  }, [dllQ.data]);

  async function review(kind: "approve" | "return") {
    if (!user) return;
    setError(null);
    setSaving(kind);
    const { error: upErr } = await supabase
      .from("dlls")
      .update({
        status: kind === "approve" ? "approved" : "returned",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        feedback: feedback || null,
      })
      .eq("id", id);
    setSaving(null);
    if (upErr) { setError(upErr.message); return; }
    navigate({ to: "/dll" });
  }

  if (dllQ.isLoading) return <AppShell><p className="text-tertiary">Loading…</p></AppShell>;
  if (dllQ.error || !dllQ.data) return <AppShell><p className="text-status-absent">Not found.</p></AppShell>;

  const d = dllQ.data;
  const teacherName = d.profiles?.full_name || d.profiles?.email || "Teacher";

  return (
    <AppShell>
      <header className="mb-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Link to="/dll" className="mb-3 flex items-center gap-1 text-sm text-tertiary hover:text-foreground">
              <Icon name="arrow_back" size={16} /> Back to review portal
            </Link>
            <h1 className="font-display text-3xl font-extrabold text-foreground">{d.subject}</h1>
            <p className="mt-1 text-sm text-tertiary num">
              Lesson date: {d.lesson_date}
              {d.sections?.name && <> · {d.sections.name}</>}
            </p>
          </div>
          <Card className="flex max-w-xs items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-container text-sm font-bold text-primary">
              {teacherName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold">{teacherName}</p>
              <p className="text-xs text-tertiary">{d.profiles?.email}</p>
            </div>
          </Card>
        </div>
        <div className="mt-4">
          <StatusBadge status={d.status as string} />
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Section title="Learning Objectives">{d.objectives || <em className="text-tertiary">Not provided.</em>}</Section>
          <Section title="Content / Topics">{d.content || <em className="text-tertiary">Not provided.</em>}</Section>
          <Section title="Procedures / Activities">{d.procedures || <em className="text-tertiary">Not provided.</em>}</Section>
          <Section title="Assessment">{d.assessment || <em className="text-tertiary">Not provided.</em>}</Section>
        </div>

        <div className="space-y-6 lg:sticky lg:top-24 lg:col-span-4">
          <Card className="border border-primary/10 p-6 shadow-lg">
            <h3 className="mb-4 font-display text-lg font-bold">Review Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => review("approve")}
                disabled={!!saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-primary-foreground shadow-sm hover:brightness-110 disabled:opacity-60"
              >
                <Icon name="check_circle" filled /> {saving === "approve" ? "Approving…" : "Approve"}
              </button>
              <button
                onClick={() => review("return")}
                disabled={!!saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-outline-variant bg-surface py-4 font-bold text-foreground hover:bg-surface-container disabled:opacity-60"
              >
                <Icon name="assignment_return" /> {saving === "return" ? "Returning…" : "Return for Revision"}
              </button>
            </div>
            {error && <p className="mt-3 text-xs text-status-absent">{error}</p>}
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 font-display text-lg font-bold">Director's Feedback</h3>
            <textarea
              rows={5}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Add comments visible to the teacher…"
              className="w-full rounded-lg border border-outline-variant bg-surface p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <p className="mt-2 text-xs text-tertiary">Comments are saved with the review decision.</p>
          </Card>

          {d.reviewed_at && (
            <Card className="p-6 text-sm">
              <p className="text-xs uppercase tracking-widest text-tertiary">Last reviewed</p>
              <p className="mt-1 num">{new Date(d.reviewed_at).toLocaleString()}</p>
              {d.feedback && <p className="mt-3 text-sm italic text-tertiary">"{d.feedback}"</p>}
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <h2 className="mb-3 font-display text-lg font-bold">{title}</h2>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{children}</p>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "submitted") return <StatusPill tone="late" icon="pending">Pending Review</StatusPill>;
  if (status === "approved") return <StatusPill tone="present" icon="check_circle">Approved</StatusPill>;
  if (status === "returned") return <StatusPill tone="absent" icon="assignment_return">Returned</StatusPill>;
  return <StatusPill tone="neutral" icon="edit">Draft</StatusPill>;
}
