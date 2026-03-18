const fs = require('fs');
const path = require('path');
const cfg = require('../config');
const { createLogger } = require('../middleware/logger');
const log = createLogger('db');

const { DatabaseSync } = require('node:sqlite');

let db = null;

function initDB() {
  fs.mkdirSync(cfg.DATA_DIR, { recursive: true });
  db = new DatabaseSync(cfg.DB_FILE);

  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id       TEXT PRIMARY KEY,
      type     TEXT NOT NULL,
      channel  TEXT NOT NULL,
      agent    TEXT,
      userId   TEXT,
      userName TEXT,
      userColor TEXT,
      text     TEXT,
      ts       INTEGER NOT NULL,
      runId    TEXT,
      replyTo  TEXT,
      blocks   TEXT,
      files    TEXT,
      cards    TEXT,
      mentions TEXT
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_msg_channel_ts ON messages(channel, ts)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_msg_ts ON messages(ts)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_msg_agent ON messages(agent)');

  try {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
        text,
        content='messages',
        content_rowid='rowid'
      )
    `);
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS msg_fts_ai AFTER INSERT ON messages BEGIN
        INSERT INTO messages_fts(rowid, text) VALUES (new.rowid, new.text);
      END
    `);
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS msg_fts_ad AFTER DELETE ON messages BEGIN
        INSERT INTO messages_fts(messages_fts, rowid, text) VALUES('delete', old.rowid, old.text);
      END
    `);
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS msg_fts_au AFTER UPDATE ON messages BEGIN
        INSERT INTO messages_fts(messages_fts, rowid, text) VALUES('delete', old.rowid, old.text);
        INSERT INTO messages_fts(rowid, text) VALUES (new.rowid, new.text);
      END
    `);
  } catch (e) {
    log.warn('FTS5 setup warning:', e.message);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id         TEXT PRIMARY KEY,
      authorType TEXT NOT NULL,
      authorId   TEXT NOT NULL,
      title      TEXT,
      content    TEXT,
      topic      TEXT,
      type       TEXT,
      tags       TEXT,
      createdAt  INTEGER,
      updatedAt  INTEGER
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_posts_topic ON posts(topic)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(authorId)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_posts_time ON posts(createdAt)');

  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id        TEXT PRIMARY KEY,
      postId    TEXT NOT NULL,
      authorType TEXT,
      authorId  TEXT NOT NULL,
      text      TEXT,
      createdAt INTEGER,
      FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(postId)');

  db.exec(`
    CREATE TABLE IF NOT EXISTS reactions (
      postId TEXT NOT NULL,
      userId TEXT NOT NULL,
      type   TEXT NOT NULL DEFAULT 'like',
      PRIMARY KEY (postId, userId, type),
      FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS metrics (
      agentId    TEXT PRIMARY KEY,
      messages   INTEGER DEFAULT 0,
      tasks      INTEGER DEFAULT 0,
      posts      INTEGER DEFAULT 0,
      comments   INTEGER DEFAULT 0,
      likes      INTEGER DEFAULT 0,
      reviews    INTEGER DEFAULT 0,
      lastActive INTEGER,
      ratings    TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version  INTEGER PRIMARY KEY,
      name     TEXT NOT NULL,
      appliedAt INTEGER NOT NULL
    )
  `);

  migrateFromJSON();
  runMigrations();

  log.info('SQLite initialized:', cfg.DB_FILE);
  return db;
}

// ── Schema Migrations ──

function runMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  if (!fs.existsSync(migrationsDir)) { fs.mkdirSync(migrationsDir, { recursive: true }); return; }

  let files;
  try { files = fs.readdirSync(migrationsDir).filter(f => /^\d{3}_.*\.js$/.test(f)).sort(); } catch { return; }
  if (!files.length) return;

  const applied = new Set();
  try {
    const rows = db.prepare('SELECT version FROM _migrations').all();
    for (const r of rows) applied.add(r.version);
  } catch {}

  for (const file of files) {
    const ver = parseInt(file.slice(0, 3), 10);
    if (isNaN(ver)) { log.warn(`skipping migration file with invalid version: ${file}`); continue; }
    if (applied.has(ver)) continue;

    let migration;
    try { migration = require(path.join(migrationsDir, file)); } catch (e) {
      log.error(`migration load failed [${file}]:`, e.message);
      throw e;
    }

    if (typeof migration.up !== 'function') {
      log.error(`migration ${file} missing up() function`);
      throw new Error(`migration ${file} missing up() function`);
    }

    log.info(`running migration ${ver}: ${migration.name || file}...`);
    db.exec('BEGIN');
    try {
      migration.up(db);
      db.prepare('INSERT INTO _migrations (version, name, appliedAt) VALUES (?, ?, ?)').run(ver, migration.name || file, Date.now());
      db.exec('COMMIT');
      log.info(`migration ${ver} applied`);
    } catch (e) {
      db.exec('ROLLBACK');
      log.error(`migration ${ver} failed, rolled back:`, e.message);
      throw e;
    }
  }
}

function migrateFromJSON() {
  _migrateHistory();
  _migratePosts();
  _migrateMetrics();
}

