import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell, Card } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/_teacher/dll/new")({
  head: () => ({ meta: [{ title: "New DLL Entry — AttendCloud" }] }),
  component: NewDllEntry,
});

function NewDllEntry() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sectionId, setSectionId] = useState("");
  const [subject, setSubject] = useState("");
  const [lessonDate, setLessonDate] = useState(new Date().toISOString().slice(0, 10));
  const [objectives, setObjectives] = useState("");
  const [content, setContent] = useState("");
  const [procedures, setProcedures] = useState("");
  const [assessment, setAssessment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<null | "draft" | "submit">(null);

  const sectionsQ = useQuery({
    queryKey: ["sections-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sections").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function save(kind: "draft" | "submit") {
    if (!user) return;
    setError(null);
    setSaving(kind);
    const payload = {
      teacher_id: user.id,
      section_id: sectionId || null,
      subject,
      lesson_date: lessonDate,
      objectives,
      content,
      procedures,
      assessment,
      status: kind === "draft" ? "draft" : "submitted",
      submitted_at: kind === "submit" ? new Date().toISOString() : null,
    };
    const { error: insErr } = await supabase.from("dlls").insert(payload);
    setSaving(null);
    if (insErr) { setError(insErr.message); return; }
    navigate({ to: "/" });
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <nav className="mb-2 flex items-center gap-2 text-sm text-tertiary">
            <Link to="/">Dashboard</Link>
            <Icon name="chevron_right" size={16} />
            <span>New DLL Entry</span>
          </nav>
          <h2 className="font-display text-3xl font-extrabold text-foreground">New DLL Entry</h2>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/" className="rounded-lg border border-outline-variant px-5 py-2.5 text-sm font-semibold hover:bg-surface-container">Discard</Link>
          <button
            onClick={() => save("draft")}
            disabled={!!saving}
            className="rounded-lg border border-outline-variant px-5 py-2.5 text-sm font-semibold hover:bg-surface-container disabled:opacity-60"
          >{saving === "draft" ? "Saving…" : "Save Draft"}</button>
          <button
            onClick={() => save("submit")}
            disabled={!!saving}
            className="rounded-lg bg-primary px-8 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:brightness-110 disabled:opacity-60"
          >{saving === "submit" ? "Submitting…" : "Submit Log"}</button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-status-absent/10 p-3 text-sm text-status-absent">{error}</div>}

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-6 lg:col-span-8">
          <Card className="p-6">
            <h3 className="mb-6 font-display text-xl font-bold">Lesson Identity</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Field label="Date of Lesson">
                <input type="date" value={lessonDate} onChange={(e) => setLessonDate(e.target.value)} className="input" />
              </Field>
              <Field label="Section">
                <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className="input">
                  <option value="">— Select section —</option>
                  {sectionsQ.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Subject">
                <input required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Algebra" className="input" />
              </Field>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-6 font-display text-xl font-bold">Curriculum Delivery</h3>
            <div className="space-y-6">
              <Field label="Learning Objectives">
                <textarea rows={3} value={objectives} onChange={(e) => setObjectives(e.target.value)} placeholder="What students will achieve…" className="input" />
              </Field>
              <Field label="Content / Topics">
                <textarea rows={3} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Chapters, sections, materials…" className="input" />
              </Field>
              <Field label="Procedures / Activities">
                <textarea rows={5} value={procedures} onChange={(e) => setProcedures(e.target.value)} placeholder="Direct instruction, group work, checks for understanding…" className="input" />
              </Field>
              <Field label="Assessment">
                <textarea rows={3} value={assessment} onChange={(e) => setAssessment(e.target.value)} placeholder="Exit ticket, quiz, performance task…" className="input" />
              </Field>
            </div>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <div className="flex gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-4">
            <Icon name="info" size={20} className="text-primary" />
            <p className="text-xs text-tertiary">
              Save as draft to keep working, or submit to send to the Academic Director for review.
            </p>
          </div>
        </div>
      </div>

      <style>{`.input{width:100%;border-radius:.5rem;border:1px solid var(--outline-variant);background:var(--surface);padding:.625rem .75rem;font-size:.875rem;outline:none;transition:all 150ms}.input:focus{border-color:var(--primary);box-shadow:0 0 0 3px color-mix(in oklch,var(--primary) 20%,transparent)}`}</style>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold uppercase tracking-widest text-tertiary">{label}</label>
      {children}
    </div>
  );
}
