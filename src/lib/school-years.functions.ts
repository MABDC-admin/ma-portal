import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "./auth-middleware";
import { db } from "./db";

export const listSchoolYearsFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    if (context.user.role !== "admin") throw new Error("Forbidden: admin role required");
    const years = await db.schoolYear.findMany({
      orderBy: { year: "desc" }
    });
    return years.map(y => ({
      ...y,
      created_at: y.created_at.toISOString()
    }));
  });

export const addSchoolYearFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: { year: string; is_active: boolean }) => input)
  .handler(async ({ data, context }) => {
    if (context.user.role !== "admin") throw new Error("Forbidden: admin role required");
    const year = await db.schoolYear.create({
      data: {
        year: data.year,
        is_active: data.is_active
      }
    });
    return { ...year, created_at: year.created_at.toISOString() };
  });

export const activateSchoolYearFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    if (context.user.role !== "admin") throw new Error("Forbidden: admin role required");

    // Deactivate all
    await db.schoolYear.updateMany({
      data: { is_active: false }
    });

    // Activate selected
    await db.schoolYear.update({
      where: { id: data.id },
      data: { is_active: true }
    });

    return { ok: true };
  });
