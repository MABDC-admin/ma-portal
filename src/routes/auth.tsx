import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Icon } from "@/components/Icon";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — AttendCloud" },
      { name: "description", content: "Sign in to AttendCloud to manage attendance, review DLLs, and view profiles." },
    ],
  }),
  component: AuthPage,
});

const roleLanding: Record<string, string> = {
  admin: "/teachers",
  academic_director: "/dll",
  teacher: "/",
  student: "/students/me",
};

function AuthPage() {
  const { isAuthenticated, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && profile) {
      const target = roleLanding[profile.role] ?? "/";
      void navigate({ to: target as any, replace: true });
    }
  }, [isAuthenticated, profile, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Icon name="school" filled weight={600} size={28} />
          </div>
          <h1 className="mt-4 font-display text-2xl font-extrabold text-foreground">AttendCloud</h1>
          <p className="mt-1 text-sm text-muted-foreground">Attendance & Daily Lesson Logs</p>
        </div>
        <AuthForm />
        <p className="mt-6 text-center text-xs text-tertiary">
          By signing in, you agree to the school's acceptable use policy.
        </p>
      </div>
    </div>
  );
}

function AuthForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (mode === "login") {
        const result = await login(email, password);
        if (result.error) {
          setError(result.error);
        } else {
          await router.invalidate();
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
          },
        });
        if (error) {
          setError(error.message);
        } else {
          setMessage("Check your email to confirm your account.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-outline-variant bg-surface p-8 shadow-xl">
      <div className="mb-6 flex rounded-xl bg-surface-container p-1">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
            mode === "login" ? "bg-primary text-primary-foreground shadow-sm" : "text-tertiary"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
            mode === "register" ? "bg-primary text-primary-foreground shadow-sm" : "text-tertiary"
          }`}
        >
          Register
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "register" && (
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-tertiary">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required={mode === "register"}
              className="input w-full rounded-lg border border-outline-variant bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Dr. Julian Rivers"
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-tertiary">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input w-full rounded-lg border border-outline-variant bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="you@horizon.edu"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-tertiary">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="input w-full rounded-lg border border-outline-variant bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-status-absent/10 p-3 text-sm text-status-absent">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-lg bg-status-present/10 p-3 text-sm text-status-present">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-primary-foreground shadow-md transition hover:brightness-110 disabled:opacity-60"
        >
          {loading ? (
            <Icon name="progress_activity" className="animate-spin" size={20} />
          ) : mode === "login" ? (
            "Sign In"
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-sm">
        <Link to="/" className="text-tertiary hover:text-foreground">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
