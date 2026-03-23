/**
 * M13 — 通用定时任务引擎 (Universal Task Scheduler)
 *
 * 支持 4 种任务类型：agent-prompt / group-prompt / workflow-run / meeting
 * 支持 3 种时间模式：cron / interval / once
 * 支持 3 种输出路由：chat / channel / silent
 */
const cron = require('node-cron');
const { getDB } = require('./database');
const { createLogger } = require('../middleware/logger');
const log = createLogger('task-scheduler');

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MIN_INTERVAL_MS = 60000;
const MAX_TASKS = 200;
const TASK_TIMEOUT_MS = 5 * 60 * 1000;

const MAX_TIMEOUT_MS = 2147483647; // 2^31-1, JS setTimeout limit (~24.8 days)

class TaskScheduler {
  constructor(ctx) {
    this.ctx = ctx;
    this._jobs = new Map();
    this._stopped = false;
  }

  // ── Lifecycle ──

  start() {
    this._stopped = false;
    const db = getDB();
    if (!db) { log.warn('DB not ready, skip loading tasks'); return; }
    try {
      const tasks = db.prepare('SELECT * FROM scheduled_tasks WHERE enabled = 1').all();
      for (const t of tasks) this._schedule(t);
      log.info(`started: ${tasks.length} active task(s)`);
    } catch (e) {
      log.warn('scheduled_tasks table not ready:', e.message);
    }
  }

  stop() {
    this._stopped = true;
    for (const [, handle] of this._jobs) this._clearHandle(handle);
    this._jobs.clear();
  }

  reload() {
    this.stop();
    this.start();
  }

  // ── CRUD ──

  createTask(data) {
    const db = getDB();
    const count = db.prepare('SELECT COUNT(*) as c FROM scheduled_tasks').get().c;
    if (count >= MAX_TASKS) throw new Error(`已达任务上限 (${MAX_TASKS})`);

    const ALLOWED_TYPES = ['agent-prompt', 'group-prompt', 'workflow-run', 'meeting'];
    if (!ALLOWED_TYPES.includes(data.type)) {
      throw new Error(`无效的任务类型: ${data.type}，支持: ${ALLOWED_TYPES.join(', ')}`);
    }
    const ALLOWED_KINDS = ['cron', 'interval', 'once'];
    if (!ALLOWED_KINDS.includes(data.scheduleKind)) {
      throw new Error(`无效的调度方式: ${data.scheduleKind}，支持: ${ALLOWED_KINDS.join(', ')}`);
    }

    const id = 'task-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const now = Date.now();

    if (data.scheduleKind === 'cron' && !cron.validate(data.scheduleExpr)) {
      throw new Error(`无效的 cron 表达式: ${data.scheduleExpr}`);
    }
    if (data.scheduleKind === 'interval') {
      const ms = parseInt(data.scheduleExpr, 10);
      if (!ms || ms < MIN_INTERVAL_MS) throw new Error(`间隔不能小于 ${MIN_INTERVAL_MS / 1000} 秒`);
    }
    if (data.scheduleKind === 'once') {
      const ts = new Date(data.scheduleExpr).getTime();
      if (isNaN(ts)) throw new Error(`无效的执行时间: ${data.scheduleExpr}`);
    }

    db.prepare(`
      INSERT INTO scheduled_tasks
        (id, name, type, schedule_kind, schedule_expr, timezone, target_id,
         payload, delivery_mode, delivery_target, enabled, created_by, created_at, delete_after_run)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `).run(
      id,
      data.name || '未命名任务',
      data.type,
      data.scheduleKind,
      data.scheduleExpr,
      data.timezone || 'Asia/Shanghai',
      data.targetId,
      JSON.stringify(data.payload || {}),
      data.deliveryMode || 'chat',
      data.deliveryTarget || null,
      data.createdBy || 'user',
      now,
      data.deleteAfterRun ? 1 : 0
    );

    const task = this._getTask(id);
    this._schedule(task);
    return task;
  }

  deleteTask(taskId) {
    this._unschedule(taskId);
    const db = getDB();
    const delTx = db.transaction(() => {
      db.prepare('DELETE FROM task_runs WHERE task_id = ?').run(taskId);
      db.prepare('DELETE FROM scheduled_tasks WHERE id = ?').run(taskId);
    });
    delTx();
  }

