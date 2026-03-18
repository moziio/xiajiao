/**
 * Migration 005: RAG FTS5 全文搜索支持
 * 为 BM25 混合检索创建 FTS5 虚拟表
 */

exports.name = 'rag_chunks_fts';

exports.up = function (db) {
  try {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS rag_chunks_fts USING fts5(
        agent_id UNINDEXED,
        chunk_id UNINDEXED,
        file_name UNINDEXED,
        text,
        tokenize='unicode61'
      )
    `);
  } catch (e) {
    if (!/already exists/i.test(e.message)) throw e;
  }
};
