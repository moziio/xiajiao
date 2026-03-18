/**
 * Migration 003: 用户偏好持久化
 * 将置顶、收藏从浏览器 localStorage 迁移到服务端 SQLite
 */

exports.name = 'user_prefs';

exports.up = function (db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_pinned (
      user_id    TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, channel_id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_favorites (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL,
      text         TEXT DEFAULT '',
      sender_name  TEXT DEFAULT '',
      sender_emoji TEXT DEFAULT '',
      sender_color TEXT DEFAULT '#00d4ff',
      is_agent     INTEGER DEFAULT 0,
      ts           INTEGER NOT NULL,
      channel      TEXT NOT NULL,
      channel_name TEXT DEFAULT '',
      files        TEXT DEFAULT '[]',
      saved_at     INTEGER NOT NULL
    )
  `);

  db.exec('CREATE INDEX IF NOT EXISTS idx_user_pinned_user ON user_pinned(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_user_favorites_saved ON user_favorites(saved_at)');
};
