import { useMemo } from "react";
import { todayKey } from "@/lib/nutrisnap-storage";

interface StreakBadgeProps {
  meals: Array<{ date: string }>;
  workouts: Array<{ date: string }>;
  waterLogs: Array<{ date: string }>;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export type Streak = {
  count: number;
  activeToday: boolean;
  atRisk: boolean;
};

export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getStreak(dates: string[], today: string = todayKey()): Streak {
  const unique = [...new Set(dates.map((d) => d.slice(0, 10)))].sort().reverse();
  if (unique.length === 0) return { count: 0, activeToday: false, atRisk: false };

  const activeToday = unique[0] === today;
  const atRisk = !activeToday && unique[0] === addDays(today, -1);
  if (!activeToday && !atRisk) return { count: 0, activeToday: false, atRisk: false };

  const daySet = new Set(unique);
  let count = 0;
  let cursor = unique[0];
  while (daySet.has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return { count, activeToday, atRisk };
}

export function StreakBadge({ meals, workouts, waterLogs }: StreakBadgeProps) {
  const mealStreak = useMemo(() => getStreak(meals.map((m) => m.date)), [meals]);
  const workoutStreak = useMemo(() => getStreak(workouts.map((w) => w.date)), [workouts]);

  const activeDays = useMemo(() => {
    const set = new Set<string>();
    meals.forEach((m) => set.add(m.date?.slice(0, 10)));
    workouts.forEach((w) => set.add(w.date?.slice(0, 10)));
    waterLogs.forEach((w) => set.add(w.date?.slice(0, 10)));
    return set.size;
  }, [meals, workouts, waterLogs]);

  const totalMeals = meals.length;
  const totalWorkouts = workouts.length;

  const achievements: Achievement[] = useMemo(
    () => [
      { id: "streak-7", title: "Week Warrior", description: "7-day logging streak", icon: "🔥", unlocked: mealStreak.count >= 7 || workoutStreak.count >= 7 },
      { id: "streak-30", title: "Monthly Master", description: "30-day logging streak", icon: "🏆", unlocked: mealStreak.count >= 30 || workoutStreak.count >= 30 },
      { id: "meals-10", title: "Meal Tracker", description: "Log 10 meals", icon: "🍽️", unlocked: totalMeals >= 10 },
      { id: "meals-50", title: "Meal Pro", description: "Log 50 meals", icon: "⭐", unlocked: totalMeals >= 50 },
      { id: "meals-100", title: "Century Club", description: "Log 100 meals", icon: "💯", unlocked: totalMeals >= 100 },
      { id: "workout-10", title: "Gym Rat", description: "Log 10 workouts", icon: "💪", unlocked: totalWorkouts >= 10 },
      { id: "workout-50", title: "Iron Legend", description: "Log 50 workouts", icon: "🏋️", unlocked: totalWorkouts >= 50 },
      { id: "active-30", title: "Active Month", description: "30 active days", icon: "📅", unlocked: activeDays >= 30 },
    ],
    [mealStreak, workoutStreak, totalMeals, totalWorkouts, activeDays]
  );

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Streaks & Achievements</h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {unlockedCount}/{achievements.length}
        </span>
      </div>

      {/* Streak counters */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div
          className={`rounded-lg p-3 text-center transition-colors ${
            mealStreak.atRisk
              ? "bg-amber-50 dark:bg-amber-950/40 ring-1 ring-amber-300 dark:ring-amber-800"
              : "bg-orange-50 dark:bg-orange-950/30"
          }`}
          data-testid="streak-meal"
        >
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{mealStreak.count}</div>
          <div className="text-xs text-orange-600/70 dark:text-orange-400/70">Day Meal Streak</div>
        </div>
        <div
          className={`rounded-lg p-3 text-center transition-colors ${
            workoutStreak.atRisk
              ? "bg-amber-50 dark:bg-amber-950/40 ring-1 ring-amber-300 dark:ring-amber-800"
              : "bg-blue-50 dark:bg-blue-950/30"
          }`}
          data-testid="streak-workout"
        >
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{workoutStreak.count}</div>
          <div className="text-xs text-blue-600/70 dark:text-blue-400/70">Day Workout Streak</div>
        </div>
      </div>

      {(mealStreak.atRisk || workoutStreak.atRisk) && (
        <p
          className="mb-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400"
          role="status"
          data-testid="streak-at-risk"
        >
          <span aria-hidden="true">🔥</span> Log today to keep your streak alive
        </p>
      )}

      {/* Achievements grid */}
      <div className="space-y-2">
        {achievements.map((a) => (
          <div
            key={a.id}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              a.unlocked
                ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                : "bg-slate-50 dark:bg-slate-700/50 opacity-50"
            }`}
          >
            <span className="text-xl">{a.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 dark:text-white">{a.title}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{a.description}</div>
            </div>
            {a.unlocked && (
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full">
                Unlocked
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
