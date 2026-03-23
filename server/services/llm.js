const fs = require('fs');
const path = require('path');
const cfg = require('../config');
const store = require('./storage');
const imageGen = require('./image-gen');
const rag = require('./rag');
const memory = require('./memory');
const registry = require('./tool-registry');
const toolEngine = require('./tool-engine');
const collabFlow = require('./collab-flow');
const { createLogger } = require('../middleware/logger');
const log = createLogger('llm');

const activeRuns = new Map();
let broadcastFn = () => {};
let emitCommunityEventFn = () => {};

function setBroadcast(fn) { broadcastFn = fn; }
function setEmitCommunityEvent(fn) { emitCommunityEventFn = fn; }

function resolveAgent(agentId) {
  store.loadAgents();
  const agent = store.localAgents.find(a => a.id === agentId);
  if (!agent) return null;

  store.loadModels();
  const allModels = store.localModels.models || [];
  const providers = store.localModels.providers || {};

  const tryResolve = (mid) => {
    if (!mid) return null;
    const m = allModels.find(x => x.id === mid);
    if (!m) return null;
    const p = providers[m.provider];
    return p ? { model: m, provider: p } : null;
  };

  let resolved = tryResolve(agent.model);
  if (!resolved && agent.model) {
    log.warn(`agent "${agentId}" references missing model "${agent.model}", falling back`);
    agent.model = '';
    store.saveAgents();
  }
  if (!resolved) resolved = tryResolve(store.imSettings.defaultModel);
  if (!resolved) resolved = tryResolve(store.getFirstAvailableModel());
  if (!resolved) return null;

  const { model, provider } = resolved;

  const wsDir = agent.workspace || path.join(cfg.DATA_DIR, `workspace-${agentId}`);
  let soulContent = '';
  try { soulContent = fs.readFileSync(path.join(wsDir, 'SOUL.md'), 'utf8'); } catch {}

  return { agent, model, provider, soulContent, wsDir };
}

const MERMAID_GUIDE = `## Mermaid 图表规范
生成 Mermaid 图表时遵循以下规则：
**语法**：类型用 flowchart/sequenceDiagram/classDiagram/gantt/pie/stateDiagram（不要用 blockDiagram）；participant 别名含括号需双引号包裹；alt/opt/loop/par 必须 end 闭合。
**样式**：用 classDef 定义样式并用 :::className 标注节点。调色板：
classDef entry fill:#0d3b66,stroke:#00d4ff,color:#e0e6ed,stroke-width:2px
classDef core fill:#0d2a2a,stroke:#00f5a0,color:#e0e6ed,stroke-width:2px
classDef action fill:#2a1f0d,stroke:#ff8a00,color:#ffe0b0
classDef data fill:#0d2a1a,stroke:#2ecc71,color:#c0ffd0
classDef warn fill:#3a0d1a,stroke:#ff3b5c,color:#ffc0c0
classDef decide fill:#1a1a3a,stroke:#8b5cf6,color:#e0e6ed`;

async function buildMessages(agentId, channel, userText, soulContent, ragContext, modelMeta) {
  const messages = [];
  let systemBase = soulContent ? soulContent + '\n\n' + MERMAID_GUIDE : MERMAID_GUIDE;
  if (modelMeta) {
    systemBase += `\n\n[Model] 你当前运行的底层模型是 ${modelMeta.name}（ID: ${modelMeta.id}），由 provider "${modelMeta.provider}" 提供。请以此为准回答关于你的模型身份的问题，忽略对话历史中可能存在的旧模型自称。`;
  }
  messages.push({ role: 'system', content: systemBase });

  const autoInject = _shouldInjectMemory(agentId);
  if (autoInject) {
    try {
      const memoryBlock = await _buildMemoryBlock(agentId, userText);
      if (memoryBlock) {
        messages.push({ role: 'system', content: memoryBlock });
      }
    } catch (e) {
      log.warn('memory injection failed, skipping:', e.message);
    }
  }

  if (ragContext && ragContext.length > 0) {
    const contextBlock = ragContext.map(c => c.text).join('\n---\n');
    messages.push({ role: 'system', content: `以下是相关知识库内容，请参考回答：\n\n${contextBlock}` });
  }

  const relevantHistory = store.getHistoryForContext(channel, agentId, 20);

  const lastMsg = relevantHistory[relevantHistory.length - 1];
  const alreadyInHistory = lastMsg && lastMsg.type === 'user' && lastMsg.text === userText;

  const sliceCount = alreadyInHistory ? -20 : -19;
  const recentHistory = relevantHistory.slice(sliceCount);

  for (const m of recentHistory) {
    if (m.type === 'user') {
      messages.push({ role: 'user', content: m.text || '' });
    } else if (m.type === 'agent') {
      messages.push({ role: 'assistant', content: m.text || '' });
    }
  }

  if (!alreadyInHistory) {
    messages.push({ role: 'user', content: userText });
  }

  return messages;
}

