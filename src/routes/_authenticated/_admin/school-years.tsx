import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_admin/school-years")({
  head: () => ({ meta: [{ title: "School Years — AttendCloud" }] }),
  component: SchoolYearsPage,
});

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function SchoolYearsPage() {
  const qc = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newYear, setNewYear] = useState("");
  const [saving, setSaving] = useState(false);

  const listQ = useQuery({
    queryKey: ["school-years"],
    queryFn: async () => {
      const { listSchoolYearsFn } = await import("@/lib/school-years.functions");
      const data = await listSchoolYearsFn();
      return data ?? [];
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { activateSchoolYearFn } = await import("@/lib/school-years.functions");
      await activateSchoolYearFn({ data: { id } });
    },
    onSuccess: () => {
      toast.success("School year activated successfully!");
      qc.invalidateQueries({ queryKey: ["school-years"] });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to activate school year");
    },
  });

  async function handleAdd() {
    if (!newYear.trim()) return;
    setSaving(true);
    try {
      const isFirst = (listQ.data?.length || 0) === 0;

      const { addSchoolYearFn } = await import("@/lib/school-years.functions");
      await addSchoolYearFn({ data: { year: newYear.trim(), is_active: isFirst } });

      toast.success("School year added!");
      setNewYear("");
      setIsAdding(false);
      qc.invalidateQueries({ queryKey: ["school-years"] });
    } catch (err: unknown) {
      toast.error(errorMessage(err) || "Failed to add school year");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="School Years"
      subtitle="Manage and activate academic years for the system."
      actions={
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-secondary to-blue-500 px-4 py-2 text-[13px] font-bold text-white shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:brightness-110 transition"
        >
          <Icon name="add" size={18} /> New School Year
        </button>
      }
    >
      <div className="max-w-[900px] animate-fade-in">
        {isAdding && (
          <div className="mb-6 glass-panel rounded-2xl p-6 border-l-4 border-l-[#0e52db] animate-slide-up">
            <h3 className="text-sm font-bold text-slate-100 mb-3">Add Academic Year</h3>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="e.g. 2025-2026"
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
                className="flex-1 rounded-xl border border-secondary/20 bg-surface-container px-4 py-2.5 text-[14px] font-medium text-foreground outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/10 transition-all"
              />
              <button
                onClick={() => setIsAdding(false)}
                className="rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-400 hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!newYear.trim() || saving}
                className="rounded-xl bg-gradient-to-r from-secondary to-blue-500 px-6 py-2.5 text-[13px] font-bold text-white shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:brightness-110 disabled:opacity-50 transition"
              >
                {saving ? "Saving..." : "Save Year"}
              </button>
            </div>
          </div>
        )}

        <div
          className="glass-panel rounded-2xl overflow-hidden shadow-sm animate-slide-up"
          style={{ animationDelay: "0.1s" }}
        >
          {listQ.isLoading ? (
            <div className="p-8 text-center text-slate-400 font-medium flex flex-col items-center gap-2">
              <Icon name="progress_activity" size={24} className="animate-spin text-secondary" />
              Loading records...
            </div>
          ) : (listQ.data?.length ?? 0) === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <Icon name="calendar_today" size={40} className="text-slate-300 mb-3" />
              <h3 className="text-slate-200 font-bold">No school years defined</h3>
              <p className="text-slate-400 text-sm mt-1">
                Click the button above to add your first academic year.
              </p>
            </div>
          ) : (
            <div className="w-full">
              <table className="w-full text-left">
                <thead className="bg-surface-container/80 border-b border-secondary/20">
                  <tr>
                    <th className="px-6 py-4 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                      Academic Year
                    </th>
                    <th className="px-6 py-4 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                      Status
                    </th>
                    <th className="px-6 py-4 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                      Created On
                    </th>
                    <th className="px-6 py-4 text-[11px] font-extrabold uppercase tracking-widest text-slate-400 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {listQ.data?.map((sy) => (
                    <tr key={sy.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="text-[14px] font-extrabold text-slate-200">{sy.year}</span>
                      </td>
                      <td className="px-6 py-4">
                        {sy.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
                            <Icon name="check_circle" size={14} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[13px] font-medium text-slate-400">
                        {format(new Date(sy.created_at), "MMM dd, yyyy")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!sy.is_active && (
                          <button
                            onClick={() => activateMutation.mutate(sy.id)}
                            disabled={activateMutation.isPending}
                            className="inline-flex items-center gap-1 text-[12px] font-bold text-secondary hover:text-blue-300 transition opacity-0 group-hover:opacity-100"
                          >
                            <Icon name="bolt" size={16} /> Set as Active
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
