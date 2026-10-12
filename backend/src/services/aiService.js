// INUKA AI (spec 13). Choose the AI service in backend/.env with AI_PROVIDER:
//   gemini  — Google Gemini, FREE tier (key from aistudio.google.com)          ← recommended free option
//   groq    — Groq (Llama models), FREE tier (key from console.groq.com)
//   ollama  — runs on your own computer or server, completely FREE and private, no key needed
//   openai  — GPT-4o, as in the spec (paid)
//   bedrock — Amazon Bedrock, the spec's alternative (paid, low cost). Uses the AWS_* keys, no AI_API_KEY.
//             Default model amazon.nova-lite-v1:0 (any Bedrock chat model works, e.g. anthropic.claude-3-haiku-20240307-v1:0).
//   anthropic — Claude (paid)
// AI_API_KEY=... (not needed for ollama)   AI_MODEL=(optional)   AI_BASE_URL=(optional, to override the address)
// Without a key (or with AI_PROVIDER empty) the assistant is switched off and the website says so.

// Spec 13.5 — hardcoded system prompt, sent with every call.
export const SYSTEM_PROMPT = `You are INUKA AI, a warm, patient, and encouraging educational assistant for African high school graduates and refugees seeking higher education. Your users may be still learning English, so always use simple, clear language. Avoid long sentences. Use short paragraphs. Specialise in: scholarship discovery and guidance, university application processes in Africa and globally, English language support (grammar, vocabulary, writing), basic computer skills, and refugee rights to education. When discussing documents, always remind users to have: their S4 report, S5 report, S6 report or final school certificate, national ID or passport, diploma, UNHCR refugee card (if applicable), personal statement, and letters of recommendation. Be encouraging at all times. If a student is frustrated or discouraged, motivate them. Never give legal advice. Never invent scholarship deadlines or eligibility rules — if unsure, direct the user to the official scholarship website or suggest they book a mentor session on INUKA.`;

// Free and paid services. All except Anthropic speak the OpenAI "chat completions" format.
const PRESETS = {
  gemini: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-3.6-flash' },
  groq: { baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
  ollama: { baseUrl: 'http://localhost:11434/v1', model: 'llama3.2', noKey: true },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  anthropic: { model: 'claude-haiku-4-5-20251001' },
  bedrock: { model: 'amazon.nova-lite-v1:0', noKey: true },
};
const provider = () => {
  const p = (process.env.AI_PROVIDER || 'openai').toLowerCase().trim();
  return PRESETS[p] ? p : 'openai';
};
export const aiEnabled = () => {
  const p = (process.env.AI_PROVIDER || '').toLowerCase().trim();
  if (p === 'ollama') return true;
  if (p === 'bedrock') return !!(process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE || process.env.AWS_BEARER_TOKEN_BEDROCK);
  return !!process.env.AI_API_KEY;
};
export const aiProviderName = () => ({ gemini: 'Google Gemini', groq: 'Groq', ollama: 'Ollama (on our own server)', openai: 'OpenAI', bedrock: 'Amazon Bedrock', anthropic: 'Anthropic' }[provider()]);

export class AiError extends Error {}

// messages: [{ role: 'user' | 'assistant', content }], oldest first. context: extra facts about the student and INUKA.
export async function askAi(messages, context = '') {
  const system = context ? `${SYSTEM_PROMPT}\n\n${context}` : SYSTEM_PROMPT;
  const { text } = await callModel({ system, messages });
  return text;
}

// One call to the AI service, optionally with tools (for the INUKA agent, see services/agent.js).
//   messages: OpenAI-style list. For tools, the agent adds { role: 'assistant', tool_calls } and { role: 'tool', ... } items.
//   tools: [{ name, description, parameters (JSON schema) }]
// Returns { text, toolCalls: [{ id, name, args }] }.
export async function callModel({ system, messages, tools = [] }) {
  const p = provider();
  const preset = PRESETS[p];
  const key = process.env.AI_API_KEY;
  if (!key && !preset.noKey) throw new AiError('not_configured');
  const model = process.env.AI_MODEL || preset.model;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), p === 'ollama' ? 120000 : 45000); // a home computer can be slow
  try {
    if (p === 'bedrock') return await callBedrock({ model, system, messages, tools, signal: controller.signal });
    if (p === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', signal: controller.signal,
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model, max_tokens: 1024, system, messages: toAnthropic(messages),
          ...(tools.length && { tools: tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters })) }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new AiError(data?.error?.message || `Anthropic error ${res.status}`);
      const blocks = data.content || [];
      return {
        text: blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim(),
        toolCalls: blocks.filter((b) => b.type === 'tool_use').map((b) => ({ id: b.id, name: b.name, args: b.input || {} })),
      };
    }
    const res = await fetch(`${(process.env.AI_BASE_URL || preset.baseUrl).replace(/\/$/, '')}/chat/completions`, {
      method: 'POST', signal: controller.signal,
      headers: { ...(key && { Authorization: `Bearer ${key}` }), 'content-type': 'application/json' },
      body: JSON.stringify({
        model, max_tokens: 1024, temperature: 0.4,
        messages: [{ role: 'system', content: system }, ...messages],
        ...(tools.length && { tools: tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } })) }),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new AiError((Array.isArray(data) ? data[0]?.error?.message : data?.error?.message) || `${p} error ${res.status}`);
    const msg = data.choices?.[0]?.message || {};
    return {
      text: (msg.content || '').trim(),
      toolCalls: (msg.tool_calls || []).map((c) => ({ id: c.id, name: c.function?.name, args: safeJson(c.function?.arguments) })),
    };
  } catch (e) {
    if (e instanceof AiError) throw e;
    throw new AiError(e.name === 'AbortError' ? 'timeout' : e.message);
  } finally {
    clearTimeout(timer);
  }
}

