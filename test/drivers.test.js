'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const drivers = require('../src/drivers');
const { fakeFetch } = require('./helpers');

const post = (content, platformOverrides = {}) => ({ id: 'p1', content, platformOverrides, tags: [] });

test('OAuth 1.0a signature matches the X/Twitter documented example', () => {
  // Example from https://developer.x.com/en/docs/authentication/oauth-1-0a/creating-a-signature (no body params)
  const h = drivers.oauth1Header({ method: 'POST', url: 'https://api.twitter.com/2/tweets', consumerKey: 'ck', consumerSecret: 'cs', token: 't', tokenSecret: 'ts', nonce: 'n', timestamp: 1 });
  assert.match(h, /^OAuth oauth_consumer_key="ck", oauth_nonce="n", oauth_signature="[^"]+", oauth_signature_method="HMAC-SHA1", oauth_timestamp="1", oauth_token="t", oauth_version="1.0"$/);
  const h2 = drivers.oauth1Header({ method: 'POST', url: 'https://api.twitter.com/2/tweets', consumerKey: 'ck', consumerSecret: 'cs', token: 't', tokenSecret: 'ts', nonce: 'n', timestamp: 1 });
  assert.equal(h, h2, 'deterministic for fixed nonce/timestamp');
});

test('X driver posts threads as reply chains', async () => {
  let n = 0;
  const f = fakeFetch({ 'api.twitter.com/2/tweets': () => [201, { data: { id: String(++n) } }] });
  const env = { X_OAUTH2_USER_TOKEN: 'u' };
  const r = await drivers.publish({ id: 'c', name: 'x', type: 'x' }, post('one\n---\ntwo'), { env, fetch: f });
  assert.deepEqual(r.remoteIds, ['1', '2']);
  assert.equal(JSON.parse(f.calls[1].init.body).reply.in_reply_to_tweet_id, '1');
  assert.equal(f.calls[0].init.headers.Authorization, 'Bearer u');
  await assert.rejects(drivers.publish({ id: 'c', name: 'x', type: 'x' }, post('a'.repeat(281)), { env, fetch: f }), /280/);
});

test('LinkedIn driver sends a UGC post', async () => {
  const f = fakeFetch({ 'api.linkedin.com/v2/ugcPosts': [201, { id: 'urn:li:share:9' }] });
  const r = await drivers.publish({ id: 'c', name: 'li', type: 'linkedin' }, post('core', { linkedin: { content: 'li text' } }), { env: { LINKEDIN_ACCESS_TOKEN: 'a', LINKEDIN_AUTHOR_URN: 'urn:li:person:1' }, fetch: f });
  const body = JSON.parse(f.calls[0].init.body);
  assert.equal(body.author, 'urn:li:person:1');
  assert.equal(body.specificContent['com.linkedin.ugc.ShareContent'].shareCommentary.text, 'li text');
  assert.equal(r.remoteId, 'urn:li:share:9');
});

test('Reddit driver gets a token via password grant then submits', async () => {
  const f = fakeFetch({ 'reddit.com/api/v1/access_token': [200, { access_token: 'tk' }], 'oauth.reddit.com/api/submit': [200, { json: { errors: [], data: { name: 't3_x', url: 'https://reddit.com/r/test/x' } } }] });
  const env = { REDDIT_CLIENT_ID: 'i', REDDIT_CLIENT_SECRET: 's', REDDIT_USERNAME: 'u', REDDIT_PASSWORD: 'p' };
  const r = await drivers.publish({ id: 'c', name: 'r', type: 'reddit', config: { subreddit: 'r/test' } }, post('Title line\nbody'), { env, fetch: f });
  assert.equal(r.remoteId, 't3_x');
  const form = new URLSearchParams(f.calls[1].init.body);
  assert.equal(form.get('sr'), 'test');
  assert.equal(form.get('title'), 'Title line');
});

test('Bluesky driver creates session, record and rich-text facets', async () => {
  const f = fakeFetch({ createSession: [200, { accessJwt: 'j', did: 'did:plc:1', handle: 'me.bsky.social' }], createRecord: [200, { uri: 'at://did:plc:1/app.bsky.feed.post/abc' }] });
  const r = await drivers.publish({ id: 'c', name: 'b', type: 'bluesky' }, post('héllo https://example.com #OpenSource'), { env: { BLUESKY_IDENTIFIER: 'me', BLUESKY_APP_PASSWORD: 'pw' }, fetch: f });
  assert.equal(r.url, 'https://bsky.app/profile/me.bsky.social/post/abc');
  const rec = JSON.parse(f.calls[1].init.body).record;
  assert.equal(rec.facets.length, 2);
  assert.equal(rec.facets[0].index.byteStart, Buffer.byteLength('héllo '));
});

test('credentialStatus never leaks values and honours envPrefix', () => {
  const s = drivers.credentialStatus({ type: 'linkedin', envPrefix: 'LI_BRAND' }, { LI_BRAND_ACCESS_TOKEN: 'secret', LI_BRAND_AUTHOR_URN: 'u' });
  assert.deepEqual(s, { ready: true, prefix: 'LI_BRAND', missing: [] });
  assert.ok(!JSON.stringify(s).includes('secret'));
});