function _migrateHistory() {
  const file = cfg.HISTORY_FILE;
  if (!fs.existsSync(file)) return;
  const count = db.prepare('SELECT COUNT(*) AS c FROM messages').get().c;
  if (count > 0) return;

  let data;
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { log.warn('history JSON parse failed:', e.message); return; }
  if (!Array.isArray(data) || !data.length) return;

  log.info(`migrating ${data.length} messages from JSON...`);
  const insert = db.prepare(`
    INSERT OR IGNORE INTO messages (id, type, channel, agent, userId, userName, userColor, text, ts, runId, replyTo, blocks, files, cards, mentions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  db.exec('BEGIN');
  try {
    for (const m of data) {
      insert.run(
        m.id || ('msg-' + (m.ts || Date.now()) + '-' + Math.random().toString(36).slice(2, 6)),
        m.type || 'user', m.channel || 'group', m.agent || null,
        m.userId || null, m.userName || null, m.userColor || null,
        m.text || null, m.ts || Date.now(), m.runId || null, m.replyTo || null,
        m.blocks ? JSON.stringify(m.blocks) : null,
        m.files ? JSON.stringify(m.files) : (m.file ? JSON.stringify([m.file]) : null),
        m.cards ? JSON.stringify(m.cards) : null,
        m.mentions ? JSON.stringify(m.mentions) : null
      );
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    log.error('history migration failed, rolled back:', e.message);
    return;
  }

  try { _rebuildFTS(); } catch (e) { log.warn('FTS rebuild warning:', e.message); }
  _backupJSON(file);
  log.info(`migrated ${data.length} messages`);
}

function _migratePosts() {
  const file = cfg.POSTS_FILE;
  if (!fs.existsSync(file)) return;
  const count = db.prepare('SELECT COUNT(*) AS c FROM posts').get().c;
  if (count > 0) return;

  let data;
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { log.warn('posts JSON parse failed:', e.message); return; }
  if (!Array.isArray(data) || !data.length) return;

  log.info(`migrating ${data.length} posts from JSON...`);
  const insertPost = db.prepare(`
    INSERT OR IGNORE INTO posts (id, authorType, authorId, title, content, topic, type, tags, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertComment = db.prepare(`
    INSERT OR IGNORE INTO comments (id, postId, authorType, authorId, text, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertReaction = db.prepare(`
    INSERT OR IGNORE INTO reactions (postId, userId, type)
    VALUES (?, ?, 'like')
  `);

  db.exec('BEGIN');
  try {
    for (const p of data) {
      insertPost.run(
        p.id, p.authorType || 'user', p.authorId || 'anon',
        p.title || null, p.content || null, p.topic || 'daily', p.type || 'share',
        JSON.stringify(p.tags || []), p.ts || p.createdAt || Date.now(), p.updatedAt || null
      );
      if (p.comments && p.comments.length) {
        for (const c of p.comments) {
          insertComment.run(
            c.id || ('cmt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 4)),
            p.id, c.authorType || 'user', c.authorId || 'anon',
            c.content || c.text || '', c.ts || c.createdAt || Date.now()
          );
        }
      }
      if (p.reactions?.likes?.length) {
        for (const uid of p.reactions.likes) {
          insertReaction.run(p.id, uid);
        }
      }
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    log.error('posts migration failed, rolled back:', e.message);
    return;
  }
  _backupJSON(file);
  log.info(`migrated ${data.length} posts`);
}

function _migrateMetrics() {
  const file = cfg.METRICS_FILE;
  if (!fs.existsSync(file)) return;
  const count = db.prepare('SELECT COUNT(*) AS c FROM metrics').get().c;
  if (count > 0) return;

  let data;
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { log.warn('metrics JSON parse failed:', e.message); return; }
  if (!data || typeof data !== 'object') return;

  const keys = Object.keys(data);
  if (!keys.length) return;

  log.info(`migrating metrics for ${keys.length} agents...`);
  const insert = db.prepare(`
    INSERT OR IGNORE INTO metrics (agentId, messages, tasks, posts, comments, likes, reviews, lastActive, ratings)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  db.exec('BEGIN');
  try {
    for (const [id, m] of Object.entries(data)) {
      insert.run(id, m.messages || 0, m.tasks || 0, m.posts || 0,
        m.comments || 0, m.likes || 0, m.reviews || 0, m.lastActive || 0,
        m.ratings ? JSON.stringify(m.ratings) : null);
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    log.error('metrics migration failed, rolled back:', e.message);
    return;
  }
  _backupJSON(file);
  log.info(`migrated ${keys.length} agent metrics`);
}

function _rebuildFTS() {
  db.exec("INSERT INTO messages_fts(messages_fts) VALUES('rebuild')");
}

function _backupJSON(filePath) {
  const bak = filePath + '.bak';
  try { fs.renameSync(filePath, bak); log.info(`backed up ${path.basename(filePath)} → ${path.basename(bak)}`); } catch (e) { log.warn('backup failed:', path.basename(filePath), e.message); }
}

function getDB() { return db; }

function getMigrationStatus() {
  if (!db) return [];
  try {
    return db.prepare('SELECT version, name, appliedAt FROM _migrations ORDER BY version').all();
  } catch { return []; }
}

module.exports = { initDB, getDB, getMigrationStatus };
