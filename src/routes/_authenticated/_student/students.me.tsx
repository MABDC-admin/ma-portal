import { createFileRoute, redirect } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/_student/students/me")({
  component: StudentMeRedirect,
});

function StudentMeRedirect() {
  const { user } = useAuth();
  if (!user) return null;
  throw redirect({ to: "/students/$id", params: { id: user.id }, replace: true });
}