function _shouldInjectMemory(agentId) {
  store.loadAgents();
  const agent = store.localAgents.find(a => a.id === agentId);
  if (!agent) return true;
  return agent.autoInjectMemory !== false;
}

async function _buildMemoryBlock(agentId, userText) {
  const important = memory.getMemories(agentId, { importance: 'high', limit: 3, activeOnly: true });
  const relevant = await memory.searchMemory(agentId, userText, { limit: 3 }).catch(() => []);

  const seen = new Set();
  const items = [];

  for (const m of relevant) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    items.push(m.summary || (m.content.length > 200 ? m.content.slice(0, 200) + '…' : m.content));
  }

  for (const row of important) {
    if (items.length >= 5) break;
    const text = row.summary || (row.content.length > 200 ? row.content.slice(0, 200) + '…' : row.content);
    if (items.some(it => it === text)) continue;
    items.push(text);
  }

  if (!items.length) return null;
  return '以下是你的长期记忆，请在回答时适当参考（不要主动提及这些是"记忆"）：\n' + items.map((t, i) => `${i + 1}. ${t}`).join('\n');
}

async function handleDirectImageGen(channel, agentId, model, provider, userText, callOpts) {
  const modelName = model.name || model.id.split('/').pop();
  const runId = 'run-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  const runKey = callOpts._isSubCall ? `${channel}:sub:${runId}` : `${channel}:${runId}`;
  const progressText = `⏳ 正在使用「${modelName}」生成图片，请稍候...`;

  const abortCtrl = new AbortController();
  activeRuns.set(runKey, { abortCtrl, agentId, runId, ts: Date.now(), _modelId: model.id, currentText: progressText });

  log.info(`direct image gen: agent="${agentId}" model="${model.id}" prompt="${userText.slice(0, 80)}"`);
  broadcastFn({ type: 'agent_lifecycle', channel, agentId, runId, phase: 'start', model: model.id });
  broadcastFn({ type: 'agent_stream', channel, agentId, runId, text: progressText, delta: progressText, _imageProgress: true });

  try {
    const imageUrl = await imageGen.generateDirect(provider, model, userText, abortCtrl.signal);
    const resultText = `![${userText}](${imageUrl})`;

    activeRuns.delete(runKey);
    broadcastFn({ type: 'agent_stream', channel, agentId, runId, text: resultText, delta: '' });
    broadcastFn({ type: 'agent_lifecycle', channel, agentId, runId, phase: 'end' });

    const msgId = 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    store.addMessage({ id: msgId, type: 'agent', agent: agentId, channel, text: resultText, ts: Date.now(), runId });
    broadcastFn({ type: 'message', message: { id: msgId, type: 'agent', agent: agentId, channel, text: resultText, ts: Date.now(), runId } });

    if (!callOpts._isSubCall) collabFlow.onAgentEnd(channel, agentId, 0);
    return { ok: true, text: resultText };
  } catch (err) {
    activeRuns.delete(runKey);
    log.error(`direct image gen failed: model="${model.id}" error="${err.message}"`);
    const errMsg = `图片生成失败（模型: ${modelName}）: ${err.message}\n\n💡 排查建议：\n1. 确认该模型确实支持文生图能力\n2. 在「设置 → 模型管理」中检查该模型的 API 类型是否选择正确\n3. 如果服务商使用非标准接口，建议通过 one-api 等中转工具统一接入\n4. 检查 Provider 的 API Key 和 Base URL 是否正确`;
    broadcastFn({ type: 'agent_error', channel, error: errMsg });
    broadcastFn({ type: 'agent_lifecycle', channel, agentId, runId, phase: 'end' });
    if (!callOpts._isSubCall) collabFlow.onAgentError(channel, agentId);
    return { ok: false, error: errMsg };
  }
}

