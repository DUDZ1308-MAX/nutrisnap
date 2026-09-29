import { describe, it, expect } from "vitest";
import { normalizeFdcFood, normalizeFdcSearch, parseGrams, rankFdcFoods, scalePer100g } from "../../../../../api/nutrition/_fdc";
import { toNumber } from "../../../../../api/nutrition/_normalize";

// A Survey (FNDDS) food as FDC returns it. Nutrient names are deliberately the
// real ones ("Total lipid (fat)", "Carbohydrate, by difference") because the
// mapper must key off nutrientId, not these strings.
const grilledChicken = {
  fdcId: 2705969,
  description: "Chicken breast, grilled with sauce, skin eaten",
  dataType: "Survey (FNDDS)",
  brandOwner: null,
  foodNutrients: [
    { nutrientId: 1008, nutrientName: "Energy", value: 202, unitName: "KCAL" },
    { nutrientId: 1003, nutrientName: "Protein", value: 21.15, unitName: "G" },
    { nutrientId: 1005, nutrientName: "Carbohydrate, by difference", value: 7.34, unitName: "G" },
    { nutrientId: 1004, nutrientName: "Total lipid (fat)", value: 9.15, unitName: "G" },
    { nutrientId: 1079, nutrientName: "Fiber, total dietary", value: 0.2, unitName: "G" },
  ],
};

describe("normalizeFdcFood", () => {
  it("extracts the four macros by nutrient id", () => {
    const food = normalizeFdcFood(grilledChicken);
    expect(food).not.toBeNull();
    expect(food?.fdcId).toBe(2705969);
    expect(food?.description).toBe("Chicken breast, grilled with sauce, skin eaten");
    expect(food?.dataType).toBe("Survey (FNDDS)");
    expect(food?.per100g).toEqual({ calories: 202, protein: 21.15, carbs: 7.34, fat: 9.15 });
  });

  it("ignores nutrients that are not one of the four tracked ids", () => {
    const food = normalizeFdcFood(grilledChicken);
    // Fiber is present in the payload but must not leak into the macros.
    expect(food?.per100g).not.toHaveProperty("fiber");
  });

  it("drops energy reported in kJ instead of treating it as kcal", () => {
    const kjFood = {
      ...grilledChicken,
      foodNutrients: [{ nutrientId: 1008, nutrientName: "Energy", value: 845, unitName: "KJ" }],
    };
    expect(normalizeFdcFood(kjFood)?.per100g.calories).toBeNull();
  });

  it("converts kJ to nothing rather than guessing, and keeps the other macros", () => {
    const kjFood = {
      ...grilledChicken,
      foodNutrients: [
        { nutrientId: 1008, nutrientName: "Energy", value: 845, unitName: "KJ" },
        { nutrientId: 1003, nutrientName: "Protein", value: 21.15, unitName: "G" },
      ],
    };
    const food = normalizeFdcFood(kjFood);
    expect(food?.per100g.calories).toBeNull();
    expect(food?.per100g.protein).toBe(21.15);
  });

  it("returns null for a missing nutrient rather than inventing a value", () => {
    const noFat = {
      ...grilledChicken,
      foodNutrients: grilledChicken.foodNutrients.filter((n) => n.nutrientId !== 1004),
    };
    expect(normalizeFdcFood(noFat)?.per100g.fat).toBeNull();
  });

  it("returns null when the payload is not an object", () => {
    expect(normalizeFdcFood(null)).toBeNull();
    expect(normalizeFdcFood(undefined)).toBeNull();
    expect(normalizeFdcFood("2705969")).toBeNull();
  });

  it("returns null when there is no usable description", () => {
    expect(normalizeFdcFood({ ...grilledChicken, description: "   " })).toBeNull();
    expect(normalizeFdcFood({ ...grilledChicken, fdcId: null })).toBeNull();
  });

  it("reads the brand from brandOwner and falls back to brandName", () => {
    expect(normalizeFdcFood({ ...grilledChicken, brandOwner: "  Tyson  " })?.brand).toBe("Tyson");
    expect(normalizeFdcFood({ ...grilledChicken, brandName: "Store Brand" })?.brand).toBe("Store Brand");
    expect(normalizeFdcFood(grilledChicken)?.brand).toBeNull();
  });

  it("labels an unknown dataType instead of leaving it blank", () => {
    expect(normalizeFdcFood({ ...grilledChicken, dataType: "   " })?.dataType).toBe("Unknown");
  });
});

