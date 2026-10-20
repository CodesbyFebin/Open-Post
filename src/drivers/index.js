'use strict';
/**
 * Channel drivers. Secrets are read ONLY from environment variables.
 * A channel stores an `envPrefix` (e.g. "X", "X_BRAND2") and non-secret
 * config (subreddit, webhook URL). The driver resolves `${envPrefix}_<KEY>`.
 */
const crypto = require('crypto');

const DEFAULT_PREFIX = { x: 'X', linkedin: 'LINKEDIN', reddit: 'REDDIT', bluesky: 'BLUESKY', webhook: 'WEBHOOK', sandbox: 'SANDBOX' };
const TYPES = Object.keys(DEFAULT_PREFIX);
const REQUIRED = {
  x: [['API_KEY', 'API_SECRET', 'ACCESS_TOKEN', 'ACCESS_SECRET'], ['OAUTH2_USER_TOKEN']],
  linkedin: [['ACCESS_TOKEN', 'AUTHOR_URN']],
  reddit: [['ACCESS_TOKEN'], ['CLIENT_ID', 'CLIENT_SECRET', 'USERNAME', 'PASSWORD']],
  bluesky: [['IDENTIFIER', 'APP_PASSWORD']],
  webhook: [['URL']],
  sandbox: [[]],
};

function normalizeType(t) {
  const v = String(t || '').toLowerCase();
  return v === 'twitter' ? 'x' : v;
}

function envFor(channel, env = process.env) {
  const type = normalizeType(channel.type);
  const prefix = (channel.envPrefix || DEFAULT_PREFIX[type] || type).toUpperCase();
  return (key) => env[`${prefix}_${key}`] || '';
}

/** Which env vars are set/missing — never returns secret values. */
function credentialStatus(channel, env = process.env) {
  const type = normalizeType(channel.type);
  const get = envFor(channel, env);
  const prefix = (channel.envPrefix || DEFAULT_PREFIX[type] || type).toUpperCase();
  const sets = REQUIRED[type] || [[]];
  if (type === 'webhook' && channel.config && channel.config.url) return { ready: true, prefix, missing: [] };
  for (const set of sets) if (set.every((k) => get(k))) return { ready: true, prefix, missing: [] };
  return { ready: false, prefix, missing: sets[0].map((k) => `${prefix}_${k}`) };
}

function textFor(post, type) {
  const o = (post.platformOverrides || {})[type] || (type === 'x' ? (post.platformOverrides || {}).twitter : null) || {};
  return { text: (o.content || post.content || '').trim(), title: o.title, thread: o.thread };
}

async function ok(res, label) {
  if (res.ok) return res.status === 204 ? {} : res.json().catch(() => ({}));
  const body = await res.text().catch(() => '');
  const err = new Error(`${label} HTTP ${res.status}: ${body.slice(0, 500)}`);
  err.status = res.status;
  throw err;
}

// ---------- X (Twitter) API v2 ----------
const pct = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
function oauth1Header({ method, url, consumerKey, consumerSecret, token, tokenSecret, nonce, timestamp }) {
  const p = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce || crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(timestamp || Math.floor(Date.now() / 1000)),
    oauth_token: token,
    oauth_version: '1.0',
  };
  const base = [method.toUpperCase(), pct(url), pct(Object.keys(p).sort().map((k) => `${pct(k)}=${pct(p[k])}`).join('&'))].join('&');
  p.oauth_signature = crypto.createHmac('sha1', `${pct(consumerSecret)}&${pct(tokenSecret)}`).update(base).digest('base64');
  return `OAuth ${Object.keys(p).sort().map((k) => `${pct(k)}="${pct(p[k])}"`).join(', ')}`;
}

