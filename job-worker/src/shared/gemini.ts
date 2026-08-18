import { GoogleGenAI } from "@google/genai";

const GEMINI_MODEL = "gemini-2.5-flash";
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

async function fetchWithTimeout(
  imageUrl: string,
  timeoutMs = 30000,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(imageUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        referer: "https://www.google.com/",
        "cache-control": "no-cache",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function imageUrlToPart(imageUrl: string): Promise<GeminiImagePart | null> {
  if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.startsWith("http")) {
    return null;
  }
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetchWithTimeout(imageUrl, attempt === 1 ? 15000 : 25000);
      if (!response.ok) {
        console.warn(`[imageUrlToPart] fetch failed for ${imageUrl}: HTTP ${response.status}`);
        return null;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const mimeType = response.headers.get("content-type") || "image/jpeg";

      return {
        inlineData: {
          mimeType,
          data: buffer.toString("base64"),
        },
      };
    } catch (error) {
      lastError = error;
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
      console.warn(`[imageUrlToPart] Could not fetch image ${imageUrl}: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  return null;
}

export async function callGeminiVision(prompt: string, imageUrls: string[]): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const rawParts = await Promise.all(imageUrls.map(imageUrlToPart));
  const imageParts = rawParts.filter((part): part is GeminiImagePart => part !== null);

  const parts: Array<{ text: string } | GeminiImagePart> = [
    { text: `${prompt}${GEMINI_PROMPT_SUFFIX}` },
    ...imageParts,
  ];

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

  const verdict = raw.verdict;
  if (verdict !== "works" && verdict !== "doesnt_work" && verdict !== "partially_works") {
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
