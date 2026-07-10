import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInvitation, getInvitationDetails } from "@/lib/invitation.functions";

export const Route = createFileRoute("/accept-invite")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  beforeLoad: ({ search }) => {
    if (!search.token) {
      throw redirect({ to: "/auth" });
    }
  },
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const getDetails = useServerFn(getInvitationDetails);
  const acceptInvite = useServerFn(acceptInvitation);
  const [password, setPassword] = useState("");

  const detailsQuery = useQuery({
    queryKey: ["invitation", token],
    queryFn: () => getDetails({ data: { token } }),
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: () => acceptInvite({ data: { token, password } }),
    onSuccess: async () => {
      toast.success("Account created");
      await navigate({ to: "/" });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to accept invitation");
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    acceptMutation.mutate();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-container-low px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-outline-variant bg-surface p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Accept invitation</h1>
          <p className="mt-2 text-sm text-tertiary">
            Create your password to finish setting up your AttendCloud account.
          </p>
        </div>

        {detailsQuery.isLoading ? (
          <p className="text-sm text-tertiary">Loading invitation...</p>
        ) : detailsQuery.isError || !detailsQuery.data ? (
          <p className="text-sm text-destructive">This invitation is invalid or expired.</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1 rounded-md bg-surface-container-low p-3 text-sm">
              <p className="font-medium text-foreground">{detailsQuery.data.full_name}</p>
              <p className="text-tertiary">{detailsQuery.data.email}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={12}
                autoComplete="new-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={acceptMutation.isPending}>
              {acceptMutation.isPending ? "Creating account..." : "Create Account"}
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
