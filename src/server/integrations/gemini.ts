/**
 * integrations/gemini.ts — Cliente Gemini AI (stub, sin implementar).
 *
 * Punto de entrada para integración directa con Gemini.
 * Los consumidores del proyecto deben usar aiProvider.ts en su lugar,
 * que abstrae el proveedor de IA y permite cambiar a OpenAI con solo
 * modificar la variable de entorno AI_PROVIDER.
 *
 * Variable de entorno necesaria:
 *  GEMINI_API_KEY — Clave de API de Google AI Studio
 */

// Server-only Gemini API client

export async function generateWithGemini(prompt: string) {
  // TODO: call Gemini API using server-side key
  return 'generated text';
}
