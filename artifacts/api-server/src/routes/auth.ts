import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, employeesTable } from "@workspace/db";
import { LoginByPhoneBody } from "@workspace/api-zod";
import { verifyPassword } from "../lib/password";
import { createToken } from "../lib/auth-token";

const router: IRouter = Router();

function normalizePhone(phone: string): string {
  return phone.replace(/[\s-]/g, "");
}

router.post("/auth/login-by-phone", async (req, res): Promise<void> => {
  const parsed = LoginByPhoneBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const phone = normalizePhone(parsed.data.phone);

  const employees = await db.select().from(employeesTable);
  const employee = employees.find((e) => normalizePhone(e.phone) === phone);

  if (!employee) {
    res.status(404).json({ error: "لا يوجد موظف بهذا رقم الهاتف" });
    return;
  }

  if (!employee.isActive) {
    res.status(403).json({ error: "تم إيقاف هذا الحساب. يرجى التواصل مع مدير النظام" });
    return;
  }

  if (!employee.passwordHash || !verifyPassword(parsed.data.password, employee.passwordHash)) {
    res.status(401).json({ error: "الرقم السري غير صحيح" });
    return;
  }

  const token = createToken(employee.id);

  res.json({
    token,
    employee: {
      id: employee.id,
      name: employee.name,
      role: employee.role,
      phone: employee.phone,
      email: employee.email ?? null,
      isActive: employee.isActive,
      createdAt: employee.createdAt.toISOString(),
    },
  });
});

export default router;
