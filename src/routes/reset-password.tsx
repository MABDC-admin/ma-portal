import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Icon } from "@/components/Icon";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — AttendCloud" },
      { name: "description", content: "Set a new password for your AttendCloud account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hashType, setHashType] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setHashType("recovery");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const { resetPasswordFn } = await import("@/lib/auth.functions");
      await resetPasswordFn({ data: { password } });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-outline-variant bg-surface p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-container text-primary">
            <Icon name="lock_reset" size={24} />
          </div>
          <h1 className="mt-4 font-display text-xl font-extrabold">Set New Password</h1>
        </div>

        {success ? (
          <div className="space-y-4 text-center">
            <div className="rounded-lg bg-status-present/10 p-4 text-sm text-status-present">
              Your password has been updated. You can now sign in.
            </div>
            <Link
              to="/auth"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground"
            >
              Go to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {hashType !== "recovery" && (
              <div className="rounded-lg bg-status-late/10 p-3 text-sm text-status-late">
                This link is invalid or has expired.
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-tertiary">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-outline-variant bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-tertiary">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-outline-variant bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {error && (
              <div className="rounded-lg bg-status-absent/10 p-3 text-sm text-status-absent">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || hashType !== "recovery"}
              className="w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground shadow-md transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? "Updating…" : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
