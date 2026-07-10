import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_teacher")({
  beforeLoad: async ({ location }) => {
    const { getSessionFn } = await import("@/lib/auth.functions");
    const { user } = await getSessionFn();
    const hasAccess = user?.role === "admin" || user?.role === "teacher";
    
    if (!hasAccess) {
      throw redirect({ to: "/unauthorized", search: { redirect: location.href } });
    }
  },
  component: () => <Outlet />,
});
