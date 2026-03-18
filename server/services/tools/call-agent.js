/**
 * M4.1 内置工具：call_agent — Agent 间主动协作
 * 允许一个 Agent 调用另一个 Agent 完成子任务并获取结果
 */

const MAX_CALL_DEPTH = 3;

const schema = {
  description: '调用另一个 Agent 来完成子任务。当你需要其他 Agent 的专业能力来辅助回答时使用。',
  parameters: {
    type: 'object',
    properties: {
      agentId: { type: 'string', description: '目标 Agent 的 ID' },
      task: { type: 'string', description: '要交给目标 Agent 完成的任务描述' },
      context: { type: 'string', description: '可选，传递给目标 Agent 的上下文信息' },
    },
    required: ['agentId', 'task'],
  },
};

async function handler(args, context) {
  const { agentId: targetId, task, context: taskCtx } = args;
  const { channel, agentId: callerId, _callDepth } = context;

  if (!targetId || !task) {
    return { error: '需要提供 agentId 和 task 参数' };
  }

  if (targetId === callerId) {
    return { error: '不能调用自己' };
  }

  const depth = (_callDepth || 0) + 1;
  if (depth >= MAX_CALL_DEPTH) {
    return { error: `已达到最大调用深度限制（${MAX_CALL_DEPTH}层），无法继续嵌套调用` };
  }

  const store = require('../storage');
  store.loadAgents();
  const targetAgent = store.localAgents.find(a => a.id === targetId);
  if (!targetAgent) {
    return { error: `目标 Agent「${targetId}」不存在` };
  }

  const prompt = taskCtx
    ? `[协作任务] 来自 Agent「${callerId}」的请求：\n\n任务：${task}\n\n上下文：${taskCtx}`
    : `[协作任务] 来自 Agent「${callerId}」的请求：\n\n任务：${task}`;

  try {
    const llm = require('../llm');
    const result = await llm.sendToLLM(channel, targetId, prompt, {
      _callDepth: depth,
      _calledBy: callerId,
      _isSubCall: true,
      _skipChain: true,
    });

    if (!result.ok) {
      return { error: result.error || '目标 Agent 调用失败' };
    }

    return {
      ok: true,
      agentId: targetId,
      agentName: targetAgent.name,
      response: result.text || '（空回复）',
    };
  } catch (err) {
    return { error: `调用 Agent「${targetId}」失败: ${err.message}` };
  }
}

const meta = { icon: '🤝', risk: 'medium', category: 'collaboration' };

module.exports = { schema, handler, meta };
