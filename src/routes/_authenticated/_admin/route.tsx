import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_admin")({
  beforeLoad: async ({ location }) => {
    const { getSessionFn } = await import("@/lib/auth.functions");
    const { user } = await getSessionFn();
    const kioskAllowed = location.pathname === "/kiosk" && user?.role === "kiosk";
    if (user?.role !== "admin" && !kioskAllowed) {
      throw redirect({ to: "/unauthorized", search: { redirect: location.href } });
    }
  },
  component: () => <Outlet />,
});
