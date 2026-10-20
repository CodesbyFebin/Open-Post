'use strict';
/**
 * Persistence layer. Order of preference:
 *   1. node:sqlite (built into Node >= 22.5)
 *   2. better-sqlite3 (optional dependency)
 *   3. JSON file (atomic write) — zero-dependency fallback
 * Every backend stores documents as JSON rows keyed by (collection, id),
 * so the API layer is identical regardless of the engine.
 */
const fs = require('fs');
const path = require('path');

function openSqlite(file) {
  let db = null;
  let kind = null;
  const candidates = [
    ['node:sqlite', () => new (require('node:sqlite').DatabaseSync)(file)],
    ['better-sqlite3', () => new (require('better-sqlite3'))(file)],
  ];
  for (const [name, open] of candidates) {
    try { db = open(); kind = name; break; } catch (_) { /* try next engine */ }
  }
  if (!db) return null;
  db.exec(`PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS docs (
      collection TEXT NOT NULL,
      id TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (collection, id)
    );`);
  const q = {
    all: db.prepare('SELECT data FROM docs WHERE collection = ?'),
    get: db.prepare('SELECT data FROM docs WHERE collection = ? AND id = ?'),
    put: db.prepare(`INSERT INTO docs (collection, id, data, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`),
    del: db.prepare('DELETE FROM docs WHERE collection = ? AND id = ?'),
  };
  return {
    kind,
    all: (c) => q.all.all(c).map((r) => JSON.parse(r.data)),
    get: (c, id) => { const r = q.get.get(c, id); return r ? JSON.parse(r.data) : null; },
    put: (c, doc) => { q.put.run(c, doc.id, JSON.stringify(doc), new Date().toISOString()); return doc; },
    del: (c, id) => Number(q.del.run(c, id).changes) > 0,
    close: () => db.close(),
  };
}

function openJson(file) {
  let data = {};
  if (fs.existsSync(file)) {
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (err) {
      throw new Error(`Corrupt JSON store at ${file}: ${err.message}`, { cause: err });
    }
  }
  const flush = () => {
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file);
  };
  const col = (c) => (data[c] = data[c] || {});
  return {
    kind: 'json',
    all: (c) => Object.values(col(c)).map((d) => structuredClone(d)),
    get: (c, id) => (col(c)[id] ? structuredClone(col(c)[id]) : null),
    put: (c, doc) => { col(c)[doc.id] = structuredClone(doc); flush(); return doc; },
    del: (c, id) => { const had = id in col(c); delete col(c)[id]; if (had) flush(); return had; },
    close: () => {},
  };
}

function openStore({ dataDir, driver = process.env.STORE_DRIVER || 'auto' } = {}) {
  const dir = dataDir || process.env.DATA_DIR || path.join(process.cwd(), 'data');
  if (dir !== ':memory:') fs.mkdirSync(dir, { recursive: true });
  if (driver === 'auto' || driver === 'sqlite') {
    const s = openSqlite(dir === ':memory:' ? ':memory:' : path.join(dir, 'open-post.db'));
    if (s) return s;
    if (driver === 'sqlite') throw new Error('STORE_DRIVER=sqlite but neither node:sqlite nor better-sqlite3 is available');
  }
  return openJson(path.join(dir, 'open-post.json'));
}

module.exports = { openStore };