  updateTask(taskId, data) {
    const task = this._getTask(taskId);
    if (!task) throw new Error('任务不存在');

    const fields = [];
    const values = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.scheduleKind !== undefined && data.scheduleExpr !== undefined) {
      const ALLOWED_KINDS = ['cron', 'interval', 'once'];
      if (!ALLOWED_KINDS.includes(data.scheduleKind)) throw new Error(`无效的调度方式: ${data.scheduleKind}`);
      if (data.scheduleKind === 'cron' && !cron.validate(data.scheduleExpr)) throw new Error(`无效的 cron 表达式: ${data.scheduleExpr}`);
      if (data.scheduleKind === 'interval') {
        const ms = parseInt(data.scheduleExpr, 10);
        if (!ms || ms < MIN_INTERVAL_MS) throw new Error(`间隔不能小于 ${MIN_INTERVAL_MS / 1000} 秒`);
      }
      if (data.scheduleKind === 'once') {
        const ts = new Date(data.scheduleExpr).getTime();
        if (isNaN(ts)) throw new Error(`无效的执行时间: ${data.scheduleExpr}`);
      }
      fields.push('schedule_kind = ?', 'schedule_expr = ?');
      values.push(data.scheduleKind, data.scheduleExpr);
    }
    if (data.targetId !== undefined) { fields.push('target_id = ?'); values.push(data.targetId); }
    if (data.payload !== undefined) { fields.push('payload = ?'); values.push(JSON.stringify(data.payload)); }
    if (data.deleteAfterRun !== undefined) { fields.push('delete_after_run = ?'); values.push(data.deleteAfterRun ? 1 : 0); }

    if (!fields.length) return task;

