import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, employeesTable } from "@workspace/db";
import { LoginByPhoneBody } from "@workspace/api-zod";

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

  const token = Buffer.from(`employee:${employee.id}:${Date.now()}`).toString("base64url");

  res.json({
    token,
    employee: {
      id: employee.id,
      name: employee.name,
      role: employee.role,
      phone: employee.phone,
      email: employee.email ?? null,
      createdAt: employee.createdAt.toISOString(),
    },
  });
});

export default router;
