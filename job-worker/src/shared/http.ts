export async function sendJson<TResponse>(
  url: string,
  method: "POST" | "PATCH",
  body: unknown,
  headers: Record<string, string> = {},
): Promise<TResponse> {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${method} ${url} failed with ${response.status}: ${text}`);
  }

  const text = await response.text();
  return text ? (JSON.parse(text) as TResponse) : (undefined as TResponse);
}
