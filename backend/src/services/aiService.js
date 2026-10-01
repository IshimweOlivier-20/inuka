// INUKA AI (spec 13). Choose the AI service in backend/.env with AI_PROVIDER:
//   gemini  — Google Gemini, FREE tier (key from aistudio.google.com)          ← recommended free option
//   groq    — Groq (Llama models), FREE tier (key from console.groq.com)
//   ollama  — runs on your own computer or server, completely FREE and private, no key needed
//   openai  — GPT-4o, as in the spec (paid)
//   anthropic — Claude (paid)
// AI_API_KEY=... (not needed for ollama)   AI_MODEL=(optional)   AI_BASE_URL=(optional, to override the address)
// Without a key (or with AI_PROVIDER empty) the assistant is switched off and the website says so.

// Spec 13.5 — hardcoded system prompt, sent with every call.
export const SYSTEM_PROMPT = `You are INUKA AI, a warm, patient, and encouraging educational assistant for African high school graduates and refugees seeking higher education. Your users may be still learning English, so always use simple, clear language. Avoid long sentences. Use short paragraphs. Specialise in: scholarship discovery and guidance, university application processes in Africa and globally, English language support (grammar, vocabulary, writing), basic computer skills, and refugee rights to education. When discussing documents, always remind users to have: their S4 report, S5 report, S6 report or final school certificate, national ID or passport, diploma, UNHCR refugee card (if applicable), personal statement, and letters of recommendation. Be encouraging at all times. If a student is frustrated or discouraged, motivate them. Never give legal advice. Never invent scholarship deadlines or eligibility rules — if unsure, direct the user to the official scholarship website or suggest they book a mentor session on INUKA.`;

// Free and paid services. All except Anthropic speak the OpenAI "chat completions" format.
const PRESETS = {
  gemini: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-3.5-flash' },
  groq: { baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
  ollama: { baseUrl: 'http://localhost:11434/v1', model: 'llama3.2', noKey: true },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  anthropic: { model: 'claude-haiku-4-5-20251001' },
};
const provider = () => {
  const p = (process.env.AI_PROVIDER || 'openai').toLowerCase().trim();
  return PRESETS[p] ? p : 'openai';
};
export const aiEnabled = () => {
  const p = (process.env.AI_PROVIDER || '').toLowerCase().trim();
  if (p === 'ollama') return true;
  return !!process.env.AI_API_KEY;
};
export const aiProviderName = () => ({ gemini: 'Google Gemini', groq: 'Groq', ollama: 'Ollama (on our own server)', openai: 'OpenAI', anthropic: 'Anthropic' }[provider()]);

export class AiError extends Error {}

// messages: [{ role: 'user' | 'assistant', content }], oldest first. context: extra facts about the student and INUKA.
export async function askAi(messages, context = '') {
  const p = provider();
  const preset = PRESETS[p];
  const key = process.env.AI_API_KEY;
  if (!key && !preset.noKey) throw new AiError('not_configured');
  const model = process.env.AI_MODEL || preset.model;
  const system = context ? `${SYSTEM_PROMPT}\n\n${context}` : SYSTEM_PROMPT;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), p === 'ollama' ? 120000 : 45000); // a home computer can be slow
  try {
    let res;
    if (p === 'anthropic') {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', signal: controller.signal,
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: 1024, system, messages }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new AiError(data?.error?.message || `Anthropic error ${res.status}`);
      return data.content?.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    }
    res = await fetch(`${(process.env.AI_BASE_URL || preset.baseUrl).replace(/\/$/, '')}/chat/completions`, {
      method: 'POST', signal: controller.signal,
      headers: { ...(key && { Authorization: `Bearer ${key}` }), 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: 1024, temperature: 0.5, messages: [{ role: 'system', content: system }, ...messages] }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new AiError((Array.isArray(data) ? data[0]?.error?.message : data?.error?.message) || `${p} error ${res.status}`);
    return data.choices?.[0]?.message?.content?.trim();
  } catch (e) {
    if (e instanceof AiError) throw e;
    throw new AiError(e.name === 'AbortError' ? 'timeout' : e.message);
  } finally {
    clearTimeout(timer);
  }
}

// Themes for the admin's anonymised overview (spec 13.6 / 16.2). Only counts leave this function.
export const THEMES = [
  ['Scholarships', /scholar|fund|grant|bursar|mastercard|chevening|daad|fulbright|deadline|eligib/i],
  ['Essays & personal statements', /essay|statement|motivation letter|cover letter|write|writing|draft/i],
  ['Documents', /document|transcript|report|certificate|diploma|passport|\bid\b|recommendation|unhcr|card/i],
  ['English', /english|grammar|vocabular|tense|verb|noun|spell|pronounc|meaning of|word/i],
  ['Computer skills', /computer|email|e-mail|pdf|attach|upload|word processor|excel|internet|password|typing|file/i],
  ['University applications', /universit|college|admission|apply|application|course|degree|major/i],
  ['Refugee rights & education', /refugee|asylum|displaced|camp|right/i],
];
export function themeOf(text) {
  for (const [name, re] of THEMES) if (re.test(text)) return name;
  return 'Other';
}
