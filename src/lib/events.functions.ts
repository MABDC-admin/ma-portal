import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "./auth-middleware";
import { db } from "./db";

type EventCategory = "academic" | "holiday" | "exam" | "sports";

export const getEventsFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .validator((input: { startDate: string; endDate: string }) => input)
  .handler(async ({ data }) => {
    const events = await db.schoolEvent.findMany({
      where: {
        end_date: { gte: new Date(data.startDate) },
        start_date: { lte: new Date(data.endDate) }
      },
      orderBy: { start_date: "asc" }
    });
    
    return events.map(e => ({
        ...e,
        start_date: e.start_date.toISOString(),
        end_date: e.end_date.toISOString(),
        created_at: e.created_at.toISOString(),
        updated_at: e.updated_at.toISOString()
    }));
  });

export const deleteEventFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    if (context.user.role !== "admin" && context.user.role !== "academic_director") {
      throw new Error("Forbidden");
    }
    await db.schoolEvent.delete({ where: { id: data.id } });
    return { ok: true };
  });

export const createEventFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: { title: string; category: EventCategory; start_date: string; end_date: string; description: string }) => input)
  .handler(async ({ data, context }) => {
    if (context.user.role !== "admin" && context.user.role !== "academic_director") {
      throw new Error("Forbidden");
    }
    const inserted = await db.schoolEvent.create({
      data: {
        title: data.title,
        category: data.category,
        start_date: new Date(data.start_date),
        end_date: new Date(data.end_date),
        description: data.description,
      }
    });
    return { id: inserted.id };
  });
