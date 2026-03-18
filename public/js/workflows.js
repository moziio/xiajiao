/* 虾饺 IM — Workflow Module */

let _wfActiveRuns = {};

async function loadWorkflows() {
  try {
    const data = await (await authFetch('/api/workflows')).json();
    if (data.ok) {
      workflowDefs = data.workflows || [];
      _wfActiveRuns = {};
      for (const r of (data.runs || [])) _wfActiveRuns[r.runId] = r;
    }
  } catch (e) { console.warn('[workflow] load failed:', e.message); }
}

function renderWorkflowContacts() {
  const q = contactsSearchQuery;
  const filtered = q
    ? workflowDefs.filter(w => matchesContactSearch(w.name) || matchesContactSearch(w.description || ''))
    : workflowDefs;
  if (!filtered.length && !canManage()) return '';
  const wfCollapsed = !q && storageGet('im-cat-collapsed-__workflows') === '1';
  let h = `<div class="contacts-section"><div class="contacts-section-title" onclick="toggleCatCollapse('__workflows')"><svg class="cat-chevron ${wfCollapsed ? '' : 'open'}" viewBox="0 0 16 16" width="14" height="14"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> ${t('workflow.section')} <span class="cat-count">(${filtered.length})</span></div>`;
  if (!wfCollapsed) {
    h += filtered.map(w => {
      const running = Object.values(_wfActiveRuns).some(r => r.workflowId === w.id && (r.status === 'running' || r.status === 'waiting'));
      const badge = running ? `<span class="wf-running-badge">${t('workflow.running')}</span>` : '';
      const stepsTxt = `${w.steps?.length || 0} ${t('workflow.stepsUnit')}`;
      const swid = escJs(w.id);
      return `<div class="contact-item" onclick="openWorkflowChannel('${swid}')"><div class="contact-avatar">${esc(w.emoji || '⚙️')}</div><div class="contact-info"><div class="contact-name">${esc(w.name)} ${badge}</div><div class="contact-desc">${stepsTxt}${w.description ? ' · ' + esc(w.description) : ''}</div></div><div class="contact-action">${isOwner ? `<button class="wf-trigger-btn" onclick="event.stopPropagation();triggerWorkflow('${swid}')" title="${t('workflow.runBtn')}">▶</button><button onclick="event.stopPropagation();openWorkflowBuilder('${swid}')">${t('workflow.edit')}</button>` : ''}</div></div>`;
    }).join('');
    if (isOwner && !q) {
      h += `<div class="add-btn" onclick="openWorkflowBuilder()"><div class="add-icon">+</div> ${t('workflow.create')}</div>`;
    }
  }
  h += '</div>';
  return h;
}

function openWorkflowChannel(wfId) {
  switchTab('chats');
  switchChannel('wf_' + wfId);
}

// ── Templates ──
const WF_TEMPLATES = [
  { key: 'content', emoji: '📝', label: '内容生产',
    data: { name: '内容生产线', emoji: '📝', description: '选题 → 写作 → 审核',
      steps: [
        { name: '选题策划', prompt: '请根据以下主题，策划3个内容选题方案，每个方案包含标题、大纲、目标受众：\n\n{{input}}' },
        { name: '内容撰写', prompt: '请根据以下选题方案，选择最佳方案撰写一篇完整文章（2000字左右）：\n\n{{s1.output}}', waitForApproval: true },
        { name: '审核优化', prompt: '请审核以下文章，给出修改建议并输出最终优化版：\n\n{{s2.output}}' },
      ]}},
  { key: 'analysis', emoji: '📊', label: '数据分析',
    data: { name: '数据分析流程', emoji: '📊', description: '整理 → 分析 → 报告',
      steps: [
        { name: '数据整理', prompt: '请对以下数据/需求进行梳理，列出关键指标和分析维度：\n\n{{input}}' },
        { name: '深度分析', prompt: '请基于以下整理结果进行深度分析，挖掘洞察和趋势：\n\n{{s1.output}}' },
        { name: '报告撰写', prompt: '请基于分析结果，输出一份完整的数据分析报告：\n\n{{s2.output}}' },
      ]}},
  { key: 'creative', emoji: '🎨', label: '创意设计',
    data: { name: '创意设计流程', emoji: '🎨', description: '构思 → 文案 → 视觉',
      steps: [
        { name: '创意构思', prompt: '请根据以下需求，提出5个创意方案：\n\n{{input}}' },
        { name: '文案撰写', prompt: '请基于以下创意方案，撰写详细的文案内容：\n\n{{s1.output}}', waitForApproval: true },
        { name: '视觉描述', prompt: '请为以下文案生成视觉设计描述（配色、布局、图片风格建议）：\n\n{{s2.output}}' },
      ]}},
  { key: 'meeting', emoji: '📋', label: '会议纪要',
    data: { name: '会议纪要流程', emoji: '📋', description: '提取 → 纪要 → 待办',
      steps: [
        { name: '信息提取', prompt: '请从以下会议内容中提取关键信息（议题、讨论要点、决议）：\n\n{{input}}' },
        { name: '纪要撰写', prompt: '请基于以下提取结果，撰写正式的会议纪要：\n\n{{s1.output}}' },
        { name: '待办总结', prompt: '请从以下会议纪要中提取所有待办事项（负责人、截止日期、优先级）：\n\n{{s2.output}}' },
      ]}},
];

