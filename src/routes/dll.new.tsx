import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Card } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useState } from "react";

export const Route = createFileRoute("/dll/new")({
  head: () => ({
    meta: [
      { title: "New DLL Entry — AttendCloud" },
      { name: "description", content: "Record and reflect on your classroom implementation for today." },
      { property: "og:title", content: "New DLL Entry — AttendCloud" },
      { property: "og:description", content: "Multi-section form for lesson identity, curriculum delivery, and reflection." },
    ],
  }),
  component: NewDllEntry,
});

function NewDllEntry() {
  const [saved, setSaved] = useState(false);
  return (
    <AppShell>
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <nav className="mb-2 flex items-center gap-2 text-sm text-tertiary">
            <Link to="/dll">Classes</Link>
            <Icon name="chevron_right" size={16} />
            <span>Daily Lesson Log</span>
          </nav>
          <h2 className="font-display text-3xl font-extrabold text-foreground">New DLL Entry</h2>
          <p className="mt-1 text-sm text-tertiary">Record and reflect on your classroom implementation for today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/dll" className="rounded-lg border border-outline-variant px-5 py-2.5 text-sm font-semibold hover:bg-surface-container">Discard</Link>
          <button
            onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000); }}
            className="rounded-lg bg-primary px-8 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:brightness-110"
          >Submit Log</button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-6 lg:col-span-8">
          <Card className="p-6">
            <SectionHeader icon="description" tone="primary" title="Lesson Identity" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Field label="Date of Lesson"><input type="date" defaultValue="2024-10-24" className="input" /></Field>
              <Field label="Teacher Name"><input defaultValue="Sarah Jenkins" className="input" /></Field>
              <Field label="Learning Area / Subject">
                <select className="input">
                  <option>General Mathematics</option><option>Physical Sciences</option><option>Social Media Studies</option><option>Creative Writing</option>
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Grade & Section">
                  <select className="input">
                    <option>11 - Galileo</option><option>11 - Newton</option><option>12 - Curie</option>
                  </select>
                </Field>
                <Field label="Quarter / Week"><input defaultValue="Q2 W7" className="input" /></Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Topic / Lesson Title"><input placeholder="e.g. Quadratic Functions" className="input" /></Field>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <SectionHeader icon="assignment_turned_in" tone="secondary" title="Curriculum Delivery" />
            <div className="space-y-6">
              <Field label="Learning Competency / Objectives">
                <textarea rows={3} placeholder="Enter the MELC-aligned objectives students will achieve…" className="input" />
              </Field>
              <Field label="Teaching Activities">
                <textarea rows={5} placeholder="Direct instruction, group work, formative checks…" className="input" />
              </Field>
            </div>
          </Card>

          <Card className="p-6">
            <SectionHeader icon="psychology" tone="tertiary" title="Reflection & Action Plan" />
            <Field label="Notes on Progress / Next Steps">
              <textarea rows={4} placeholder="What worked, what didn't, and what's next…" className="input" />
            </Field>
          </Card>
        </div>

        <div className="col-span-12 space-y-6 lg:col-span-4">
          <Card className="border-primary-container/40 bg-primary-container/5 p-6">
            <div className="space-y-6">
              <Field label="Implementation Status">
                <select className="input">
                  <option>Completed</option><option>Partially Completed</option><option>Rescheduled</option>
                </select>
              </Field>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-tertiary">Assessment Used</p>
                <div className="grid grid-cols-2 gap-2">
                  {["Quiz", "Activity", "Performance", "Oral Exam"].map((a) => (
                    <label key={a} className="flex cursor-pointer items-center gap-2 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm hover:bg-surface-container">
                      <input type="checkbox" className="accent-primary" /> {a}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-tertiary">Learner Performance</h4>
            <div className="flex items-center justify-between text-sm">
              <span>Mastery Level</span>
              <span className="num font-bold">84%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-container">
              <div className="h-full rounded-full bg-status-present" style={{ width: "84%" }} />
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-tertiary">Attachments</h4>
              <button className="text-xs font-semibold text-primary hover:underline">+ Add Link</button>
            </div>
            <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-outline-variant p-6 text-center">
              <Icon name="cloud_upload" size={32} className="text-tertiary" />
              <p className="mt-2 text-sm font-medium">Upload presentation or handout</p>
              <p className="text-xs text-tertiary">PDF, PPTX, or DOCX up to 10MB</p>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-3 rounded-lg bg-surface-container p-2">
                <Icon name="description" size={20} className="text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">Quadratic_Functions_v2.pptx</p>
                  <p className="text-xs text-tertiary num">2.4 MB</p>
                </div>
                <button className="text-tertiary hover:text-foreground" aria-label="Remove"><Icon name="close" size={16} /></button>
              </div>
            </div>
          </Card>

          <div className="flex gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-4">
            <Icon name="info" size={20} className="text-primary" />
            <p className="text-xs text-tertiary">
              This log will be synced to the Department Head's dashboard for weekly monitoring. Ensure all competencies are mapped to the MELCs.
            </p>
          </div>
        </div>
      </div>

      {saved && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-4 rounded-2xl border border-outline-variant bg-surface px-5 py-4 shadow-lg">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-status-present/10 text-status-present">
            <Icon name="check_circle" filled />
          </div>
          <div>
            <h4 className="font-bold">Entry Saved Successfully</h4>
            <p className="text-xs text-tertiary">Your lesson log has been updated.</p>
          </div>
        </div>
      )}

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid var(--outline-variant);
          background: var(--surface);
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          transition: all 150ms;
        }
        .input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in oklch, var(--primary) 20%, transparent); }
      `}</style>
    </AppShell>
  );
}

function SectionHeader({ icon, title, tone }: { icon: string; title: string; tone: "primary" | "secondary" | "tertiary" }) {
  const c = tone === "primary" ? "bg-primary-container/40 text-primary" : tone === "secondary" ? "bg-secondary/15 text-secondary" : "bg-accent text-accent-foreground";
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${c}`}><Icon name={icon} filled /></div>
      <h3 className="font-display text-xl font-bold">{title}</h3>
    </div>
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
