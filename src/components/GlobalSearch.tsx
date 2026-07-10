import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Icon } from "./Icon";

import { useQuery } from "@tanstack/react-query";

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: results, isLoading } = useQuery({
    queryKey: ["global-search", query],
    queryFn: async () => {
      if (!query || query.length < 2) return { learners: [], teachers: [] };
      
      const { searchUsersFn } = await import("@/lib/auth.functions");
      const data = await searchUsersFn({ data: { query } });
      return data;
    },
    enabled: query.length >= 2
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectLearner = (id: string) => {
    setIsOpen(false);
    setQuery("");
    navigate({ to: "/learners/$id", params: { id } });
  };

  const handleSelectTeacher = () => {
    // We don't have a specific teacher details page yet, so we just go to teachers list
    setIsOpen(false);
    setQuery("");
    navigate({ to: "/teachers" });
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <Icon
        name="search"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tertiary"
        size={18}
      />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Search students, teachers…"
        className="h-10 w-full rounded-lg border border-secondary/30 bg-surface-container/80 backdrop-blur-md pl-10 pr-3 text-sm text-foreground outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/20 focus:shadow-[0_0_15px_rgba(0,240,255,0.15)] placeholder:text-slate-500"
      />

      {isOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface/95 backdrop-blur-xl rounded-xl shadow-[0_8px_30px_rgba(0,240,255,0.15)] border border-secondary/30 overflow-hidden z-50 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-slate-400">Searching...</div>
          ) : (
            <div className="py-2">
              {results?.learners.length === 0 && results?.teachers.length === 0 && (
                <div className="p-4 text-center text-sm text-slate-500">No results found for "{query}"</div>
              )}

              {results?.learners && results.learners.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 py-1 text-xs font-bold text-secondary uppercase tracking-wider">Students</div>
                  {results.learners.map((learner) => (
                    <button
                      key={learner.id}
                      onClick={() => handleSelectLearner(learner.id)}
                      className="w-full text-left px-4 py-2 hover:bg-secondary/10 flex items-center gap-3 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-secondary/20 text-secondary flex items-center justify-center shrink-0 border border-secondary/30">
                        <Icon name="person" size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-200">{learner.full_name}</div>
                        <div className="text-xs text-slate-500">Student</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results?.teachers && results.teachers.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-xs font-bold text-primary uppercase tracking-wider">Teachers</div>
                  {results.teachers.map((teacher) => (
                    <button
                      key={teacher.id}
                      onClick={() => handleSelectTeacher()}
                      className="w-full text-left px-4 py-2 hover:bg-primary/10 flex items-center gap-3 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 border border-primary/30">
                        <Icon name="school" size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-200">{teacher.full_name}</div>
                        <div className="text-xs text-slate-500">Faculty</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
