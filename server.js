#!/usr/bin/env node
'use strict';
/** Open Post — single-process server: REST API + dashboard + scheduler. */
const fs = require('fs');
const path = require('path');

const envFile = path.join(process.cwd(), '.env');
if (fs.existsSync(envFile) && typeof process.loadEnvFile === 'function') process.loadEnvFile(envFile);

const { openStore } = require('./src/store');
const { OpenPost } = require('./src/service');
const { createApp } = require('./src/app');
const { startScheduler } = require('./src/scheduler');

function main() {
  const store = openStore();
  const svc = new OpenPost({ store });
  const app = createApp(svc);
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';
  const server = app.listen(port, host, () => {
    console.log(`Open Post listening on http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
    console.log(`  store=${store.kind} sandbox=${svc.sandbox} ai=${process.env.AI_PROVIDER || 'heuristic'}`);
  });
  const sched = process.env.SCHEDULER_DISABLED === 'true' ? null : startScheduler(svc, { intervalMs: Number(process.env.SCHEDULER_INTERVAL_MS || 30000) });
  const stop = () => { if (sched) sched.stop(); server.close(() => { store.close(); process.exit(0); }); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}

if (require.main === module) main();
module.exports = { main };
