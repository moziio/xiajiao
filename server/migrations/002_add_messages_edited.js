/**
 * Add editedAt column to messages table for future message editing support.
 * NOTE: up() runs inside a transaction — do NOT use BEGIN/COMMIT here.
 */
module.exports = {
  version: 2,
  name: 'add_messages_editedAt',
  up(db) {
    try {
      db.exec('ALTER TABLE messages ADD COLUMN editedAt INTEGER');
    } catch (e) {
      if (!e.message.includes('duplicate column')) throw e;
    }
  }
};
