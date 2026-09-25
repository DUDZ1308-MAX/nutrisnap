import { z } from 'zod';
import { useCallback, useEffect, useState } from 'react';
import * as api from './api';

// ── Zod schemas for runtime validation ──────────────────────────────────────

const mealTypeSchema = z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack']);

const mealSchema = z.object({
  id: z.string(),
  name: z.string().max(100),
  mealType: mealTypeSchema,
  date: z.string(),
  time: z.string(),
  calories: z.number().min(0).max(99999),
  protein: z.number().min(0).max(9999),
  carbs: z.number().min(0).max(9999),
  fat: z.number().min(0).max(9999),
  imageDataUrl: z.string().optional(),
});

const workoutTargetSchema = z.enum([
  'chest', 'shoulders', 'biceps', 'triceps', 'back',
  'core', 'glutes', 'quads', 'hamstrings', 'calves',
]);

const workoutSchema = z.object({
  id: z.string(),
  name: z.string().max(100),
  activity: z.string().max(50),
  date: z.string(),
  durationMinutes: z.number().min(0).max(9999),
  caloriesBurned: z.number().min(0).max(99999),
  targetAreas: z.array(workoutTargetSchema),
  notes: z.string().max(500).optional(),
});

const goalsSchema = z.object({
  calories: z.number().min(0).max(99999),
  protein: z.number().min(0).max(9999),
  carbs: z.number().min(0).max(9999),
  fat: z.number().min(0).max(9999),
});

// ── Types ──────────────────────────────────────────────────────────────────

export type MealType = z.infer<typeof mealTypeSchema>;

export type Meal = z.infer<typeof mealSchema>;

export const workoutTargetAreas = [
  { id: 'chest', label: 'Chest' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'biceps', label: 'Biceps' },
  { id: 'triceps', label: 'Triceps' },
  { id: 'back', label: 'Upper back' },
  { id: 'core', label: 'Core' },
  { id: 'glutes', label: 'Glutes' },
  { id: 'quads', label: 'Quads' },
  { id: 'hamstrings', label: 'Hamstrings' },
  { id: 'calves', label: 'Calves' },
] as const;

export type WorkoutTarget = z.infer<typeof workoutTargetSchema>;

export type Workout = z.infer<typeof workoutSchema>;

export type Goals = z.infer<typeof goalsSchema>;

// ── Defaults ───────────────────────────────────────────────────────────────

export const defaultGoals: Goals = {
  calories: 2100,
  protein: 120,
  carbs: 230,
  fat: 70,
};

// ── Data export / import ────────────────────────────────────────────────────

export type NutriSnapExport = {
  version: 1;
  exportedAt: string;
  meals: Meal[];
  workouts: Workout[];
  goals: Goals;
};

export function exportData(meals: Meal[], workouts: Workout[], goals: Goals): NutriSnapExport {
  return { version: 1, exportedAt: new Date().toISOString(), meals, workouts, goals };
}

export function downloadExport(data: NutriSnapExport) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nutrisnap-backup-${data.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseImport(json: string): NutriSnapExport | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed?.version !== 1) return null;
    const meals = z.array(mealSchema).safeParse(parsed.meals);
    const workouts = z.array(workoutSchema).safeParse(parsed.workouts);
    const goals = goalsSchema.safeParse(parsed.goals);
    if (!meals.success || !workouts.success || !goals.success) return null;
    return { version: 1, exportedAt: parsed.exportedAt ?? new Date().toISOString(), meals: meals.data, workouts: workouts.data, goals: goals.data };
  } catch {
    return null;
  }
}

// ── React hook ──────────────────────────────────────────────────────────────

export function todayKey() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function useNutriSnap() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [goals, setGoals] = useState<Goals>(defaultGoals);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([api.getMeals(), api.getWorkouts(), api.getGoals()])
      .then(([mealsData, workoutsData, goalsData]) => {
        const validatedMeals = z.array(mealSchema).safeParse(mealsData);
        const validatedWorkouts = z.array(workoutSchema).safeParse(workoutsData);
        const validatedGoals = goalsSchema.safeParse(goalsData);
        setMeals(validatedMeals.success ? validatedMeals.data : []);
        setWorkouts(validatedWorkouts.success ? validatedWorkouts.data : []);
        setGoals(validatedGoals.success ? validatedGoals.data : defaultGoals);
      })
      .catch(() => {
        setMeals([]);
        setWorkouts([]);
        setGoals(defaultGoals);
      })
      .finally(() => setReady(true));
  }, []);

  const addMeal = useCallback(async (meal: Omit<Meal, 'id'>) => {
    const result = await api.createMeal(meal);
    const newMeal = { ...meal, id: result.id };
    setMeals((prev) => [newMeal, ...prev]);
    return newMeal;
  }, []);

  const updateMeal = useCallback(async (id: string, patch: Omit<Meal, 'id'>) => {
    await api.updateMeal(id, patch);
    setMeals((prev) => prev.map((m) => m.id === id ? { ...patch, id } : m));
  }, []);

  const deleteMeal = useCallback(async (id: string) => {
    await api.deleteMeal(id);
    setMeals((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const addWorkout = useCallback(async (workout: Omit<Workout, 'id'>) => {
    const result = await api.createWorkout(workout);
    const newWorkout = { ...workout, id: result.id };
    setWorkouts((prev) => [newWorkout, ...prev]);
    return newWorkout;
  }, []);

  const updateWorkout = useCallback(async (id: string, patch: Omit<Workout, 'id'>) => {
    await api.updateWorkout(id, patch);
    setWorkouts((prev) => prev.map((w) => w.id === id ? { ...patch, id } : w));
  }, []);

  const deleteWorkout = useCallback(async (id: string) => {
    await api.deleteWorkout(id);
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const saveGoals = useCallback(async (next: Goals) => {
    await api.updateGoals(next);
    setGoals(next);
  }, []);

  return {
    meals,
    workouts,
    goals,
    ready,
    addMeal,
    updateMeal,
    deleteMeal,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    saveGoals,
  };
}
