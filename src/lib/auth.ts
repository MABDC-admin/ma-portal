import { Lucia } from "lucia";
import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import { db } from "./db";

const adapter = new PrismaAdapter(db.session, db.user);
const useSecureCookies = process.env.PUBLIC_APP_URL?.startsWith("https://") ?? false;

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    expires: false,
    attributes: {
      secure: useSecureCookies,
      sameSite: "lax",
      path: "/",
    },
  },
  getUserAttributes: (attributes) => {
    return {
      email: attributes.email,
      full_name: attributes.full_name,
      avatar_url: attributes.avatar_url,
      role: attributes.role,
    };
  },
});

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseUserAttributes {
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
}
