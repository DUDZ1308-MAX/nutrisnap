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

const workoutTargetSchema = z.string();

const workoutSchema = z.object({
  id: z.string(),
  name: z.string().max(100),
  activity: z.string().max(50),
  date: z.string(),
  durationMinutes: z.number().min(0).max(9999),
  caloriesBurned: z.number().min(0).max(99999),
  targetAreas: z.array(workoutTargetSchema),
  notes: z.string().max(500).nullish(),
});

const goalsSchema = z.object({
  calories: z.number().min(0).max(99999),
  protein: z.number().min(0).max(9999),
  carbs: z.number().min(0).max(9999),
  fat: z.number().min(0).max(9999),
  waterMl: z.number().min(0).max(99999),
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

export type WaterEntry = { id: string; date: string; amountMl: number };

export type SavedMeal = { id: string; name: string; mealType: string; calories: number; protein: number; carbs: number; fat: number };

export type BodyPhoto = { id: string; date: string; weight?: number; imageDataUrl?: string; notes?: string };

// ── Weight units ───────────────────────────────────────────────────────────
//
// Weights are stored canonically in kilograms (database, API and auth token).
// `units` is a display/input preference only, so every calculation downstream
// (BMI, BMR, calories burned) keeps working on kilograms regardless of what the
// user prefers to see. Conversion happens only at the input/display boundary.

export type WeightUnit = 'kg' | 'lb';

export const weightUnits: WeightUnit[] = ['kg', 'lb'];

const KG_PER_LB = 0.45359237;

export function weightUnitLabel(unit: WeightUnit): string {
  return unit === 'lb' ? 'lb' : 'kg';
}

/** Convert a canonical kilogram value into the user's preferred display unit. */
export function kgToUnit(kg: number | null | undefined, unit: WeightUnit): number | null {
  if (kg == null || Number.isNaN(kg)) return null;
  return unit === 'lb' ? kg / KG_PER_LB : kg;
}

/** Convert a value the user typed in their preferred unit back to kilograms. */
export function unitToKg(value: number | null | undefined, unit: WeightUnit): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return unit === 'lb' ? value * KG_PER_LB : value;
}

/** Format a kilogram value for display, e.g. `70.0 kg` or `154.3 lb`. */
export function formatWeight(kg: number | null | undefined, unit: WeightUnit): string {
  const value = kgToUnit(kg, unit);
  return value == null ? '—' : `${value.toFixed(1)} ${weightUnitLabel(unit)}`;
}

/** Trim trailing zeros for use in a number input, e.g. `154.30` becomes `154.3`. */
export function formatWeightInput(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '';
  return String(Math.round(value * 100) / 100);
}

// ── Defaults ───────────────────────────────────────────────────────────────

export const defaultGoals: Goals = {
  calories: 2100,
  protein: 120,
  carbs: 230,
  fat: 70,
  waterMl: 2500,
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

export function dateKey(date: Date = new Date()): string {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function todayKey() {
  return dateKey();
}

export function dayKeyOffset(days: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

export function useNutriSnap() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [goals, setGoals] = useState<Goals>(defaultGoals);
  const [waterEntries, setWaterEntries] = useState<WaterEntry[]>([]);
  const [waterTotalMl, setWaterTotalMl] = useState(0);
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [bodyPhotos, setBodyPhotos] = useState<BodyPhoto[]>([]);
  const [ready, setReady] = useState(false);

  const today = todayKey();

  useEffect(() => {
    Promise.all([api.getMeals(), api.getWorkouts(), api.getGoals(), api.getWater(today), api.getSavedMeals(), api.getBodyPhotos()])
      .then(([mealsData, workoutsData, goalsData, waterData, savedMealsData, bodyPhotosData]) => {
        const validatedMeals = z.array(mealSchema).safeParse(mealsData);
        const validatedWorkouts = z.array(workoutSchema).safeParse(workoutsData);
        const validatedGoals = goalsSchema.safeParse(goalsData);
        if (!validatedWorkouts.success) console.warn('Workout validation failed:', validatedWorkouts.error.issues);
        setMeals(validatedMeals.success ? validatedMeals.data : []);
        setWorkouts(validatedWorkouts.success ? validatedWorkouts.data : []);
        setGoals(validatedGoals.success ? validatedGoals.data : defaultGoals);
        setWaterEntries(waterData.entries || []);
        setWaterTotalMl(waterData.totalMl || 0);
        setSavedMeals(savedMealsData || []);
        setBodyPhotos(bodyPhotosData || []);
      })
      .catch((err) => {
        console.error('Failed to load data:', err);
        setMeals([]);
        setWorkouts([]);
        setGoals(defaultGoals);
        setWaterEntries([]);
        setWaterTotalMl(0);
        setSavedMeals([]);
        setBodyPhotos([]);
      })
      .finally(() => setReady(true));
  }, []);

  const addMeal = useCallback(async (meal: Omit<Meal, 'id'>) => {
    try {
      const result = await api.createMeal(meal);
      const newMeal = { ...meal, id: result.id };
      setMeals((prev) => [newMeal, ...prev]);
      return newMeal;
    } catch (err) {
      console.error('addMeal failed:', err);
      throw err;
    }
  }, []);

  const updateMeal = useCallback(async (id: string, patch: Omit<Meal, 'id'>) => {
    try {
      await api.updateMeal(id, patch);
      setMeals((prev) => prev.map((m) => m.id === id ? { ...patch, id } : m));
    } catch (err) {
      console.error('updateMeal failed:', err);
      throw err;
    }
  }, []);

  const deleteMeal = useCallback(async (id: string) => {
    await api.deleteMeal(id);
    setMeals((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const addWorkout = useCallback(async (workout: Omit<Workout, 'id'>) => {
    try {
      const result = await api.createWorkout(workout);
      const newWorkout = { ...workout, id: result.id };
      setWorkouts((prev) => [newWorkout, ...prev]);
      return newWorkout;
    } catch (err) {
      console.error('addWorkout failed:', err);
      throw err;
    }
  }, []);

  const updateWorkout = useCallback(async (id: string, patch: Omit<Workout, 'id'>) => {
    try {
      await api.updateWorkout(id, patch);
      setWorkouts((prev) => prev.map((w) => w.id === id ? { ...patch, id } : w));
    } catch (err) {
      console.error('updateWorkout failed:', err);
      throw err;
    }
  }, []);

  const deleteWorkout = useCallback(async (id: string) => {
    await api.deleteWorkout(id);
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const saveGoals = useCallback(async (next: Goals) => {
    await api.updateGoals(next);
    setGoals(next);
  }, []);

  const addWater = useCallback(async (amountMl: number = 250) => {
    const date = todayKey();
    const result = await api.logWater(date, amountMl);
    const newEntry: WaterEntry = { id: result.id, date, amountMl };
    setWaterEntries((prev) => [...prev, newEntry]);
    setWaterTotalMl((prev) => prev + amountMl);
    return newEntry;
  }, []);

  const deleteWater = useCallback(async (id: string) => {
    await api.deleteWater(id);
    setWaterEntries((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry) setWaterTotalMl((current) => Math.max(0, current - entry.amountMl));
      return prev.filter((e) => e.id !== id);
    });
  }, []);

  const addSavedMeal = useCallback(async (meal: Omit<SavedMeal, 'id'>) => {
    const result = await api.createSavedMeal(meal);
    const newSaved: SavedMeal = { ...meal, id: result.id };
    setSavedMeals((prev) => [newSaved, ...prev]);
    return newSaved;
  }, []);

  const deleteSavedMeal = useCallback(async (id: string) => {
    await api.deleteSavedMeal(id);
    setSavedMeals((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const addBodyPhoto = useCallback(async (photo: { date: string; weight?: number; imageDataUrl: string; notes?: string }) => {
    const result = await api.createBodyPhoto(photo);
    const newPhoto: BodyPhoto = { ...photo, id: result.id };
    setBodyPhotos((prev) => [newPhoto, ...prev]);
    return newPhoto;
  }, []);

  const deleteBodyPhoto = useCallback(async (id: string) => {
    await api.deleteBodyPhoto(id);
    setBodyPhotos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return {
    meals,
    workouts,
    goals,
    waterEntries,
    waterTotalMl,
    savedMeals,
    bodyPhotos,
    ready,
    addMeal,
    updateMeal,
    deleteMeal,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    saveGoals,
    addWater,
    deleteWater,
    addSavedMeal,
    deleteSavedMeal,
    addBodyPhoto,
    deleteBodyPhoto,
  };
}
