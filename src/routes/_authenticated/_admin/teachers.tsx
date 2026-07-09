import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card, StatusPill } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/_admin/teachers")({
  head: () => ({
    meta: [
      { title: "Teacher Management — AttendCloud" },
      { name: "description", content: "Manage staff accounts and teaching assignments across departments." },
    ],
  }),
  component: TeachersPage,
});

type TeacherRow = {
  user_id: string;
  employee_id: string;
  department: string;
  subjects: string[];
  status: "active" | "inactive";
  profiles: { email: string | null; full_name: string | null } | null;
};

function initials(name: string) {
  return name.split(/[\s@._-]+/).map((n) => n[0]?.toUpperCase()).filter(Boolean).slice(0, 2).join("");
}

function TeachersPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const teachersQ = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("user_id, employee_id, department, subjects, status, profiles!teachers_user_id_profiles_fkey(email, full_name)")
        .order("employee_id");
      if (error) throw error;
      return (data ?? []) as unknown as TeacherRow[];
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ user_id, status }: { user_id: string; status: "active" | "inactive" }) => {
      const { error } = await supabase.from("teachers").update({ status }).eq("user_id", user_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teachers"] }),
  });

  return (
    <AppShell
      title="Teacher Management"
      subtitle="Manage staff accounts and teaching assignments."
      actions={
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-110"
        >
          <Icon name="person_add" size={18} />
          <span>Add Teacher</span>
        </button>
      }
    >
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-outline-variant bg-surface-container-low/50">
              <tr className="text-left">
                {["Teacher", "Employee ID", "Department", "Subjects", "Status", ""].map((h, i) => (
                  <th key={i} className={`px-6 py-3 text-xs font-bold uppercase tracking-widest text-tertiary ${i === 5 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teachersQ.isLoading && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-tertiary">Loading…</td></tr>
              )}
              {teachersQ.data?.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-tertiary">No teachers yet. Click "Add Teacher".</td></tr>
              )}
              {teachersQ.data?.map((t) => {
                const name = t.profiles?.full_name || t.profiles?.email || t.employee_id;
                return (
                  <tr key={t.user_id} className="border-b border-outline-variant/40 last:border-0 hover:bg-surface-container-low/40">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-primary">{initials(name)}</div>
                        <div>
                          <p className="font-semibold text-foreground">{name}</p>
                          <p className="text-xs text-tertiary">{t.profiles?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 num">{t.employee_id}</td>
                    <td className="px-6 py-4">{t.department}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {t.subjects.length === 0 && <span className="text-xs text-tertiary">—</span>}
                        {t.subjects.map((s) => (
                          <span key={s} className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-medium text-tertiary">{s}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {t.status === "active"
                        ? <StatusPill tone="present" icon="check_circle">Active</StatusPill>
                        : <StatusPill tone="neutral" icon="pause_circle">Inactive</StatusPill>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleStatus.mutate({ user_id: t.user_id, status: t.status === "active" ? "inactive" : "active" })}
                        className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-semibold hover:bg-surface-container"
                      >
                        {t.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {showAdd && <AddTeacherDialog onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); qc.invalidateQueries({ queryKey: ["teachers"] }); }} />}
    </AppShell>
  );
}

function AddTeacherDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [userId, setUserId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [department, setDepartment] = useState("");
  const [subjects, setSubjects] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const eligibleQ = useQuery({
    queryKey: ["profiles-eligible-teacher"],
    queryFn: async () => {
      const { data: existing } = await supabase.from("teachers").select("user_id");
      const takenIds = new Set((existing ?? []).map((r: { user_id: string }) => r.user_id));
      const { data, error } = await supabase.from("profiles").select("id, email, full_name, role").order("email");
      if (error) throw error;
      return (data ?? []).filter((p) => !takenIds.has(p.id));
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const subjectsArr = subjects.split(",").map((s) => s.trim()).filter(Boolean);
    const { error: insErr } = await supabase.from("teachers").insert({
      user_id: userId,
      employee_id: employeeId,
      department,
      subjects: subjectsArr,
      status: "active",
    });
    if (insErr) { setError(insErr.message); setSaving(false); return; }
    // Also promote profile role + user_roles to teacher
    await supabase.from("profiles").update({ role: "teacher" }).eq("id", userId);
    await supabase.from("user_roles").upsert({ user_id: userId, role: "teacher" }, { onConflict: "user_id,role" });
    setSaving(false);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface p-6 shadow-2xl">
        <h3 className="mb-1 font-display text-xl font-bold">Add Teacher</h3>
        <p className="mb-5 text-xs text-tertiary">Attach a teacher record to an existing account.</p>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-widest text-tertiary">Account</label>
            <select required value={userId} onChange={(e) => setUserId(e.target.value)} className="input">
              <option value="">Select user…</option>
              {eligibleQ.data?.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name || p.email} ({p.email})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-widest text-tertiary">Employee ID</label>
            <input required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="EMP-1002" className="input" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-widest text-tertiary">Department</label>
            <input required value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Mathematics" className="input" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-widest text-tertiary">Subjects (comma-separated)</label>
            <input value={subjects} onChange={(e) => setSubjects(e.target.value)} placeholder="Algebra, Geometry" className="input" />
          </div>
          {error && <p className="rounded-lg bg-status-absent/10 p-2 text-xs text-status-absent">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold hover:bg-surface-container">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-110 disabled:opacity-60">
            {saving ? "Saving…" : "Add teacher"}
          </button>
        </div>
        <style>{`.input{width:100%;border-radius:.5rem;border:1px solid var(--outline-variant);background:var(--surface);padding:.55rem .75rem;font-size:.875rem;outline:none}.input:focus{border-color:var(--primary);box-shadow:0 0 0 3px color-mix(in oklch,var(--primary) 20%,transparent)}`}</style>
      </form>
    </div>
  );
}
