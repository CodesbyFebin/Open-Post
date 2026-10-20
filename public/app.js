/* Open Post dashboard — talks only to the REST API. No localStorage data, no mock state. */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = { config: null, channels: [], posts: [], autopilot: null, analytics: null, editing: null, calMonth: new Date() };
  const TOKEN_KEY = 'open_post_api_token'; // only the optional API token is kept in the browser

  function toast(msg, err) { const d = document.createElement('div'); d.textContent = msg; if (err) d.className = 'e'; $('#toast').append(d); setTimeout(() => d.remove(), err ? 7000 : 3500); }

  async function api(method, url, body) {
    const headers = { 'Content-Type': 'application/json' };
    const tok = sessionStorage.getItem(TOKEN_KEY); if (tok) headers.Authorization = `Bearer ${tok}`;
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (res.status === 401) {
      const t = prompt('This Open Post server requires an API token (API_TOKEN):');
      if (t) { sessionStorage.setItem(TOKEN_KEY, t); return api(method, url, body); }
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }
  const run = (fn) => async (...a) => { try { await fn(...a); } catch (e) { toast(e.message, true); } };

  // ---------- tabs ----------
  function show(tab) { $$('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab)); $$('.tab').forEach((t) => t.classList.toggle('active', t.id === `tab-${tab}`)); location.hash = tab; render(); }
  $$('#tabs button').forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
  document.addEventListener('click', (e) => { const g = e.target.closest('[data-goto]'); if (g) { e.preventDefault(); show(g.dataset.goto); } });

  async function load() {
    const [config, channels, posts, autopilot, analytics] = await Promise.all([api('GET', '/api/config'), api('GET', '/api/channels'), api('GET', '/api/posts'), api('GET', '/api/autopilot'), api('GET', '/api/analytics')]);
    Object.assign(S, { config, channels, posts, autopilot, analytics });
    $('#mode').textContent = `${config.sandboxMode ? 'SANDBOX MODE' : 'live'} · ${config.store} · ai: ${config.aiProvider}`;
    render();
  }

  const chName = (id) => (S.channels.find((c) => c.id === id) || { name: '(deleted)' }).name;
  const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

  function render() {
    renderOverview(); renderChannels(); renderComposerChannels(); renderQueue(); renderCalendar(); renderAutopilot(); preview();
  }

  // ---------- overview ----------
  function renderOverview() {
    const a = S.analytics; if (!a) return;
    const bs = a.byStatus;
    $('#stats').innerHTML = [['Scheduled', bs.scheduled], ['Published', bs.published], ['Failed / partial', bs.failed + bs.partial], ['Channels', S.channels.length]].map(([k, v]) => `<div class="stat"><span class="muted">${k}</span><b>${v}</b></div>`).join('');
    const next = S.posts.filter((p) => p.status === 'scheduled').slice(0, 5);
    $('#nextUp').innerHTML = next.length ? next.map((p) => `<div class="item"><div class="meta">${fmt(p.scheduledFor)} · ${p.channelIds.map(chName).map(esc).join(', ')}</div>${esc(p.content.slice(0, 140))}</div>`).join('') : '<p class="muted">Nothing scheduled yet.</p>';
    const days = []; for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d.toISOString().slice(0, 10)); }
    const max = Math.max(1, ...days.map((d) => a.deliveriesPerDay[d] || 0));
    $('#daily').innerHTML = days.map((d) => `<div title="${d}: ${a.deliveriesPerDay[d] || 0}" style="height:${((a.deliveriesPerDay[d] || 0) / max) * 100}%"><span>${d.slice(8)}</span></div>`).join('');
    $('#onboarding').hidden = S.channels.length > 0 && S.posts.length > 0;
  }

  // ---------- channels ----------
  const EXTRA = { reddit: 'Subreddit, e.g. r/test', webhook: 'Webhook URL (or set WEBHOOK_URL)' };
  function initChannelForm() {
    $('#chType').innerHTML = S.config.channelTypes.map((t) => `<option value="${t}">${t}</option>`).join('');
    const upd = () => { const t = $('#chType').value; $('#chPrefix').placeholder = `Env prefix (default ${S.config.defaultEnvPrefix[t]})`; $('#chExtra').placeholder = EXTRA[t] || ''; $('#chExtra').hidden = !EXTRA[t]; };
    $('#chType').addEventListener('change', upd); upd();
  }
  function renderChannels() {
    $('#channels').innerHTML = S.channels.map((c) => `<div class="item"><div class="meta"><b style="color:var(--text)">${esc(c.name)}</b> <span class="pill">${c.type}</span> ${esc(c.handle)}
      ${c.credentials.ready ? '<span class="ok">● credentials found</span>' : `<span class="err">● missing: ${c.credentials.missing.map(esc).join(', ')}</span>`}
      ${c.enabled === false ? '<span class="pill">disabled</span>' : ''}</div>
      <div class="small muted">env prefix <code>${esc(c.credentials.prefix)}_*</code>${c.config && c.config.subreddit ? ` · ${esc(c.config.subreddit)}` : ''}${c.config && c.config.url ? ` · ${esc(c.config.url)}` : ''}</div>
      <div class="row"><button class="ghost" data-toggle="${c.id}">${c.enabled === false ? 'Enable' : 'Disable'}</button><button class="bad" data-delch="${c.id}">Remove</button></div></div>`).join('') || '<p class="muted">No channels yet.</p>';
  }
  $('#btnAddCh').addEventListener('click', run(async () => {
    const type = $('#chType').value; const config = {};
    const extra = $('#chExtra').value.trim();
    if (type === 'reddit' && extra) config.subreddit = extra;
    if (type === 'webhook' && extra) config.url = extra;
    await api('POST', '/api/channels', { type, name: $('#chName').value.trim() || type, handle: $('#chHandle').value.trim(), envPrefix: $('#chPrefix').value.trim() || undefined, config });
    ['#chName', '#chHandle', '#chPrefix', '#chExtra'].forEach((s) => { $(s).value = ''; });
    toast('Channel added'); await load();
  }));
  $('#channels').addEventListener('click', run(async (e) => {
    const del = e.target.dataset.delch; const tg = e.target.dataset.toggle;
    if (del && confirm('Remove this channel?')) { await api('DELETE', `/api/channels/${del}`); await load(); }
    if (tg) { const c = S.channels.find((x) => x.id === tg); await api('PUT', `/api/channels/${tg}`, { enabled: c.enabled === false }); await load(); }
  }));

  // ---------- composer ----------
  function checks(el, selected) { el.innerHTML = S.channels.map((c) => `<label><input type="checkbox" value="${c.id}" ${selected.includes(c.id) ? 'checked' : ''}> ${esc(c.name)} <span class="pill">${c.type}</span></label>`).join('') || '<p class="muted small">Add a channel first.</p>'; }
  const checked = (el) => [...el.querySelectorAll('input:checked')].map((i) => i.value);
  function renderComposerChannels() { const sel = checked($('#cChannels')); checks($('#cChannels'), S.editing ? S.editing.channelIds : sel); }
  const localInput = (d) => { const z = new Date(d); z.setMinutes(z.getMinutes() - z.getTimezoneOffset()); return z.toISOString().slice(0, 16); };
  function overrides() {
    const o = {}; const v = (s) => $(s).value.trim();
    if (v('#oX')) o.x = { content: v('#oX') };
    if (v('#oLinkedin')) o.linkedin = { content: v('#oLinkedin') };
    if (v('#oReddit') || v('#oRedditTitle')) o.reddit = { content: v('#oReddit') || undefined, title: v('#oRedditTitle') || undefined };
    if (v('#oBluesky')) o.bluesky = { content: v('#oBluesky') };
    return o;
  }
  function fillComposer(p) {
    const o = p.platformOverrides || {};
    $('#cContent').value = p.content || ''; $('#oX').value = (o.x || o.twitter || {}).content || ''; $('#oLinkedin').value = (o.linkedin || {}).content || '';
    $('#oReddit').value = (o.reddit || {}).content || ''; $('#oRedditTitle').value = (o.reddit || {}).title || ''; $('#oBluesky').value = (o.bluesky || {}).content || '';
    $('#cTags').value = (p.tags || []).join(', '); $('#cEvergreen').checked = !!p.evergreen;
    if (p.scheduledFor) $('#cWhen').value = localInput(p.scheduledFor);
    preview();
  }
  function resetComposer() { S.editing = null; $('#composeTitle').textContent = 'Compose'; fillComposer({ content: '' }); $('#cWhen').value = localInput(Date.now() + 3600e3); $('#cTopic').value = ''; $('#aiInfo').textContent = ''; renderComposerChannels(); }
  function preview() {
    const core = $('#cContent').value; const o = overrides();
    const sel = new Set(checked($('#cChannels')).map((id) => (S.channels.find((c) => c.id === id) || {}).type));
    const items = [['x', 'X', (o.x || {}).content || core], ['linkedin', 'LinkedIn', (o.linkedin || {}).content || core], ['reddit', 'Reddit', `${(o.reddit || {}).title || core.split('\n')[0]}\n\n${(o.reddit || {}).content || core}`], ['bluesky', 'Bluesky', (o.bluesky || {}).content || core], ['webhook', 'Webhook', core], ['sandbox', 'Sandbox', core]];
    $('#preview').innerHTML = items.filter(([k]) => sel.has(k)).map(([, n, t]) => `<div class="pv"><h5>${n}</h5>${esc(t)}</div>`).join('') || '<p class="muted small">Select channels to preview.</p>';
    $$('.count').forEach((c) => { const el = $(`#${c.dataset.for}`); const txt = el.value || core; const parts = c.dataset.for === 'oX' ? txt.split(/\n-{3,}\n/) : [txt]; const n = Math.max(...parts.map((p) => [...p].length)); c.textContent = `${n}/${c.dataset.max}${parts.length > 1 ? ` · ${parts.length} posts` : ''}`; c.classList.toggle('over', n > Number(c.dataset.max)); });
  }
  ['#cContent', '#oX', '#oLinkedin', '#oReddit', '#oRedditTitle', '#oBluesky'].forEach((s) => $(s).addEventListener('input', preview));
  $('#cChannels').addEventListener('change', preview);
  function payload(status) {
    const when = $('#cWhen').value;
    return { content: $('#cContent').value, platformOverrides: overrides(), channelIds: checked($('#cChannels')), status, scheduledFor: when ? new Date(when).toISOString() : new Date().toISOString(), tags: $('#cTags').value.split(',').map((t) => t.trim()).filter(Boolean), evergreen: $('#cEvergreen').checked };
  }
  async function save(status) { const b = payload(status); return S.editing ? api('PUT', `/api/posts/${S.editing.id}`, b) : api('POST', '/api/posts', b); }
  $('#btnSchedule').addEventListener('click', run(async () => { await save('scheduled'); toast('Scheduled'); resetComposer(); await load(); }));
  $('#btnDraft').addEventListener('click', run(async () => { await save('draft'); toast('Draft saved'); resetComposer(); await load(); }));
  $('#btnNow').addEventListener('click', run(async () => {
    const p = await save('draft'); const r = await api('POST', `/api/posts/${p.id}/publish-now`);
    r.results.forEach((x) => toast(`${chName(x.channelId)}: ${x.ok ? (x.sandbox ? 'sandbox OK (nothing sent)' : `published ${x.url || ''}`) : x.error}`, !x.ok));
    resetComposer(); await load();
  }));
  $('#btnReset').addEventListener('click', resetComposer);
  $('#btnAi').addEventListener('click', run(async () => {
    const topic = $('#cTopic').value.trim() || $('#cContent').value.trim().split('\n')[0];
    if (!topic) throw new Error('Enter a topic or some content first');
    $('#btnAi').disabled = true;
    try {
      const g = await api('POST', '/api/generate', { topic, persona: $('#cPersona').value });
      fillComposer({ ...payload(), content: g.content, platformOverrides: g.platformOverrides, tags: g.tags });
      $('#aiInfo').textContent = `Generated by ${g.generatedBy}${g.fallbackReason ? ` (fallback: ${g.fallbackReason})` : ''}. Review before publishing.`;
    } finally { $('#btnAi').disabled = false; }
  }));

  // ---------- queue ----------
  function postItem(p) {
    const del = (p.deliveries || []).slice(-6).map((d) => `<div class="small ${d.ok ? 'ok' : 'err'}">${fmt(d.at)} · ${esc(chName(d.channelId))}: ${d.ok ? (d.sandbox ? 'sandbox (not sent)' : (d.url ? `<a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.url)}</a>` : `ok ${esc(d.remoteId || '')}`)) : esc(d.error)}</div>`).join('');
    return `<div class="item"><div class="meta"><span class="st ${p.status}">${p.status}</span>${fmt(p.scheduledFor)} · ${p.channelIds.map(chName).map(esc).join(', ') || 'no channels'}${p.source === 'autopilot' ? ' · <span class="pill">autopilot</span>' : ''}${p.evergreen ? ' · <span class="pill">evergreen</span>' : ''}${p.attempts ? ` · attempts ${p.attempts}` : ''}</div>
      <div style="white-space:pre-wrap;margin:6px 0">${esc(p.content.slice(0, 400))}</div>${p.meta && p.meta.generatedBy ? `<div class="small muted">generated by ${esc(p.meta.generatedBy)}${p.meta.fallbackReason ? ` — fallback: ${esc(p.meta.fallbackReason)}` : ''}</div>` : ''}${del}
      <div class="row"><button class="ghost" data-edit="${p.id}">Edit</button>${p.status !== 'published' ? `<button class="warn" data-pub="${p.id}">Publish now</button>` : ''}<button class="bad" data-del="${p.id}">Delete</button></div></div>`;
  }
  function renderQueue() { const st = $('#qStatus').value; const ps = S.posts.filter((p) => !st || p.status === st); $('#queue').innerHTML = ps.map(postItem).join('') || '<p class="muted">No posts.</p>'; }
  $('#qStatus').addEventListener('change', renderQueue);
  $('#btnRefresh').addEventListener('click', run(load));
  async function postAction(e) {
    const t = e.target.dataset;
    if (t.edit) { const p = S.posts.find((x) => x.id === t.edit); S.editing = p; show('compose'); $('#composeTitle').textContent = 'Edit post'; fillComposer(p); checks($('#cChannels'), p.channelIds); preview(); }
    if (t.pub) { const r = await api('POST', `/api/posts/${t.pub}/publish-now`); r.results.forEach((x) => toast(`${chName(x.channelId)}: ${x.ok ? 'ok' : x.error}`, !x.ok)); await load(); }
    if (t.del && confirm('Delete this post?')) { await api('DELETE', `/api/posts/${t.del}`); await load(); }
  }
  $('#queue').addEventListener('click', run(postAction));

  // ---------- calendar ----------
  function renderCalendar() {
    const m = S.calMonth; const y = m.getFullYear(); const mo = m.getMonth();
    $('#calLabel').textContent = m.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    const start = new Date(y, mo, 1); start.setDate(1 - ((start.getDay() + 6) % 7));
    const today = new Date().toDateString();
    let html = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<div class="h">${d}</div>`).join('');
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const ps = S.posts.filter((p) => new Date(p.scheduledFor).toDateString() === d.toDateString());
      html += `<div class="d ${d.getMonth() !== mo ? 'out' : ''} ${d.toDateString() === today ? 'today' : ''}" data-day="${d.toISOString()}"><b>${d.getDate()}</b>${ps.map((p) => `<span class="ev ${p.status}" data-edit="${p.id}" title="${esc(p.content)}">${new Date(p.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${esc(p.content.slice(0, 40))}</span>`).join('')}</div>`;
    }
    $('#calendar').innerHTML = html;
  }
  $('#calPrev').addEventListener('click', () => { S.calMonth = new Date(S.calMonth.getFullYear(), S.calMonth.getMonth() - 1, 1); renderCalendar(); });
  $('#calNext').addEventListener('click', () => { S.calMonth = new Date(S.calMonth.getFullYear(), S.calMonth.getMonth() + 1, 1); renderCalendar(); });
  $('#calendar').addEventListener('click', run(async (e) => {
    if (e.target.dataset.edit) return postAction(e);
    const day = e.target.closest('[data-day]'); if (!day) return;
    resetComposer(); const d = new Date(day.dataset.day); d.setHours(9, 0, 0, 0); $('#cWhen').value = localInput(d); show('compose');
  }));

  // ---------- autopilot ----------
  function renderAutopilot() {
    const a = S.autopilot; if (!a) return;
    if (document.activeElement && document.activeElement.closest('#tab-autopilot')) return;
    $('#apEnabled').checked = a.enabled; $('#apPersona').value = a.persona; $('#apProvider').value = a.provider || '';
    $('#apCadence').value = a.cadence.join(', '); $('#apHorizon').value = a.horizonDays; $('#apRecycle').checked = a.recycleEvergreen;
    checks($('#apChannels'), a.channelIds);
    $('#topics').innerHTML = a.topics.map((t, i) => `<div class="item"><div class="meta"><b style="color:var(--text)">${esc(t.title)}</b><span class="pill">${esc(t.pillar)}</span>${t.evergreen ? '<span class="pill">evergreen</span>' : ''} used ${t.usedCount}×</div><div class="row"><button class="ghost" data-gen="${t.id}">Generate from this</button><button class="bad" data-rm="${i}">Remove</button></div></div>`).join('') || '<p class="muted">Queue is empty. Add topics you actually want to talk about.</p>';
  }
  function apBody() { return { enabled: $('#apEnabled').checked, persona: $('#apPersona').value, provider: $('#apProvider').value || null, cadence: $('#apCadence').value.split(',').map((s) => s.trim()).filter(Boolean), horizonDays: Number($('#apHorizon').value), recycleEvergreen: $('#apRecycle').checked, channelIds: checked($('#apChannels')) }; }
  $('#btnApSave').addEventListener('click', run(async () => { document.activeElement.blur(); S.autopilot = await api('PUT', '/api/autopilot', apBody()); toast('Autopilot saved'); await load(); }));
  $('#btnApGen').addEventListener('click', run(async () => { await api('PUT', '/api/autopilot', apBody()); const r = await api('POST', '/api/autopilot/generate-now'); toast(`Scheduled for ${fmt(r.post.scheduledFor)} (${r.post.meta.generatedBy})`); await load(); }));
  $('#btnApFill').addEventListener('click', run(async () => { await api('PUT', '/api/autopilot', apBody()); const r = await api('POST', '/api/autopilot/fill'); toast(`${r.created.length} post(s) scheduled`); await load(); }));
  $('#btnAddTopic').addEventListener('click', run(async () => {
    const title = $('#tTitle').value.trim(); if (!title) throw new Error('Topic is required');
    const topics = S.autopilot.topics.concat([{ title, pillar: $('#tPillar').value.trim() || 'General', evergreen: $('#tEver').checked }]);
    S.autopilot = await api('PUT', '/api/autopilot', { topics }); $('#tTitle').value = ''; $('#tPillar').value = ''; $('#tEver').checked = false; document.activeElement.blur(); renderAutopilot();
  }));
  $('#topics').addEventListener('click', run(async (e) => {
    if (e.target.dataset.rm) { const topics = S.autopilot.topics.filter((_, i) => i !== Number(e.target.dataset.rm)); S.autopilot = await api('PUT', '/api/autopilot', { topics }); renderAutopilot(); }
    if (e.target.dataset.gen) { const r = await api('POST', '/api/autopilot/generate-now', { topicId: e.target.dataset.gen }); toast(`Scheduled for ${fmt(r.post.scheduledFor)}`); await load(); }
  }));

  // ---------- boot ----------
  run(async () => {
    S.config = await api('GET', '/api/config');
    const opts = Object.entries(S.config.personas).map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join('');
    $('#cPersona').innerHTML = opts; $('#apPersona').innerHTML = opts;
    initChannelForm(); await load(); resetComposer();
    const h = location.hash.slice(1); if (h && $(`#tab-${h}`)) show(h);
    setInterval(() => { if (!document.hidden && !document.activeElement.closest('textarea,input,select')) load().catch(() => {}); }, 30000);
  })();
})();
