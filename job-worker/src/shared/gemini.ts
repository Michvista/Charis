const GEMINI_PROMPT_SUFFIX = " Return ONLY valid JSON with no markdown.";

type GeminiImagePart = {
  inlineData: {
    mimeType: string;
    data: string;
  };
};

export async function callGeminiVision(prompt: string, imageUrls: string[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const imageParts = await Promise.all(
    imageUrls.map(async (imageUrl) => {
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
      } as GeminiImagePart;
    }),
  );

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${prompt}${GEMINI_PROMPT_SUFFIX}` }, ...imageParts],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text || "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  return text;
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
