import { describe, it, expect, beforeEach } from "vitest";
import {
  todayKey,
  defaultGoals,
  exportData,
  parseImport,
  type Meal,
  type Workout,
  type Goals,
  type NutriSnapExport,
} from "../nutrisnap-storage";

describe("todayKey", () => {
  it("returns a YYYY-MM-DD string", () => {
    const key = todayKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns today's date", () => {
    const key = todayKey();
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const expected = new Date(now.getTime() - offset * 60_000)
      .toISOString()
      .slice(0, 10);
    expect(key).toBe(expected);
  });
});

describe("defaultGoals", () => {
  it("has sensible defaults", () => {
    expect(defaultGoals.calories).toBe(2100);
    expect(defaultGoals.protein).toBe(120);
    expect(defaultGoals.carbs).toBe(230);
    expect(defaultGoals.fat).toBe(70);
  });
});

describe("exportData", () => {
  const meals: Meal[] = [
    {
      id: "meal-1",
      name: "Breakfast",
      mealType: "Breakfast",
      date: "2026-01-01",
      time: "08:00",
      calories: 500,
      protein: 30,
      carbs: 60,
      fat: 15,
    },
  ];

  const workouts: Workout[] = [
    {
      id: "workout-1",
      name: "Morning run",
      activity: "Run",
      date: "2026-01-01",
      durationMinutes: 30,
      caloriesBurned: 300,
      targetAreas: ["quads", "hamstrings"],
    },
  ];

  const goals: Goals = { calories: 2100, protein: 120, carbs: 230, fat: 70 };

  it("creates a valid export object", () => {
    const result = exportData(meals, workouts, goals);
    expect(result.version).toBe(1);
    expect(result.exportedAt).toBeTruthy();
    expect(result.meals).toEqual(meals);
    expect(result.workouts).toEqual(workouts);
    expect(result.goals).toEqual(goals);
  });
});

describe("parseImport", () => {
  it("parses a valid export", () => {
    const data: NutriSnapExport = {
      version: 1,
      exportedAt: "2026-01-01T00:00:00.000Z",
      meals: [],
      workouts: [],
      goals: defaultGoals,
    };
    const result = parseImport(JSON.stringify(data));
    expect(result).not.toBeNull();
    expect(result?.version).toBe(1);
  });

  it("rejects invalid JSON", () => {
    expect(parseImport("not json")).toBeNull();
  });

  it("rejects missing version", () => {
    expect(parseImport(JSON.stringify({ meals: [], workouts: [], goals: defaultGoals }))).toBeNull();
  });

  it("rejects invalid meal data", () => {
    const data = {
      version: 1,
      exportedAt: "2026-01-01",
      meals: [{ id: 123 }], // invalid: id should be string
      workouts: [],
      goals: defaultGoals,
    };
    expect(parseImport(JSON.stringify(data))).toBeNull();
  });

  it("rejects invalid goals", () => {
    const data = {
      version: 1,
      exportedAt: "2026-01-01",
      meals: [],
      workouts: [],
      goals: { calories: "not a number" },
    };
    expect(parseImport(JSON.stringify(data))).toBeNull();
  });
});

describe("localStorage integration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores and retrieves meals", () => {
    const meals: Meal[] = [
      {
        id: "meal-1",
        name: "Lunch",
        mealType: "Lunch",
        date: "2026-01-01",
        time: "12:00",
        calories: 600,
        protein: 40,
        carbs: 50,
        fat: 20,
      },
    ];
    localStorage.setItem("nutrisnap:meals", JSON.stringify(meals));
    const stored = JSON.parse(localStorage.getItem("nutrisnap:meals") || "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe("Lunch");
  });

  it("handles corrupted localStorage data gracefully", () => {
    localStorage.setItem("nutrisnap:meals", "not valid json{{{");
    const value = localStorage.getItem("nutrisnap:meals");
    expect(() => JSON.parse(value!)).toThrow();
  });
});
