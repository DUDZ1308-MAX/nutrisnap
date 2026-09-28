import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, requireAuth, eq, and } from "../_lib.js";
import { savedMealsTable } from "../../lib/db/src/schema/index.js";
import crypto from "crypto";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = requireAuth(req, res);
  if (!user) return;
  const db = getDb();

  if (req.method === "GET") {
    const rows = await db.select().from(savedMealsTable)
      .where(eq(savedMealsTable.userId, user.id));
    return res.status(200).json({ savedMeals: rows });
  }

  if (req.method === "POST") {
    const { name, mealType, calories, protein, carbs, fat } = req.body;
    if (!name || !mealType) return res.status(400).json({ error: "name and mealType are required" });
    const id = `saved-${crypto.randomUUID().slice(0, 12)}`;
    await db.insert(savedMealsTable).values({
      id,
      userId: user.id,
      name,
      mealType,
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
    });
    return res.status(201).json({ id });
  }

  if (req.method === "DELETE") {
    const id = req.query.id as string || req.body?.id;
    if (!id) return res.status(400).json({ error: "id is required" });
    await db.delete(savedMealsTable).where(and(eq(savedMealsTable.id, id), eq(savedMealsTable.userId, user.id)));
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
