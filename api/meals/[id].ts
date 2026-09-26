import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, requireAuth, eq } from "../lib.js";
import { mealsTable } from "../../lib/db/src/schema/index.js";
import { and } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = requireAuth(req, res);
  if (!user) return;
  const db = getDb();
  const id = req.query.id as string;

  if (req.method === "GET") {
    const rows = await db.select().from(mealsTable)
      .where(and(eq(mealsTable.id, id), eq(mealsTable.userId, user.id)));
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    const meal = { ...rows[0], imageDataUrl: rows[0].imageDataUrl ?? undefined };
    return res.status(200).json({ meal });
  }

  if (req.method === "PUT") {
    const { name, mealType, date, time, calories, protein, carbs, fat, imageDataUrl } = req.body;
    await db.update(mealsTable).set({
      name, mealType, date, time,
      calories: Number(calories) || 0, protein: Number(protein) || 0,
      carbs: Number(carbs) || 0, fat: Number(fat) || 0,
      imageDataUrl: imageDataUrl || null,
    }).where(and(eq(mealsTable.id, id), eq(mealsTable.userId, user.id)));
    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    await db.delete(mealsTable).where(and(eq(mealsTable.id, id), eq(mealsTable.userId, user.id)));
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, PUT, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
