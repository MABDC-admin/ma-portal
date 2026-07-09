import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Card } from "@/components/AppShell";
import { Icon } from "@/components/Icon";

export const Route = createFileRoute("/_authenticated/_director/dll/$id")({
  head: () => ({
    meta: [
      { title: "Review DLL — AttendCloud" },
      { name: "description", content: "Review a Daily Lesson Log submission: lesson identity, curriculum delivery, and reflection plan." },
      { property: "og:title", content: "Review DLL — AttendCloud" },
      { property: "og:description", content: "Approve or return a Daily Lesson Log with director feedback." },
    ],
  }),
  component: DllReviewDetail,
});

function DllReviewDetail() {
  return (
    <AppShell>
      <header className="mb-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Link to="/dll" className="mb-3 flex items-center gap-1 text-sm text-tertiary hover:text-foreground">
              <Icon name="arrow_back" size={16} /> Back to Dashboard
            </Link>
            <h1 className="font-display text-3xl font-extrabold text-foreground">Review: Advanced Machine Learning Models</h1>
            <p className="mt-1 text-sm text-tertiary">Daily Lesson Log (DLL) Review Portal</p>
          </div>
          <Card className="flex max-w-xs items-center gap-4 p-4">
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-container text-sm font-bold text-primary">SR</div>
              <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface bg-status-present" />
            </div>
            <div>
              <p className="text-sm font-bold">Dr. Samuel Rivera</p>
              <p className="text-xs text-tertiary">Computer Science Dept.</p>
            </div>
          </Card>
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8">
          <Section accent="primary" icon="info" title="Lesson Identity">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <KV k="Grade Level & Section" v="Grade 12 - Einstein (STEM)" />
              <KV k="Learning Area" v="Advanced ICT" />
              <KV k="Teaching Date" v="October 24, 2023" />
              <KV k="Time & Quarter" v="09:00 AM - 10:30 AM | Quarter 2" />
            </div>
          </Section>

          <Section accent="secondary" icon="menu_book" title="Curriculum Delivery">
            <div className="space-y-6">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-tertiary">Learning Objectives</p>
                <div className="space-y-2 rounded-lg bg-surface-container-low p-4 text-sm">
                  <p>• Define the core architecture of Neural Networks and backpropagation algorithms.</p>
                  <p>• Implement a simple linear regression model using Python and Scikit-learn.</p>
                  <p>• Evaluate model performance using MSE and R-squared metrics.</p>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-tertiary">Learning Activities</p>
                <div className="space-y-4 rounded-lg bg-surface-container-low p-4 text-sm">
                  <div>
                    <h4 className="mb-1 font-bold">Direct Instruction (20 mins)</h4>
                    <p className="text-tertiary">Interactive presentation on gradient descent mechanics and hyperparameter tuning.</p>
                  </div>
                  <div>
                    <h4 className="mb-1 font-bold">Hands-on Lab (50 mins)</h4>
                    <p className="text-tertiary">Students work in pairs to train models on the provided "California Housing" dataset.</p>
                  </div>
                  <div>
                    <h4 className="mb-1 font-bold">Collaborative Discussion (20 mins)</h4>
                    <p className="text-tertiary">Group presentation of results and discussion of overfitting vs. underfitting.</p>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          <Section accent="late" icon="psychology" title="Reflection Plan">
            <p className="text-sm italic text-tertiary">
              "The focus for this lesson is to ensure students understand the 'Why' behind the model outputs, not just the code execution. I will monitor the lab session to identify students struggling with the mathematical intuition of loss functions."
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-full bg-surface-container-high px-4 py-2 text-xs font-bold">
                <Icon name="monitoring" size={14} /> Formative Assessment
              </div>
              <div className="flex items-center gap-2 rounded-full bg-surface-container-high px-4 py-2 text-xs font-bold">
                <Icon name="psychology_alt" size={14} /> Metacognition Focus
              </div>
            </div>
          </Section>
        </div>

        <div className="space-y-6 lg:sticky lg:top-24 lg:col-span-4">
          <Card className="border border-primary/10 p-6 shadow-lg">
            <h3 className="mb-4 font-display text-lg font-bold">Review Actions</h3>
            <div className="space-y-3">
              <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-primary-foreground shadow-sm hover:brightness-110">
                <Icon name="check_circle" filled /> Approve Lesson Log
              </button>
              <button className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-outline-variant bg-surface py-4 font-bold text-foreground hover:bg-surface-container">
                <Icon name="assignment_return" /> Return for Revision
              </button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 font-display text-lg font-bold">Director's Feedback</h3>
            <div className="relative">
              <textarea rows={5} placeholder="Add comments visible to the teacher…" className="w-full rounded-lg border border-outline-variant bg-surface p-3 pr-12 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              <button className="absolute bottom-3 right-3 rounded-lg bg-primary-container p-2 text-primary hover:brightness-95" aria-label="Send">
                <Icon name="send" size={18} />
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2 px-1 text-xs text-tertiary">
              <Icon name="info" size={14} />
              <span>Comments are visible to the teacher and recorded in logs.</span>
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">History Logs</h3>
              <span className="text-xs text-tertiary">3 Updates</span>
            </div>
            <div className="relative space-y-6 pl-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-outline-variant">
              {[
                { t: "Submitted for review", who: "Dr. Samuel Rivera", when: "Oct 24, 07:45 AM", dot: "bg-primary" },
                { t: "Auto-checked against MELCs", who: "System", when: "Oct 24, 07:46 AM", dot: "bg-status-present" },
                { t: "Assigned to reviewer", who: "Dr. Julian Rivers", when: "Oct 24, 08:12 AM", dot: "bg-status-late" },
              ].map((h, i) => (
                <div key={i} className="relative">
                  <span className={`absolute -left-6 top-1.5 h-4 w-4 rounded-full border-2 border-surface ${h.dot}`} />
                  <p className="text-sm font-semibold">{h.t}</p>
                  <p className="text-xs text-tertiary">{h.who} · <span className="num">{h.when}</span></p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Section({ accent, icon, title, children }: { accent: "primary" | "secondary" | "late"; icon: string; title: string; children: React.ReactNode }) {
  const bar = accent === "primary" ? "bg-primary/40" : accent === "secondary" ? "bg-secondary/40" : "bg-status-late/40";
  const iconC = accent === "primary" ? "text-primary" : accent === "secondary" ? "text-secondary" : "text-status-late";
  return (
    <Card className="relative overflow-hidden p-8">
      <div className={`absolute left-0 top-0 h-full w-1.5 ${bar}`} />
      <div className="mb-6 flex items-center gap-3">
        <Icon name={icon} className={iconC} filled />
        <h2 className="font-display text-xl font-bold">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-widest text-tertiary">{k}</p>
      <p className="text-sm font-medium text-foreground">{v}</p>
    </div>
  );
}
