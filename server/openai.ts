import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Direct client for audio transcription (Whisper) — uses the real OPENAI_API_KEY
// Falls back to a placeholder so the server starts even without the key (will fail at call time)
export const openaiAudio = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "not-configured",
});
