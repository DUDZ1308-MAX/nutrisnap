import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth } from "../_lib.js";
import { normalizeFdcSearch, rankFdcFoods } from "./_fdc.js";
import {
  ANALYZE_SYSTEM_PROMPT,
  GENERATE_SYSTEM_PROMPT,
  ANALYZE_RESPONSE_SCHEMA,
  buildAnalyzePrompt,
  buildGeneratePrompt,
  parseAnalysisText,
  normalizeAnalysis,
} from "./_analyze.js";

// 2.5 Flash is closed to new users and the larger 3.x Flash models are frequently
// capacity limited, so the lite tier is the default. Override with GEMINI_MODEL.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Vision and text inference are both far slower than a food search. Measured calls
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

const UPSTREAM_TIMEOUT_MS = 8000;

// FoodData Central covers generic foods, which is what someone typing a food
// name actually wants. Its Branded dataset dominates relevance ranking for
// queries like "chicken breast" and answers with a specific packaged product
// nobody was looking for, so results are re-ranked in rankFdcFoods instead.
const FDC_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";
const FDC_PAGE_SIZE = 12;
// Food composition data does not change between releases, so searches are held
// far longer than barcodes, including empty results.
const SEARCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_SEARCH_LENGTH = 80;

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

function readCache(key: string): CacheEntry | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() >= entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry;
}

function writeCache(key: string, status: number, payload: unknown, ttlMs: number = CACHE_TTL_MS): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
  cache.set(key, { expiresAt: Date.now() + ttlMs, status, payload });
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

type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };
type GeminiOutcome = { ok: true; text: string } | { ok: false; status: number };

function isGeminiFailure(outcome: GeminiOutcome): outcome is { ok: false; status: number } {
  return outcome.ok === false;
}

/**
 * Shared Gemini call for both photo analysis and text generation. Handles the
 * timeout, the single retry on capacity errors, and extraction of the model's
 * text from the response envelope.
 */
async function callGemini(systemPrompt: string, parts: GeminiPart[]): Promise<GeminiOutcome> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not configured.");
    return { ok: false, status: 503 };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);

  let modelReply = "";
  let lastStatus = 0;

  try {
    for (let attempt = 1; attempt <= ANALYZE_ATTEMPTS; attempt += 1) {
      const response = await fetch(GEMINI_ENDPOINT, {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts }],
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
        const contentParts = payload?.candidates?.[0]?.content?.parts;
        modelReply = Array.isArray(contentParts)
          ? contentParts.map((part: { text?: unknown }) => (typeof part.text === "string" ? part.text : "")).join("")
          : "";
        break;
      }

      lastStatus = response.status;
      const retryable = response.status === 503 || response.status === 429;
      if (!retryable || attempt === ANALYZE_ATTEMPTS) {
        console.error(`Gemini responded ${response.status}: ${(await response.text()).slice(0, 500)}`);
        break;
      }

      console.warn(`Gemini ${response.status} on attempt ${attempt}/${ANALYZE_ATTEMPTS}, retrying`);
      await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
    }
  } catch (error) {
    console.error("Gemini call failed:", error);
    return { ok: false, status: 502 };
  } finally {
    clearTimeout(timer);
  }

  if (!modelReply) {
    return { ok: false, status: lastStatus || 502 };
  }
  return { ok: true, text: modelReply };
}

function mapGeminiError(res: VercelResponse, status: number) {
  if (status === 503) {
    return res.status(503).json({ error: "Analysis is busy right now. Try again shortly." });
  }
  if (status === 429) {
    return res.status(429).json({ error: "Analysis hit its rate limit. Try again shortly." });
  }
  if (status === 400) {
    return res.status(502).json({ error: "Analysis could not understand that input. Try again." });
  }
  return res.status(502).json({ error: "Analysis failed. Try again shortly." });
}

function sendAnalysis(res: VercelResponse, modelReply: string) {
  const result = normalizeAnalysis(parseAnalysisText(modelReply));

  // The success branch is checked first because this package compiles without
  // strictNullChecks, which disables narrowing on a boolean discriminant.
  if (result.ok) {
    return res.status(200).json({ source: "gemini", ...result.analysis });
  }

  const { reason } = result as { reason: "not_food" | "unparseable" };
  if (reason === "not_food") {
    return res.status(422).json({ error: "That does not look like food. Try a different description." });
  }
  return res.status(502).json({ error: "Analysis returned something unreadable. Try again." });
}

function readBody(req: VercelRequest): Record<string, unknown> {
  return typeof req.body === "object" && req.body !== null ? (req.body as Record<string, unknown>) : {};
}

async function handleAnalyze(req: VercelRequest, res: VercelResponse) {
  const user = requireAuth(req, res);
  if (!user) return;

  const body = readBody(req);

  // Consent is checked before anything else, and a photo is never sent upstream without it.
  if (body.consent !== true) {
    return res.status(403).json({
      error: "Photo analysis needs your consent before a photo can be sent to Google.",
      code: "consent_required",
    });
  }

  if (body.imageDataUrl === undefined || body.imageDataUrl === null || body.imageDataUrl === "") {
    return res.status(400).json({ error: "Add a photo to analyze." });
  }

  const image = readImageDataUrl(body.imageDataUrl);
  if (!image) {
    // The photo was sent but is not something we can use, which is a different
    // problem from having forgotten to attach one.
    return res.status(400).json({ error: "That photo could not be read. Try a JPEG, PNG, or WebP under 1.5 MB." });
  }

  if (isAnalyzeThrottled(user.id)) {
    return res.status(429).json({ error: "Too many analyses. Give it a minute and try again." });
  }

  const outcome = await callGemini(ANALYZE_SYSTEM_PROMPT, [
    { text: buildAnalyzePrompt() },
    { inline_data: { mime_type: image.mimeType, data: image.base64 } },
  ]);
  if (isGeminiFailure(outcome)) {
    return mapGeminiError(res, outcome.status);
  }
  return sendAnalysis(res, outcome.text);
}

