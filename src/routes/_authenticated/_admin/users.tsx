import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell, Card } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { listUsers, assignRole, type AppRole, type UserProfile } from "@/lib/auth.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/_authenticated/_admin/users")({
  head: () => ({
    meta: [
      { title: "User Management — AttendCloud" },
      { name: "description", content: "Manage user roles and access across the AttendCloud portal." },
    ],
  }),
  component: UsersPage,
});

const roleLabels: Record<AppRole, string> = {
  admin: "Admin",
  academic_director: "Academic Director",
  teacher: "Teacher",
  student: "Student",
};

const roleOptions: AppRole[] = ["admin", "academic_director", "teacher", "student"];

function UsersPage() {
  const queryClient = useQueryClient();
  const fetchUsers = useServerFn(listUsers);
  const assignRoleFn = useServerFn(assignRole);

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

  return (
    <AppShell
      title="User Management"
      subtitle="Assign roles and manage portal access."
      actions={
        <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110">
          <Icon name="person_add" size={18} />
          <span>Invite User</span>
        </button>
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
                    <Icon name="progress_activity" className="inline animate-spin" size={20} /> Loading users…
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-outline-variant/40 last:border-0 transition hover:bg-surface-container-low/40">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-primary">
                          {initials(u.full_name ?? u.email ?? "?")}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{u.full_name || "Unnamed User"}</p>
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
                      <button className="rounded p-1.5 text-tertiary transition hover:bg-surface-container hover:text-primary" aria-label="Edit">
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
