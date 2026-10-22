export const BASE = 'https://gemini.google.com';
export const UPLOAD_URL = 'https://content-push.googleapis.com/upload';
export const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';

export const MODELS = {
  'gemini-3.5-flash': { mode: 1, think: 4 },
  'gemini-3.5-flash-thinking': { mode: 2, think: 0 },
  'gemini-3.1-pro': { mode: 3, think: 4 },
  'gemini-auto': { mode: 4, think: 4 },
  'gemini-3.5-flash-thinking-lite': { mode: 5, think: 0 },
  'gemini-flash-lite': { mode: 6, think: 4 },
};

// Model hashes reported by the `otAQ7b` RPC on the current Gemini build.
export const MODEL_HASHES = {
  'Flash-Lite': '8c46e95b1a07cecc',
  'Flash': '56fdd199312815e2',
  'Pro': 'e6fa609c3fa255c0',
  'Argon': '95a4c0abcba24364',
};

// Video generation (Veo) is triggered through the Flash-Lite model hash.
// The numeric `mode` aliases above resolve to chat models and return
// "Sorry, something went wrong" for video prompts.
export const VIDEO_MODEL = MODEL_HASHES['Flash-Lite'];


export function parseWrb(raw) {
  if (typeof raw === 'string') {
    const idx = raw.indexOf('[["wrb.fr"');
    if (idx === -1) return [];
    let depth = 0, inStr = false, esc = false;
    let end = idx;
    for (let i = idx; i < raw.length; i++) {
      const ch = raw[i];
      if (esc) { esc = false; continue; }
      if (ch === '\\' && inStr) { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === '[' || ch === '{') depth++;
      else if (ch === ']' || ch === '}') { if (--depth === 0) { end = i; break; } }
    }
    raw = raw.slice(idx, end + 1);
  }
  try { return JSON.parse(raw); } catch { return []; }
}

export function findWrbResult(raw, rpcId) {
  const outer = parseWrb(raw);
  const entry = outer?.[0];
  if (entry?.[1] !== rpcId) return null;
  const bodyStr = entry?.[2];
  if (!bodyStr) return null;
  try { return JSON.parse(bodyStr); } catch { return null; }
}
