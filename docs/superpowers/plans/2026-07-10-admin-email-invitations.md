# Admin Email Invitations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working admin invite flow where admins email an invite link, invited users set a password, and the account is created with the selected role.

**Architecture:** Store pending invitations in MongoDB with a hashed token, never the raw URL token. Admin-only server functions create invitations and send email through the existing MABDC mail API helper; public server functions validate and accept invite tokens. The admin users page gets a modal form, and `/accept-invite` becomes the only supported account creation path.

**Tech Stack:** TanStack Start server functions, TanStack Router, React Query, Prisma MongoDB, Lucia sessions, `@node-rs/argon2`, Node `crypto`, Sonner toasts, Vitest.

---

## File Structure

- Modify `package.json`: add `test` script and Vitest dev dependency.
- Modify `prisma/schema.prisma`: add `Invitation` model with unique email and token hash.
- Create `src/lib/invitations.ts`: pure token, expiry, email normalization, password validation, and role validation helpers.
- Create `src/lib/invitations.test.ts`: unit tests for helper logic.
- Modify `src/lib/mail.server.ts`: make email delivery failures throw instead of silently logging.
- Create `src/lib/invitation.functions.ts`: admin invite creation, public invite lookup, and invite acceptance server functions.
- Modify `src/lib/auth.functions.ts`: remove public registration by making `registerUser` throw a clear invite-only error.
- Modify `src/routes/_authenticated/_admin/users.tsx`: wire the Invite User button to a modal form that calls `createInvitation`.
- Create `src/routes/accept-invite.tsx`: public page where invited users set their password and get signed in.
- Modify `.env.example`: document `MABDC_MAIL_API_KEY` without including a real key.
- Generated after route creation: `src/routeTree.gen.ts` through the normal TanStack build/dev process, not manual editing.

## Contract Decisions

- Invitation token: `crypto.randomBytes(32).toString("base64url")`.
- Stored token: SHA-256 hex digest of the raw token.
- Expiration: 72 hours from creation.
- Duplicate handling: reject when a user already exists with the email, and reject while a pending unexpired invitation exists for the email.
- Email requirement: use `notifications@mabdc.org` via `src/lib/mail.server.ts`.
- Mail failure behavior: return an error to the admin and remove the pending invitation if the mail API cannot queue the message.
- Password policy: minimum 12 characters.
- Public sign-up: disabled; account creation happens through invite acceptance only.

---

### Task 1: Add Test Runner and Invitation Helpers

**Files:**
- Modify: `package.json`
- Create: `src/lib/invitations.ts`
- Test: `src/lib/invitations.test.ts`

- [ ] **Step 1: Add Vitest script and dependency**

Modify `package.json`:

```json
{
  "scripts": {
    "dev": "vite dev --port 5176",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "preview": "vite preview",
    "lint": "eslint \"src/**/*.{ts,tsx}\" \"*.config.js\" \"*.cjs\" \"*.ts\"",
    "format": "prettier --write .",
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^3.2.4"
  }
}
```

Keep every existing dependency entry; only add the `test` script and `vitest` dev dependency.

- [ ] **Step 2: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` updates and `node_modules` contains Vitest.

- [ ] **Step 3: Write failing helper tests**

Create `src/lib/invitations.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  INVITATION_EXPIRY_HOURS,
  createInvitationExpiry,
  createInvitationToken,
  hashInvitationToken,
  isAllowedInvitationRole,
  normalizeInviteEmail,
  validateInvitePassword,
} from "./invitations";

