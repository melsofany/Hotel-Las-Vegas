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
  occupants: integer("occupants").notNull().default(1), // number of guests staying in the room, must not exceed room capacity
  status: text("status").notNull().default("pending"), // pending, confirmed, checked_in, checked_out, cancelled
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  depositAmount: numeric("deposit_amount", { precision: 10, scale: 2 }).notNull().default("0"), // advance payment made at booking time; remaining = totalAmount - depositAmount
  paymentReceiptNumber: text("payment_receipt_number").notNull(),
  receiptImageUrl: text("receipt_image_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertReservationSchema = createInsertSchema(reservationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReservation = z.infer<typeof insertReservationSchema>;
export type Reservation = typeof reservationsTable.$inferSelect;