    const db = getDB();
    values.push(taskId);
    db.prepare(`UPDATE scheduled_tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    if (task.enabled) {
      const updated = this._getTask(taskId);
      this._schedule(updated);
    }
    return this._getTask(taskId);
  }

  enableTask(taskId) {
    const db = getDB();
    db.prepare('UPDATE scheduled_tasks SET enabled = 1 WHERE id = ?').run(taskId);
    const task = this._getTask(taskId);
    if (task) this._schedule(task);
  }

  disableTask(taskId) {
    this._unschedule(taskId);
    const db = getDB();
    db.prepare('UPDATE scheduled_tasks SET enabled = 0 WHERE id = ?').run(taskId);
  }

  runNow(taskId) {
    const task = this._getTask(taskId);
    if (!task) throw new Error('任务不存在');
    this._execute(task);
  }

  listTasks(filter) {
    const db = getDB();
    if (filter?.type) {
      return db.prepare('SELECT * FROM scheduled_tasks WHERE type = ? ORDER BY created_at DESC').all(filter.type);
    }
    return db.prepare('SELECT * FROM scheduled_tasks ORDER BY created_at DESC').all();
  }

  getTaskStatus(taskId) {
    const task = this._getTask(taskId);
    if (!task) return null;
    const db = getDB();
    const recentRuns = db.prepare(
      'SELECT * FROM task_runs WHERE task_id = ? ORDER BY started DESC LIMIT 10'
    ).all(taskId);
    return { ...task, recentRuns };
  }

  getTaskCount() {
    try {
      const db = getDB();
      return db.prepare('SELECT COUNT(*) as c FROM scheduled_tasks').get().c;
    } catch { return 0; }
  }

  // ── Schedule helpers ──

  _getTask(taskId) {
    const db = getDB();
    return db.prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(taskId) || null;
  }

  _schedule(task) {
    this._unschedule(task.id);

    switch (task.schedule_kind) {
      case 'cron': {
        if (!cron.validate(task.schedule_expr)) {
          log.warn(`invalid cron "${task.schedule_expr}" for "${task.name}"`);
          return;
        }
        const opts = {};
        if (task.timezone) opts.timezone = task.timezone;
        const job = cron.schedule(task.schedule_expr, () => this._execute(task), opts);
        this._jobs.set(task.id, { type: 'cron', handle: job });
        break;
      }
      case 'interval': {
        const ms = parseInt(task.schedule_expr, 10);
        if (!ms || ms < MIN_INTERVAL_MS) return;
        const handle = setInterval(() => this._execute(task), ms);
        this._jobs.set(task.id, { type: 'interval', handle });
        break;
      }
      case 'once': {
        const targetTime = new Date(task.schedule_expr).getTime();
        const delay = targetTime - Date.now();
        if (delay <= 0) {
          setImmediate(() => this._execute(task));
        } else if (delay > MAX_TIMEOUT_MS) {
          const handle = setTimeout(() => { this._unschedule(task.id); this._schedule(task); }, MAX_TIMEOUT_MS);
          this._jobs.set(task.id, { type: 'once', handle });
        } else {
          const handle = setTimeout(() => this._execute(task), delay);
          this._jobs.set(task.id, { type: 'once', handle });
        }
        break;
      }
    }
    log.info(`scheduled: "${task.name}" (${task.schedule_kind}: ${task.schedule_expr})`);
  }

  _unschedule(taskId) {
    const entry = this._jobs.get(taskId);
    if (!entry) return;
    this._clearHandle(entry);
    this._jobs.delete(taskId);
  }

  _clearHandle(entry) {
    if (entry.type === 'cron' && entry.handle?.stop) entry.handle.stop();
    else if (entry.type === 'interval') clearInterval(entry.handle);
    else if (entry.type === 'once') clearTimeout(entry.handle);
  }

  // ── Execution ──

  async _execute(rawTask) {
    if (this._stopped) return;
    const task = this._getTask(rawTask.id);
    if (!task || !task.enabled) return;

    const runId = 'run-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4);
    const started = Date.now();
    log.info(`exec: "${task.name}" (${task.type} → ${task.target_id})`);

    const db = getDB();
    db.prepare(
      'UPDATE scheduled_tasks SET last_status = ?, last_run = ?, run_count = run_count + 1 WHERE id = ?'
    ).run('running', started, task.id);

    const payload = this._parsePayload(task.payload);
    const prompt = this._renderPrompt(payload.prompt || payload.template || '', task);

    let abortTimer;
    try {
      const result = await Promise.race([
        this._dispatch(task, prompt, payload),
        new Promise((_, reject) => {
          abortTimer = setTimeout(() => reject(new Error('执行超时')), TASK_TIMEOUT_MS);
        }),
      ]);
      clearTimeout(abortTimer);

      const duration = Date.now() - started;
      db.prepare(
        'INSERT INTO task_runs (id, task_id, status, started, finished, duration, summary) VALUES (?,?,?,?,?,?,?)'
      ).run(runId, task.id, 'success', started, Date.now(), duration, result?.summary || '');

      db.prepare(
        'UPDATE scheduled_tasks SET last_status = ?, last_error = NULL WHERE id = ?'
      ).run('success', task.id);

      if (task.delete_after_run) {
        log.info(`one-shot task "${task.name}" completed, deleting`);
        this.deleteTask(task.id);
      }
    } catch (err) {
      clearTimeout(abortTimer);
      log.error(`task "${task.name}" failed: ${err.message}`);

      db.prepare(
        'INSERT INTO task_runs (id, task_id, status, started, finished, error) VALUES (?,?,?,?,?,?)'
      ).run(runId, task.id, 'error', started, Date.now(), err.message);

      db.prepare(
        'UPDATE scheduled_tasks SET last_status = ?, last_error = ? WHERE id = ?'
      ).run('error', err.message, task.id);
    }

    try { this.ctx.broadcast({ type: 'task_scheduler_update', taskId: task.id }); } catch (be) {
      log.warn('broadcast failed:', be.message);
    }
  }

  async _dispatch(task, prompt, payload) {
    if (task.type !== 'workflow-run' && typeof this.ctx.sendFn !== 'function') {
      throw new Error('消息发送服务未就绪 (sendFn unavailable)');
    }
    switch (task.type) {
      case 'agent-prompt':   return this._execAgentPrompt(task, prompt, payload);
      case 'group-prompt':   return this._execGroupPrompt(task, prompt, payload);
      case 'workflow-run':   return this._execWorkflowRun(task, prompt, payload);
      case 'meeting':        return this._execMeeting(task, prompt, payload);
      default: throw new Error(`unknown task type: ${task.type}`);
    }
  }

  async _execAgentPrompt(task, prompt, _payload) {
    const agentId = task.target_id;
    const channel = agentId;
    const taggedPrompt = `[⏰ 定时任务 · ${task.name}]\n\n${prompt}`;
    await this.ctx.sendFn(channel, agentId, taggedPrompt);
    return { ok: true, summary: `Agent "${agentId}" 已收到并回复` };
  }

  async _execGroupPrompt(task, prompt, payload) {
    const groupId = task.target_id;
    const channel = 'g_' + groupId;
    const taggedPrompt = `[⏰ 定时任务 · ${task.name}]\n\n${prompt}`;
    const agents = this._getGroupAgents(groupId, payload);
    if (!agents.length) throw new Error(`群组 ${groupId} 无可用成员`);

    for (const agentId of agents) {
      try {
        await this.ctx.sendFn(channel, agentId, taggedPrompt);
        await this._sleep(3000);
      } catch (e) {
        log.warn(`group-prompt to ${agentId} failed: ${e.message}`);
      }
    }
    return { ok: true, summary: `群组 "${groupId}" 已触发，${agents.length} 个成员已通知` };
  }

  async _execWorkflowRun(task, prompt, _payload) {
    const workflowId = task.target_id;
    const workflow = require('./workflow');
    const run = await workflow.run(workflowId, prompt || undefined);
    return { ok: true, summary: `工作流 "${workflowId}" 已触发 (run: ${run?.runId || 'started'})` };
  }

  async _execMeeting(task, prompt, payload) {
    const participants = payload.participants || [];
    const allAgents = this.ctx.getAgents ? this.ctx.getAgents() : [];
    const agents = participants.length > 0
      ? participants.map(id => allAgents.find(a => a.id === id)).filter(Boolean)
      : allAgents;

    for (const agent of agents) {
      try {
        await this.ctx.sendFn(agent.id, agent.id, `[⏰ 定时例会 · ${task.name}]\n\n${prompt}\n\n请简要回复（200字以内）。`);
        await this._sleep(5000);
      } catch (e) {
        log.warn(`meeting notify ${agent.id} failed: ${e.message}`);
      }
    }
    return { ok: true, summary: `例会 "${task.name}" 已通知 ${agents.length} 位参与者` };
  }

  // ── Helpers ──

  _getGroupAgents(groupId, payload) {
    const groups = this.ctx.getGroups ? this.ctx.getGroups() : [];
    const group = groups.find(g => g.id === groupId);
    if (!group) return [];
    const mention = payload.mentionAgents;
    if (mention && mention[0] !== 'all') return mention;
    return group.members || [];
  }

  _parsePayload(raw) {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(raw); } catch { return {}; }
  }

  _renderPrompt(template, task) {
    if (!template) return '';
    const now = new Date();
    const vars = {
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 8),
      weekday: '星期' + WEEKDAYS[now.getDay()],
      datetime: now.toLocaleString('zh-CN'),
      taskName: task.name || '',
      runCount: String(task.run_count || 0),
      lastRun: task.last_run ? new Date(task.last_run).toLocaleString('zh-CN') : '首次执行',
    };
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  }

  _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ── Migration: import old schedules from store.schedules ──

  migrateOldSchedules(oldSchedules) {
    if (!oldSchedules || !oldSchedules.length) return 0;
    const db = getDB();
    try { db.prepare('SELECT 1 FROM scheduled_tasks LIMIT 1').get(); } catch {
      log.warn('scheduled_tasks table not ready, skipping migration');
      return 0;
    }
    let migrated = 0;

    for (const s of oldSchedules) {
      const exists = db.prepare('SELECT id FROM scheduled_tasks WHERE id = ?').get(s.id);
      if (exists) continue;

      try {
        db.prepare(`
          INSERT INTO scheduled_tasks
            (id, name, type, schedule_kind, schedule_expr, timezone, target_id,
             payload, delivery_mode, enabled, created_by, created_at, delete_after_run, last_run, run_count)
          VALUES (?, ?, 'meeting', 'cron', ?, 'Asia/Shanghai', 'meeting',
                  ?, 'chat', ?, 'migration', ?, 0, ?, 0)
        `).run(
          s.id,
          s.name || '例会',
          s.cron || '0 9 * * 1-5',
          JSON.stringify({ template: s.template || '', participants: s.participants || [] }),
          s.enabled !== false ? 1 : 0,
          s.createdAt || Date.now(),
          s.lastRun || null,
        );
        migrated++;
      } catch (e) {
        log.warn(`migrate schedule "${s.name}" failed: ${e.message}`);
      }
    }
    if (migrated) log.info(`migrated ${migrated} old schedule(s) → scheduled_tasks`);
    return migrated;
  }
}

module.exports = TaskScheduler;
