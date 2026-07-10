import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, employeesTable } from "@workspace/db";
import {
  CreateEmployeeBody,
  GetEmployeeParams,
  UpdateEmployeeParams,
  UpdateEmployeeBody,
  DeleteEmployeeParams,
} from "@workspace/api-zod";
import { hashPassword } from "../lib/password";
import { parseToken } from "../lib/auth-token";

const router: IRouter = Router();

async function requireAdmin(req: import("express").Request, res: import("express").Response): Promise<boolean> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const parsedToken = token ? parseToken(token) : null;

  if (!parsedToken) {
    res.status(401).json({ error: "يجب تسجيل الدخول" });
    return false;
  }

  const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, parsedToken.employeeId));
  if (!employee || employee.role !== "admin") {
    res.status(403).json({ error: "هذا الإجراء متاح لمدير النظام فقط" });
    return false;
  }

  return true;
}

router.get("/employees", async (_req, res): Promise<void> => {
  const employees = await db.select().from(employeesTable).orderBy(employeesTable.name);
  res.json(employees.map(formatEmployee));
});

router.post("/employees", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const parsed = CreateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [employee] = await db.insert(employeesTable).values({
    name: parsed.data.name,
    role: parsed.data.role ?? "employee",
    phone: parsed.data.phone,
    email: parsed.data.email ?? null,
    passwordHash: hashPassword(parsed.data.password),
  }).returning();

  res.status(201).json(formatEmployee(employee));
});

router.get("/employees/:id", async (req, res): Promise<void> => {
  const params = GetEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, params.data.id));
  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  res.json(formatEmployee(employee));
});

router.patch("/employees/:id", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const params = UpdateEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.role !== undefined) updateData.role = parsed.data.role;
  if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;
  if (parsed.data.email !== undefined) updateData.email = parsed.data.email;
  if (parsed.data.password !== undefined && parsed.data.password !== "") {
    updateData.passwordHash = hashPassword(parsed.data.password);
  }

  const [employee] = await db.update(employeesTable).set(updateData).where(eq(employeesTable.id, params.data.id)).returning();
  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  res.json(formatEmployee(employee));
});

router.delete("/employees/:id", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const params = DeleteEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [employee] = await db.delete(employeesTable).where(eq(employeesTable.id, params.data.id)).returning();
  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  res.sendStatus(204);
});

function formatEmployee(emp: typeof employeesTable.$inferSelect) {
  return {
    id: emp.id,
    name: emp.name,
    role: emp.role,
    phone: emp.phone,
    email: emp.email ?? null,
    createdAt: emp.createdAt.toISOString(),
  };
}

export default router;
