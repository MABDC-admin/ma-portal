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