describe("invitation helpers", () => {
  it("normalizes invite emails", () => {
    expect(normalizeInviteEmail("  USER@Example.COM  ")).toBe("user@example.com");
  });

  it("rejects invalid invite emails", () => {
    expect(() => normalizeInviteEmail("not-an-email")).toThrow("Enter a valid email address");
  });

  it("creates high entropy URL-safe tokens", () => {
    const token = createInvitationToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(40);
  });

  it("hashes tokens deterministically without returning the raw token", () => {
    const token = "sample-token";
    const first = hashInvitationToken(token);
    const second = hashInvitationToken(token);
    expect(first).toBe(second);
    expect(first).not.toBe(token);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it("sets invitation expiry 72 hours after the base date", () => {
    const base = new Date("2026-07-10T00:00:00.000Z");
    expect(createInvitationExpiry(base).toISOString()).toBe("2026-07-13T00:00:00.000Z");
    expect(INVITATION_EXPIRY_HOURS).toBe(72);
  });

  it("allows only roles that can sign in normally", () => {
    expect(isAllowedInvitationRole("admin")).toBe(true);
    expect(isAllowedInvitationRole("academic_director")).toBe(true);
    expect(isAllowedInvitationRole("teacher")).toBe(true);
    expect(isAllowedInvitationRole("student")).toBe(true);
    expect(isAllowedInvitationRole("kiosk")).toBe(false);
  });

  it("requires a 12 character password", () => {
    expect(() => validateInvitePassword("short")).toThrow("Password must be at least 12 characters");
    expect(validateInvitePassword("long-enough-password")).toBe("long-enough-password");
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run:

```bash
npm run test -- src/lib/invitations.test.ts
```

Expected: FAIL because `src/lib/invitations.ts` does not exist.

- [ ] **Step 5: Implement invitation helpers**

Create `src/lib/invitations.ts`:

```ts
import { createHash, randomBytes } from "node:crypto";
import type { AppRole } from "./auth.functions";

export const INVITATION_EXPIRY_HOURS = 72;

const INVITABLE_ROLES = ["admin", "academic_director", "teacher", "student"] as const;

export type InvitationRole = (typeof INVITABLE_ROLES)[number];

export function normalizeInviteEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("Enter a valid email address");
  }
  return normalized;
}

export function normalizeInviteName(fullName: string): string {
  const normalized = fullName.trim().replace(/\s+/g, " ");
  if (normalized.length < 2) {
    throw new Error("Enter the user's full name");
  }
  return normalized;
}

export function isAllowedInvitationRole(role: string): role is InvitationRole {
  return INVITABLE_ROLES.includes(role as InvitationRole);
}

export function assertInvitationRole(role: AppRole): InvitationRole {
  if (!isAllowedInvitationRole(role)) {
    throw new Error("Choose Admin, Academic Director, Teacher, or Student");
  }
  return role;
}

export function createInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createInvitationExpiry(baseDate = new Date()): Date {
  return new Date(baseDate.getTime() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000);
}

export function validateInvitePassword(password: string): string {
  if (password.length < 12) {
    throw new Error("Password must be at least 12 characters");
  }
  return password;
}
```

- [ ] **Step 6: Run helper tests to verify they pass**

Run:

```bash
npm run test -- src/lib/invitations.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/invitations.ts src/lib/invitations.test.ts
git commit -m "test: add invitation helper coverage"
```

---

### Task 2: Add Invitation Storage

**Files:**
- Modify: `prisma/schema.prisma`
- Generated: `node_modules/.prisma/client/*`

- [ ] **Step 1: Add the Prisma model**

Add this model after `UserRole` in `prisma/schema.prisma`:

```prisma
model Invitation {
  id          String    @id @default(cuid()) @map("_id")
  email       String    @unique
  full_name   String
  role        String
  token_hash  String    @unique
  expires_at  DateTime
  accepted_at DateTime?
  created_at  DateTime  @default(now())
  updated_at  DateTime  @updatedAt
  created_by  String

  @@index([expires_at])
}
```

- [ ] **Step 2: Generate Prisma client**

Run:

```bash
npx prisma generate
```

Expected: generated Prisma client includes `db.invitation`.

- [ ] **Step 3: Push schema to the configured MongoDB**

Run only when `DATABASE_URL` points to the intended development database:

```bash
npx prisma db push
```

Expected: Prisma reports the database is in sync.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add invitation data model"
```

---

### Task 3: Make Mail Delivery Fail Loudly

**Files:**
- Modify: `src/lib/mail.server.ts`

- [ ] **Step 1: Update mail helper to throw on missing key, API errors, and network errors**

Replace `sendMabdcEmail` in `src/lib/mail.server.ts` with:

```ts
export async function sendMabdcEmail({ to, subject, html }: MailInput): Promise<void> {
  const apiKey = process.env.MABDC_MAIL_API_KEY;
  if (!apiKey) {
    throw new Error("Email delivery is not configured");
  }

  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (recipients.length === 0) {
    throw new Error("Email recipient is required");
  }

  for (const recipient of recipients) {
    const res = await fetch(MAIL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: recipient, from: FROM_ADDRESS, subject, html }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[mail] send failed ${res.status} to=${recipient}: ${body}`);
      throw new Error("Email delivery failed");
    }
  }
}
```

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: no new lint error from `src/lib/mail.server.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/mail.server.ts
git commit -m "fix: surface mail delivery failures"
```

---

### Task 4: Build Invitation Server Functions

**Files:**
- Create: `src/lib/invitation.functions.ts`
- Modify: `src/lib/auth.functions.ts`

- [ ] **Step 1: Create server functions**

Create `src/lib/invitation.functions.ts`:

```ts
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { hash } from "@node-rs/argon2";
import { generateIdFromEntropySize } from "lucia";
import { lucia } from "./auth";
import { requireAuth } from "./auth-middleware";
import { db } from "./db";
import { renderEmail, sendMabdcEmail } from "./mail.server";
import type { AppRole } from "./auth.functions";
import {
  assertInvitationRole,
  createInvitationExpiry,
  createInvitationToken,
  hashInvitationToken,
  normalizeInviteEmail,
  normalizeInviteName,
  validateInvitePassword,
} from "./invitations";

const ARGON_OPTIONS = { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 };

type CreateInvitationInput = {
  email: string;
  fullName: string;
  role: AppRole;
};

type AcceptInvitationInput = {
  token: string;
  password: string;
};

function appUrl(): string {
  return process.env.PUBLIC_APP_URL || "http://localhost:5176";
}

function inviteUrl(token: string): string {
  const url = new URL("/accept-invite", appUrl());
  url.searchParams.set("token", token);
  return url.toString();
}

export const createInvitation = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: CreateInvitationInput) => input)
  .handler(async ({ data, context }) => {
    if (context.user.role !== "admin") {
      throw new Error("Forbidden: admin access required");
    }

    const email = normalizeInviteEmail(data.email);
    const fullName = normalizeInviteName(data.fullName);
    const role = assertInvitationRole(data.role);

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error("A user already exists with this email address");
    }

    const existingInvite = await db.invitation.findUnique({ where: { email } });
    if (existingInvite && existingInvite.accepted_at === null && existingInvite.expires_at > new Date()) {
      throw new Error("This email already has a pending invitation");
    }
    if (existingInvite) {
      await db.invitation.delete({ where: { email } });
    }

    const token = createInvitationToken();
    const tokenHash = hashInvitationToken(token);
    const expiresAt = createInvitationExpiry();

    const invitation = await db.invitation.create({
      data: {
        email,
        full_name: fullName,
        role,
        token_hash: tokenHash,
        expires_at: expiresAt,
        created_by: context.userId,
      },
    });

    try {
      await sendMabdcEmail({
        to: email,
        subject: "Your MABDC AttendCloud invitation",
        html: renderEmail({
          title: "You're invited to MABDC AttendCloud",
          intro: `${context.user.full_name || "An administrator"} invited you to access AttendCloud.`,
          bodyHtml: `<p style="margin:0 0 16px;color:#4b5563;line-height:1.5">This invitation expires in 72 hours.</p>`,
          ctaLabel: "Accept invitation",
          ctaUrl: inviteUrl(token),
        }),
      });
    } catch (error) {
      await db.invitation.delete({ where: { id: invitation.id } }).catch(() => undefined);
      throw error;
    }

    return {
      ok: true,
      email,
      expires_at: expiresAt.toISOString(),
    };
  });

export const getInvitationDetails = createServerFn({ method: "GET" })
  .validator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    const tokenHash = hashInvitationToken(data.token || "");
    const invitation = await db.invitation.findUnique({ where: { token_hash: tokenHash } });
    if (!invitation || invitation.accepted_at || invitation.expires_at <= new Date()) {
      throw new Error("This invitation is invalid or expired");
    }

    return {
      email: invitation.email,
      full_name: invitation.full_name,
      expires_at: invitation.expires_at.toISOString(),
    };
  });

export const acceptInvitation = createServerFn({ method: "POST" })
  .validator((input: AcceptInvitationInput) => input)
  .handler(async ({ data }) => {
    const password = validateInvitePassword(data.password);
    const tokenHash = hashInvitationToken(data.token || "");

    const result = await db.$transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({ where: { token_hash: tokenHash } });
      if (!invitation || invitation.accepted_at || invitation.expires_at <= new Date()) {
        throw new Error("This invitation is invalid or expired");
      }

      const existingUser = await tx.user.findUnique({ where: { email: invitation.email } });
      if (existingUser) {
        throw new Error("A user already exists with this email address");
      }

      const userId = generateIdFromEntropySize(10);
      const passwordHash = await hash(password, ARGON_OPTIONS);

      const user = await tx.user.create({
        data: {
          id: userId,
          email: invitation.email,
          full_name: invitation.full_name,
          password: passwordHash,
          role: invitation.role,
          user_roles: {
            create: {
              role: invitation.role,
            },
          },
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { accepted_at: new Date() },
      });

      return user;
    });

    const session = await lucia.createSession(result.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    setResponseHeader("Set-Cookie", sessionCookie.serialize());

    return { ok: true };
  });
```

- [ ] **Step 2: Disable public registration**

Replace the body of `registerUser` in `src/lib/auth.functions.ts` with:

```ts
export const registerUser = createServerFn({ method: "POST" })
  .validator((input: { email: string; password: string; full_name: string }) => input)
  .handler(async () => {
    throw new Error("Registration is by invitation only. Please use your email invitation link.");
  });
```

- [ ] **Step 3: Run typecheck through build**

Run:

```bash
npm run build
```

Expected: build succeeds. If TypeScript rejects nested `user_roles.create` for MongoDB, change the transaction to create `tx.userRole.create({ data: { userId, role: invitation.role } })` immediately after `tx.user.create`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/invitation.functions.ts src/lib/auth.functions.ts src/routeTree.gen.ts
git commit -m "feat: add invitation server workflow"
```

---

### Task 5: Add Admin Invite Dialog

**Files:**
- Modify: `src/routes/_authenticated/_admin/users.tsx`

- [ ] **Step 1: Replace imports**

Update imports in `src/routes/_authenticated/_admin/users.tsx`:

```ts
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
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
import { createInvitation } from "@/lib/invitation.functions";
import { listUsers, assignRole, type AppRole, type UserProfile } from "@/lib/auth.functions";
```

- [ ] **Step 2: Add invite state and mutation in `UsersPage`**

Inside `UsersPage`, after `assignRoleFn`, add:

```ts
  const createInvitationFn = useServerFn(createInvitation);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("teacher");
```

After the role mutation, add:

```ts
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

  const submitInvite = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    inviteMutation.mutate();
  };
```

- [ ] **Step 3: Wire the Invite User button**

Replace the `actions` button with:

```tsx
      actions={
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110"
        >
          <Icon name="person_add" size={18} />
          <span>Invite User</span>
        </button>
      }
```

- [ ] **Step 4: Add dialog above the users card**

Inside `AppShell`, before `<Card className="overflow-hidden">`, add:

```tsx
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
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
                  {roleOptions
                    .filter((role) => role !== "kiosk")
                    .map((role) => (
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
```

- [ ] **Step 5: Run lint**

Run:

```bash
npm run lint
```

Expected: no lint errors from `users.tsx`.

- [ ] **Step 6: Commit**

```bash
git add src/routes/_authenticated/_admin/users.tsx
git commit -m "feat: add admin invite dialog"
```

---

### Task 6: Add Accept Invite Page

**Files:**
- Create: `src/routes/accept-invite.tsx`
- Generated: `src/routeTree.gen.ts`

- [ ] **Step 1: Create the route**

Create `src/routes/accept-invite.tsx`:

```tsx
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
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

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
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
        ) : detailsQuery.isError ? (
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
```

- [ ] **Step 2: Build to regenerate route tree**

Run:

```bash
npm run build
```

Expected: build succeeds and `src/routeTree.gen.ts` includes `/accept-invite`.

- [ ] **Step 3: Commit**

```bash
git add src/routes/accept-invite.tsx src/routeTree.gen.ts
git commit -m "feat: add invite acceptance page"
```

---

### Task 7: Document Environment Configuration

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add the mail key placeholder**

Append to `.env.example`:

```env
MABDC_MAIL_API_KEY=""
```

Do not place the real production key in this file or any committed file.

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: document mail api environment variable"
```

---

### Task 8: End-to-End Verification

**Files:**
- No planned source edits unless verification finds a defect.

- [ ] **Step 1: Run unit tests**

Run:

```bash
npm run test
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Start the local app**

Run:

```bash
npm run dev -- --host 0.0.0.0
```

Expected: app starts on port `5176`.

- [ ] **Step 5: Verify invite flow manually**

Use the browser:

1. Sign in as an admin.
2. Open `/admin/users`.
3. Click `Invite User`.
4. Submit a full name, an email address, and the `Teacher` role.
5. Confirm the toast says the invite was sent.
6. Confirm the email API receives a queued message.
7. Open the emailed `/accept-invite?token=...` link.
8. Enter a 12+ character password.
9. Confirm the app signs in as the invited user.
10. Confirm the new user appears in admin user management with the selected role.

- [ ] **Step 6: Commit any verification fixes**

If verification required fixes:

```bash
git add <fixed-files>
git commit -m "fix: stabilize invitation flow"
```

If no fixes were needed, do not create an empty commit.

---

## Self-Review

- Spec coverage: Admin can send an email invite; mail is sent through the existing MABDC API; sender domain stays `mabdc.org`; raw tokens are not stored; invite acceptance creates the account and session; public registration is disabled; mail failures return an admin-visible error.
- Placeholder scan: No `TBD`, `TODO`, or vague "handle later" tasks remain. Every code-changing step includes exact file paths and concrete code.
- Type consistency: `fullName` is the server function input, `full_name` is the Prisma field, `token_hash` is the Prisma field, and `AppRole` remains the shared UI/server role type. `kiosk` remains assignable for existing users but is excluded from invitations.
