/**
 * Internal implementation detail.
 *
 * Internal implementation detail.
 * Internal implementation detail.
 *
 * Uso:
 *   import { callAI } from '@/server/services/aiProvider';
 * Internal implementation detail.
 *
 * Variables de entorno:
 *  AI_PROVIDER    — 'gemini' (default) | 'openai'
 * Internal implementation detail.
 * Internal implementation detail.
 *
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
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