// ── Builder ──
function openWorkflowBuilder(editId) {
  const wf = editId ? workflowDefs.find(w => w.id === editId) : null;
  const isEdit = !!wf;
  let h = `<div class="modal-header"><h3>${isEdit ? t('workflow.edit') : t('workflow.create')}</h3><button class="modal-close" onclick="manageModal.classList.add('hidden')">&times;</button></div>`;
  h += '<div class="modal-body"><div class="manage-form">';
  if (!isEdit) {
    h += `<div class="wf-tpl-section"><label>${t('workflow.fromTemplate')}</label><div class="preset-tags">${WF_TEMPLATES.map(tp => `<span class="preset-tag" onclick="applyWfTemplate('${tp.key}')">${tp.emoji} ${tp.label}</span>`).join('')}<span class="preset-tag" onclick="applyWfTemplate('blank')">📄 ${t('workflow.blank')}</span></div></div>`;
  }
  h += `<label>${t('workflow.nameLabel')}</label><input id="wfName" value="${escH(wf?.name || '')}" placeholder="${t('workflow.namePH')}" autocomplete="off" />`;
  const curEmoji = wf?.emoji || '⚙️';
  h += `<div class="wf-meta-row"><div class="wf-meta-desc"><label>${t('workflow.descLabel')}</label><input id="wfDesc" value="${escH(wf?.description || '')}" placeholder="${t('workflow.descPH')}" autocomplete="off" /></div><div class="wf-meta-emoji"><label>${t('workflow.emojiLabel')}</label><input id="wfEmoji" type="hidden" value="${escH(curEmoji)}" /><div class="wf-emoji-btn" id="wfEmojiBtn" onclick="toggleWfEmojiPicker()">${esc(curEmoji)}</div><div class="wf-emoji-picker hidden" id="wfEmojiPicker"></div></div></div>`;
  h += `<label style="margin-top:16px">${t('workflow.stepsLabel')}</label><div id="wfStepsList"></div>`;
  h += `<div class="add-btn" onclick="addWfStep()" style="margin:8px 0"><div class="add-icon">+</div> ${t('workflow.addStep')}</div>`;
  h += `<div class="wf-builder-actions">`;
  if (isEdit) h += `<button class="btn-danger" onclick="deleteWorkflow('${escJs(editId)}')" style="margin-top:0">${t('common.delete')}</button>`;
  h += `<button class="btn-primary" onclick="saveWorkflow('${isEdit ? escJs(editId) : ''}')" style="margin-top:0">${t('common.save')}</button></div>`;
  h += '</div></div>';
  manageModal.querySelector('.modal-content').innerHTML = h;
  manageModal.classList.remove('hidden');
  window._wfBuilderSteps = wf ? JSON.parse(JSON.stringify(wf.steps)) : [];
  renderWfSteps();
}

function applyWfTemplate(key) {
  if (key === 'blank') {
    document.getElementById('wfName').value = '';
    document.getElementById('wfDesc').value = '';
    _setWfEmoji('⚙️');
    window._wfBuilderSteps = [{ name: '', agent: '', prompt: '', waitForApproval: false }];
    renderWfSteps();
    return;
  }
  const tpl = WF_TEMPLATES.find(x => x.key === key);
  if (!tpl) return;
  document.getElementById('wfName').value = tpl.data.name;
  document.getElementById('wfDesc').value = tpl.data.description;
  _setWfEmoji(tpl.data.emoji);
  window._wfBuilderSteps = tpl.data.steps.map((s, i) => ({
    id: `s${i + 1}`, name: s.name, agent: '', prompt: s.prompt,
    waitForApproval: !!s.waitForApproval,
  }));
  renderWfSteps();
}

