import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, requireAuth, eq } from "../lib.js";
import { workoutsTable } from "../../lib/db/src/schema/index.js";
import { and } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = requireAuth(req, res);
  if (!user) return;
  const db = getDb();
  const id = req.query.id as string;

  if (req.method === "GET") {
    const rows = await db.select().from(workoutsTable)
      .where(and(eq(workoutsTable.id, id), eq(workoutsTable.userId, user.id)));
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    const workout = { ...rows[0], targetAreas: typeof rows[0].targetAreas === "string" ? JSON.parse(rows[0].targetAreas) : rows[0].targetAreas };
    return res.status(200).json({ workout });
  }

  if (req.method === "PUT") {
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
    await db.delete(workoutsTable).where(and(eq(workoutsTable.id, id), eq(workoutsTable.userId, user.id)));
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, PUT, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
