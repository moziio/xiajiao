const store = require('./storage');
const { createLogger } = require('../middleware/logger');
const log = createLogger('workflow');

const activeRuns = new Map();
let broadcastFn = () => {};
let _sendFn = null;
let _cancelFn = null;

function setBroadcast(fn) { broadcastFn = fn; }
function setSendFn(fn) { _sendFn = fn; }
function setCancelFn(fn) { _cancelFn = fn; }

function getAll() { return store.workflows; }
function getById(id) { return store.workflows.find(w => w.id === id) || null; }

function normalizeSteps(steps) {
  return steps.map((s, i) => {
    const base = {
      id: s.id || `s${i + 1}`,
      name: s.name || `步骤 ${i + 1}`,
      type: s.type || 'agent',
      agent: s.agent || '',
      prompt: s.prompt || '',
      waitForApproval: !!s.waitForApproval,
      onError: s.onError || 'fail',
      maxRetries: Math.min(Math.max(parseInt(s.maxRetries, 10) || 0, 0), 3),
    };
    if (s.type === 'condition') {
      base.conditionExpr = s.conditionExpr || '';
      base.conditionMode = s.conditionMode || 'keyword';
      base.branches = {
        true: s.branches?.true || s.branches?.['true'] || null,
        false: s.branches?.false || s.branches?.['false'] || null,
      };
    }
    return base;
  });
}

function create(data) {
  const wf = {
    id: data.id || 'wf-' + Date.now().toString(36),
    name: data.name || '未命名工作流',
    emoji: data.emoji || '⚙️',
    description: data.description || '',
    steps: normalizeSteps(data.steps || []),
    createdAt: Date.now(),
  };
  store.workflows.push(wf);
  store.saveWorkflows();
  return wf;
}

function update(id, data) {
  const idx = store.workflows.findIndex(w => w.id === id);
  if (idx < 0) return null;
  const wf = store.workflows[idx];
  if (data.name !== undefined) wf.name = data.name;
  if (data.emoji !== undefined) wf.emoji = data.emoji;
  if (data.description !== undefined) wf.description = data.description;
  if (data.steps) wf.steps = normalizeSteps(data.steps);
  store.saveWorkflows();
  return wf;
}

function remove(id) {
  const idx = store.workflows.findIndex(w => w.id === id);
  if (idx < 0) return false;
  for (const [runId, rs] of activeRuns) {
    if (rs.workflowId === id) controlRun(runId, 'stop');
  }
  store.workflows.splice(idx, 1);
  store.saveWorkflows();
  return true;
}

function renderPrompt(template, input, outputs) {
  return template
    .replace(/\{\{input\}\}/g, () => input || '')
    .replace(/\{\{(\w+)\.output\}\}/g, (_, sid) => outputs[sid] || '');
}

function addSysMsg(channel, text) {
  const entry = {
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    type: 'system', text, channel, ts: Date.now(),
  };
  store.addMessage(entry);
  broadcastFn({ type: 'message', message: entry });
}

function resolveAgentName(agentId) {
  const a = store.localAgents.find(x => x.id === agentId);
  return a?.name || agentId;
}

async function run(workflowId, input) {
  if (!_sendFn) throw new Error('workflow engine not initialized (no sendFn)');
  const wf = getById(workflowId);
  if (!wf) throw new Error('workflow not found');
  if (!wf.steps || !wf.steps.length) throw new Error('no steps');

  const channel = 'wf_' + workflowId;

  for (const [, rs] of activeRuns) {
    if (rs.channel === channel && (rs.status === 'running' || rs.status === 'waiting')) {
      throw new Error('workflow already running');
    }
  }

  const runId = 'wr-' + Date.now().toString(36);
  const rs = {
    runId, workflowId, workflowName: wf.name, channel,
    stepIndex: 0, status: 'running', input: input || '',
    outputs: {}, steps: wf.steps, startTime: Date.now(),
    _resolve: null,
  };
  activeRuns.set(runId, rs);

  addSysMsg(channel, `🚀 工作流「${wf.name}」开始运行`);

  broadcastFn({
    type: 'workflow_start', runId, workflowId, channel,
    workflowName: wf.name, emoji: wf.emoji,
    steps: wf.steps.map(s => ({ id: s.id, name: s.name, agent: s.agent, type: s.type || 'agent' })),
  });

  executeSteps(rs).catch(err => {
    log.error(`run ${runId} error:`, err.message);
    rs.status = 'failed';
    addSysMsg(channel, `❌ 工作流失败: ${err.message}`);
    broadcastFn({ type: 'workflow_complete', runId, channel, status: 'failed', error: err.message });
    activeRuns.delete(runId);
  });

  return { runId, channel };
}

