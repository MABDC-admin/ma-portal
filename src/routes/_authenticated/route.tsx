import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { getSessionFn } = await import("@/lib/auth.functions");
    const { user } = await getSessionFn();
    if (!user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    if (user.role === "kiosk" && location.pathname !== "/kiosk") {
      throw redirect({ to: "/kiosk" });
    }
    return { user };
  },
  component: () => <Outlet />,
});
