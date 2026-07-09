import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_teacher")({
  beforeLoad: async ({ location }) => {
    const userId = (await supabase.auth.getUser()).data.user!.id;
    const [{ data: isAdmin }, { data: isTeacher }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "teacher" }),
    ]);
    if (!isAdmin && !isTeacher)
      throw redirect({ to: "/unauthorized", search: { redirect: location.href } });
  },
  component: () => <Outlet />,
});
