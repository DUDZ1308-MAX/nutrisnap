import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, requireAuth, eq } from "../lib.js";
import { mealsTable } from "../../lib/db/src/schema/index.js";
import { and } from "drizzle-orm";
import crypto from "crypto";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = requireAuth(req, res);
  if (!user) return;
  const db = getDb();

  if (req.method === "GET") {
    // Single meal by ID: /api/meals?id=xxx
    const id = req.query.id as string | undefined;
    if (id) {
      const rows = await db.select().from(mealsTable)
        .where(and(eq(mealsTable.id, id), eq(mealsTable.userId, user.id)));
      if (rows.length === 0) return res.status(404).json({ error: "Not found" });
      const meal = { ...rows[0], imageDataUrl: rows[0].imageDataUrl ?? undefined };
      return res.status(200).json({ meal });
    }
    const rows = await db.select().from(mealsTable)
      .where(eq(mealsTable.userId, user.id));
    const meals = rows.map((m) => ({
      ...m,
      imageDataUrl: m.imageDataUrl ?? undefined,
    }));
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

  if (req.method === "PUT") {
    const id = req.query.id as string || req.body?.id;
    if (!id) return res.status(400).json({ error: "id is required" });
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
    const id = req.query.id as string || req.body?.id;
    if (!id) return res.status(400).json({ error: "id is required" });
    await db.delete(mealsTable).where(and(eq(mealsTable.id, id), eq(mealsTable.userId, user.id)));
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, PUT, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
