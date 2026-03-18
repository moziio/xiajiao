const fs = require('fs');
const path = require('path');
const cfg = require('../config');
const { getDB } = require('./database');

function save(file, data) { fs.writeFile(file, JSON.stringify(data, null, 2), () => {}); }

// ── JSON-based state (low-frequency, kept as-is for topics/profiles/settings) ──
let groups = [];
try { groups = JSON.parse(fs.readFileSync(cfg.GROUPS_FILE, 'utf8')); } catch {}

let topics = cfg.DEFAULT_TOPICS;
try { const t = JSON.parse(fs.readFileSync(cfg.TOPICS_FILE, 'utf8')); if (t.length) topics = t; } catch {}

let profiles = {};
try { profiles = JSON.parse(fs.readFileSync(cfg.PROFILES_FILE, 'utf8')); } catch {}

let schedules = [];
try { schedules = JSON.parse(fs.readFileSync(cfg.SCHEDULES_FILE, 'utf8')); } catch {}

let imSettings = { supervisionCron: '0 18 * * 1-5' };
try { const s = JSON.parse(fs.readFileSync(cfg.SETTINGS_FILE, 'utf8')); Object.assign(imSettings, s); } catch {}

let workflows = [];
try { workflows = JSON.parse(fs.readFileSync(cfg.WORKFLOWS_FILE, 'utf8')); } catch {}

let localAgents = [];
let _agentsLoaded = false;
function loadAgents(force) {
  if (_agentsLoaded && !force) return localAgents;
  try { localAgents = JSON.parse(fs.readFileSync(cfg.AGENTS_FILE, 'utf8')).agents || []; } catch { localAgents = []; }
  _agentsLoaded = true;
  return localAgents;
}
function saveAgents() {
  fs.writeFileSync(cfg.AGENTS_FILE, JSON.stringify({ agents: localAgents }, null, 2));
}
loadAgents();

let localModels = { providers: {}, models: [] };
let _modelsLoaded = false;
function loadModels(force) {
  if (_modelsLoaded && !force) return localModels;
  try { localModels = JSON.parse(fs.readFileSync(cfg.MODELS_FILE, 'utf8')); } catch { localModels = { providers: {}, models: [] }; }
  _modelsLoaded = true;
  return localModels;
}
function saveModels() {
  fs.writeFileSync(cfg.MODELS_FILE, JSON.stringify(localModels, null, 2));
}
loadModels();

function saveTopics() { save(cfg.TOPICS_FILE, topics); }
function saveProfiles() { save(cfg.PROFILES_FILE, profiles); }
function saveSettings() { save(cfg.SETTINGS_FILE, imSettings); }

function _hasTable(name) {
  try {
    const db = getDB();
    if (!db) return false;
    const r = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
    return !!r;
  } catch { return false; }
}

function loadGroupsFromDB() {
  if (!_hasTable('groups_v2')) return false;
  try {
    const db = getDB();
    const rows = db.prepare('SELECT * FROM groups_v2').all();
    groups = rows.map(r => {
      const g = { id: r.id, name: r.name, emoji: r.emoji || '\u{1F465}', members: [], leader: r.leader || '', reviewCron: r.reviewCron || '' };
      try { g.members = JSON.parse(r.members); } catch { g.members = []; }
      if (r.collabChain) { try { g.collabChain = JSON.parse(r.collabChain); } catch {} }
      if (r.createdAt) g.createdAt = r.createdAt;
      return g;
    });
    return true;
  } catch { return false; }
}

function saveGroups() {
  if (_hasTable('groups_v2')) {
    try {
      const db = getDB();
      db.exec('BEGIN');
      try {
        db.exec('DELETE FROM groups_v2');
        const insert = db.prepare('INSERT INTO groups_v2 (id, name, emoji, members, leader, reviewCron, collabChain, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        for (const g of groups) {
          insert.run(g.id, g.name, g.emoji || '\u{1F465}', JSON.stringify(g.members || []), g.leader || '', g.reviewCron || '', g.collabChain ? JSON.stringify(g.collabChain) : null, g.createdAt || Date.now());
        }
        db.exec('COMMIT');
      } catch (e) { db.exec('ROLLBACK'); throw e; }
    } catch (e) {
      save(cfg.GROUPS_FILE, groups);
    }
  } else {
    save(cfg.GROUPS_FILE, groups);
  }
}

