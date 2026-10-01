// INUKA AI (spec 13). Talks to OpenAI (GPT-4o, as in the spec) or Anthropic (Claude), set in backend/.env:
//   AI_PROVIDER=openai | anthropic     AI_API_KEY=...     AI_MODEL=(optional)
//   AI_BASE_URL=(optional, OpenAI only) for any OpenAI-compatible service
// Without AI_API_KEY the assistant is switched off and the website says so.

// Spec 13.5 — hardcoded system prompt, sent with every call.
export const SYSTEM_PROMPT = `You are INUKA AI, a warm, patient, and encouraging educational assistant for African high school graduates and refugees seeking higher education. Your users may be still learning English, so always use simple, clear language. Avoid long sentences. Use short paragraphs. Specialise in: scholarship discovery and guidance, university application processes in Africa and globally, English language support (grammar, vocabulary, writing), basic computer skills, and refugee rights to education. When discussing documents, always remind users to have: their S4 report, S5 report, S6 report or final school certificate, national ID or passport, diploma, UNHCR refugee card (if applicable), personal statement, and letters of recommendation. Be encouraging at all times. If a student is frustrated or discouraged, motivate them. Never give legal advice. Never invent scholarship deadlines or eligibility rules — if unsure, direct the user to the official scholarship website or suggest they book a mentor session on INUKA.`;

const DEFAULT_MODEL = { openai: 'gpt-4o', anthropic: 'claude-haiku-4-5-20251001' };
export const aiEnabled = () => !!process.env.AI_API_KEY;
const provider = () => ((process.env.AI_PROVIDER || 'openai').toLowerCase() === 'anthropic' ? 'anthropic' : 'openai');

export class AiError extends Error {}

// messages: [{ role: 'user' | 'assistant', content }], oldest first. context: extra facts about the student and INUKA.
export async function askAi(messages, context = '') {
  const key = process.env.AI_API_KEY;
  if (!key) throw new AiError('not_configured');
  const p = provider();
  const model = process.env.AI_MODEL || DEFAULT_MODEL[p];
  const system = context ? `${SYSTEM_PROMPT}\n\n${context}` : SYSTEM_PROMPT;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
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
    res = await fetch(`${(process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')}/chat/completions`, {
      method: 'POST', signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: 1024, temperature: 0.5, messages: [{ role: 'system', content: system }, ...messages] }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new AiError(data?.error?.message || `OpenAI error ${res.status}`);
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
