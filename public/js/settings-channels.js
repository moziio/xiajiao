/* 虾饺 (Xiajiao) — Channel Settings UI (Layer 2) */

let _chPresets = [];
let _chList = [];
let _chAddMode = false;

async function renderSettingsChannels(ct) {
  ct.innerHTML = '<div class="settings-section">' +
    '<div class="settings-section-title">\uD83C\uDF10 外部平台对接 (Channel)</div>' +
    '<div class="settings-section-desc">将虾饺 Agent 连接到企业微信、飞书、钉钉、Telegram 等外部平台。<br>' +
    '增加新平台无需写代码 — 选择预设或自定义配置即可。</div>' +
    '<div id="chChannelList"><div style="color:var(--text3);padding:12px">加载中...</div></div>' +
    '<button class="settings-btn settings-btn-outline" id="chAddBtn" onclick="_chToggleAdd()" style="margin-top:12px">' +
    '+ 添加 Channel</button>' +
    '<div id="chAddPanel" class="hidden" style="margin-top:14px"></div></div>';
  await _chLoadAll();
}

async function _chLoadAll() {
  try {
    const [chResp, presetResp] = await Promise.all([
      authFetch('/api/channels').then(r => r.json()),
      authFetch('/api/channels/presets').then(r => r.json()),
    ]);
    _chList = chResp.channels || [];
    _chPresets = presetResp.presets || [];
    _chRenderList();
  } catch (e) {
    const el = document.getElementById('chChannelList');
    if (el) el.innerHTML = '<div style="color:var(--text3)">加载失败: ' + esc(e.message) + '</div>';
  }
}

function _chRenderList() {
  const el = document.getElementById('chChannelList');
  if (!el) return;
  if (!_chList.length) {
    el.innerHTML = '<div class="ch-empty"><div class="ch-empty-icon">\uD83C\uDF10</div>' +
      '<div class="ch-empty-text">尚未配置 Channel</div>' +
      '<div class="ch-empty-hint">添加 Channel 后，外部平台用户可直接与你的 Agent 对话</div></div>';
    return;
  }
  el.innerHTML = '<div class="ch-grid">' + _chList.map(_chCard).join('') + '</div>';
}

function _chCard(ch) {
  const preset = _chPresets.find(p => p.id === ch.type);
  const icon = preset?.icon || ch.preset?.icon || '\uD83D\uDD17';
  const typeName = preset?.name || ch.type || '自定义';
  const statusMap = { connected: ['在线', 'ch-status-on'], connecting: ['连接中', 'ch-status-warn'],
    disconnected: ['已断开', 'ch-status-off'], error: ['错误', 'ch-status-err'], idle: ['未启动', 'ch-status-idle'] };
  const [statusText, statusCls] = statusMap[ch.status] || ['未知', 'ch-status-idle'];

  const today = new Date().toISOString().slice(0, 10);
  const todayStats = ch.stats?.[today] || {};
  const received = todayStats.received || 0;
  const sent = todayStats.sent || 0;

  const safeId = escJs(ch.id);
  let h = '<div class="ch-card" id="chCard-' + escH(ch.id) + '">';
  h += '<div class="ch-card-header">';
  h += '<span class="ch-card-icon">' + icon + '</span>';
  h += '<div class="ch-card-info"><div class="ch-card-name">' + esc(ch.name || ch.id) + '</div>';
  h += '<div class="ch-card-type">' + esc(typeName) + '</div></div>';
  h += '<span class="ch-status ' + statusCls + '">' + statusText + '</span>';
  h += '</div>';

  if (ch.error) {
    h += '<div class="ch-card-error">' + esc((ch.error || '').slice(0, 120)) + '</div>';
  }

  h += '<div class="ch-card-stats">';
  h += '<span>今日: 收到 ' + received + ' / 回复 ' + sent + '</span>';
  if (ch.config?.imAgentId) {
    const ag = AGENTS.find(a => a.id === ch.config.imAgentId);
    h += '<span>Agent: ' + esc(ag?.name || ch.config.imAgentId) + '</span>';
  }
  h += '</div>';

  h += '<div class="ch-card-actions">';
  if (ch.status === 'connected' || ch.status === 'connecting') {
    h += '<button class="btn-small ch-btn-stop" onclick="_chStop(\'' + safeId + '\')">停用</button>';
  } else {
    h += '<button class="btn-small ch-btn-start" onclick="_chStart(\'' + safeId + '\')">启动</button>';
  }
  h += '<button class="btn-small" onclick="_chEdit(\'' + safeId + '\')">配置</button>';
  h += '<button class="btn-small" onclick="_chTest(\'' + safeId + '\')">测试</button>';
  h += '<button class="btn-small ch-btn-del" onclick="_chDelete(\'' + safeId + '\')">&times;</button>';
  h += '</div>';

  const webhookPath = '/channel/' + ch.id + '/callback';
  h += '<div class="ch-card-webhook"><span class="ch-webhook-label">Webhook:</span> ' +
    '<code class="ch-webhook-url">' + esc(location.origin + webhookPath) + '</code>' +
    '<button class="ch-copy-btn" onclick="_chCopyUrl(\'' + escJs(location.origin + webhookPath) + '\')" title="复制">📋</button></div>';

  h += '</div>';
  return h;
}

