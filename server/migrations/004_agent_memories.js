/**
 * Migration 004: Agent Memory 持久化
 * 结构化记忆表，支持三分法（semantic/episodic/procedural）、混合搜索、容量淘汰
 */

exports.name = 'agent_memories_v2';

exports.up = function (db) {
  const hasOld = (() => {
    try {
      db.prepare("SELECT 1 FROM agent_memories LIMIT 1").get();
      return true;
    } catch { return false; }
  })();

  if (hasOld) {
    const cols = db.prepare("PRAGMA table_info(agent_memories)").all().map(c => c.name);
    if (!cols.includes('type')) {
      db.exec('ALTER TABLE agent_memories ADD COLUMN type TEXT DEFAULT \'semantic\'');
      db.exec('ALTER TABLE agent_memories ADD COLUMN summary TEXT');
      db.exec('ALTER TABLE agent_memories ADD COLUMN importance TEXT DEFAULT \'medium\'');
      db.exec('ALTER TABLE agent_memories ADD COLUMN source TEXT DEFAULT \'agent\'');
      db.exec('ALTER TABLE agent_memories ADD COLUMN embedding TEXT');
      db.exec('ALTER TABLE agent_memories ADD COLUMN access_count INTEGER DEFAULT 0');
      db.exec('ALTER TABLE agent_memories ADD COLUMN last_accessed_at INTEGER');
      db.exec('ALTER TABLE agent_memories ADD COLUMN consolidated_into TEXT');
      db.exec('CREATE INDEX IF NOT EXISTS idx_mem_agent ON agent_memories(agent_id)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_mem_agent_type ON agent_memories(agent_id, type)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_mem_agent_importance ON agent_memories(agent_id, importance)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_mem_agent_created ON agent_memories(agent_id, created_at DESC)');
    }
    return;
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_memories (
      id                TEXT PRIMARY KEY,
      agent_id          TEXT NOT NULL,
      type              TEXT DEFAULT 'semantic',
      content           TEXT NOT NULL,
      summary           TEXT,
      tags              TEXT DEFAULT '[]',
      importance        TEXT DEFAULT 'medium',
      source            TEXT DEFAULT 'agent',
      embedding         TEXT,
      access_count      INTEGER DEFAULT 0,
      created_at        INTEGER NOT NULL,
      last_accessed_at  INTEGER,
      consolidated_into TEXT
    )
  `);

  db.exec('CREATE INDEX IF NOT EXISTS idx_mem_agent ON agent_memories(agent_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_mem_agent_type ON agent_memories(agent_id, type)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_mem_agent_importance ON agent_memories(agent_id, importance)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_mem_agent_created ON agent_memories(agent_id, created_at DESC)');
};
