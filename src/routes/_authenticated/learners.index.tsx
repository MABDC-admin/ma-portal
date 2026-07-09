import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, Card } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/learners/")({
  head: () => ({
    meta: [
      { title: "Learners List — AttendCloud" },
      { name: "description", content: "Directory of enrolled learners." },
    ],
  }),
  component: LearnersPage,
});

type LearnerRow = {
  user_id: string;
  student_number: string;
  status: string;
  profiles: { full_name: string | null; email: string | null } | null;
  sections: { name: string; grade_level: number; academic_year: string } | null;
};

function gradeLabel(g: number) {
  if (g === -1) return "Kindergarten 1";
  if (g === 0) return "Kindergarten 2";
  return `Grade ${g}`;
}

function LearnersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");

  const { data: learners, isLoading, error } = useQuery({
    queryKey: ["learners_directory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select(
          "user_id, student_number, status, profiles!students_user_id_profiles_fkey(full_name, email), sections(name, grade_level, academic_year)",
        )
        .order("student_number", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as LearnerRow[];
    },
  });

  const filtered = learners?.filter((l) => {
    const name = l.profiles?.full_name?.toLowerCase() ?? "";
    const num = l.student_number?.toLowerCase() ?? "";
    const q = searchTerm.toLowerCase();
    const matches = !q || name.includes(q) || num.includes(q);
    const matchesSection = sectionFilter ? l.sections?.name === sectionFilter : true;
    return matches && matchesSection;
  });

  const sectionMap = new Map<string, { name: string; grade_level: number }>();
  learners?.forEach((l) => {
    if (l.sections && !sectionMap.has(l.sections.name)) {
      sectionMap.set(l.sections.name, l.sections);
    }
  });

  const allUniqueSections = Array.from(sectionMap.values());

  const uniqueSections = allUniqueSections.sort((a, b) => {
      if (a.grade_level !== b.grade_level) {
        return a.grade_level - b.grade_level;
      }
      return a.name.localeCompare(b.name);
    });

  return (
    <AppShell
      title="Learners List"
      subtitle={`Directory of all enrolled learners${
        learners ? ` — ${learners.length} total` : ""
      }.`}
    >
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary"
            size={18}
          />
          <input
            type="text"
            placeholder="Search by name or LRN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-outline-variant bg-surface/50 pl-10 pr-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
          className="rounded-xl border border-outline-variant bg-surface/50 px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 min-w-[180px]"
        >
          <option value="">All Sections</option>
          {uniqueSections.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <Card className="overflow-hidden shadow-sm border border-outline-variant/50">
        <div className="overflow-x-auto max-h-[70vh]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-tertiary">
              <Icon
                name="progress_activity"
                size={32}
                className="animate-spin text-primary mb-4"
              />
              <p>Loading learners...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-status-absent">
              Failed to load learners: {error instanceof Error ? error.message : String(error)}
            </div>
          ) : filtered?.length === 0 ? (
            <div className="p-12 text-center text-tertiary">
              <Icon name="group_off" size={48} className="mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-foreground">No learners found</h3>
              <p className="mt-1 text-sm">
                {!learners?.length
                  ? "Import learners in the Admin portal first."
                  : "Try adjusting your search or filters."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-container-low/80 backdrop-blur-md sticky top-0 z-10 border-b border-outline-variant">
                <tr>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-tertiary">
                    LRN
                  </th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-tertiary">
                    Name
                  </th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-tertiary">
                    Email
                  </th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-tertiary">
                    Grade
                  </th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-tertiary">
                    Section
                  </th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-tertiary">
                    Status
                  </th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-tertiary text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {filtered?.map((l) => (
                  <tr
                    key={l.user_id}
                    className="hover:bg-surface-container-low/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-tertiary">
                      {l.student_number}
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground">
                      {l.profiles?.full_name ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-xs text-tertiary">
                      {l.profiles?.email ?? "—"}
                    </td>
                    <td className="px-6 py-4">
                      {l.sections ? (
                        <span className="inline-flex items-center rounded-md bg-primary-container/30 px-2 py-1 text-xs font-semibold text-primary">
                          {gradeLabel(l.sections.grade_level)}
                        </span>
                      ) : (
                        <span className="text-xs text-tertiary">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs">{l.sections?.name ?? "—"}</td>
                    <td className="px-6 py-4 text-xs capitalize">{l.status}</td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to="/learners/$id"
                        params={{ id: l.user_id }}
                        className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary/20 transition whitespace-nowrap"
                      >
                        <Icon name="visibility" size={14} />
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </AppShell>
  );
}