function _chCopyUrl(url) {
  navigator.clipboard.writeText(url).then(() => showToastMsg('已复制'));
}

async function _chStart(id) {
  try {
    await authFetch('/api/channels/' + id + '/start', { method: 'POST' });
    showToastMsg('Channel 已启动');
    await _chLoadAll();
  } catch (e) { showToastMsg('启动失败: ' + e.message, 'error'); }
}

async function _chStop(id) {
  try {
    await authFetch('/api/channels/' + id + '/stop', { method: 'POST' });
    showToastMsg('Channel 已停用');
    await _chLoadAll();
  } catch (e) { showToastMsg('停用失败: ' + e.message, 'error'); }
}

async function _chTest(id) {
  try {
    const r = await (await authFetch('/api/channels/' + id + '/test', { method: 'POST' })).json();
    showToastMsg(r.ok ? (r.message || '测试通过') : (r.error || '测试失败'), r.ok ? 'success' : 'error');
  } catch (e) { showToastMsg('测试失败: ' + e.message, 'error'); }
}

async function _chDelete(id) {
  if (!await appConfirm('确定删除此 Channel？所有会话记录将保留在 IM 中。')) return;
  try {
    await authFetch('/api/channels/' + id, { method: 'DELETE' });
    showToastMsg('已删除');
    await _chLoadAll();
    if (typeof loadExtChannelMap === 'function') loadExtChannelMap();
  } catch (e) { showToastMsg('删除失败: ' + e.message, 'error'); }
}

function _chToggleAdd() {
  const panel = document.getElementById('chAddPanel');
  const btn = document.getElementById('chAddBtn');
  if (!panel) return;
  _chAddMode = !_chAddMode;
  if (_chAddMode) {
    panel.classList.remove('hidden');
    btn.textContent = '取消';
    _chRenderAddPanel();
  } else {
    panel.classList.add('hidden');
    btn.textContent = '+ 添加 Channel';
  }
}

function _chRenderAddPanel() {
  const panel = document.getElementById('chAddPanel');
  if (!panel) return;
  let h = '<div class="ch-add-section">';
  h += '<div class="ch-add-title">选择平台</div>';
  h += '<div class="ch-preset-grid">';
  for (const p of _chPresets) {
    h += '<div class="ch-preset-card" onclick="_chSelectPreset(\'' + escJs(p.id) + '\', this)">';
    h += '<div class="ch-preset-icon">' + (p.icon || '\uD83D\uDD17') + '</div>';
    h += '<div class="ch-preset-name">' + esc(p.name) + '</div>';
    h += '</div>';
  }
  h += '<div class="ch-preset-card" onclick="_chSelectPreset(\'custom\', this)">';
  h += '<div class="ch-preset-icon">\uD83D\uDD27</div>';
  h += '<div class="ch-preset-name">自定义</div>';
  h += '</div>';
  h += '</div>';
  h += '<div id="chConfigForm"></div>';
  h += '</div>';
  panel.innerHTML = h;
}

