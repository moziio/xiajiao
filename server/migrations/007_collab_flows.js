/**
 * Migration 007: 协作流历史记录表
 * 存储已完成的协作流用于回放
 */

exports.name = 'collab_flows';

exports.up = function (db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS collab_flows (
      id        TEXT PRIMARY KEY,
      channel   TEXT NOT NULL,
      status    TEXT NOT NULL DEFAULT 'completed',
      startedAt INTEGER,
      endedAt   INTEGER,
      durationMs INTEGER,
      nodes     TEXT,
      edges     TEXT,
      totalToolCalls INTEGER DEFAULT 0,
      triggerText TEXT
    )
  `);
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_collab_flows_channel ON collab_flows(channel)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_collab_flows_endedAt ON collab_flows(endedAt)');
  } catch (e) {
    if (!/already exists/i.test(e.message)) throw e;
  }
};
