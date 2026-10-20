'use strict';
/** In-process scheduler: no Redis, no Temporal. One timer, one tick at a time. */
function startScheduler(svc, { intervalMs = 30000, log = console } = {}) {
  let running = false;
  let lastFill = 0;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const a = svc.getAutopilot();
      if (a.enabled && Date.now() - lastFill > 5 * 60000) {
        lastFill = Date.now();
        const made = await svc.fillSlots();
        if (made.length) log.log(`[autopilot] scheduled ${made.length} new post(s)`);
      }
      const res = await svc.dispatchDue();
      for (const r of res) log.log(`[scheduler] ${r.post.id} -> ${r.post.status} (${r.results.filter((x) => x.ok).length}/${r.results.length} ok)`);
    } catch (err) { log.error('[scheduler] tick failed:', err.message); } finally { running = false; }
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref();
  setImmediate(tick);
  return { stop: () => clearInterval(timer), tick };
}
module.exports = { startScheduler };
