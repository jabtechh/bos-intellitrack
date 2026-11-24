import "server-only";

// UI readiness check only. A configured key/model does not prove provider connectivity.
export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim() && process.env.GEMINI_MODEL?.trim());
}
