import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { UserProfile, AppRole } from "@/lib/auth.functions";
import { getCurrentUser, loginUser, logoutUser } from "@/lib/auth.functions";

export type AuthUser = {
  id: string;
  email: string | null;
  role: AppRole;
};

export type AuthContextValue = {
  user: AuthUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getCurrentUser();
      if (!data) {
        setUser(null);
        setProfile(null);
        return;
      }
      setUser({ id: data.id, email: data.email ?? null, role: data.role });
      setProfile(data as UserProfile | null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const hasRole = useCallback(
    (role: AppRole) => profile?.role === role || profile?.role === "admin",
    [profile],
  );

  const hasAnyRole = useCallback(
    (roles: AppRole[]) =>
      profile?.role === "admin" || (profile?.role ? roles.includes(profile.role) : false),
    [profile],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        await loginUser({ data: { email, password } });
        await loadSession();
        return {};
      } catch (err: any) {
        return { error: err.message || "Failed to login" };
      }
    },
    [loadSession],
  );

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error(err);
    }
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      isLoading,
      isAuthenticated: !!user,
      hasRole,
      hasAnyRole,
      login,
      logout,
      refresh: loadSession,
    }),
    [user, profile, isLoading, hasRole, hasAnyRole, login, logout, loadSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
