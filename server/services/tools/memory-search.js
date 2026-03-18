/**
 * 内置工具：memory_search — 搜索 Agent 长期记忆（M2）
 * 混合搜索：Vector cosine + 关键词 + 时间衰减 + 重要性加成
 */
const memory = require('../memory');
const { createLogger } = require('../../middleware/logger');
const log = createLogger('tool:memory-search');

const schema = {
  description: '搜索长期记忆，回忆与当前话题相关的历史信息。当需要查找之前记住的事实、用户偏好、过往经验或行为模式时调用此工具。',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: '搜索内容' },
      type: { type: 'string', enum: ['episodic', 'semantic', 'procedural', 'all'], description: '记忆类型筛选，默认 all' },
      limit: { type: 'number', description: '返回条数，默认 5，最大 10' },
    },
    required: ['query'],
  },
};

async function handler(args, context) {
  const { agentId } = context;
  const query = (args.query || '').trim();
  if (!query) return { ok: false, error: '搜索内容不能为空' };

  const limit = Math.min(Math.max(parseInt(args.limit) || 5, 1), 10);
  const type = args.type || 'all';

  try {
    const results = await memory.searchMemory(agentId, query, { type, limit });
    return {
      ok: true,
      total: results.length,
      results: results.map(r => ({
        content: r.content,
        type: r.type,
        tags: r.tags,
        importance: r.importance,
        createdAt: r.createdAt,
        score: r.score,
      })),
    };
  } catch (e) {
    log.error(`memory_search failed: agent=${agentId}`, e.message);
    return { ok: false, error: e.message };
  }
}

const meta = { icon: '🔎', risk: 'low', category: 'memory' };

module.exports = { schema, handler, meta };