function renderWfSteps() {
  const el = document.getElementById('wfStepsList');
  if (!el) return;
  const steps = window._wfBuilderSteps || [];
  el.innerHTML = steps.map((s, i) => {
    const isCondition = s.type === 'condition';
    const opts = AGENTS.map(a => `<option value="${escH(a.id)}"${s.agent === a.id ? ' selected' : ''}>${esc(a.emoji)} ${esc(a.name)}</option>`).join('');
    const branchTrue = s.branches?.true || s.branches?.['true'] || '';
    const branchFalse = s.branches?.false || s.branches?.['false'] || '';
    const _mkStepIdOpts = (sel) => steps.map(st => {
      const sid = st.id || 's'+(steps.indexOf(st)+1);
      return `<option value="${escH(sid)}"${sel===sid?' selected':''}>${esc(st.name || 'Step '+(steps.indexOf(st)+1))} (${sid})</option>`;
    }).join('');
    const typeLabel = isCondition ? '🔀 条件' : '🤖 Agent';
    let h = `<div class="wf-step-card${isCondition ? ' wf-condition-card' : ''}">
      <div class="wf-step-header">
        <span class="wf-step-num">${typeLabel} · Step ${i + 1}</span>
        <div class="wf-step-actions">
          <button class="wf-step-btn" onclick="toggleWfStepType(${i})" title="切换类型">${isCondition ? '🤖' : '🔀'}</button>
          ${i > 0 ? `<button class="wf-step-btn" onclick="moveWfStep(${i},-1)" title="${t('workflow.moveUp')}">↑</button>` : ''}
          ${i < steps.length - 1 ? `<button class="wf-step-btn" onclick="moveWfStep(${i},1)" title="${t('workflow.moveDown')}">↓</button>` : ''}
          <button class="wf-step-btn wf-step-del" onclick="removeWfStep(${i})" title="${t('common.delete')}">×</button>
        </div>
      </div>
      <label>${t('workflow.stepNameLabel')}</label>
      <input value="${escH(s.name)}" placeholder="${t('workflow.stepNamePH')}" onchange="window._wfBuilderSteps[${i}].name=this.value" autocomplete="off" />`;
    if (isCondition) {
      const modeKw = (s.conditionMode || 'keyword') === 'keyword';
      h += `<label>条件模式</label>
        <select onchange="window._wfBuilderSteps[${i}].conditionMode=this.value;renderWfSteps()">
          <option value="keyword"${modeKw ? ' selected' : ''}>关键词匹配</option>
          <option value="llm"${!modeKw ? ' selected' : ''}>LLM 判断</option>
        </select>`;
      if (!modeKw) {
        h += `<label>${t('workflow.agentLabel')}</label>
          <select onchange="window._wfBuilderSteps[${i}].agent=this.value"><option value="">${t('workflow.selectAgent')}</option>${opts}</select>`;
      }
      h += `<label>条件表达式</label>
        <input value="${escH(s.conditionExpr || '')}" placeholder="${modeKw ? '输入关键词，匹配上一步输出' : '输入判断条件描述'}" onchange="window._wfBuilderSteps[${i}].conditionExpr=this.value" autocomplete="off" />
        <div class="wf-branch-row">
          <div class="wf-branch"><label>✅ 是 → 跳转</label><select onchange="window._wfBuilderSteps[${i}].branches=window._wfBuilderSteps[${i}].branches||{};window._wfBuilderSteps[${i}].branches['true']=this.value||null"><option value=""${!branchTrue?' selected':''}>下一步</option>${_mkStepIdOpts(branchTrue)}</select></div>
          <div class="wf-branch"><label>❌ 否 → 跳转</label><select onchange="window._wfBuilderSteps[${i}].branches=window._wfBuilderSteps[${i}].branches||{};window._wfBuilderSteps[${i}].branches['false']=this.value||null"><option value=""${!branchFalse?' selected':''}>下一步</option>${_mkStepIdOpts(branchFalse)}</select></div>
        </div>`;
    } else {
      h += `<label>${t('workflow.agentLabel')}</label>
        <select onchange="window._wfBuilderSteps[${i}].agent=this.value"><option value="">${t('workflow.selectAgent')}</option>${opts}</select>
        <label>${t('workflow.promptLabel')}</label>
        <textarea class="wf-prompt-input" placeholder="${t('workflow.promptPH')}" onchange="window._wfBuilderSteps[${i}].prompt=this.value">${esc(s.prompt)}</textarea>
        <div class="wf-error-row">
          <div class="wf-error-cfg"><label>失败策略</label><select onchange="window._wfBuilderSteps[${i}].onError=this.value">
            <option value="fail"${(s.onError||'fail')==='fail'?' selected':''}>终止</option>
            <option value="skip"${s.onError==='skip'?' selected':''}>跳过</option>
            <option value="rollback"${s.onError==='rollback'?' selected':''}>回退</option>
          </select></div>
          <div class="wf-error-cfg"><label>重试次数</label><select onchange="window._wfBuilderSteps[${i}].maxRetries=parseInt(this.value)">
            <option value="0"${(!s.maxRetries)?' selected':''}>不重试</option>
            <option value="1"${s.maxRetries===1?' selected':''}>1 次</option>
            <option value="2"${s.maxRetries===2?' selected':''}>2 次</option>
            <option value="3"${s.maxRetries===3?' selected':''}>3 次</option>
          </select></div>
        </div>
        <label class="wf-check-label"><input type="checkbox"${s.waitForApproval ? ' checked' : ''} onchange="window._wfBuilderSteps[${i}].waitForApproval=this.checked" /> ${t('workflow.waitApproval')}</label>`;
    }
    h += '</div>';
    return h;
  }).join('');
}

