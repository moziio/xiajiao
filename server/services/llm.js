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

  const modelId = agent.model || store.imSettings.defaultModel || store.getFirstAvailableModel();
  store.loadModels();
  const model = (store.localModels.models || []).find(m => m.id === modelId);
  if (!model) return null;
  const provider = (store.localModels.providers || {})[model.provider];
  if (!provider) return null;

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

async function buildMessages(agentId, channel, userText, soulContent, ragContext) {
  const messages = [];
  const systemBase = soulContent ? soulContent + '\n\n' + MERMAID_GUIDE : MERMAID_GUIDE;
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

async function sendToLLM(channel, agentId, userText, opts) {
  const callOpts = opts || {};
  const resolved = resolveAgent(agentId);
  if (!resolved) {
    broadcastFn({ type: 'agent_error', channel, error: `Agent or model not found: ${agentId}` });
    return { ok: false, error: 'Agent or model not found' };
  }

  const { agent, model, provider, soulContent } = resolved;
  const abortCtrl = new AbortController();
  const runId = 'run-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  const runKey = callOpts._isSubCall ? `${channel}:sub:${runId}` : channel;

  activeRuns.set(runKey, { abortCtrl, agentId, runId, ts: Date.now(), _calledBy: callOpts._calledBy, _runKey: runKey, _skipChain: callOpts._skipChain, _isSubCall: !!callOpts._isSubCall, _toolCallCount: 0 });
  broadcastFn({ type: 'agent_lifecycle', channel, agentId, runId, phase: 'start', calledBy: callOpts._calledBy || undefined });

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
    const modelName = model.name || model.id.split('/').pop();

    let ragContext = [];
    try { ragContext = await rag.search(agentId, userText); } catch (err) {
      log.warn('RAG search error (non-fatal):', err.message);
    }

    const messages = await buildMessages(agentId, channel, userText, soulContent, ragContext);
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
      const req = buildApiRequest(apiType, baseUrl, modelName, messages, model, currentTools);
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
        throw new Error(`LLM API ${resp.status}: ${errText.slice(0, 300)}`);
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
      if (!text) throw new Error('Empty response from LLM');

      broadcastFn({ type: 'agent_stream', channel, agentId, runId, text, delta: text });
      return await finalize(channel, agentId, runId, text, runKey);
    }

    if (round >= toolEngine.MAX_ROUNDS) {
      log.warn(`max tool rounds (${toolEngine.MAX_ROUNDS}) reached for agent=${agentId}`);
    }

    // Exceeded max rounds — do a final call without tools to force text response
    const finalReq = buildApiRequest(apiType, baseUrl, modelName, messages, model, []);
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
    if (err.name === 'AbortError') {
      log.info(`aborted channel=${channel}`);
      if (activeRuns.has(runKey)) {
        activeRuns.delete(runKey);
        broadcastFn({ type: 'agent_lifecycle', channel, agentId, runId, phase: 'end' });
      }
      return { ok: true, cancelled: true };
    }
    activeRuns.delete(runKey);
    log.error(`error for agent=${agentId}:`, err.message);
    broadcastFn({ type: 'agent_error', channel, error: err.message });
    broadcastFn({ type: 'agent_lifecycle', channel, agentId, runId, phase: 'end' });
    if (!callOpts._isSubCall) collabFlow.onAgentError(channel, agentId);
    return { ok: false, error: err.message };
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
    extractText: (data) => data.choices?.[0]?.message?.content || '',
  };
}

async function handleSSEStream(resp, channel, agentId, runId, abortCtrl, apiType, detectTools, runKey) {
  let fullText = '';
  const reader = resp.body;
  const decoder = new TextDecoder();
  let buffer = '';
  const toolAccum = detectTools ? toolEngine.createStreamToolAccumulator() : null;

  for await (const chunk of reader) {
    if (abortCtrl.signal.aborted) break;

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
          delta = choice?.delta?.content;
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
    log.warn(`empty response for agent=${agentId} channel=${channel}, skipping save`);
    broadcastFn({ type: 'agent_lifecycle', channel, agentId, runId, phase: 'end' });
    if (!runInfo._isSubCall) collabFlow.onAgentEnd(channel, agentId, runInfo._toolCallCount || 0);
    return { ok: true, runId, empty: true };
  }

  if (imageGen.isEnabled() && imageGen.hasMarker(text)) {
    try { text = await imageGen.processText(text); } catch (err) {
      log.error('image-gen error:', err.message);
    }
  }

  const blocks = parseResponseBlocks(text);
  const entry = {
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    type: 'agent', agent: agentId, channel, text, ts: Date.now(), runId,
  };
  if (blocks.length) entry.blocks = blocks;
  if (runInfo._calledBy) entry.calledBy = runInfo._calledBy;
  store.addMessage(entry);
  broadcastFn({ type: 'message', message: entry });
  store.bumpMetric(agentId, 'messages');
  store.bumpMetric(agentId, 'tasks');
  emitCommunityEventFn('agent_task_complete', { agentId, text });

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
  const run = activeRuns.get(channel);
  if (!run) return { ok: false, error: 'no active run' };
  const partialText = run.currentText;
  run.abortCtrl.abort();
  activeRuns.delete(channel);
  log.info(`cancelled channel=${channel}`);

  if (partialText && partialText.trim()) {
    const entry = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      type: 'agent', agent: run.agentId, channel,
      text: partialText, ts: Date.now(), runId: run.runId,
    };
    store.addMessage(entry);
    broadcastFn({ type: 'message', message: entry });
  }

  broadcastFn({ type: 'agent_lifecycle', channel, agentId: run.agentId, runId: run.runId, phase: 'end' });
  collabFlow.stopFlow(channel);
  return { ok: true };
}

function isRunning(channel) {
  return activeRuns.has(channel);
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