async function sendToLLM(channel, agentId, userText, opts) {
  const callOpts = opts || {};
  const resolved = resolveAgent(agentId);
  if (!resolved) {
    store.loadAgents();
    const agentExists = store.localAgents.some(a => a.id === agentId);
    const hint = agentExists
      ? `当前 Agent 未配置模型，且系统中没有可用的默认模型。\n💡 请先在「设置 → 模型配置」中添加 Provider 和模型。`
      : `Agent「${agentId}」不存在。`;
    broadcastFn({ type: 'agent_error', channel, error: hint });
    return { ok: false, error: hint };
  }

  let { agent, model, provider, soulContent } = resolved;

  if (callOpts._forceModel) {
    store.loadModels();
    const fm = (store.localModels.models || []).find(x => x.id === callOpts._forceModel);
    const fp = fm ? (store.localModels.providers || {})[fm.provider] : null;
    if (fm && fp) {
      model = fm;
      provider = fp;
    }
  }

  const modelCaps = store.detectCapabilities(model);
  if (!modelCaps.includes('chat')) {
    if (modelCaps.includes('image_gen')) {
      return await handleDirectImageGen(channel, agentId, model, provider, userText, callOpts);
    }
    const capLabel = modelCaps.join(', ') || 'unknown';
    const modelName = model.name || model.id.split('/').pop();
    log.warn(`agent="${agentId}" model="${model.id}" has caps=[${capLabel}], not a chat model`);
    const hint = `模型「${modelName}」是 ${capLabel} 类型，不支持对话。\n💡 请在 Agent 训练面板将模型切换为对话模型。`;
    broadcastFn({ type: 'agent_error', channel, error: hint });
    return { ok: false, error: hint };
  }

  const abortCtrl = new AbortController();
  const FETCH_TIMEOUT_MS = 120_000;
  const _fetchTimer = setTimeout(() => {
    if (!abortCtrl.signal.aborted) abortCtrl.abort(new Error('请求超时（120秒），模型无响应'));
  }, FETCH_TIMEOUT_MS);
  const runId = 'run-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  const runKey = callOpts._isSubCall ? `${channel}:sub:${runId}` : `${channel}:${runId}`;

  activeRuns.set(runKey, { abortCtrl, agentId, runId, ts: Date.now(), _calledBy: callOpts._calledBy, _runKey: runKey, _skipChain: callOpts._skipChain, _isSubCall: !!callOpts._isSubCall, _toolCallCount: 0, _channelReply: callOpts._channelReply || null, _modelId: model.id, _userText: userText, _isRetry: !!callOpts._isRetry });
  broadcastFn({ type: 'agent_lifecycle', channel, agentId, runId, phase: 'start', calledBy: callOpts._calledBy || undefined, model: model.id });

  if (!callOpts._isSubCall && callOpts._calledBy) {
    collabFlow.onAgentStart(channel, agentId);
  } else if (!callOpts._isSubCall && !callOpts._calledBy) {
    const grp = store.groups.find(g => g.id === channel);
    if (grp && grp.collabChain && grp.collabChain.length && grp.collabChain[0].agentId === agentId) {
      collabFlow.startFlow(channel);
      collabFlow.onAgentStart(channel, agentId);
    }
  }

  try {
    const baseUrl = (provider.baseUrl || '').replace(/\/+$/, '');
    const apiModelName = model.id.split('/').pop();
    const displayName = model.name || apiModelName;

    let ragContext = [];
    try { ragContext = await rag.search(agentId, userText); } catch (err) {
      log.warn('RAG search error (non-fatal):', err.message);
    }

    const modelMeta = { id: model.id, name: displayName, provider: model.provider };
    const messages = await buildMessages(agentId, channel, userText, soulContent, ragContext, modelMeta);
    const apiType = model.api || provider.api || 'openai-completions';

    const agentTools = registry.getToolsForAgent(agentId);
    const hasTools = agentTools.length > 0 && apiType !== 'openai-responses';

    log.info(`calling ${model.id} (api=${apiType}) for agent=${agentId} channel=${channel} (${messages.length} msgs, ${agentTools.length} tools)`);

    const toolContext = { channel, agentId, runId, userId: null, broadcast: broadcastFn, _callDepth: callOpts._callDepth || 0 };
    const loopHistory = [];
    let round = 0;

    while (round < toolEngine.MAX_ROUNDS) {
      round++;
      if (abortCtrl.signal.aborted) break;

      const currentTools = hasTools ? agentTools : [];
      const req = buildApiRequest(apiType, baseUrl, apiModelName, messages, model, currentTools);
      const { endpoint, body: reqBody, extractText } = req;

      const headers = { 'Content-Type': 'application/json', ...(req.headers || {}) };
      if (req.authStyle === 'x-api-key') {
        headers['x-api-key'] = provider.apiKey;
      } else {
        headers['Authorization'] = `Bearer ${provider.apiKey}`;
      }

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(reqBody),
        signal: abortCtrl.signal,
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        const briefErr = errText.slice(0, 200).replace(/[\n\r]+/g, ' ');
        const e = new Error(`API ${resp.status}: ${briefErr}`);
        e.statusCode = resp.status;
        throw e;
      }

      const contentType = resp.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream') || contentType.includes('text/plain')) {
        const streamResult = await handleSSEStream(resp, channel, agentId, runId, abortCtrl, apiType, hasTools, runKey);

        if (streamResult.toolCalls?.length) {
          for (const tc of streamResult.toolCalls) {
            loopHistory.push({ name: tc.name, argsKey: toolEngine.argsKey(tc.args) });
          }
          if (toolEngine.detectLoop(loopHistory)) {
            log.warn(`loop detected for agent=${agentId}, breaking at round ${round}`);
            break;
          }

          log.info(`round ${round}: executing ${streamResult.toolCalls.length} tool(s) for agent=${agentId}`);
          const runRef = activeRuns.get(runKey);
          if (runRef) runRef._toolCallCount = (runRef._toolCallCount || 0) + streamResult.toolCalls.length;
          const results = await toolEngine.executeToolCalls(streamResult.toolCalls, toolContext);

          if (apiType === 'anthropic-messages') {
            toolEngine.injectToolResultsAnthropic(messages, streamResult.toolCalls, results);
          } else {
            toolEngine.injectToolResultsOpenAI(messages, streamResult.toolCalls, results);
          }
          continue;
        }

        return await finalize(channel, agentId, runId, streamResult.text, runKey);
      }

      // Non-streaming JSON response
      const data = await resp.json();
      const toolCallsFromJson = hasTools ? toolEngine.extractToolCalls(data, apiType) : null;

      if (toolCallsFromJson?.length) {
        for (const tc of toolCallsFromJson) {
          loopHistory.push({ name: tc.name, argsKey: toolEngine.argsKey(tc.args) });
        }
        if (toolEngine.detectLoop(loopHistory)) {
          log.warn(`loop detected for agent=${agentId}, breaking at round ${round}`);
          break;
        }

        log.info(`round ${round}: executing ${toolCallsFromJson.length} tool(s) for agent=${agentId} (non-stream)`);
        const runRef2 = activeRuns.get(runKey);
        if (runRef2) runRef2._toolCallCount = (runRef2._toolCallCount || 0) + toolCallsFromJson.length;
        const results = await toolEngine.executeToolCalls(toolCallsFromJson, toolContext);

        if (apiType === 'anthropic-messages') {
          toolEngine.injectToolResultsAnthropic(messages, toolCallsFromJson, results);
        } else {
          toolEngine.injectToolResultsOpenAI(messages, toolCallsFromJson, results);
        }
        continue;
      }

      let text = extractText(data);

      if (text) {
        broadcastFn({ type: 'agent_stream', channel, agentId, runId, text, delta: text });
      }
      return await finalize(channel, agentId, runId, text || '', runKey);
    }

    if (round >= toolEngine.MAX_ROUNDS) {
      log.warn(`max tool rounds (${toolEngine.MAX_ROUNDS}) reached for agent=${agentId}`);
    }

    // Exceeded max rounds — do a final call without tools to force text response
    const finalReq = buildApiRequest(apiType, baseUrl, apiModelName, messages, model, []);
    const fHeaders = { 'Content-Type': 'application/json', ...(finalReq.headers || {}) };
    if (finalReq.authStyle === 'x-api-key') { fHeaders['x-api-key'] = provider.apiKey; }
    else { fHeaders['Authorization'] = `Bearer ${provider.apiKey}`; }

    const fResp = await fetch(finalReq.endpoint, {
      method: 'POST', headers: fHeaders, body: JSON.stringify(finalReq.body), signal: abortCtrl.signal,
    });
    if (!fResp.ok) throw new Error(`LLM API ${fResp.status} on final call`);
    const fCt = fResp.headers.get('content-type') || '';
    if (fCt.includes('text/event-stream') || fCt.includes('text/plain')) {
      const sr = await handleSSEStream(fResp, channel, agentId, runId, abortCtrl, apiType, false, runKey);
      return await finalize(channel, agentId, runId, sr.text, runKey);
    }
    const fData = await fResp.json();
    const fText = finalReq.extractText(fData);
    if (fText) broadcastFn({ type: 'agent_stream', channel, agentId, runId, text: fText, delta: fText });
    return await finalize(channel, agentId, runId, fText || '', runKey);

  } catch (err) {
    const isTimeout = err.name === 'AbortError' && /超时/.test(abortCtrl.signal.reason?.message || '');
    if (err.name === 'AbortError' && !isTimeout) {
      log.info(`aborted channel=${channel}`);
      if (activeRuns.has(runKey)) {
        activeRuns.delete(runKey);
        broadcastFn({ type: 'agent_lifecycle', channel, agentId, runId, phase: 'end' });
      }
      return { ok: true, cancelled: true };
    }

    const curModelName = model.name || model.id?.split('/').pop() || 'unknown';
    activeRuns.delete(runKey);

    let userMsg;
    if (isTimeout) {
      userMsg = `模型「${curModelName}」请求超时（120秒无响应）。\n可能原因：模型服务不可用或网络异常。\n建议：稍后重试，或切换其他模型。`;
    } else if (err.statusCode >= 400 && err.statusCode < 500) {
      if (/Arrearage/i.test(err.message)) {
        userMsg = `模型「${curModelName}」调用失败：账户欠费，API 已被冻结。\n💡 请登录阿里云控制台充值后重试。`;
      } else if (/invalid_api_key/i.test(err.message)) {
        userMsg = `模型「${curModelName}」调用失败：API Key 无效或已过期。\n💡 请在「设置 → 模型配置」中检查 API Key。`;
      } else {
        const codeHints = { 401: 'API Key 无效或已过期', 403: '无权限访问该模型', 429: '请求频率超限或余额不足', 404: '模型不存在或 API 地址错误' };
        const hint = codeHints[err.statusCode] || '客户端请求错误';
        userMsg = `模型「${curModelName}」调用失败（HTTP ${err.statusCode}：${hint}）。\n\n💡 排查建议：\n1. 检查 Provider 的 Base URL 和 API Key 配置\n2. 确认模型名称和 API 类型选择正确\n3. 如果服务商使用非标准接口，建议通过 one-api 等中转工具统一接入`;
      }
    } else if (err.statusCode >= 500) {
      userMsg = `模型「${curModelName}」服务端错误（HTTP ${err.statusCode}）。\n可能原因：模型服务暂时不可用。\n建议：稍后重试，或切换其他模型。`;
    } else {
      userMsg = `模型「${curModelName}」调用出错：${err.message}\n建议：检查网络连接和模型配置，或切换其他模型重试。`;
    }
    log.error(`error for agent=${agentId} model="${curModelName}":`, err.message);
    broadcastFn({ type: 'agent_error', channel, error: userMsg });
    broadcastFn({ type: 'agent_lifecycle', channel, agentId, runId, phase: 'end' });
    if (!callOpts._isSubCall) collabFlow.onAgentError(channel, agentId);
    return { ok: false, error: userMsg };
  } finally {
    clearTimeout(_fetchTimer);
  }
}