function toggleWfStepType(i) {
  _syncStepsFromDom();
  if (!window._wfBuilderSteps[i]) return;
  const s = window._wfBuilderSteps[i];
  if (s.type === 'condition') {
    s.type = 'agent';
    delete s.conditionExpr;
    delete s.conditionMode;
    delete s.branches;
  } else {
    s.type = 'condition';
    s.conditionExpr = '';
    s.conditionMode = 'keyword';
    s.branches = { true: null, false: null };
  }
  renderWfSteps();
}

function addWfStep() {
  _syncStepsFromDom();
  if (!window._wfBuilderSteps) window._wfBuilderSteps = [];
  window._wfBuilderSteps.push({ id: `s${window._wfBuilderSteps.length + 1}`, name: '', type: 'agent', agent: '', prompt: '', waitForApproval: false, onError: 'fail', maxRetries: 0 });
  renderWfSteps();
}
function removeWfStep(i) { _syncStepsFromDom(); window._wfBuilderSteps.splice(i, 1); renderWfSteps(); }
function moveWfStep(i, dir) {
  _syncStepsFromDom();
  const s = window._wfBuilderSteps, ti = i + dir;
  if (ti < 0 || ti >= s.length) return;
  [s[i], s[ti]] = [s[ti], s[i]];
  renderWfSteps();
}

function _syncStepsFromDom() {
  const cards = document.querySelectorAll('.wf-step-card');
  cards.forEach((card, i) => {
    if (!window._wfBuilderSteps[i]) return;
    const inputs = card.querySelectorAll('input[autocomplete="off"]');
    if (inputs[0]) window._wfBuilderSteps[i].name = inputs[0].value;
    if (window._wfBuilderSteps[i].type !== 'condition') {
      const agentSelect = card.querySelector('select');
      const promptArea = card.querySelector('textarea');
      const cb = card.querySelector('input[type="checkbox"]');
      if (agentSelect) window._wfBuilderSteps[i].agent = agentSelect.value;
      if (promptArea) window._wfBuilderSteps[i].prompt = promptArea.value;
      if (cb) window._wfBuilderSteps[i].waitForApproval = cb.checked;
    } else {
      if (inputs[1]) window._wfBuilderSteps[i].conditionExpr = inputs[1].value;
    }
  });
}

