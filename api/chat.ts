import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const PRIMARY_MODEL = "google/gemini-2.0-flash-001";
const FALLBACK_MODEL = "meta-llama/llama-3.2-3b-instruct:free";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { messages } = req.body;
  const apiKey = (process.env.OPENROUTER_API_KEY || "").trim();

  if (!apiKey) {
    return res.status(500).json({ error: 'Intelligence offline' });
  }

  try {
    let response;
    try {
      response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: PRIMARY_MODEL,
          messages: [
            { role: "system", content: "You are Pulse AI. Helpful and concise (2 sentences max)." },
            ...messages
          ],
          temperature: 0.5
        },
        { headers: { "Authorization": `Bearer ${apiKey}` }, timeout: 15000 }
      );
    } catch (err: any) {
      console.warn("[PULSE] Chat primary failed, switching to fallback...");
      response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: FALLBACK_MODEL,
          messages: [
            { role: "system", content: "You are Pulse AI. Helpful and concise (2 sentences max)." },
            ...messages
          ],
          temperature: 0.5
        },
        { headers: { "Authorization": `Bearer ${apiKey}` }, timeout: 10000 }
      );
    }

    const { content } = response.data.choices[0].message;
    return res.status(200).json({ content });

  } catch (err: any) {
    console.error("[PULSE] Chat Error:", err.message);
    return res.status(200).json({ content: "AI service temporarily unavailable. Please try again shortly." });
  }
}
