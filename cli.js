#!/usr/bin/env node
'use strict';
/** One-shot runner for cron/systemd timers: `node cli.js tick` fills autopilot slots and dispatches due posts. */
const { openStore } = require('./src/store');
const { OpenPost } = require('./src/service');
(async () => {
  const cmd = process.argv[2] || 'tick';
  const store = openStore(); const svc = new OpenPost({ store });
  if (cmd === 'tick') {
    if (svc.getAutopilot().enabled) console.log(`autopilot created ${(await svc.fillSlots()).length}`);
    const r = await svc.dispatchDue();
    console.log(`dispatched ${r.length}`);
  } else { console.error('usage: node cli.js tick'); process.exitCode = 1; }
  store.close();
})();
