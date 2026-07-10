import { pgTable, text, serial, integer, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { roomsTable } from "./rooms";
import { employeesTable } from "./employees";
import { guestsTable } from "./guests";

export const reservationsTable = pgTable("reservations", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull().references(() => roomsTable.id),
  guestId: integer("guest_id").notNull().references(() => guestsTable.id),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id),
  checkInDate: date("check_in_date", { mode: "string" }).notNull(),
  checkOutDate: date("check_out_date", { mode: "string" }).notNull(),
  status: text("status").notNull().default("pending"), // pending, confirmed, checked_in, checked_out, cancelled
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  paymentReceiptNumber: text("payment_receipt_number").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertReservationSchema = createInsertSchema(reservationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReservation = z.infer<typeof insertReservationSchema>;
export type Reservation = typeof reservationsTable.$inferSelect;