function buildApiRequest(apiType, baseUrl, modelName, messages, model, tools) {
  if (apiType === 'openai-responses') {
    const sysMsgs = messages.filter(m => m.role === 'system');
    const instructions = sysMsgs.map(m => m.content).join('\n\n') || undefined;
    const input = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));
    return {
      endpoint: `${baseUrl}/responses`,
      body: {
        model: modelName,
        instructions,
        input,
        stream: true,
      },
      extractText: (data) => {
        if (data.output_text) return data.output_text;
        if (Array.isArray(data.output)) {
          return data.output
            .filter(o => o.type === 'message')
            .flatMap(o => o.content || [])
            .filter(c => c.type === 'output_text')
            .map(c => c.text)
            .join('');
        }
        return data.choices?.[0]?.message?.content || '';
      },
    };
  }

  if (apiType === 'anthropic-messages') {
    const sysMsgs = messages.filter(m => m.role === 'system');
    const system = sysMsgs.map(m => m.content).join('\n\n') || undefined;
    const nonSysMsgs = messages.filter(m => m.role !== 'system');
    const merged = [];
    for (const m of nonSysMsgs) {
      // Anthropic tool_use/tool_result 消息直接透传（content 是数组）
      if (Array.isArray(m.content)) {
        merged.push({ role: m.role, content: m.content });
        continue;
      }
      // OpenAI 格式的 assistant tool_calls 消息（不应出现在 Anthropic 路径，但安全处理）
      if (m.role === 'assistant' && m.content === null && m.tool_calls) {
        merged.push(m);
        continue;
      }
      if (m.role === 'tool') {
        merged.push(m);
        continue;
      }
      const role = m.role === 'assistant' ? 'assistant' : 'user';
      if (merged.length && merged[merged.length - 1].role === role && typeof merged[merged.length - 1].content === 'string') {
        merged[merged.length - 1].content += '\n' + m.content;
      } else {
        merged.push({ role, content: m.content });
      }
    }
    if (!merged.length || merged[0].role !== 'user') {
      merged.unshift({ role: 'user', content: '...' });
    }

    const anthropicTools = tools?.length ? registry.toAnthropicTools(tools) : undefined;
    return {
      endpoint: `${baseUrl}/messages`,
      headers: { 'anthropic-version': '2023-06-01' },
      authStyle: 'x-api-key',
      body: {
        model: modelName,
        max_tokens: model.maxTokens || 8192,
        ...(system ? { system } : {}),
        messages: merged,
        stream: true,
        ...(anthropicTools?.length ? { tools: anthropicTools } : {}),
      },
      extractText: (data) => {
        if (Array.isArray(data.content)) {
          return data.content.filter(b => b.type === 'text').map(b => b.text).join('');
        }
        return data.choices?.[0]?.message?.content || '';
      },
    };
  }

  const openaiTools = tools?.length ? registry.toOpenAITools(tools) : undefined;
  return {
    endpoint: `${baseUrl}/chat/completions`,
    body: {
      model: modelName,
      messages,
      stream: true,
      ...(model.maxTokens ? { max_tokens: model.maxTokens } : {}),
      ...(openaiTools?.length ? { tools: openaiTools } : {}),
    },
    extractText: (data) => {
      const content = data.choices?.[0]?.message?.content;
      if (Array.isArray(content)) {
        return content.map(c => {
          if (typeof c === 'string') return c;
          if (c.type === 'text') return c.text || '';
          if (c.type === 'image_url' && c.image_url?.url) return `![](${c.image_url.url})`;
          return '';
        }).join('');
      }
      if (typeof content === 'string' && /^https?:\/\/\S+\.(png|jpg|jpeg|webp|gif)/i.test(content.trim())) {
        return `![](${content.trim()})`;
      }
      return content || '';
    },
  };
}

