'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { startApp, webhookReceiver } = require('./helpers');

for (const driver of ['auto', 'json']) {
  test(`REST API end-to-end (store=${driver})`, async (t) => {
    const hook = await webhookReceiver();
    const ctx = await startApp({ driver, env: { WEBHOOK_SECRET: 's3cret' } });
    t.after(async () => { await ctx.close(); await hook.close(); });
    const { api } = ctx;

    const health = await api('GET', '/api/health');
    assert.equal(health.status, 200);
    assert.equal(health.body.status, 'ok');

    assert.deepEqual((await api('GET', '/api/channels')).body, [], 'no seeded fake channels');
    assert.deepEqual((await api('GET', '/api/posts')).body, [], 'no seeded fake posts');

    assert.equal((await api('POST', '/api/channels', { type: 'x', name: 'x', credentials: { token: 'a' } })).status, 400, 'refuses stored secrets');
    assert.equal((await api('POST', '/api/channels', { type: 'myspace', name: 'm' })).status, 400);

    const ch = await api('POST', '/api/channels', { type: 'webhook', name: 'n8n', config: { url: hook.url } });
    assert.equal(ch.status, 201);
    assert.equal(ch.body.credentials.ready, true);
    const xch = await api('POST', '/api/channels', { type: 'twitter', name: 'My X' });
    assert.equal(xch.body.type, 'x');
    assert.equal(xch.body.credentials.ready, false);
    assert.ok(xch.body.credentials.missing.includes('X_API_KEY'));

    assert.equal((await api('POST', '/api/posts', { content: '', channelIds: [] })).status, 400);
    assert.equal((await api('POST', '/api/posts', { content: 'hi', channelIds: ['nope'] })).status, 400);

    const post = await api('POST', '/api/posts', { content: 'Hello webhook', channelIds: [ch.body.id], scheduledFor: new Date(Date.now() + 3600e3).toISOString() });
    assert.equal(post.status, 201);
    const pub = await api('POST', `/api/posts/${post.body.id}/publish-now`);
    assert.equal(pub.status, 200);
    assert.equal(pub.body.post.status, 'published');
    assert.equal(hook.hits.length, 1);
    const sig = crypto.createHmac('sha256', 's3cret').update(JSON.stringify(hook.hits[0].body)).digest('hex');
    assert.equal(hook.hits[0].headers['x-open-post-signature'], `sha256=${sig}`);
    assert.equal(pub.body.results[0].remoteId, 'hook-1');

    const failing = await api('POST', '/api/posts', { content: 'needs creds', channelIds: [xch.body.id] });
    const r = await api('POST', `/api/posts/${failing.body.id}/publish-now`);
    assert.equal(r.body.results[0].ok, false);
    assert.match(r.body.results[0].error, /missing env vars/);
    assert.equal(r.body.post.status, 'scheduled', 'retried later with backoff');
    assert.equal(r.body.post.attempts, 1);

    const upd = await api('PUT', `/api/posts/${failing.body.id}`, { status: 'draft' });
    assert.equal(upd.body.status, 'draft');
    assert.equal((await api('GET', '/api/posts?status=draft')).body.length, 1);

    const an = await api('GET', '/api/analytics');
    assert.equal(an.body.totalPosts, 2);
    assert.equal(an.body.byStatus.published, 1);

    assert.equal((await api('DELETE', `/api/posts/${failing.body.id}`)).status, 200);
    assert.equal((await api('GET', `/api/posts/${failing.body.id}`)).status, 404);

    const dash = await api('GET', '/');
    assert.equal(dash.status, 200);
    assert.match(dash.text, /Open Post/);
  });
}

test('API_TOKEN protects the API', async (t) => {
  const ctx = await startApp({ env: { API_TOKEN: 'tok' } });
  t.after(() => ctx.close());
  assert.equal((await ctx.api('GET', '/api/health')).status, 200);
  assert.equal((await ctx.api('GET', '/api/posts')).status, 401);
  assert.equal((await ctx.api('GET', '/api/posts', null, { Authorization: 'Bearer tok' })).status, 200);
});

test('SANDBOX_MODE never calls the network and says so', async (t) => {
  const ctx = await startApp({ env: { SANDBOX_MODE: 'true' }, fetch: () => { throw new Error('network used'); } });
  t.after(() => ctx.close());
  const ch = await ctx.api('POST', '/api/channels', { type: 'linkedin', name: 'li' });
  const p = await ctx.api('POST', '/api/posts', { content: 'sandboxed', channelIds: [ch.body.id] });
  const r = await ctx.api('POST', `/api/posts/${p.body.id}/publish-now`);
  assert.equal(r.body.post.status, 'published');
  assert.equal(r.body.results[0].sandbox, true);
  assert.equal(r.body.results[0].url, null, 'no fake URLs');
});
