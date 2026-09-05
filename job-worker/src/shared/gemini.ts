import { GoogleGenAI } from "@google/genai";

const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_PROMPT_SUFFIX = " Return ONLY valid JSON with no markdown.";

type GeminiImagePart = {
  inlineData: {
    mimeType: string;
    data: string;
  };
};

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

function getDjangoInternalBaseUrl(): string {
  return process.env.DJANGO_INTERNAL_URL || "http://backend:8000";
}

function getImageFetchStrategies(): Array<{ viaProxy: boolean; label: string }> {
  const djangoInternal = process.env.DJANGO_INTERNAL_URL?.trim();
  if (djangoInternal) {
    return [
      { viaProxy: true, label: "backend-proxy" },
      { viaProxy: false, label: "direct" },
    ];
  }
  return [
    { viaProxy: false, label: "direct" },
    { viaProxy: true, label: "backend-proxy" },
  ];
}

function buildImageProxyUrl(imageUrl: string): string {
  return `${getDjangoInternalBaseUrl()}/api/internal/image-proxy/?url=${encodeURIComponent(imageUrl)}`;
}

async function fetchWithTimeout(
  url: string,
  timeoutMs = 30000,
  extraHeaders: Record<string, string> = {},
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        referer: "https://www.google.com/",
        "cache-control": "no-cache",
        ...extraHeaders,
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function downloadImage(
  imageUrl: string,
  viaProxy: boolean,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const requestUrl = viaProxy ? buildImageProxyUrl(imageUrl) : imageUrl;
  const headers: Record<string, string> = {};

  if (viaProxy) {
    headers.Authorization = `Bearer ${process.env.INTERNAL_API_KEY || ""}`;
  }

  const response = await fetchWithTimeout(requestUrl, 25000, headers);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  let mimeType = response.headers.get("content-type") || "image/jpeg";
  if (mimeType.includes(";")) {
    mimeType = mimeType.split(";", 1)[0].trim();
  }

  return { buffer, mimeType };
}

/**
 * Fetches a remote wardrobe image and converts it to Gemini inlineData (base64).
 * Tries direct CDN fetch first, then falls back to the Django internal proxy.
 */
async function imageUrlToPart(imageUrl: string): Promise<GeminiImagePart | null> {
  if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.startsWith("http")) {
    return null;
  }

  const strategies = getImageFetchStrategies();

  for (const { viaProxy, label } of strategies) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const { buffer, mimeType } = await downloadImage(imageUrl, viaProxy);
        if (viaProxy) {
          console.log(`[imageUrlToPart] fetched via ${label}: ${imageUrl}`);
        }
        return {
          inlineData: {
            mimeType,
            data: buffer.toString("base64"),
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }
        console.warn(
          `[imageUrlToPart] ${label} fetch failed for ${imageUrl}: ${message}`,
        );
      }
    }
  }

  return null;
}

async function generateContentWithRetry(
  parts: Array<{ text: string } | GeminiImagePart>,
): Promise<string> {
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: "user",
            parts,
          },
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      if (!response.text) {
        throw new Error("Gemini returned an empty response");
      }

      return response.text;
    } catch (error) {
      const err = error as { status?: number; code?: string; message?: string };
      const isTransient =
        err?.status === 503 ||
        err?.status === 429 ||
        err?.code === "ETIMEDOUT" ||
        err?.code === "ECONNRESET" ||
        (typeof err?.message === "string" &&
          /fetch failed|ECONNRESET|ETIMEDOUT/i.test(err.message));

      if (isTransient && attempt < MAX_ATTEMPTS) {
        const delayMs = 1500 * attempt; // 1.5s, 3s backoff
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      throw error;
    }
  }

  throw new Error("Gemini request failed after retries");
}

export async function callGeminiVision(prompt: string, imageUrls: string[]): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const validUrls = imageUrls.filter(
    (url) => url && typeof url === "string" && url.startsWith("http"),
  );

  const rawParts = await Promise.all(validUrls.map((url) => imageUrlToPart(url)));
  const imageParts = rawParts.filter((part): part is GeminiImagePart => part !== null);

  if (validUrls.length > 0 && imageParts.length === 0) {
    throw new Error(
      `Could not fetch any of ${validUrls.length} outfit image(s) for Gemini vision analysis`,
    );
  }

  if (validUrls.length > 0 && imageParts.length < validUrls.length) {
    console.warn(
      `[callGeminiVision] sending ${imageParts.length}/${validUrls.length} images to Gemini`,
    );
  }

  const parts: Array<{ text: string } | GeminiImagePart> = [
    { text: `${prompt}${GEMINI_PROMPT_SUFFIX}` },
    ...imageParts,
  ];

  return generateContentWithRetry(parts);
}

