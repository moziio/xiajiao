/**
 * M1.3 — Direct LLM Tool Calling 引擎
 * 工具调用循环：检测 tool_calls → 执行 → 结果注入 → 再次调用 LLM
 */
const { createLogger } = require('../middleware/logger');
const log = createLogger('tool-engine');
const registry = require('./tool-registry');
const { emitToolEvent, makeCallId } = require('./tool-events');

const MAX_ROUNDS = 10;
const LOOP_DETECT_THRESHOLD = 3;

/**
 * 从 LLM 响应中提取 tool_calls（多厂商兼容）
 */
function extractToolCalls(data, apiType) {
  if (apiType === 'anthropic-messages') {
    if (!Array.isArray(data.content)) return null;
    const calls = data.content.filter(b => b.type === 'tool_use');
    if (!calls.length) return null;
    return calls.map(c => ({ id: c.id, name: c.name, args: c.input || {} }));
  }

  // OpenAI / OpenAI-compatible
  const choice = data.choices?.[0];
  if (!choice) return null;
  if (choice.finish_reason === 'tool_calls' || choice.finish_reason === 'function_call') {
    const tcs = choice.message?.tool_calls;
    if (tcs?.length) {
      return tcs.map(tc => ({
        id: tc.id,
        name: tc.function?.name,
        args: safeParse(tc.function?.arguments),
      }));
    }
  }
  if (choice.message?.tool_calls?.length) {
    return choice.message.tool_calls.map(tc => ({
      id: tc.id,
      name: tc.function?.name,
      args: safeParse(tc.function?.arguments),
    }));
  }
  return null;
}

/**
 * 从 SSE 流中累积 tool_calls（OpenAI 格式 delta 拼接）
 */
function createStreamToolAccumulator() {
  const pending = {};
  let hasToolCalls = false;

  return {
    feedDelta(delta) {
      const tcs = delta.tool_calls;
      if (!tcs?.length) return;
      hasToolCalls = true;
      for (const tc of tcs) {
        const idx = tc.index ?? Object.keys(pending).length;
        if (!pending[idx]) pending[idx] = { id: '', name: '', args: '' };
        if (tc.id) pending[idx].id = tc.id;
        if (tc.function?.name) pending[idx].name += tc.function.name;
        if (tc.function?.arguments) pending[idx].args += tc.function.arguments;
      }
    },
    feedAnthropicEvent(parsed) {
      if (parsed.type === 'content_block_start' && parsed.content_block?.type === 'tool_use') {
        const idx = parsed.index ?? Object.keys(pending).length;
        pending[idx] = { id: parsed.content_block.id, name: parsed.content_block.name, args: '' };
        hasToolCalls = true;
      }
      if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'input_json_delta') {
        const idx = parsed.index ?? (Object.keys(pending).length - 1);
        if (pending[idx]) pending[idx].args += parsed.delta.partial_json || '';
      }
    },
    hasToolCalls() { return hasToolCalls; },
    getToolCalls() {
      return Object.values(pending).filter(tc => tc.name).map(tc => ({
        id: tc.id || makeCallId(),
        name: tc.name,
        args: safeParse(tc.args),
      }));
    },
  };
}

/**
 * 执行工具调用并通过事件协议推送状态
 */
async function executeToolCalls(toolCalls, context) {
  const { channel, agentId, runId } = context;

  const tasks = toolCalls.map(async (tc) => {
    const callId = tc.id || makeCallId();
    const handler = registry.getHandler(tc.name);

    emitToolEvent({ type: 'tool_call_start', channel, agentId, runId, callId, tool: tc.name, args: tc.args });
    const startTime = Date.now();

    if (!handler) {
      const err = `Unknown tool: ${tc.name}`;
      emitToolEvent({ type: 'tool_call_end', channel, agentId, runId, callId, tool: tc.name, error: err, durationMs: Date.now() - startTime });
      return { callId, toolCallId: tc.id, name: tc.name, result: null, error: err };
    }

    try {
      const result = await handler(tc.args, context);
      const durationMs = Date.now() - startTime;
      emitToolEvent({ type: 'tool_call_end', channel, agentId, runId, callId, tool: tc.name, result, durationMs });
      return { callId, toolCallId: tc.id, name: tc.name, result, error: null };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errMsg = err.message || String(err);
      emitToolEvent({ type: 'tool_call_end', channel, agentId, runId, callId, tool: tc.name, error: errMsg, durationMs });
      return { callId, toolCallId: tc.id, name: tc.name, result: null, error: errMsg };
    }
  });

  const settled = await Promise.all(tasks);
  return settled;
}

/**
 * 检测循环调用（同工具+同参数 连续调用 N 次）
 */
function detectLoop(history) {
  if (history.length < LOOP_DETECT_THRESHOLD) return false;
  const last = history[history.length - 1];
  let count = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].name === last.name && history[i].argsKey === last.argsKey) count++;
    else break;
  }
  return count >= LOOP_DETECT_THRESHOLD;
}

/**
 * 将工具结果注入 messages 数组（OpenAI 格式）
 */
function injectToolResultsOpenAI(messages, toolCalls, results) {
  messages.push({
    role: 'assistant',
    content: null,
    tool_calls: toolCalls.map(tc => ({
      id: tc.id,
      type: 'function',
      function: { name: tc.name, arguments: typeof tc.args === 'string' ? tc.args : JSON.stringify(tc.args) },
    })),
  });

  for (const r of results) {
    messages.push({
      role: 'tool',
      tool_call_id: r.toolCallId,
      content: r.error ? JSON.stringify({ error: r.error }) : JSON.stringify(r.result || {}),
    });
  }
}

/**
 * 将工具结果注入 messages 数组（Anthropic 格式）
 */
function injectToolResultsAnthropic(messages, toolCalls, results) {
  messages.push({
    role: 'assistant',
    content: toolCalls.map(tc => ({
      type: 'tool_use',
      id: tc.id,
      name: tc.name,
      input: tc.args || {},
    })),
  });

  messages.push({
    role: 'user',
    content: results.map(r => ({
      type: 'tool_result',
      tool_use_id: r.toolCallId,
      content: r.error ? JSON.stringify({ error: r.error }) : JSON.stringify(r.result || {}),
      is_error: !!r.error,
    })),
  });
}

function safeParse(s) {
  if (s !== null && typeof s === 'object') return s;
  try { return JSON.parse(s || '{}'); } catch { return {}; }
}

function argsKey(args) {
  try { return JSON.stringify(args); } catch { return ''; }
}

module.exports = {
  extractToolCalls,
  createStreamToolAccumulator,
  executeToolCalls,
  detectLoop,
  injectToolResultsOpenAI,
  injectToolResultsAnthropic,
  safeParse,
  argsKey,
  MAX_ROUNDS,
};