async function publishX(channel, post, { fetch, env }) {
  const get = envFor(channel, env);
  const url = 'https://api.twitter.com/2/tweets';
  const auth = () => (get('OAUTH2_USER_TOKEN')
    ? `Bearer ${get('OAUTH2_USER_TOKEN')}`
    : oauth1Header({ method: 'POST', url, consumerKey: get('API_KEY'), consumerSecret: get('API_SECRET'), token: get('ACCESS_TOKEN'), tokenSecret: get('ACCESS_SECRET') }));
  const { text, thread } = textFor(post, 'x');
  const parts = Array.isArray(thread) && thread.length ? thread : text.split(/\n-{3,}\n/).map((s) => s.trim()).filter(Boolean);
  for (const p of parts) if ([...p].length > 280) throw new Error(`X post exceeds 280 characters (${[...p].length}). Shorten it or split with a line containing ---`);
  const ids = [];
  for (const part of parts) {
    const body = { text: part };
    if (ids.length) body.reply = { in_reply_to_tweet_id: ids[ids.length - 1] };
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: auth() }, body: JSON.stringify(body) });
    const data = await ok(res, 'X API');
    ids.push(data.data && data.data.id);
  }
  return { remoteId: ids[0], remoteIds: ids, url: ids[0] ? `https://x.com/i/status/${ids[0]}` : null };
}

// ---------- LinkedIn UGC ----------
async function publishLinkedIn(channel, post, { fetch, env }) {
  const get = envFor(channel, env);
  const { text } = textFor(post, 'linkedin');
  if (text.length > 3000) throw new Error('LinkedIn post exceeds 3000 characters');
  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${get('ACCESS_TOKEN')}`, 'X-Restli-Protocol-Version': '2.0.0' },
    body: JSON.stringify({
      author: get('AUTHOR_URN'),
      lifecycleState: 'PUBLISHED',
      specificContent: { 'com.linkedin.ugc.ShareContent': { shareCommentary: { text }, shareMediaCategory: 'NONE' } },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  });
  const data = await ok(res, 'LinkedIn API');
  const id = data.id || res.headers.get('x-restli-id');
  return { remoteId: id, url: id ? `https://www.linkedin.com/feed/update/${id}` : null };
}

// ---------- Reddit ----------
async function redditToken(get, fetch) {
  if (get('ACCESS_TOKEN')) return get('ACCESS_TOKEN');
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${get('CLIENT_ID')}:${get('CLIENT_SECRET')}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': get('USER_AGENT') || 'open-post/1.0 (+https://github.com/CodesbyFebin/Open-Post)',
    },
    body: new URLSearchParams({ grant_type: 'password', username: get('USERNAME'), password: get('PASSWORD') }).toString(),
  });
  const data = await ok(res, 'Reddit OAuth');
  if (!data.access_token) throw new Error(`Reddit OAuth failed: ${JSON.stringify(data).slice(0, 200)}`);
  return data.access_token;
}

async function publishReddit(channel, post, { fetch, env }) {
  const get = envFor(channel, env);
  const sr = (channel.config && channel.config.subreddit) || get('SUBREDDIT');
  if (!sr) throw new Error('Reddit channel needs config.subreddit (or REDDIT_SUBREDDIT)');
  const { text, title } = textFor(post, 'reddit');
  const finalTitle = (title || text.split('\n')[0]).slice(0, 300);
  const token = await redditToken(get, fetch);
  const res = await fetch('https://oauth.reddit.com/api/submit', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': get('USER_AGENT') || 'open-post/1.0 (+https://github.com/CodesbyFebin/Open-Post)' },
    body: new URLSearchParams({ api_type: 'json', kind: 'self', sr: sr.replace(/^r\//, ''), title: finalTitle, text }).toString(),
  });
  const data = await ok(res, 'Reddit API');
  const errs = data.json && data.json.errors;
  if (errs && errs.length) throw new Error(`Reddit rejected post: ${JSON.stringify(errs)}`);
  const d = (data.json && data.json.data) || {};
  return { remoteId: d.name || d.id, url: d.url || null };
}

// ---------- Bluesky (AT Protocol) ----------
function buildFacets(text) {
  const facets = [];
  const enc = new TextEncoder();
  const byteIndex = (i) => enc.encode(text.slice(0, i)).length;
  for (const m of text.matchAll(/https?:\/\/[^\s)]+/g)) {
    facets.push({ index: { byteStart: byteIndex(m.index), byteEnd: byteIndex(m.index + m[0].length) }, features: [{ $type: 'app.bsky.richtext.facet#link', uri: m[0] }] });
  }
  for (const m of text.matchAll(/(^|\s)#([\p{L}\p{N}_]+)/gu)) {
    const start = m.index + m[1].length;
    facets.push({ index: { byteStart: byteIndex(start), byteEnd: byteIndex(start + m[2].length + 1) }, features: [{ $type: 'app.bsky.richtext.facet#tag', tag: m[2] }] });
  }
  return facets;
}

async function publishBluesky(channel, post, { fetch, env }) {
  const get = envFor(channel, env);
  const service = get('SERVICE') || 'https://bsky.social';
  const { text } = textFor(post, 'bluesky');
  if ([...text].length > 300) throw new Error(`Bluesky post exceeds 300 characters (${[...text].length})`);
  const sres = await fetch(`${service}/xrpc/com.atproto.server.createSession`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: get('IDENTIFIER'), password: get('APP_PASSWORD') }),
  });
  const session = await ok(sres, 'Bluesky auth');
  const record = { $type: 'app.bsky.feed.post', text, createdAt: new Date().toISOString() };
  const facets = buildFacets(text);
  if (facets.length) record.facets = facets;
  const pres = await fetch(`${service}/xrpc/com.atproto.repo.createRecord`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessJwt}` },
    body: JSON.stringify({ repo: session.did, collection: 'app.bsky.feed.post', record }),
  });
  const data = await ok(pres, 'Bluesky createRecord');
  return { remoteId: data.uri, url: data.uri ? `https://bsky.app/profile/${session.handle}/post/${data.uri.split('/').pop()}` : null };
}

