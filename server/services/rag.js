const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cfg = require('../config');
const store = require('./storage');
const database = require('./database');
const { createLogger } = require('../middleware/logger');
const log = createLogger('rag');

const INDEX_FILE = '.rag-index.json';
const SKIP_FILES = new Set(['SOUL.md', 'IDENTITY.md', 'USER.md', 'BOOTSTRAP.md', 'HEARTBEAT.md', 'TOOLS.md', 'AGENTS.md']);
const _indexCache = new Map();
const _INDEX_CACHE_MAX = 50;

function _evictIndexCache() {
  if (_indexCache.size <= _INDEX_CACHE_MAX) return;
  let oldest = null, oldestKey = null;
  for (const [key, val] of _indexCache) {
    if (!oldest || val.mtime < oldest) { oldest = val.mtime; oldestKey = key; }
  }
  if (oldestKey) _indexCache.delete(oldestKey);
}

const TEXT_EXTS = new Set(['.md', '.txt', '.json', '.csv', '.yaml', '.yml', '.xml', '.html', '.css', '.js', '.ts', '.py', '.java', '.go', '.rs', '.sql', '.sh', '.bat', '.log', '.ini', '.cfg', '.toml', '.env']);

const LIMITS = {
  MAX_FILES_PER_AGENT: 50,
  MAX_TEXT_FILE_SIZE: 2 * 1024 * 1024,    // 2 MB
  MAX_PDF_FILE_SIZE: 5 * 1024 * 1024,     // 5 MB
  MAX_CHUNKS_PER_AGENT: 5000,
  MAX_CONTEXT_CHARS: 2000,
  PDF_MIN_TEXT_LENGTH: 50,
  PDF_GARBLE_THRESHOLD: 0.3,
};

const UNSUPPORTED_EXTS = {
  '.docx': 'Office', '.doc': 'Office', '.xlsx': 'Office', '.xls': 'Office',
  '.pptx': 'Office', '.ppt': 'Office',
  '.png': 'image', '.jpg': 'image', '.jpeg': 'image', '.gif': 'image',
  '.bmp': 'image', '.svg': 'image', '.webp': 'image',
};

function getRAGConfig() {
  const defaults = {
    enabled: false,
    topK: 3, chunkSize: 500, chunkOverlap: 50,
    parentChunkSize: 800, childChunkSize: 200,
    enableReranking: false,
  };
  try {
    const s = JSON.parse(fs.readFileSync(cfg.SETTINGS_FILE, 'utf8'));
    return { ...defaults, ...s.rag };
  } catch { return defaults; }
}

function _getEmbeddingModelId() {
  const routing = store.getCapabilityRouting();
  return routing.embedding || null;
}

function resolveWorkspace(agentId) {
  store.loadAgents();
  const agent = store.localAgents.find(a => a.id === agentId);
  if (!agent) return null;
  return agent.workspace || path.join(cfg.DATA_DIR, `workspace-${agentId}`);
}

function loadIndex(wsDir) {
  const cached = _indexCache.get(wsDir);
  if (cached) {
    try {
      const stat = fs.statSync(path.join(wsDir, INDEX_FILE));
      if (stat.mtimeMs <= cached.mtime) return cached.data;
    } catch {
      return cached.data;
    }
  }
  try {
    const filePath = path.join(wsDir, INDEX_FILE);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const stat = fs.statSync(filePath);
    _indexCache.set(wsDir, { data, mtime: stat.mtimeMs });
    _evictIndexCache();
    return data;
  } catch {
    const data = { version: 2, model: '', dimension: 0, updatedAt: 0, files: {}, chunks: [] };
    _indexCache.set(wsDir, { data, mtime: 0 });
    _evictIndexCache();
    return data;
  }
}

function saveIndex(wsDir, index) {
  index.updatedAt = Date.now();
  fs.writeFileSync(path.join(wsDir, INDEX_FILE), JSON.stringify(index));
  try {
    const stat = fs.statSync(path.join(wsDir, INDEX_FILE));
    _indexCache.set(wsDir, { data: index, mtime: stat.mtimeMs });
    _evictIndexCache();
  } catch {}
}

