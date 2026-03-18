/**
 * 内置工具：memory_write — 写入 Agent 长期记忆（M2 增强版）
 * 支持重要性、类型分类、Embedding 去重
 */
const memory = require('../memory');
const { createLogger } = require('../../middleware/logger');
const log = createLogger('tool:memory-write');

const schema = {
  description: '保存重要信息到长期记忆。当对话中出现需要跨会话记住的关键事实、用户偏好、重要结论或行为模式时调用此工具。',
  parameters: {
    type: 'object',
    properties: {
      content: { type: 'string', description: '要记忆的内容' },
      tags: { type: 'array', items: { type: 'string' }, description: '分类标签（可选）' },
      importance: { type: 'string', enum: ['low', 'medium', 'high'], description: '重要程度，默认 medium' },
      type: { type: 'string', enum: ['episodic', 'semantic', 'procedural'], description: '记忆类型：semantic(事实/偏好)、episodic(事件/经历)、procedural(技能/模式)，默认 semantic' },
    },
    required: ['content'],
  },
};

async function handler(args, context) {
  const { agentId } = context;
  try {
    const result = await memory.writeMemory(agentId, {
      content: args.content,
      tags: args.tags,
      importance: args.importance,
      type: args.type,
      source: 'agent',
    });
    return result;
  } catch (e) {
    log.error(`memory_write failed: agent=${agentId}`, e.message);
    return { ok: false, error: e.message };
  }
}

const meta = { icon: '🧠', risk: 'low', category: 'memory' };

module.exports = { schema, handler, meta };