// ---------- Webhook ----------
async function publishWebhook(channel, post, { fetch, env }) {
  const get = envFor(channel, env);
  const url = (channel.config && channel.config.url) || get('URL');
  if (!url) throw new Error('Webhook channel needs config.url or WEBHOOK_URL');
  const body = JSON.stringify({
    event: 'post.publish',
    channel: { id: channel.id, name: channel.name, type: channel.type },
    post: { id: post.id, content: post.content, platformOverrides: post.platformOverrides, tags: post.tags, scheduledFor: post.scheduledFor },
    sentAt: new Date().toISOString(),
  });
  const headers = { 'Content-Type': 'application/json', 'User-Agent': 'open-post-webhook/1.0', 'X-Open-Post-Event': 'post.publish' };
  const secret = get('SECRET');
  if (secret) headers['X-Open-Post-Signature'] = `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
  const res = await fetch(url, { method: 'POST', headers, body });
  if (!res.ok) throw new Error(`Webhook HTTP ${res.status}`);
  let remoteId = null;
  try { const j = await res.json(); remoteId = j && (j.id || j.remoteId) ? String(j.id || j.remoteId) : null; } catch (_) { /* non-JSON response is fine */ }
  return { remoteId, url: null, httpStatus: res.status };
}

// ---------- Sandbox ----------
async function publishSandbox(channel, post) {
  // Explicit sandbox: nothing leaves the machine. The result says so plainly — no fake URLs.
  return { sandbox: true, remoteId: null, url: null, preview: textFor(post, normalizeType(channel.config && channel.config.simulate) || 'x').text };
}

const DRIVERS = { x: publishX, linkedin: publishLinkedIn, reddit: publishReddit, bluesky: publishBluesky, webhook: publishWebhook, sandbox: publishSandbox };

/**
 * Publish one post to one channel.
 * opts.sandbox (global SANDBOX_MODE) routes every channel to the sandbox driver.
 */
async function publish(channel, post, opts = {}) {
  const env = opts.env || process.env;
  const fetchImpl = opts.fetch || globalThis.fetch;
  const type = normalizeType(channel.type);
  if (opts.sandbox) return { ...(await publishSandbox({ ...channel, config: { simulate: type } }, post)), forcedBySandboxMode: true };
  const driver = DRIVERS[type];
  if (!driver) throw new Error(`Unsupported channel type: ${channel.type}`);
  const status = credentialStatus(channel, env);
  if (!status.ready) throw new Error(`Channel "${channel.name}" is missing env vars: ${status.missing.join(', ')}`);
  return driver(channel, post, { fetch: fetchImpl, env });
}

module.exports = { publish, credentialStatus, normalizeType, oauth1Header, buildFacets, TYPES, DEFAULT_PREFIX };
