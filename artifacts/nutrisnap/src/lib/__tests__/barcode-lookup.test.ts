import { describe, it, expect } from "vitest";
import {
  parseBarcode,
  toNumber,
  normalizeOffProduct,
  toWholeNumbers,
} from "../../../../../api/nutrition/_normalize";

// Fixtures captured from live Open Food Facts responses.
const coke = {
  status: 1,
  product: {
    code: "5449000000996",
    product_name: "Coca-Cola",
    brands: "COCA-COLA SERVICES SA/NV",
    quantity: "330 ml",
    serving_size: "1 portion (330 ml)",
    serving_quantity: 330,
    nutrition_data: "on",
    image_front_small_url: "https://images.openfoodfacts.org/front_en.jpg",
    "energy-kcal_100g": 42,
    "energy-kcal_serving": 139,
    "energy-kj_100g": 180,
    "energy-kj_serving": 594,
    "proteins_100g": 0,
    "proteins_serving": 0,
    "carbohydrates_100g": 10.6,
    "carbohydrates_serving": 35,
    "fat_100g": 0,
    "fat_serving": 0,
  },
};

// Real product that lists only per-100g nutrients and no serving size.
const nutella = {
  status: 1,
  product: {
    code: "3017620422003",
    product_name: "Nutella",
    brands: "Nutella, Ferrero",
    "energy-kcal_100g": 539,
    "energy-kj_100g": 2252,
    "proteins_100g": 6.3,
    "carbohydrates_100g": 57.5,
    "fat_100g": 30.9,
  },
};

describe("parseBarcode", () => {
  it("strips the spaces EAN-13 prints carry", () => {
    expect(parseBarcode("5 449000 000996")).toBe("5449000000996");
  });

  it("accepts UPC-A, EAN-8 and ITF-14 lengths", () => {
    expect(parseBarcode("12345670")).toBe("12345670");
    expect(parseBarcode("5449000000996")).toBe("5449000000996");
    expect(parseBarcode("12345678901234")).toBe("12345678901234");
  });

  it("rejects codes that are too short or too long", () => {
    expect(parseBarcode("1234567")).toBeNull();
    expect(parseBarcode("123456789012345")).toBeNull();
    expect(parseBarcode("abc")).toBeNull();
    expect(parseBarcode("")).toBeNull();
  });

  it("rejects non-strings", () => {
    expect(parseBarcode(5449000000996)).toBeNull();
    expect(parseBarcode(undefined)).toBeNull();
  });
});

describe("toNumber", () => {
  it("coerces numeric strings, as parts of the dataset return them", () => {
    expect(toNumber("42.5")).toBe(42.5);
  });

  it("rejects null, booleans, non-numeric and negative values", () => {
    expect(toNumber(null)).toBeNull();
    expect(toNumber(undefined)).toBeNull();
    expect(toNumber(true)).toBeNull();
    expect(toNumber("abc")).toBeNull();
    expect(toNumber(-5)).toBeNull();
  });
});

describe("normalizeOffProduct", () => {
  it("prefers the label serving when serving nutrients exist", () => {
    const result = normalizeOffProduct(coke, "5449000000996");
    expect(result.found).toBe(true);
    if (!result.found) return;

    expect(result.product.basis).toBe("serving");
    expect(result.product.servingLabel).toBe("1 portion (330 ml)");
    expect(result.product.display.calories).toBe(139);
    expect(result.product.display.carbs).toBe(35);
  });

  it("falls back to per-100g when no serving size is declared", () => {
    const result = normalizeOffProduct(nutella, "3017620422003");
    expect(result.found).toBe(true);
    if (!result.found) return;

    expect(result.product.basis).toBe("100g");
    expect(result.product.perServing).toBeNull();
    expect(result.product.display.calories).toBe(539);
  });

  it("derives a serving from serving_quantity when only per-100g values exist", () => {
    const derived = {
      status: 1,
      product: { ...nutella.product, serving_quantity: 50 },
    };
    const result = normalizeOffProduct(derived, "3017620422003");
    expect(result.found).toBe(true);
    if (!result.found) return;

    expect(result.product.basis).toBe("serving");
    expect(result.product.perServing?.calories).toBeCloseTo(269.5, 5);
  });

  it("converts kJ to kcal when kcal is absent", () => {
    const kilojouleOnly = {
      status: 1,
      product: { code: "1", "energy-kj_100g": 418.4, "proteins_100g": 10 },
    };
    const result = normalizeOffProduct(kilojouleOnly, "12345678");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.product.display.calories).toBeCloseTo(100, 4);
  });

  it("keeps missing nutrients as null rather than zero", () => {
    const partial = { status: 1, product: { code: "1", "energy-kcal_100g": 200 } };
    const result = normalizeOffProduct(partial, "12345678");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.product.display.protein).toBeNull();
    expect(result.product.display.fat).toBeNull();
    expect(result.product.noNutritionData).toBe(false);
  });

  it("flags a product with no nutrition data at all", () => {
    const bare = { status: 1, product: { code: "1", product_name: "Water", nutrition_data: "off" } };
    const result = normalizeOffProduct(bare, "12345678");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.product.noNutritionData).toBe(true);
  });

  it("treats status 0 as not found", () => {
    expect(normalizeOffProduct({ code: "00000017", status: 0 }, "0000000000017").found).toBe(false);
  });

  it("returns not found for malformed upstream payloads", () => {
    expect(normalizeOffProduct(null, "1").found).toBe(false);
    expect(normalizeOffProduct("nope", "1").found).toBe(false);
    expect(normalizeOffProduct({ status: 1 }, "1").found).toBe(false);
  });

  it("echoes the requested code, since Open Food Facts rewrites the one it returns", () => {
    const zeroPadded = { status: 1, product: { code: "00000017", "energy-kcal_100g": 10 } };
    const result = normalizeOffProduct(zeroPadded, "0000000000017");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.product.code).toBe("0000000000017");
  });

  it("falls back to the brand when the product has no name", () => {
    const unnamed = { status: 1, product: { code: "1", brands: "Acme", "energy-kcal_100g": 10 } };
    const result = normalizeOffProduct(unnamed, "1");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.product.name).toBe("Acme");
  });
});

describe("toWholeNumbers", () => {
  it("rounds for the integer meal columns and treats null as zero", () => {
    expect(toWholeNumbers({ calories: 139.4, protein: 0.6, carbs: null, fat: 10.5 })).toEqual({
      calories: 139,
      protein: 1,
      carbs: 0,
      fat: 11,
    });
  });
});
