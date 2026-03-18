/**
 * Migration 006: 协作消息字段
 * 为 Agent 间协作的消息添加 calledBy 列
 */

exports.name = 'collab_fields';

exports.up = function (db) {
  const cols = db.prepare("PRAGMA table_info(messages)").all().map(c => c.name);
  if (!cols.includes('calledBy')) {
    db.exec('ALTER TABLE messages ADD COLUMN calledBy TEXT');
  }
};
