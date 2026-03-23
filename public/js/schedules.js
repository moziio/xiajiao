/* 虾饺 (Xiajiao) — Metrics & Schedules Module (Layer 2) */

function renderMetricsDashboard(allMetrics) {
  if (!Object.keys(allMetrics).length) { metricsDashboard.innerHTML = '<div class="empty-hint">' + t('common.noData') + '</div>'; return; }
  metricsDashboard.innerHTML = AGENTS.map(ag => { const m = allMetrics[ag.id] || {}; const avgR = m.ratings?.length ? (m.ratings.reduce((s, r) => s + r.score, 0) / m.ratings.length).toFixed(1) : '-'; const sagid = escJs(ag.id); return `<div class="metric-card"><div class="metric-card-header"><div class="metric-card-avatar" onclick="openProfile('${sagid}')" style="background:${ag.color}">${ag.emoji}</div><div class="metric-card-name">${esc(ag.name)}</div><div class="metric-card-rating">&#9733; ${avgR}</div></div><div class="metric-grid"><div class="metric-stat"><div class="metric-stat-value">${m.messages||0}</div><div class="metric-stat-label">${t('common.metrics.messages')}</div></div><div class="metric-stat"><div class="metric-stat-value">${m.tasks||0}</div><div class="metric-stat-label">${t('common.metrics.tasks')}</div></div><div class="metric-stat"><div class="metric-stat-value">${m.posts||0}</div><div class="metric-stat-label">${t('common.metrics.posts')}</div></div><div class="metric-stat"><div class="metric-stat-value">${m.comments||0}</div><div class="metric-stat-label">${t('common.metrics.comments')}</div></div><div class="metric-stat"><div class="metric-stat-value">${m.reviews||0}</div><div class="metric-stat-label">${t('common.metrics.reviews')}</div></div></div></div>`; }).join('');
}

// ══════════════════════════════════════
// ── M13 Scheduled Tasks ──
// ══════════════════════════════════════

let _tasksList = [];

const _TYPE_KEYS = {
  'agent-prompt':  { icon: '🤖', key: 'schedule.typeAgent',    color: '#00d4ff' },
  'group-prompt':  { icon: '👥', key: 'schedule.typeGroup',    color: '#8b5cf6' },
  'workflow-run':  { icon: '⚙️', key: 'schedule.typeWorkflow', color: '#ff8a00' },
  'meeting':       { icon: '📋', key: 'schedule.typeMeeting',  color: '#00f5a0' },
};

function _taskMeta(type) {
  const m = _TYPE_KEYS[type];
  if (!m) return { icon: '⏰', label: type, color: '#6b7fa0' };
  return { icon: m.icon, label: t(m.key), color: m.color };
}

function _statusBadge(status) {
  const map = {
    success: { dot: '#22c55e', key: 'schedule.statusSuccess' },
    error:   { dot: '#ef4444', key: 'schedule.statusError' },
    running: { dot: '#f59e0b', key: 'schedule.statusRunning' },
    idle:    { dot: '#6b7fa0', key: 'schedule.statusIdle' },
  };
  const s = map[status] || map.idle;
  return `<span class="task-status-badge"><span class="task-dot" style="background:${s.dot}"></span>${t(s.key)}</span>`;
}

