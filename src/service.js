'use strict';
const crypto = require('crypto');
const drivers = require('./drivers');
const llm = require('./llm');

const STATUSES = ['draft', 'scheduled', 'publishing', 'published', 'partial', 'failed'];
const now = () => new Date().toISOString();
const id = (p) => `${p}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

const DEFAULT_AUTOPILOT = {
  id: 'autopilot', enabled: false, persona: 'indie_hacker', provider: null,
  cadence: ['09:00', '13:00', '17:30'], horizonDays: 2, channelIds: [], topics: [], recycleEvergreen: true,
};

class OpenPost {
  constructor({ store, env = process.env, fetch = globalThis.fetch, log = console, maxAttempts } = {}) {
    this.store = store; this.env = env; this.fetch = fetch; this.log = log;
    this.maxAttempts = Number(maxAttempts || env.MAX_PUBLISH_ATTEMPTS || 3);
    this.inFlight = new Set();
  }

  get sandbox() { return String(this.env.SANDBOX_MODE || '').toLowerCase() === 'true'; }

  // ---------- channels ----------
  channelView(c) { return { ...c, credentials: drivers.credentialStatus(c, this.env) }; }
  listChannels() { return this.store.all('channels').sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((c) => this.channelView(c)); }
  getChannel(cid) { const c = this.store.get('channels', cid); if (!c) throw new HttpError(404, 'Channel not found'); return c; }
  createChannel(b = {}) {
    const type = drivers.normalizeType(b.type);
    if (!drivers.TYPES.includes(type)) throw new HttpError(400, `type must be one of: ${drivers.TYPES.join(', ')}`);
    if (!b.name || typeof b.name !== 'string') throw new HttpError(400, 'name is required');
    if (b.credentials) throw new HttpError(400, 'Secrets are never stored. Set env vars and use envPrefix instead.');
    if (b.envPrefix && !/^[A-Z][A-Z0-9_]*$/.test(b.envPrefix)) throw new HttpError(400, 'envPrefix must match ^[A-Z][A-Z0-9_]*$');
    const c = { id: id('ch'), type, name: b.name.trim(), handle: b.handle || '', envPrefix: b.envPrefix || drivers.DEFAULT_PREFIX[type], config: b.config || {}, enabled: b.enabled !== false, createdAt: now(), updatedAt: now() };
    this.store.put('channels', c); return this.channelView(c);
  }
  updateChannel(cid, b = {}) {
    const c = this.getChannel(cid);
    if (b.credentials) throw new HttpError(400, 'Secrets are never stored. Use env vars.');
    for (const k of ['name', 'handle', 'envPrefix', 'config', 'enabled']) if (k in b) c[k] = b[k];
    c.updatedAt = now(); this.store.put('channels', c); return this.channelView(c);
  }
  deleteChannel(cid) { if (!this.store.del('channels', cid)) throw new HttpError(404, 'Channel not found'); return { deleted: cid }; }

  // ---------- posts ----------
  listPosts({ status, channelId, from, to } = {}) {
    return this.store.all('posts')
      .filter((p) => (!status || p.status === status) && (!channelId || p.channelIds.includes(channelId))
        && (!from || p.scheduledFor >= from) && (!to || p.scheduledFor <= to))
      .sort((a, b) => (a.scheduledFor || '').localeCompare(b.scheduledFor || ''));
  }
  getPost(pid) { const p = this.store.get('posts', pid); if (!p) throw new HttpError(404, 'Post not found'); return p; }
  validatePost(p) {
    if (!p.content || typeof p.content !== 'string' || !p.content.trim()) throw new HttpError(400, 'content is required');
    if (!Array.isArray(p.channelIds)) throw new HttpError(400, 'channelIds must be an array');
    for (const cid of p.channelIds) if (!this.store.get('channels', cid)) throw new HttpError(400, `Unknown channel: ${cid}`);
    if (!STATUSES.includes(p.status)) throw new HttpError(400, `status must be one of ${STATUSES.join(', ')}`);
    if (p.status === 'scheduled') {
      if (!p.channelIds.length) throw new HttpError(400, 'A scheduled post needs at least one channel');
      if (Number.isNaN(Date.parse(p.scheduledFor))) throw new HttpError(400, 'scheduledFor must be an ISO date');
    }
  }
  createPost(b = {}) {
    const p = {
      id: id('post'), content: b.content, platformOverrides: b.platformOverrides || {},
      channelIds: b.channelIds || b.targetChannelIds || [], scheduledFor: b.scheduledFor ? new Date(b.scheduledFor).toISOString() : now(),
      status: b.status || 'scheduled', tags: b.tags || [], source: b.source || 'manual', evergreen: !!b.evergreen,
      attempts: 0, deliveries: [], lastError: null, meta: b.meta || {}, createdAt: now(), updatedAt: now(), publishedAt: null,
    };
    this.validatePost(p); this.store.put('posts', p); return p;
  }
  updatePost(pid, b = {}) {
    const p = this.getPost(pid);
    if (this.inFlight.has(pid)) throw new HttpError(409, 'Post is currently publishing');
    for (const k of ['content', 'platformOverrides', 'channelIds', 'status', 'tags', 'evergreen']) if (k in b) p[k] = b[k];
    if ('scheduledFor' in b) p.scheduledFor = new Date(b.scheduledFor).toISOString();
    if (b.status === 'scheduled') { p.attempts = 0; p.lastError = null; }
    p.updatedAt = now(); this.validatePost(p); this.store.put('posts', p); return p;
  }
  deletePost(pid) { if (!this.store.del('posts', pid)) throw new HttpError(404, 'Post not found'); return { deleted: pid }; }

  /** Dispatch a post to every target channel that has not already succeeded. */
  async publishPost(pid) {
    if (this.inFlight.has(pid)) throw new HttpError(409, 'Post is already publishing');
    this.inFlight.add(pid);
    try {
      const post = this.getPost(pid);
      if (!post.channelIds.length) throw new HttpError(400, 'Post has no channels');
      const done = new Set(post.deliveries.filter((d) => d.ok).map((d) => d.channelId));
      post.status = 'publishing'; post.attempts += 1; this.store.put('posts', post);
      const results = [];
      for (const cid of post.channelIds) {
        if (done.has(cid)) continue;
        const ch = this.store.get('channels', cid);
        const at = now();
        if (!ch) { results.push({ channelId: cid, ok: false, error: 'Channel was deleted', at }); continue; }
        if (ch.enabled === false) { results.push({ channelId: cid, ok: false, error: 'Channel is disabled', at }); continue; }
        try {
          const r = await drivers.publish(ch, post, { env: this.env, fetch: this.fetch, sandbox: this.sandbox });
          results.push({ channelId: cid, channelType: ch.type, ok: true, sandbox: !!r.sandbox, remoteId: r.remoteId || null, url: r.url || null, at });
        } catch (err) {
          results.push({ channelId: cid, channelType: ch.type, ok: false, error: err.message, at });
        }
      }
      post.deliveries = post.deliveries.concat(results);
      const okSet = new Set(post.deliveries.filter((d) => d.ok).map((d) => d.channelId));
      const allOk = post.channelIds.every((c) => okSet.has(c));
      const failures = results.filter((r) => !r.ok);
      post.lastError = failures.length ? failures.map((f) => `${f.channelId}: ${f.error}`).join(' | ') : null;
      if (allOk) { post.status = 'published'; post.publishedAt = now(); }
      else if (post.attempts < this.maxAttempts) {
        post.status = 'scheduled';
        post.scheduledFor = new Date(Date.now() + 60000 * 2 ** (post.attempts - 1)).toISOString(); // 1m, 2m, 4m...
      } else post.status = okSet.size ? 'partial' : 'failed';
      post.updatedAt = now(); this.store.put('posts', post);
      return { post, results };
    } finally { this.inFlight.delete(pid); }
  }

  async dispatchDue(at = new Date()) {
    const due = this.store.all('posts').filter((p) => p.status === 'scheduled' && new Date(p.scheduledFor) <= at && !this.inFlight.has(p.id));
    const out = [];
    for (const p of due) {
      try { out.push(await this.publishPost(p.id)); } catch (err) { this.log.error(`[scheduler] ${p.id}: ${err.message}`); }
    }
    return out;
  }

  // ---------- autopilot ----------
  getAutopilot() { return { ...DEFAULT_AUTOPILOT, ...(this.store.get('settings', 'autopilot') || {}) }; }
  updateAutopilot(b = {}) {
    const a = this.getAutopilot();
    for (const k of ['enabled', 'persona', 'provider', 'cadence', 'horizonDays', 'channelIds', 'recycleEvergreen']) if (k in b) a[k] = b[k];
    if ('topics' in b) {
      if (!Array.isArray(b.topics)) throw new HttpError(400, 'topics must be an array');
      a.topics = b.topics.map((t) => (typeof t === 'string' ? { title: t } : t)).filter((t) => t && t.title).map((t) => ({
        id: t.id || id('topic'), title: String(t.title), pillar: t.pillar || 'General', evergreen: !!t.evergreen, usedCount: t.usedCount || 0, lastUsedAt: t.lastUsedAt || null,
      }));
    }
    if (!Array.isArray(a.cadence) || !a.cadence.every((s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s))) throw new HttpError(400, 'cadence must be an array of HH:MM strings');
    if (!(a.persona in llm.PERSONAS)) throw new HttpError(400, `persona must be one of ${Object.keys(llm.PERSONAS).join(', ')}`);
    for (const cid of a.channelIds) if (!this.store.get('channels', cid)) throw new HttpError(400, `Unknown channel: ${cid}`);
    a.horizonDays = Math.max(1, Math.min(14, Number(a.horizonDays) || 1));
    this.store.put('settings', a); return a;
  }
  nextTopic(a) {
    const eligible = a.topics.filter((t) => t.usedCount === 0 || (t.evergreen && a.recycleEvergreen));
    if (!eligible.length) return null;
    return eligible.slice().sort((x, y) => x.usedCount - y.usedCount || (x.lastUsedAt || '').localeCompare(y.lastUsedAt || ''))[0];
  }
  async generate({ topic, pillar, persona, provider }) {
    return llm.generate({ topic, pillar, persona, provider }, { env: this.env, fetch: this.fetch });
  }
  async generateNow({ scheduledFor, topicId } = {}) {
    const a = this.getAutopilot();
    const t = topicId ? a.topics.find((x) => x.id === topicId) : this.nextTopic(a);
    if (!t) throw new HttpError(400, 'No eligible topics. Add topics (or mark some evergreen) first.');
    if (!a.channelIds.length) throw new HttpError(400, 'Autopilot has no target channels.');
    const g = await this.generate({ topic: t.title, pillar: t.pillar, persona: a.persona, provider: a.provider || undefined });
    t.usedCount += 1; t.lastUsedAt = now(); this.store.put('settings', a);
    return this.createPost({
      content: g.content, platformOverrides: g.platformOverrides, channelIds: a.channelIds, tags: g.tags, source: 'autopilot', evergreen: t.evergreen,
      scheduledFor: scheduledFor || new Date(Date.now() + 30 * 60000).toISOString(), status: 'scheduled',
      meta: { topicId: t.id, topic: t.title, generatedBy: g.generatedBy, fallbackReason: g.fallbackReason || null },
    });
  }
  upcomingSlots(a, from = new Date()) {
    const slots = [];
    for (let d = 0; d < a.horizonDays; d++) {
      for (const hm of a.cadence) {
        const [h, m] = hm.split(':').map(Number);
        const s = new Date(from); s.setDate(s.getDate() + d); s.setHours(h, m, 0, 0);
        if (s > from) slots.push(s.toISOString());
      }
    }
    return slots.sort();
  }
  /** Fill empty cadence slots within the horizon. Returns created posts. */
  async fillSlots(from = new Date()) {
    const a = this.getAutopilot();
    if (!a.channelIds.length) return [];
    const taken = new Set(this.store.all('posts').filter((p) => p.source === 'autopilot').map((p) => p.scheduledFor));
    const created = [];
    for (const slot of this.upcomingSlots(a, from)) {
      if (taken.has(slot)) continue;
      if (!this.nextTopic(this.getAutopilot())) break;
      created.push(await this.generateNow({ scheduledFor: slot }));
    }
    return created;
  }

  analytics() {
    const posts = this.store.all('posts');
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    for (const p of posts) byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    const byChannel = {};
    const daily = {};
    for (const p of posts) for (const d of p.deliveries || []) {
      const c = (byChannel[d.channelId] = byChannel[d.channelId] || { ok: 0, failed: 0, sandbox: 0 });
      if (d.ok) { c.ok += 1; if (d.sandbox) c.sandbox += 1; const day = d.at.slice(0, 10); daily[day] = (daily[day] || 0) + 1; } else c.failed += 1;
    }
    return { totalPosts: posts.length, byStatus, byChannel, deliveriesPerDay: daily, autopilotPosts: posts.filter((p) => p.source === 'autopilot').length };
  }
}

module.exports = { OpenPost, HttpError, STATUSES };
