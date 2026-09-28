// Pure normalisation of USDA FoodData Central search responses.
//
// Lives behind an underscore so Vercel does not treat it as a serverless function.

import { toNumber, type NormalizedMacros } from "./_normalize.js";

export interface FdcFood {
  fdcId: number;
  description: string;
  /** "Foundation", "Survey (FNDDS)", "Branded", "SR Legacy". */
  dataType: string;
  brand: string | null;
  /** FDC reports every nutrient per 100 g. */
  per100g: NormalizedMacros;
}

// Nutrients are matched on id, never on name. The returned names are
// "Total lipid (fat)" and "Carbohydrate, by difference", not "Fat" and
// "Carbohydrate", and those strings shift between dataset releases.
const NUTRIENT_IDS = {
  calories: 1008, // Energy
  protein: 1003,
  carbs: 1005, // Carbohydrate, by difference
  fat: 1004, // Total lipid (fat)
} as const;

function readNutrient(food: Record<string, unknown>, nutrientId: number): { value: number; unit: string } | null {
  const nutrients = food.foodNutrients;
  if (!Array.isArray(nutrients)) return null;

  for (const entry of nutrients) {
    if (typeof entry !== "object" || entry === null) continue;
    const record = entry as Record<string, unknown>;
    if (toNumber(record.nutrientId) !== nutrientId) continue;
    const value = toNumber(record.value);
    if (value === null) return null;
    return { value, unit: typeof record.unitName === "string" ? record.unitName.trim().toUpperCase() : "" };
  }

  return null;
}

function readGrams(food: Record<string, unknown>, nutrientId: number): number | null {
  return readNutrient(food, nutrientId)?.value ?? null;
}

export function normalizeFdcFood(raw: unknown): FdcFood | null {
  if (typeof raw !== "object" || raw === null) return null;

  const food = raw as Record<string, unknown>;
  const fdcId = toNumber(food.fdcId);
  const description = typeof food.description === "string" ? food.description.trim() : "";
  if (fdcId === null || !description) return null;

  const energy = readNutrient(food, NUTRIENT_IDS.calories);
  // Nutrient 1008 is reported in kJ in some datasets. Reading kJ as kcal would
  // overstate every food by 4.184x, so a non-KCAL energy is dropped instead.
  const calories = energy !== null && energy.unit === "KCAL" ? energy.value : null;

  const brandOwner = typeof food.brandOwner === "string" ? food.brandOwner.trim() : "";
  const brandName = typeof food.brandName === "string" ? food.brandName.trim() : "";

  return {
    fdcId,
    description,
    dataType: typeof food.dataType === "string" && food.dataType.trim() ? food.dataType.trim() : "Unknown",
    brand: brandOwner || brandName || null,
    per100g: {
      calories,
      protein: readGrams(food, NUTRIENT_IDS.protein),
      carbs: readGrams(food, NUTRIENT_IDS.carbs),
      fat: readGrams(food, NUTRIENT_IDS.fat),
    },
  };
}

export function normalizeFdcSearch(raw: unknown): FdcFood[] {
  if (typeof raw !== "object" || raw === null) return [];
  const foods = (raw as Record<string, unknown>).foods;
  if (!Array.isArray(foods)) return [];

  const results: FdcFood[] = [];
  for (const entry of foods) {
    const food = normalizeFdcFood(entry);
    // A food with no macros at all cannot prefill anything, so it is not worth
    // spending one of the user's ten result slots on.
    if (food === null) continue;
    const { calories, protein, carbs, fat } = food.per100g;
    if (calories === null && protein === null && carbs === null && fat === null) continue;
    results.push(food);
  }

  return results;
}

/** A single meal portion past this is a typo rather than a portion. */
export const MAX_PORTION_GRAMS = 3000;

/**
 * Validates a typed portion. Rejects zero, negative and non-numeric input
 * instead of silently scaling a meal down to nothing.
 */
export function parseGrams(raw: unknown): number | null {
  const value = toNumber(raw);
  if (value === null || value <= 0) return null;
  return Math.min(value, MAX_PORTION_GRAMS);
}

/** Scales per-100 g values to a portion. Non-positive grams yield zeroes. */
export function scalePer100g(per100g: NormalizedMacros, grams: number): NormalizedMacros {
  const factor = Number.isFinite(grams) && grams > 0 ? grams / 100 : 0;
  return {
    calories: per100g.calories === null ? null : per100g.calories * factor,
    protein: per100g.protein === null ? null : per100g.protein * factor,
    carbs: per100g.carbs === null ? null : per100g.carbs * factor,
    fat: per100g.fat === null ? null : per100g.fat * factor,
  };
}