async function handleSSEStream(resp, channel, agentId, runId, abortCtrl, apiType, detectTools, runKey) {
  let fullText = '';
  const reader = resp.body;
  const decoder = new TextDecoder();
  let buffer = '';
  const toolAccum = detectTools ? toolEngine.createStreamToolAccumulator() : null;
  const STREAM_IDLE_MS = 60_000;
  let _idleTimer = setTimeout(() => {
    if (!abortCtrl.signal.aborted) abortCtrl.abort(new Error('流式响应超时（60秒无数据），模型可能不支持此调用方式'));
  }, STREAM_IDLE_MS);

  for await (const chunk of reader) {
    if (abortCtrl.signal.aborted) break;
    clearTimeout(_idleTimer);
    _idleTimer = setTimeout(() => {
      if (!abortCtrl.signal.aborted) abortCtrl.abort(new Error('流式响应超时（60秒无数据），模型可能不支持此调用方式'));
    }, STREAM_IDLE_MS);

    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') continue;

      try {
        const parsed = JSON.parse(payload);
        let delta = null;

        if (apiType === 'openai-responses') {
          if (parsed.type === 'response.output_text.delta') delta = parsed.delta || '';
        } else if (apiType === 'anthropic-messages') {
          if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
            delta = parsed.delta.text || '';
          }
          if (toolAccum) toolAccum.feedAnthropicEvent(parsed);
        } else {
          const choice = parsed.choices?.[0];
          let rawContent = choice?.delta?.content;
          if (Array.isArray(rawContent)) {
            delta = rawContent.map(c => {
              if (c.type === 'text') return c.text || '';
              if (c.type === 'image_url' && c.image_url?.url) return `![](${c.image_url.url})`;
              return '';
            }).join('');
          } else {
            delta = rawContent;
          }
          if (toolAccum && choice?.delta) toolAccum.feedDelta(choice.delta);
        }

        if (delta) {
          fullText += delta;
          const run = activeRuns.get(runKey || channel);
          if (run) run.currentText = fullText;
          broadcastFn({ type: 'agent_stream', channel, agentId, runId, text: fullText, delta });
        }
      } catch {}
    }
  }

  clearTimeout(_idleTimer);

  if (toolAccum && toolAccum.hasToolCalls()) {
    return { text: fullText, toolCalls: toolAccum.getToolCalls() };
  }

  return { text: fullText, toolCalls: null };
}