function _cronToHuman(kind, expr) {
  if (kind === 'once') {
    try { return t('schedule.cronOnce', { time: new Date(expr).toLocaleString() }); } catch { return expr; }
  }
  if (kind === 'interval') {
    const mins = Math.round(parseInt(expr, 10) / 60000);
    if (mins >= 60) return t('schedule.cronIntervalHour', { n: Math.round(mins / 60) });
    return t('schedule.cronIntervalMin', { n: mins });
  }
  const parts = (expr || '').split(' ');
  if (parts.length < 5) return expr;
  const [min, hr, dom, mon, dow] = parts;

  if (min.startsWith('*/')) return t('schedule.cronEveryNMin', { n: min.slice(2) });
  if (hr.startsWith('*/')) return t('schedule.cronEveryNHour', { n: hr.slice(2) });

  const dowMap = {
    '1-5': t('schedule.cronWeekdays'), '*': '',
    '1': t('schedule.cronMon'), '2': t('schedule.cronTue'),
    '3': t('schedule.cronWed'), '4': t('schedule.cronThu'),
    '5': t('schedule.cronFri'), '6': t('schedule.cronSat'),
    '0': t('schedule.cronSun'), '1,3,5': t('schedule.cronMWF'),
  };
  let dayPart = dowMap[dow];
  if (dayPart === undefined) return 'cron ' + expr;
  if (dow === '*' && dom !== '*' && mon !== '*') dayPart = t('schedule.cronMonthDayFull', { month: mon, day: dom });
  else if (dow === '*' && dom !== '*') dayPart = t('schedule.cronMonthDay', { day: dom });
  if (!dayPart) dayPart = t('schedule.cronDaily');
  const timePart = hr.includes(',')
    ? hr.split(',').map(h => h.padStart(2, '0') + ':' + (min === '*' ? '00' : min.padStart(2, '0'))).join(' & ')
    : (hr === '*' ? t('schedule.cronHourly') : hr.padStart(2, '0') + ':' + (min === '*' ? '00' : min.padStart(2, '0')));
  return dayPart + ' ' + timePart;
}

function _findTargetName(type, targetId) {
  if (type === 'agent-prompt' || type === 'meeting') {
    const a = (typeof AGENTS !== 'undefined' ? AGENTS : []).find(x => x.id === targetId);
    return a ? a.name : targetId;
  }
  if (type === 'group-prompt') {
    const g = (typeof customGroups !== 'undefined' ? customGroups : []).find(x => x.id === targetId);
    return g ? g.name : targetId;
  }
  if (type === 'workflow-run') {
    const w = (typeof workflowDefs !== 'undefined' ? workflowDefs : []).find(x => x.id === targetId);
    return w ? w.name : targetId;
  }
  return targetId;
}

// ── Render ──

function renderScheduleList() {
  const hasTasks = _tasksList.length > 0;
  const hasOld = schedulesList.length > 0;

  if (!hasTasks && !hasOld) {
    scheduleList.innerHTML = `
      <div class="task-empty">
        <div class="task-empty-icon">⏰</div>
        <div class="task-empty-title">${t('schedule.emptyTitle')}</div>
        <div class="task-empty-desc">${t('schedule.emptyDesc')}</div>
        ${canManage() ? '<button class="btn-primary" onclick="openCreateTask()" style="margin-top:12px">' + t('schedule.newTaskBtn') + '</button>' : ''}
      </div>`;
    return;
  }

  let html = '';
  if (hasTasks) html += _tasksList.map(_renderTaskCard).join('');

  if (hasOld) {
    if (hasTasks) html += '<div class="task-section-divider">' + t('schedule.oldSectionTitle') + '</div>';
    html += schedulesList.map(s => {
      const ssid = escJs(s.id);
      return `<div class="schedule-card"><button class="schedule-toggle ${s.enabled ? 'on' : 'off'}" onclick="toggleSchedule('${ssid}',${!s.enabled})"></button><div class="schedule-info"><div class="schedule-name">${esc(s.name)}</div><div class="schedule-cron">${esc(s.cron)}</div><div class="schedule-meta">${t('schedule.participants', {count: s.participants?.length || 0})} ${s.lastRun ? ' · ' + t('schedule.lastRun') + formatTime(s.lastRun) : ''}</div></div><div class="schedule-actions"><button onclick="runScheduleNow('${ssid}')" title="${t('schedule.triggered')}">&#9654;</button><button onclick="deleteSchedule('${ssid}')" title="${t('common.delete')}" class="danger">&#128465;</button></div></div>`;
    }).join('');
  }

  scheduleList.innerHTML = html;
}

