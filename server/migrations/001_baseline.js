/**
 * Baseline migration — marks the initial schema as applied.
 * All tables are created by initDB() with CREATE TABLE IF NOT EXISTS,
 * so this migration is a no-op. It exists to establish version 1 as
 * the starting point for future incremental migrations.
 *
 * NOTE: up() runs inside a transaction managed by runMigrations().
 * Do NOT call db.exec('BEGIN') / db.exec('COMMIT') inside up().
 */
module.exports = {
  version: 1,
  name: 'baseline',
  up(db) {
    // no-op: tables already created by initDB()
  }
};
