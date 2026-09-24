import { useCallback, useEffect, useState } from 'react';

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export type Meal = {
  id: string;
  name: string;
  mealType: MealType;
  date: string;
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageDataUrl?: string;
};

export type Workout = {
  id: string;
  name: string;
  activity: string;
  date: string;
  durationMinutes: number;
  caloriesBurned: number;
  notes?: string;
};

export type Goals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

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

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(value));
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

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
    setMeals(readStorage<Meal[]>(STORAGE_KEYS.meals, []));
    setWorkouts(readStorage<Workout[]>(STORAGE_KEYS.workouts, []));
    setGoals(readStorage<Goals>(STORAGE_KEYS.goals, defaultGoals));
    setReady(true);
  }, []);

  const saveMeals = useCallback((next: Meal[]) => {
    setMeals(next);
    writeStorage(STORAGE_KEYS.meals, next);
  }, []);

  const saveWorkouts = useCallback((next: Workout[]) => {
    setWorkouts(next);
    writeStorage(STORAGE_KEYS.workouts, next);
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
    addMeal,
    updateMeal,
    deleteMeal,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    saveGoals,
  };
}
