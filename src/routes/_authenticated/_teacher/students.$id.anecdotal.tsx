import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAnecdotalsForStudentFn, createAnecdotalFn } from "@/lib/teacher.functions";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/_teacher/students/$id/anecdotal")({
  head: () => ({ meta: [{ title: "Anecdotal Entries — AttendCloud" }] }),
  component: AnecdotalsPage,
});

type Category = "academic" | "behavioral" | "social" | "achievement";
const CATEGORIES: { value: Category; label: string; icon: string; activeTone: string; inactiveTone: string }[] = [
  { value: "academic", label: "Academic", icon: "school", activeTone: "bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/20", inactiveTone: "bg-white text-slate-500 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200" },
  { value: "behavioral", label: "Behavioral", icon: "psychology", activeTone: "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20", inactiveTone: "bg-white text-slate-500 border-slate-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200" },
  { value: "social", label: "Social", icon: "groups", activeTone: "bg-purple-500 text-white border-purple-500 shadow-md shadow-purple-500/20", inactiveTone: "bg-white text-slate-500 border-slate-200 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200" },
  { value: "achievement", label: "Achievement", icon: "emoji_events", activeTone: "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20", inactiveTone: "bg-white text-slate-500 border-slate-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200" },
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
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email, avatar_url")
        .eq("id", id)
        .single();
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
  const avatar = studentQ.data?.avatar_url;

  return (
    <AppShell>
      <div className="max-w-[1200px] mx-auto animate-fade-in pb-20">
        
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[13px] font-bold text-slate-400 hover:text-[#0e52db] transition mb-6"
        >
          <Icon name="arrow_back" size={16} /> Back to Dashboard
        </Link>

        {/* Header Section */}
        <div className="glass-panel rounded-3xl p-6 flex items-center gap-5 mb-8 relative overflow-hidden">
          {avatar ? (
            <img src={avatar} alt={name} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm relative z-10" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-extrabold shadow-sm relative z-10">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="relative z-10">
            <h1 className="text-2xl font-extrabold text-slate-800">{name}</h1>
            <p className="text-[13px] text-slate-500 mt-1 font-medium flex items-center gap-1.5">
              <Icon name="info" size={14} className="text-[#0e52db]" />
              Academic Director is automatically notified of new entries.
            </p>
          </div>
          {/* Decorative background element */}
          <div className="absolute right-0 top-0 w-64 h-64 bg-blue-100/30 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Create Form (Left) */}
          <div className="lg:col-span-7 glass-panel rounded-3xl p-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <h3 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center gap-2">
              <Icon name="edit_document" size={22} className="text-[#0e52db]" /> New Observation
            </h3>
            
            <div className="mb-6">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                Behavior Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {CATEGORIES.map((c) => {
                  const isActive = category === c.value;
                  return (
                    <button
                      key={c.value}
                      onClick={() => setCategory(c.value)}
                      className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3 transition-all duration-300 ${isActive ? c.activeTone : c.inactiveTone}`}
                    >
                      <Icon name={c.icon} size={24} />
                      <span className="text-[11px] font-bold">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Date Observed
              </label>
              <div className="relative">
                <Icon name="event" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={occurredOn}
                  onChange={(e) => setOccurredOn(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white/50 pl-10 pr-4 py-3 text-[14px] font-medium text-slate-700 outline-none focus:border-[#0e52db] focus:ring-4 focus:ring-[#0e52db]/10 transition-all"
                />
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Observation Notes
              </label>
              <textarea
                rows={5}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Describe what happened, the context, and any immediate actions taken..."
                className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-[14px] font-medium text-slate-700 outline-none focus:border-[#0e52db] focus:ring-4 focus:ring-[#0e52db]/10 transition-all resize-none"
              />
            </div>

            {error && (
              <div className="mb-6 flex items-center gap-2 text-sm font-bold text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                <Icon name="error" size={18} /> {error}
              </div>
            )}

            <button
              onClick={submit}
              disabled={!note.trim() || saving}
              className="w-full rounded-xl bg-gradient-to-r from-[#0e52db] to-[#3575da] py-4 text-[14px] font-bold text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all flex justify-center items-center gap-2"
            >
              {saving ? (
                <><Icon name="progress_activity" size={20} className="animate-spin" /> Saving Entry...</>
              ) : (
                <><Icon name="send" size={18} /> Log Entry & Notify Director</>
              )}
            </button>
          </div>

          {/* Timeline (Right) */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-8 border border-slate-200 shadow-[0_2px_12px_rgba(0,0,0,0.03)] animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center gap-2">
              <Icon name="history" size={22} className="text-slate-400" /> History Timeline
            </h3>

            {listQ.isLoading && (
              <div className="flex justify-center py-10">
                <Icon name="progress_activity" size={24} className="text-blue-500 animate-spin" />
              </div>
            )}

            {!listQ.isLoading && (listQ.data?.length ?? 0) === 0 && (
              <div className="text-center py-12 px-4 border-2 border-dashed border-slate-100 rounded-2xl">
                <Icon name="folder_open" size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-[13px] font-bold text-slate-500">No anecdotal entries yet.</p>
                <p className="text-[11px] text-slate-400 mt-1">When you log an entry, it will appear here.</p>
              </div>
            )}

            <div className="relative border-l-2 border-slate-100 ml-3 pl-6 space-y-8 mt-4">
              {listQ.data?.map((e) => {
                const catInfo = CATEGORIES.find((c) => c.value === e.category) ?? CATEGORIES[0];
                const teacher = (
                  e as unknown as {
                    profiles: { full_name: string | null; email: string | null } | null;
                  }
                ).profiles;
                const teacherName = teacher?.full_name || teacher?.email || "Teacher";
                
                // Extracting colors from activeTone for the timeline dot and pill
                let dotColor = "bg-blue-500";
                let pillColor = "bg-blue-50 text-blue-600";
                if (e.category === 'behavioral') { dotColor = "bg-orange-500"; pillColor = "bg-orange-50 text-orange-600"; }
                if (e.category === 'social') { dotColor = "bg-purple-500"; pillColor = "bg-purple-50 text-purple-600"; }
                if (e.category === 'achievement') { dotColor = "bg-emerald-500"; pillColor = "bg-emerald-50 text-emerald-600"; }

                return (
                  <div key={e.id} className="relative">
                    {/* Timeline Dot */}
                    <div className={`absolute -left-[31px] top-1 w-3 h-3 rounded-full ${dotColor} ring-4 ring-white shadow-sm`}></div>
                    
                    <div className="mb-2 flex items-start justify-between gap-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest ${pillColor}`}>
                        <Icon name={catInfo.icon} size={14} /> {catInfo.label}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap pt-1">
                        {format(new Date(e.occurred_on), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 hover:shadow-md transition-shadow duration-300">
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700 font-medium">{e.note}</p>
                      <div className="mt-3 flex items-center gap-2 text-[11px] font-bold text-slate-400">
                        <Icon name="person" size={14} />
                        Logged by {teacherName}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
