import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { Icon } from "@/components/Icon";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  startOfWeek,
  endOfWeek,
  parseISO
} from "date-fns";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";

type EventCategory = "academic" | "holiday" | "extracurricular" | "administrative" | "meeting";
type SchoolEvent = {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  category: EventCategory;
  is_all_day: boolean;
  location: string | null;
  visibility: "public" | "faculty" | "students";
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
};

const CATEGORY_COLORS: Record<EventCategory, string> = {
  academic: "bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]",
  holiday: "bg-gradient-to-r from-rose-400 to-pink-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.4)]",
  exam: "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.4)]",
  sports: "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-[0_0_12px_rgba(0,240,255,0.4)]",
};

const CATEGORY_LABELS: Record<EventCategory, string> = {
  academic: "Academic",
  holiday: "Holiday",
  exam: "Exam",
  sports: "Sports",
};

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { hasAnyRole } = useAuth();
  const canCreate = hasAnyRole(["admin", "academic_director"]);
  const queryClient = useQueryClient();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["school_events", format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const { getEventsFn } = await import("@/lib/events.functions");
      const data = await getEventsFn({
        data: {
          startDate: format(startDate, "yyyy-MM-dd"),
          endDate: format(endDate, "yyyy-MM-dd"),
        }
      });
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { deleteEventFn } = await import("@/lib/events.functions");
      await deleteEventFn({ data: { id } });
    },
    onSuccess: () => {
      toast.success("Event deleted");
      queryClient.invalidateQueries({ queryKey: ["school_events"] });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete event");
    }
  });

  const handleDeleteEvent = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this event?")) {
      deleteMutation.mutate(id);
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const handleDayClick = (day: Date) => {
    if (canCreate) {
      setSelectedDate(day);
      setIsCreateOpen(true);
    }
  };

  // Group events by day
  const getEventsForDay = (day: Date) => {
    return events.filter(e => {
      const eStart = parseISO(e.start_date);
      const eEnd = parseISO(e.end_date);
      return day >= eStart && day <= eEnd;
    });
  };

  return (
    <div className="flex flex-col gap-6 h-full min-h-[800px] p-4 md:p-6 lg:p-8 rounded-3xl animate-fade-in relative z-0">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background -z-10 rounded-3xl" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 -translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface/70 backdrop-blur-xl p-5 rounded-3xl shadow-[0_4px_30px_rgba(0,240,255,0.08)] border border-secondary/20">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-surface-container rounded-lg p-1 border border-white/5">
            <button onClick={prevMonth} className="p-2 hover:bg-white/10 hover:shadow-sm rounded-md transition-all text-slate-400 hover:text-secondary">
              <Icon name="chevron_left" size={20} />
            </button>
            <button onClick={goToToday} className="px-4 py-1.5 font-semibold text-sm hover:bg-white/10 hover:shadow-sm rounded-md transition-all text-slate-300 hover:text-secondary">
              Today
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-white/10 hover:shadow-sm rounded-md transition-all text-slate-400 hover:text-secondary">
              <Icon name="chevron_right" size={20} />
            </button>
          </div>
          <h2 className="text-2xl font-bold font-heading text-white w-48 neon-text-cyan">
            {format(currentDate, "MMMM yyyy")}
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-3 mr-4 bg-surface-container/50 px-4 py-2 rounded-2xl border border-white/10 shadow-sm">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <div className={`w-3.5 h-3.5 rounded-full shadow-[0_0_6px_currentColor] ${CATEGORY_COLORS[key as EventCategory].split(' ')[0]} ${CATEGORY_COLORS[key as EventCategory].split(' ')[1]}`} />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
              </div>
            ))}
          </div>

          {canCreate && (
            <button
              onClick={() => {
                setSelectedDate(new Date());
                setIsCreateOpen(true);
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-secondary to-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:shadow-[0_0_30px_rgba(0,240,255,0.5)] hover:-translate-y-0.5 transition-all duration-300"
            >
              <Icon name="add" size={20} />
              Create Event
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 bg-surface/70 backdrop-blur-xl rounded-3xl shadow-[0_4px_30px_rgba(0,240,255,0.06)] border border-secondary/15 flex flex-col overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-white/5 bg-surface-container/40">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="py-4 text-center text-xs font-black text-secondary/70 uppercase tracking-[0.2em]">
              {day}
            </div>
          ))}
        </div>

        {/* Grid Body */}
        <div className="grid grid-cols-7 flex-1 auto-rows-fr">
          {days.map((day, dayIdx) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);

            return (
              <div
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={`
                  min-h-[120px] p-2 border-r border-b border-white/5 transition-all duration-300 relative group
                  ${!isCurrentMonth ? "bg-surface-container/20 opacity-40" : "bg-transparent"}
                  ${canCreate ? "hover:bg-secondary/5 cursor-pointer hover:shadow-[0_0_20px_rgba(0,240,255,0.08)] hover:-translate-y-1 hover:z-10 hover:rounded-xl hover:border-transparent" : ""}
                  ${dayIdx % 7 === 6 ? "border-r-0" : ""}
                `}
              >
                <div className="flex justify-between items-start mb-2">
                  <span
                    className={`
                      w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-all
                      ${isTodayDate ? "bg-gradient-to-br from-secondary to-blue-500 text-white shadow-[0_0_15px_rgba(0,240,255,0.5)]" : "text-slate-400 group-hover:text-secondary"}
                    `}
                  >
                    {format(day, "d")}
                  </span>
                </div>
                
                <div className="flex flex-col gap-2 mt-2">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className={`px-2.5 py-1.5 text-xs font-bold rounded-lg flex items-center justify-between group/event transition-all duration-200 hover:brightness-110 hover:shadow-md ${CATEGORY_COLORS[event.category as EventCategory]}`}
                      title={event.title}
                    >
                      <span className="truncate drop-shadow-sm">{event.title}</span>
                      {canCreate && (
                        <button
                          onClick={(e) => handleDeleteEvent(e, event.id)}
                          className="opacity-0 group-hover/event:opacity-100 transition-opacity p-1 hover:bg-black/20 rounded-md ml-1 shrink-0 text-white"
                          title="Delete Event"
                        >
                          <Icon name="close" size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] font-bold text-slate-400 px-1">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CreateEventDialog 
        isOpen={isCreateOpen} 
        onOpenChange={setIsCreateOpen} 
        defaultDate={selectedDate || new Date()} 
      />
    </div>
  );
}

function CreateEventDialog({ isOpen, onOpenChange, defaultDate }: { isOpen: boolean; onOpenChange: (open: boolean) => void; defaultDate: Date }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<{
    title: string;
    start_date: string;
    end_date: string;
    category: EventCategory;
    description: string;
  }>({
    defaultValues: {
      start_date: format(defaultDate, "yyyy-MM-dd"),
      end_date: format(defaultDate, "yyyy-MM-dd"),
      category: "academic",
    }
  });

  // Update default dates if the prop changes
  useState(() => {
    reset({
      start_date: format(defaultDate, "yyyy-MM-dd"),
      end_date: format(defaultDate, "yyyy-MM-dd"),
      category: "academic",
    });
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const { createEventFn } = await import("@/lib/events.functions");
      await createEventFn({ data: values });
    },
    onSuccess: () => {
      toast.success("Event created successfully");
      queryClient.invalidateQueries({ queryKey: ["school_events"] });
      onOpenChange(false);
      reset();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create event");
    }
  });

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-surface/95 backdrop-blur-xl rounded-2xl shadow-[0_0_40px_rgba(0,240,255,0.15)] border border-secondary/30 z-50 p-6 animate-scale-in">
          <div className="flex justify-between items-center mb-6">
            <Dialog.Title className="text-xl font-bold font-heading text-white neon-text-cyan">
              Schedule Event
            </Dialog.Title>
            <Dialog.Close className="text-slate-400 hover:text-slate-200 bg-surface-container hover:bg-white/10 rounded-full p-1.5 transition-colors border border-white/10">
              <Icon name="close" size={20} />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-secondary uppercase tracking-wider">Event Title</label>
              <input 
                {...register("title", { required: true })}
                className="w-full border border-secondary/20 bg-surface-container rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all placeholder:text-slate-500"
                placeholder="e.g. Science Fair"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider">Start Date</label>
                <input 
                  type="date"
                  {...register("start_date", { required: true })}
                  className="w-full border border-secondary/20 bg-surface-container rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider">End Date</label>
                <input 
                  type="date"
                  {...register("end_date", { required: true })}
                  className="w-full border border-secondary/20 bg-surface-container rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-secondary uppercase tracking-wider">Category</label>
              <select 
                {...register("category")}
                className="w-full border border-secondary/20 bg-surface-container rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all"
              >
                <option value="academic">Academic</option>
                <option value="holiday">Holiday</option>
                <option value="exam">Exam</option>
                <option value="sports">Sports</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-secondary uppercase tracking-wider">Description (Optional)</label>
              <textarea 
                {...register("description")}
                rows={3}
                className="w-full border border-secondary/20 bg-surface-container rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all resize-none placeholder:text-slate-500"
                placeholder="Add any additional details here..."
              />
            </div>

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
              <Dialog.Close type="button" className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-xl transition-colors">
                Cancel
              </Dialog.Close>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="px-6 py-2 bg-gradient-to-r from-secondary to-blue-500 text-white text-sm font-bold rounded-xl shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:shadow-[0_0_25px_rgba(0,240,255,0.5)] transition-all disabled:opacity-50"
              >
                {isSubmitting ? "Creating..." : "Create Event"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