function loadWorkflowsFromDB() {
  if (!_hasTable('workflows_v2')) return false;
  try {
    const db = getDB();
    const rows = db.prepare('SELECT * FROM workflows_v2').all();
    workflows = rows.map(r => {
      const w = { id: r.id, name: r.name, emoji: r.emoji || '⚙️', description: r.description || '', steps: [], createdAt: r.createdAt };
      try { w.steps = JSON.parse(r.steps); } catch { w.steps = []; }
      return w;
    });
    return true;
  } catch { return false; }
}

function saveWorkflows() {
  if (_hasTable('workflows_v2')) {
    try {
      const db = getDB();
      db.exec('BEGIN');
      try {
        db.exec('DELETE FROM workflows_v2');
        const insert = db.prepare('INSERT INTO workflows_v2 (id, name, emoji, description, steps, createdAt) VALUES (?, ?, ?, ?, ?, ?)');
        for (const w of workflows) {
          insert.run(w.id, w.name, w.emoji || '⚙️', w.description || '', JSON.stringify(w.steps || []), w.createdAt || Date.now());
        }
        db.exec('COMMIT');
      } catch (e) { db.exec('ROLLBACK'); throw e; }
    } catch (e) {
      save(cfg.WORKFLOWS_FILE, workflows);
    }
  } else {
    save(cfg.WORKFLOWS_FILE, workflows);
  }
}

function loadSchedulesFromDB() {
  if (!_hasTable('schedules_v2')) return false;
  try {
    const db = getDB();
    const rows = db.prepare('SELECT * FROM schedules_v2').all();
    schedules = rows.map(r => {
      let s;
      try { s = JSON.parse(r.data); } catch { s = {}; }
      s.id = r.id;
      s.name = r.name;
      s.cron = r.cron;
      s.enabled = r.enabled !== 0;
      return s;
    });
    return true;
  } catch { return false; }
}

function saveSchedules() {
  if (_hasTable('schedules_v2')) {
    try {
      const db = getDB();
      db.exec('BEGIN');
      try {
        db.exec('DELETE FROM schedules_v2');
        const insert = db.prepare('INSERT INTO schedules_v2 (id, name, cron, groupId, prompt, agentId, enabled, lastRun, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const s of schedules) {
          insert.run(s.id, s.name || '', s.cron || '', s.groupId || '', s.prompt || '', s.agentId || '', s.enabled !== false ? 1 : 0, s.lastRun || null, JSON.stringify(s));
        }
        db.exec('COMMIT');
      } catch (e) { db.exec('ROLLBACK'); throw e; }
    } catch (e) {
      save(cfg.SCHEDULES_FILE, schedules);
    }
  } else {
    save(cfg.SCHEDULES_FILE, schedules);
  }
}

function reloadStateFromDB() {
  loadGroupsFromDB();
  loadWorkflowsFromDB();
  loadSchedulesFromDB();
}

function getFirstAvailableModel() {
  const models = localModels.models || [];
  return models.length > 0 ? models[0].id : null;
}

fs.mkdirSync(cfg.DATA_DIR, { recursive: true });

// ═══════════════════════════════════════════════
// ── SQLite-backed: Messages ──
// ═══════════════════════════════════════════════

function _msgRow(r) {
  const m = { id: r.id, type: r.type, channel: r.channel, ts: r.ts };
  if (r.agent) m.agent = r.agent;
  if (r.userId) m.userId = r.userId;
  if (r.userName) m.userName = r.userName;
  if (r.userColor) m.userColor = r.userColor;
  if (r.text != null) m.text = r.text;
  if (r.runId) m.runId = r.runId;
  if (r.replyTo) m.replyTo = r.replyTo;
  if (r.blocks) try { m.blocks = JSON.parse(r.blocks); } catch {}
  if (r.files) try { m.files = JSON.parse(r.files); } catch {}
  if (r.cards) try { m.cards = JSON.parse(r.cards); } catch {}
  if (r.mentions) try { m.mentions = JSON.parse(r.mentions); } catch {}
  if (r.calledBy) m.calledBy = r.calledBy;
  return m;
}

