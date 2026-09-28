import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, requireAuth, eq } from "../_lib.js";
import { workoutsTable } from "../../lib/db/src/schema/index.js";
import { and } from "drizzle-orm";
import crypto from "crypto";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = requireAuth(req, res);
  if (!user) return;
  const db = getDb();

  if (req.method === "GET") {
    const id = req.query.id as string | undefined;
    if (id) {
      const rows = await db.select().from(workoutsTable)
        .where(and(eq(workoutsTable.id, id), eq(workoutsTable.userId, user.id)));
      if (rows.length === 0) return res.status(404).json({ error: "Not found" });
      const workout = { ...rows[0], targetAreas: typeof rows[0].targetAreas === "string" ? JSON.parse(rows[0].targetAreas) : rows[0].targetAreas };
      return res.status(200).json({ workout });
    }
    const rows = await db.select().from(workoutsTable)
      .where(eq(workoutsTable.userId, user.id));
    const workouts = rows.map((w) => ({
      ...w,
      notes: w.notes ?? undefined,
      targetAreas: typeof w.targetAreas === "string" ? JSON.parse(w.targetAreas) : w.targetAreas,
    }));
    return res.status(200).json({ workouts });
  }

  if (req.method === "POST") {
    const { name, activity, date, durationMinutes, caloriesBurned, targetAreas, notes } = req.body;
    if (!name || !activity || !date) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const id = `workout-${crypto.randomUUID().slice(0, 12)}`;
    await db.insert(workoutsTable).values({
      id, userId: user.id, name, activity, date,
      durationMinutes: Number(durationMinutes) || 0,
      caloriesBurned: Number(caloriesBurned) || 0,
      targetAreas: JSON.stringify(targetAreas || []),
      notes: notes || null,
    });
    return res.status(201).json({ id });
  }

  if (req.method === "PUT") {
    const id = req.query.id as string || req.body?.id;
    if (!id) return res.status(400).json({ error: "id is required" });
    const { name, activity, date, durationMinutes, caloriesBurned, targetAreas, notes } = req.body;
    await db.update(workoutsTable).set({
      name, activity, date,
      durationMinutes: Number(durationMinutes) || 0,
      caloriesBurned: Number(caloriesBurned) || 0,
      targetAreas: JSON.stringify(targetAreas || []),
      notes: notes || null,
    }).where(and(eq(workoutsTable.id, id), eq(workoutsTable.userId, user.id)));
    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    const id = req.query.id as string || req.body?.id;
    if (!id) return res.status(400).json({ error: "id is required" });
    await db.delete(workoutsTable).where(and(eq(workoutsTable.id, id), eq(workoutsTable.userId, user.id)));
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, PUT, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