async function handleGenerate(req: VercelRequest, res: VercelResponse) {
  const user = requireAuth(req, res);
  if (!user) return;

  const body = readBody(req);

  if (body.consent !== true) {
    return res.status(403).json({
      error: "Generating nutrition facts needs your consent before your meal can be sent to Google.",
      code: "consent_required",
    });
  }

  const mealName = typeof body.mealName === "string" ? body.mealName.trim() : "";
  if (mealName.length < 2) {
    return res.status(400).json({ error: "Give this meal a name first." });
  }

  // A photo is optional. When one is attached it is sent alongside the name so
  // the model can refine portions and spot components the text did not mention.
  let image: { mimeType: string; base64: string } | null = null;
  if (typeof body.imageDataUrl === "string" && body.imageDataUrl !== "") {
    image = readImageDataUrl(body.imageDataUrl);
    if (!image) {
      return res.status(400).json({ error: "That photo could not be read. Try a JPEG, PNG, or WebP under 1.5 MB." });
    }
  }

  if (isAnalyzeThrottled(user.id)) {
    return res.status(429).json({ error: "Too many requests. Give it a minute and try again." });
  }

  const parts: GeminiPart[] = [{ text: buildGeneratePrompt(mealName, image !== null) }];
  if (image) {
    parts.push({ inline_data: { mime_type: image.mimeType, data: image.base64 } });
  }

  const outcome = await callGemini(GENERATE_SYSTEM_PROMPT, parts);
  if (isGeminiFailure(outcome)) {
    return mapGeminiError(res, outcome.status);
  }
  return sendAnalysis(res, outcome.text);
}

async function handleSearch(res: VercelResponse, rawQuery: string, userId: string) {
  const query = rawQuery.replace(/\s+/g, " ").trim();
  if (query.length < 2) {
    return res.status(400).json({ error: "Type at least two letters to search." });
  }
  if (query.length > MAX_SEARCH_LENGTH) {
    return res.status(400).json({ error: `Keep the search under ${MAX_SEARCH_LENGTH} letters.` });
  }

  const apiKey = process.env.FDC_API_KEY;
  if (!apiKey) {
    console.error("FDC_API_KEY is not configured. Food search is unavailable.");
    return res.status(503).json({ error: "Food search is not configured on this deployment." });
  }

  if (isThrottled(userId)) {
    return res.status(429).json({ error: "Too many lookups. Try again in a minute." });
  }

  const cacheKey = `s:${query.toLowerCase()}`;
  const cached = readCache(cacheKey);
  if (cached) {
    return res.status(cached.status).json(cached.payload);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let envelope: unknown;
  try {
    // The dataType filter is omitted on purpose: it makes the endpoint return
    // intermittent 400s, and ranking happens in rankFdcFoods instead.
    const url = `${FDC_SEARCH_URL}?query=${encodeURIComponent(query)}&pageSize=${FDC_PAGE_SIZE}&api_key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      if (response.status === 401 || response.status === 403) {
        console.error(`FoodData Central rejected the key (${response.status}): ${detail}`);
        return res.status(503).json({ error: "Food search is not configured on this deployment." });
      }
      if (response.status === 429) {
        return res.status(429).json({ error: "Food search hit its rate limit. Try again shortly." });
      }
      console.error(`FoodData Central responded ${response.status}: ${detail}`);
      return res.status(502).json({ error: "The food database is not responding. Try again shortly." });
    }

    envelope = await response.json();
  } catch (error) {
    console.error("Food search failed:", error);
    return res.status(502).json({ error: "Could not reach the food database. Try again shortly." });
  } finally {
    clearTimeout(timer);
  }

  const foods = rankFdcFoods(normalizeFdcSearch(envelope));

  // Empty results are cached too, otherwise every keystroke that matches
  // nothing spends a FoodData Central request.
  if (foods.length === 0) {
    const empty = { source: "usda", query, foods: [] };
    writeCache(cacheKey, 200, empty, SEARCH_CACHE_TTL_MS);
    return res.status(200).json(empty);
  }

  const body = { source: "usda", query, foods };
  writeCache(cacheKey, 200, body, SEARCH_CACHE_TTL_MS);
  return res.status(200).json(body);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "POST") {
    const body = readBody(req);
    // A meal name routes to text generation; a photo alone routes to photo analysis.
    if (typeof body.mealName === "string" && body.mealName.trim()) {
      return handleGenerate(req, res);
    }
    return handleAnalyze(req, res);
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = requireAuth(req, res);
  if (!user) return;

  const rawSearch = typeof req.query.search === "string" ? req.query.search : "";
  if (!rawSearch.trim()) {
    return res.status(400).json({ error: "Type at least two letters to search." });
  }
  return handleSearch(res, rawSearch, user.id);
}