function _renderTaskCard(task) {
  const sid = escJs(task.id);
  const meta = _taskMeta(task.type);
  const sched = _cronToHuman(task.schedule_kind, task.schedule_expr);
  const target = _findTargetName(task.type, task.target_id);
  const badge = _statusBadge(task.last_status);
  const lastInfo = task.last_run ? formatTime(task.last_run) : '';
  const countStr = task.run_count > 0 ? t('schedule.runCountUnit', { count: task.run_count }) : t('schedule.runCountNone');
  const errLine = (task.last_status === 'error' && task.last_error)
    ? `<div class="task-card-error">${t('schedule.errorPrefix')}${esc(task.last_error).slice(0, 80)}</div>` : '';

  return `<div class="task-card ${task.enabled ? '' : 'task-card-disabled'}">
    <div class="task-card-left">
      <button class="schedule-toggle ${task.enabled ? 'on' : 'off'}" onclick="toggleTask('${sid}',${!task.enabled})" aria-label="${task.enabled ? 'Disable' : 'Enable'}"></button>
    </div>
    <div class="task-card-body">
      <div class="task-card-row1">
        <span class="task-type-badge" style="--badge-color:${meta.color}">${meta.icon} ${meta.label}</span>
        ${badge}
      </div>
      <div class="task-card-name">${esc(task.name)}</div>
      <div class="task-card-detail">
        <span title="${t('schedule.targetLabel')}">📌 ${esc(target)}</span>
        <span title="${t('schedule.schedLabel')}">🕐 ${esc(sched)}</span>
        <span title="${t('schedule.runCountLabel')}">🔄 ${countStr}</span>
        ${lastInfo ? '<span title="' + t('schedule.lastRunLabel') + '">📅 ' + lastInfo + '</span>' : ''}
      </div>
      ${errLine}
    </div>
    <div class="task-card-actions">
      <button onclick="openEditTask('${sid}')" title="${t('schedule.editBtn')}" class="task-act-btn">✎</button>
      <button onclick="runTaskNow('${sid}')" title="${t('schedule.runNowBtn')}" class="task-act-btn">▶</button>
      <button onclick="deleteTask('${sid}')" title="${t('schedule.deleteBtn')}" class="task-act-btn task-act-danger">✕</button>
    </div>
  </div>`;
}

// ── CRUD ──

async function loadTasks() {
  try {
    const resp = await authFetch('/api/tasks');
    if (!resp.ok) { _tasksList = []; return; }
    const data = await resp.json();
    _tasksList = data.tasks || [];
  } catch { _tasksList = []; }
}