function fileHash(filepath) {
  const content = fs.readFileSync(filepath);
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function shouldIndex(filename) {
  if (filename.startsWith('.')) return { ok: false, reason: 'hidden' };
  if (SKIP_FILES.has(filename)) return { ok: false, reason: 'system' };
  const ext = path.extname(filename).toLowerCase();
  if (TEXT_EXTS.has(ext)) return { ok: true };
  if (ext === '.pdf') return { ok: true, isPdf: true };
  if (UNSUPPORTED_EXTS[ext]) {
    const kind = UNSUPPORTED_EXTS[ext];
    if (kind === 'Office') return { ok: false, reason: 'unsupported_office' };
    if (kind === 'image') return { ok: false, reason: 'unsupported_image' };
    return { ok: false, reason: 'unsupported' };
  }
  return { ok: false, reason: 'unknown_type' };
}

function canIndex(filename) {
  const r = shouldIndex(filename);
  return r.ok === true;
}

// ── Text Extraction ──

async function extractText(filepath) {
  const ext = path.extname(filepath).toLowerCase();
  if (ext === '.pdf') {
    const result = await extractPdfText(filepath);
    if (result.quality === 'scan') {
      throw new Error('PDF_SCAN: 该 PDF 可能是扫描件或图片型文档，暂不支持');
    }
    if (result.quality === 'garbled') {
      log.warn(`PDF garble rate ${result.garbleRate}% for ${filepath}`);
    }
    if (result.quality === 'error') {
      throw new Error('PDF_ERROR: PDF 解析失败 — ' + result.reason);
    }
    return result.text;
  }
  return fs.readFileSync(filepath, 'utf8');
}

async function extractPdfText(filepath) {
  try {
    const pdfParse = require('pdf-parse');
    const buf = fs.readFileSync(filepath);
    const data = await pdfParse(buf);
    const text = (data.text || '').trim();

    if (text.length < LIMITS.PDF_MIN_TEXT_LENGTH) {
      return { text: '', quality: 'scan', reason: 'scan_or_empty' };
    }

    const cjkOrAscii = text.replace(/[\x00-\x7F\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\u3400-\u4dbf\u{20000}-\u{2a6df}]/gu, '');
    const garbleRate = cjkOrAscii.length / text.length;
    if (garbleRate > LIMITS.PDF_GARBLE_THRESHOLD) {
      return { text, quality: 'garbled', reason: 'high_garble_rate', garbleRate: Math.round(garbleRate * 100) };
    }

    return { text, quality: 'ok' };
  } catch (err) {
    log.error(`pdf extract failed for ${filepath}:`, err.message);
    return { text: '', quality: 'error', reason: err.message };
  }
}

// ── Chunking ──

function chunkText(text, opts = {}) {
  const maxLen = Math.max(opts.chunkSize || 500, 50);
  const overlap = Math.min(opts.chunkOverlap || 50, Math.floor(maxLen * 0.4));
  if (!text || !text.trim()) return [];

  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
  const rawChunks = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (trimmed.length <= maxLen) {
      rawChunks.push(trimmed);
    } else {
      const sentences = trimmed.split(/(?<=[.!?。！？\n])\s*/);
      let buf = '';
      for (const s of sentences) {
        if (s.length > maxLen) {
          if (buf.trim()) { rawChunks.push(buf.trim()); buf = ''; }
          for (let j = 0; j < s.length; j += maxLen - overlap) {
            rawChunks.push(s.slice(j, j + maxLen).trim());
          }
          continue;
        }
        if (buf && (buf.length + s.length) > maxLen) {
          rawChunks.push(buf.trim());
          buf = buf.length > overlap ? buf.slice(-overlap) : '';
        }
        buf += (buf ? ' ' : '') + s;
      }
      if (buf.trim()) rawChunks.push(buf.trim());
    }
  }

  const chunks = [];
  let offset = 0;
  for (const c of rawChunks) {
    if (c.length < 10) { offset += c.length; continue; }
    const start = text.indexOf(c, offset);
    chunks.push({ text: c, start: start >= 0 ? start : offset, end: (start >= 0 ? start : offset) + c.length });
    if (start >= 0) offset = start + c.length;
  }
  return chunks;
}

