import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, requireAuth, eq } from "../lib.js";
import { mealsTable, workoutsTable, waterLogsTable } from "../../lib/db/src/schema/index.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = requireAuth(req, res);
  if (!user) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const db = getDb();
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
