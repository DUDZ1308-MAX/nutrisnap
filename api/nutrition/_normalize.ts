// Shared pure helpers for nutrition normalisation.
//
// Underscore prefix keeps Vercel from treating this as a serverless function.

export interface NormalizedMacros {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

/** Coerce an API value to a finite, non-negative number. Values arrive as strings in parts of every dataset. */
export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || typeof value === "boolean") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}
