import { Router, type IRouter } from "express";
import { eq, and, gte, lte, lt, gt, sql, ne } from "drizzle-orm";
import { db, reservationsTable, roomsTable, guestsTable, employeesTable } from "@workspace/db";
import {
  ListReservationsQueryParams,
  CreateReservationBody,
  GetReservationParams,
  UpdateReservationParams,
  UpdateReservationBody,
  DeleteReservationParams,
  CheckInReservationParams,
  CheckOutReservationParams,
  CancelReservationParams,
  ExportReservationsCSVQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getReservationDetail(id: number) {
  const result = await db
    .select()
    .from(reservationsTable)
    .innerJoin(roomsTable, eq(reservationsTable.roomId, roomsTable.id))
    .innerJoin(guestsTable, eq(reservationsTable.guestId, guestsTable.id))
    .innerJoin(employeesTable, eq(reservationsTable.employeeId, employeesTable.id))
    .where(eq(reservationsTable.id, id));

  if (result.length === 0) return null;
  const { reservations, rooms, guests, employees } = result[0];
  return formatReservationDetail(reservations, rooms, guests, employees);
}

function formatReservationDetail(
  res: typeof reservationsTable.$inferSelect,
  room: typeof roomsTable.$inferSelect,
  guest: typeof guestsTable.$inferSelect,
  emp: typeof employeesTable.$inferSelect
) {
  return {
    id: res.id,
    roomId: res.roomId,
    guestId: res.guestId,
    employeeId: res.employeeId,
    checkInDate: res.checkInDate,
    checkOutDate: res.checkOutDate,
    status: res.status,
    totalAmount: parseFloat(res.totalAmount),
    paymentReceiptNumber: res.paymentReceiptNumber,
    notes: res.notes ?? null,
    createdAt: res.createdAt.toISOString(),
    room: {
      id: room.id,
      number: room.number,
      status: room.status,
      description: room.description ?? null,
      createdAt: room.createdAt.toISOString(),
    },
    guest: {
      id: guest.id,
      name: guest.name,
      phone: guest.phone,
      nationalId: guest.nationalId,
      email: guest.email ?? null,
      nationality: guest.nationality ?? null,
      createdAt: guest.createdAt.toISOString(),
    },
    employee: {
      id: emp.id,
      name: emp.name,
      role: emp.role,
      phone: emp.phone,
      email: emp.email ?? null,
      createdAt: emp.createdAt.toISOString(),
    },
  };
}

// CSV export must be registered BEFORE /:id to avoid route conflict
router.get("/reservations/export/csv", async (req, res): Promise<void> => {
  const query = ExportReservationsCSVQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [];
  if (query.data.status) conditions.push(eq(reservationsTable.status, query.data.status));
  if (query.data.startDate) conditions.push(gte(reservationsTable.checkInDate, query.data.startDate));
  if (query.data.endDate) conditions.push(lte(reservationsTable.checkOutDate, query.data.endDate));

  const rows = await (conditions.length > 0
    ? db.select().from(reservationsTable)
        .innerJoin(roomsTable, eq(reservationsTable.roomId, roomsTable.id))
        .innerJoin(guestsTable, eq(reservationsTable.guestId, guestsTable.id))
        .innerJoin(employeesTable, eq(reservationsTable.employeeId, employeesTable.id))
        .where(and(...conditions))
        .orderBy(reservationsTable.createdAt)
    : db.select().from(reservationsTable)
        .innerJoin(roomsTable, eq(reservationsTable.roomId, roomsTable.id))
        .innerJoin(guestsTable, eq(reservationsTable.guestId, guestsTable.id))
        .innerJoin(employeesTable, eq(reservationsTable.employeeId, employeesTable.id))
        .orderBy(reservationsTable.createdAt));

  const header = "رقم الحجز,رقم الغرفة,اسم الضيف,رقم الهوية,الجنسية,هاتف الضيف,اسم الموظف,دور الموظف,تاريخ الوصول,تاريخ المغادرة,الحالة,المبلغ الإجمالي,رقم إيصال الدفع,ملاحظات,تاريخ الإنشاء\n";

  const csvRows = rows.map(({ reservations: r, rooms: rm, guests: g, employees: e }) => {
    const fields = [
      r.id, rm.number,
      g.name, g.nationalId, g.nationality ?? "",
      g.phone, e.name, e.role,
      r.checkInDate, r.checkOutDate, r.status,
      parseFloat(r.totalAmount), r.paymentReceiptNumber,
      (r.notes ?? "").replace(/,/g, ";"),
      r.createdAt.toISOString(),
    ];
    return fields.map((f) => `"${f}"`).join(",");
  });

  const csv = "\uFEFF" + header + csvRows.join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="reservations-export.csv"`);
  res.send(csv);
});

router.get("/reservations", async (req, res): Promise<void> => {
  const query = ListReservationsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [];
  if (query.data.status) conditions.push(eq(reservationsTable.status, query.data.status));
  if (query.data.employeeId) conditions.push(eq(reservationsTable.employeeId, query.data.employeeId));
  if (query.data.roomId) conditions.push(eq(reservationsTable.roomId, query.data.roomId));
  if (query.data.checkInDate) conditions.push(gte(reservationsTable.checkInDate, query.data.checkInDate));
  if (query.data.checkOutDate) conditions.push(lte(reservationsTable.checkOutDate, query.data.checkOutDate));

  const rows = await (conditions.length > 0
    ? db.select().from(reservationsTable)
        .innerJoin(roomsTable, eq(reservationsTable.roomId, roomsTable.id))
        .innerJoin(guestsTable, eq(reservationsTable.guestId, guestsTable.id))
        .innerJoin(employeesTable, eq(reservationsTable.employeeId, employeesTable.id))
        .where(and(...conditions))
        .orderBy(sql`${reservationsTable.createdAt} DESC`)
    : db.select().from(reservationsTable)
        .innerJoin(roomsTable, eq(reservationsTable.roomId, roomsTable.id))
        .innerJoin(guestsTable, eq(reservationsTable.guestId, guestsTable.id))
        .innerJoin(employeesTable, eq(reservationsTable.employeeId, employeesTable.id))
        .orderBy(sql`${reservationsTable.createdAt} DESC`));

  res.json(rows.map(({ reservations: r, rooms: rm, guests: g, employees: e }) =>
    formatReservationDetail(r, rm, g, e)
  ));
});

router.post("/reservations", async (req, res): Promise<void> => {
  const parsed = CreateReservationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let reservationId: number;

  try {
    await db.transaction(async (tx) => {
      // Lock the room row and check availability atomically
      const [room] = await tx
        .select()
        .from(roomsTable)
        .where(eq(roomsTable.id, parsed.data.roomId))
        .for("update");

      if (!room) throw Object.assign(new Error("الغرفة غير موجودة"), { status: 400 });
      if (room.status === "maintenance") throw Object.assign(new Error("الغرفة تحت الصيانة ولا يمكن حجزها"), { status: 400 });

      // Check for overlapping active reservations for this room
      const overlapping = await tx
        .select({ id: reservationsTable.id })
        .from(reservationsTable)
        .where(
          and(
            eq(reservationsTable.roomId, parsed.data.roomId),
            // Overlap condition: new.checkIn < existing.checkOut AND new.checkOut > existing.checkIn
            lt(reservationsTable.checkInDate, parsed.data.checkOutDate),
            gt(reservationsTable.checkOutDate, parsed.data.checkInDate),
            // Ignore cancelled/checked_out reservations
            sql`${reservationsTable.status} NOT IN ('cancelled', 'checked_out')`
          )
        );

      if (overlapping.length > 0) {
        throw Object.assign(
          new Error("الغرفة محجوزة خلال هذه الفترة، يرجى اختيار تواريخ أخرى أو غرفة مختلفة"),
          { status: 409 }
        );
      }

      const [reservation] = await tx.insert(reservationsTable).values({
        roomId: parsed.data.roomId,
        guestId: parsed.data.guestId,
        employeeId: parsed.data.employeeId,
        checkInDate: parsed.data.checkInDate,
        checkOutDate: parsed.data.checkOutDate,
        status: "confirmed",
        totalAmount: String(parsed.data.totalAmount ?? 0),
        paymentReceiptNumber: parsed.data.paymentReceiptNumber,
        notes: parsed.data.notes ?? null,
      }).returning();

      await tx.update(roomsTable).set({ status: "reserved" }).where(eq(roomsTable.id, parsed.data.roomId));
      reservationId = reservation.id;
    });
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    res.status(e.status ?? 500).json({ error: e.message ?? "Internal error" });
    return;
  }

  const detail = await getReservationDetail(reservationId!);
  res.status(201).json(detail);
});

router.get("/reservations/:id", async (req, res): Promise<void> => {
  const params = GetReservationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const detail = await getReservationDetail(params.data.id);
  if (!detail) {
    res.status(404).json({ error: "Reservation not found" });
    return;
  }

  res.json(detail);
});

// PATCH is restricted to safe metadata fields only — lifecycle transitions
// (check-in, check-out, cancel) go through dedicated endpoints
router.patch("/reservations/:id", async (req, res): Promise<void> => {
  const params = UpdateReservationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateReservationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Only allow metadata edits; status and roomId changes must go through
  // the dedicated lifecycle endpoints to keep room state consistent
  const updateData: Record<string, unknown> = {};
  if (parsed.data.guestId !== undefined) updateData.guestId = parsed.data.guestId;
  if (parsed.data.employeeId !== undefined) updateData.employeeId = parsed.data.employeeId;
  if (parsed.data.checkInDate !== undefined) updateData.checkInDate = parsed.data.checkInDate;
  if (parsed.data.checkOutDate !== undefined) updateData.checkOutDate = parsed.data.checkOutDate;
  if (parsed.data.totalAmount !== undefined) updateData.totalAmount = String(parsed.data.totalAmount);
  if (parsed.data.paymentReceiptNumber !== undefined) updateData.paymentReceiptNumber = parsed.data.paymentReceiptNumber;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "No updatable fields provided" });
    return;
  }

  const [updated] = await db
    .update(reservationsTable)
    .set(updateData)
    .where(eq(reservationsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Reservation not found" });
    return;
  }

  const detail = await getReservationDetail(updated.id);
  res.json(detail);
});

router.delete("/reservations/:id", async (req, res): Promise<void> => {
  const params = DeleteReservationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    await db.transaction(async (tx) => {
      const [reservation] = await tx
        .select()
        .from(reservationsTable)
        .where(eq(reservationsTable.id, params.data.id))
        .for("update");

      if (!reservation) throw Object.assign(new Error("Reservation not found"), { status: 404 });

      await tx.delete(reservationsTable).where(eq(reservationsTable.id, params.data.id));

      // Free the room if still active
      if (["confirmed", "reserved", "checked_in", "pending"].includes(reservation.status)) {
        await tx.update(roomsTable).set({ status: "available" }).where(eq(roomsTable.id, reservation.roomId));
      }
    });
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    res.status(e.status ?? 500).json({ error: e.message ?? "Internal error" });
    return;
  }

  res.sendStatus(204);
});

router.patch("/reservations/:id/checkin", async (req, res): Promise<void> => {
  const params = CheckInReservationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    await db.transaction(async (tx) => {
      const [reservation] = await tx
        .select()
        .from(reservationsTable)
        .where(eq(reservationsTable.id, params.data.id))
        .for("update");

      if (!reservation) throw Object.assign(new Error("Reservation not found"), { status: 404 });

      await tx
        .update(reservationsTable)
        .set({ status: "checked_in" })
        .where(eq(reservationsTable.id, params.data.id));

      await tx
        .update(roomsTable)
        .set({ status: "occupied" })
        .where(eq(roomsTable.id, reservation.roomId));
    });
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    res.status(e.status ?? 500).json({ error: e.message ?? "Internal error" });
    return;
  }

  const detail = await getReservationDetail(params.data.id);
  res.json(detail);
});

router.patch("/reservations/:id/checkout", async (req, res): Promise<void> => {
  const params = CheckOutReservationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    await db.transaction(async (tx) => {
      const [reservation] = await tx
        .select()
        .from(reservationsTable)
        .where(eq(reservationsTable.id, params.data.id))
        .for("update");

      if (!reservation) throw Object.assign(new Error("Reservation not found"), { status: 404 });

      await tx
        .update(reservationsTable)
        .set({ status: "checked_out" })
        .where(eq(reservationsTable.id, params.data.id));

      await tx
        .update(roomsTable)
        .set({ status: "available" })
        .where(eq(roomsTable.id, reservation.roomId));
    });
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    res.status(e.status ?? 500).json({ error: e.message ?? "Internal error" });
    return;
  }

  const detail = await getReservationDetail(params.data.id);
  res.json(detail);
});

router.patch("/reservations/:id/cancel", async (req, res): Promise<void> => {
  const params = CancelReservationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    await db.transaction(async (tx) => {
      const [reservation] = await tx
        .select()
        .from(reservationsTable)
        .where(eq(reservationsTable.id, params.data.id))
        .for("update");

      if (!reservation) throw Object.assign(new Error("Reservation not found"), { status: 404 });

      await tx
        .update(reservationsTable)
        .set({ status: "cancelled" })
        .where(eq(reservationsTable.id, params.data.id));

      if (["confirmed", "reserved", "checked_in", "pending"].includes(reservation.status)) {
        await tx
          .update(roomsTable)
          .set({ status: "available" })
          .where(eq(roomsTable.id, reservation.roomId));
      }
    });
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    res.status(e.status ?? 500).json({ error: e.message ?? "Internal error" });
    return;
  }

  const detail = await getReservationDetail(params.data.id);
  res.json(detail);
});

export default router;