/**
 * M3.3 分层分块：生成 parent（大块，用于上下文返回）+ child（小块，用于精确搜索匹配）
 */
function chunkTextHierarchical(text, opts = {}) {
  const parentSize = opts.parentChunkSize || 800;
  const childSize = opts.childChunkSize || 200;
  const parentOverlap = Math.min(50, Math.floor(parentSize * 0.1));
  const childOverlap = Math.min(30, Math.floor(childSize * 0.2));

  if (!text || !text.trim()) return { parents: [], children: [] };

  const parentRaw = chunkText(text, { chunkSize: parentSize, chunkOverlap: parentOverlap });
  const ts = Date.now();
  const parents = [];
  const children = [];

  for (let pi = 0; pi < parentRaw.length; pi++) {
    const pChunk = parentRaw[pi];
    const parentId = `p-${ts}-${pi}`;

    parents.push({
      id: parentId,
      text: pChunk.text,
      start: pChunk.start,
      end: pChunk.end,
      type: 'parent',
    });

    const childRaw = chunkText(pChunk.text, { chunkSize: childSize, chunkOverlap: childOverlap });

    for (let ci = 0; ci < childRaw.length; ci++) {
      children.push({
        id: `c-${ts}-${pi}-${ci}`,
        text: childRaw[ci].text,
        start: pChunk.start + childRaw[ci].start,
        end: pChunk.start + childRaw[ci].end,
        type: 'child',
        parentId,
      });
    }
  }

  return { parents, children };
}

// ── Embedding API ──

function getEmbeddingProvider() {
  store.loadModels();

  // 从能力路由获取 embedding 配置
  const routing = store.getCapabilityRouting();
  const routedModelId = routing.embedding;
  if (!routedModelId) {
    return null; // 未配置向量化模型
  }

  const routedModel = (store.localModels.models || []).find(m => m.id === routedModelId);
  if (!routedModel) {
    return null; // 配置的模型不存在
  }

  const prov = (store.localModels.providers || {})[routedModel.provider];
  if (!prov || !prov.baseUrl || !prov.apiKey) {
    return null; // Provider 配置不完整
  }

  let baseUrl = prov.baseUrl;
  // DashScope 编码助手地址需要切换到兼容模式
  if (/coding\.dashscope/i.test(baseUrl)) {
    baseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  }

  return {
    baseUrl,
    apiKey: prov.apiKey,
    model: routedModel.name || routedModelId.split('/').pop()
  };
}

const _embCache = new Map();
const _EMB_CACHE_TTL = 10000;

async function getEmbeddings(texts) {
  const prov = getEmbeddingProvider();
  if (!prov) throw new Error('No embedding provider configured');

  if (texts.length === 1) {
    const key = texts[0];
    const cached = _embCache.get(key);
    if (cached && Date.now() - cached.ts < _EMB_CACHE_TTL) return [cached.vec];
  }

  const baseUrl = prov.baseUrl.replace(/\/+$/, '');
  const batchSize = 25;
  const allVectors = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const resp = await fetch(`${baseUrl}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${prov.apiKey}` },
      body: JSON.stringify({ model: prov.model, input: batch, dimensions: 1024 }),
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      if (resp.status === 401) {
        throw new Error('Embedding API Key 无效。请在「模型」→「能力路由」中确认向量化模型的 Provider 配置了正确的 API Key');
      }
      throw new Error(`Embedding API ${resp.status}: ${errText.slice(0, 200)}`);
    }
    const data = await resp.json();
    const vectors = (data.data || []).sort((a, b) => a.index - b.index).map(d => d.embedding);
    allVectors.push(...vectors);
  }

  if (texts.length === 1 && allVectors.length === 1) {
    _embCache.set(texts[0], { vec: allVectors[0], ts: Date.now() });
    if (_embCache.size > 200) {
      const oldest = _embCache.keys().next().value;
      _embCache.delete(oldest);
    }
  }

  return allVectors;
}

