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

async function imageUrlToPart(imageUrl: string): Promise<GeminiImagePart> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image ${imageUrl}: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const mimeType = response.headers.get("content-type") || "image/jpeg";

  return {
    inlineData: {
      mimeType,
      data: buffer.toString("base64"),
    },
  };
}

export async function callGeminiVision(prompt: string, imageUrls: string[]): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const imageParts = await Promise.all(imageUrls.map(imageUrlToPart));
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [{ text: `${prompt}${GEMINI_PROMPT_SUFFIX}` }, ...imageParts],
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
