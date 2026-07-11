import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listUsers, assignRole, type AppRole, type UserProfile } from "@/lib/auth.functions";
import { createInvitation } from "@/lib/invitation.functions";

export const Route = createFileRoute("/_authenticated/_admin/users")({
  head: () => ({
    meta: [
      { title: "User Management — AttendCloud" },
      {
        name: "description",
        content: "Manage user roles and access across the AttendCloud portal.",
      },
    ],
  }),
  component: UsersPage,
});

const roleLabels: Record<AppRole, string> = {
  admin: "Admin",
  academic_director: "Academic Director",
  teacher: "Teacher",
  student: "Student",
  kiosk: "Attendance Kiosk",
};

const roleOptions: AppRole[] = ["admin", "academic_director", "teacher", "student", "kiosk"];

function UsersPage() {
  const queryClient = useQueryClient();
  const fetchUsers = useServerFn(listUsers);
  const assignRoleFn = useServerFn(assignRole);
  const createInvitationFn = useServerFn(createInvitation);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("teacher");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => fetchUsers(),
  });

  const mutation = useMutation({
    mutationFn: ({ user, role }: { user: UserProfile; role: AppRole }) =>
      assignRoleFn({ data: { userId: user.id, role } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      createInvitationFn({
        data: {
          email: inviteEmail,
          fullName: inviteName,
          role: inviteRole,
        },
      }),
    onSuccess: (result) => {
      toast.success(`Invitation sent to ${result.email}`);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("teacher");
      setInviteOpen(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to send invitation");
    },
  });

  const submitInvite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    inviteMutation.mutate();
  };

  return (
    <AppShell
      title="User Management"
      subtitle="Assign roles and manage portal access."
      actions={
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110"
            >
              <Icon name="person_add" size={18} />
              <span>Invite User</span>
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite User</DialogTitle>
              <DialogDescription>
                Send an account setup link to the user's email address.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submitInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-name">Full name</Label>
                <Input
                  id="invite-name"
                  value={inviteName}
                  onChange={(event) => setInviteName(event.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as AppRole)}>
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                        <SelectItem key={role} value={role}>
                          {roleLabels[role]}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? "Sending..." : "Send Invite"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-outline-variant bg-surface-container-low/50">
              <tr className="text-left">
                {["USER", "EMAIL", "ROLE", "JOINED", ""].map((h, i) => (
                  <th
                    key={i}
                    className={`px-6 py-3 text-xs font-bold uppercase tracking-widest text-tertiary ${
                      i === 4 ? "text-right" : ""
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-tertiary">
                    <Icon name="progress_activity" className="inline animate-spin" size={20} />{" "}
                    Loading users…
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-outline-variant/40 last:border-0 transition hover:bg-surface-container-low/40"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-primary">
                          {initials(u.full_name ?? u.email ?? "?")}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            {u.full_name || "Unnamed User"}
                          </p>
                          <p className="text-xs text-tertiary num">ID: {u.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-tertiary">{u.email}</td>
                    <td className="px-6 py-4">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          mutation.mutate({ user: u, role: e.target.value as AppRole })
                        }
                        disabled={mutation.isPending}
                        className="h-9 rounded-lg border border-outline-variant bg-surface px-2 text-sm"
                      >
                        {roleOptions.map((r) => (
                          <option key={r} value={r}>
                            {roleLabels[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-tertiary num">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        className="rounded p-1.5 text-tertiary transition hover:bg-surface-container hover:text-primary"
                        aria-label="Edit"
                      >
                        <Icon name="edit" size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join("");
}
