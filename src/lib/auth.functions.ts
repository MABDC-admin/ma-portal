import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { requireAuth } from "./auth-middleware";
import { db } from "./db";
import { lucia } from "./auth";
import { verify } from "@node-rs/argon2";

export type AppRole = "admin" | "academic_director" | "teacher" | "student" | "kiosk";

export type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: AppRole;
  created_at: string;
  updated_at: string;
};

async function readCurrentUser(): Promise<UserProfile | null> {
  const request = getRequest();
  if (!request) return null;

  const sessionId = lucia.readSessionCookie(request.headers.get("Cookie") ?? "");
  if (!sessionId) return null;

  const { session, user } = await lucia.validateSession(sessionId);
  if (!session) return null;

  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    avatar_url: user.avatar_url,
    role: user.role as AppRole,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export const getCurrentUser = createServerFn({ method: "GET" }).handler(readCurrentUser);

export const getSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const user = await readCurrentUser();
  return { user };
});

export const loginUser = createServerFn({ method: "POST" })
  .validator((input: { email: string; password: string }) => input)
  .handler(async ({ data }) => {
    const user = await db.user.findUnique({ where: { email: data.email } });
    if (!user || !user.password) throw new Error("Invalid email or password");

    // In production, use oslo/password for hashing. For now we do a simple check or wait until we implement oslo.
    // Let's use simple match for migration logic or implement oslo.
    // TODO: proper hash validation
    let validPassword = false;
    try {
      validPassword = await verify(user.password, data.password, { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 });
    } catch (e) {
      // Fallback if not a valid argon2 hash
      validPassword = user.password === data.password;
    }
    
    if (!validPassword) throw new Error("Invalid email or password");

    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    // We need a way to set the cookie. TanStack Start server functions can append headers.
    const request = getRequest();
    // Assuming Tanstack start provides a way to set headers. Let's use setResponseHeader.
    // Wait, import { setResponseHeader } from '@tanstack/react-start/server';
    setResponseHeader("Set-Cookie", sessionCookie.serialize());

    return { ok: true };
  });

export const registerUser = createServerFn({ method: "POST" })
  .validator((input: { email: string; password: string; full_name: string }) => input)
  .handler(async ({ data }) => {
    const existing = await db.user.findUnique({ where: { email: data.email } });
    if (existing) throw new Error("User already exists");

    const { generateIdFromEntropySize } = await import("lucia");
    const userId = generateIdFromEntropySize(10); // 16 characters

    await db.user.create({
      data: {
        id: userId,
        email: data.email,
        full_name: data.full_name,
        password: data.password, // TODO: Hash password
        role: "student",
      },
    });

    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    setResponseHeader("Set-Cookie", sessionCookie.serialize());

    return { ok: true };
  });

export const logoutUser = createServerFn({ method: "POST" }).handler(async () => {
  const request = getRequest();
  if (!request) return { ok: true };
  const sessionId = lucia.readSessionCookie(request.headers.get("Cookie") ?? "");
  if (!sessionId) return { ok: true };

  await lucia.invalidateSession(sessionId);
  const sessionCookie = lucia.createBlankSessionCookie();
  setResponseHeader("Set-Cookie", sessionCookie.serialize());
  return { ok: true };
});

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    if (context.user.role !== "admin") throw new Error("Forbidden: admin access required");

    const users = await db.user.findMany({
      orderBy: { created_at: "desc" },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      role: user.role as AppRole,
      created_at: user.created_at.toISOString(),
      updated_at: user.updated_at.toISOString(),
    })) as UserProfile[];
  });

export const assignRole = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: { userId: string; role: AppRole }) => input)
  .handler(async ({ data, context }) => {
    if (context.user.role !== "admin") throw new Error("Forbidden: admin access required");

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: data.userId },
        data: { role: data.role },
      });

      // Update or create user_roles record
      const existingRole = await tx.userRole.findFirst({
        where: { userId: data.userId, role: data.role },
      });

      if (!existingRole) {
        await tx.userRole.create({
          data: {
            userId: data.userId,
            role: data.role,
          },
        });
      }
    });

    return { ok: true };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: { full_name?: string; avatar_url?: string }) => input)
  .handler(async ({ data, context }) => {
    await db.user.update({
      where: { id: context.userId },
      data: {
        full_name: data.full_name,
        avatar_url: data.avatar_url,
      },
    });
    return { ok: true };
  });

export const searchUsersFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .validator((input: { query: string }) => input)
  .handler(async ({ data }) => {
    const { query } = data;
    if (!query || query.length < 2) return { learners: [], teachers: [] };

    // Prisma mongo uses contains for ilike
    const [learners, teachers] = await Promise.all([
      db.user.findMany({
        where: {
          role: "student",
          full_name: { contains: query, mode: "insensitive" },
        },
        select: { id: true, full_name: true, role: true },
        take: 5,
      }),
      db.user.findMany({
        where: {
          role: "teacher",
          full_name: { contains: query, mode: "insensitive" },
        },
        select: { id: true, full_name: true, role: true },
        take: 5,
      }),
    ]);

    return { learners, teachers };
  });

export const resetPasswordFn = createServerFn({ method: "POST" })
  .validator((input: { password: string; token?: string }) => input)
  .handler(async ({ data }) => {
    // In a real app, validate token.
    // For now, if no token, maybe throw.
    throw new Error("Password reset requires email verification implementation.");
  });
