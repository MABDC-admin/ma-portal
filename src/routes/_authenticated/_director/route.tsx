import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_director")({
  beforeLoad: async ({ location }) => {
    const { getSessionFn } = await import("@/lib/auth.functions");
    const { user } = await getSessionFn();
    const hasAccess = user?.role === "admin" || user?.role === "academic_director";
    
    if (!hasAccess) {
      throw redirect({ to: "/unauthorized", search: { redirect: location.href } });
    }
  },
  component: () => <Outlet />,
});
