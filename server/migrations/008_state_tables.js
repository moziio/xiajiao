/**
 * Migration 008: JSON 状态文件迁移到 SQLite
 * groups, workflows, schedules 三个表
 */
const fs = require('fs');
const path = require('path');
const cfg = require('../config');
const { createLogger } = require('../middleware/logger');
const log = createLogger('migration-008');

exports.name = 'state_tables';

exports.up = function (db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS groups_v2 (
      id        TEXT PRIMARY KEY,
      name      TEXT NOT NULL,
      emoji     TEXT DEFAULT '👥',
      members   TEXT,
      leader    TEXT DEFAULT '',
      reviewCron TEXT DEFAULT '',
      collabChain TEXT,
      createdAt INTEGER
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS workflows_v2 (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      emoji       TEXT DEFAULT '⚙️',
      description TEXT DEFAULT '',
      steps       TEXT,
      createdAt   INTEGER
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS schedules_v2 (
      id        TEXT PRIMARY KEY,
      name      TEXT NOT NULL,
      cron      TEXT,
      groupId   TEXT,
      prompt    TEXT,
      agentId   TEXT,
      enabled   INTEGER DEFAULT 1,
      lastRun   INTEGER,
      data      TEXT
    )
  `);

  _migrateGroups(db);
  _migrateWorkflows(db);
  _migrateSchedules(db);
};

function _migrateGroups(db) {
  const count = db.prepare('SELECT COUNT(*) AS c FROM groups_v2').get().c;
  if (count > 0) return;
  if (!fs.existsSync(cfg.GROUPS_FILE)) return;

  let data;
  try { data = JSON.parse(fs.readFileSync(cfg.GROUPS_FILE, 'utf8')); } catch { return; }
  if (!Array.isArray(data) || !data.length) return;

  log.info(`migrating ${data.length} groups from JSON...`);
  const insert = db.prepare(`
    INSERT OR IGNORE INTO groups_v2 (id, name, emoji, members, leader, reviewCron, collabChain, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const g of data) {
    insert.run(
      g.id, g.name || '', g.emoji || '\u{1F465}',
      JSON.stringify(g.members || []),
      g.leader || '', g.reviewCron || '',
      g.collabChain ? JSON.stringify(g.collabChain) : null,
      g.createdAt || Date.now()
    );
  }
  _backupJSON(cfg.GROUPS_FILE);
  log.info(`migrated ${data.length} groups`);
}

function _migrateWorkflows(db) {
  const count = db.prepare('SELECT COUNT(*) AS c FROM workflows_v2').get().c;
  if (count > 0) return;
  if (!fs.existsSync(cfg.WORKFLOWS_FILE)) return;

  let data;
  try { data = JSON.parse(fs.readFileSync(cfg.WORKFLOWS_FILE, 'utf8')); } catch { return; }
  if (!Array.isArray(data) || !data.length) return;

  log.info(`migrating ${data.length} workflows from JSON...`);
  const insert = db.prepare(`
    INSERT OR IGNORE INTO workflows_v2 (id, name, emoji, description, steps, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const w of data) {
    insert.run(
      w.id, w.name || '', w.emoji || '⚙️',
      w.description || '', JSON.stringify(w.steps || []),
      w.createdAt || Date.now()
    );
  }
  _backupJSON(cfg.WORKFLOWS_FILE);
  log.info(`migrated ${data.length} workflows`);
}

function _migrateSchedules(db) {
  const count = db.prepare('SELECT COUNT(*) AS c FROM schedules_v2').get().c;
  if (count > 0) return;
  if (!fs.existsSync(cfg.SCHEDULES_FILE)) return;

  let data;
  try { data = JSON.parse(fs.readFileSync(cfg.SCHEDULES_FILE, 'utf8')); } catch { return; }
  if (!Array.isArray(data) || !data.length) return;

  log.info(`migrating ${data.length} schedules from JSON...`);
  const insert = db.prepare(`
    INSERT OR IGNORE INTO schedules_v2 (id, name, cron, groupId, prompt, agentId, enabled, lastRun, data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const s of data) {
    insert.run(
      s.id, s.name || '', s.cron || '',
      s.groupId || '', s.prompt || '', s.agentId || '',
      s.enabled !== false ? 1 : 0, s.lastRun || null,
      JSON.stringify(s)
    );
  }
  _backupJSON(cfg.SCHEDULES_FILE);
  log.info(`migrated ${data.length} schedules`);
}

function _backupJSON(filePath) {
  const bak = filePath + '.bak';
  try { fs.renameSync(filePath, bak); log.info(`backed up ${path.basename(filePath)} → ${path.basename(bak)}`); } catch {}
}
