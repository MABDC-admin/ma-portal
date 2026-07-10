import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { createDllFn } from "@/lib/dlls.functions";

export const Route = createFileRoute("/_authenticated/_teacher/dll/new")({
  head: () => ({ meta: [{ title: "New DLL Entry — AttendCloud" }] }),
  component: NewDllEntry,
});

function NewDllEntry() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const teacherName = profile?.full_name || user?.email || "Sarah Jenkins";

  const [sectionId, setSectionId] = useState("");
  const [subject, setSubject] = useState("General Mathematics");
  const [lessonDate, setLessonDate] = useState("2023-10-27");
  const [quarterWeek, setQuarterWeek] = useState("Q2 / W4");
  const [topic, setTopic] = useState("Introduction to Quadratic Functions");

  const [objectives, setObjectives] = useState("");
  const [activities, setActivities] = useState("");
  const [reflection, setReflection] = useState("");

  const [status, setStatus] = useState("Completed");
  const [assessments, setAssessments] = useState({
    quiz: false,
    activity: false,
    performance: false,
    oral: false,
  });
  const [remediation, setRemediation] = useState("");

  const [saving, setSaving] = useState(false);

  const sectionsQ = useQuery({
    queryKey: ["sections-all"],
    queryFn: async () => {
      const { getAllSectionsFn } = await import("@/lib/teacher.functions");
      return await getAllSectionsFn();
    },
  });

  const createDll = useServerFn(createDllFn);

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      await createDll({
        data: {
          section_id: sectionId || null,
          subject,
          lesson_date: lessonDate,
          objectives,
          content: topic + (quarterWeek ? " (" + quarterWeek + ")" : ""),
          procedures: activities,
          assessment:
            Object.entries(assessments)
              .filter(([_, v]) => v)
              .map(([k]) => k)
              .join(",") + (remediation ? "\nRemediation: " + remediation : ""),
          submit: true,
        },
      });
      navigate({ to: "/" });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between pb-6 border-b border-secondary/20 mb-6 mt-2 animate-fade-in">
        <div>
          <h2 className="text-3xl font-bold text-slate-100 tracking-tight">New DLL Entry</h2>
          <p className="text-[13px] text-slate-400 mt-1">
            Record and reflect on your classroom implementation for today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="px-6 py-2 text-[13px] font-semibold text-slate-200 bg-surface border border-secondary/20 rounded hover:bg-white/5 transition-colors shadow-sm"
          >
            Discard
          </Link>
          <button
            onClick={save}
            disabled={saving}
            className="px-6 py-2 text-[13px] font-semibold text-white bg-gradient-primary rounded hover:opacity-90 transition-all shadow-md disabled:opacity-60"
          >
            {saving ? "Submitting..." : "Submit Log"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 pb-20 animate-fade-in">
        {/* Left Column */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Lesson Identity */}
          <div
            className="glass-panel rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] animate-slide-up"
            style={{ animationDelay: "0.05s" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary/20 text-primary">
                <Icon name="description" size={18} />
              </div>
              <h3 className="text-[17px] font-semibold text-slate-100">Lesson Identity</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <Field label="DATE OF LESSON">
                <input
                  type="date"
                  value={lessonDate}
                  onChange={(e) => setLessonDate(e.target.value)}
                  className="input-field w-full"
                />
              </Field>
              <Field label="TEACHER NAME">
                <input
                  readOnly
                  value={teacherName}
                  className="input-field bg-surface-container text-slate-400 w-full"
                />
              </Field>

              <Field label="LEARNING AREA / SUBJECT">
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="General Mathematics">General Mathematics</option>
                  <option value="Science">Science</option>
                  <option value="English">English</option>
                </select>
              </Field>
              <Field label="GRADE & SECTION">
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="">11 - Galileo</option>
                  {sectionsQ.data?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="QUARTER/WEEK">
                <input
                  value={quarterWeek}
                  onChange={(e) => setQuarterWeek(e.target.value)}
                  className="input-field w-full"
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="TOPIC / LESSON TITLE">
                  <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Introduction to Quadratic Functions"
                    className="input-field w-full"
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* Curriculum Delivery */}
          <div
            className="glass-panel rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] animate-slide-up"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary/20 text-primary">
                <Icon name="fact_check" size={18} />
              </div>
              <h3 className="text-[17px] font-semibold text-slate-100">Curriculum Delivery</h3>
            </div>
            <div className="space-y-6">
              <Field label="LEARNING COMPETENCY / OBJECTIVES">
                <textarea
                  rows={3}
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  placeholder="Identify the domain and range of a quadratic function..."
                  className="input-field w-full resize-none"
                />
              </Field>
              <Field label="TEACHING ACTIVITIES">
                <textarea
                  rows={4}
                  value={activities}
                  onChange={(e) => setActivities(e.target.value)}
                  className="input-field w-full resize-none"
                />
              </Field>
            </div>
          </div>

          {/* Reflection */}
          <div
            className="glass-panel rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] animate-slide-up"
            style={{ animationDelay: "0.15s" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary/20 text-primary">
                <Icon name="psychology" size={20} />
              </div>
              <h3 className="text-[17px] font-semibold text-slate-100">Reflection & Action Plan</h3>
            </div>
            <Field label="NOTES ON PROGRESS / NEXT STEPS">
              <textarea
                rows={4}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="Reflection on student engagement, what worked, and necessary adjustments for tomorrow..."
                className="input-field w-full resize-none"
              />
            </Field>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div
            className="glass-panel rounded-xl p-5 animate-slide-up"
            style={{ animationDelay: "0.05s" }}
          >
            <Field label="IMPLEMENTATION STATUS">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="input-field bg-surface-container/70 backdrop-blur w-full"
              >
                <option value="Completed">Completed</option>
                <option value="In Progress">In Progress</option>
                <option value="Not Started">Not Started</option>
              </select>
            </Field>
          </div>

          <div
            className="glass-panel rounded-xl p-5 animate-slide-up"
            style={{ animationDelay: "0.1s" }}
          >
            <Field label="ASSESSMENT USED">
              <div className="grid grid-cols-2 gap-3 mt-2">
                <AssessmentCheck
                  label="Quiz"
                  checked={assessments.quiz}
                  onChange={(v) => setAssessments({ ...assessments, quiz: v })}
                />
                <AssessmentCheck
                  label="Activity"
                  checked={assessments.activity}
                  onChange={(v) => setAssessments({ ...assessments, activity: v })}
                />
                <AssessmentCheck
                  label="Performance"
                  checked={assessments.performance}
                  onChange={(v) => setAssessments({ ...assessments, performance: v })}
                />
                <AssessmentCheck
                  label="Oral Exam"
                  checked={assessments.oral}
                  onChange={(v) => setAssessments({ ...assessments, oral: v })}
                />
              </div>
            </Field>
          </div>

          <div
            className="glass-panel rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] animate-slide-up"
            style={{ animationDelay: "0.15s" }}
          >
            <div className="flex justify-between items-end mb-4">
              <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
                LEARNER PERFORMANCE
              </label>
            </div>
            <div className="mb-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[13px] text-slate-200">Mastery Level</span>
                <span className="text-[13px] font-bold text-emerald-500">84%</span>
              </div>
              <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-primary h-1.5 rounded-full"
                  style={{ width: "84%" }}
                ></div>
              </div>
            </div>
            <textarea
              rows={3}
              value={remediation}
              onChange={(e) => setRemediation(e.target.value)}
              placeholder="Specific learners needing remediation..."
              className="input-field w-full text-[13px] resize-none"
            />
          </div>

          <div
            className="glass-panel rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] animate-slide-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="flex justify-between items-center mb-4">
              <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
                ATTACHMENTS
              </label>
              <button className="text-[12px] font-semibold text-primary hover:text-secondary transition-colors">
                + Add Link
              </button>
            </div>
            <div className="border border-dashed border-secondary/30 rounded-lg p-6 flex flex-col items-center justify-center bg-surface-container/50 mb-4 hover:bg-white/5 transition cursor-pointer">
              <Icon name="cloud_upload" size={24} className="text-slate-400 mb-2" />
              <p className="text-[13px] font-semibold text-slate-200">
                Upload presentation or handout
              </p>
              <p className="text-[10px] text-slate-400 mt-1">PDF, PPTX, or DOCX up to 10MB</p>
            </div>
            <div className="flex items-center justify-between glass-panel border border-primary/20 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center bg-surface-container/80 backdrop-blur rounded p-1 text-primary shadow-sm border border-secondary/20">
                  <Icon name="description" size={16} />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-slate-100">
                    Quadratic_Functions_v2.pptx
                  </p>
                  <p className="text-[10px] text-slate-400">2.4 MB</p>
                </div>
              </div>
              <button className="text-slate-400 hover:text-slate-200">
                <Icon name="close" size={16} />
              </button>
            </div>
          </div>

          <div
            className="bg-surface-container/50 backdrop-blur border border-secondary/20 rounded-lg p-4 flex gap-3 text-slate-300 animate-slide-up"
            style={{ animationDelay: "0.25s" }}
          >
            <Icon name="info" size={18} className="text-primary flex-shrink-0" />
            <p className="text-[11px] leading-relaxed">
              This log will be synced to the Department Head's dashboard for weekly monitoring.
              Ensure all competencies are mapped to the MELCs.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .input-field {
          border-radius: 0.375rem;
          border: 1px solid rgba(0, 240, 255, 0.2);
          background: rgba(34, 37, 63, 0.8);
          backdrop-filter: blur(8px);
          padding: 0.5rem 0.75rem;
          font-size: 0.8125rem;
          color: #e8eaf6;
          outline: none;
          transition: all 150ms;
        }
        .input-field:focus {
          border-color: var(--color-secondary, #00f0ff);
          background: rgba(26, 29, 54, 1);
          box-shadow: 0 0 0 1px var(--color-secondary, #00f0ff);
        }
        .input-field::placeholder {
          color: #94a3b8;
        }
      `}</style>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col space-y-1.5">
      <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}

function AssessmentCheck({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 bg-surface-container/70 backdrop-blur border border-secondary/20 rounded-md px-3 py-2 cursor-pointer hover:border-secondary/40 transition-all hover:-translate-y-0.5 shadow-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 rounded-sm border-secondary/30 text-primary focus:ring-primary"
      />
      <span className="text-[12px] text-slate-200">{label}</span>
    </label>
  );
}
