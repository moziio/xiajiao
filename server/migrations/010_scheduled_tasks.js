/**
 * Migration 010: 通用定时任务引擎 (M13)
 * scheduled_tasks — 通用定时任务配置
 * task_runs — 任务执行历史
 */

exports.name = 'scheduled_tasks';

exports.up = function (db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id              TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      type            TEXT NOT NULL,
      schedule_kind   TEXT NOT NULL,
      schedule_expr   TEXT NOT NULL,
      timezone        TEXT DEFAULT 'Asia/Shanghai',
      target_id       TEXT NOT NULL,
      payload         TEXT NOT NULL DEFAULT '{}',
      delivery_mode   TEXT DEFAULT 'chat',
      delivery_target TEXT,
      enabled         INTEGER DEFAULT 1,
      last_run        INTEGER,
      next_run        INTEGER,
      run_count       INTEGER DEFAULT 0,
      last_status     TEXT DEFAULT 'idle',
      last_error      TEXT,
      created_by      TEXT DEFAULT 'user',
      created_at      INTEGER NOT NULL,
      delete_after_run INTEGER DEFAULT 0
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_st_type ON scheduled_tasks(type)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_st_enabled ON scheduled_tasks(enabled)');

  db.exec(`
    CREATE TABLE IF NOT EXISTS task_runs (
      id        TEXT PRIMARY KEY,
      task_id   TEXT NOT NULL,
      status    TEXT NOT NULL,
      started   INTEGER NOT NULL,
      finished  INTEGER,
      duration  INTEGER,
      summary   TEXT,
      error     TEXT
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_tr_task ON task_runs(task_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_tr_started ON task_runs(started)');
};
