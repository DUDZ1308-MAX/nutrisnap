import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, requireAuth, eq } from "../_lib.js";
import { goalsTable, mealsTable, workoutsTable, waterLogsTable } from "../../lib/db/src/schema/index.js";
import { goalsSchema } from "../../lib/db/src/schema/goals.js";
import crypto from "crypto";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = requireAuth(req, res);
  if (!user) return;
  const db = getDb();

  if (req.method === "GET") {
    // Weekly summary: /api/goals?summary=week
    if (req.query.summary === "week") {
      const today = new Date();
      const days: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().slice(0, 10));
      }

      const allMeals = await db.select().from(mealsTable).where(eq(mealsTable.userId, user.id));
      const allWorkouts = await db.select().from(workoutsTable).where(eq(workoutsTable.userId, user.id));
      const allWater = await db.select().from(waterLogsTable).where(eq(waterLogsTable.userId, user.id));

      const dayData = days.map((date) => {
        const dayMeals = allMeals.filter((m) => m.date === date);
        const dayWorkouts = allWorkouts.filter((w) => w.date === date);
        const dayWater = allWater.filter((w) => w.date === date);
        return {
          date,
          label: new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" }),
          calories: dayMeals.reduce((s, m) => s + m.calories, 0),
          protein: dayMeals.reduce((s, m) => s + m.protein, 0),
          carbs: dayMeals.reduce((s, m) => s + m.carbs, 0),
          fat: dayMeals.reduce((s, m) => s + m.fat, 0),
          workouts: dayWorkouts.length,
          durationMinutes: dayWorkouts.reduce((s, w) => s + w.durationMinutes, 0),
          caloriesBurned: dayWorkouts.reduce((s, w) => s + w.caloriesBurned, 0),
          waterMl: dayWater.reduce((s, w) => s + w.amountMl, 0),
        };
      });

      const daysWithData = dayData.filter((d) => d.calories > 0 || d.workouts > 0 || d.waterMl > 0).length || 1;
      const totals = dayData.reduce(
        (acc, d) => ({
          calories: acc.calories + d.calories,
          protein: acc.protein + d.protein,
          carbs: acc.carbs + d.carbs,
          fat: acc.fat + d.fat,
          workouts: acc.workouts + d.workouts,
          durationMinutes: acc.durationMinutes + d.durationMinutes,
          caloriesBurned: acc.caloriesBurned + d.caloriesBurned,
          waterMl: acc.waterMl + d.waterMl,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0, workouts: 0, durationMinutes: 0, caloriesBurned: 0, waterMl: 0 },
      );

      const averages = {
        calories: Math.round(totals.calories / daysWithData),
        protein: Math.round(totals.protein / daysWithData),
        carbs: Math.round(totals.carbs / daysWithData),
        fat: Math.round(totals.fat / daysWithData),
        workouts: Math.round((totals.workouts / 7) * 10) / 10,
        waterMl: Math.round(totals.waterMl / daysWithData),
      };

      return res.status(200).json({ days: dayData, totals, averages });
    }

    // Default: get goals
    const goals = await db.select().from(goalsTable)
      .where(eq(goalsTable.userId, user.id));
    if (goals.length === 0) {
      return res.status(200).json({ goals: { calories: 2100, protein: 120, carbs: 230, fat: 70, waterMl: 2500 } });
    }
    const g = goals[0];
    return res.status(200).json({ goals: { calories: g.calories, protein: g.protein, carbs: g.carbs, fat: g.fat, waterMl: g.waterMl } });
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
        waterMl: parsed.data.waterMl,
        updatedAt: new Date(),
      }).where(eq(goalsTable.userId, user.id));
    }

    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, PUT");
  return res.status(405).json({ error: "Method not allowed" });
}
