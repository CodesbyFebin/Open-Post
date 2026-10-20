'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const llm = require('../src/llm');
const { startApp, fakeFetch } = require('./helpers');

test('heuristic generator is deterministic and respects platform limits', () => {
  const a = llm.heuristic({ topic: 'self-hosting', pillar: 'Engineering' });
  const b = llm.heuristic({ topic: 'self-hosting', pillar: 'Engineering' });
  assert.deepEqual(a, b);
  assert.ok([...a.platformOverrides.x.content].length <= 280);
  assert.ok([...a.platformOverrides.bluesky.content].length <= 300);
  assert.equal(a.generatedBy, 'heuristic');
});

for (const provider of ['openai', 'anthropic', 'gemini', 'ollama']) {
  test(`${provider} provider parses JSON output`, async () => {
    const out = JSON.stringify({ content: `from ${provider}`, platformOverrides: { twitter: { content: 't' } }, tags: ['x'] });
    const f = fakeFetch({
      'api.openai.com': [200, { choices: [{ message: { content: out } }] }],
      'api.anthropic.com': [200, { content: [{ type: 'text', text: `Here you go: ${out}` }] }],
      'generativelanguage.googleapis.com': [200, { candidates: [{ content: { parts: [{ text: out }] } }] }],
      'localhost:11434': [200, { response: out }],
    });
    const env = { OPENAI_API_KEY: 'k', ANTHROPIC_API_KEY: 'k', GEMINI_API_KEY: 'k' };
    const g = await llm.generate({ topic: 't', provider }, { env, fetch: f });
    assert.equal(g.content, `from ${provider}`);
    assert.equal(g.generatedBy, provider);
    assert.equal(g.platformOverrides.x.content, 't', 'twitter key normalised to x');
  });
}

test('provider failure falls back to heuristic and records why', async () => {
  const f = fakeFetch({ 'api.openai.com': [500, { error: 'boom' }] });
  const g = await llm.generate({ topic: 't', provider: 'openai' }, { env: { OPENAI_API_KEY: 'k' }, fetch: f });
  assert.equal(g.generatedBy, 'heuristic');
  assert.match(g.fallbackReason, /openai: OpenAI HTTP 500/);
});

test('autopilot generate-now, slot filling, evergreen recycling and scheduler dispatch', async (t) => {
  const ctx = await startApp({ env: { SANDBOX_MODE: 'true' } });
  t.after(() => ctx.close());
  const { api, svc } = ctx;
  const ch = await api('POST', '/api/channels', { type: 'sandbox', name: 'Sandbox' });
  assert.equal((await api('POST', '/api/autopilot/generate-now')).status, 400, 'empty queue rejected');
  const ap = await api('PUT', '/api/autopilot', { enabled: true, channelIds: [ch.body.id], cadence: ['09:00', '18:00'], horizonDays: 2, topics: [{ title: 'One-off idea' }, { title: 'Evergreen idea', evergreen: true }] });
  assert.equal(ap.status, 200);
  assert.equal((await api('PUT', '/api/autopilot', { cadence: ['25:00'] })).status, 400);

  const gen = await api('POST', '/api/autopilot/generate-now');
  assert.equal(gen.status, 201);
  assert.equal(gen.body.post.source, 'autopilot');
  assert.equal(gen.body.post.meta.topic, 'One-off idea');

  const fill = await api('POST', '/api/autopilot/fill');
  assert.equal(fill.body.created.length, svc.upcomingSlots(svc.getAutopilot()).length, 'every empty slot filled');
  assert.ok(fill.body.created.length >= 1);
  assert.ok(fill.body.created.every((p) => p.meta.topic === 'Evergreen idea'));
  const again = await api('POST', '/api/autopilot/fill');
  assert.equal(again.body.created.length, 0, 'slots are not double-filled');

  // make everything due and run the scheduler tick
  const due = await svc.dispatchDue(new Date(Date.now() + 3 * 86400e3));
  assert.equal(due.length, 1 + fill.body.created.length);
  assert.ok(due.every((d) => d.post.status === 'published'));
});
