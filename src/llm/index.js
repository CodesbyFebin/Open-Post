'use strict';
/**
 * Content generation. Providers: openai, anthropic, gemini, ollama, heuristic.
 * Any provider error falls back to the offline heuristic generator, and the
 * result records which engine actually produced it (`generatedBy`, `fallbackReason`).
 */
const PERSONAS = {
  thought_leader: { name: 'Thought Leader', instruction: 'Authoritative and forward-looking. Strategic lessons, concise statements, no hype.' },
  indie_hacker: { name: 'Indie Hacker / Builder in Public', instruction: 'Authentic and transparent. Shipping lessons, honest trade-offs, actionable tips.' },
  technical_architect: { name: 'Technical Architect', instruction: 'Engineering rigor, trade-offs and concrete patterns. No fluff.' },
  contrarian_analyst: { name: 'Contrarian Analyst', instruction: 'Challenges conventional wisdom with clear reasoning. Respectful, never clickbait.' },
  viral_storyteller: { name: 'Viral Storyteller', instruction: 'Strong first-line hook, short narrative, crisp takeaway.' },
};

const DEFAULT_MODELS = { openai: 'gpt-4o-mini', anthropic: 'claude-3-5-haiku-latest', gemini: 'gemini-1.5-flash', ollama: 'llama3.1' };

function hashtag(s) { return `#${String(s || 'General').replace(/[^\p{L}\p{N}]+/gu, '')}`; }

/** Deterministic offline generator (index chosen from topic text, not random). */
function heuristic({ topic, pillar, persona }) {
  const p = PERSONAS[persona] || PERSONAS.indie_hacker;
  const templates = [
    { hook: `Most people overcomplicate ${topic}.`, body: 'Start with the smallest version that works, measure it, then iterate. Complexity should be earned, not assumed.', cta: 'What would you simplify first?' },
    { hook: `Unpopular opinion: ${topic} is mostly about consistency, not tools.`, body: 'Pick one channel, one cadence and one metric. Review weekly. Adjust monthly.', cta: 'Agree or disagree?' },
    { hook: `A practical checklist for ${topic}:`, body: '1. Define the outcome\n2. Remove one dependency\n3. Automate the boring step\n4. Write down what you learned', cta: 'Save this for your next sprint.' },
    { hook: `What I learned working on ${topic}:`, body: 'The first version was too clever. The second was simple enough to debug at 2am. Ship the second one.', cta: 'Have you had the same experience?' },
  ];
  let h = 0; for (const ch of String(topic)) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  const t = templates[h % templates.length];
  const tag = hashtag(pillar);
  const core = `${t.hook}\n\n${t.body}\n\n${t.cta}`;
  let x = `${t.hook} ${t.cta} ${tag}`;
  if ([...x].length > 280) x = `${[...t.hook].slice(0, 270).join('')}… ${tag}`.slice(0, 280);
  let bsky = `${t.hook}\n\n${t.cta}`;
  if ([...bsky].length > 300) bsky = [...bsky].slice(0, 299).join('') + '…';
  return {
    content: core,
    platformOverrides: {
      x: { content: x },
      linkedin: { content: `${t.hook}\n\n${t.body}\n\n${t.cta}\n\n${tag} #OpenSource` },
      reddit: { title: t.hook.slice(0, 300), content: `${t.body}\n\n${t.cta}` },
      bluesky: { content: bsky },
    },
    tags: [pillar || 'General', 'Autopilot'],
    generatedBy: 'heuristic',
    persona: p.name,
  };
}

function buildPrompt({ topic, pillar, persona }) {
  const p = PERSONAS[persona] || PERSONAS.indie_hacker;
  return `You write social media posts. Persona: ${p.name} — ${p.instruction}
Content pillar: ${pillar || 'General'}
Topic: ${topic}
Rules: no invented statistics, customers, or testimonials. Keep claims verifiable.
Return ONLY a JSON object with this shape:
{"content":"core post","platformOverrides":{"x":{"content":"<=280 chars"},"linkedin":{"content":"professional, short paragraphs"},"reddit":{"title":"<=300 chars","content":"discussion body"},"bluesky":{"content":"<=300 chars"}},"tags":["tag"]}`;
}

function parseJson(text) {
  const m = String(text || '').match(/\{[\s\S]*\}/);
  if (!m) throw new Error('LLM returned no JSON object');
  const j = JSON.parse(m[0]);
  if (!j.content || typeof j.content !== 'string') throw new Error('LLM JSON missing "content"');
  j.platformOverrides = j.platformOverrides || {};
  if (j.platformOverrides.twitter && !j.platformOverrides.x) j.platformOverrides.x = j.platformOverrides.twitter;
  j.tags = Array.isArray(j.tags) ? j.tags : [];
  return j;
}

async function call(provider, prompt, { env, fetch }) {
  const model = env.AI_MODEL || DEFAULT_MODELS[provider];
  const json = async (res, label) => { if (!res.ok) throw new Error(`${label} HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`); return res.json(); };
  if (provider === 'openai') {
    const key = env.OPENAI_API_KEY || env.AI_API_KEY; if (!key) throw new Error('OPENAI_API_KEY not set');
    const base = env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const d = await json(await fetch(`${base}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } }) }), 'OpenAI');
    return d.choices[0].message.content;
  }
  if (provider === 'anthropic') {
    const key = env.ANTHROPIC_API_KEY || env.AI_API_KEY; if (!key) throw new Error('ANTHROPIC_API_KEY not set');
    const d = await json(await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model, max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }) }), 'Anthropic');
    return d.content.map((c) => c.text || '').join('');
  }
  if (provider === 'gemini') {
    const key = env.GEMINI_API_KEY || env.AI_API_KEY; if (!key) throw new Error('GEMINI_API_KEY not set');
    const d = await json(await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json' } }) }), 'Gemini');
    return d.candidates[0].content.parts.map((p) => p.text || '').join('');
  }
  if (provider === 'ollama') {
    const base = env.OLLAMA_URL || 'http://localhost:11434';
    const d = await json(await fetch(`${base}/api/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, prompt, format: 'json', stream: false }) }), 'Ollama');
    return d.response;
  }
  throw new Error(`Unknown AI provider: ${provider}`);
}

async function generate({ topic, pillar, persona = 'indie_hacker', provider }, opts = {}) {
  const env = opts.env || process.env;
  const fetchImpl = opts.fetch || globalThis.fetch;
  const prov = (provider || env.AI_PROVIDER || 'heuristic').toLowerCase();
  if (!topic) throw new Error('topic is required');
  if (prov === 'heuristic') return heuristic({ topic, pillar, persona });
  try {
    const out = parseJson(await call(prov, buildPrompt({ topic, pillar, persona }), { env, fetch: fetchImpl }));
    return { ...out, generatedBy: prov, persona: (PERSONAS[persona] || PERSONAS.indie_hacker).name };
  } catch (err) {
    return { ...heuristic({ topic, pillar, persona }), fallbackReason: `${prov}: ${err.message}` };
  }
}

module.exports = { generate, heuristic, parseJson, PERSONAS, DEFAULT_MODELS };
