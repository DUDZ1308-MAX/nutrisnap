import { z } from 'zod';
import { useCallback, useEffect, useRef, useState } from 'react';

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

// ── Storage helpers ─────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  meals: 'nutrisnap:meals',
  workouts: 'nutrisnap:workouts',
  goals: 'nutrisnap:goals',
} as const;

export const defaultGoals: Goals = {
  calories: 2100,
  protein: 120,
  carbs: 230,
  fat: 70,
};

function readStorage<T>(key: string, fallback: T, schema?: z.ZodType<T>): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = window.localStorage.getItem(key);
    if (!value) return fallback;
    const parsed: unknown = JSON.parse(value);
    if (schema) {
      const result = schema.safeParse(parsed);
      return result.success ? result.data : fallback;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Quota monitoring ────────────────────────────────────────────────────────

export type StorageQuota = { usage: number; quota: number; percent: number } | null;

async function getStorageQuota(): Promise<StorageQuota> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return { usage, quota, percent: quota > 0 ? Math.round((usage / quota) * 100) : 0 };
  } catch {
    return null;
  }
}

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
  const [storageWarning, setStorageWarning] = useState<StorageQuota>(null);
  const saveCountRef = useRef(0);

  useEffect(() => {
    setMeals(readStorage<Meal[]>(STORAGE_KEYS.meals, [], z.array(mealSchema)));
    const storedWorkouts = readStorage<Workout[]>(STORAGE_KEYS.workouts, [], z.array(workoutSchema));
    const normalizedWorkouts = storedWorkouts.map((workout) => ({
      ...workout,
      targetAreas: Array.isArray(workout.targetAreas) ? workout.targetAreas : [],
    }));
    setWorkouts(normalizedWorkouts);
    writeStorage(STORAGE_KEYS.workouts, normalizedWorkouts);
    setGoals(readStorage<Goals>(STORAGE_KEYS.goals, defaultGoals, goalsSchema));
    setReady(true);

    getStorageQuota().then((quota) => {
      if (quota && quota.percent > 80) setStorageWarning(quota);
    });
  }, []);

  const saveMeals = useCallback((next: Meal[]) => {
    setMeals(next);
    const ok = writeStorage(STORAGE_KEYS.meals, next);
    if (!ok) {
      setStorageWarning({ usage: 0, quota: 0, percent: 100 });
    }
    saveCountRef.current++;
    if (saveCountRef.current % 10 === 0) {
      getStorageQuota().then((q) => { if (q && q.percent > 80) setStorageWarning(q); });
    }
  }, []);

  const saveWorkouts = useCallback((next: Workout[]) => {
    setWorkouts(next);
    const ok = writeStorage(STORAGE_KEYS.workouts, next);
    if (!ok) {
      setStorageWarning({ usage: 0, quota: 0, percent: 100 });
    }
    saveCountRef.current++;
    if (saveCountRef.current % 10 === 0) {
      getStorageQuota().then((q) => { if (q && q.percent > 80) setStorageWarning(q); });
    }
  }, []);

  const saveGoals = useCallback((next: Goals) => {
    setGoals(next);
    writeStorage(STORAGE_KEYS.goals, next);
  }, []);

  const addMeal = useCallback((meal: Omit<Meal, 'id'>) => {
    const created = { ...meal, id: uid('meal') };
    saveMeals([created, ...meals]);
    return created;
  }, [meals, saveMeals]);

  const updateMeal = useCallback((id: string, patch: Omit<Meal, 'id'>) => {
    saveMeals(meals.map((meal) => meal.id === id ? { ...patch, id } : meal));
  }, [meals, saveMeals]);

  const deleteMeal = useCallback((id: string) => {
    saveMeals(meals.filter((meal) => meal.id !== id));
  }, [meals, saveMeals]);

  const addWorkout = useCallback((workout: Omit<Workout, 'id'>) => {
    const created = { ...workout, id: uid('workout') };
    saveWorkouts([created, ...workouts]);
    return created;
  }, [saveWorkouts, workouts]);

  const updateWorkout = useCallback((id: string, patch: Omit<Workout, 'id'>) => {
    saveWorkouts(workouts.map((workout) => workout.id === id ? { ...patch, id } : workout));
  }, [saveWorkouts, workouts]);

  const deleteWorkout = useCallback((id: string) => {
    saveWorkouts(workouts.filter((workout) => workout.id !== id));
  }, [saveWorkouts, workouts]);

  return {
    meals,
    workouts,
    goals,
    ready,
    storageWarning,
    addMeal,
    updateMeal,
    deleteMeal,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    saveGoals,
  };
}