async function saveWorkflow(editId) {
  _syncStepsFromDom();
  const name = document.getElementById('wfName')?.value?.trim();
  const desc = document.getElementById('wfDesc')?.value?.trim();
  const emoji = document.getElementById('wfEmoji')?.value?.trim() || '⚙️';
  const steps = (window._wfBuilderSteps || []).map((s, i) => {
    const base = {
      id: s.id || `s${i + 1}`, name: s.name || `步骤 ${i + 1}`,
      type: s.type || 'agent',
      agent: s.agent, prompt: s.prompt, waitForApproval: !!s.waitForApproval,
      onError: s.onError || 'fail', maxRetries: s.maxRetries || 0,
    };
    if (s.type === 'condition') {
      base.conditionExpr = s.conditionExpr || '';
      base.conditionMode = s.conditionMode || 'keyword';
      base.branches = s.branches || { true: null, false: null };
    }
    return base;
  });
  if (!name) { showToastMsg(t('workflow.nameRequired'), 'error'); return; }
  if (!steps.length) { showToastMsg(t('workflow.needAgent'), 'error'); return; }
  const noAgentStep = steps.find(s => s.type !== 'condition' && !s.agent);
  if (noAgentStep) { showToastMsg(t('workflow.needAgent') + ` (${noAgentStep.name || 'Step'})`, 'error'); return; }
  const body = { name, description: desc, emoji, steps };
  try {
    const url = editId ? '/api/workflows/' + editId : '/api/workflows';
    const method = editId ? 'PUT' : 'POST';
    const data = await (await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
    if (data.ok) {
      showToastMsg(t('common.success'));
      manageModal.classList.add('hidden');
      await loadWorkflows();
      renderContacts();
      if (editId && activeChannel === 'wf_' + editId) switchChannel(activeChannel);
    } else {
      showToastMsg(t('common.fail') + (data.error || ''), 'error');
    }
  } catch (e) { showToastMsg(t('common.fail') + e.message, 'error'); }
}

async function deleteWorkflow(id) {
  if (!await appConfirm(t('workflow.deleteConfirm'))) return;
  try {
    const data = await (await authFetch('/api/workflows/' + id, { method: 'DELETE' })).json();
    if (data.ok) {
      showToastMsg(t('workflow.deleted'));
      manageModal.classList.add('hidden');
      if (activeChannel === 'wf_' + id) { activeChannel = null; hideAllViews(); welcomeScreen.style.display = ''; welcomeScreen.classList.remove('hidden'); }
      await loadWorkflows();
      renderContacts();
      renderChatList();
    }
  } catch (e) { showToastMsg(t('common.fail'), 'error'); }
}

// ── Trigger (explicit button) ──
async function triggerWorkflow(wfId) {
  const wf = workflowDefs.find(w => w.id === wfId);
  const wfName = wf ? wf.name : t('workflow.section');
  const input = await appPrompt(t('workflow.triggerPrompt', {name: wfName}), '', t('workflow.triggerPH'));
  if (!input || !input.trim()) return;
  const channel = 'wf_' + wfId;
  if (activeChannel !== channel) { switchTab('chats'); switchChannel(channel); }
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'chat', text: input.trim(), channel, mentions: [] }));
  }
  if (typeof clearWfApprovalButtons === 'function') clearWfApprovalButtons();
  setSendBtnStop(true);
  runWorkflow(wfId, input.trim());
}

// ── Execution ──
async function runWorkflow(wfId, input) {
  if (!input) { showToastMsg(t('workflow.inputRequired'), 'error'); return; }
  try {
    const data = await (await authFetch('/api/workflows/' + wfId + '/run', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    })).json();
    if (!data.ok) showToastMsg(t('workflow.runFail') + (data.error || ''), 'error');
  } catch (e) { showToastMsg(t('workflow.runFail') + e.message, 'error'); }
}

function wfControl(runId, action) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'workflow_control', runId, action }));
  }
  if (action === 'stop') {
    clearWfApprovalButtons();
    setSendBtnStop(false);
    clearAgentTyping();
  }
  if (action === 'continue' || action === 'skip') clearWfApprovalButtons();
}

