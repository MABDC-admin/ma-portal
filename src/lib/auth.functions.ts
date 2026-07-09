import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: AppRole;
  created_at: string;
  updated_at: string;
};

export const getCurrentUser = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url, role, created_at, updated_at")
      .eq("id", context.userId)
      .single();

    if (error) throw new Error(error.message);
    return data as UserProfile;
  });

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: me, error: meError } = await context.supabase
      .from("profiles")
      .select("role")
      .eq("id", context.userId)
      .single();
    if (meError) throw new Error(meError.message);
    if (me?.role !== "admin") throw new Error("Forbidden: admin access required");

    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url, role, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as UserProfile[];
  });

export const assignRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { userId: string; role: AppRole }) => input)
  .handler(async ({ data, context }) => {
    const { data: me, error: meError } = await context.supabase
      .from("profiles")
      .select("role")
      .eq("id", context.userId)
      .single();
    if (meError) throw new Error(meError.message);
    if (me?.role !== "admin") throw new Error("Forbidden: admin access required");

    const { error: profileError } = await context.supabase
      .from("profiles")
      .update({ role: data.role })
      .eq("id", data.userId);
    if (profileError) throw new Error(profileError.message);

    const { error: roleError } = await context.supabase
      .from("user_roles")
      .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
    if (roleError) throw new Error(roleError.message);

    return { ok: true };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { full_name?: string; avatar_url?: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ full_name: data.full_name, avatar_url: data.avatar_url })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
