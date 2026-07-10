import { Router, type IRouter } from "express";
import { eq, count, sql } from "drizzle-orm";
import { db, roomsTable, reservationsTable, employeesTable } from "@workspace/db";
import { guestsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];

  const [roomStats] = await db
    .select({
      totalRooms: count(),
      occupiedRooms: sql<number>`COUNT(CASE WHEN ${roomsTable.status} = 'occupied' THEN 1 END)`,
      availableRooms: sql<number>`COUNT(CASE WHEN ${roomsTable.status} = 'available' THEN 1 END)`,
      reservedRooms: sql<number>`COUNT(CASE WHEN ${roomsTable.status} = 'reserved' THEN 1 END)`,
    })
    .from(roomsTable);

  const [resStats] = await db
    .select({
      totalReservations: count(),
      activeReservations: sql<number>`COUNT(CASE WHEN ${reservationsTable.status} IN ('confirmed', 'checked_in') THEN 1 END)`,
      todayCheckIns: sql<number>`COUNT(CASE WHEN ${reservationsTable.checkInDate} = ${today} AND ${reservationsTable.status} IN ('confirmed', 'checked_in') THEN 1 END)`,
      todayCheckOuts: sql<number>`COUNT(CASE WHEN ${reservationsTable.checkOutDate} = ${today} AND ${reservationsTable.status} = 'checked_in' THEN 1 END)`,
    })
    .from(reservationsTable);

  const monthStart = today.substring(0, 7) + "-01"; // YYYY-MM-01
  const monthEnd = today.substring(0, 7) + "-31";   // YYYY-MM-31 (safe upper bound)
  const [revenueStats] = await db
    .select({
      monthlyRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${reservationsTable.checkInDate} >= ${monthStart} AND ${reservationsTable.checkInDate} <= ${monthEnd} THEN ${reservationsTable.totalAmount}::numeric ELSE 0 END), 0)`,
      totalRevenue: sql<number>`COALESCE(SUM(${reservationsTable.totalAmount}::numeric), 0)`,
    })
    .from(reservationsTable)
    .where(sql`${reservationsTable.status} != 'cancelled'`);

  res.json({
    totalRooms: Number(roomStats.totalRooms),
    occupiedRooms: Number(roomStats.occupiedRooms),
    availableRooms: Number(roomStats.availableRooms),
    reservedRooms: Number(roomStats.reservedRooms),
    totalReservations: Number(resStats.totalReservations),
    activeReservations: Number(resStats.activeReservations),
    todayCheckIns: Number(resStats.todayCheckIns),
    todayCheckOuts: Number(resStats.todayCheckOuts),
    monthlyRevenue: parseFloat(String(revenueStats.monthlyRevenue)) || 0,
    totalRevenue: parseFloat(String(revenueStats.totalRevenue)) || 0,
  });
});

router.get("/dashboard/occupancy", async (_req, res): Promise<void> => {
  const rooms = await db.select().from(roomsTable);

  const types = ["standard", "deluxe", "suite", "penthouse"];
  const result = types.map((type) => {
    const typeRooms = rooms.filter((r) => r.type === type);
    const occupied = typeRooms.filter((r) => r.status === "occupied" || r.status === "reserved").length;
    return {
      type,
      total: typeRooms.length,
      occupied,
      available: typeRooms.filter((r) => r.status === "available").length,
    };
  }).filter((item) => item.total > 0);

  res.json(result);
});

router.get("/dashboard/recent-reservations", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(reservationsTable)
    .innerJoin(roomsTable, eq(reservationsTable.roomId, roomsTable.id))
    .innerJoin(guestsTable, eq(reservationsTable.guestId, guestsTable.id))
    .innerJoin(employeesTable, eq(reservationsTable.employeeId, employeesTable.id))
    .orderBy(sql`${reservationsTable.createdAt} DESC`)
    .limit(10);

  res.json(rows.map(({ reservations: r, rooms: rm, guests: g, employees: e }) => ({
    id: r.id,
    roomId: r.roomId,
    guestId: r.guestId,
    employeeId: r.employeeId,
    checkInDate: r.checkInDate,
    checkOutDate: r.checkOutDate,
    status: r.status,
    totalAmount: parseFloat(r.totalAmount),
    paymentReceiptNumber: r.paymentReceiptNumber,
    notes: r.notes ?? null,
    createdAt: r.createdAt.toISOString(),
    room: {
      id: rm.id,
      number: rm.number,
      type: rm.type,
      floor: rm.floor,
      status: rm.status,
      pricePerNight: parseFloat(rm.pricePerNight),
      description: rm.description ?? null,
      createdAt: rm.createdAt.toISOString(),
    },
    guest: {
      id: g.id,
      name: g.name,
      phone: g.phone,
      nationalId: g.nationalId,
      email: g.email ?? null,
      nationality: g.nationality ?? null,
      createdAt: g.createdAt.toISOString(),
    },
    employee: {
      id: e.id,
      name: e.name,
      role: e.role,
      phone: e.phone,
      email: e.email ?? null,
      createdAt: e.createdAt.toISOString(),
    },
  })));
});

router.get("/dashboard/employee-stats", async (_req, res): Promise<void> => {
  const employees = await db.select().from(employeesTable);
  const reservations = await db.select().from(reservationsTable);

  const stats = employees.map((emp) => {
    const empReservations = reservations.filter((r) => r.employeeId === emp.id);
    const activeReservations = empReservations.filter((r) =>
      ["confirmed", "checked_in"].includes(r.status)
    ).length;
    return {
      employeeId: emp.id,
      employeeName: emp.name,
      role: emp.role,
      totalReservations: empReservations.length,
      activeReservations,
    };
  });

  res.json(stats.sort((a, b) => b.totalReservations - a.totalReservations));
});

export default router;
