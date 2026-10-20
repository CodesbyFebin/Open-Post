'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { openStore } = require('../src/store');
const { OpenPost } = require('../src/service');
const { createApp } = require('../src/app');

function tmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'open-post-test-')); }

async function startApp({ env = {}, driver = 'auto', fetch } = {}) {
  const store = openStore({ dataDir: tmpDir(), driver });
  const svc = new OpenPost({ store, env, fetch, log: { log() {}, error() {} } });
  const app = createApp(svc, { env });
  const server = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const api = async (method, url, body, headers = {}) => {
    const res = await globalThis.fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch (_) { /* html */ }
    return { status: res.status, body: json, text };
  };
  return { svc, store, base, api, close: () => new Promise((r) => server.close(() => { store.close(); r(); })) };
}

/** A real HTTP server that records webhook deliveries. */
async function webhookReceiver(status = 200) {
  const hits = [];
  const server = http.createServer((req, res) => {
    let body = ''; req.on('data', (c) => { body += c; });
    req.on('end', () => { hits.push({ headers: req.headers, body: JSON.parse(body) }); res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ id: `hook-${hits.length}` })); });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}/hook`, hits, close: () => new Promise((r) => server.close(r)) };
}

/** Records outgoing requests and replies with canned JSON per URL substring. */
function fakeFetch(routes) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const key = Object.keys(routes).find((k) => String(url).includes(k));
    if (!key) throw new Error(`unexpected fetch ${url}`);
    const [status, body] = typeof routes[key] === 'function' ? routes[key](url, init, calls) : routes[key];
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  };
  fn.calls = calls;
  return fn;
}

module.exports = { startApp, webhookReceiver, fakeFetch, tmpDir };
