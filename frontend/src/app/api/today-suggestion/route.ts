import { NextResponse } from 'next/server';

const FALLBACK_SUGGESTIONS = [
  { title: 'Cashmere & Silk', temp: '68°F', detail: 'Light layering for crisp morning air' },
  { title: 'Structured Linen & Loafers', temp: '75°F', detail: 'Breathable tailoring for warm sunshine' },
  { title: 'Merino Wool & Leather', temp: '58°F', detail: 'Refined insulation against cool breeze' },
  { title: 'Double-Breasted Blazer & Suede', temp: '64°F', detail: 'Sophisticated transition attire' },
  { title: 'Poplin Shirt & Camel Coat', temp: '62°F', detail: 'Timeless luxury for afternoon meetings' },
  { title: 'Silk Trench & Tailored Trousers', temp: '70°F', detail: 'Effortless elegance for dinner' },
];

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userTimezone = body.timezone || 'UTC';
    const currentTime = body.currentTime || new Date().toISOString();
    const apiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;

    if (apiKey) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: 'You are Charis AI, an elite fashion director. Respond strictly with a JSON object: {"title": string, "temp": string, "detail": string}. Title should be 2-4 words (fabric/outfit pairing, e.g. Cashmere & Silk). Temp should be realistic e.g. 68°F. Detail should be a concise fashion recommendation under 10 words.',
              },
              {
                role: 'user',
                content: `Generate today's outfit recommendation for a user in timezone ${userTimezone} at time ${currentTime}.`,
              },
            ],
            temperature: 0.9,
            response_format: { type: 'json_object' },
          }),
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
          if (parsed.title && parsed.temp) {
            return NextResponse.json({
              title: parsed.title,
              temp: parsed.temp,
              detail: parsed.detail || 'Curated recommendation',
              source: 'groq-ai',
            });
          }
        }
      } catch (groqErr) {
        console.warn('Groq API call error:', groqErr);
      }
    }

    // Fallback: Pick a randomized suggestion
    const randomItem = FALLBACK_SUGGESTIONS[Math.floor(Math.random() * FALLBACK_SUGGESTIONS.length)];
    return NextResponse.json({
      ...randomItem,
      source: 'curated-randomizer',
    });
  } catch (err) {
    const randomItem = FALLBACK_SUGGESTIONS[Math.floor(Math.random() * FALLBACK_SUGGESTIONS.length)];
    return NextResponse.json({
      ...randomItem,
      source: 'fallback',
    });
  }
}
