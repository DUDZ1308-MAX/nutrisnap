import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth } from "../_lib.js";
import { parseBarcode, normalizeOffProduct, toWholeNumbers } from "./_normalize.js";

const OFF_PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product";

// Open Food Facts asks consumers to send a identifying User-Agent, and the browser
// cannot set one, which is why this lookup is proxied server-side.
const OFF_USER_AGENT = "NutriSnap/1.0 (https://nutrisnap-iota-orcin.vercel.app)";

const FIELDS = [
  "code",
  "product_name",
  "brands",
  "quantity",
  "serving_size",
  "serving_quantity",
  "nutrition_data",
  "image_front_small_url",
  "energy-kcal_100g",
  "energy-kcal_serving",
  "energy-kj_100g",
  "energy-kj_serving",
  "proteins_100g",
  "proteins_serving",
  "carbohydrates_100g",
  "carbohydrates_serving",
  "fat_100g",
  "fat_serving",
].join(",");

const UPSTREAM_TIMEOUT_MS = 8000;

// Open Food Facts allows 15 read requests/minute per IP. Stay under it and cache
// aggressively, because scan-heavy use would otherwise get the deployment banned.
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;
const THROTTLE_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;

type CacheEntry = { expiresAt: number; payload: unknown };
const cache = new Map<string, CacheEntry>();
const hits = new Map<string, { count: number; windowStart: number }>();

function isThrottled(userId: string): boolean {
  const now = Date.now();
  const record = hits.get(userId);
  if (!record || now - record.windowStart >= THROTTLE_WINDOW_MS) {
    hits.set(userId, { count: 1, windowStart: now });
    return false;
  }
  record.count += 1;
  return record.count > MAX_REQUESTS_PER_WINDOW;
}

function readCache(code: string): unknown | undefined {
  const entry = cache.get(code);
  if (!entry) return undefined;
  if (Date.now() >= entry.expiresAt) {
    cache.delete(code);
    return undefined;
  }
  return entry.payload;
}

function writeCache(code: string, payload: unknown): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
  cache.set(code, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = requireAuth(req, res);
  if (!user) return;

  const code = parseBarcode(typeof req.query.code === "string" ? req.query.code : "");
  if (!code) {
    return res.status(400).json({ error: "That does not look like a valid barcode." });
  }

  if (isThrottled(user.id)) {
    return res.status(429).json({ error: "Too many lookups. Try again in a minute." });
  }

  const cached = readCache(code);
  if (cached) {
    return res.status(200).json(cached);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let envelope: unknown;
  try {
    const response = await fetch(`${OFF_PRODUCT_URL}/${code}.json?fields=${encodeURIComponent(FIELDS)}`, {
      headers: { "User-Agent": OFF_USER_AGENT, Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(`Open Food Facts responded ${response.status} for ${code}`);
      return res.status(502).json({ error: "The food database is not responding. Try again shortly." });
    }

    envelope = await response.json();
  } catch (error) {
    console.error("Barcode lookup failed:", error);
    return res.status(502).json({ error: "Could not reach the food database. Try again shortly." });
  } finally {
    clearTimeout(timer);
  }

  const result = normalizeOffProduct(envelope, code);

  if (!result.found) {
    return res.status(404).json({ error: "No product found for that barcode." });
  }

  const body = {
    source: "openfoodfacts",
    product: result.product,
    totals: toWholeNumbers(result.product.display),
  };

  // Cache misses as well as hits: a product that does not exist today is not
  // going to exist on the next request either.
  writeCache(code, body);

  return res.status(200).json(body);
}