async function executeSteps(rs) {
  const { steps, channel, runId } = rs;

  const MAX_ITERATIONS = steps.length * 4;
  let iterations = 0;
  let i = 0;
  while (i < steps.length) {
    if (rs.status === 'stopped') break;
    if (++iterations > MAX_ITERATIONS) {
      throw new Error('工作流执行超过最大迭代次数，可能存在循环');
    }

    const step = steps[i];
    rs.stepIndex = i;
    rs.status = 'running';

    if (step.type === 'condition') {
      const result = await evaluateCondition(step, rs);
      const branchTarget = result ? step.branches?.true : step.branches?.false;

      addSysMsg(channel, `🔀 条件判断「${step.name}」→ ${result ? '✅ 是' : '❌ 否'}${branchTarget ? ' → 跳转 ' + branchTarget : ''}`);
      broadcastFn({
        type: 'workflow_step', runId, channel, phase: 'done',
        stepIndex: i, stepId: step.id, stepName: step.name,
        totalSteps: steps.length, conditionResult: result,
      });

      if (branchTarget) {
        const targetIdx = steps.findIndex(s => s.id === branchTarget);
        if (targetIdx >= 0) { i = targetIdx; continue; }
        log.warn(`condition branch target "${branchTarget}" not found, continuing`);
      }
      i++;
      continue;
    }

    const prompt = renderPrompt(step.prompt, rs.input, rs.outputs);
    const agentName = resolveAgentName(step.agent);
    const maxRetries = step.maxRetries || 0;
    let attempt = 0;
    let stepSuccess = false;

    while (attempt <= maxRetries) {
      if (rs.status === 'stopped') break;
      if (attempt > 0) {
        addSysMsg(channel, `🔄 步骤 ${i + 1}「${step.name}」重试 (${attempt}/${maxRetries})`);
      } else {
        addSysMsg(channel, `📋 步骤 ${i + 1}/${steps.length}: ${step.name} → @${agentName}`);
      }

      broadcastFn({
        type: 'workflow_step', runId, channel, phase: 'start',
        stepIndex: i, stepId: step.id, stepName: step.name,
        agentId: step.agent, totalSteps: steps.length,
        attempt: attempt > 0 ? attempt : undefined,
      });

      const STEP_TIMEOUT = 5 * 60 * 1000;
      let stepTimer;
      try {
        const timeoutPromise = new Promise((_, reject) => {
          stepTimer = setTimeout(() => reject(new Error('步骤超时：LLM 调用超过 5 分钟')), STEP_TIMEOUT);
        });
        const result = await Promise.race([_sendFn(channel, step.agent, prompt), timeoutPromise]);
        clearTimeout(stepTimer);

        if (rs.status === 'stopped') break;
        if (result?.cancelled) { rs.status = 'stopped'; break; }
        if (!result?.ok) {
          throw new Error(result?.error || 'unknown error');
        }

        rs.outputs[step.id] = result?.text || '';
        if (!result?.text) {
          log.warn(`step ${step.id} returned no text (gateway mode or empty response)`);
        }

        broadcastFn({
          type: 'workflow_step', runId, channel, phase: 'done',
          stepIndex: i, stepId: step.id, stepName: step.name,
          totalSteps: steps.length,
        });
        stepSuccess = true;
        break;
      } catch (err) {
        clearTimeout(stepTimer);
        if (err.message.includes('超时')) { if (_cancelFn) _cancelFn(channel); }
        if (rs.status === 'stopped') break;

        if (attempt < maxRetries) {
          log.warn(`step ${step.id} attempt ${attempt + 1} failed: ${err.message}, retrying...`);
          broadcastFn({
            type: 'workflow_step', runId, channel, phase: 'retry',
            stepIndex: i, stepId: step.id, error: err.message,
            attempt: attempt + 1, maxRetries, totalSteps: steps.length,
          });
          attempt++;
          continue;
        }

        broadcastFn({
          type: 'workflow_step', runId, channel, phase: 'error',
          stepIndex: i, stepId: step.id, error: err.message,
          totalSteps: steps.length,
        });

        if (step.onError === 'skip') {
          addSysMsg(channel, `⏭ 步骤 ${i + 1}「${step.name}」失败已跳过: ${err.message}`);
          rs.outputs[step.id] = '';
          stepSuccess = true;
          break;
        }
        if (step.onError === 'rollback' && i > 0) {
          rs._rollbackCount = (rs._rollbackCount || 0) + 1;
          if (rs._rollbackCount > 3) {
            addSysMsg(channel, `❌ 步骤 ${i + 1}「${step.name}」回退次数过多，终止`);
            throw err;
          }
          addSysMsg(channel, `↩️ 步骤 ${i + 1}「${step.name}」失败，回退到步骤 ${i}`);
          i--;
          rs._didRollback = true;
          stepSuccess = true;
          break;
        }

        addSysMsg(channel, `❌ 步骤 ${i + 1} 失败: ${err.message}`);
        throw err;
      }
    }

    if (rs.status === 'stopped') break;
    if (!stepSuccess) break;

    if (rs._didRollback) {
      rs._didRollback = false;
      continue;
    }

    if (step.waitForApproval && i < steps.length - 1) {
      rs.status = 'waiting';
      addSysMsg(channel, `⏸ 步骤 ${i + 1} 完成，等待确认继续...`);
      broadcastFn({
        type: 'workflow_waiting', runId, channel,
        stepIndex: i, nextStepName: steps[i + 1]?.name || '',
      });

      const action = await waitForControl(rs);
      if (action === 'stop') { rs.status = 'stopped'; break; }
      if (action === 'skip') {
        addSysMsg(channel, `⏭ 跳过步骤 ${i + 2}: ${steps[i + 1]?.name || ''}`);
        i += 2;
        continue;
      }
    }

    i++;
  }

  const elapsed = Date.now() - rs.startTime;
  const t = elapsed > 60000
    ? `${Math.floor(elapsed / 60000)}m ${Math.floor((elapsed % 60000) / 1000)}s`
    : `${Math.floor(elapsed / 1000)}s`;

  if (rs.status === 'stopped') {
    addSysMsg(channel, '⏹ 工作流已终止');
    broadcastFn({ type: 'workflow_complete', runId, channel, status: 'stopped' });
  } else {
    addSysMsg(channel, `🎉 工作流完成！共 ${steps.length} 步，用时 ${t}`);
    broadcastFn({ type: 'workflow_complete', runId, channel, status: 'completed', elapsed });
  }

  activeRuns.delete(runId);
}

