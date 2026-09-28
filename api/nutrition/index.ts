import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth } from "../_lib.js";
import { parseBarcode, normalizeOffProduct, toWholeNumbers } from "./_normalize.js";
import {
  ANALYZE_SYSTEM_PROMPT,
  ANALYZE_RESPONSE_SCHEMA,
  buildAnalyzePrompt,
  parseAnalysisText,
  normalizeAnalysis,
} from "./_analyze.js";

const OFF_PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product";

// 2.5 Flash is closed to new users and the larger 3.x Flash models are frequently
// capacity limited, so the lite tier is the default. Override with GEMINI_MODEL.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Vision inference is far slower and costlier than a barcode lookup. Measured calls
// against Gemini have run from 9s to 42s, so the function must be allowed to stay up
// well past Vercel's default 10s limit or the platform kills it mid-request.
export const config = { maxDuration: 60 };

const ANALYZE_TIMEOUT_MS = 55000;
const ANALYZE_THROTTLE_WINDOW_MS = 60 * 1000;
const ANALYZE_MAX_PER_WINDOW = 10;
// Gemini returns UNAVAILABLE under real load often enough to be worth one retry.
const ANALYZE_ATTEMPTS = 2;

// The browser already downsizes the photo, so anything larger is not a real meal shot.
const MAX_IMAGE_BYTES = 1_500_000;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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

type CacheEntry = { expiresAt: number; status: number; payload: unknown };
const cache = new Map<string, CacheEntry>();
const hits = new Map<string, { count: number; windowStart: number }>();
const analyzeHits = new Map<string, { count: number; windowStart: number }>();

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

function isAnalyzeThrottled(userId: string): boolean {
  const now = Date.now();
  const record = analyzeHits.get(userId);
  if (!record || now - record.windowStart >= ANALYZE_THROTTLE_WINDOW_MS) {
    analyzeHits.set(userId, { count: 1, windowStart: now });
    return false;
  }
  record.count += 1;
  return record.count > ANALYZE_MAX_PER_WINDOW;
}

function readCache(code: string): CacheEntry | undefined {
  const entry = cache.get(code);
  if (!entry) return undefined;
  if (Date.now() >= entry.expiresAt) {
    cache.delete(code);
    return undefined;
  }
  return entry;
}

function writeCache(code: string, status: number, payload: unknown): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
  cache.set(code, { expiresAt: Date.now() + CACHE_TTL_MS, status, payload });
}

/** Splits a data URL into its mime type and base64 payload, rejecting anything unexpected. */
function readImageDataUrl(value: unknown): { mimeType: string; base64: string } | null {
  if (typeof value !== "string") return null;
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value.trim());
  if (!match) return null;
  if (!ALLOWED_IMAGE_TYPES.has(match[1])) return null;
  // base64 expands by 4/3, so compare against the encoded length rather than decoding.
  if (Math.ceil((match[2].length * 3) / 4) > MAX_IMAGE_BYTES) return null;
  return { mimeType: match[1], base64: match[2] };
}

async function handleAnalyze(req: VercelRequest, res: VercelResponse) {
  const user = requireAuth(req, res);
  if (!user) return;

  const body = typeof req.body === "object" && req.body !== null ? (req.body as Record<string, unknown>) : {};

  // Consent is checked before anything else, and a photo is never sent upstream without it.
  if (body.consent !== true) {
    return res.status(403).json({
      error: "Photo analysis needs your consent before a photo can be sent to Google.",
      code: "consent_required",
    });
  }

  const image = readImageDataUrl(body.imageDataUrl);
  if (!image) {
    return res.status(400).json({ error: "Add a photo to analyze." });
  }

  if (isAnalyzeThrottled(user.id)) {
    return res.status(429).json({ error: "Too many analyses. Give it a minute and try again." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not configured. Photo analysis is unavailable.");
    return res.status(503).json({ error: "Photo analysis is not configured on this deployment." });
  }

  // The client must have shown the disclosure and had it accepted. A durable
  // per-user receipt lives in its own table, which is created by a migration and
  // deliberately kept off the users table so a missing table can never take
  // login and registration down with it.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);

  let modelReply = "";
  let lastStatus = 0;
  let lastDetail = "";

  try {
    for (let attempt = 1; attempt <= ANALYZE_ATTEMPTS; attempt += 1) {
      const response = await fetch(GEMINI_ENDPOINT, {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: ANALYZE_SYSTEM_PROMPT }] },
          contents: [
            {
              role: "user",
              parts: [{ text: buildAnalyzePrompt() }, { inline_data: { mime_type: image.mimeType, data: image.base64 } }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            // Six components is a few hundred tokens; a small ceiling measurably
            // cuts latency, which is the slowest part of this request.
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
            responseSchema: ANALYZE_RESPONSE_SCHEMA,
          },
        }),
      });

      if (response.ok) {
        const payload = await response.json();
        const parts = payload?.candidates?.[0]?.content?.parts;
        modelReply = Array.isArray(parts)
          ? parts.map((part: { text?: unknown }) => (typeof part.text === "string" ? part.text : "")).join("")
          : "";
        break;
      }

      lastStatus = response.status;
      lastDetail = (await response.text()).slice(0, 500);

      const retryable = response.status === 503 || response.status === 429;
      if (!retryable || attempt === ANALYZE_ATTEMPTS) {
        console.error(`Gemini responded ${response.status}: ${lastDetail}`);
        break;
      }

      console.warn(`Gemini ${response.status} on attempt ${attempt}/${ANALYZE_ATTEMPTS}, retrying`);
      await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
    }
  } catch (error) {
    console.error("Photo analysis failed:", error);
    return res.status(502).json({ error: "Photo analysis timed out. Try again." });
  } finally {
    clearTimeout(timer);
  }

  if (!modelReply) {
    if (lastStatus === 503) {
      return res.status(503).json({ error: "Photo analysis is busy right now. Try again shortly." });
    }
    if (lastStatus === 429) {
      return res.status(429).json({ error: "Photo analysis hit its rate limit. Try again shortly." });
    }
    if (lastStatus === 400) {
      return res.status(502).json({ error: "Photo analysis could not understand that photo. Try a clearer one." });
    }
    return res.status(502).json({ error: "Photo analysis failed. Try again shortly." });
  }

  const result = normalizeAnalysis(parseAnalysisText(modelReply));

  // The success branch is checked first because this package compiles without
  // strictNullChecks, which disables narrowing on a boolean discriminant.
  if (result.ok) {
    return res.status(200).json({ source: "gemini", ...result.analysis });
  }

  const { reason } = result as { reason: "not_food" | "unparseable" };
  if (reason === "not_food") {
    return res.status(422).json({ error: "That does not look like food. Try a photo of the meal itself." });
  }
  return res.status(502).json({ error: "Photo analysis returned something unreadable. Try again." });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "POST") {
    return handleAnalyze(req, res);
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
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
    return res.status(cached.status).json(cached.payload);
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
    // Cache misses as well as hits: a product that does not exist today is not
    // going to exist on the next request either.
    const notFound = { error: "No product found for that barcode." };
    writeCache(code, 404, notFound);
    return res.status(404).json(notFound);
  }

  const body = {
    source: "openfoodfacts",
    product: result.product,
    totals: toWholeNumbers(result.product.display),
  };

  writeCache(code, 200, body);

  return res.status(200).json(body);
}
