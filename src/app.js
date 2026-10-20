'use strict';
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { HttpError } = require('./service');
const drivers = require('./drivers');
const llm = require('./llm');
const pkg = require('../package.json');

function createApp(svc, { env = process.env } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    if (env.CORS_ORIGIN) { res.set('Access-Control-Allow-Origin', env.CORS_ORIGIN); res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization'); res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS'); }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    return next();
  });

  const a = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).then((out) => { if (!res.headersSent) res.json(out); }).catch(next);

  app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'open-post', version: pkg.version, store: svc.store.kind, sandboxMode: svc.sandbox, uptimeSeconds: Math.round(process.uptime()) }));

  // Optional bearer-token auth for everything except /api/health
  app.use('/api', (req, res, next) => {
    const token = env.API_TOKEN;
    if (!token) return next();
    const got = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const ok = got.length === token.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(token));
    return ok ? next() : res.status(401).json({ error: 'Unauthorized: set Authorization: Bearer <API_TOKEN>' });
  });

  app.get('/api/config', (req, res) => res.json({
    version: pkg.version, store: svc.store.kind, sandboxMode: svc.sandbox, aiProvider: (env.AI_PROVIDER || 'heuristic'),
    channelTypes: drivers.TYPES, defaultEnvPrefix: drivers.DEFAULT_PREFIX, personas: llm.PERSONAS, authRequired: !!env.API_TOKEN,
  }));

  app.get('/api/channels', a(() => svc.listChannels()));
  app.post('/api/channels', a((req, res) => { res.status(201); return svc.createChannel(req.body); }));
  app.get('/api/channels/:id', a((req) => svc.channelView(svc.getChannel(req.params.id))));
  app.put('/api/channels/:id', a((req) => svc.updateChannel(req.params.id, req.body)));
  app.delete('/api/channels/:id', a((req) => svc.deleteChannel(req.params.id)));

  app.get('/api/posts', a((req) => svc.listPosts(req.query)));
  app.post('/api/posts', a((req, res) => { res.status(201); return svc.createPost(req.body); }));
  app.get('/api/posts/:id', a((req) => svc.getPost(req.params.id)));
  app.put('/api/posts/:id', a((req) => svc.updatePost(req.params.id, req.body)));
  app.delete('/api/posts/:id', a((req) => svc.deletePost(req.params.id)));
  app.post('/api/posts/:id/publish-now', a((req) => svc.publishPost(req.params.id)));

  app.get('/api/autopilot', a(() => svc.getAutopilot()));
  app.put('/api/autopilot', a((req) => svc.updateAutopilot(req.body)));
  app.post('/api/autopilot/generate-now', a(async (req, res) => { res.status(201); return { post: await svc.generateNow(req.body || {}) }; }));
  app.post('/api/autopilot/fill', a(async () => ({ created: await svc.fillSlots() })));
  app.post('/api/generate', a(async (req) => {
    if (!req.body || !req.body.topic) throw new HttpError(400, 'topic is required');
    return svc.generate(req.body);
  }));
  app.get('/api/analytics', a(() => svc.analytics()));

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));

  app.use((err, req, res, next) => {
    const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 && env.NODE_ENV === 'production' ? 'Internal error' : err.message });
  });
  return app;
}

module.exports = { createApp };
