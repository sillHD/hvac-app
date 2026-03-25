/**
 * aiProvider.ts — Capa de abstracción para proveedores de IA.
 *
 * Permite cambiar de proveedor de IA (Gemini ⇔ OpenAI) sin modificar
 * el código consumidor. Solo cambia la variable AI_PROVIDER en .env.local.
 *
 * Uso:
 *   import { callAI } from '@/server/services/aiProvider';
 *   const result = await callAI({ prompt: 'Genera descripción de trabajo...' });
 *
 * Variables de entorno:
 *  AI_PROVIDER    — 'gemini' (default) | 'openai'
 *  GEMINI_API_KEY — Requerido si AI_PROVIDER=gemini
 *  OPENAI_KEY     — Requerido si AI_PROVIDER=openai (no implementado aún)
 *
 * Para agregar un nuevo proveedor:
 *  1. Crea services/mi-proveedor/index.ts con la misma firma (AIRequest/AIResponse)
 *  2. Impórtalo aquí
 *  3. Añade el case en callAI()
 */

// Abstraction layer for AI providers.  The frontend must not import this
// module directly; API routes or other server code call `callAI` and receive a
// consistent result regardless of the underlying provider.  This layer is
// useful when switching from Gemini to OpenAI (or any other service).

import { generateText as geminiGenerate } from './gemini';

export interface AIRequest {
  prompt: string;
  maxTokens?: number;
}

export interface AIResponse {
  text: string;
}

export async function callAI(req: AIRequest): Promise<AIResponse> {
  if (process.env.AI_PROVIDER === 'openai') {
    // future-proof: if trackable, import OpenAI provider here
    return callOpenAI(req);
  }

  // default to Gemini
  return geminiGenerate({ prompt: req.prompt, maxTokens: req.maxTokens });
}

// stub-only OpenAI path (kept here so switching is just env var change)
async function callOpenAI(req: AIRequest): Promise<AIResponse> {
  // TODO: implement using OpenAI SDK with process.env.OPENAI_KEY
  void req;
  console.log('[aiProvider] callOpenAI placeholder');
  return { text: '<<openai mock response>>' };
}
