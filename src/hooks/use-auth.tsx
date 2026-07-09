import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import type { UserProfile, AppRole } from "@/lib/auth.functions";

export type AuthUser = {
  id: string;
  email: string | null;
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
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        setUser(null);
        setProfile(null);
        return;
      }
      setUser({ id: data.user.id, email: data.user.email ?? null });
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, role, created_at, updated_at")
        .eq("id", data.user.id)
        .single();
      setProfile(profileData as UserProfile | null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "SIGNED_OUT") {
        void loadSession();
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
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

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
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