// Amazon Bedrock (Converse API). The AWS SDK signs the request with the AWS keys from backend/.env.
let bedrockClient = null;
async function callBedrock({ model, system, messages, tools, signal }) {
  const { BedrockRuntimeClient, ConverseCommand } = await import('@aws-sdk/client-bedrock-runtime');
  if (!bedrockClient) {
    const endpoint = process.env.AI_BASE_URL; // optional, e.g. a VPC endpoint or a local test server
    // A plain http:// address (local test server) needs HTTP/1.1; AWS itself uses the SDK's default.
    const local = endpoint?.startsWith('http://') ? { requestHandler: new (await import('@smithy/node-http-handler')).NodeHttpHandler() } : {};
    bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1', ...(endpoint && { endpoint }), ...local });
  }
  try {
    const res = await bedrockClient.send(new ConverseCommand({
      modelId: model,
      system: [{ text: system }],
      messages: toBedrock(messages),
      inferenceConfig: { maxTokens: 1024, temperature: 0.4 },
      ...(tools.length && { toolConfig: { tools: tools.map((t) => ({ toolSpec: { name: t.name, description: t.description, inputSchema: { json: t.parameters } } })) } }),
    }), { abortSignal: signal });
    const content = res.output?.message?.content || [];
    return {
      text: content.filter((c) => c.text).map((c) => c.text).join('\n').trim(),
      toolCalls: content.filter((c) => c.toolUse).map((c) => ({ id: c.toolUse.toolUseId, name: c.toolUse.name, args: c.toolUse.input || {} })),
    };
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new AiError(`Bedrock error: ${e.message}`);
  }
}

// OpenAI-style messages (with tool calls) -> Bedrock Converse messages.
function toBedrock(messages) {
  const out = [];
  for (const m of messages) {
    if (m.role === 'tool') {
      const block = { toolResult: { toolUseId: m.tool_call_id, content: [{ json: safeJson(m.content) }] } };
      const last = out[out.length - 1];
      if (last?.role === 'user' && last.content[0]?.toolResult) last.content.push(block);
      else out.push({ role: 'user', content: [block] });
    } else if (m.role === 'assistant' && m.tool_calls?.length) {
      out.push({
        role: 'assistant',
        content: [
          ...(m.content ? [{ text: m.content }] : []),
          ...m.tool_calls.map((c) => ({ toolUse: { toolUseId: c.id, name: c.function.name, input: safeJson(c.function.arguments) } })),
        ],
      });
    } else if (m.content) out.push({ role: m.role, content: [{ text: m.content }] });
  }
  return out;
}

const safeJson = (s) => { if (s && typeof s === 'object') return s; try { return JSON.parse(s || '{}'); } catch { return {}; } };

// OpenAI-style messages (with tool calls) -> Anthropic messages.
function toAnthropic(messages) {
  const out = [];
  for (const m of messages) {
    if (m.role === 'tool') {
      const block = { type: 'tool_result', tool_use_id: m.tool_call_id, content: m.content };
      const last = out[out.length - 1];
      if (last?.role === 'user' && Array.isArray(last.content) && last.content[0]?.type === 'tool_result') last.content.push(block);
      else out.push({ role: 'user', content: [block] });
    } else if (m.role === 'assistant' && m.tool_calls?.length) {
      out.push({
        role: 'assistant',
        content: [
          ...(m.content ? [{ type: 'text', text: m.content }] : []),
          ...m.tool_calls.map((c) => ({ type: 'tool_use', id: c.id, name: c.function.name, input: safeJson(c.function.arguments) })),
        ],
      });
    } else out.push({ role: m.role, content: m.content });
  }
  return out;
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
