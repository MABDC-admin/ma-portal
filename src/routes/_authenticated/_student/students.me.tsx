import { createFileRoute, redirect } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/_student/students/me")({
  beforeLoad: async () => {
    // actual redirect happens in component after auth is known
  },
  component: StudentMeRedirect,
});

function StudentMeRedirect() {
  const { profile } = useAuth();
  const id = profile?.id;
  if (!id) return null;
  const slug = profile.full_name?.toLowerCase().replace(/\s+/g, "-") || id.slice(0, 8);
  throw redirect({ to: "/students/$id", params: { id: slug }, replace: true });
}