function _chSelectPreset(presetId, el) {
  document.querySelectorAll('.ch-preset-card').forEach(c => c.classList.remove('selected'));
  if (el) el.classList.add('selected');

  const form = document.getElementById('chConfigForm');
  if (!form) return;

  if (presetId === 'custom') {
    _chRenderCustomForm(form);
    return;
  }

  const preset = _chPresets.find(p => p.id === presetId);
  if (!preset) return;
  _chRenderPresetForm(form, preset);
}

function _chRenderPresetForm(form, preset) {
  let h = '<div class="ch-form">';
  h += '<div class="ch-form-title">' + (preset.icon || '') + ' ' + esc(preset.name) + '</div>';

  if (preset.guide) {
    h += '<div class="ch-guide">';
    h += '<div class="ch-guide-title">' + esc(preset.guide.title) + '</div>';
    h += '<ol class="ch-guide-steps">';
    for (const step of preset.guide.steps) {
      h += '<li>';
      if (step.url) h += '<a href="' + escH(step.url) + '" target="_blank">' + esc(step.text) + '</a>';
      else h += esc(step.text);
      h += '</li>';
    }
    h += '</ol></div>';
  }

  h += '<div class="ch-form-row"><label>Channel 名称</label>';
  h += '<input class="settings-input" id="chFormName" value="' + escH(preset.name) + '" /></div>';

  for (const field of (preset.configFields || [])) {
    h += '<div class="ch-form-row"><label>' + esc(field.label) + (field.required ? ' *' : '') + '</label>';
    if (field.type === 'agent') {
      h += '<select class="settings-select" id="chField-' + escH(field.key) + '">';
      h += '<option value="">-- 选择 Agent --</option>';
      for (const ag of AGENTS) {
        h += '<option value="' + escH(ag.id) + '">' + esc(ag.emoji + ' ' + ag.name) + '</option>';
      }
      h += '</select>';
    } else if (field.type === 'password') {
      h += '<input class="settings-input" type="password" id="chField-' + escH(field.key) + '" placeholder="' + escH(field.help || '') + '" />';
    } else {
      h += '<input class="settings-input" id="chField-' + escH(field.key) + '" placeholder="' + escH(field.help || '') + '" />';
    }
    if (field.help && field.type !== 'password') {
      h += '<div class="ch-field-hint">' + esc(field.help) + '</div>';
    }
    h += '</div>';
  }

  h += '<div class="ch-form-actions">';
  h += '<button class="settings-btn" onclick="_chCreateFromPreset(\'' + escJs(preset.id) + '\')">✅ 创建并启用</button>';
  h += '</div></div>';
  form.innerHTML = h;
}

function _chRenderCustomForm(form) {
  let h = '<div class="ch-form">';
  h += '<div class="ch-form-title">\uD83D\uDD27 自定义 Channel</div>';

  h += '<div class="ch-form-row"><label>名称 *</label>';
  h += '<input class="settings-input" id="chFormName" placeholder="例如: 我的客服系统" /></div>';

  h += '<div class="ch-form-row"><label>协议</label>';
  h += '<select class="settings-select" id="chCustomProtocol">';
  h += '<option value="webhook">Webhook（被动接收，推荐）</option>';
  h += '<option value="websocket">WebSocket（主动连接）</option>';
  h += '</select></div>';

  h += '<div class="ch-form-row"><label>响应 Agent *</label>';
  h += '<select class="settings-select" id="chField-imAgentId">';
  h += '<option value="">-- 选择 Agent --</option>';
  for (const ag of AGENTS) {
    h += '<option value="' + escH(ag.id) + '">' + esc(ag.emoji + ' ' + ag.name) + '</option>';
  }
  h += '</select></div>';

  h += '<div class="ch-custom-section"><div class="ch-form-subtitle">入站消息映射（JSONPath）</div>';
  h += '<div class="ch-form-row"><label>用户ID 字段路径</label>';
  h += '<input class="settings-input" id="chCustomInUserId" value="user_id" /></div>';
  h += '<div class="ch-form-row"><label>消息内容字段路径</label>';
  h += '<input class="settings-input" id="chCustomInText" value="text" /></div>';
  h += '<div class="ch-form-row"><label>消息ID 字段路径</label>';
  h += '<input class="settings-input" id="chCustomInMsgId" value="msg_id" /></div>';
  h += '</div>';

  h += '<div class="ch-custom-section"><div class="ch-form-subtitle">出站回复配置（可选）</div>';
  h += '<div class="ch-form-row"><label>推送 API 地址</label>';
  h += '<input class="settings-input" id="chCustomOutUrl" placeholder="https://..." /></div>';
  h += '<div class="ch-form-row"><label>Body 模板 (JSON)</label>';
  h += '<textarea class="settings-textarea" id="chCustomOutBody" rows="4" placeholder=\'{"to": "{{userId}}", "content": "{{text}}"}\'></textarea></div>';
  h += '</div>';

  h += '<div class="ch-form-actions">';
  h += '<button class="settings-btn" onclick="_chCreateCustom()">✅ 创建并启用</button>';
  h += '</div></div>';
  form.innerHTML = h;
}

