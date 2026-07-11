import { eq } from "drizzle-orm";
import { db, employeesTable } from "@workspace/db";
import { hashPassword } from "./password";
import { logger } from "./logger";

/**
 * Ensures a system administrator account exists, sourced entirely from
 * environment secrets (ADMIN_PHONE / ADMIN_PASSWORD) rather than hardcoded
 * or seeded via manual SQL. Safe to run on every server start:
 * - If no employee with that phone exists, it creates the admin.
 * - If it exists but isn't an active admin, it repairs the role/active flag.
 * - It never overwrites an existing password (avoids clobbering a password
 *   the admin has since changed from the UI).
 */
export async function seedAdminAccount(): Promise<void> {
  const phone = process.env["ADMIN_PHONE"];
  const password = process.env["ADMIN_PASSWORD"];

  if (!phone || !password) {
    logger.warn(
      "ADMIN_PHONE/ADMIN_PASSWORD not set; skipping system admin seeding.",
    );
    return;
  }

  const [existing] = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.phone, phone));

  if (!existing) {
    await db.insert(employeesTable).values({
      name: "مدير النظام",
      role: "admin",
      phone,
      email: null,
      passwordHash: hashPassword(password),
      isActive: true,
    });
    logger.info({ phone }, "Seeded system admin account from environment secrets");
    return;
  }

  const needsRepair = existing.role !== "admin" || !existing.isActive;
  if (needsRepair) {
    await db
      .update(employeesTable)
      .set({ role: "admin", isActive: true })
      .where(eq(employeesTable.id, existing.id));
    logger.info({ phone }, "Repaired system admin account role/active flag");
  }
}