describe("normalizeFdcSearch", () => {
  it("returns an empty list for a non-object payload", () => {
    expect(normalizeFdcSearch(null)).toEqual([]);
    expect(normalizeFdcSearch({})).toEqual([]);
    expect(normalizeFdcSearch({ foods: "nope" })).toEqual([]);
  });

  it("drops foods that have no macros at all", () => {
    const result = normalizeFdcSearch({
      foods: [
        grilledChicken,
        { fdcId: 1, description: "Water", dataType: "SR Legacy", foodNutrients: [{ nutrientId: 1051, nutrientName: "Water", value: 100, unitName: "G" }] },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0].fdcId).toBe(2705969);
  });

  it("keeps a food that has only one of the four macros", () => {
    const result = normalizeFdcSearch({
      foods: [{ fdcId: 2, description: "Pure oil", dataType: "SR Legacy", foodNutrients: [{ nutrientId: 1004, nutrientName: "Total lipid (fat)", value: 100, unitName: "G" }] }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].per100g.fat).toBe(100);
    expect(result[0].per100g.calories).toBeNull();
  });
});

describe("rankFdcFoods", () => {
  const food = (fdcId: number, dataType: string): ReturnType<typeof normalizeFdcFood> => ({
    fdcId,
    description: `food ${fdcId}`,
    dataType,
    brand: null,
    per100g: { calories: 100, protein: 1, carbs: 1, fat: 1 },
  });

  it("floats generic datasets above branded products", () => {
    const ranked = rankFdcFoods([food(1, "Branded"), food(2, "Survey (FNDDS)"), food(3, "Foundation")]);
    expect(ranked.map((f) => f.dataType)).toEqual(["Foundation", "Survey (FNDDS)", "Branded"]);
  });

  it("keeps FDC's relevance order within a dataset", () => {
    const ranked = rankFdcFoods([food(1, "Branded"), food(2, "Branded"), food(3, "Survey (FNDDS)"), food(4, "Branded")]);
    expect(ranked.map((f) => f.fdcId)).toEqual([3, 1, 2, 4]);
  });

  it("sorts an unknown dataset last", () => {
    const ranked = rankFdcFoods([food(1, "Experimental"), food(2, "SR Legacy")]);
    expect(ranked.map((f) => f.dataType)).toEqual(["SR Legacy", "Experimental"]);
  });

  it("does not mutate the input", () => {
    const input = [food(1, "Branded"), food(2, "Foundation")];
    rankFdcFoods(input);
    expect(input.map((f) => f.fdcId)).toEqual([1, 2]);
  });
});

describe("parseGrams", () => {
  it("accepts a normal portion", () => {
    expect(parseGrams(150)).toBe(150);
    expect(parseGrams("150")).toBe(150);
  });

  it("rejects zero, negative and non-numeric input", () => {
    expect(parseGrams(0)).toBeNull();
    expect(parseGrams(-50)).toBeNull();
    expect(parseGrams("abc")).toBeNull();
    expect(parseGrams(NaN)).toBeNull();
    expect(parseGrams(null)).toBeNull();
  });

  it("caps an implausible portion", () => {
    expect(parseGrams(99999)).toBe(3000);
  });
});

describe("scalePer100g", () => {
  const per100g = { calories: 202, protein: 21.15, carbs: 7.34, fat: 9.15 };

  it("leaves values unchanged at 100 g", () => {
    expect(scalePer100g(per100g, 100)).toEqual(per100g);
  });

  it("scales up for a larger portion", () => {
    const scaled = scalePer100g(per100g, 250);
    expect(scaled.calories).toBeCloseTo(505);
    expect(scaled.protein).toBeCloseTo(52.875);
  });

  it("scales down for a fractional portion", () => {
    const scaled = scalePer100g(per100g, 33.5);
    expect(scaled.calories).toBeCloseTo(67.67);
    expect(scaled.carbs).toBeCloseTo(2.4589);
  });

  it("yields zeroes for a non-positive portion", () => {
    expect(scalePer100g(per100g, 0)).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    expect(scalePer100g(per100g, -10)).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it("keeps a missing macro missing instead of turning it into zero", () => {
    const scaled = scalePer100g({ calories: 202, protein: null, carbs: 7.34, fat: 9.15 }, 200);
    expect(scaled.protein).toBeNull();
    expect(scaled.calories).toBeCloseTo(404);
  });
});

describe("toNumber", () => {
  it("coerces numeric strings, as parts of every dataset return them", () => {
    expect(toNumber("42.5")).toBe(42.5);
    expect(toNumber("  7  ")).toBe(7);
  });

  it("passes numbers through unchanged", () => {
    expect(toNumber(42)).toBe(42);
  });

  it("rejects null, booleans, non-numeric and negative values", () => {
    expect(toNumber(null)).toBeNull();
    expect(toNumber(undefined)).toBeNull();
    expect(toNumber(true)).toBeNull();
    expect(toNumber("abc")).toBeNull();
    expect(toNumber(-5)).toBeNull();
  });
});
