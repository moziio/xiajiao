/**
 * M2 — Agent Memory 持久化服务
 * 三层记忆（semantic/episodic/procedural）+ 混合搜索 + 容量淘汰
 */
const { getDB } = require('./database');
const rag = require('./rag');
const { createLogger } = require('../middleware/logger');
const log = createLogger('memory');

const MAX_MEMORIES_PER_AGENT = 1000;
const EVICT_BATCH = 100;
const DEDUP_THRESHOLD = 0.85;
const LN2 = Math.LN2;
const HALF_LIFE_DAYS = 30;

function _genId() {
  return 'mem-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

function _makeSummary(content) {
  if (!content || content.length <= 200) return null;
  return content.slice(0, 200) + '…';
}

// ── Write ──

const MAX_CONTENT_LENGTH = 5000;

async function writeMemory(agentId, { content, tags, importance, type, source }) {
  if (!content || !content.trim()) return { ok: false, error: '记忆内容不能为空' };
  content = content.trim();
  if (content.length > MAX_CONTENT_LENGTH) content = content.slice(0, MAX_CONTENT_LENGTH);
  tags = Array.isArray(tags) ? tags.filter(t => typeof t === 'string').slice(0, 20) : [];
  importance = ['low', 'medium', 'high'].includes(importance) ? importance : 'medium';
  type = ['semantic', 'episodic', 'procedural'].includes(type) ? type : 'semantic';
  source = source || 'agent';

  const db = getDB();

  let newEmbedding = null;
  try {
    const vecs = await rag.getEmbeddings([content]);
    if (vecs && vecs[0]) newEmbedding = vecs[0];
  } catch (e) {
    log.warn('embedding failed for memory dedup, skipping:', e.message);
  }

  if (newEmbedding) {
    const existing = db.prepare(
      'SELECT id, content, tags, importance, embedding FROM agent_memories WHERE agent_id = ? AND consolidated_into IS NULL'
    ).all(agentId);

    for (const row of existing) {
      if (!row.embedding) continue;
      let stored;
      try { stored = JSON.parse(row.embedding); } catch { continue; }
      const sim = rag.cosineSimilarity(newEmbedding, stored);
      if (sim > DEDUP_THRESHOLD) {
        let oldTags = [];
        try { oldTags = JSON.parse(row.tags || '[]'); } catch {}
        const mergedTags = [...new Set([...oldTags, ...tags])];
        const higherImp = _higherImportance(row.importance, importance);
        db.prepare(
          'UPDATE agent_memories SET content = ?, tags = ?, importance = ?, summary = ?, embedding = ?, last_accessed_at = ? WHERE id = ?'
        ).run(content, JSON.stringify(mergedTags), higherImp, _makeSummary(content), JSON.stringify(newEmbedding), Date.now(), row.id);
        log.info(`memory dedup-updated: agent=${agentId} id=${row.id} sim=${sim.toFixed(3)}`);
        return { ok: true, memoryId: row.id, deduplicated: true };
      }
    }
  }

  const id = _genId();
  db.prepare(
    `INSERT INTO agent_memories (id, agent_id, type, content, summary, tags, importance, source, embedding, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, agentId, type, content, _makeSummary(content), JSON.stringify(tags), importance, source, newEmbedding ? JSON.stringify(newEmbedding) : null, Date.now());

  log.info(`memory saved: agent=${agentId} id=${id} type=${type} importance=${importance}`);
  evict(agentId);
  return { ok: true, memoryId: id };
}

function _higherImportance(a, b) {
  const rank = { high: 3, medium: 2, low: 1 };
  return (rank[a] || 2) >= (rank[b] || 2) ? a : b;
}

// ── Search ──

async function searchMemory(agentId, query, { type, limit } = {}) {
  limit = limit || 5;
  const db = getDB();

  let sql = 'SELECT * FROM agent_memories WHERE agent_id = ? AND consolidated_into IS NULL';
  const params = [agentId];
  if (type && type !== 'all') { sql += ' AND type = ?'; params.push(type); }
  const rows = db.prepare(sql).all(...params);
  if (!rows.length) return [];

  let queryEmbedding = null;
  try {
    const vecs = await rag.getEmbeddings([query]);
    if (vecs && vecs[0]) queryEmbedding = vecs[0];
  } catch (e) {
    log.warn('embedding failed for memory search, using keyword-only:', e.message);
  }

  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(/\s+/).filter(Boolean);
  const now = Date.now();

  const scored = rows.map(row => {
    let vectorScore = 0;
    if (queryEmbedding && row.embedding) {
      try {
        const stored = JSON.parse(row.embedding);
        vectorScore = rag.cosineSimilarity(queryEmbedding, stored);
      } catch {}
    }

    let keywordScore = 0;
    if (keywords.length) {
      const contentLower = row.content.toLowerCase();
      const matched = keywords.filter(kw => contentLower.includes(kw)).length;
      keywordScore = matched / keywords.length;
    }

    const ageDays = (now - row.created_at) / 86400000;
    const recency = Math.exp(-LN2 / HALF_LIFE_DAYS * ageDays);
    const impBoost = { high: 1.3, medium: 1.0, low: 0.7 }[row.importance] || 1.0;
    const timeImportanceScore = recency * impBoost;

    const finalScore = vectorScore * 0.60 + keywordScore * 0.25 + timeImportanceScore * 0.15;

    return { row, score: finalScore };
  });

  scored.sort((a, b) => b.score - a.score);
  const topK = scored.slice(0, limit);

  const updateStmt = db.prepare('UPDATE agent_memories SET access_count = access_count + 1, last_accessed_at = ? WHERE id = ?');
  for (const { row } of topK) {
    updateStmt.run(now, row.id);
  }

  return topK.map(({ row, score }) => {
    let tags = [];
    try { tags = JSON.parse(row.tags || '[]'); } catch {}
    return {
      id: row.id, type: row.type, content: row.content, summary: row.summary,
      tags, importance: row.importance, source: row.source,
      createdAt: row.created_at, score: Math.round(score * 1000) / 1000,
    };
  });
}

// ── CRUD (for frontend) ──

function getMemories(agentId, { type, importance, limit, offset, activeOnly } = {}) {
  const db = getDB();
  let sql = 'SELECT id, agent_id, type, content, summary, tags, importance, source, access_count, created_at, last_accessed_at FROM agent_memories WHERE agent_id = ?';
  const params = [agentId];
  if (activeOnly) { sql += ' AND consolidated_into IS NULL'; }
  if (type && type !== 'all') { sql += ' AND type = ?'; params.push(type); }
  if (importance && importance !== 'all') { sql += ' AND importance = ?'; params.push(importance); }
  sql += ' ORDER BY created_at DESC';
  if (limit) { sql += ' LIMIT ?'; params.push(limit); }
  if (offset) { sql += ' OFFSET ?'; params.push(offset); }
  return db.prepare(sql).all(...params).map(_formatRow);
}

function getMemory(id) {
  const db = getDB();
  const row = db.prepare('SELECT id, agent_id, type, content, summary, tags, importance, source, access_count, created_at, last_accessed_at FROM agent_memories WHERE id = ?').get(id);
  return row ? _formatRow(row) : null;
}

function updateMemory(id, fields) {
  const db = getDB();
  const allowed = ['content', 'summary', 'tags', 'importance', 'type'];
  const sets = [];
  const params = [];
  for (const k of allowed) {
    if (fields[k] !== undefined) {
      sets.push(`${k} = ?`);
      params.push(k === 'tags' ? JSON.stringify(fields[k]) : fields[k]);
    }
  }
  if (!sets.length) return false;
  params.push(id);
  db.prepare(`UPDATE agent_memories SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  return true;
}

function deleteMemory(id, agentId) {
  const db = getDB();
  let sql = 'DELETE FROM agent_memories WHERE id = ?';
  const params = [id];
  if (agentId) { sql += ' AND agent_id = ?'; params.push(agentId); }
  const info = db.prepare(sql).run(...params);
  return info.changes > 0;
}

function deleteAgentMemories(agentId) {
  const db = getDB();
  const info = db.prepare('DELETE FROM agent_memories WHERE agent_id = ?').run(agentId);
  return info.changes;
}

function getStats(agentId) {
  const db = getDB();
  const total = db.prepare('SELECT COUNT(*) as c FROM agent_memories WHERE agent_id = ?').get(agentId)?.c || 0;
  const byType = db.prepare('SELECT type, COUNT(*) as c FROM agent_memories WHERE agent_id = ? GROUP BY type').all(agentId);
  const byImportance = db.prepare('SELECT importance, COUNT(*) as c FROM agent_memories WHERE agent_id = ? GROUP BY importance').all(agentId);
  return {
    total,
    byType: Object.fromEntries(byType.map(r => [r.type, r.c])),
    byImportance: Object.fromEntries(byImportance.map(r => [r.importance, r.c])),
  };
}

// ── Eviction ──

function evict(agentId) {
  const db = getDB();
  const count = db.prepare('SELECT COUNT(*) as c FROM agent_memories WHERE agent_id = ?').get(agentId)?.c || 0;
  if (count <= MAX_MEMORIES_PER_AGENT) return 0;

  const toEvict = count - MAX_MEMORIES_PER_AGENT + EVICT_BATCH;

  const candidates = db.prepare(`
    SELECT id FROM agent_memories WHERE agent_id = ?
    ORDER BY
      CASE WHEN consolidated_into IS NOT NULL THEN 0 ELSE 1 END,
      CASE importance WHEN 'low' THEN 0 WHEN 'medium' THEN 1 WHEN 'high' THEN 2 ELSE 1 END,
      access_count ASC,
      COALESCE(last_accessed_at, created_at) ASC
    LIMIT ?
  `).all(agentId, toEvict);

  if (!candidates.length) return 0;

  const ids = candidates.map(r => r.id);
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`DELETE FROM agent_memories WHERE id IN (${placeholders})`).run(...ids);
  log.info(`evicted ${ids.length} memories for agent=${agentId} (was ${count})`);
  return ids.length;
}

// ── Helpers ──

function _formatRow(row) {
  let tags = [];
  try { tags = JSON.parse(row.tags || '[]'); } catch {}
  return {
    id: row.id, agentId: row.agent_id, type: row.type,
    content: row.content, summary: row.summary, tags,
    importance: row.importance, source: row.source,
    accessCount: row.access_count, createdAt: row.created_at,
    lastAccessedAt: row.last_accessed_at,
  };
}

module.exports = {
  writeMemory,
  searchMemory,
  getMemories,
  getMemory,
  updateMemory,
  deleteMemory,
  deleteAgentMemories,
  getStats,
  evict,
};
