import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, requireAuth, eq } from "../lib";
import { workoutsTable } from "../../lib/db/src/schema";
import crypto from "crypto";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = requireAuth(req, res);
  if (!user) return;
  const db = getDb();

  if (req.method === "GET") {
    const workouts = await db.select().from(workoutsTable)
      .where(eq(workoutsTable.userId, user.id));
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

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
