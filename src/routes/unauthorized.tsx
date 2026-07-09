import { createFileRoute, Link } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";

export const Route = createFileRoute("/unauthorized")({
  head: () => ({
    meta: [
      { title: "Unauthorized — AttendCloud" },
      { name: "description", content: "You do not have permission to view this page." },
    ],
  }),
  component: UnauthorizedPage,
});

function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-status-late/10 text-status-late">
          <Icon name="lock" size={32} />
        </div>
        <h1 className="mt-6 font-display text-3xl font-extrabold text-foreground">Access Denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account does not have permission to view this page. Contact an administrator if you
          believe this is an error.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-md transition hover:brightness-110"
          >
            Go Home
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center rounded-xl border border-outline-variant bg-surface px-6 py-2.5 text-sm font-bold text-foreground transition hover:bg-surface-container"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
