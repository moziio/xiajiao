/**
 * 内置工具：rag_query — 知识库语义检索（M3 增强版）
 * 支持 BM25 混合检索、LLM 重排序、分层分块上下文、元数据过滤
 */
const rag = require('../rag');

const schema = {
  description: '在当前 Agent 的知识库中搜索相关内容。当用户提问需要参考知识库资料时调用此工具。',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: '搜索查询语句' },
      topK: { type: 'number', description: '返回最多 N 条结果（默认 3）' },
      fileFilter: { type: 'string', description: '可选，仅搜索指定文件名的内容' },
    },
    required: ['query'],
  },
};

async function handler(args, context) {
  const { agentId } = context;
  const query = args.query || '';
  const topK = args.topK || undefined;
  const fileFilter = args.fileFilter || undefined;

  if (!query.trim()) {
    return { chunks: [], totalFound: 0, message: '查询不能为空' };
  }

  const results = await rag.search(agentId, query, topK, { fileFilter });

  if (!results || !results.length) {
    return { chunks: [], totalFound: 0, message: '知识库中未找到相关内容' };
  }

  return {
    chunks: results.map(r => ({
      text: r.text,
      source: r.file || 'unknown',
      score: Math.round(r.score * 1000) / 1000,
      matchedChunk: r.matchedChunk || undefined,
    })),
    totalFound: results.length,
  };
}

const meta = { icon: '📚', risk: 'low', category: 'knowledge' };

module.exports = { schema, handler, meta };