async function _chCreateFromPreset(presetId) {
  const preset = _chPresets.find(p => p.id === presetId);
  if (!preset) return;
  const name = document.getElementById('chFormName')?.value?.trim() || preset.name;

  const config = {};
  for (const field of (preset.configFields || [])) {
    const el = document.getElementById('chField-' + field.key);
    const val = el?.value?.trim() || '';
    if (field.required && !val) {
      showToastMsg(field.label + ' 为必填项', 'error');
      if (el) el.focus();
      return;
    }
    config[field.key] = val;
  }

  try {
    const r = await (await authFetch('/api/channels', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: presetId, name, config, mode: preset.defaultMode || 'webhook' }),
    })).json();

    if (r.ok && r.channel) {
      showToastMsg('Channel 已创建');
      try { await authFetch('/api/channels/' + r.channel.id + '/start', { method: 'POST' }); } catch {}
      _chAddMode = false;
      document.getElementById('chAddPanel')?.classList.add('hidden');
      document.getElementById('chAddBtn').textContent = '+ 添加 Channel';
      await _chLoadAll();
      if (typeof loadExtChannelMap === 'function') loadExtChannelMap();
    } else {
      showToastMsg(r.error || '创建失败', 'error');
    }
  } catch (e) { showToastMsg('创建失败: ' + e.message, 'error'); }
}

async function _chCreateCustom() {
  const name = document.getElementById('chFormName')?.value?.trim();
  if (!name) { showToastMsg('请输入名称', 'error'); return; }

  const agentId = document.getElementById('chField-imAgentId')?.value;
  if (!agentId) { showToastMsg('请选择响应 Agent', 'error'); return; }

  const protocol = document.getElementById('chCustomProtocol')?.value || 'webhook';

  const preset = {
    id: 'custom',
    protocol,
    inbound: {
      format: 'json',
      userIdPath: document.getElementById('chCustomInUserId')?.value || 'user_id',
      textPath: document.getElementById('chCustomInText')?.value || 'text',
      msgIdPath: document.getElementById('chCustomInMsgId')?.value || 'msg_id',
    },
  };

  const outUrl = document.getElementById('chCustomOutUrl')?.value?.trim();
  const outBody = document.getElementById('chCustomOutBody')?.value?.trim();
  if (outUrl) {
    preset.outbound = { url: outUrl, method: 'POST', headers: { 'Content-Type': 'application/json' } };
    if (outBody) {
      try { preset.outbound.bodyTemplate = JSON.parse(outBody); } catch {
        showToastMsg('Body 模板不是有效的 JSON', 'error'); return;
      }
    }
  }

  if (protocol === 'webhook') {
    preset.webhook = { path: '/channel/{{channelId}}/callback' };
  }

  const config = { imAgentId: agentId };

  try {
    const r = await (await authFetch('/api/channels', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'custom', name, preset, config, mode: protocol }),
    })).json();

    if (r.ok && r.channel) {
      showToastMsg('Channel 已创建');
      try { await authFetch('/api/channels/' + r.channel.id + '/start', { method: 'POST' }); } catch {}
      _chAddMode = false;
      document.getElementById('chAddPanel')?.classList.add('hidden');
      document.getElementById('chAddBtn').textContent = '+ 添加 Channel';
      await _chLoadAll();
      if (typeof loadExtChannelMap === 'function') loadExtChannelMap();
    } else {
      showToastMsg(r.error || '创建失败', 'error');
    }
  } catch (e) { showToastMsg('创建失败: ' + e.message, 'error'); }
}

