import { describe, it, expect } from "vitest";
import { parseAnalysisText, normalizeAnalysis, buildGeneratePrompt, GENERATE_SYSTEM_PROMPT } from "../../../../../api/nutrition/_analyze";

// A two-component plate the model would plausibly return.
const chickenRice = {
  isFood: true,
  dishName: "Grilled chicken with rice",
  overallConfidence: "medium",
  notes: "Assumed a standard dinner plate and a 175 g chicken breast.",
  items: [
    {
      name: "grilled chicken breast",
      grams: 175,
      caloriesPer100g: 165,
      proteinPer100g: 31,
      carbsPer100g: 0,
      fatPer100g: 3.6,
      confidence: "high",
    },
    {
      name: "cooked white rice",
      grams: 150,
      caloriesPer100g: 130,
      proteinPer100g: 2.7,
      carbsPer100g: 28.2,
      fatPer100g: 0.3,
      confidence: "medium",
    },
  ],
};

describe("parseAnalysisText", () => {
  it("parses plain JSON", () => {
    expect(parseAnalysisText('{"isFood":true}')).toEqual({ isFood: true });
  });

  it("parses fenced JSON", () => {
    expect(parseAnalysisText('```json\n{"isFood":true}\n```')).toEqual({ isFood: true });
  });

  it("parses a fenced block with no language tag", () => {
    expect(parseAnalysisText('```\n{"isFood":true}\n```')).toEqual({ isFood: true });
  });

  it("recovers JSON wrapped in prose", () => {
    const text = 'Here is the analysis:\n{"isFood":true,"items":[]}\nHope that helps!';
    expect(parseAnalysisText(text)).toEqual({ isFood: true, items: [] });
  });

  it("returns null for unparseable text", () => {
    expect(parseAnalysisText("I cannot analyze this image.")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseAnalysisText("   ")).toBeNull();
  });
});

