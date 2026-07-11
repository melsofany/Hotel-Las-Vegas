import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, roomsTable } from "@workspace/db";
import {
  ListRoomsQueryParams,
  CreateRoomBody,
  GetRoomParams,
  UpdateRoomParams,
  UpdateRoomBody,
  DeleteRoomParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/rooms", async (req, res): Promise<void> => {
  const query = ListRoomsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let rooms = await db.select().from(roomsTable);
  rooms.sort((a, b) => compareRoomNumbers(a.number, b.number));

  if (query.data.status) {
    rooms = rooms.filter((r) => r.status === query.data.status);
  }

  res.json(rooms.map(formatRoom));
});

// Room numbers are stored as free-text (e.g. "12", "101A"), so a plain
// lexicographic sort would order them as "1, 10, 11, ..., 2, 20, ...".
// Compare numerically when both sides are pure numbers, and fall back to a
// natural (numeric-aware) string comparison otherwise.
const roomNumberCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function compareRoomNumbers(a: string, b: string): number {
  const aNum = Number(a);
  const bNum = Number(b);
  if (Number.isFinite(aNum) && Number.isFinite(bNum) && a.trim() !== "" && b.trim() !== "") {
    return aNum - bNum;
  }
  return roomNumberCollator.compare(a, b);
}

router.post("/rooms", async (req, res): Promise<void> => {
  const parsed = CreateRoomBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [room] = await db.insert(roomsTable).values({
    number: parsed.data.number,
    status: "available",
    description: parsed.data.description ?? null,
  }).returning();

  res.status(201).json(formatRoom(room));
});

router.get("/rooms/:id", async (req, res): Promise<void> => {
  const params = GetRoomParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, params.data.id));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  res.json(formatRoom(room));
});

router.patch("/rooms/:id", async (req, res): Promise<void> => {
  const params = UpdateRoomParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateRoomBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.number !== undefined) updateData.number = parsed.data.number;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;

  const [room] = await db.update(roomsTable).set(updateData).where(eq(roomsTable.id, params.data.id)).returning();
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  res.json(formatRoom(room));
});

router.delete("/rooms/:id", async (req, res): Promise<void> => {
  const params = DeleteRoomParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [room] = await db.delete(roomsTable).where(eq(roomsTable.id, params.data.id)).returning();
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  res.sendStatus(204);
});

function formatRoom(room: typeof roomsTable.$inferSelect) {
  return {
    id: room.id,
    number: room.number,
    status: room.status,
    description: room.description ?? null,
    createdAt: room.createdAt.toISOString(),
  };
}

export default router;