async function finalize(channel, agentId, runId, text, runKey) {
  runKey = runKey || channel;
  const runInfo = activeRuns.get(runKey);
  if (!runInfo) {
    return { ok: true, runId };
  }
  activeRuns.delete(runKey);

  if (!text || !text.trim()) {
    const failedModelId = runInfo._modelId || '';
    store.loadModels();
    const failedModel = (store.localModels.models || []).find(m => m.id === failedModelId);
    const failedName = failedModel?.name || failedModelId.split('/').pop() || 'unknown';
    const failedCaps = failedModel ? store.detectCapabilities(failedModel) : [];

    log.warn(`empty response for agent=${agentId} model="${failedName}" caps=[${failedCaps}] channel=${channel}`);

    let hint;
    if (failedCaps.includes('image_gen') && !failedCaps.includes('chat')) {
      hint = `模型「${failedName}」是图像生成专用模型，不支持对话。\n💡 建议：在 Agent 训练面板将模型切换为对话模型（如 qwen3.5-plus），然后在「设置 → 能力路由 → 文生图」中指定图像生成模型。`;
    } else if (failedCaps.includes('image_gen')) {
      hint = `模型「${failedName}」未返回有效内容。\n💡 该模型支持图像生成，但可能需要更具体的指令（如"画一只猫"）。若需要普通对话，建议切换为对话模型。`;
    } else if (failedCaps.includes('tts') || failedCaps.includes('stt') || failedCaps.includes('embedding')) {
      const capLabel = failedCaps.join(', ');
      hint = `模型「${failedName}」是 ${capLabel} 类型，不支持对话。\n💡 建议：在 Agent 训练面板将模型切换为对话模型（如 qwen3.5-plus）。`;
    } else {
      hint = `模型「${failedName}」返回了空响应。\n\n💡 排查建议：\n1. 检查模型的 API 类型是否选择正确（设置 → 模型管理 → 编辑模型）\n2. 确认 Provider 的 Base URL 和 API Key 配置正确\n3. 如果服务商使用非标准接口，可通过 one-api 等中转工具统一接入\n4. 或在 Agent 训练面板切换为其他对话模型`;
    }

    broadcastFn({ type: 'agent_error', channel, error: hint });
    broadcastFn({ type: 'agent_lifecycle', channel, agentId, runId, phase: 'end' });
    if (!runInfo._isSubCall) collabFlow.onAgentEnd(channel, agentId, runInfo._toolCallCount || 0);
    return { ok: true, runId, empty: true };
  }

  if (imageGen.hasMarker(text)) {
    store.loadAgents();
    const agentCfg = store.localAgents.find(a => a.id === agentId);
    const resolvedCaps = store.resolveAgentCapabilities(agentCfg);
    const imgRoute = resolvedCaps.image_gen;
    const imgModelId = imgRoute?.model || null;

    if (imgModelId) {
      const onProgress = (info) => {
        broadcastFn({ type: 'agent_stream', channel, agentId, runId, text: info.currentText, delta: '', _imageProgress: true });
      };
      try { text = await imageGen.processText(text, onProgress, imgModelId); } catch (err) {
        log.error('image-gen error:', err.message);
      }
    } else {
      imageGen.IMG_GEN_RE.lastIndex = 0;
      text = text.replace(imageGen.IMG_GEN_RE, '[图片生成不可用: 未配置文生图模型，请在「模型→能力路由」中配置]');
    }
  }

  const blocks = parseResponseBlocks(text);
  const entry = {
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    type: 'agent', agent: agentId, channel, text, ts: Date.now(), runId,
    model: runInfo._modelId || undefined,
  };
  if (blocks.length) entry.blocks = blocks;
  if (runInfo._calledBy) entry.calledBy = runInfo._calledBy;
  store.addMessage(entry);
  broadcastFn({ type: 'message', message: entry });
  store.bumpMetric(agentId, 'messages');
  store.bumpMetric(agentId, 'tasks');
  emitCommunityEventFn('agent_task_complete', { agentId, text });

  if (runInfo._channelReply && typeof runInfo._channelReply === 'function') {
    try { runInfo._channelReply(text); } catch (e) {
      log.error('channel reply callback error:', e.message);
    }
  }

  broadcastFn({ type: 'agent_lifecycle', channel, agentId, runId, phase: 'end' });

  if (!runInfo._isSubCall) {
    collabFlow.onAgentEnd(channel, agentId, runInfo._toolCallCount || 0);
  }

  if (!runInfo._skipChain && !runInfo._isSubCall) {
    _triggerCollabChain(channel, agentId, text);
  }

  return { ok: true, runId, text };
}

