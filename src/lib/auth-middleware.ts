import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { lucia } from "./auth";

export const requireAuth = createMiddleware().server(async ({ next }) => {
  const request = getRequest();
  if (!request) {
    throw new Error("No web request available");
  }

  const authHeader = request.headers.get("Authorization");
  const sessionId = lucia.readSessionCookie(request.headers.get("Cookie") ?? "");

  if (!sessionId) {
    throw new Error("Unauthorized: No session");
  }

  const { session, user } = await lucia.validateSession(sessionId);

  if (!session) {
    throw new Error("Unauthorized: Invalid session");
  }

  return next({
    context: {
      user,
      session,
      userId: user.id
    },
  });
});