async function toggleTask(id, enabled) {
  try {
    await authFetch('/api/tasks/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) });
    showSchedules();
  } catch {}
}
async function runTaskNow(id) {
  try {
    await authFetch('/api/tasks/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    showToastMsg(t('schedule.taskTriggered'));
  } catch {}
}
async function deleteTask(id) {
  if (!await appConfirm(t('schedule.deleteTaskConfirm'))) return;
  try { await authFetch('/api/tasks/' + id, { method: 'DELETE' }); showSchedules(); } catch {}
}

// ── Create Modal ──

function _cronPresets() {
  return [
    { label: t('schedule.presetDaily9'),     value: '0 9 * * *' },
    { label: t('schedule.presetWeekday9'),   value: '0 9 * * 1-5' },
    { label: t('schedule.presetTwiceDaily'), value: '0 8,20 * * *' },
    { label: t('schedule.presetFri17'),      value: '0 17 * * 5' },
    { label: t('schedule.presetHourly'),     value: '0 * * * *' },
    { label: t('schedule.presetHalfHour'),   value: '*/30 * * * *' },
    { label: t('schedule.presetMonthly'),    value: '0 9 1 * *' },
  ];
}

function openCreateTask() {
  const agents = typeof AGENTS !== 'undefined' ? AGENTS : [];
  const groups = typeof customGroups !== 'undefined' ? customGroups : [];
  const wfs = typeof workflowDefs !== 'undefined' ? workflowDefs : [];

  const agentOpts = agents.map(a => `<option value="${escH(a.id)}">${a.emoji || '🤖'} ${esc(a.name)}</option>`).join('');
  const groupOpts = groups.length ? groups.map(g => `<option value="${escH(g.id)}">${g.emoji || '👥'} ${esc(g.name)}</option>`).join('') : '<option value="" disabled>' + t('schedule.noGroups') + '</option>';
  const wfOpts = wfs.length ? wfs.map(w => `<option value="${escH(w.id)}">${w.emoji || '⚙️'} ${esc(w.name)}</option>`).join('') : '<option value="" disabled>' + t('schedule.noWorkflows') + '</option>';
  const cronBtns = _cronPresets().map(p => `<button type="button" class="cron-preset-btn" onclick="_applyCronPreset('${escJs(p.value)}')">${esc(p.label)}</button>`).join('');

  postModal.classList.remove('hidden');
  postModal.querySelector('.modal-content').innerHTML = `
    <div class="modal-header"><h3>${t('schedule.createTaskTitle')}</h3><button class="modal-close" onclick="postModal.classList.add('hidden')">&times;</button></div>
    <div class="modal-body"><div class="manage-form" style="border:none;padding-top:0;margin-top:0">

      <div class="task-form-section">
        <div class="task-form-section-title">${t('schedule.sectionWhat')}</div>
        <label>${t('schedule.taskTypeLabel')}</label>
        <div class="task-type-picker" id="taskTypePicker">
          <button type="button" class="task-type-opt active" data-type="agent-prompt" onclick="_pickTaskType(this)">🤖 ${t('schedule.typeAgent')}</button>
          <button type="button" class="task-type-opt" data-type="group-prompt" onclick="_pickTaskType(this)">👥 ${t('schedule.typeGroup')}</button>
          <button type="button" class="task-type-opt" data-type="workflow-run" onclick="_pickTaskType(this)">⚙️ ${t('schedule.typeWorkflow')}</button>
        </div>
        <input type="hidden" id="taskType" value="agent-prompt" />

        <label>${t('schedule.targetSelectLabel')}</label>
        <select id="taskTargetAgent">${agentOpts}</select>
        <select id="taskTargetGroup" class="hidden">${groupOpts}</select>
        <select id="taskTargetWorkflow" class="hidden">${wfOpts}</select>

        <label>${t('schedule.taskNameLabel')}</label>
        <input id="taskName" placeholder="${t('schedule.taskNamePH')}" />
      </div>

      <div class="task-form-section">
        <div class="task-form-section-title">${t('schedule.sectionWhen')}</div>
        <label>${t('schedule.schedKindLabel')}</label>
        <select id="taskSchedKind" onchange="_onSchedKindChange()">
          <option value="cron">${t('schedule.schedCron')}</option>
          <option value="interval">${t('schedule.schedInterval')}</option>
          <option value="once">${t('schedule.schedOnce')}</option>
        </select>

        <div id="taskCronWrap">
          <label>${t('schedule.commonTimesLabel')}</label>
          <div class="cron-presets">${cronBtns}</div>
          <label style="margin-top:10px">${t('schedule.cronAdvancedLabel')} <span style="font-weight:400;color:var(--text3)">${t('schedule.cronAdvancedSuffix')}</span></label>
          <input id="taskCron" value="0 9 * * *" placeholder="${t('schedule.cronPlaceholder')}" style="font-family:monospace" oninput="_updateCronHint()" />
          <div class="hint" id="taskCronHint"></div>
        </div>
        <div id="taskIntervalWrap" class="hidden">
          <label>${t('schedule.intervalLabel')}</label>
          <input id="taskInterval" type="number" min="1" value="60" />
          <div class="hint">${t('schedule.intervalHint')}</div>
        </div>
        <div id="taskOnceWrap" class="hidden">
          <label>${t('schedule.onceLabel')}</label>
          <input id="taskOnce" type="datetime-local" />
        </div>
      </div>

      <div class="task-form-section">
        <div class="task-form-section-title">${t('schedule.sectionPrompt')}</div>
        <label>${t('schedule.promptLabel')} <span style="font-weight:400;color:var(--text3)">${t('schedule.promptSuffix')}</span></label>
        <textarea id="taskPrompt" rows="3" placeholder="${t('schedule.promptPH')}"></textarea>
      </div>

      <button class="btn-primary" onclick="submitTask()" style="margin-top:16px;width:100%;padding:12px;font-size:14px">${t('schedule.createAndStart')}</button>
      <div id="taskFormMsg" class="form-msg" style="margin-top:8px"></div>
    </div></div>`;

  _onSchedKindChange();
  const onceInput = $('#taskOnce');
  if (onceInput) {
    const now = new Date(); now.setMinutes(now.getMinutes() + 30);
    onceInput.value = now.toISOString().slice(0, 16);
  }
  _updateCronHint();
}

function _pickTaskType(btn) {
  document.querySelectorAll('.task-type-opt').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const type = btn.dataset.type;
  $('#taskType').value = type;
  $('#taskTargetAgent').classList.toggle('hidden', type !== 'agent-prompt');
  $('#taskTargetGroup').classList.toggle('hidden', type !== 'group-prompt');
  $('#taskTargetWorkflow').classList.toggle('hidden', type !== 'workflow-run');
}

function _onSchedKindChange() {
  const kind = ($('#taskSchedKind') || {}).value || 'cron';
  const cw = $('#taskCronWrap'), iw = $('#taskIntervalWrap'), ow = $('#taskOnceWrap');
  if (cw) cw.classList.toggle('hidden', kind !== 'cron');
  if (iw) iw.classList.toggle('hidden', kind !== 'interval');
  if (ow) ow.classList.toggle('hidden', kind !== 'once');
}

function _applyCronPreset(val) {
  const inp = $('#taskCron');
  if (inp) { inp.value = val; _updateCronHint(); }
}

function _updateCronHint() {
  const inp = $('#taskCron'), hint = $('#taskCronHint');
  if (!inp || !hint) return;
  hint.textContent = '= ' + _cronToHuman('cron', inp.value);
}

async function submitTask() {
  const msg = $('#taskFormMsg');
  const type = $('#taskType').value;
  const name = ($('#taskName').value || '').trim();
  const schedKind = $('#taskSchedKind').value;
  const prompt = ($('#taskPrompt').value || '').trim();

  let targetId;
  if (type === 'agent-prompt') targetId = ($('#taskTargetAgent') || {}).value;
  else if (type === 'group-prompt') targetId = ($('#taskTargetGroup') || {}).value;
  else if (type === 'workflow-run') targetId = ($('#taskTargetWorkflow') || {}).value;

  if (!targetId) { msg.textContent = t('schedule.validationTarget'); return; }
  if (!name) { msg.textContent = t('schedule.validationName'); return; }

  const body = { name, type, targetId, payload: { prompt } };

  if (schedKind === 'cron') {
    body.scheduleKind = 'cron';
    body.scheduleExpr = ($('#taskCron').value || '').trim() || '0 9 * * *';
  } else if (schedKind === 'interval') {
    body.scheduleKind = 'interval';
    const mins = parseInt($('#taskInterval').value, 10) || 60;
    body.scheduleExpr = String(Math.max(mins, 1) * 60000);
  } else {
    body.scheduleKind = 'once';
    const dt = $('#taskOnce').value;
    if (!dt) { msg.textContent = t('schedule.validationOnce'); return; }
    body.scheduleExpr = new Date(dt).toISOString();
    body.deleteAfterRun = true;
  }

  msg.textContent = '';
  try {
    const resp = await authFetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!resp.ok) { const d = await resp.json().catch(() => ({})); throw new Error(d.error || 'HTTP ' + resp.status); }
    postModal.classList.add('hidden');
    showToastMsg(t('schedule.taskCreated'));
    showSchedules();
  } catch (e) {
    msg.textContent = t('schedule.createFailed', { error: e.message || e });
  }
}

// ── Edit Task ──

function openEditTask(taskId) {
  const task = _tasksList.find(tk => tk.id === taskId);
  if (!task) return;

  openCreateTask();

  const titleEl = postModal.querySelector('.modal-header h3');
  if (titleEl) titleEl.textContent = t('schedule.editTaskTitle');

  const payload = typeof task.payload === 'string' ? (function(){ try { return JSON.parse(task.payload); } catch { return {}; } })() : (task.payload || {});

  const typeBtn = postModal.querySelector(`.task-type-opt[data-type="${task.type}"]`);
  if (typeBtn) _pickTaskType(typeBtn);

  const nameInput = $('#taskName');
  if (nameInput) nameInput.value = task.name || '';

  if (task.type === 'agent-prompt') { const sel = $('#taskTargetAgent'); if (sel) sel.value = task.target_id; }
  else if (task.type === 'group-prompt') { const sel = $('#taskTargetGroup'); if (sel) sel.value = task.target_id; }
  else if (task.type === 'workflow-run') { const sel = $('#taskTargetWorkflow'); if (sel) sel.value = task.target_id; }

  const kindSel = $('#taskSchedKind');
  if (kindSel) { kindSel.value = task.schedule_kind; _onSchedKindChange(); }

  if (task.schedule_kind === 'cron') {
    const cronInput = $('#taskCron'); if (cronInput) { cronInput.value = task.schedule_expr; _updateCronHint(); }
  } else if (task.schedule_kind === 'interval') {
    const intInput = $('#taskInterval'); if (intInput) intInput.value = Math.round(parseInt(task.schedule_expr, 10) / 60000);
  } else if (task.schedule_kind === 'once') {
    const onceInput = $('#taskOnce');
    if (onceInput) { try { onceInput.value = new Date(task.schedule_expr).toISOString().slice(0, 16); } catch {} }
  }

  const promptInput = $('#taskPrompt');
  if (promptInput) promptInput.value = payload.prompt || payload.template || '';

  const submitBtn = postModal.querySelector('.btn-primary[onclick="submitTask()"]');
  if (submitBtn) {
    submitBtn.textContent = t('schedule.saveChanges');
    submitBtn.setAttribute('onclick', `submitEditTask('${escJs(taskId)}')`);
  }
}

async function submitEditTask(taskId) {
  const msg = $('#taskFormMsg');
  const type = $('#taskType').value;
  const name = ($('#taskName').value || '').trim();
  const schedKind = $('#taskSchedKind').value;
  const prompt = ($('#taskPrompt').value || '').trim();

  let targetId;
  if (type === 'agent-prompt') targetId = ($('#taskTargetAgent') || {}).value;
  else if (type === 'group-prompt') targetId = ($('#taskTargetGroup') || {}).value;
  else if (type === 'workflow-run') targetId = ($('#taskTargetWorkflow') || {}).value;

  if (!targetId) { msg.textContent = t('schedule.validationTarget'); return; }
  if (!name) { msg.textContent = t('schedule.validationName'); return; }

  const body = { name, type, targetId, payload: { prompt } };

  if (schedKind === 'cron') {
    body.scheduleKind = 'cron';
    body.scheduleExpr = ($('#taskCron').value || '').trim() || '0 9 * * *';
  } else if (schedKind === 'interval') {
    body.scheduleKind = 'interval';
    const mins = parseInt($('#taskInterval').value, 10) || 60;
    body.scheduleExpr = String(Math.max(mins, 1) * 60000);
  } else {
    body.scheduleKind = 'once';
    const dt = $('#taskOnce').value;
    if (!dt) { msg.textContent = t('schedule.validationOnce'); return; }
    body.scheduleExpr = new Date(dt).toISOString();
    body.deleteAfterRun = true;
  }

  msg.textContent = '';
  try {
    const resp = await authFetch('/api/tasks/' + taskId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!resp.ok) { const d = await resp.json().catch(() => ({})); throw new Error(d.error || 'HTTP ' + resp.status); }
    postModal.classList.add('hidden');
    showToastMsg(t('schedule.taskUpdated'));
    showSchedules();
  } catch (e) {
    msg.textContent = t('schedule.updateFailed', { error: e.message || e });
  }
}

// ── Old schedule functions (backward compat: toggle/run/delete for legacy meetings) ──

async function toggleSchedule(id, enabled) { try { await authFetch('/api/schedules/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) }); showSchedules(); } catch {} }
async function runScheduleNow(id) { try { await authFetch('/api/schedules/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); showToastMsg(t('schedule.triggered')); } catch {} }
async function deleteSchedule(id) { if (!await appConfirm(t('common.deleteScheduleConfirm'))) return; try { await authFetch('/api/schedules/' + id, { method: 'DELETE' }); showSchedules(); } catch {} }