function _triggerCollabChain(channel, agentId, responseText) {
  const grp = store.groups.find(g => g.id === channel);
  if (!grp || !grp.collabChain || !grp.collabChain.length) return;

  const chain = grp.collabChain;
  const currentIdx = chain.findIndex(n => n.agentId === agentId);
  if (currentIdx < 0 || currentIdx >= chain.length - 1) return;

  const next = chain[currentIdx + 1];
  if (!next || !next.agentId) return;

  store.loadAgents();
  const nextAgent = store.localAgents.find(a => a.id === next.agentId);
  if (!nextAgent) {
    log.warn(`collab chain: next agent "${next.agentId}" not found, stopping chain`);
    return;
  }
  const curAgent = store.localAgents.find(a => a.id === agentId);
  const curName = curAgent ? curAgent.name : agentId;

  if (next.autoTrigger === false) {
    collabFlow.onChainWaiting(channel, next.agentId);
    broadcastFn({
      type: 'collab_chain_waiting',
      channel,
      currentStep: currentIdx + 1,
      totalSteps: chain.length,
      nextAgentId: next.agentId,
      nextAgentName: nextAgent ? nextAgent.name : next.agentId,
      previousAgentId: agentId,
      previousText: responseText.slice(0, 500),
    });
    return;
  }

  const prompt = `[协作接力] 前一个Agent「${curName}」的输出：\n${responseText}\n\n请基于以上内容继续完成你的任务。`;
  setTimeout(() => {
    sendToLLM(channel, next.agentId, prompt, { _calledBy: agentId }).catch(err => {
      log.error(`collab chain error (${agentId}->${next.agentId}):`, err.message);
    });
  }, 500);
}

