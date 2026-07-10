import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "./auth-middleware";
import { db } from "./db";

export const getDirectorAnecdotalsFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    if (context.user.role !== "admin" && context.user.role !== "academic_director") {
      throw new Error("Forbidden");
    }

    const entries = await db.anecdotalEntry.findMany({
      include: {
        student: {
          include: {
            user: { select: { full_name: true, email: true, avatar_url: true } }
          }
        }
      },
      orderBy: { incident_date: "desc" }
    });

    return entries.map(e => ({
      id: e.id,
      category: "behavioral", // or e.category if we add it
      note: e.description,
      occurred_on: e.incident_date.toISOString(),
      student: e.student ? {
        student_number: e.student.student_number,
        profiles: e.student.user
      } : null
    }));
  });
