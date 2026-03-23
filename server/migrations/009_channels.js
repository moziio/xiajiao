/**
 * Migration 009: Channel 外部平台对接 (M9)
 * channels — Channel 实例配置与状态
 * channel_sessions — 外部用户 ↔ Agent 会话映射
 */

exports.name = 'channels';

exports.up = function (db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS channels (
      id        TEXT PRIMARY KEY,
      type      TEXT NOT NULL,
      name      TEXT,
      preset    TEXT,
      config    TEXT,
      mode      TEXT DEFAULT 'webhook',
      enabled   INTEGER DEFAULT 1,
      status    TEXT DEFAULT 'idle',
      device_id TEXT,
      error     TEXT,
      stats     TEXT DEFAULT '{}',
      created   INTEGER
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS channel_sessions (
      id               TEXT PRIMARY KEY,
      channel_id       TEXT NOT NULL,
      external_user_id TEXT NOT NULL,
      external_name    TEXT,
      agent_id         TEXT NOT NULL,
      im_channel       TEXT,
      last_active      INTEGER,
      metadata         TEXT,
      UNIQUE(channel_id, external_user_id)
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_cs_channel ON channel_sessions(channel_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_cs_ext_user ON channel_sessions(external_user_id)');
};
