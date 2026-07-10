import { hash } from "@node-rs/argon2";
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { generateIdFromEntropySize } from "lucia";
import { lucia } from "./auth";
import { requireAuth } from "./auth-middleware";
import type { AppRole } from "./auth.functions";
import { db } from "./db";
import {
  assertInvitationRole,
  createInvitationExpiry,
  createInvitationToken,
  hashInvitationToken,
  normalizeInviteEmail,
  normalizeInviteName,
  validateInvitePassword,
} from "./invitations";
import { renderEmail, sendMabdcEmail } from "./mail.server";

const ARGON_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

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
    if (context.user.role !== "admin" && context.user.role !== "academic_director") {
      throw new Error("Forbidden: admin or director access required");
    }

    const email = normalizeInviteEmail(data.email);
    const fullName = normalizeInviteName(data.fullName);
    const role = assertInvitationRole(data.role);

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error("A user already exists with this email address");
    }

    const existingInvite = await db.invitation.findUnique({ where: { email } });
    if (existingInvite && !existingInvite.accepted_at && existingInvite.expires_at > new Date()) {
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
          bodyHtml:
            '<p style="margin:0 0 16px;color:#4b5563;line-height:1.5">This invitation expires in 72 hours.</p>',
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

    const user = await db.$transaction(async (tx) => {
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

      const createdUser = await tx.user.create({
        data: {
          id: userId,
          email: invitation.email,
          full_name: invitation.full_name,
          password: passwordHash,
          role: invitation.role,
        },
      });

      await tx.userRole.create({
        data: {
          userId,
          role: invitation.role,
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { accepted_at: new Date() },
      });

      return createdUser;
    });

    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    setResponseHeader("Set-Cookie", sessionCookie.serialize());

    return { ok: true };
  });
