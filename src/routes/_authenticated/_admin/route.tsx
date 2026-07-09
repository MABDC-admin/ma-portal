import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_admin")({
  beforeLoad: async ({ context, location }) => {
    if (!context.auth.hasRole("admin")) {
      throw redirect({ to: "/unauthorized", search: { redirect: location.href } });
    }
  },
  component: () => <Outlet />,
});
