import { Router, type IRouter } from "express";
import { eq, ilike, or } from "drizzle-orm";
import { db, guestsTable } from "@workspace/db";
import {
  ListGuestsQueryParams,
  CreateGuestBody,
  GetGuestParams,
  UpdateGuestParams,
  UpdateGuestBody,
  DeleteGuestParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/guests", async (req, res): Promise<void> => {
  const query = ListGuestsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let guests;
  if (query.data.search) {
    const search = `%${query.data.search}%`;
    guests = await db.select().from(guestsTable).where(
      or(
        ilike(guestsTable.name, search),
        ilike(guestsTable.phone, search),
        ilike(guestsTable.nationalId, search),
      )
    ).orderBy(guestsTable.name);
  } else {
    guests = await db.select().from(guestsTable).orderBy(guestsTable.name);
  }

  res.json(guests.map(formatGuest));
});

router.post("/guests", async (req, res): Promise<void> => {
  const parsed = CreateGuestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [guest] = await db.insert(guestsTable).values({
    name: parsed.data.name,
    phone: parsed.data.phone,
    nationalId: parsed.data.nationalId,
    email: parsed.data.email ?? null,
    nationality: parsed.data.nationality ?? null,
  }).returning();

  res.status(201).json(formatGuest(guest));
});

router.get("/guests/:id", async (req, res): Promise<void> => {
  const params = GetGuestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [guest] = await db.select().from(guestsTable).where(eq(guestsTable.id, params.data.id));
  if (!guest) {
    res.status(404).json({ error: "Guest not found" });
    return;
  }

  res.json(formatGuest(guest));
});

router.patch("/guests/:id", async (req, res): Promise<void> => {
  const params = UpdateGuestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateGuestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;
  if (parsed.data.nationalId !== undefined) updateData.nationalId = parsed.data.nationalId;
  if (parsed.data.email !== undefined) updateData.email = parsed.data.email;
  if (parsed.data.nationality !== undefined) updateData.nationality = parsed.data.nationality;

  const [guest] = await db.update(guestsTable).set(updateData).where(eq(guestsTable.id, params.data.id)).returning();
  if (!guest) {
    res.status(404).json({ error: "Guest not found" });
    return;
  }

  res.json(formatGuest(guest));
});

router.delete("/guests/:id", async (req, res): Promise<void> => {
  const params = DeleteGuestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [guest] = await db.delete(guestsTable).where(eq(guestsTable.id, params.data.id)).returning();
  if (!guest) {
    res.status(404).json({ error: "Guest not found" });
    return;
  }

  res.sendStatus(204);
});

function formatGuest(guest: typeof guestsTable.$inferSelect) {
  return {
    id: guest.id,
    name: guest.name,
    phone: guest.phone,
    nationalId: guest.nationalId,
    email: guest.email ?? null,
    nationality: guest.nationality ?? null,
    createdAt: guest.createdAt.toISOString(),
  };
}

export default router;
