import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";
import { Icon } from "@/components/Icon";

export const Route = createFileRoute("/_authenticated/learners/$id/portal")({
  component: LearnerPortalImpersonationPage,
});

function LearnerPortalImpersonationPage() {
  const { id } = Route.useParams();

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto mb-4">
        <Link
          to="/learners/$id"
          params={{ id }}
          className="inline-flex items-center gap-2 text-sm font-bold text-tertiary hover:text-foreground transition-colors bg-surface-container px-4 py-2 rounded-xl border border-outline-variant/30"
        >
          <Icon name="arrow_back" size={18} />
          Back to Learner Profile
        </Link>
      </div>
      
      {/* Render the dashboard in impersonation mode */}
      <StudentDashboard studentId={id} />
    </AppShell>
  );
}
