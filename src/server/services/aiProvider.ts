// Abstraction layer for AI providers.  The frontend never imports this module directly;
// API routes or backend services will talk to it.  This lets us swap out Gemini
// for OpenAI (or any other) without touching UI code.

export interface AIRequest {
  prompt: string;
  maxTokens?: number;
}

export interface AIResponse {
  text: string;
}

// concrete implementations live in separate files or can be chosen dynamically
export async function callAI(req: AIRequest): Promise<AIResponse> {
  // placeholder dispatch; in production resolve based on config/env
  if (process.env.AI_PROVIDER === 'openai') {
    return callOpenAI(req);
  } else {
    return callGemini(req);
  }
}

async function callGemini(req: AIRequest): Promise<AIResponse> {
  // TODO: use Gemini SDK with server-side key (process.env.GEMINI_KEY)
  return { text: 'respuesta de Gemini (simulada)' };
}

async function callOpenAI(req: AIRequest): Promise<AIResponse> {
  // TODO: use OpenAI client with server-side key (process.env.OPENAI_KEY)
  return { text: 'respuesta de OpenAI (simulada)' };
}