async function _chEdit(id) {
  const ch = _chList.find(c => c.id === id);
  if (!ch) return;
  const preset = _chPresets.find(p => p.id === ch.type);

  let h = '<div class="ch-form">';
  h += '<div class="ch-form-title">编辑 ' + esc(ch.name || ch.id) + '</div>';

  h += '<div class="ch-form-row"><label>名称</label>';
  h += '<input class="settings-input" id="chEditName" value="' + escH(ch.name || '') + '" /></div>';

  h += '<div class="ch-form-row"><label>启用</label>';
  h += '<label class="ch-toggle-label"><input type="checkbox" id="chEditEnabled" ' + (ch.enabled ? 'checked' : '') + ' />';
  h += '<span>' + (ch.enabled ? '已启用' : '已禁用') + '</span></label></div>';

  if (preset?.configFields) {
    for (const field of preset.configFields) {
      const val = ch.config?.[field.key] || '';
      h += '<div class="ch-form-row"><label>' + esc(field.label) + '</label>';
      if (field.type === 'agent') {
        h += '<select class="settings-select" id="chEditField-' + escH(field.key) + '">';
        h += '<option value="">-- 选择 --</option>';
        for (const ag of AGENTS) {
          h += '<option value="' + escH(ag.id) + '"' + (val === ag.id ? ' selected' : '') + '>' + esc(ag.emoji + ' ' + ag.name) + '</option>';
        }
        h += '</select>';
      } else if (field.type === 'password') {
        h += '<input class="settings-input" type="password" id="chEditField-' + escH(field.key) + '" placeholder="' + (val ? '(已设置)' : '') + '" />';
      } else {
        h += '<input class="settings-input" id="chEditField-' + escH(field.key) + '" value="' + escH(val) + '" />';
      }
      h += '</div>';
    }
  }

  h += '<div class="ch-form-actions">';
  h += '<button class="settings-btn" onclick="_chSaveEdit(\'' + escJs(id) + '\')">保存</button>';
  h += '<button class="settings-btn settings-btn-outline" onclick="_chLoadAll()">取消</button>';
  h += '</div></div>';

  const card = document.getElementById('chCard-' + id);
  if (card) {
    card.outerHTML = '<div class="ch-card ch-card-edit" id="chCard-' + escH(id) + '">' + h + '</div>';
  }
}

async function _chSaveEdit(id) {
  const ch = _chList.find(c => c.id === id);
  if (!ch) return;
  const preset = _chPresets.find(p => p.id === ch.type);

  const updates = {};
  const nameEl = document.getElementById('chEditName');
  if (nameEl) updates.name = nameEl.value.trim();

  const enabledEl = document.getElementById('chEditEnabled');
  if (enabledEl) updates.enabled = enabledEl.checked;

  if (preset?.configFields) {
    const config = { ...ch.config };
    for (const field of preset.configFields) {
      const el = document.getElementById('chEditField-' + field.key);
      if (!el) continue;
      const val = el.value.trim();
      if (field.type === 'password' && !val) continue;
      config[field.key] = val;
    }
    updates.config = config;
  }

  try {
    await authFetch('/api/channels/' + id, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    showToastMsg('已保存');
    await _chLoadAll();
    if (typeof loadExtChannelMap === 'function') loadExtChannelMap();
  } catch (e) { showToastMsg('保存失败: ' + e.message, 'error'); }
}
