const store = require('../services/storage');
const gw = require('../services/gateway');
const { guardOwner, guardRole, jsonRes, readBody } = require('../middleware/auth');
const guardAdmin = guardRole('admin');

async function handle(req, res, urlPath, query) {
  // ── Posts (read-only event stream) ──
  if (urlPath === '/api/community/posts' && req.method === 'GET') {
    const topicFilter = query.get('topic');
    let posts;
    if (topicFilter) {
      posts = store.getPostsByTopic(topicFilter, 100);
    } else {
      posts = store.getAllPosts(100);
    }
    const typeFilter = query.get('type');
    if (typeFilter) posts = posts.filter(p => p.type === typeFilter);
    return jsonRes(res, 200, { posts });
  }
  const postMatch = urlPath.match(/^\/api\/community\/posts\/([^/]+)$/);
  if (postMatch && req.method === 'GET') {
    const post = store.getPost(postMatch[1]);
    return jsonRes(res, 200, { post: post || null });
  }
  if (postMatch && req.method === 'DELETE') {
    if (!guardAdmin(req, res)) return;
    store.deletePost(postMatch[1]);
    gw.broadcast({ type: 'community_update' });
    return jsonRes(res, 200, { ok: true });
  }

  // ── Topics (read-only, kept for frontend loadTopics compatibility) ──
  if (urlPath === '/api/community/topics' && req.method === 'GET') return jsonRes(res, 200, { topics: store.topics });

  // ── Profiles ──
  const profileMatch = urlPath.match(/^\/api\/profiles\/([^/]+)$/);
  if (profileMatch && req.method === 'GET') {
    const id = profileMatch[1];
    const ag = gw.knownAgents.find(a => a.id === id);
    const prof = store.profiles[id] || {};
    const met = store.getMetric(id);
    let soul = '';
    try {
      store.loadAgents();
      const agent = store.localAgents.find(a => a.id === id);
      if (agent) {
        const ws = agent.workspace || require('path').join(require('../config').DATA_DIR, `workspace-${id}`);
        soul = require('fs').readFileSync(require('path').join(ws, 'SOUL.md'), 'utf8');
      }
    } catch {}
    return jsonRes(res, 200, { agent: ag, profile: prof, metrics: met, soul });
  }
  if (profileMatch && req.method === 'PUT') {
    if (!guardOwner(req, res)) return;
    const id = profileMatch[1];
    const body = await readBody(req);
    const allowed = ['bio', 'tags', 'supervisor'];
    const existing = store.profiles[id] || {};
    for (const k of allowed) { if (body[k] !== undefined) existing[k] = body[k]; }
    existing.updatedAt = Date.now();
    store.profiles[id] = existing;
    store.saveProfiles();
    return jsonRes(res, 200, { ok: true });
  }

  // ── Metrics ──
  if (urlPath === '/api/metrics' && req.method === 'GET') return jsonRes(res, 200, { metrics: store.getAllMetrics() });
  const metricsMatch = urlPath.match(/^\/api\/metrics\/([^/]+)$/);
  if (metricsMatch && req.method === 'GET') return jsonRes(res, 200, { metrics: store.getMetric(metricsMatch[1]) });
  if (metricsMatch && req.method === 'POST') {
    if (!guardAdmin(req, res)) return;
    const body = await readBody(req);
    if (body.rating && body.fromId) {
      store.addRating(metricsMatch[1], body.fromId, body.rating);
      return jsonRes(res, 200, { ok: true });
    }
    return jsonRes(res, 400, { error: 'rating and fromId required' });
  }

  // ── Schedules ──
  if (urlPath === '/api/schedules' && req.method === 'GET') return jsonRes(res, 200, { schedules: store.schedules });
  if (urlPath === '/api/schedules' && req.method === 'POST') {
    if (!guardAdmin(req, res)) return;
    const body = await readBody(req);
    const sched = {
      id: 'sched-' + Date.now().toString(36), name: body.name || '例会',
      cron: body.cron || '0 9 * * 1-5', participants: body.participants || [],
      template: body.template || '请汇报今天的工作计划和进展。',
      enabled: body.enabled !== false, lastRun: null, createdAt: Date.now(),
    };
    store.schedules.push(sched); store.saveSchedules();
    if (global.scheduler) global.scheduler.reload();
    return jsonRes(res, 200, { ok: true, schedule: sched });
  }
  const schedMatch = urlPath.match(/^\/api\/schedules\/([^/]+)$/);
  if (schedMatch && req.method === 'PUT') {
    if (!guardAdmin(req, res)) return;
    const body = await readBody(req);
    const s = store.schedules.find(sc => sc.id === schedMatch[1]);
    if (!s) throw new Error('not found');
    const safeBody = {}; for (const k of Object.keys(body)) { if (k !== '__proto__' && k !== 'constructor' && k !== 'prototype') safeBody[k] = body[k]; }
    Object.assign(s, safeBody, { id: s.id });
    store.saveSchedules();
    if (global.scheduler) global.scheduler.reload();
    return jsonRes(res, 200, { ok: true });
  }
  if (schedMatch && req.method === 'DELETE') {
    if (!guardAdmin(req, res)) return;
    store.schedules = store.schedules.filter(sc => sc.id !== schedMatch[1]); store.saveSchedules();
    if (global.scheduler) global.scheduler.reload();
    return jsonRes(res, 200, { ok: true });
  }
  if (urlPath === '/api/schedules/run' && req.method === 'POST') {
    if (!guardAdmin(req, res)) return;
    const body = await readBody(req);
    if (global.scheduler) global.scheduler.runMeeting(body.id);
    return jsonRes(res, 200, { ok: true });
  }

  // ── Scheduled Tasks (M13) ──
  if (urlPath === '/api/tasks' && req.method === 'GET') {
    if (!guardAdmin(req, res)) return;
    const ts = global.taskScheduler;
    if (!ts) return jsonRes(res, 200, { tasks: [] });
    const typeFilter = query.get('type');
    const tasks = ts.listTasks(typeFilter ? { type: typeFilter } : undefined);
    return jsonRes(res, 200, { tasks });
  }
  if (urlPath === '/api/tasks' && req.method === 'POST') {
    if (!guardAdmin(req, res)) return;
    const body = await readBody(req);
    const ts = global.taskScheduler;
    if (!ts) return jsonRes(res, 500, { error: 'task-scheduler not ready' });
    try {
      const task = ts.createTask(body);
      return jsonRes(res, 200, { ok: true, task });
    } catch (e) { return jsonRes(res, 400, { error: e.message }); }
  }
  if (urlPath === '/api/tasks/run' && req.method === 'POST') {
    if (!guardAdmin(req, res)) return;
    const body = await readBody(req);
    const ts = global.taskScheduler;
    if (!ts) return jsonRes(res, 500, { error: 'not ready' });
    try {
      ts.runNow(body.id);
      return jsonRes(res, 200, { ok: true });
    } catch (e) { return jsonRes(res, 400, { error: e.message }); }
  }
  const taskMatch = urlPath.match(/^\/api\/tasks\/([^/]+)$/);
  if (taskMatch && req.method === 'GET') {
    if (!guardAdmin(req, res)) return;
    const ts = global.taskScheduler;
    if (!ts) return jsonRes(res, 404, { error: 'not found' });
    const info = ts.getTaskStatus(taskMatch[1]);
    if (!info) return jsonRes(res, 404, { error: 'task not found' });
    return jsonRes(res, 200, { task: info });
  }
  if (taskMatch && req.method === 'PUT') {
    if (!guardAdmin(req, res)) return;
    const body = await readBody(req);
    const ts = global.taskScheduler;
    if (!ts) return jsonRes(res, 500, { error: 'not ready' });
    try {
      if (body.enabled === true) ts.enableTask(taskMatch[1]);
      else if (body.enabled === false) ts.disableTask(taskMatch[1]);
      const hasUpdate = ['name', 'scheduleKind', 'scheduleExpr', 'targetId', 'payload', 'deleteAfterRun'].some(k => k in body);
      if (hasUpdate) ts.updateTask(taskMatch[1], body);
      return jsonRes(res, 200, { ok: true });
    } catch (e) { return jsonRes(res, 400, { error: e.message }); }
  }
  if (taskMatch && req.method === 'DELETE') {
    if (!guardAdmin(req, res)) return;
    const ts = global.taskScheduler;
    if (!ts) return jsonRes(res, 500, { error: 'not ready' });
    ts.deleteTask(taskMatch[1]);
    return jsonRes(res, 200, { ok: true });
  }

  return false;
}

module.exports = { handle };
