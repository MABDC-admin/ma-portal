import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";

export const Route = createFileRoute("/_authenticated/_admin/schedule")({
  head: () => ({ meta: [{ title: "Schedule Layout Demo" }] }),
  component: ScheduleDemo,
});

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function ScheduleDemo() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-extrabold">Class Schedule</h1>
        <p className="mt-1 text-sm text-tertiary">Manage subjects and timetable</p>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-stretch overflow-x-auto pb-4">
        {DAYS.map((day) => (
          <div 
            key={day} 
            className="flex-1 min-w-[250px] glass-panel rounded-2xl p-5 flex flex-col gap-4 border border-outline-variant/40 hover:border-primary/50 transition-colors"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest">Class Day</p>
                <h3 className="font-display text-xl font-bold text-foreground mt-1">{day}</h3>
              </div>
              <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-tertiary hover:bg-primary/20 hover:text-primary transition-colors">
                <Icon name="add" size={20} />
              </button>
            </div>

            {/* Empty State / Drop Zone */}
            <div className="mt-2 flex-1 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-outline-variant/50 bg-surface-container-low/30 p-6 text-center transition-colors hover:border-primary/50 hover:bg-surface-container-low/50">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-tertiary">
                <Icon name="event_available" size={20} />
              </div>
              <p className="text-sm font-bold text-foreground">No subjects yet</p>
              <p className="mt-1 text-xs text-tertiary max-w-[200px]">
                Add one or more system subjects for {day}.
              </p>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
