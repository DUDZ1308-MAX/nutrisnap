// Pure normalisation of Open Food Facts API v2 responses.
//
// Lives behind an underscore so Vercel does not treat it as a serverless function,
// and deliberately has no imports so it can be unit tested directly.

export type NutrientBasis = "serving" | "100g";

export interface NormalizedMacros {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

export interface NormalizedProduct {
  code: string;
  name: string;
  brands: string;
  imageUrl: string | null;
  quantity: string | null;
  /** Which basis `display` is expressed in. */
  basis: NutrientBasis;
  servingLabel: string | null;
  /** Serving weight in grams, when known. */
  servingGrams: number | null;
  per100g: NormalizedMacros;
  /** Present when the product declares serving-level nutrients or a serving size. */
  perServing: NormalizedMacros | null;
  /** What should prefill the meal form. */
  display: NormalizedMacros;
  noNutritionData: boolean;
}

export type OffLookupResult =
  | { found: false }
  | { found: true; product: NormalizedProduct };

const KJ_PER_KCAL = 4.184;

/** Coerce an Open Food Facts value to a finite, non-negative number. Values arrive as strings in parts of the dataset. */
export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || typeof value === "boolean") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

/**
 * Validate a scanned or typed barcode. Strips separators (EAN-13 prints as
 * "5 449000 000996") and accepts the 8-14 digit range used by UPC, EAN and ITF.
 */
export function parseBarcode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 14) return null;
  return digits;
}

/** Calories prefer the explicit kcal field, falling back to kJ when a product only lists energy in kilojoules. */
function caloriesFrom(source: Record<string, unknown>, suffix: string): number | null {
  const kcal = toNumber(source[`energy-kcal_${suffix}`]);
  if (kcal !== null) return kcal;
  const kj = toNumber(source[`energy-kj_${suffix}`]);
  return kj === null ? null : kj / KJ_PER_KCAL;
}

function macrosFrom(source: Record<string, unknown>, suffix: string): NormalizedMacros {
  return {
    calories: caloriesFrom(source, suffix),
    protein: toNumber(source[`proteins_${suffix}`]),
    carbs: toNumber(source[`carbohydrates_${suffix}`]),
    fat: toNumber(source[`fat_${suffix}`]),
  };
}

function hasAnyMacro(macros: NormalizedMacros): boolean {
  return macros.calories !== null || macros.protein !== null || macros.carbs !== null || macros.fat !== null;
}

function scale(macros: NormalizedMacros, factor: number): NormalizedMacros {
  return {
    calories: macros.calories === null ? null : macros.calories * factor,
    protein: macros.protein === null ? null : macros.protein * factor,
    carbs: macros.carbs === null ? null : macros.carbs * factor,
    fat: macros.fat === null ? null : macros.fat * factor,
  };
}

/**
 * `requestedCode` is echoed back because Open Food Facts rewrites the code it
 * returns (it strips leading zeros), so the response code cannot be used as a cache key.
 */
export function normalizeOffProduct(raw: unknown, requestedCode: string): OffLookupResult {
  if (typeof raw !== "object" || raw === null) return { found: false };

  const envelope = raw as Record<string, unknown>;
  if (envelope.status !== 1) return { found: false };

  const product = envelope.product;
  if (typeof product !== "object" || product === null) return { found: false };

  const fields = product as Record<string, unknown>;
  const per100g = macrosFrom(fields, "100g");
  const declaredServing = macrosFrom(fields, "serving");
  const servingGrams = toNumber(fields.serving_quantity);
  const hasDeclaredServing = hasAnyMacro(declaredServing);

  // Prefer the label's own serving values. When a product lists only per-100g
  // nutrients but does declare a serving size, derive the serving from it.
  let perServing: NormalizedMacros | null = null;
  if (hasDeclaredServing) {
    perServing = declaredServing;
  } else if (servingGrams !== null && servingGrams > 0 && hasAnyMacro(per100g)) {
    perServing = scale(per100g, servingGrams / 100);
  }

  const useServing = perServing !== null && hasAnyMacro(perServing);
  const display = useServing ? (perServing as NormalizedMacros) : per100g;

  const name = typeof fields.product_name === "string" ? fields.product_name.trim() : "";
  const brands = typeof fields.brands === "string" ? fields.brands.trim() : "";
  const imageUrl = typeof fields.image_front_small_url === "string" ? fields.image_front_small_url : null;
  const quantity = typeof fields.quantity === "string" ? fields.quantity.trim() : "";
  const servingLabel = typeof fields.serving_size === "string" ? fields.serving_size.trim() : "";

  return {
    found: true,
    product: {
      code: requestedCode,
      name: name || brands || "Unknown product",
      brands,
      imageUrl,
      quantity: quantity || null,
      basis: useServing ? "serving" : "100g",
      servingLabel: servingLabel || null,
      servingGrams,
      per100g,
      perServing,
      display,
      noNutritionData: !hasAnyMacro(display),
    },
  };
}

/** Rounds to whole units, since the meals table stores integer macros. */
export function toWholeNumbers(macros: NormalizedMacros): { calories: number; protein: number; carbs: number; fat: number } {
  return {
    calories: Math.round(macros.calories ?? 0),
    protein: Math.round(macros.protein ?? 0),
    carbs: Math.round(macros.carbs ?? 0),
    fat: Math.round(macros.fat ?? 0),
  };
}
