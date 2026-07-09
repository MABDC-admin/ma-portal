import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import type { AppRole } from "@/lib/auth.functions";

export const Route = createFileRoute("/_authenticated/_director")({
  beforeLoad: async ({ context, location }) => {
    const allowed: AppRole[] = ["admin", "academic_director"];
    if (!context.auth.hasAnyRole(allowed)) {
      throw redirect({ to: "/unauthorized", search: { redirect: location.href } });
    }
  },
  component: () => <Outlet />,
});