function handleWorkflowEvent(msg) {
  switch (msg.type) {
    case 'workflow_start':
      _wfActiveRuns[msg.runId] = {
        runId: msg.runId, workflowId: msg.workflowId,
        channel: msg.channel, status: 'running',
        steps: msg.steps, stepIndex: 0,
      };
      renderContacts();
      break;
    case 'workflow_step':
      if (_wfActiveRuns[msg.runId]) {
        _wfActiveRuns[msg.runId].stepIndex = msg.stepIndex;
        _wfActiveRuns[msg.runId].status = 'running';
      }
      break;
    case 'workflow_waiting':
      if (_wfActiveRuns[msg.runId]) _wfActiveRuns[msg.runId].status = 'waiting';
      if (activeChannel === msg.channel) renderWfApprovalButtons(msg.runId, msg.nextStepName);
      break;
    case 'workflow_complete':
      delete _wfActiveRuns[msg.runId];
      renderContacts();
      if (activeChannel === msg.channel) {
        clearWfApprovalButtons();
        setSendBtnStop(false);
        clearAgentTyping();
        _showWfRerunHint();
      }
      break;
  }
}

function renderWfApprovalButtons(runId, nextStep) {
  clearWfApprovalButtons();
  const bar = document.createElement('div');
  bar.id = 'wfApprovalBar';
  bar.className = 'wf-approval-bar';
  const rid = escJs(runId);
  bar.innerHTML = `<span class="wf-approval-text">${t('workflow.waitingHint')}${nextStep ? ' → ' + esc(nextStep) : ''}</span><div class="wf-approval-btns"><button class="btn-primary btn-sm" onclick="wfControl('${rid}','continue')">${t('workflow.btnContinue')}</button><button class="btn-outline btn-sm" onclick="wfControl('${rid}','skip')">${t('workflow.btnSkip')}</button><button class="btn-danger btn-sm" onclick="wfControl('${rid}','stop')">${t('workflow.btnStop')}</button></div>`;
  const area = document.querySelector('.input-area');
  if (area) area.parentNode.insertBefore(bar, area);
}

function clearWfApprovalButtons() {
  const bar = document.getElementById('wfApprovalBar');
  if (bar) bar.remove();
}

function _showWfRerunHint() {
  clearWfApprovalButtons();
  const bar = document.createElement('div');
  bar.id = 'wfApprovalBar';
  bar.className = 'wf-approval-bar wf-rerun-bar';
  bar.innerHTML = `<span class="wf-approval-text">${t('workflow.completedHint')}</span><div class="wf-approval-btns"><button class="btn-outline btn-sm" onclick="clearWfApprovalButtons();document.getElementById('chatInput')?.focus()">🔄 ${t('workflow.rerunBtn')}</button></div>`;
  const area = document.querySelector('.input-area');
  if (area) area.parentNode.insertBefore(bar, area);
  setTimeout(() => { const b = document.getElementById('wfApprovalBar'); if (b && b.classList.contains('wf-rerun-bar')) b.remove(); }, 20000);
}

function getWfRunForChannel(ch) {
  for (const r of Object.values(_wfActiveRuns)) { if (r.channel === ch) return r; }
  return null;
}

const WF_EMOJI_PICKS = ['⚙️','🔄','📋','📊','✍️','🚀','🔍','💡','🎯','🧠','📝','🎨','🔧','⚡','🌟','🎭','📱','🏆','🔬','📚','🎬','🎵','🌈','📦','🛠️','📮','🗂️','📐','🧪','🤖','💬','📣','🔔','✅','❤️','🌍','🔗','🏗️','⏱️','🎉'];

function toggleWfEmojiPicker() {
  const picker = document.getElementById('wfEmojiPicker');
  if (!picker) return;
  if (!picker.classList.contains('hidden')) { picker.classList.add('hidden'); return; }
  picker.innerHTML = WF_EMOJI_PICKS.map(e => `<span class="wf-emoji-cell" onclick="pickWfEmoji(event,'${e}')">${e}</span>`).join('');
  picker.classList.remove('hidden');
  setTimeout(() => {
    const close = (ev) => { if (picker.contains(ev.target) || ev.target.id === 'wfEmojiBtn') return; picker.classList.add('hidden'); document.removeEventListener('mousedown', close); };
    document.addEventListener('mousedown', close);
  }, 0);
}

function pickWfEmoji(e, emoji) {
  e.stopPropagation();
  _setWfEmoji(emoji);
  const picker = document.getElementById('wfEmojiPicker');
  if (picker) picker.classList.add('hidden');
}

function _setWfEmoji(emoji) {
  const input = document.getElementById('wfEmoji');
  const btn = document.getElementById('wfEmojiBtn');
  if (input) input.value = emoji;
  if (btn) btn.textContent = emoji;
}
