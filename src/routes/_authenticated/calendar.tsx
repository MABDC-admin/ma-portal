import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { CalendarView } from "@/components/calendar/CalendarView";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [{ title: "School Calendar — AttendCloud" }],
  }),
  component: CalendarRoute,
});

function CalendarRoute() {
  return (
    <AppShell title="School Calendar" subtitle="Manage and view academic events, holidays, and exams.">
      <CalendarView />
    </AppShell>
  );
}
