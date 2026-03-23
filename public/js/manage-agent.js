/* 虾饺 (Xiajiao) — Agent Management (Layer 2) */

// ── Modal Shell ──
function openManagePanel(tab) { manageModal.classList.remove('hidden'); if (tab==='groups') renderGroupManager(); else renderAgentManager(); }
function closeManagePanel() { manageModal.classList.add('hidden'); }
manageModal?.addEventListener('mousedown', e => {
  const ct = manageModal.querySelector('.modal-content');
  if (ct && ct.contains(e.target)) return;
  closeManagePanel();
});
profileModal?.addEventListener('mousedown', e => {
  const ct = profileModal.querySelector('.modal-content');
  if (ct && ct.contains(e.target)) return;
  profileModal.classList.add('hidden');
});
postModal?.addEventListener('mousedown', e => {
  const ct = postModal.querySelector('.modal-content');
  if (ct && ct.contains(e.target)) return;
  postModal.classList.add('hidden');
});

// ── Agent List ──
function renderAgentManager() {
  const tplOpts = Object.entries(SOUL_TEMPLATES).map(([k, v]) => `<option value="${escH(k)}">${esc(getSoulTemplateLabel(k))}</option>`).join('');
  manageModal.querySelector('.modal-content').innerHTML = `
    <div class="modal-header"><h3>${t('manage.agentTitle')}</h3><div class="modal-tabs"><button class="tab-btn active" onclick="renderAgentManager()">${t('manage.agentTab')}</button><button class="tab-btn" onclick="renderGroupManager()">${t('manage.groupTab')}</button></div><button class="modal-close" onclick="closeManagePanel()">&times;</button></div>
    <div class="modal-body"><div>${AGENTS.map(a=>{const sa=escJs(a.id);return`<div class="manage-item"><span class="manage-emoji">${a.emoji}</span><span class="manage-name">${esc(a.name)}</span><span class="manage-id">${esc(a.id)}</span>${a.model?`<span class="manage-model-badge">${esc(a.model.split('/').pop())}</span>`:''}<div class="manage-actions"><button onclick="openAgentDetail('${sa}')" title="${t('manage.agentTab')}">&#9881;</button><button onclick="deleteAgentConfirm('${sa}')" title="${t('common.delete')}" class="danger">&#128465;</button></div></div>`}).join('')}</div>
      <div class="manage-form"><h4>${t('manage.createAgent')}</h4>
        <label>${t('manage.agentId')}</label><input id="newAgentId" placeholder="${t('manage.agentIdPlaceholder')}" /><div class="hint">${t('manage.agentIdHint')}</div>
        <label>${t('manage.agentName')}</label><input id="newAgentName" placeholder="${t('manage.agentNamePlaceholder')}" />
        <label>${t('manage.agentModel')}</label><div id="newAgentModelSS" style="width:100%"></div>

        <div class="create-section-divider"></div>
        <div class="create-section-title">${t('manage.initSetup')}</div>

        <label>${t('train.soulTemplate')}</label>
        <select id="newAgentTemplate" class="train-input" onchange="applyCreateTemplate()">
          ${tplOpts}
        </select>
        <label>${t('manage.agentDesc')}</label><textarea id="newAgentDesc" placeholder="${t('manage.agentDescPlaceholder')}" rows="4"></textarea>

        <label>${t('manage.kbFiles')}</label>
        <div class="create-kb-zone">
          <div id="createKbFileList" class="create-kb-list"></div>
          <label class="btn-small btn-upload-label" style="margin-top:6px"><input type="file" accept="${KB_ACCEPT}" multiple onchange="createAddKbFiles(event)" hidden />${t('manage.selectKbFiles')}</label>
        </div>

        <label>${t('train.projectTitle')}</label>
        <input id="newAgentWsPath" placeholder="${t('train.wsPlaceholder')}" />
        <div class="hint">${t('manage.wsOptionalHint')}</div>

        <label>${t('contacts.assignGroup')}</label>
        <select id="newAgentCat" class="train-input"><option value="">${t('contacts.uncategorized')}</option>${getAgentCategories().map(c => `<option value="${escH(c.name)}">${esc(c.name)}</option>`).join('')}</select>

        <button class="btn-primary" onclick="createAgentAction()" style="margin-top:12px">${t('manage.createBtn')}</button>
        <div id="agentFormMsg" class="form-msg"></div></div></div>`;
  _createKbFiles = [];
  _initNewAgentModelSS();
}

let _newAgentModelSS = null;
function _initNewAgentModelSS() {
  const items = _buildModelSSItems(availableModels);
  _newAgentModelSS = initSearchableSelect('newAgentModelSS', {
    items,
    value: '',
    placeholder: t('common.searchModel') || '搜索模型...',
    emptyLabel: t('manage.defaultModel'),
    grouped: true,
    onChange: function(val) { _showCreateModelWarn(val); },
  });
}

function _showCreateModelWarn(modelId) {
  const warnId = 'createModelWarn';
  let warnEl = document.getElementById(warnId);
  if (!modelId) { if (warnEl) warnEl.style.display = 'none'; return; }
  const m = (typeof availableModels !== 'undefined' ? availableModels : []).find(x => x.id === modelId);
  const cat = m ? getModelCategory(m) : 'chat';
  const nonChatCats = { image: '图像生成', tts: '语音合成', asr: '语音识别', embedding: '向量化', video: '视频生成', translation: '翻译' };
  if (nonChatCats[cat]) {
    const html = `⚠️ 该模型是「${nonChatCats[cat]}」专用模型，不支持文字对话。选用后系统将自动使用默认对话模型回复消息。`;
    if (warnEl) { warnEl.innerHTML = html; warnEl.style.display = ''; }
    else { warnEl = document.createElement('div'); warnEl.id = warnId; warnEl.className = 'model-select-warn'; warnEl.innerHTML = html; document.getElementById('newAgentModelSS')?.after(warnEl); }
  } else {
    if (warnEl) warnEl.style.display = 'none';
  }
}

function _buildModelSSItems(models) {
  const items = [];
  const catOrder = ['chat','code','reasoning','vision','multimodal','math','thirdparty','image','video','tts','asr','embedding','translation'];
  const byGroup = {};
  models.forEach(m => {
    const cat = getModelCategory(m);
    if (!byGroup[cat]) byGroup[cat] = [];
    byGroup[cat].push(m);
  });
  catOrder.forEach(cat => {
    if (!byGroup[cat]) return;
    const label = getModelCategoryLabel(cat);
    byGroup[cat].forEach(m => {
      items.push({ id: m.id, label: m.name || m.id, group: label, badge: m.provider || '' });
    });
  });
  Object.keys(byGroup).forEach(cat => {
    if (catOrder.includes(cat)) return;
    const label = getModelCategoryLabel(cat);
    byGroup[cat].forEach(m => {
      items.push({ id: m.id, label: m.name || m.id, group: label, badge: m.provider || '' });
    });
  });
  return items;
}

// ── Agent Creation ──
let _createKbFiles = [];

async function applyCreateTemplate() {
  const key = $('#newAgentTemplate').value;
  if (!key) return;
  const tpl = SOUL_TEMPLATES[key];
  if (tpl && tpl.content) {
    const ta = $('#newAgentDesc');
    if (ta.value.trim() && !await appConfirm(t('train.templateConfirm'))) { $('#newAgentTemplate').value = ''; return; }
    ta.value = (_lang === 'en' && tpl.content_en) ? tpl.content_en : tpl.content;
  }
}

function createAddKbFiles(evt) {
  let rejected = [];
  for (const f of evt.target.files) {
    const v = validateKbFile(f);
    if (!v.ok) { rejected.push(f.name + ': ' + v.msg); continue; }
    if (!_createKbFiles.some(x => x.name === f.name)) _createKbFiles.push(f);
  }
  if (rejected.length) showToastMsg(rejected.join('\n'), 'error');
  renderCreateKbList();
  evt.target.value = '';
}

function createRemoveKbFile(idx) {
  _createKbFiles.splice(idx, 1);
  renderCreateKbList();
}

function renderCreateKbList() {
  const el = $('#createKbFileList');
  if (!el) return;
  if (_createKbFiles.length === 0) { el.innerHTML = ''; return; }
  el.innerHTML = _createKbFiles.map((f, i) =>
    `<div class="create-kb-item"><span class="kb-file-icon">${kbFileIcon(f.name)}</span><span>${esc(f.name)}</span><span class="kb-file-size">${f.size < 1024 ? f.size + ' B' : (f.size/1024).toFixed(1) + ' KB'}</span><button class="kb-file-del" onclick="createRemoveKbFile(${i})">&times;</button></div>`
  ).join('');
}

async function createAgentAction() {
  const id=$('#newAgentId').value.trim(), name=$('#newAgentName').value.trim(), desc=$('#newAgentDesc').value.trim(), model=(_newAgentModelSS ? _newAgentModelSS.getValue() : ''), msg=$('#agentFormMsg');
  const wsPath = $('#newAgentWsPath')?.value?.trim() || '';
  const catName = $('#newAgentCat')?.value || '';
  if (!id||!name) { msg.textContent=t('manage.fillIdName'); return; }
  msg.textContent=t('manage.creating');
  try {
    const d = await (await authFetch('/api/agents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,name,description:desc,model})})).json();
    if (!d.ok) { msg.textContent=t('community.failPrefix')+(d.error||'unknown'); return; }
    let steps = [];
    if (desc) { steps.push(authFetch('/api/agents/'+id+'/soul',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:desc})}).catch(()=>{})); }
    for (const f of _createKbFiles) { steps.push(uploadKbFile(id, f).catch(() => {})); }
    if (wsPath) { steps.push(authFetch('/api/agents/'+id+'/workspace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({path:wsPath})}).catch(()=>{})); }
    if (steps.length) { msg.textContent = t('manage.applyingSetup'); await Promise.all(steps); }
    if (catName) { const cats = getAgentCategories(); const cat = cats.find(c => c.name === catName); if (cat) { cat.agents = (cat.agents || []).filter(x => x !== id); cat.agents.push(id); setAgentCategories(cats); } }
    _createKbFiles = [];
    showToastMsg(t('manage.createSuccess'));
    try { const fresh = await (await authFetch('/api/agents')).json(); if (fresh.agents) updateAgentList(fresh.agents); } catch {}
    closeManagePanel();
  } catch(e){msg.textContent=t('common.error')+e.message;}
}

// ── Agent Detail / Training Panel ──
let _trainAgentId = null, _trainTab = 'soul';

async function openAgentDetail(id) {
  _trainAgentId = id;
  const ag = AGENTS.find(a => a.id === id);
  if (!ag) return;
  manageModal.querySelector('.modal-content').innerHTML = `
    <div class="modal-header">
      <h3>${t('train.panelTitle', {name: esc(ag.name)})}</h3>
      <button class="modal-close" onclick="renderAgentManager()">&larr;</button>
    </div>
    <div class="train-tabs">
      <button class="train-tab active" data-tab="soul" onclick="switchTrainTab('soul')">${t('train.tabSoul')}</button>
      <button class="train-tab" data-tab="kb" onclick="switchTrainTab('kb')">${t('train.tabKb')}</button>
      <button class="train-tab" data-tab="model" onclick="switchTrainTab('model')">${t('train.tabModel')}</button>
      <button class="train-tab" data-tab="tools" onclick="switchTrainTab('tools')">${t('train.tabTools')}</button>
      <button class="train-tab" data-tab="memory" onclick="switchTrainTab('memory')">${t('train.tabMemory') || '记忆'}</button>
      <button class="train-tab" data-tab="project" onclick="switchTrainTab('project')">${t('train.tabProject')}</button>
    </div>
    <div class="modal-body" id="trainBody" style="padding:0"></div>`;
  _trainTab = 'soul';
  await loadTrainTab('soul');
}

function switchTrainTab(tab) {
  _trainTab = tab;
  document.querySelectorAll('.train-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  loadTrainTab(tab);
}

async function loadTrainTab(tab) {
  const body = $('#trainBody');
  if (!body) return;
  const id = _trainAgentId;
  if (tab === 'soul') await loadSoulTab(id, body);
  else if (tab === 'kb') await loadKbTab(id, body);
  else if (tab === 'model') await loadModelTab(id, body);
  else if (tab === 'tools') await loadToolsTab(id, body);
  else if (tab === 'memory') await loadMemoryTab(id, body);
  else if (tab === 'project') await loadProjectTab(id, body);
}

async function loadSoulTab(id, body) {
  body.innerHTML = '<div class="train-panel-body"><div class="train-loading">' + t('common.loading') + '</div></div>';
  let soul = '', agName = '';
  const ag = AGENTS.find(a => a.id === id);
  agName = ag ? ag.name : id;
  try { soul = (await (await authFetch('/api/agents/' + id + '/soul')).json()).content || ''; } catch {}
  const tplOpts = Object.entries(SOUL_TEMPLATES).map(([k, v]) => `<option value="${escH(k)}">${esc(getSoulTemplateLabel(k))}</option>`).join('');
  body.innerHTML = `<div class="train-panel-body">
    <div class="train-row"><label>${t('train.soulName')}</label><input id="trainAgentName" class="train-input" value="${escH(agName)}" /></div>
    <div class="train-row"><label>${t('train.soulTemplate')}</label><select id="soulTemplate" class="train-input" onchange="applySoulTemplate()">${tplOpts}</select></div>
    <div class="train-row train-row-grow"><label>${t('train.soulLabel')}</label><textarea id="trainSoulContent" class="train-textarea">${esc(soul)}</textarea></div>
    <div class="train-actions">
      <button class="btn-primary" onclick="saveSoulTab()">${t('train.saveSoul')}</button>
      <span id="soulMsg" class="form-msg"></span>
    </div>
  </div>`;
}

async function applySoulTemplate() {
  const key = $('#soulTemplate').value;
  if (!key) return;
  const tpl = SOUL_TEMPLATES[key];
  if (tpl && tpl.content) {
    const ta = $('#trainSoulContent');
    if (ta.value.trim() && !await appConfirm(t('train.templateConfirm'))) { $('#soulTemplate').value = ''; return; }
    ta.value = (_lang === 'en' && tpl.content_en) ? tpl.content_en : tpl.content;
  }
}

async function saveSoulTab() {
  const id = _trainAgentId, msg = $('#soulMsg');
  const name = $('#trainAgentName').value.trim();
  const soul = $('#trainSoulContent').value;
  if (!name) { msg.textContent = t('train.nameRequired'); msg.className = 'form-msg error'; return; }
  msg.textContent = t('common.saving'); msg.className = 'form-msg';
  try {
    const r1 = await (await authFetch('/api/agents/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, description: soul }) })).json();
    if (r1.ok) { msg.textContent = t('common.success'); msg.className = 'form-msg success'; showToastMsg(t('train.soulSaved')); }
    else { msg.textContent = t('community.failPrefix') + (r1.error || ''); msg.className = 'form-msg error'; }
  } catch (e) { msg.textContent = t('common.error') + e.message; msg.className = 'form-msg error'; }
}

async function loadKbTab(id, body) {
  body.innerHTML = '<div class="train-panel-body"><div class="train-loading">' + t('common.loading') + '</div></div>';
  let files = [];
  let ragStatus = null;
  try { const r = await (await authFetch('/api/agents/' + id + '/files')).json(); files = r.files || []; } catch {}
  try { ragStatus = await (await authFetch('/api/agents/' + id + '/rag/status')).json(); } catch {}

  let h = '<div class="train-panel-body">';

  if (ragStatus) {
    const isIndexing = ragStatus.indexing && ragStatus.indexing.status === 'indexing';
    h += '<div class="kb-rag-status-bar">';
    h += '<span class="kb-rag-label">' + t('train.kbRagStatus') + '</span>';
    if (!ragStatus.enabled) {
      h += '<span class="kb-rag-badge badge-disabled">' + t('train.kbRagDisabled') + '</span>';
    } else if (isIndexing) {
      const p = ragStatus.indexing;
      h += '<span class="kb-rag-badge badge-indexing">' + t('train.kbIndexing') + '</span>';
    } else if (ragStatus.chunks > 0) {
      h += '<span class="kb-rag-badge badge-ok">' + ragStatus.files + ' ' + t('train.kbFilesCount') + ' / ' + t('train.kbChunks', { n: ragStatus.chunks }) + '</span>';
      if (ragStatus.modelMismatch) h += '<span class="kb-rag-badge badge-stale">' + t('train.kbModelMismatch') + '</span>';
      if (ragStatus.updatedAt) h += '<span class="kb-rag-time">' + t('train.kbLastUpdated') + ': ' + new Date(ragStatus.updatedAt).toLocaleString() + '</span>';
    } else {
      h += '<span class="kb-rag-badge badge-empty">' + t('train.kbNoIndex') + '</span>';
    }
    if (isIndexing) {
      h += '<button class="btn-small btn-reindex" disabled>' + t('train.kbIndexing') + '</button>';
    } else {
      h += '<button class="btn-small btn-reindex" onclick="kbReindex()">' + t('train.kbReindex') + '</button>';
    }
    h += '</div>';
    if (isIndexing) {
      _kbStartPolling(_trainAgentId);
    }
  }

  const kbFileCount = files.filter(f => !f.name.startsWith('.')).length;
  const limits = ragStatus?.limits;
  const maxFiles = limits?.maxFiles || KB_MAX_FILES;
  const chunkCount = ragStatus?.chunks || 0;
  const maxChunks = limits?.maxChunks || 5000;

  h += '<div class="kb-header"><h4>' + t('train.kbTitle') + ' <span class="kb-usage-badge">' + kbFileCount + '/' + maxFiles + '</span></h4><div class="kb-actions"><button class="btn-small" onclick="kbNewFile()">' + t('train.kbNew') + '</button><label class="btn-small btn-upload-label"><input type="file" accept="' + KB_ACCEPT + '" onchange="kbUploadFile(event)" hidden />' + t('train.kbUpload') + '</label></div></div>';
  if (ragStatus?.enabled && !ragStatus?.embeddingConfigured) {
    h += '<div class="kb-warn">' + t('train.kbNoEmbedding') + '</div>';
  }

  if (files.length === 0) { h += '<div class="kb-empty">' + t('train.kbEmpty') + '</div>'; }
  else {
    const detail = ragStatus?.detail || {};
    h += '<div class="kb-file-list">';
    for (const f of files) {
      const sizeStr = f.size < 1024 ? f.size + ' B' : (f.size / 1024).toFixed(1) + ' KB';
      const editable = isKbTextFile(f.name);
      const idx = detail[f.name];
      let badgeHtml = '';
      if (ragStatus?.enabled && idx !== undefined) {
        if (idx.indexed) {
          const cls = idx.stale ? 'badge-stale' : 'badge-indexed';
          const label = idx.stale ? t('train.kbIndexStale') : t('train.kbIndexed');
          badgeHtml = '<span class="kb-idx-badge ' + cls + '">' + label + ' (' + t('train.kbChunks', { n: idx.chunks }) + ')</span>';
        } else {
          badgeHtml = '<span class="kb-idx-badge badge-none">' + t('train.kbNotIndexed') + '</span>';
        }
      }
      const sfn = escJs(f.name);
      h += `<div class="kb-file-item${editable ? '' : ' kb-file-binary'}" ${editable ? `onclick="kbEditFile('${sfn}')"` : ''}><span class="kb-file-icon">${kbFileIcon(f.name)}</span><span class="kb-file-name">${esc(f.name)}</span>${badgeHtml}<span class="kb-file-size">${sizeStr}</span><button class="kb-file-del" onclick="event.stopPropagation();kbDeleteFile('${sfn}')" title="${t('common.delete')}">&times;</button></div>`;
    }
    h += '</div>';
  }
  h += '<div id="kbEditor" class="kb-editor-area" style="display:none"></div></div>';
  body.innerHTML = h;
}

let _kbPollTimer = null;

async function kbReindex() {
  const id = _trainAgentId;
  if (!id) return;
  const btn = document.querySelector('.btn-reindex');
  if (btn) { btn.disabled = true; btn.textContent = t('train.kbIndexing'); }
  try {
    const resp = await authFetch('/api/agents/' + id + '/rag/reindex', { method: 'POST' });
    const result = await resp.json();
    if (!result.ok) {
      showToastMsg(t('train.kbReindexFail') + ': ' + (result.reason || result.error || ''), 'error');
      if (btn) { btn.disabled = false; btn.textContent = t('train.kbReindex'); }
      return;
    }
    if (result.noFiles) {
      showToastMsg(t('train.kbReindexNoFiles'), 'warn');
      if (btn) { btn.disabled = false; btn.textContent = t('train.kbReindex'); }
      return;
    }
    if (result.already) {
      showToastMsg(t('train.kbReindexAlready'));
    } else {
      showToastMsg(t('train.kbReindexStarted'));
    }
    _kbStartPolling(id);
  } catch (e) {
    showToastMsg(t('train.kbReindexFail') + ': ' + e.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = t('train.kbReindex'); }
  }
}

function _kbStartPolling(agentId) {
  _kbStopPolling();
  _kbPollTimer = setInterval(() => _kbPollStatus(agentId), 2000);
}

function _kbStopPolling() {
  if (_kbPollTimer) { clearInterval(_kbPollTimer); _kbPollTimer = null; }
}

async function _kbPollStatus(agentId) {
  try {
    const status = await (await authFetch('/api/agents/' + agentId + '/rag/status')).json();
    const bar = document.querySelector('.kb-rag-status-bar');
    if (!bar) { _kbStopPolling(); return; }

    if (status.indexing && status.indexing.status === 'indexing') {
      const p = status.indexing;
      const progressText = t('train.kbReindexProgress', { done: p.doneFiles, total: p.totalFiles, file: p.currentFile || '...' });
      _kbUpdateStatusBar(bar, 'indexing', progressText, p.doneFiles / Math.max(p.totalFiles, 1));
    } else {
      _kbStopPolling();
      const btn = document.querySelector('.btn-reindex');
      if (btn) { btn.disabled = false; btn.textContent = t('train.kbReindex'); }

      if (status.indexing && status.indexing.status === 'done') {
        const p = status.indexing;
        if (p.errors && p.errors.length > 0) {
          const firstErr = p.errors[0].error || '';
          const errDetail = p.errors.map(e => e.file + ': ' + e.error).join('\n');
          const errMsg = p.errors.length === 1
            ? p.errors[0].file + ': ' + firstErr.slice(0, 200)
            : t('train.kbReindexErrors') + ' (' + p.errors.length + '): ' + firstErr.slice(0, 150);
          showToastMsg(errMsg, 'error');
          console.warn('[rag] index errors:', errDetail);
          _kbUpdateStatusBar(bar, 'error', firstErr.slice(0, 200), 1);
          setTimeout(() => loadKbTab(agentId, $('#trainBody')), 12000);
          return;
        } else if (p.totalChunks > 0) {
          showToastMsg(t('train.kbReindexDone') + ' — ' + p.totalChunks + ' chunks');
        } else {
          showToastMsg(t('train.kbReindexNoFiles'), 'warn');
        }
      }
      await loadKbTab(agentId, $('#trainBody'));
    }
  } catch { /* ignore poll errors */ }
}

function _kbUpdateStatusBar(bar, type, text, pct) {
  let progressEl = bar.querySelector('.kb-index-progress');
  if (!progressEl) {
    progressEl = document.createElement('div');
    progressEl.className = 'kb-index-progress';
    progressEl.innerHTML = '<div class="kb-index-progress-text"></div><div class="kb-index-progress-bar"><div class="kb-index-progress-fill"></div></div>';
    bar.appendChild(progressEl);
  }
  progressEl.querySelector('.kb-index-progress-text').textContent = text;
  const fill = progressEl.querySelector('.kb-index-progress-fill');
  fill.style.width = Math.round(pct * 100) + '%';
  fill.className = 'kb-index-progress-fill' + (type === 'error' ? ' kb-progress-error' : '');
  progressEl.querySelector('.kb-index-progress-text').className = 'kb-index-progress-text' + (type === 'error' ? ' kb-progress-error-text' : '');
}

async function kbNewFile() {
  const name = await appPrompt(t('train.kbNewPrompt'));
  if (!name || !name.trim()) return;
  const fn = name.trim().replace(/[^a-zA-Z0-9_.\u4e00-\u9fff-]/g, '');
  if (!fn) { showToastMsg(t('train.kbInvalidName'), 'error'); return; }
  try { await authFetch('/api/agents/' + _trainAgentId + '/files/' + encodeURIComponent(fn), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: '' }) }); showToastMsg(t('train.kbFileCreated')); await loadKbTab(_trainAgentId, $('#trainBody')); kbEditFile(fn); } catch (e) { showToastMsg(t('train.kbCreateFail') + e.message, 'error'); }
}

async function kbUploadFile(evt) {
  const file = evt.target.files[0]; if (!file) return;
  const v = validateKbFile(file);
  if (!v.ok) { showToastMsg(v.msg, 'error'); evt.target.value = ''; return; }
  try { await uploadKbFile(_trainAgentId, file); showToastMsg(t('train.kbUploaded')); loadKbTab(_trainAgentId, $('#trainBody')); } catch (e) { showToastMsg(t('train.kbUploadFail') + e.message, 'error'); }
}

async function kbEditFile(name) {
  const ed = $('#kbEditor'); if (!ed) return;
  ed.style.display = 'block';
  ed.innerHTML = '<div class="train-loading">' + t('train.kbReading') + '</div>';
  let content = '';
  try { content = (await (await authFetch('/api/agents/' + _trainAgentId + '/files/' + encodeURIComponent(name))).json()).content || ''; } catch {}
  ed.innerHTML = `<div class="kb-editor-header"><strong>${esc(name)}</strong><button class="btn-small" onclick="kbSaveFile('${escJs(name)}')">${t('common.save')}</button></div><textarea id="kbFileContent" class="train-textarea kb-file-textarea">${esc(content)}</textarea><div id="kbEditorMsg" class="form-msg"></div>`;
}

async function kbSaveFile(name) {
  const content = $('#kbFileContent').value, msg = $('#kbEditorMsg');
  msg.textContent = t('common.saving'); msg.className = 'form-msg';
  try { const r = await (await authFetch('/api/agents/' + _trainAgentId + '/files/' + encodeURIComponent(name), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) })).json(); if (r.ok) { msg.textContent = t('profile.saved'); msg.className = 'form-msg success'; showToastMsg(t('train.kbSaved')); } else { msg.textContent = t('common.fail'); msg.className = 'form-msg error'; } } catch (e) { msg.textContent = t('common.error') + e.message; msg.className = 'form-msg error'; }
}

async function kbDeleteFile(name) {
  if (!await appConfirm(t('train.kbDeleteConfirm', {name}))) return;
  try { await authFetch('/api/agents/' + _trainAgentId + '/files/' + encodeURIComponent(name), { method: 'DELETE' }); showToastMsg(t('train.kbDeleted')); loadKbTab(_trainAgentId, $('#trainBody')); } catch (e) { showToastMsg(t('train.kbDeleteFail') + e.message, 'error'); }
}

let _modelTabFilter = { query: '', cat: '' };

async function loadModelTab(id, body) {
  body.innerHTML = '<div class="train-panel-body"><div class="train-loading">' + t('common.loading') + '</div></div>';
  let agentModel = '';
  try { agentModel = (await (await authFetch('/api/agents/' + id + '/config')).json()).model || ''; } catch {}
  _modelTabFilter = { query: '', cat: '' };

  body.innerHTML = `<div class="train-panel-body">
    <div class="train-row"><label>${t('train.currentModel')}</label><div id="currentModelLabel" class="model-current">${agentModel ? esc(agentModel) : '<em>' + t('train.useSystemDefault') + '</em>'}</div></div>
    <input type="hidden" id="trainModelValue" value="${escH(agentModel)}" />
    <div class="model-filter-bar"><input class="model-search-input" id="modelSearchInput" placeholder="${esc(t('common.searchModel') || '搜索模型...')}" /></div>
    <div class="model-cat-pills" id="modelCatPills"></div>
    <div class="model-grid" id="modelCardGrid"></div>
    <div class="model-default-opt"><label><input type="checkbox" id="useDefaultModel" ${!agentModel ? 'checked' : ''} onchange="toggleDefaultModel()" /> ${t('train.useDefaultModel')}</label></div>
    <div class="train-actions"><button class="btn-primary" onclick="saveModelTab()">${t('train.saveModel')}</button><span id="modelMsg" class="form-msg"></span></div>
  </div>`;

  _renderModelCatPills();
  _renderModelCards(agentModel);

  const searchInput = $('#modelSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      _modelTabFilter.query = searchInput.value;
      _renderModelCards(agentModel);
    });
  }
}

function _renderModelCatPills() {
  const el = $('#modelCatPills');
  if (!el) return;
  const cats = {};
  availableModels.forEach(m => {
    const c = getModelCategory(m);
    cats[c] = (cats[c] || 0) + 1;
  });
  const order = ['chat','code','reasoning','vision','multimodal','math','thirdparty','image','video','tts','asr','embedding','translation'];
  let h = '<button class="model-cat-pill active" data-cat="" onclick="_filterModelCat(this,\'\')">' +
    (t('common.all') || '全部') + '<span class="model-cat-count"> ' + availableModels.length + '</span></button>';
  order.forEach(c => {
    if (!cats[c]) return;
    h += '<button class="model-cat-pill" data-cat="' + c + '" onclick="_filterModelCat(this,\'' + c + '\')">' +
      getModelCategoryLabel(c) + '<span class="model-cat-count"> ' + cats[c] + '</span></button>';
  });
  el.innerHTML = h;
}

function _filterModelCat(btn, cat) {
  document.querySelectorAll('.model-cat-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  _modelTabFilter.cat = cat;
  const val = $('#trainModelValue')?.value || '';
  _renderModelCards(val);
}

function _renderModelCards(agentModel) {
  const grid = $('#modelCardGrid');
  if (!grid) return;
  const q = (_modelTabFilter.query || '').toLowerCase().trim();
  const cat = _modelTabFilter.cat;

  let filtered = availableModels;
  if (cat) filtered = filtered.filter(m => getModelCategory(m) === cat);
  if (q) filtered = filtered.filter(m =>
    (m.name || '').toLowerCase().includes(q) ||
    m.id.toLowerCase().includes(q) ||
    (m.provider || '').toLowerCase().includes(q)
  );

  const modelDescriptions = { 'qwen': { ctx: '32K-128K', descKey: 'model.qwen' }, 'gpt': { ctx: '128K', descKey: 'model.gpt' }, 'claude': { ctx: '200K', descKey: 'model.claude' }, 'deepseek': { ctx: '64K', descKey: 'model.deepseek' }, 'gemini': { ctx: '1M', descKey: 'model.gemini' } };
  let h = '';
  for (const m of filtered) {
    const shortName = (m.name || m.id).split('/').pop();
    const key = Object.keys(modelDescriptions).find(k => m.id.toLowerCase().includes(k));
    const info = key ? modelDescriptions[key] : { ctx: '\u2014', descKey: '' };
    const sel = m.id === agentModel;
    const catLabel = getModelCategoryLabel(getModelCategory(m));
    h += `<div class="model-card ${sel ? 'selected' : ''}" onclick="selectModelCard(this,'${escJs(m.id)}')">` +
      `<div class="model-card-name">${esc(shortName)}</div>` +
      `<div class="model-card-id">${esc(m.id)}</div>` +
      `<div style="font-size:11px;color:var(--text3);margin-bottom:4px">${catLabel}</div>` +
      (info.descKey ? `<div class="model-card-desc">${esc(t(info.descKey))}</div>` : '') +
      `<div class="model-card-ctx">${t('train.ctxWindow', {ctx: info.ctx})}</div>` +
      `</div>`;
  }
  grid.innerHTML = h || '<div class="kb-empty">' + (q || cat ? (t('common.noMatch') || '无匹配') : t('train.noModels')) + '</div>';
}

function selectModelCard(el, modelId) {
  document.querySelectorAll('.model-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  $('#trainModelValue').value = modelId;
  $('#currentModelLabel').textContent = modelId;
  const cb = $('#useDefaultModel'); if (cb) cb.checked = false;

  const m = (typeof availableModels !== 'undefined' ? availableModels : []).find(x => x.id === modelId);
  const cat = m ? getModelCategory(m) : 'chat';
  const warnEl = document.getElementById('modelSelectWarn');
  const nonChatCats = { image: '图像生成', tts: '语音合成', asr: '语音识别', embedding: '向量化', video: '视频生成', translation: '翻译' };
  if (nonChatCats[cat]) {
    const html = `⚠️ 该模型是「${nonChatCats[cat]}」专用模型，不支持文字对话。选用后系统将自动使用默认对话模型回复消息。如需同时对话和${nonChatCats[cat]}，请选择多模态模型。`;
    if (warnEl) { warnEl.innerHTML = html; warnEl.style.display = ''; }
    else { const div = document.createElement('div'); div.id = 'modelSelectWarn'; div.className = 'model-select-warn'; div.innerHTML = html; el.closest('.train-panel-body')?.querySelector('.train-actions')?.before(div); }
  } else {
    if (warnEl) warnEl.style.display = 'none';
  }
}

function toggleDefaultModel() {
  const cb = $('#useDefaultModel');
  if (cb.checked) { document.querySelectorAll('.model-card').forEach(c => c.classList.remove('selected')); $('#trainModelValue').value = ''; $('#currentModelLabel').innerHTML = '<em>' + t('train.useSystemDefault') + '</em>'; }
}

async function saveModelTab() {
  const id = _trainAgentId, msg = $('#modelMsg');
  const model = $('#trainModelValue').value;
  msg.textContent = t('common.saving'); msg.className = 'form-msg';
  try {
    const r = await (await authFetch('/api/agents/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model }) })).json();
    if (r.ok) {
      msg.textContent = t('train.modelSaved'); msg.className = 'form-msg success'; showToastMsg(t('train.modelSaved'));
      const ag = AGENTS.find(a => a.id === id);
      const oldModel = ag?.model;
      if (ag) { ag.model = model || null; }
      if (oldModel && oldModel !== model && ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'stop', channel: id }));
      }
      if (typeof renderContacts === 'function') renderContacts();
      if (typeof renderChatList === 'function') renderChatList();
      if (typeof activeChannel !== 'undefined' && activeChannel === id && typeof switchChannel === 'function') switchChannel(id);
    } else { msg.textContent = t('community.failPrefix') + (r.error || ''); msg.className = 'form-msg error'; }
  } catch (e) { msg.textContent = t('common.error') + e.message; msg.className = 'form-msg error'; }
}

async function loadProjectTab(id, body) {
  body.innerHTML = '<div class="train-panel-body"><div class="train-loading">' + t('common.loading') + '</div></div>';
  let wsPath = '';
  try { wsPath = (await (await authFetch('/api/agents/' + id + '/workspace')).json()).workspace || ''; } catch {}
  body.innerHTML = `<div class="train-panel-body">
    <div class="project-info"><div class="project-info-icon">\u{1F4C1}</div><h4>${t('train.projectTitle')}</h4><p>${t('train.projectDesc')}</p></div>
    <div class="train-row"><label>${t('train.wsPath')}</label><input id="trainWsPath" class="train-input" value="${escH(wsPath)}" placeholder="${t('train.wsPlaceholder')}" /></div>
    <div class="project-hint">${t('train.wsHint')}</div>
    <div class="train-actions"><button class="btn-primary" onclick="saveProjectTab()">${t('train.saveWorkspace')}</button><span id="projectMsg" class="form-msg"></span></div>
  </div>`;
}

async function saveProjectTab() {
  const id = _trainAgentId, msg = $('#projectMsg');
  const wsPath = $('#trainWsPath').value.trim();
  if (!wsPath) { msg.textContent = t('train.wsPathRequired'); msg.className = 'form-msg error'; return; }
  msg.textContent = t('common.saving'); msg.className = 'form-msg';
  try { const r = await (await authFetch('/api/agents/' + id + '/workspace', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: wsPath }) })).json(); if (r.ok) { msg.textContent = t('train.wsSaved'); msg.className = 'form-msg success'; showToastMsg(t('train.projectSaved')); } else { msg.textContent = t('community.failPrefix') + (r.error || ''); msg.className = 'form-msg error'; } } catch (e) { msg.textContent = t('common.error') + e.message; msg.className = 'form-msg error'; }
}

// ── Tools Tab ──
let _toolsData = [];
let _toolsDenySet = new Set();
let _toolsAllowSet = null;

async function loadToolsTab(id, body) {
  body.innerHTML = '<div class="train-panel-body"><div class="train-loading">' + t('common.loading') + '</div></div>';

  let agentTools = {};
  try {
    const [toolsResp, configResp] = await Promise.all([
      authFetch('/api/tools').then(r => r.json()),
      authFetch('/api/agents/' + id + '/config').then(r => r.json()),
    ]);
    _toolsData = toolsResp.tools || [];
    agentTools = configResp.tools || {};
  } catch { _toolsData = []; }

  _toolsDenySet = new Set(agentTools.deny || []);
  _toolsAllowSet = agentTools.allow ? new Set(agentTools.allow) : null;

  let h = '<div class="train-panel-body">';
  h += '<div class="tools-tab-header">';
  h += '<div class="tools-tab-title">' + (t('train.toolsTitle') || '工具管理') + '</div>';
  h += '<div class="tools-tab-desc">' + (t('train.toolsDesc') || '为此 Agent 配置可用的工具能力，关闭的工具将不会出现在 LLM 的工具列表中') + '</div>';
  h += '</div>';

  if (_toolsData.length === 0) {
    h += '<div class="tools-empty"><div class="tools-empty-icon">\u{1F6E0}\uFE0F</div>';
    h += '<div class="tools-empty-text">' + (t('train.toolsEmpty') || '暂无已注册工具') + '</div></div>';
  } else {
    const builtinTools = [];
    const mcpGroups = {};
    for (const tool of _toolsData) {
      const isMcp = tool.category && tool.category.startsWith('mcp:');
      if (isMcp) {
        const serverId = tool.category.slice(4);
        if (!mcpGroups[serverId]) mcpGroups[serverId] = [];
        mcpGroups[serverId].push(tool);
      } else {
        builtinTools.push(tool);
      }
    }

    if (builtinTools.length) {
      h += '<div class="tools-section">';
      h += '<div class="tools-section-header"><span class="tools-section-icon">\u{1F527}</span>';
      h += '<span class="tools-section-title">内置工具</span>';
      h += '<span class="tools-section-count">' + builtinTools.length + ' 个</span></div>';
      h += '<div class="tools-grid">';
      for (const tool of builtinTools) {
        h += _renderToolCard(tool);
      }
      h += '</div></div>';
    }

    const mcpServerIds = Object.keys(mcpGroups);
    if (mcpServerIds.length) {
      h += '<div class="tools-section" style="margin-top:20px">';
      h += '<div class="tools-section-header"><span class="tools-section-icon">\u{1F50C}</span>';
      h += '<span class="tools-section-title">MCP 工具</span>';
      h += '<span class="tools-section-count">' + mcpServerIds.length + ' 个服务器</span>';
      h += '<span class="tools-section-hint">工具随 MCP Server 加载，在 设置→MCP 中管理</span></div>';

      for (const serverId of mcpServerIds) {
        const tools = mcpGroups[serverId];
        const allEnabled = tools.every(tl => !_toolsDenySet.has(tl.name));
        const allDisabled = tools.every(tl => _toolsDenySet.has(tl.name));
        const toggleCls = allEnabled ? ' on' : (allDisabled ? '' : ' partial');
        const enabledCount = tools.filter(tl => !_toolsDenySet.has(tl.name)).length;
        const autoExpand = mcpServerIds.length === 1;

        h += '<div class="mcp-group" id="mcpGroup-' + escH(serverId) + '">';
        h += '<div class="mcp-group-header">';
        h += '<div class="mcp-group-left" onclick="_mcpGroupToggleExpand(\'' + escJs(serverId) + '\')">';
        h += '<span class="mcp-group-arrow" id="mcpArrow-' + escH(serverId) + '">' + (autoExpand ? '\u25BC' : '\u25B6') + '</span>';
        h += '<span class="mcp-group-icon">\u{1F50C}</span>';
        h += '<span class="mcp-group-name">' + esc(serverId) + '</span>';
        h += '<span class="mcp-group-stat">' + enabledCount + ' / ' + tools.length + ' 已启用</span>';
        h += '</div>';
        h += '<button class="settings-toggle' + toggleCls + '" id="mcpGroupToggle-' + escH(serverId) + '" onclick="_mcpGroupToggleAll(\'' + escJs(serverId) + '\')"></button>';
        h += '</div>';

        h += '<div class="mcp-group-body' + (autoExpand ? '' : ' hidden') + '" id="mcpBody-' + escH(serverId) + '">';
        h += '<div class="mcp-tool-tags">';
        for (const tool of tools) {
          const safeId = _toolSafeId(tool.name);
          const isEnabled = !_toolsDenySet.has(tool.name);
          const shortName = tool.name.replace(/^mcp:[^:]+:/, '');
          h += '<span class="mcp-tool-chip' + (isEnabled ? '' : ' mcp-tool-chip-off') + '" id="toolCard-' + safeId + '" ';
          h += 'onclick="toggleAgentTool(\'' + escJs(tool.name) + '\',\'' + safeId + '\')" ';
          h += 'title="' + escH(tool.description || shortName) + '">';
          h += '<span class="mcp-chip-dot' + (isEnabled ? ' on' : '') + '" id="toolToggle-' + safeId + '"></span>';
          h += esc(shortName);
          h += '</span>';
        }
        h += '</div></div></div>';
      }
      h += '</div>';
    }

    h += '<div class="tools-quick-actions">';
    h += '<button class="btn-small tools-btn-all" onclick="toolsEnableAll()">' + (t('train.toolsEnableAll') || '全部启用') + '</button>';
    h += '<button class="btn-small tools-btn-none" onclick="toolsDisableAll()">' + (t('train.toolsDisableAll') || '全部禁用') + '</button>';
    h += '</div>';
  }

  h += '<div class="train-actions"><button class="btn-primary" onclick="saveToolsTab()">' + t('common.save') + '</button><span id="toolsMsg" class="form-msg"></span></div>';
  h += '</div>';
  body.innerHTML = h;
}

function _toolCatLabel(cat) {
  if (cat && cat.startsWith('mcp:')) return '🔌 MCP · ' + cat.slice(4);
  const map = { knowledge: t('train.toolCatKnowledge') || '知识', web: t('train.toolCatWeb') || '网络', memory: t('train.toolCatMemory') || '记忆', general: t('train.toolCatGeneral') || '通用', admin: '管理', collaboration: '协作' };
  return map[cat] || cat;
}

function _toolSafeId(name) { return name.replace(/[^a-zA-Z0-9_-]/g, '_'); }

function _isToolEnabled(tool) {
  if (tool.defaultDeny) return !!(_toolsAllowSet && _toolsAllowSet.has(tool.name));
  return !_toolsDenySet.has(tool.name);
}

function _renderToolCard(tool) {
  const isEnabled = _isToolEnabled(tool);
  const isDenyDefault = !!tool.defaultDeny;
  const riskCls = tool.risk === 'high' ? 'risk-high' : (tool.risk === 'medium' ? 'risk-medium' : 'risk-low');
  const riskDot = tool.risk === 'high' ? '\u{1F534}' : (tool.risk === 'medium' ? '\u{1F7E1}' : '\u{1F7E2}');
  const riskLabel = t('train.risk_' + tool.risk) || tool.risk;
  const statusCls = tool.status === 'ready' ? 'tool-status-ready' : 'tool-status-warn';
  const statusLabel = tool.status === 'ready' ? (t('train.toolReady') || '就绪') : (t('train.toolNeedsConfig') || '需配置');
  const statusClick = tool.status !== 'ready' ? ' onclick="closeManagePanel();openSettings(\'tools\')" style="cursor:pointer;text-decoration:underline"' : '';
  const catLabel = _toolCatLabel(tool.category);
  const safeId = _toolSafeId(tool.name);

  let c = '<div class="tool-card ' + (isEnabled ? '' : 'tool-card-disabled') + '" id="toolCard-' + safeId + '">';
  c += '<div class="tool-card-head">';
  c += '<div class="tool-card-icon">' + (tool.icon || '\u{1F527}') + '</div>';
  c += '<div class="tool-card-info"><div class="tool-card-name">' + esc(tool.name) + '</div>';
  c += '<div class="tool-card-cat">' + esc(catLabel) + '</div></div>';
  c += '<button class="settings-toggle' + (isEnabled ? ' on' : '') + '" id="toolToggle-' + safeId + '" onclick="toggleAgentTool(\'' + escJs(tool.name) + '\',\'' + safeId + '\')"></button>';
  c += '</div>';
  c += '<div class="tool-card-desc">' + esc(tool.description) + '</div>';
  c += '<div class="tool-card-footer">';
  c += '<span class="tool-risk-badge ' + riskCls + '">' + riskDot + ' ' + esc(riskLabel) + '</span>';
  c += '<span class="tool-status-badge ' + statusCls + '"' + statusClick + '>' + esc(statusLabel) + '</span>';
  if (isDenyDefault) c += '<span class="tool-approval-badge" id="toolBadge-' + safeId + '" title="此工具默认关闭，开启开关即可授权">\u{1F512} ' + (isEnabled ? '已授权' : '默认关闭') + '</span>';
  else if (tool.requireApproval) c += '<span class="tool-approval-badge">\u{1F6E1}\uFE0F ' + (t('train.toolApproval') || '需审批') + '</span>';
  c += '</div></div>';
  return c;
}

function toggleAgentTool(name, safeId) {
  const sid = safeId || _toolSafeId(name);
  const isMcp = name.startsWith('mcp:');

  if (isMcp) {
    const dot = document.getElementById('toolToggle-' + sid);
    const chip = document.getElementById('toolCard-' + sid);
    if (!dot) return;
    const wasOff = _toolsDenySet.has(name);
    if (wasOff) {
      _toolsDenySet.delete(name);
      dot.classList.add('on');
      if (chip) chip.classList.remove('mcp-tool-chip-off');
    } else {
      _toolsDenySet.add(name);
      dot.classList.remove('on');
      if (chip) chip.classList.add('mcp-tool-chip-off');
    }
    const serverId = (name.match(/^mcp:([^:]+):/) || [])[1];
    if (serverId) _mcpGroupUpdateToggle(serverId);
  } else {
    const tool = _toolsData.find(tl => tl.name === name);
    const isDefaultDeny = tool && tool.defaultDeny;
    const btn = document.getElementById('toolToggle-' + sid);
    const card = document.getElementById('toolCard-' + sid);
    if (!btn) return;
    const isOn = btn.classList.toggle('on');
    if (isDefaultDeny) {
      if (!_toolsAllowSet) _toolsAllowSet = new Set();
      if (isOn) { _toolsAllowSet.add(name); } else { _toolsAllowSet.delete(name); }
      const badge = document.getElementById('toolBadge-' + sid);
      if (badge) badge.textContent = isOn ? '\u{1F512} 已授权' : '\u{1F512} 默认关闭';
    } else {
      if (isOn) { _toolsDenySet.delete(name); } else { _toolsDenySet.add(name); }
    }
    if (card) { if (isOn) card.classList.remove('tool-card-disabled'); else card.classList.add('tool-card-disabled'); }
  }
}

function _mcpGroupToggleExpand(serverId) {
  const body = document.getElementById('mcpBody-' + serverId);
  const arrow = document.getElementById('mcpArrow-' + serverId);
  if (!body) return;
  const isOpen = !body.classList.contains('hidden');
  if (isOpen) {
    body.classList.add('hidden');
    if (arrow) arrow.textContent = '\u25B6';
  } else {
    body.classList.remove('hidden');
    if (arrow) arrow.textContent = '\u25BC';
  }
}

function _mcpGroupToggleAll(serverId) {
  const tools = _toolsData.filter(tl => tl.category === 'mcp:' + serverId);
  if (!tools.length) return;
  const allEnabled = tools.every(tl => !_toolsDenySet.has(tl.name));
  for (const tl of tools) {
    const sid = _toolSafeId(tl.name);
    if (allEnabled) {
      _toolsDenySet.add(tl.name);
      const dot = document.getElementById('toolToggle-' + sid);
      const chip = document.getElementById('toolCard-' + sid);
      if (dot) dot.classList.remove('on');
      if (chip) chip.classList.add('mcp-tool-chip-off');
    } else {
      _toolsDenySet.delete(tl.name);
      const dot = document.getElementById('toolToggle-' + sid);
      const chip = document.getElementById('toolCard-' + sid);
      if (dot) dot.classList.add('on');
      if (chip) chip.classList.remove('mcp-tool-chip-off');
    }
  }
  _mcpGroupUpdateToggle(serverId);
}

function _mcpGroupUpdateToggle(serverId) {
  const tools = _toolsData.filter(tl => tl.category === 'mcp:' + serverId);
  const toggle = document.getElementById('mcpGroupToggle-' + serverId);
  const group = document.getElementById('mcpGroup-' + serverId);
  const stat = group ? group.querySelector('.mcp-group-stat') : null;
  if (!toggle) return;
  const enabledCount = tools.filter(tl => !_toolsDenySet.has(tl.name)).length;
  const allOn = enabledCount === tools.length;
  const allOff = enabledCount === 0;
  toggle.className = 'settings-toggle' + (allOn ? ' on' : (allOff ? '' : ' partial'));
  if (stat) stat.textContent = enabledCount + ' / ' + tools.length + ' 已启用';
}

function toolsEnableAll() {
  _toolsDenySet.clear();
  if (!_toolsAllowSet) _toolsAllowSet = new Set();
  _toolsData.forEach(td => {
    const sid = _toolSafeId(td.name);
    if (td.defaultDeny) {
      _toolsAllowSet.add(td.name);
      const badge = document.getElementById('toolBadge-' + sid);
      if (badge) badge.textContent = '\u{1F512} 已授权';
    }
    const isMcp = td.category && td.category.startsWith('mcp:');
    if (isMcp) {
      const dot = document.getElementById('toolToggle-' + sid);
      const chip = document.getElementById('toolCard-' + sid);
      if (dot) dot.classList.add('on');
      if (chip) chip.classList.remove('mcp-tool-chip-off');
    } else {
      const btn = document.getElementById('toolToggle-' + sid);
      const card = document.getElementById('toolCard-' + sid);
      if (btn && !btn.classList.contains('on')) btn.classList.add('on');
      if (card) card.classList.remove('tool-card-disabled');
    }
  });
  const mcpServers = new Set();
  _toolsData.forEach(td => { if (td.category && td.category.startsWith('mcp:')) mcpServers.add(td.category.slice(4)); });
  mcpServers.forEach(sid => _mcpGroupUpdateToggle(sid));
}

function toolsDisableAll() {
  if (_toolsAllowSet) _toolsAllowSet.clear();
  _toolsData.forEach(td => {
    const sid = _toolSafeId(td.name);
    if (td.defaultDeny) {
      const badge = document.getElementById('toolBadge-' + sid);
      if (badge) badge.textContent = '\u{1F512} 默认关闭';
    } else {
      _toolsDenySet.add(td.name);
    }
    const isMcp = td.category && td.category.startsWith('mcp:');
    if (isMcp) {
      const dot = document.getElementById('toolToggle-' + sid);
      const chip = document.getElementById('toolCard-' + sid);
      if (dot) dot.classList.remove('on');
      if (chip) chip.classList.add('mcp-tool-chip-off');
    } else {
      const btn = document.getElementById('toolToggle-' + sid);
      const card = document.getElementById('toolCard-' + sid);
      if (btn && btn.classList.contains('on')) btn.classList.remove('on');
      if (card) card.classList.add('tool-card-disabled');
    }
  });
  const mcpServers = new Set();
  _toolsData.forEach(td => { if (td.category && td.category.startsWith('mcp:')) mcpServers.add(td.category.slice(4)); });
  mcpServers.forEach(sid => _mcpGroupUpdateToggle(sid));
}

async function saveToolsTab() {
  const id = _trainAgentId, msg = $('#toolsMsg');
  const deny = [..._toolsDenySet];
  const hasDefaultDenyEnabled = _toolsAllowSet && _toolsAllowSet.size > 0;
  let allow = [];
  if (hasDefaultDenyEnabled) {
    _toolsData.forEach(td => {
      if (td.defaultDeny) {
        if (_toolsAllowSet.has(td.name)) allow.push(td.name);
      } else {
        if (!_toolsDenySet.has(td.name)) allow.push(td.name);
      }
    });
  }
  const tools = {};
  if (deny.length > 0) tools.deny = deny;
  if (allow.length > 0) tools.allow = allow;
  msg.textContent = t('common.saving'); msg.className = 'form-msg';
  try {
    const r = await (await authFetch('/api/agents/' + id, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tools })
    })).json();
    if (r.ok) {
      msg.textContent = t('train.toolsSaved') || t('common.success');
      msg.className = 'form-msg success';
      showToastMsg(t('train.toolsSaved') || t('common.success'));
      const ag = AGENTS.find(a => a.id === id);
      if (ag) ag.tools = tools;
    } else {
      msg.textContent = t('community.failPrefix') + (r.error || '');
      msg.className = 'form-msg error';
    }
  } catch (e) {
    msg.textContent = t('common.error') + e.message;
    msg.className = 'form-msg error';
  }
}

async function saveAgentDetail(id) {
  const name=$('#editAgentName').value.trim(), soul=$('#editAgentSoul').value, model=$('#editAgentModel').value, msg=$('#agentDetailMsg');
  if (!name) { msg.textContent=t('train.nameRequired'); return; } msg.textContent=t('common.saving');
  try { const d=await(await authFetch('/api/agents/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,description:soul,model})})).json(); if(d.ok){msg.textContent=t('common.success');setTimeout(()=>openAgentDetail(id),2000);}else msg.textContent=t('community.failPrefix')+(d.error||'unknown'); } catch(e){msg.textContent=t('common.error')+e.message;}
}

async function deleteAgentConfirm(id) {
  if(!await appConfirm(t('manage.deleteConfirm', {name: AGENTS.find(a=>a.id===id)?.name||id}))) return;
  try { await authFetch('/api/agents/'+id,{method:'DELETE'}); setTimeout(()=>renderAgentManager(),2000); } catch(e){appAlert(t('common.error')+e.message);}
}

// ── Memory Tab (M2.5) ──

let _memoryData = [];
let _memoryStats = {};

async function loadMemoryTab(id, body) {
  body.innerHTML = '<div class="train-panel-body"><div class="train-loading">' + t('common.loading') + '</div></div>';
  try {
    const resp = await (await authFetch('/api/agents/' + id + '/memories?limit=200')).json();
    _memoryData = resp.memories || [];
    _memoryStats = resp.stats || {};
  } catch { _memoryData = []; _memoryStats = {}; }
  _renderMemoryList(id, body);
}

function _renderMemoryList(id, body) {
  const typeIcons = { semantic: '\u{1F9E0}', episodic: '\u{1F4C5}', procedural: '\u26A1' };
  const impLabels = { high: 'HIGH', medium: 'MED', low: 'LOW' };
  const impClass = { high: 'mem-imp-high', medium: 'mem-imp-med', low: 'mem-imp-low' };

  let html = '<div class="train-panel-body memory-tab-body">';

  if (!_memoryData.length) {
    html += '<div class="memory-empty">' + (t('train.memoryEmpty') || '暂无记忆，Agent 在对话中调用 memory_write 后会出现在这里') + '</div>';
  } else {
    html += '<div class="memory-list">';
    for (const m of _memoryData) {
      const icon = typeIcons[m.type] || '\u{1F9E0}';
      const typeLabel = m.type || 'semantic';
      const imp = impLabels[m.importance] || 'MED';
      const cls = impClass[m.importance] || 'mem-imp-med';
      const tags = (m.tags || []).map(tg => '<span class="mem-tag">#' + esc(tg) + '</span>').join('');
      const content = esc(m.content.length > 150 ? m.content.slice(0, 150) + '…' : m.content);
      const time = formatTime(m.createdAt);
      const safeId = escJs(m.id);
      html += `<div class="memory-item" data-mid="${escH(m.id)}">
        <div class="mem-item-header">
          <span class="mem-type-icon">${icon}</span>
          <span class="mem-type-label">${typeLabel}</span>
          <span class="mem-imp ${cls}">${imp}</span>
          <span class="mem-time">${time}</span>
          <button class="mem-del-btn" onclick="event.stopPropagation();deleteMemoryItem('${escJs(id)}','${safeId}')" title="${t('common.delete') || '删除'}">&times;</button>
        </div>
        <div class="mem-item-content">${content}</div>
        ${tags ? '<div class="mem-item-tags">' + tags + '</div>' : ''}
      </div>`;
    }
    html += '</div>';
  }

  const total = _memoryData.length;
  const byType = {};
  for (const m of _memoryData) byType[m.type] = (byType[m.type] || 0) + 1;
  html += `<div class="memory-stats">${t('train.memoryStats') || '共'} ${total} ${t('train.memoryStatsItems') || '条记忆'}`;
  if (byType.semantic) html += ` · ${t('train.memTypeSemantic') || '语义'} ${byType.semantic}`;
  if (byType.episodic) html += ` · ${t('train.memTypeEpisodic') || '情景'} ${byType.episodic}`;
  if (byType.procedural) html += ` · ${t('train.memTypeProcedural') || '技能'} ${byType.procedural}`;
  html += '</div></div>';

  body.innerHTML = html;
}

async function deleteMemoryItem(agentId, memId) {
  try {
    const resp = await authFetch('/api/agents/' + agentId + '/memories/' + memId, { method: 'DELETE' });
    const result = await resp.json();
    if (!result.ok) { showToastMsg(t('common.fail') || '删除失败', 'error'); return; }
    _memoryData = _memoryData.filter(m => m.id !== memId);
    const el = document.querySelector(`.memory-item[data-mid="${memId}"]`);
    if (el) { el.style.opacity = '0'; el.style.transform = 'translateX(20px)'; setTimeout(() => { el.remove(); _updateMemoryStats(); }, 200); }
    else { const body = $('#trainBody'); if (body) _renderMemoryList(agentId, body); }
  } catch (e) { showToastMsg(t('common.error') + e.message, 'error'); }
}

function _updateMemoryStats() {
  const el = document.querySelector('.memory-stats');
  if (!el) return;
  const total = _memoryData.length;
  const byType = {};
  for (const m of _memoryData) byType[m.type] = (byType[m.type] || 0) + 1;
  let text = (t('train.memoryStats') || '共') + ' ' + total + ' ' + (t('train.memoryStatsItems') || '条记忆');
  if (byType.semantic) text += ` · ${t('train.memTypeSemantic') || '语义'} ${byType.semantic}`;
  if (byType.episodic) text += ` · ${t('train.memTypeEpisodic') || '情景'} ${byType.episodic}`;
  if (byType.procedural) text += ` · ${t('train.memTypeProcedural') || '技能'} ${byType.procedural}`;
  el.textContent = text;
}
