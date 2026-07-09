import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, Card } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/learners")({
  head: () => ({
    meta: [
      { title: "Learners List — AttendCloud" },
      { name: "description", content: "Directory of enrolled learners." },
    ],
  }),
  component: LearnersPage,
});

function LearnersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");

  type LearnerRecord = {
    id: string;
    school_year_id: string;
    grade_level: string;
    student_name: string;
    birthdate: string;
    age: number;
    gender: string;
    mother_contact: string;
    mother_name: string;
    father_contact: string;
    father_name: string;
    philippine_address: string;
    uae_address: string;
  };

  const { data: learners, isLoading, error } = useQuery({
    queryKey: ["learner_records"],
    queryFn: async () => {
      // First get active school year
      const { data: sy } = await supabase
        .from("school_years")
        .select("id")
        .eq("is_active", true)
        .single();

      if (!sy) return [];

      const { data, error } = await supabase
        .from("learner_records" as any)
        .select("*")
        .eq("school_year_id", sy.id)
        .order("grade_level", { ascending: true })
        .order("student_name", { ascending: true });

      if (error) throw error;
      return (data as any[]) as LearnerRecord[];
    },
  });

  const filteredLearners = learners?.filter((l) => {
    const matchesSearch = l.student_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = gradeFilter ? l.grade_level === gradeFilter : true;
    return matchesSearch && matchesGrade;
  });

  const uniqueGrades = Array.from(new Set(learners?.map(l => l.grade_level).filter(Boolean))).sort();

  return (
    <AppShell
      title="Learners List"
      subtitle="View all enrolled learner records for the active academic year."
    >
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" size={18} />
          <input
            type="text"
            placeholder="Search by student name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-outline-variant bg-surface/50 pl-10 pr-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="rounded-xl border border-outline-variant bg-surface/50 px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none min-w-[150px]"
        >
          <option value="">All Grade Levels</option>
          {uniqueGrades.map((grade) => (
            <option key={String(grade)} value={String(grade)}>{grade}</option>
          ))}
        </select>
      </div>

      <Card className="overflow-hidden shadow-sm border border-outline-variant/50">
        <div className="overflow-x-auto max-h-[70vh]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-tertiary">
              <Icon name="progress_activity" size={32} className="animate-spin text-primary mb-4" />
              <p>Loading records...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-status-absent">
              Failed to load records. Ensure the database is updated.
            </div>
          ) : filteredLearners?.length === 0 ? (
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
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-tertiary">Name</th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-tertiary">Grade</th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-tertiary">Age / Gender</th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-tertiary">Parents</th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-tertiary">Contact</th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-tertiary">UAE Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {filteredLearners?.map((learner) => (
                  <tr key={learner.id} className="hover:bg-surface-container-low/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">{learner.student_name}</div>
                      <div className="text-xs text-tertiary mt-0.5">{learner.birthdate}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-md bg-primary-container/30 px-2 py-1 text-xs font-semibold text-primary">
                        {learner.grade_level}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-foreground">{learner.age} yrs</div>
                      <div className="text-xs text-tertiary mt-0.5">{learner.gender}</div>
                    </td>
                    <td className="px-6 py-4 max-w-[200px] truncate">
                      <div className="text-xs"><span className="text-tertiary">M:</span> {learner.mother_name || "N/A"}</div>
                      <div className="text-xs mt-0.5"><span className="text-tertiary">F:</span> {learner.father_name || "N/A"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs">{learner.mother_contact || "N/A"}</div>
                      <div className="text-xs mt-0.5">{learner.father_contact || "N/A"}</div>
                    </td>
                    <td className="px-6 py-4 max-w-[250px] truncate text-xs text-tertiary" title={learner.uae_address || ""}>
                      {learner.uae_address || "N/A"}
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
