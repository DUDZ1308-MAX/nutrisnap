import { describe, it, expect, beforeEach } from "vitest";
import {
  todayKey,
  dateKey,
  dayKeyOffset,
  defaultGoals,
  exportData,
  parseImport,
  workoutTargetAreas,
  formatWeight,
  formatWeightInput,
  kgToUnit,
  unitToKg,
  weightUnitLabel,
  type Meal,
  type Workout,
  type Goals,
  type NutriSnapExport,
} from "../nutrisnap-storage";

describe("weight unit conversion", () => {
  it("passes kilogram values through unchanged", () => {
    expect(kgToUnit(70, "kg")).toBe(70);
    expect(unitToKg(70, "kg")).toBe(70);
  });

  it("converts kilograms to pounds", () => {
    expect(kgToUnit(70, "lb")).toBeCloseTo(154.3, 1);
  });

  it("converts pounds to kilograms", () => {
    expect(unitToKg(154.5, "lb")).toBeCloseTo(70.1, 1);
  });

  it("round-trips through both units without meaningful drift", () => {
    const original = 72.4;
    expect(unitToKg(kgToUnit(original, "lb"), "lb")).toBeCloseTo(original, 6);
  });

  it("keeps the physical value stable when switching units", () => {
    const weightKg = 70.04;
    const inPounds = kgToUnit(weightKg, "lb")!;
    expect(unitToKg(inPounds, "lb")).toBeCloseTo(weightKg, 6);
  });

  it("preserves fractional pounds that an integer column would truncate", () => {
    const typed = 154.5;
    const stored = unitToKg(typed, "lb")!;
    expect(Number.isInteger(stored)).toBe(false);
    expect(kgToUnit(stored, "lb")).toBeCloseTo(typed, 6);
  });

  it("returns null for empty or invalid values", () => {
    expect(kgToUnit(null, "kg")).toBeNull();
    expect(kgToUnit(undefined, "lb")).toBeNull();
    expect(kgToUnit(Number.NaN, "kg")).toBeNull();
    expect(unitToKg(null, "lb")).toBeNull();
    expect(unitToKg(Number.NaN, "kg")).toBeNull();
  });

  it("labels units for display", () => {
    expect(weightUnitLabel("kg")).toBe("kg");
    expect(weightUnitLabel("lb")).toBe("lb");
  });

  it("formats a weight with its unit", () => {
    expect(formatWeight(70, "kg")).toBe("70.0 kg");
    expect(formatWeight(70, "lb")).toBe("154.3 lb");
  });

  it("formats a missing weight as a dash", () => {
    expect(formatWeight(null, "kg")).toBe("—");
  });

  it("trims trailing zeros for number inputs", () => {
    expect(formatWeightInput(70)).toBe("70");
    expect(formatWeightInput(154.3)).toBe("154.3");
    expect(formatWeightInput(154.30000000000001)).toBe("154.3");
    expect(formatWeightInput(null)).toBe("");
  });
});

describe("todayKey", () => {
  it("returns a YYYY-MM-DD string", () => {
    const key = todayKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("matches the local calendar date, not the UTC date", () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    expect(todayKey()).toBe(local);
  });
});

describe("dateKey", () => {
  it("uses the local date for late-evening local times", () => {
    const d = new Date(2026, 0, 1, 23, 30);
    expect(dateKey(d)).toBe("2026-01-01");
  });

  it("uses the local date for just-after-midnight local times", () => {
    const d = new Date(2026, 0, 1, 0, 30);
    expect(dateKey(d)).toBe("2026-01-01");
  });

  it("handles month and year boundaries", () => {
    expect(dateKey(new Date(2026, 0, 1, 12, 0))).toBe("2026-01-01");
    expect(dateKey(new Date(2026, 11, 31, 12, 0))).toBe("2026-12-31");
  });
});

describe("dayKeyOffset", () => {
  it("defaults to today", () => {
    expect(dayKeyOffset()).toBe(todayKey());
    expect(dayKeyOffset(0)).toBe(todayKey());
  });

  it("returns yesterday for -1", () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const pad = (n: number) => String(n).padStart(2, "0");
    const expected = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    expect(dayKeyOffset(-1)).toBe(expected);
  });

  it("returns tomorrow for 1", () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const pad = (n: number) => String(n).padStart(2, "0");
    const expected = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    expect(dayKeyOffset(1)).toBe(expected);
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

describe("workoutTargetAreas", () => {
  it("maps activity types to expected target areas", () => {
    expect(workoutTargetAreas).toBeInstanceOf(Array);
    expect(workoutTargetAreas.length).toBeGreaterThan(0);
    expect(workoutTargetAreas[0]).toHaveProperty("id");
    expect(workoutTargetAreas[0]).toHaveProperty("label");
  });
});
