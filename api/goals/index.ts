import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, requireAuth, eq } from "../lib";
import { goalsTable } from "../../lib/db/src/schema";
import { goalsSchema } from "../../lib/db/src/schema/goals";
import crypto from "crypto";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = requireAuth(req, res);
  if (!user) return;
  const db = getDb();

  if (req.method === "GET") {
    const goals = await db.select().from(goalsTable)
      .where(eq(goalsTable.userId, user.id));
    if (goals.length === 0) {
      return res.status(200).json({ goals: { calories: 2100, protein: 120, carbs: 230, fat: 70 } });
    }
    const g = goals[0];
    return res.status(200).json({ goals: { calories: g.calories, protein: g.protein, carbs: g.carbs, fat: g.fat } });
  }

  if (req.method === "PUT") {
    const parsed = goalsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    }

    const existing = await db.select().from(goalsTable)
      .where(eq(goalsTable.userId, user.id));

    if (existing.length === 0) {
      await db.insert(goalsTable).values({
        id: `goals-${crypto.randomUUID().slice(0, 12)}`,
        userId: user.id,
        ...parsed.data,
      });
    } else {
      await db.update(goalsTable).set({
        calories: parsed.data.calories,
        protein: parsed.data.protein,
        carbs: parsed.data.carbs,
        fat: parsed.data.fat,
        updatedAt: new Date(),
      }).where(eq(goalsTable.userId, user.id));
    }

    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, PUT");
  return res.status(405).json({ error: "Method not allowed" });
}