// ── Cosine Similarity ──

function cosineSimilarity(a, b) {
  if (!a || !b || !a.length || !b.length) return 0;
  const len = Math.min(a.length, b.length);
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ── FTS5 BM25 Support (M3.1) ──

function _sanitizeFTSQuery(query) {
  const cleaned = query
    .replace(/["'`(){}[\]*:^~!@#$%&+=|\\/<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  const terms = cleaned.split(/\s+/).filter(t => t.length >= 1);
  if (!terms.length) return '';
  return terms.map(t => `"${t}"`).join(' OR ');
}

function _syncChunksToFTS(agentId, fileName, childChunks) {
  try {
    const db = database.getDB();
    if (!db) return;
    db.exec('BEGIN');
    try {
      db.prepare('DELETE FROM rag_chunks_fts WHERE agent_id = ? AND file_name = ?').run(agentId, fileName);
      const insert = db.prepare('INSERT INTO rag_chunks_fts (agent_id, chunk_id, file_name, text) VALUES (?, ?, ?, ?)');
      for (const c of childChunks) {
        insert.run(agentId, c.id, fileName, c.text);
      }
      db.exec('COMMIT');
    } catch (innerErr) {
      try { db.exec('ROLLBACK'); } catch {}
      throw innerErr;
    }
  } catch (err) {
    log.warn('FTS sync failed:', err.message);
  }
}

function _clearFileFTS(agentId, fileName) {
  try {
    const db = database.getDB();
    if (!db) return;
    db.prepare('DELETE FROM rag_chunks_fts WHERE agent_id = ? AND file_name = ?').run(agentId, fileName);
  } catch (err) {
    log.warn('FTS clear file failed:', err.message);
  }
}

function _clearAgentFTS(agentId) {
  try {
    const db = database.getDB();
    if (!db) return;
    db.prepare('DELETE FROM rag_chunks_fts WHERE agent_id = ?').run(agentId);
  } catch (err) {
    log.warn('FTS clear agent failed:', err.message);
  }
}

function _searchBM25(agentId, query, limit, fileFilter) {
  try {
    const db = database.getDB();
    if (!db) return [];
    const ftsQuery = _sanitizeFTSQuery(query);
    if (!ftsQuery) return [];

    let sql = 'SELECT chunk_id, file_name, text, bm25(rag_chunks_fts) AS bm25_score FROM rag_chunks_fts WHERE agent_id = ? AND text MATCH ?';
    const params = [agentId, ftsQuery];
    if (fileFilter) {
      sql += ' AND file_name = ?';
      params.push(fileFilter);
    }
    sql += ' ORDER BY bm25_score LIMIT ?';
    params.push(limit);

    return db.prepare(sql).all(...params);
  } catch (err) {
    log.warn('BM25 search failed:', err.message);
    return [];
  }
}

// ── RRF Fusion (M3.1) ──

function _rrfFusion(embResults, bm25Results, index, k = 60) {
  const scores = new Map();
  const chunkData = new Map();

  for (const r of embResults) {
    chunkData.set(r.id, r);
  }

  embResults.forEach((r, rank) => {
    scores.set(r.id, (scores.get(r.id) || 0) + 1 / (k + rank + 1));
  });

  bm25Results.forEach((r, rank) => {
    const cid = r.chunk_id;
    scores.set(cid, (scores.get(cid) || 0) + 1 / (k + rank + 1));
    if (!chunkData.has(cid)) {
      const chunk = index.chunks.find(c => c.id === cid);
      if (chunk) chunkData.set(cid, chunk);
    }
  });

  return [...scores.entries()]
    .map(([id, score]) => {
      const c = chunkData.get(id);
      if (!c) return null;
      return { id, file: c.file, text: c.text, score, parentId: c.parentId };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}

// ── LLM Reranking (M3.2) ──

async function _rerankWithLLM(query, candidates) {
  try {
    store.loadModels();
    const modelId = (store.imSettings && store.imSettings.defaultModel) || store.getFirstAvailableModel();
    if (!modelId) { log.warn('reranking: no model available'); return candidates; }

    const model = (store.localModels.models || []).find(m => m.id === modelId);
    if (!model) { log.warn('reranking: model not found'); return candidates; }
    const provider = (store.localModels.providers || {})[model.provider];
    if (!provider || !provider.apiKey) { log.warn('reranking: provider not found'); return candidates; }

    const chunksText = candidates.map((c, i) => `[${i + 1}] ${c.text.slice(0, 200)}`).join('\n');

    const prompt = `你是文档相关性评估器。给定查询和若干文档片段，为每个片段评估与查询的相关性（0-10分）。

查询：${query}

文档片段：
${chunksText}

请只返回一个JSON数组，包含每个片段的整数得分，例如 [8, 3, 7]。不要输出其他内容。`;

    const baseUrl = (provider.baseUrl || '').replace(/\/+$/, '');
    const rerankAbort = AbortSignal.timeout(10000);
    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${provider.apiKey}` },
      body: JSON.stringify({
        model: model.id.split('/').pop(),
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 200,
      }),
      signal: rerankAbort,
    });

    if (!resp.ok) { log.warn(`reranking LLM ${resp.status}`); return candidates; }

    const data = await resp.json();
    const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    const match = text.match(/\[[\d\s,\.]+\]/);
    if (!match) { log.warn('reranking: parse failed'); return candidates; }

    const rawScores = JSON.parse(match[0]);
    if (!Array.isArray(rawScores) || rawScores.length !== candidates.length) {
      log.warn('reranking: score count mismatch');
      return candidates;
    }

    return candidates
      .map((c, i) => ({ ...c, score: c.score + (rawScores[i] || 0) / 10 }))
      .sort((a, b) => b.score - a.score);
  } catch (err) {
    log.warn('reranking failed:', err.message);
    return candidates;
  }
}

// ── Indexing Progress Tracking ──

const _indexingProgress = new Map();

function getIndexingProgress(agentId) {
  return _indexingProgress.get(agentId) || null;
}

// ── Index Operations ──

async function indexFile(agentId, filename) {
  const ragCfg = getRAGConfig();
  if (!ragCfg.enabled) return { ok: false, reason: 'RAG disabled' };

  const check = shouldIndex(filename);
  if (!check.ok) {
    if (check.reason === 'unsupported_office') return { ok: false, reason: '暂不支持 Office 文档，后续版本将支持' };
    if (check.reason === 'unsupported_image') return { ok: false, reason: '暂不支持图片 OCR，后续版本将支持' };
    return { ok: false, reason: 'file type excluded' };
  }

  const embeddingModelId = _getEmbeddingModelId();
  if (!embeddingModelId) return { ok: false, reason: '未配置向量化模型，请在「模型」→「能力路由」中配置 Embedding 模型' };

  const wsDir = resolveWorkspace(agentId);
  if (!wsDir) return { ok: false, reason: 'agent not found' };

  const filepath = path.join(wsDir, filename);
  if (!fs.existsSync(filepath)) return { ok: false, reason: 'file not found' };

  const stat = fs.statSync(filepath);
  const ext = path.extname(filename).toLowerCase();
  const maxSize = ext === '.pdf' ? LIMITS.MAX_PDF_FILE_SIZE : LIMITS.MAX_TEXT_FILE_SIZE;
  if (stat.size > maxSize) {
    const limitMB = (maxSize / 1024 / 1024).toFixed(0);
    return { ok: false, reason: `文件过大（${(stat.size / 1024 / 1024).toFixed(1)}MB），${ext === '.pdf' ? 'PDF' : '文本'}文件最大 ${limitMB}MB` };
  }

  const hash = fileHash(filepath);
  const index = loadIndex(wsDir);

  if (index.files[filename]?.hash === hash) {
    log.info(`skip ${agentId}/${filename} — unchanged`);
    return { ok: true, skipped: true };
  }

  log.info(`indexing ${agentId}/${filename} ...`);
  try {
    const text = await extractText(filepath);
    if (!text || !text.trim()) {
      removeFileFromIndex(index, filename);
      _clearFileFTS(agentId, filename);
      saveIndex(wsDir, index);
      return { ok: true, empty: true };
    }

    const { parents, children } = chunkTextHierarchical(text, ragCfg);

    if (!children.length) {
      removeFileFromIndex(index, filename);
      _clearFileFTS(agentId, filename);
      saveIndex(wsDir, index);
      return { ok: true, empty: true };
    }

    const childTexts = children.map(c => c.text);
    const vectors = await getEmbeddings(childTexts);

    if (vectors.length !== childTexts.length) {
      log.warn(`embedding count mismatch: expected ${childTexts.length}, got ${vectors.length}`);
    }

    removeFileFromIndex(index, filename);

    const indexedAt = Date.now();
    const meta = { fileName: filename, fileType: ext, indexedAt };

    const newParents = parents.map(p => ({ ...p, file: filename, meta }));

    const newChildren = [];
    for (let i = 0; i < children.length; i++) {
      if (!vectors[i] || !Array.isArray(vectors[i])) continue;
      newChildren.push({ ...children[i], file: filename, vector: vectors[i], meta });
    }

    if (newChildren.length === 0) {
      saveIndex(wsDir, index);
      log.warn(`no valid embeddings for ${agentId}/${filename}, will retry next time`);
      return { ok: false, error: 'no valid embeddings' };
    }

    const existingChildCount = index.chunks.filter(c => c.type !== 'parent').length;
    if (existingChildCount + newChildren.length > LIMITS.MAX_CHUNKS_PER_AGENT) {
      saveIndex(wsDir, index);
      return { ok: false, reason: `Chunk 数量将超限（已有 ${existingChildCount}，新增 ${newChildren.length}，上限 ${LIMITS.MAX_CHUNKS_PER_AGENT}）` };
    }

    index.chunks.push(...newParents, ...newChildren);
    index.files[filename] = { hash, chunkCount: newChildren.length, parentCount: newParents.length };
    index.model = _getEmbeddingModelId();
    index.dimension = 1024;
    index.version = 2;
    saveIndex(wsDir, index);

    _syncChunksToFTS(agentId, filename, newChildren);

    log.info(`indexed ${agentId}/${filename}: ${newParents.length} parents + ${newChildren.length} children`);
    return { ok: true, chunks: newChildren.length, parents: newParents.length };
  } catch (err) {
    log.error(`indexing failed ${agentId}/${filename}:`, err.message);
    return { ok: false, error: err.message };
  }
}

async function indexAgent(agentId) {
  const ragCfg = getRAGConfig();
  if (!ragCfg.enabled) return { ok: false, reason: 'RAG disabled' };

  const embeddingModelId = _getEmbeddingModelId();
  if (!embeddingModelId) return { ok: false, reason: '未配置向量化模型，请在「模型」→「能力路由」中配置 Embedding 模型' };

  const wsDir = resolveWorkspace(agentId);
  if (!wsDir || !fs.existsSync(wsDir)) return { ok: false, reason: 'workspace not found' };

  if (_indexingProgress.has(agentId)) return { ok: false, reason: 'already indexing' };

  const entries = fs.readdirSync(wsDir, { withFileTypes: true });
  const files = entries.filter(e => e.isFile() && canIndex(e.name)).map(e => e.name);

  if (files.length === 0) return { ok: true, files: 0, chunks: 0, reason: 'no indexable files' };

  if (files.length > LIMITS.MAX_FILES_PER_AGENT) {
    return { ok: false, reason: `文件数量超限：${files.length} 个（最多 ${LIMITS.MAX_FILES_PER_AGENT} 个）` };
  }

  const progress = {
    status: 'indexing',
    totalFiles: files.length,
    doneFiles: 0,
    currentFile: '',
    totalChunks: 0,
    errors: [],
    startedAt: Date.now(),
  };
  _indexingProgress.set(agentId, progress);

  _clearAgentFTS(agentId);

  log.info(`reindexing agent=${agentId}, ${files.length} files`);
  const index = { version: 2, model: _getEmbeddingModelId(), dimension: 1024, updatedAt: 0, files: {}, chunks: [] };
  saveIndex(wsDir, index);

  for (const f of files) {
    progress.currentFile = f;
    try {
      const r = await indexFile(agentId, f);
      if (r.ok && r.chunks) progress.totalChunks += r.chunks;
      else if (!r.ok) progress.errors.push({ file: f, error: r.reason || r.error || 'unknown' });
    } catch (e) {
      progress.errors.push({ file: f, error: e.message });
    }
    progress.doneFiles++;
  }

  progress.status = 'done';
  progress.currentFile = '';
  log.info(`reindex done agent=${agentId}: ${progress.totalChunks} total chunks, ${progress.errors.length} errors`);

  const result = { ok: true, files: files.length, chunks: progress.totalChunks, errors: progress.errors };
  setTimeout(() => _indexingProgress.delete(agentId), 30000);
  return result;
}

function removeFile(agentId, filename) {
  const wsDir = resolveWorkspace(agentId);
  if (!wsDir) return { ok: false };
  if (!fs.existsSync(wsDir)) return { ok: true };
  const index = loadIndex(wsDir);
  if (!index.files[filename]) return { ok: true };
  removeFileFromIndex(index, filename);
  _clearFileFTS(agentId, filename);
  saveIndex(wsDir, index);
  log.info(`removed ${agentId}/${filename} from index`);
  return { ok: true };
}

function removeFileFromIndex(index, filename) {
  index.chunks = index.chunks.filter(c => c.file !== filename);
  delete index.files[filename];
}

// ── Search (M3.1 RRF + M3.2 Rerank + M3.3 Parent Retrieval + M3.4 Filter) ──

async function search(agentId, query, topK, options) {
  const ragCfg = getRAGConfig();
  if (!ragCfg.enabled) return [];
  if (!query || !query.trim()) return [];

  const wsDir = resolveWorkspace(agentId);
  if (!wsDir) return [];

  const index = loadIndex(wsDir);
  if (!index.chunks.length) return [];

  const currentEmbeddingModel = _getEmbeddingModelId();
  if (!currentEmbeddingModel) {
    log.warn(`search skipped: no embedding model configured`);
    return [];
  }
  if (index.model && index.model !== currentEmbeddingModel) {
    log.warn(`model mismatch: index=${index.model}, config=${currentEmbeddingModel}. Please reindex.`);
    return [];
  }

  topK = topK || ragCfg.topK || 3;
  const opts = options || {};
  const fileFilter = opts.fileFilter || null;
  const isV2 = index.version >= 2;

  try {
    const searchableChunks = index.chunks.filter(c => {
      if (isV2 && c.type === 'parent') return false;
      if (!c.vector || !Array.isArray(c.vector)) return false;
      if (fileFilter && c.file !== fileFilter) return false;
      return true;
    });

    const [queryVector] = await getEmbeddings([query]);
    if (!queryVector) return [];

    const embScored = searchableChunks
      .map(c => ({ id: c.id, file: c.file, text: c.text, parentId: c.parentId, embScore: cosineSimilarity(queryVector, c.vector) }))
      .filter(c => c.embScore > 0.15)
      .sort((a, b) => b.embScore - a.embScore);

    let bm25Results = [];
    if (isV2) {
      bm25Results = _searchBM25(agentId, query, topK * 4, fileFilter);
    }

    let candidates;
    if (bm25Results.length > 0) {
      candidates = _rrfFusion(embScored, bm25Results, index, 60);
    } else {
      candidates = embScored.slice(0, topK * 4).map(c => ({
        id: c.id, file: c.file, text: c.text, score: c.embScore, parentId: c.parentId,
      }));
    }

    if (ragCfg.enableReranking && candidates.length > 1) {
      const rerankBatch = candidates.slice(0, 20);
      const reranked = await _rerankWithLLM(query, rerankBatch);
      candidates = [...reranked, ...candidates.slice(20)];
    }

    let results;
    if (isV2) {
      const parentMap = new Map();
      for (const c of index.chunks) {
        if (c.type === 'parent') parentMap.set(c.id, c);
      }

      const seen = new Set();
      results = [];
      for (const c of candidates) {
        if (c.parentId && parentMap.has(c.parentId)) {
          if (seen.has(c.parentId)) continue;
          seen.add(c.parentId);
          const parent = parentMap.get(c.parentId);
          results.push({ file: parent.file, text: parent.text, score: c.score, matchedChunk: c.text });
        } else {
          if (seen.has(c.id)) continue;
          seen.add(c.id);
          results.push({ file: c.file, text: c.text, score: c.score });
        }
        if (results.length >= topK) break;
      }
    } else {
      results = candidates.slice(0, topK).filter(s => s.score > 0.3);
    }

    let totalChars = 0;
    const truncated = [];
    for (const r of results) {
      if (totalChars >= LIMITS.MAX_CONTEXT_CHARS) {
        r.truncated = true;
        break;
      }
      const remaining = LIMITS.MAX_CONTEXT_CHARS - totalChars;
      if (r.text.length > remaining) {
        r.text = r.text.slice(0, remaining) + '…';
        r.truncated = true;
      }
      totalChars += r.text.length;
      truncated.push(r);
    }
    return truncated;
  } catch (err) {
    log.error(`search failed for agent=${agentId}:`, err.message);
    return [];
  }
}

// ── Status ──

function getIndexStatus(agentId) {
  const wsDir = resolveWorkspace(agentId);
  if (!wsDir) return { indexed: false, files: 0, chunks: 0 };

  const index = loadIndex(wsDir);
  const fileCount = Object.keys(index.files).length;
  const chunkCount = index.chunks.filter(c => c.type !== 'parent').length || index.chunks.length;

  let filesDetail = {};
  if (fs.existsSync(wsDir)) {
    const entries = fs.readdirSync(wsDir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isFile() || !canIndex(e.name)) continue;
      const info = index.files[e.name];
      if (info) {
        const currentHash = fileHash(path.join(wsDir, e.name));
        filesDetail[e.name] = { indexed: true, chunks: info.chunkCount, stale: currentHash !== info.hash };
      } else {
        filesDetail[e.name] = { indexed: false, chunks: 0, stale: false };
      }
    }
  }

  const ragCfg = getRAGConfig();
  const progress = getIndexingProgress(agentId);
  const embeddingConfigured = !!_getEmbeddingModelId();
  return {
    enabled: ragCfg.enabled,
    files: fileCount,
    chunks: chunkCount,
    updatedAt: index.updatedAt,
    detail: filesDetail,
    modelMismatch: !!(index.model && _getEmbeddingModelId() && index.model !== _getEmbeddingModelId()),
    version: index.version || 1,
    enableReranking: !!ragCfg.enableReranking,
    embeddingConfigured,
    limits: {
      maxFiles: LIMITS.MAX_FILES_PER_AGENT,
      maxTextSize: LIMITS.MAX_TEXT_FILE_SIZE,
      maxPdfSize: LIMITS.MAX_PDF_FILE_SIZE,
      maxChunks: LIMITS.MAX_CHUNKS_PER_AGENT,
    },
    indexing: progress ? {
      status: progress.status,
      totalFiles: progress.totalFiles,
      doneFiles: progress.doneFiles,
      currentFile: progress.currentFile,
      totalChunks: progress.totalChunks,
      errors: progress.errors,
    } : null,
  };
}

async function testEmbedding() {
  return getEmbeddings(['hello embedding test']);
}

function clearAgentIndex(agentId) {
  _clearAgentFTS(agentId);
}

module.exports = { indexFile, indexAgent, removeFile, search, getIndexStatus, getRAGConfig, testEmbedding, getEmbeddings, cosineSimilarity, clearAgentIndex, shouldIndex, canIndex, LIMITS };