export function parseGeminiJson<T>(raw: string): T {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  const candidate = start >= 0 && end >= start ? trimmed.slice(start, end + 1) : trimmed;

  try {
    return JSON.parse(candidate) as T;
  } catch (error) {
    throw new Error(`Unable to parse Gemini JSON: ${(error as Error).message}`);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#([0-9a-fA-F]{6})$/.test(value.trim());
}

function isValidSeason(value: unknown): value is "spring" | "summer" | "fall" | "winter" {
  return value === "spring" || value === "summer" || value === "fall" || value === "winter";
}

export interface ValidatedGeminiVerdictResult {
  verdict: "works" | "doesnt_work" | "partially_works";
  confidence: number;
  visualNotes: string;
  patternClash: boolean;
  colourClash: boolean;
}

export interface ValidatedGeminiComboVisualResult {
  confirmed: boolean;
  visualScore: number;
  visualNotes: string;
}

export interface ValidatedGeminiTaggingResult {
  category: "TOP" | "BOTTOM" | "SHOES" | "OUTERWEAR" | "ACCESSORY" | "DRESS" | "BAG";
  primary_color: string;
  formality_level: number;
  season_tags: Array<"spring" | "summer" | "fall" | "winter">;
  fabric: string | null;
}

function ensureBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Invalid Gemini response: ${field} must be boolean`);
  }
  return value;
}

function ensureNumberInRange(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== "number" || Number.isNaN(value) || value < min || value > max) {
    throw new Error(`Invalid Gemini response: ${field} must be a number between ${min} and ${max}`);
  }
  return value;
}

function ensureString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid Gemini response: ${field} must be a non-empty string`);
  }
  return value.trim();
}

export function validateVerdictResult(raw: unknown): ValidatedGeminiVerdictResult {
  if (!isPlainObject(raw)) {
    throw new Error("Invalid Gemini response: verdict payload must be an object");
  }

  const VERDICT_ALIASES: Record<string, ValidatedGeminiVerdictResult["verdict"]> = {
    works: "works",
    doesnt_work: "doesnt_work",
    doesntwork: "doesnt_work",
    "doesnt-work": "doesnt_work",
    "does not work": "doesnt_work",
    partially_works: "partially_works",
    partiallyworks: "partially_works",
    partial: "partially_works",
  };

  const rawVerdict = typeof raw.verdict === "string" ? raw.verdict.trim().toLowerCase() : "";
  const verdict = VERDICT_ALIASES[rawVerdict];
  if (!verdict) {
    throw new Error("Invalid Gemini response: verdict must be works, doesnt_work, or partially_works");
  }

  return {
    verdict,
    confidence: ensureNumberInRange(raw.confidence, "confidence", 0, 100),
    visualNotes: ensureString(raw.visualNotes, "visualNotes"),
    patternClash: ensureBoolean(raw.patternClash, "patternClash"),
    colourClash: ensureBoolean(raw.colourClash, "colourClash"),
  };
}

export function validateComboVisualResult(raw: unknown): ValidatedGeminiComboVisualResult {
  if (!isPlainObject(raw)) {
    throw new Error("Invalid Gemini response: combo payload must be an object");
  }

  return {
    confirmed: ensureBoolean(raw.confirmed, "confirmed"),
    visualScore: ensureNumberInRange(raw.visualScore, "visualScore", 0, 100),
    visualNotes: ensureString(raw.visualNotes, "visualNotes"),
  };
}

export function validateTaggingResult(raw: unknown): ValidatedGeminiTaggingResult {
  if (!isPlainObject(raw)) {
    throw new Error("Invalid Gemini response: tagging payload must be an object");
  }

  const category = ensureString(raw.category, "category");
  const validCategories = new Set(["TOP", "BOTTOM", "SHOES", "OUTERWEAR", "ACCESSORY", "DRESS", "BAG"]);
  if (!validCategories.has(category)) {
    throw new Error(`Invalid Gemini response: category must be one of ${Array.from(validCategories).join(", ")}`);
  }

  const seasonTags = raw.season_tags;
  if (!Array.isArray(seasonTags) || !seasonTags.every(isValidSeason)) {
    throw new Error("Invalid Gemini response: season_tags must contain valid season values");
  }

  const fabric = raw.fabric;
  if (fabric !== null && typeof fabric !== "string") {
    throw new Error("Invalid Gemini response: fabric must be string or null");
  }

  const primaryColor = ensureString(raw.primary_color, "primary_color");
  if (!isValidHexColor(primaryColor)) {
    throw new Error("Invalid Gemini response: primary_color must be a valid hex string");
  }

  return {
    category: category as ValidatedGeminiTaggingResult["category"],
    primary_color: primaryColor,
    formality_level: Math.trunc(ensureNumberInRange(raw.formality_level, "formality_level", 1, 5)),
    season_tags: seasonTags as ValidatedGeminiTaggingResult["season_tags"],
    fabric,
  };
}
