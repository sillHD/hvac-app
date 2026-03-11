// Server-side wrapper for Gemini API calls.
// The frontend must never import this module directly; API routes or other
// server code should go through higher-level helpers (e.g. aiProvider) instead.
//
// Responsibilities:
//  - keep credentials (`process.env.GEMINI_API_KEY`) securely on server
//  - provide a clean interface for generating text or other Gemini features
//  - sanitize/log requests without printing secrets or full prompts
//  - expose only what is safe publicly, hide helpers as `internal*` functions
//
// This file uses placeholders for now; replace with real SDK/HTTP calls when
// integrating with the actual Gemini API.  Switching to OpenAI is handled by
// aiProvider, so consumers of `generateText` don't need to change.

export interface GeminiRequest {
  prompt: string;
  maxTokens?: number;
}

export interface GeminiResponse {
  text: string;
}

// Exported service function --------------------------------------------------
export async function generateText(req: GeminiRequest): Promise<GeminiResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // fail early if our server is not configured
    throw new Error('Gemini API key is not set (GEMINI_API_KEY)');
  }

  // log a sanitized version of the request for debugging; never include full
  // prompt or key material.
  console.log('[gemini] generateText called, promptLength=', req.prompt.length);

  // TODO: replace with real network call using `fetch` or official SDK
  // example:
  // const res = await fetch('https://api.gemini.com/v1/generate', { ... })
  // return await res.json();

  return { text: '<<gemini mock response>>' };
}

// internal helpers (not exported) could go here, e.g. request builder,
// error normalizer, etc. Keeping them private avoids accidental frontend
// bundling or misuse.
