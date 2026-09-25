import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, requireAuth, eq } from "../lib";
import { mealsTable } from "../../lib/db/src/schema";
import crypto from "crypto";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = requireAuth(req, res);
  if (!user) return;
  const db = getDb();

  if (req.method === "GET") {
    const meals = await db.select().from(mealsTable)
      .where(eq(mealsTable.userId, user.id));
    return res.status(200).json({ meals });
  }

  if (req.method === "POST") {
    const { name, mealType, date, time, calories, protein, carbs, fat, imageDataUrl } = req.body;
    if (!name || !mealType || !date || !time) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const id = `meal-${crypto.randomUUID().slice(0, 12)}`;
    await db.insert(mealsTable).values({
      id, userId: user.id, name, mealType, date, time,
      calories: Number(calories) || 0, protein: Number(protein) || 0,
      carbs: Number(carbs) || 0, fat: Number(fat) || 0,
      imageDataUrl: imageDataUrl || null,
    });
    return res.status(201).json({ id });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