async function cancelRun(channel) {
  const matchingKeys = [...activeRuns.keys()].filter(k => k === channel || k.startsWith(channel + ':'));
  if (!matchingKeys.length) return { ok: false, error: 'no active run' };

  for (const key of matchingKeys) {
    const run = activeRuns.get(key);
    if (!run) continue;
    const partialText = run.currentText;
    run.abortCtrl.abort();
    activeRuns.delete(key);

    const isProgressPlaceholder = partialText && /^⏳/.test(partialText.trim());
    if (partialText && partialText.trim() && !isProgressPlaceholder) {
      const entry = {
        id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        type: 'agent', agent: run.agentId, channel,
        text: partialText, ts: Date.now(), runId: run.runId,
      };
      store.addMessage(entry);
      broadcastFn({ type: 'message', message: entry });
    }

    broadcastFn({ type: 'agent_lifecycle', channel, agentId: run.agentId, runId: run.runId, phase: 'end' });
  }

  collabFlow.stopFlow(channel);
  log.info(`cancelled channel=${channel} (${matchingKeys.length} run(s))`);
  return { ok: true };
}

function isRunning(channel) {
  for (const key of activeRuns.keys()) {
    if (key === channel || key.startsWith(channel + ':')) return true;
  }
  return false;
}

/**
 * Parse LLM text response into optional structured blocks.
 * Detects: action suggestions, markdown tables, code fences.
 * Returns empty array when text is simple prose (backward compatible).
 */
function parseResponseBlocks(text) {
  if (!text || text.length < 20) return [];

  const blocks = [];
  const lines = text.split('\n');
  let i = 0;
  let textBuf = [];
  let hasStructure = false;

  function flushText() {
    const t = textBuf.join('\n').trim();
    if (t) blocks.push({ type: 'text', content: t });
    textBuf = [];
  }

  while (i < lines.length) {
    const line = lines[i];

    // code fence
    const fenceMatch = line.match(/^```(\w*)/);
    if (fenceMatch) {
      flushText();
      const lang = fenceMatch[1] || '';
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++; }
      if (i < lines.length) i++; // skip closing ```
      blocks.push({ type: 'code', language: lang, content: codeLines.join('\n') });
      hasStructure = true;
      continue;
    }

    // markdown table (header + separator + rows)
    if (line.includes('|') && i + 1 < lines.length && /^[\s|:-]+$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      flushText();
      const headerCells = line.split('|').map(c => c.trim()).filter(Boolean);
      i += 2; // skip header + separator
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        const cells = lines[i].split('|').map(c => c.trim()).filter(Boolean);
        if (cells.length) rows.push(cells);
        i++;
      }
      if (headerCells.length && rows.length) {
        blocks.push({ type: 'table', headers: headerCells, rows });
        hasStructure = true;
      } else {
        textBuf.push(line);
      }
      continue;
    }

    textBuf.push(line);
    i++;
  }

  flushText();

  // Detect trailing action suggestions (numbered options at the end)
  if (blocks.length) {
    const last = blocks[blocks.length - 1];
    if (last.type === 'text') {
      const actionResult = _extractActions(last.content);
      if (actionResult) {
        last.content = actionResult.remaining;
        if (!last.content.trim()) blocks.pop();
        blocks.push({ type: 'actions', buttons: actionResult.buttons });
        hasStructure = true;
      }
    }
  }

  return hasStructure ? blocks : [];
}

function _extractActions(text) {
  const lines = text.split('\n');
  const actionLines = [];
  let cutIdx = lines.length;

  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].match(/^\s*(\d+)[.、)]\s*(.{2,40})\s*$/);
    if (m) { actionLines.unshift({ label: m[2].trim() }); cutIdx = i; }
    else if (lines[i].trim() === '') continue;
    else break;
  }

  if (actionLines.length < 2 || actionLines.length > 6) return null;

  const prefixLine = cutIdx > 0 ? lines[cutIdx - 1] : '';
  const hasPromptPrefix = /[：:？?]$/.test(prefixLine.trim()) || /选择|试试|可以|建议|想要|需要/.test(prefixLine);
  if (!hasPromptPrefix && cutIdx > 0) return null;

  const remaining = lines.slice(0, hasPromptPrefix ? cutIdx - 1 : cutIdx).join('\n');
  const title = hasPromptPrefix ? prefixLine.trim() : undefined;
  const buttons = actionLines.map(a => ({ action: 'send', label: a.label, data: a.label }));

  return { remaining, buttons: buttons.length ? buttons : null, title };
}

module.exports = { sendToLLM, cancelRun, setBroadcast, setEmitCommunityEvent, resolveAgent, isRunning, activeRuns, parseResponseBlocks };