async function evaluateCondition(step, rs) {
  const expr = renderPrompt(step.conditionExpr || '', rs.input, rs.outputs);
  if (!expr.trim()) return true;

  if (step.conditionMode === 'llm') {
    if (!_sendFn || !step.agent) return true;
    try {
      const prompt = `请判断以下条件是否成立，只回答"是"或"否"：\n\n${expr}`;
      const result = await _sendFn(rs.channel, step.agent, prompt);
      if (!result?.ok || !result?.text) return true;
      const text = result.text.trim().toLowerCase();
      return text.includes('是') || text.includes('yes') || text.includes('true');
    } catch (err) {
      log.warn(`condition LLM eval failed: ${err.message}, defaulting to true`);
      return true;
    }
  }

  const lastStepId = rs.steps[rs.stepIndex > 0 ? rs.stepIndex - 1 : 0]?.id;
  const lastOutput = rs.outputs[lastStepId] || rs.input || '';
  return lastOutput.includes(expr);
}

function waitForControl(rs) {
  return new Promise(resolve => {
    const timeout = setTimeout(() => {
      if (rs._resolve) { rs._resolve = null; resolve('stop'); }
    }, 30 * 60 * 1000);

    rs._resolve = (action) => {
      clearTimeout(timeout);
      resolve(action);
    };
  });
}

function controlRun(runId, action) {
  const rs = activeRuns.get(runId);
  if (!rs) return { ok: false, error: 'run not found' };

  if (action === 'stop') {
    rs.status = 'stopped';
    if (_cancelFn) _cancelFn(rs.channel);
    if (rs._resolve) { rs._resolve('stop'); rs._resolve = null; }
    return { ok: true };
  }

  if (action === 'continue' || action === 'skip') {
    if (rs.status !== 'waiting') return { ok: false, error: 'not waiting' };
    if (rs._resolve) { rs._resolve(action); rs._resolve = null; }
    return { ok: true };
  }

  return { ok: false, error: 'unknown action' };
}

function getActiveRuns() {
  const runs = [];
  for (const [runId, rs] of activeRuns) {
    runs.push({
      runId, workflowId: rs.workflowId, workflowName: rs.workflowName,
      channel: rs.channel, stepIndex: rs.stepIndex, status: rs.status,
      totalSteps: rs.steps.length,
    });
  }
  return runs;
}

module.exports = {
  getAll, getById, create, update, remove,
  run, controlRun, getActiveRuns,
  setBroadcast, setSendFn, setCancelFn,
  renderPrompt, normalizeSteps, evaluateCondition,
};