describe("normalizeAnalysis", () => {
  it("scales per-100g macros into per-portion values", () => {
    const result = normalizeAnalysis(chickenRice);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // 175 g of chicken at 165 kcal/100 g is 288.75, rounded to 288.8.
    const chicken = result.analysis.items[0];
    expect(chicken.calories).toBeCloseTo(288.8, 1);
    expect(chicken.protein).toBeCloseTo(54.3, 1);
    expect(chicken.carbs).toBe(0);
    expect(chicken.fat).toBeCloseTo(6.3, 1);
  });

  it("sums components into meal totals", () => {
    const result = normalizeAnalysis(chickenRice);
    if (!result.ok) throw new Error("expected a successful analysis");

    // 288.75 (chicken) + 195 (rice) = 483.75 -> 484
    expect(result.analysis.totals.calories).toBe(484);
    expect(result.analysis.totals.protein).toBeCloseTo(58.4, 1);
    expect(result.analysis.totals.carbs).toBeCloseTo(42.3, 1);
    expect(result.analysis.totals.fat).toBeCloseTo(6.8, 1);
  });

  it("never reports a model-supplied total", () => {
    const withTotals = { ...chickenRice, totals: { calories: 9999 } };
    const result = normalizeAnalysis(withTotals);
    if (!result.ok) throw new Error("expected a successful analysis");
    expect(result.analysis.totals.calories).toBe(484);
  });

  it("preserves the dish name and notes", () => {
    const result = normalizeAnalysis(chickenRice);
    if (!result.ok) throw new Error("expected a successful analysis");
    expect(result.analysis.dishName).toBe("Grilled chicken with rice");
    expect(result.analysis.notes).toContain("standard dinner plate");
    expect(result.analysis.overallConfidence).toBe("medium");
  });

  it("falls back to the component names when there is no dish name", () => {
    const result = normalizeAnalysis({ ...chickenRice, dishName: "   " });
    if (!result.ok) throw new Error("expected a successful analysis");
    expect(result.analysis.dishName).toBe("grilled chicken breast, cooked white rice");
  });

  it("rejects an image the model says is not food", () => {
    expect(normalizeAnalysis({ isFood: false, items: [] })).toEqual({ ok: false, reason: "not_food" });
  });

  it("rejects a food image with no components", () => {
    expect(normalizeAnalysis({ isFood: true, items: [] })).toEqual({ ok: false, reason: "unparseable" });
  });

  it("treats missing macros as zero rather than dropping the item", () => {
    const result = normalizeAnalysis({
      isFood: true,
      items: [{ name: "black coffee", grams: 240, confidence: "high" }],
    });
    if (!result.ok) throw new Error("expected a successful analysis");
    expect(result.analysis.items[0].calories).toBe(0);
    expect(result.analysis.totals.calories).toBe(0);
  });

  it("drops components with a missing or unusable gram weight", () => {
    const result = normalizeAnalysis({
      isFood: true,
      items: [
        { name: "salad", grams: 100, caloriesPer100g: 20 },
        { name: "mystery sauce", caloriesPer100g: 100 },
        { name: "impossible portion", grams: -5, caloriesPer100g: 100 },
        { name: "absurd portion", grams: 99999, caloriesPer100g: 100 },
      ],
    });
    if (!result.ok) throw new Error("expected a successful analysis");
    expect(result.analysis.items).toHaveLength(1);
    expect(result.analysis.items[0].name).toBe("salad");
  });

  it("caps the number of components", () => {
    const many = Array.from({ length: 20 }, (_, index) => ({
      name: `component ${index}`,
      grams: 10,
      caloriesPer100g: 50,
    }));
    const result = normalizeAnalysis({ isFood: true, items: many });
    if (!result.ok) throw new Error("expected a successful analysis");
    expect(result.analysis.items).toHaveLength(12);
  });

  it("rejects an implausible total weight", () => {
    const result = normalizeAnalysis({
      isFood: true,
      items: [
        { name: "a", grams: 2900, caloriesPer100g: 50 },
        { name: "b", grams: 2900, caloriesPer100g: 50 },
      ],
    });
    expect(result).toEqual({ ok: false, reason: "unparseable" });
  });

  it("downgrades an unrecognised confidence to low", () => {
    const result = normalizeAnalysis({
      isFood: true,
      overallConfidence: "very sure",
      items: [{ name: "toast", grams: 50, caloriesPer100g: 250, confidence: "certain" }],
    });
    if (!result.ok) throw new Error("expected a successful analysis");
    expect(result.analysis.overallConfidence).toBe("low");
    expect(result.analysis.items[0].confidence).toBe("low");
  });

  it("rejects non-object input", () => {
    expect(normalizeAnalysis(null)).toEqual({ ok: false, reason: "unparseable" });
    expect(normalizeAnalysis("nope")).toEqual({ ok: false, reason: "unparseable" });
  });
});

describe("buildGeneratePrompt", () => {
  it("includes the meal name", () => {
    const prompt = buildGeneratePrompt("2 eggs, toast, and coffee", false);
    expect(prompt).toContain("2 eggs, toast, and coffee");
  });

  it("mentions the photo when one is attached", () => {
    const prompt = buildGeneratePrompt("oatmeal with banana", true);
    expect(prompt).toContain("photo");
  });

  it("does not mention a photo when none is attached", () => {
    const prompt = buildGeneratePrompt("oatmeal with banana", false);
    expect(prompt).not.toContain("photo");
  });

  it("asks for JSON matching the schema", () => {
    expect(buildGeneratePrompt("salad", false)).toContain("JSON");
  });
});

describe("GENERATE_SYSTEM_PROMPT", () => {
  it("asks for components with per-100g macros and portion weights", () => {
    expect(GENERATE_SYSTEM_PROMPT).toContain("per 100 g");
    expect(GENERATE_SYSTEM_PROMPT).toContain("portion weight");
  });

  it("forbids meal totals so the app computes them", () => {
    expect(GENERATE_SYSTEM_PROMPT).toContain("Never report meal totals");
  });
});
