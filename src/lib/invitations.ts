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