function addMessage(entry) {
  const db = getDB();
  db.prepare(`
    INSERT OR REPLACE INTO messages (id, type, channel, agent, userId, userName, userColor, text, ts, runId, replyTo, blocks, files, cards, mentions, calledBy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    entry.id, entry.type || 'user', entry.channel || 'group', entry.agent || null,
    entry.userId || null, entry.userName || null, entry.userColor || null,
    entry.text || null, entry.ts || Date.now(), entry.runId || null, entry.replyTo || null,
    entry.blocks ? JSON.stringify(entry.blocks) : null,
    entry.files ? JSON.stringify(entry.files) : (entry.file ? JSON.stringify([entry.file]) : null),
    entry.cards ? JSON.stringify(entry.cards) : null,
    entry.mentions ? JSON.stringify(entry.mentions) : null,
    entry.calledBy || null
  );
}

function getRecentMessages(limit = 200) {
  const db = getDB();
  const rows = db.prepare('SELECT * FROM messages ORDER BY ts DESC LIMIT ?').all(limit);
  return rows.reverse().map(_msgRow);
}

function getMessagesSince(ts, limit = 200) {
  const db = getDB();
  const rows = db.prepare('SELECT * FROM messages WHERE ts >= ? ORDER BY ts ASC LIMIT ?').all(ts, limit);
  return rows.map(_msgRow);
}

function getMessagesByChannel(channel, limit = 200) {
  const db = getDB();
  const rows = db.prepare('SELECT * FROM messages WHERE channel = ? ORDER BY ts DESC LIMIT ?').all(channel, limit);
  return rows.reverse().map(_msgRow);
}

function queryMessages({ channel, before, limit = 30 }) {
  const db = getDB();
  let sql = 'SELECT * FROM messages WHERE 1=1';
  const params = [];
  if (channel) { sql += ' AND channel = ?'; params.push(channel); }
  if (before) { sql += ' AND ts < ?'; params.push(before); }
  sql += ' ORDER BY ts DESC LIMIT ?';
  params.push(limit + 1);
  const rows = db.prepare(sql).all(...params);
  const hasMore = rows.length > limit;
  if (hasMore) rows.pop();
  return { messages: rows.reverse().map(_msgRow), hasMore };
}

function searchMessages(keyword, { channel, limit = 20 } = {}) {
  const db = getDB();
  const escaped = keyword.replace(/"/g, '""').trim();
  if (!escaped) return { results: [], total: 0 };
  const ftsQuery = `"${escaped}"`;
  let sql, params;
  if (channel) {
    sql = `SELECT m.* FROM messages m JOIN messages_fts f ON m.rowid = f.rowid WHERE f.text MATCH ? AND m.channel = ? ORDER BY m.ts DESC LIMIT ?`;
    params = [ftsQuery, channel, limit];
  } else {
    sql = `SELECT m.* FROM messages m JOIN messages_fts f ON m.rowid = f.rowid WHERE f.text MATCH ? ORDER BY m.ts DESC LIMIT ?`;
    params = [ftsQuery, limit];
  }
  try {
    const rows = db.prepare(sql).all(...params);
    return { results: rows.map(_msgRow), total: rows.length };
  } catch {
    return { results: [], total: 0 };
  }
}

function countMessagesByAgent(agentId) {
  const db = getDB();
  return db.prepare('SELECT COUNT(*) AS c FROM messages WHERE channel = ? OR agent = ?').get(agentId, agentId).c;
}

function deleteMessagesByAgent(agentId) {
  const db = getDB();
  const result = db.prepare('DELETE FROM messages WHERE channel = ? OR agent = ?').run(agentId, agentId);
  return result.changes;
}

function deleteMessagesByChannel(channel) {
  const db = getDB();
  const result = db.prepare('DELETE FROM messages WHERE channel = ?').run(channel);
  return result.changes;
}

function deleteMessage(id) {
  const db = getDB();
  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
  if (!msg) return { changes: 0 };
  db.prepare('DELETE FROM messages WHERE id = ?').run(id);
  return { changes: 1, message: _msgRow(msg) };
}

function deleteMessages(ids) {
  if (!ids || !ids.length) return 0;
  const db = getDB();
  const ph = ids.map(() => '?').join(',');
  const result = db.prepare(`DELETE FROM messages WHERE id IN (${ph})`).run(...ids);
  return result.changes;
}

function totalMessageCount() {
  const db = getDB();
  return db.prepare('SELECT COUNT(*) AS c FROM messages').get().c;
}

function getHistoryForContext(channel, agentId, limit = 20) {
  const db = getDB();
  const rows = db.prepare(
    `SELECT * FROM messages WHERE channel = ? AND (type = 'user' OR (type = 'agent' AND agent = ?)) ORDER BY ts DESC LIMIT ?`
  ).all(channel, agentId, limit);
  return rows.reverse().map(_msgRow);
}

// ═══════════════════════════════════════════════
// ── SQLite-backed: Posts / Comments / Reactions ──
// ═══════════════════════════════════════════════

function _postRowBasic(r) {
  const p = { id: r.id, authorType: r.authorType, authorId: r.authorId, title: r.title, content: r.content, topic: r.topic, type: r.type, ts: r.createdAt, createdAt: r.createdAt, updatedAt: r.updatedAt };
  try { p.tags = JSON.parse(r.tags || '[]'); } catch { p.tags = []; }
  return p;
}

function _postRow(r) {
  return _postRowBasic(r);
}

function _hydratePostsBatch(posts) {
  return posts;
}

function addPost(post) {
  const db = getDB();
  db.prepare(`
    INSERT OR REPLACE INTO posts (id, authorType, authorId, title, content, topic, type, tags, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    post.id, post.authorType || 'user', post.authorId || 'anon',
    post.title || null, post.content || null, post.topic || 'daily', post.type || 'share',
    JSON.stringify(post.tags || []), post.ts || post.createdAt || Date.now(), post.updatedAt || null
  );
}

function getPost(id) {
  const db = getDB();
  const r = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
  return r ? _postRow(r) : null;
}

function getAllPosts(limit = 200) {
  const db = getDB();
  const posts = db.prepare('SELECT * FROM posts ORDER BY createdAt DESC LIMIT ?').all(limit).map(_postRowBasic);
  return _hydratePostsBatch(posts);
}

function getPostsByTopic(topic, limit = 100) {
  const db = getDB();
  const posts = db.prepare('SELECT * FROM posts WHERE topic = ? ORDER BY createdAt DESC LIMIT ?').all(topic, limit).map(_postRowBasic);
  return _hydratePostsBatch(posts);
}

function getPostsByAuthor(authorId, limit = 10) {
  const db = getDB();
  const posts = db.prepare('SELECT * FROM posts WHERE authorId = ? ORDER BY createdAt DESC LIMIT ?').all(authorId, limit).map(_postRowBasic);
  return _hydratePostsBatch(posts);
}

function deletePost(id) {
  const db = getDB();
  db.prepare('DELETE FROM posts WHERE id = ?').run(id);
}

function deletePostsByAuthor(authorId) {
  const db = getDB();
  return db.prepare('DELETE FROM posts WHERE authorId = ?').run(authorId);
}

function postCount() {
  const db = getDB();
  return db.prepare('SELECT COUNT(*) AS c FROM posts').get().c;
}

// ═══════════════════════════════════════════════
// ── SQLite-backed: Metrics ──
// ═══════════════════════════════════════════════

function bumpMetric(agentId, key, delta = 1) {
  if (!agentId || agentId === 'main') return;
  const db = getDB();
  const validKeys = ['messages', 'tasks', 'posts', 'comments', 'likes', 'reviews'];
  if (!validKeys.includes(key)) return;
  db.prepare(`
    INSERT INTO metrics (agentId, ${key}, lastActive) VALUES (?, ?, ?)
    ON CONFLICT(agentId) DO UPDATE SET ${key} = ${key} + ?, lastActive = ?
  `).run(agentId, delta, Date.now(), delta, Date.now());
}

function getMetric(agentId) {
  const db = getDB();
  const r = db.prepare('SELECT * FROM metrics WHERE agentId = ?').get(agentId);
  if (!r) return {};
  const m = { messages: r.messages, tasks: r.tasks, posts: r.posts, comments: r.comments, likes: r.likes, reviews: r.reviews, lastActive: r.lastActive };
  if (r.ratings) try { m.ratings = JSON.parse(r.ratings); } catch {}
  return m;
}

function getAllMetrics() {
  const db = getDB();
  const rows = db.prepare('SELECT * FROM metrics').all();
  const result = {};
  for (const r of rows) {
    result[r.agentId] = { messages: r.messages, tasks: r.tasks, posts: r.posts, comments: r.comments, likes: r.likes, reviews: r.reviews, lastActive: r.lastActive };
    if (r.ratings) try { result[r.agentId].ratings = JSON.parse(r.ratings); } catch {}
  }
  return result;
}

function deleteMetric(agentId) {
  const db = getDB();
  db.prepare('DELETE FROM metrics WHERE agentId = ?').run(agentId);
}

function addRating(agentId, fromId, score) {
  const s = Math.max(1, Math.min(5, Math.round(Number(score))));
  if (isNaN(s)) return;
  const db = getDB();
  db.exec('BEGIN');
  try {
    const r = db.prepare('SELECT ratings FROM metrics WHERE agentId = ?').get(agentId);
    let ratings = [];
    if (r?.ratings) try { ratings = JSON.parse(r.ratings); } catch {}
    ratings.push({ from: fromId, score: s, ts: Date.now() });
    db.prepare(`
      INSERT INTO metrics (agentId, reviews, lastActive, ratings) VALUES (?, 1, ?, ?)
      ON CONFLICT(agentId) DO UPDATE SET reviews = reviews + 1, ratings = ?, lastActive = ?
    `).run(agentId, Date.now(), JSON.stringify(ratings), JSON.stringify(ratings), Date.now());
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

// ═══════════════════════════════════════════════
// ── Compatibility shims ──
// ═══════════════════════════════════════════════

function saveHistory() {}
function savePosts() {}
function saveMetrics() {}

module.exports = {
  get history() { return getRecentMessages(500); },
  set history(_v) {},
  get groups() { return groups; },
  set groups(v) { groups = v; },
  get posts() { return getAllPosts(); },
  set posts(_v) {},
  get topics() { return topics; },
  set topics(v) { topics = v; },
  get profiles() { return profiles; },
  get metrics() { return getAllMetrics(); },
  get schedules() { return schedules; },
  set schedules(v) { schedules = v; },
  get imSettings() { return imSettings; },
  get localAgents() { return localAgents; },
  get localModels() { return localModels; },
  get workflows() { return workflows; },
  set workflows(v) { workflows = v; },

  save, loadAgents, saveAgents, loadModels, saveModels,
  saveHistory, savePosts, saveTopics, saveProfiles, saveMetrics,
  saveSchedules, saveGroups, saveSettings, saveWorkflows,
  loadGroupsFromDB, loadWorkflowsFromDB, loadSchedulesFromDB, reloadStateFromDB,
  getFirstAvailableModel, bumpMetric,

  addMessage, getRecentMessages, getMessagesSince, getMessagesByChannel, queryMessages,
  searchMessages, countMessagesByAgent, deleteMessagesByAgent, deleteMessagesByChannel,
  deleteMessage, deleteMessages, totalMessageCount, getHistoryForContext,

  addPost, getPost, getAllPosts, getPostsByTopic, getPostsByAuthor,
  deletePost, deletePostsByAuthor, postCount,

  getMetric, getAllMetrics, deleteMetric, addRating,
};
