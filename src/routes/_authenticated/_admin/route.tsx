import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_admin")({
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.rpc("has_role", {
      _user_id: (await supabase.auth.getUser()).data.user!.id,
      _role: "admin",
    });
    if (!data) throw redirect({ to: "/unauthorized", search: { redirect: location.href } });
  },
  component: () => <Outlet />,
});
