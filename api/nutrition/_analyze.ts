// Pure prompt construction and response normalisation for Gemini photo analysis.
//
// Underscore prefix keeps Vercel from treating this as a serverless function, and it
// holds no network calls so the normalisation is unit testable.
//
// Design note: the model is asked to identify *components* and their per-100g macros,
// and to estimate grams. It is explicitly told not to produce meal totals, because a
// model that emits a single calorie figure tends to launder a guess into false
// precision. Totals are computed here from components, so every number the user sees
// can be traced back to an item they can edit.

import { toNumber } from "./_normalize.js";

export type Confidence = "high" | "medium" | "low";

export interface AnalyzedItem {
  name: string;
  /** Estimated portion weight, which is the least reliable part of the estimate. */
  grams: number;
  confidence: Confidence;
  /** For this portion, computed from grams and the per-100g values. */
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealAnalysis {
  dishName: string;
  items: AnalyzedItem[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
  overallConfidence: Confidence;
  notes: string;
}

export type AnalyzeResult =
  | { ok: true; analysis: MealAnalysis }
  | { ok: false; reason: "not_food" | "unparseable" };

/** Per-100g macros the model must supply for each component it identifies. */
interface RawItem {
  name?: unknown;
  grams?: unknown;
  caloriesPer100g?: unknown;
  proteinPer100g?: unknown;
  carbsPer100g?: unknown;
  fatPer100g?: unknown;
  confidence?: unknown;
}

const MAX_ITEMS = 12;
const MAX_ITEM_GRAMS = 3000;
const MAX_TOTAL_GRAMS = 5000;

export const ANALYZE_SYSTEM_PROMPT = [
  "You estimate the nutrition of a meal from a single photo, for a food tracking app.",
  "",
  "Identify each visually distinct component separately. A composed dish is several items, not one.",
  "For every component, report the portion weight in grams and that food's macros per 100 g,",
  "using standard reference values. Use visible references (utensils, hands, packaging, plates)",
  "to judge weight, and state the assumption in `notes` when the scale is ambiguous.",
  "",
  "Never report meal totals and never report a single calorie figure for the whole meal. The",
  "application computes totals from your components, so per-100g values must be self-consistent.",
  "",
  "Be conservative with confidence. Portion weight is an estimate, not a measurement, and the",
  "user reviews and corrects everything before it is saved. If the image does not show food,",
  "return isFood false and an empty items array.",
].join("\n");

export const ANALYZE_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    isFood: { type: "boolean" },
    dishName: { type: "string" },
    overallConfidence: { type: "string", enum: ["high", "medium", "low"] },
    notes: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          grams: { type: "number" },
          caloriesPer100g: { type: "number" },
          proteinPer100g: { type: "number" },
          carbsPer100g: { type: "number" },
          fatPer100g: { type: "number" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["name", "grams", "caloriesPer100g", "proteinPer100g", "carbsPer100g", "fatPer100g", "confidence"],
      },
    },
  },
  required: ["isFood", "dishName", "overallConfidence", "notes", "items"],
} as const;

export function buildAnalyzePrompt(): string {
  return [
    "Estimate the nutrition of the meal in this photo.",
    "Break it into components with per-100g macros and an estimated gram weight for each.",
    "Reply with JSON matching the provided schema and nothing else.",
  ].join("\n");
}

/**
 * Gemini is asked for JSON via responseSchema, but a model can still wrap output in
 * a fenced block or add prose, so strip the common wrappers before parsing.
 */
export function parseAnalysisText(text: string): unknown {
  const trimmed = text.trim();
  const withoutFence = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  const candidates = [withoutFence];

  // Fall back to the outermost braces when prose surrounds the JSON object.
  const first = withoutFence.indexOf("{");
  const last = withoutFence.lastIndexOf("}");
  if (first !== -1 && last > first) {
    candidates.push(withoutFence.slice(first, last + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      continue;
    }
  }
  return null;
}

function toConfidence(value: unknown): Confidence {
  return value === "high" || value === "medium" || value === "low" ? value : "low";
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function normalizeAnalysis(raw: unknown): AnalyzeResult {
  if (typeof raw !== "object" || raw === null) return { ok: false, reason: "unparseable" };
  const envelope = raw as Record<string, unknown>;

  if (envelope.isFood !== true) return { ok: false, reason: "not_food" };

  const rawItems = Array.isArray(envelope.items) ? (envelope.items as RawItem[]) : [];
  if (rawItems.length === 0) return { ok: false, reason: "unparseable" };

  const items: AnalyzedItem[] = [];
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalGrams = 0;

  for (const rawItem of rawItems.slice(0, MAX_ITEMS)) {
    if (typeof rawItem !== "object" || rawItem === null) continue;

    const name = typeof rawItem.name === "string" ? rawItem.name.trim() : "";
    const grams = toNumber(rawItem.grams);
    if (!name || grams === null || grams <= 0 || grams > MAX_ITEM_GRAMS) continue;

    const caloriesPer100g = toNumber(rawItem.caloriesPer100g) ?? 0;
    const proteinPer100g = toNumber(rawItem.proteinPer100g) ?? 0;
    const carbsPer100g = toNumber(rawItem.carbsPer100g) ?? 0;
    const fatPer100g = toNumber(rawItem.fatPer100g) ?? 0;

    // The factor converts per-100g reference values into this portion.
    const factor = grams / 100;
    const calories = round1(caloriesPer100g * factor);
    const protein = round1(proteinPer100g * factor);
    const carbs = round1(carbsPer100g * factor);
    const fat = round1(fatPer100g * factor);

    totalCalories += calories;
    totalProtein += protein;
    totalCarbs += carbs;
    totalFat += fat;
    totalGrams += grams;

    items.push({ name, grams: round1(grams), confidence: toConfidence(rawItem.confidence), calories, protein, carbs, fat });
  }

  if (items.length === 0 || totalGrams > MAX_TOTAL_GRAMS) return { ok: false, reason: "unparseable" };

  const dishName = typeof envelope.dishName === "string" ? envelope.dishName.trim() : "";
  const notes = typeof envelope.notes === "string" ? envelope.notes.trim() : "";

  return {
    ok: true,
    analysis: {
      dishName: dishName || items.map((item) => item.name).join(", "),
      items,
      totals: {
        calories: Math.round(totalCalories),
        protein: round1(totalProtein),
        carbs: round1(totalCarbs),
        fat: round1(totalFat),
      },
      overallConfidence: toConfidence(envelope.overallConfidence),
      notes,
    },
  };
}
