/* 虾饺 (Xiajiao) — Settings: LLM Connection & Auth (Layer 2) */

let _gwStatus = { connected: false, ws: '', http: '', llmMode: 'direct' };

let _gwToolEvents = false;

async function renderSettingsGateway(ct) {
  try { _gwStatus = await (await authFetch('/api/settings/gateway/status')).json(); } catch {}
  try { const s = await (await authFetch('/api/settings')).json(); _gwToolEvents = !!s.gatewayToolEvents; } catch {}
  ct.innerHTML = '<div class="settings-section" id="stGwSection"></div>';
  _renderGwForm();
}

function _renderGwForm() {
  const el = document.getElementById('stGwSection'); if (!el) return;
  const isDirect = (document.getElementById('stLlmMode')?.value || _gwStatus.llmMode || 'direct') !== 'gateway';
  const dotClass = _gwStatus.connected ? 'online' : 'offline';
  const statusText = _gwStatus.connected ? t('settings.llmConnected') : t('settings.llmDisconnected');

  let html = '<div class="settings-section-title">' + (t('settings.llmTitle') || 'LLM 连接') + '</div>' +
    '<div class="settings-section-desc">' + (t('settings.llmDesc') || '管理 LLM 调用模式和连接配置') + '</div>' +
    '<div class="settings-row"><div class="settings-label">' + (t('settings.llmModeLabel') || 'LLM 模式') + '</div><div class="settings-value">' +
    '<select class="settings-input" id="stLlmMode" style="width:auto" onchange="_renderGwForm()"><option value="direct"' + (isDirect ? ' selected' : '') + '>' + (t('settings.directMode') || '直连 LLM') + '</option><option value="gateway"' + (!isDirect ? ' selected' : '') + '>Gateway</option></select></div></div>' +
    '<div class="settings-row"><div class="settings-label">' + (t('settings.llmStatusLabel') || 'LLM 状态') + '</div><div class="settings-value"><span class="about-badge ' + dotClass + '">' + statusText + '</span></div></div>';

  if (!isDirect) {
    html += '<div id="stGwConfig" style="border:1px solid var(--border);border-radius:10px;padding:14px;margin-top:8px;background:var(--bg3)">' +
      '<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:10px">' + t('settings.gatewayConfig') + '</div>' +
      '<div class="settings-row"><div class="settings-label">' + t('settings.gatewayWs') + '</div><div class="settings-value"><input class="settings-input" id="stGwWs" value="' + escH(_gwStatus.ws) + '" placeholder="ws://127.0.0.1:18789/ws" autocomplete="off"></div></div>' +
      '<div class="settings-row"><div class="settings-label">' + t('settings.gatewayHttp') + '</div><div class="settings-value"><input class="settings-input" id="stGwHttp" value="' + escH(_gwStatus.http) + '" placeholder="http://127.0.0.1:18789" autocomplete="off"></div></div>' +
      '<div class="settings-row"><div class="settings-label">' + t('settings.gatewayToken') + '</div><div class="settings-value"><input class="settings-input" id="stGwToken" type="password" placeholder="' + t('settings.gatewayTokenPH') + '" autocomplete="new-password"></div></div>' +
      '<div class="settings-row"><div><div class="settings-label">' + (t('settings.gwToolEvents') || 'Gateway 工具事件透传') + '</div><div class="settings-label-hint">' + (t('settings.gwToolEventsHint') || '开启后前端可实时展示 Gateway 模式下的工具调用过程') + '</div></div>' +
      '<div class="settings-value"><button class="settings-toggle' + (_gwToolEvents ? ' on' : '') + '" id="stGwToolToggle" onclick="toggleGwToolEvents()"></button></div></div>' +
      '<button class="settings-btn settings-btn-outline" onclick="reconnectGateway()" style="margin-top:8px">' + t('settings.reconnect') + '</button>' +
      '</div>';
  } else {
    html += '<div style="margin-top:8px;font-size:12px;color:var(--text3)">' + t('settings.directModeHint') + '</div>';
  }

  html += '<div style="text-align:right;margin-top:12px"><button class="settings-btn settings-btn-primary" onclick="saveGatewaySettings()">' + t('common.save') + '</button></div>';
  el.innerHTML = html;
}

async function saveGatewaySettings() {
  const mode = document.getElementById('stLlmMode')?.value || 'direct';
  const ws = document.getElementById('stGwWs')?.value?.trim();
  const http = document.getElementById('stGwHttp')?.value?.trim();
  const token = document.getElementById('stGwToken')?.value?.trim();
  const body = { llmMode: mode };
  if (ws) body.gatewayWs = ws; if (http) body.gatewayHttp = http; if (token) body.gatewayToken = token;
  try {
    await authFetch('/api/settings', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    showToastMsg(t('settings.saved') + (t('settings.restartHint') || '（重启后生效）'));
  } catch (e) { showToastMsg(t('common.fail'), 'error'); }
}

async function reconnectGateway() {
  try { await authFetch('/api/settings/gateway/reconnect', { method: 'POST' }); showToastMsg(t('settings.reconnected')); setTimeout(() => renderSettingsGateway($('#settingsContent')), 2000); } catch (e) { showToastMsg(t('common.fail'), 'error'); }
}

async function renderSettingsAuth(ct) {
  ct.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text3)">' + t('common.loading') + '</div>';
  let sessionCount = 0, rkHasAdmin = false, rkHasMember = false, guestCanChat = true;
  await Promise.all([
    authFetch('/api/auth/sessions').then(r => r.json()).then(r => { sessionCount = r.count || 0; }).catch(() => {}),
    authFetch('/api/settings/role-keys').then(r => r.json()).then(r => { rkHasAdmin = r.hasAdminKey; rkHasMember = r.hasMemberKey; }).catch(() => {}),
    authFetch('/api/settings').then(r => r.json()).then(r => { if (r.guestCanChat !== undefined) guestCanChat = !!r.guestCanChat; }).catch(() => {})
  ]);
  if (activeSettingsTab !== 'auth') return;

  ct.innerHTML = '<div class="settings-section"><div class="settings-section-title">' + t('settings.changeKey') + '</div>' +
    '<div class="settings-row"><div class="settings-label">' + t('settings.newKey') + '</div><div class="settings-value"><input class="settings-input mask-text" id="stNewKey" type="text" placeholder="' + t('settings.newKeyPlaceholder') + '" autocomplete="off"></div></div>' +
    '<div class="settings-row"><div class="settings-label">' + t('settings.confirmKey') + '</div><div class="settings-value"><input class="settings-input mask-text" id="stConfirmKey" type="text" placeholder="' + t('settings.confirmKeyPlaceholder') + '" autocomplete="off"></div></div>' +
    '<div style="text-align:right;margin-top:12px"><button class="settings-btn settings-btn-primary" onclick="changeOwnerKey()">' + t('common.save') + '</button></div></div>' +
    '<div class="settings-section"><div class="settings-section-title">' + t('settings.roleKeysTitle') + '</div>' +
    '<div class="settings-row"><div><div class="settings-label">' + t('settings.adminKey') + '</div><div class="settings-label-hint">' + t('settings.adminKeyHint') + '</div></div>' +
    '<div class="settings-value"><input class="settings-input mask-text" id="stAdminKey" type="text" placeholder="' + (rkHasAdmin ? t('settings.roleKeySet') : t('settings.roleKeyEmpty')) + '" autocomplete="off"></div></div>' +
    '<div class="settings-row"><div><div class="settings-label">' + t('settings.memberKey') + '</div><div class="settings-label-hint">' + t('settings.memberKeyHint') + '</div></div>' +
    '<div class="settings-value"><input class="settings-input mask-text" id="stMemberKey" type="text" placeholder="' + (rkHasMember ? t('settings.roleKeySet') : t('settings.roleKeyEmpty')) + '" autocomplete="off"></div></div>' +
    '<div style="text-align:right;margin-top:12px;display:flex;gap:8px;justify-content:flex-end">' +
    '<button class="settings-btn settings-btn-outline" onclick="clearRoleKeys()">' + t('settings.roleKeyClear') + '</button>' +
    '<button class="settings-btn settings-btn-primary" onclick="saveRoleKeys()">' + t('common.save') + '</button></div></div>' +
    '<div class="settings-section"><div class="settings-section-title">' + t('settings.sessionTitle') + '</div>' +
    '<div class="settings-row"><div class="settings-label">' + t('settings.activeSessions') + '</div><div class="settings-value"><span id="stSessionCount">' + sessionCount + '</span></div></div>' +
    '<div class="settings-row"><div><div class="settings-label">' + t('settings.revokeAll') + '</div><div class="settings-label-hint">' + t('settings.revokeAllHint') + '</div></div>' +
    '<div class="settings-value"><button class="settings-btn settings-btn-danger" onclick="revokeAllSessions()">' + t('settings.revokeAll') + '</button></div></div></div>' +
    '<div class="settings-section"><div class="settings-section-title">' + t('settings.guestPermission') + '</div>' +
    '<div class="settings-row"><div><div class="settings-label">' + t('settings.guestCanChat') + '</div><div class="settings-label-hint">' + t('settings.guestCanChatHint') + '</div></div>' +
    '<div class="settings-value"><button class="settings-toggle' + (guestCanChat ? ' on' : '') + '" id="stGuestToggle" onclick="toggleGuestChat()"></button></div></div></div>';
}

let _revokingAll = false;
async function revokeAllSessions() {
  if (_revokingAll) return;
  if (!await appConfirm(t('settings.revokeAllConfirm'))) return;
  _revokingAll = true;
  try {
    const resp = await authFetch('/api/auth/all', { method: 'DELETE' });
    const r = await resp.json();
    if (!resp.ok || !r.ok) { showToastMsg(r.error || t('common.fail'), 'error'); return; }
    const msg = r.revoked > 0 ? t('settings.revokeAllDone').replace('{count}', r.revoked) : t('settings.revokeAllNone');
    showToastMsg(msg);
    const el = document.getElementById('stSessionCount');
    if (el) el.textContent = '1';
  } catch (e) { showToastMsg(t('common.fail'), 'error'); }
  finally { _revokingAll = false; }
}

let _savingRoleKeys = false;
async function saveRoleKeys() {
  if (_savingRoleKeys) return;
  const ak = document.getElementById('stAdminKey')?.value || '';
  const mk = document.getElementById('stMemberKey')?.value || '';
  if (!ak && !mk) { showToastMsg(t('settings.roleKeyNoChange'), 'warning'); return; }
  const body = {};
  if (ak) { if (ak.length < 4) { showToastMsg(t('settings.keyTooShort'), 'error'); return; } body.adminKey = ak; }
  if (mk) { if (mk.length < 4) { showToastMsg(t('settings.keyTooShort'), 'error'); return; } body.memberKey = mk; }
  if (ak && mk && ak === mk) { showToastMsg(t('settings.roleKeyConflict') || '管理员密钥和成员密钥不能相同', 'error'); return; }
  _savingRoleKeys = true;
  try {
    const resp = await authFetch('/api/settings/role-keys', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const r = await resp.json();
    if (!resp.ok) { showToastMsg(r.error || t('common.fail'), 'error'); return; }
    showToastMsg(t('settings.saved'));
    if (ak) document.getElementById('stAdminKey').value = '';
    if (mk) document.getElementById('stMemberKey').value = '';
    if (ak) document.getElementById('stAdminKey').placeholder = t('settings.roleKeySet');
    if (mk) document.getElementById('stMemberKey').placeholder = t('settings.roleKeySet');
  } catch { showToastMsg(t('common.fail'), 'error'); }
  finally { _savingRoleKeys = false; }
}

let _clearingRoleKeys = false;
async function clearRoleKeys() {
  if (_clearingRoleKeys) return;
  if (!await appConfirm(t('settings.roleKeyClearConfirm'))) return;
  _clearingRoleKeys = true;
  try {
    const resp = await authFetch('/api/settings/role-keys', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ adminKey: '', memberKey: '' }) });
    if (!resp.ok) { showToastMsg(t('common.fail'), 'error'); return; }
    showToastMsg(t('settings.saved'));
    const ak = document.getElementById('stAdminKey'), mk = document.getElementById('stMemberKey');
    if (ak) { ak.value = ''; ak.placeholder = t('settings.roleKeyEmpty'); }
    if (mk) { mk.value = ''; mk.placeholder = t('settings.roleKeyEmpty'); }
  } catch { showToastMsg(t('common.fail'), 'error'); }
  finally { _clearingRoleKeys = false; }
}

async function changeOwnerKey() {
  const nk = document.getElementById('stNewKey')?.value; const ck = document.getElementById('stConfirmKey')?.value;
  if (nk !== ck) { showToastMsg(t('settings.keyMismatch'), 'error'); return; }
  if (!nk || nk.length < 4) { showToastMsg(t('settings.keyTooShort'), 'error'); return; }
  try {
    const resp = await authFetch('/api/settings/change-key', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ newKey: nk }) });
    const r = await resp.json();
    if (!resp.ok) { showToastMsg(r.error || t('common.fail'), 'error'); return; }
    showToastMsg(t('settings.keyChanged')); document.getElementById('stNewKey').value = ''; document.getElementById('stConfirmKey').value = '';
  } catch (e) { showToastMsg(t('common.fail'), 'error'); }
}

function toggleGuestChat() {
  const btn = document.getElementById('stGuestToggle'); const isOn = btn.classList.toggle('on');
  authFetch('/api/settings', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ guestCanChat: isOn }) });
  showToastMsg(t('settings.saved'));
}

function toggleGwToolEvents() {
  const btn = document.getElementById('stGwToolToggle'); const isOn = btn.classList.toggle('on');
  _gwToolEvents = isOn;
  authFetch('/api/settings', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ gatewayToolEvents: isOn }) });
  showToastMsg(t('settings.saved'));
}

// ══════════════════════════════════════════════════════════════
// ── MCP Settings ──
// ══════════════════════════════════════════════════════════════

let _mcpServers = {};

async function renderSettingsMcp(ct) {
  ct.innerHTML = '<div class="settings-section" id="stMcpSection"><div style="color:var(--text3);padding:20px;text-align:center">' + t('common.loading') + '</div></div>';
  try {
    const r = await (await authFetch('/api/settings/mcp')).json();
    _mcpServers = r.servers || {};
  } catch { _mcpServers = {}; }
  _renderMcpList();
}

function _renderMcpList() {
  const el = document.getElementById('stMcpSection'); if (!el) return;
  const ids = Object.keys(_mcpServers);

  let h = '<div class="settings-section-title">' + t('settings.mcpTitle') + '</div>';
  h += '<div class="settings-section-desc">' + t('settings.mcpDesc') + '</div>';

  if (!ids.length) {
    h += '<div class="mcp-empty"><div class="mcp-empty-icon">🔌</div><div class="mcp-empty-text">' + t('settings.mcpEmpty') + '</div>' +
      '<button class="settings-btn settings-btn-primary" onclick="_mcpShowAddForm()">' + t('settings.mcpAddServer') + '</button></div>';
  } else {
    h += '<div class="mcp-server-list">';
    for (const sid of ids) {
      const srv = _mcpServers[sid];
      const isHttp = srv.transport === 'http';
      const statusCls = srv.status === 'connected' ? 'online' : (srv.status === 'disabled' ? 'disabled' : 'offline');
      const statusText = srv.status === 'connected' ? t('settings.mcpConnected') : (srv.status === 'disabled' ? t('settings.mcpDisabled') : t('settings.mcpDisconnected'));
      const toolInfo = srv.toolCount > 0 ? t('settings.mcpTools', {count: srv.toolCount}) : '';

      h += '<div class="mcp-server-card" id="mcpCard-' + escH(sid) + '">';
      h += '<div class="mcp-server-header">';
      h += '<div class="mcp-server-info">';
      h += '<div class="mcp-server-name">' + escH(sid) + '</div>';
      h += '<div class="mcp-server-meta">';
      h += '<span class="mcp-badge mcp-badge-' + (isHttp ? 'http' : 'stdio') + '">' + (isHttp ? 'HTTP' : 'STDIO') + '</span>';
      h += '<span class="mcp-status-dot ' + statusCls + '"></span><span class="mcp-status-text">' + statusText + '</span>';
      if (toolInfo) h += '<span class="mcp-tool-count">' + toolInfo + '</span>';
      h += '</div></div>';
      h += '<div class="mcp-server-actions">';
      if (srv.enabled !== false) {
        if (srv.status === 'connected') {
          h += '<button class="settings-btn settings-btn-outline" onclick="_mcpDisconnect(\'' + escJs(sid) + '\')">' + t('settings.mcpDisconnect') + '</button>';
        } else {
          h += '<button class="settings-btn settings-btn-outline" onclick="_mcpConnect(\'' + escJs(sid) + '\')">' + t('settings.mcpConnect') + '</button>';
        }
      }
      h += '<button class="settings-btn settings-btn-outline" onclick="_mcpToggleEnabled(\'' + escJs(sid) + '\')">' + (srv.enabled !== false ? t('settings.mcpDisable') : t('settings.mcpEnable')) + '</button>';
      h += '<button class="settings-btn settings-btn-outline" onclick="_mcpEdit(\'' + escJs(sid) + '\')">' + t('settings.mcpEdit') + '</button>';
      h += '<button class="settings-btn settings-btn-danger" onclick="_mcpDelete(\'' + escJs(sid) + '\')">' + t('settings.mcpDelete') + '</button>';
      h += '</div></div>';

      h += '<div class="mcp-server-detail">';
      if (isHttp) {
        h += '<div class="mcp-detail-row"><span class="mcp-detail-label">' + t('settings.mcpUrl') + ':</span> <code>' + escH(srv.url || '-') + '</code></div>';
        if (srv.hasHeaders) h += '<div class="mcp-detail-row"><span class="mcp-detail-label">Headers:</span> ' + t('settings.mcpHeadersConfigured') + '</div>';
      } else {
        h += '<div class="mcp-detail-row"><span class="mcp-detail-label">' + t('settings.mcpCommand') + ':</span> <code>' + escH(srv.command || '-') + '</code></div>';
        if (srv.args && srv.args.length) h += '<div class="mcp-detail-row"><span class="mcp-detail-label">' + t('settings.mcpArgs') + ':</span> <code>' + escH(srv.args.join(' ')) + '</code></div>';
        if (srv.hasEnv) h += '<div class="mcp-detail-row"><span class="mcp-detail-label">ENV:</span> ' + t('settings.mcpEnvConfigured') + '</div>';
      }
      h += '</div>';

      h += '<div id="mcpEdit-' + escH(sid) + '"></div>';
      h += '</div>';
    }
    h += '</div>';
    h += '<div style="margin-top:16px"><button class="settings-btn settings-btn-primary" onclick="_mcpShowAddForm()">+ ' + t('settings.mcpAddServer') + '</button></div>';
  }

  h += '<div id="mcpAddForm" class="hidden"></div>';
  el.innerHTML = h;
}

function _mcpShowAddForm() {
  const el = document.getElementById('mcpAddForm'); if (!el) return;
  if (!el.classList.contains('hidden')) { el.classList.add('hidden'); el.innerHTML = ''; return; }
  el.classList.remove('hidden');
  el.innerHTML = '<div class="add-form" style="margin-top:16px">' +
    '<div class="add-form-header"><div class="add-form-title">' + t('settings.mcpAddServerTitle') + '</div>' +
    '<button class="add-form-close" onclick="_mcpShowAddForm()">&times;</button></div>' +
    '<div class="add-form-row">' +
    '<div class="form-field"><label class="form-label">' + t('settings.mcpServerId') + '</label><input class="settings-input" id="mcpAddId" placeholder="' + t('settings.mcpServerIdPH') + '" autocomplete="off"></div>' +
    '<div class="form-field"><label class="form-label">' + t('settings.mcpTransport') + '</label><select class="settings-select" id="mcpAddTransport" onchange="_mcpAddTransportChange()">' +
    '<option value="stdio">' + t('settings.mcpTransportStdio') + '</option><option value="http">' + t('settings.mcpTransportHttp') + '</option></select></div></div>' +
    '<div id="mcpAddFields"></div>' +
    '<div class="add-form-row" style="margin-top:12px"><button class="settings-btn settings-btn-primary" onclick="_mcpAdd()">' + t('common.add') + '</button>' +
    '<button class="settings-btn settings-btn-outline" onclick="_mcpShowAddForm()">' + t('common.cancel') + '</button></div></div>';
  _mcpAddTransportChange();
}

function _mcpAddTransportChange() {
  const transport = document.getElementById('mcpAddTransport')?.value || 'stdio';
  const el = document.getElementById('mcpAddFields'); if (!el) return;
  if (transport === 'http') {
    el.innerHTML = '<div class="add-form-row"><div class="form-field" style="flex:2"><label class="form-label">' + t('settings.mcpUrl') + '</label>' +
      '<input class="settings-input" id="mcpAddUrl" placeholder="http://127.0.0.1:3000/mcp" autocomplete="off"></div></div>';
  } else {
    el.innerHTML = '<div class="add-form-row"><div class="form-field"><label class="form-label">' + t('settings.mcpCommand') + '</label>' +
      '<input class="settings-input" id="mcpAddCmd" placeholder="npx" autocomplete="off"></div>' +
      '<div class="form-field" style="flex:2"><label class="form-label">' + t('settings.mcpArgs') + '</label>' +
      '<input class="settings-input" id="mcpAddArgs" placeholder="-y @anthropic/mcp-server-xxx" autocomplete="off"></div></div>';
  }
}

async function _mcpAdd() {
  const id = document.getElementById('mcpAddId')?.value?.trim();
  if (!id) { showToastMsg(t('settings.mcpIdRequired'), 'error'); return; }
  if (_mcpServers[id]) { showToastMsg(t('settings.mcpIdExists'), 'error'); return; }
  const transport = document.getElementById('mcpAddTransport')?.value || 'stdio';
  const body = { id, transport, enabled: true };
  if (transport === 'http') {
    body.url = document.getElementById('mcpAddUrl')?.value?.trim() || '';
    if (!body.url) { showToastMsg(t('settings.mcpUrlRequired'), 'error'); return; }
  } else {
    body.command = document.getElementById('mcpAddCmd')?.value?.trim() || '';
    const argsStr = document.getElementById('mcpAddArgs')?.value?.trim() || '';
    body.args = argsStr ? argsStr.split(/\s+/) : [];
    if (!body.command) { showToastMsg(t('settings.mcpCmdRequired'), 'error'); return; }
  }
  try {
    await authFetch('/api/settings/mcp', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    showToastMsg(t('settings.saved'));
    await renderSettingsMcp(document.getElementById('settingsContent'));
  } catch (e) { showToastMsg(t('common.fail'), 'error'); }
}

function _mcpEdit(sid) {
  const el = document.getElementById('mcpEdit-' + sid); if (!el) return;
  if (el.innerHTML) { el.innerHTML = ''; return; }
  const srv = _mcpServers[sid]; if (!srv) return;
  const isHttp = srv.transport === 'http';

  let h = '<div class="add-form" style="margin-top:10px;border:none;padding:8px 0">';
  if (isHttp) {
    h += '<div class="add-form-row"><div class="form-field" style="flex:2"><label class="form-label">' + t('settings.mcpUrl') + '</label>' +
      '<input class="settings-input" id="mcpEditUrl-' + escH(sid) + '" value="' + escH(srv.url || '') + '" autocomplete="off"></div></div>';
  } else {
    h += '<div class="add-form-row"><div class="form-field"><label class="form-label">' + t('settings.mcpCommand') + '</label>' +
      '<input class="settings-input" id="mcpEditCmd-' + escH(sid) + '" value="' + escH(srv.command || '') + '" autocomplete="off"></div>' +
      '<div class="form-field" style="flex:2"><label class="form-label">' + t('settings.mcpArgs') + '</label>' +
      '<input class="settings-input" id="mcpEditArgs-' + escH(sid) + '" value="' + escH((srv.args || []).join(' ')) + '" autocomplete="off"></div></div>';
  }
  h += '<div class="add-form-row"><button class="settings-btn settings-btn-primary" onclick="_mcpSaveEdit(\'' + escJs(sid) + '\')">' + t('common.save') + '</button>' +
    '<button class="settings-btn settings-btn-outline" onclick="_mcpEdit(\'' + escJs(sid) + '\')">' + t('common.cancel') + '</button></div></div>';
  el.innerHTML = h;
}

async function _mcpSaveEdit(sid) {
  const srv = _mcpServers[sid]; if (!srv) return;
  const isHttp = srv.transport === 'http';
  const body = { id: sid, transport: srv.transport, enabled: srv.enabled };
  if (isHttp) {
    body.url = document.getElementById('mcpEditUrl-' + sid)?.value?.trim() || '';
  } else {
    body.command = document.getElementById('mcpEditCmd-' + sid)?.value?.trim() || '';
    const argsStr = document.getElementById('mcpEditArgs-' + sid)?.value?.trim() || '';
    body.args = argsStr ? argsStr.split(/\s+/) : [];
  }
  try {
    await authFetch('/api/settings/mcp', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    showToastMsg(t('settings.saved'));
    await renderSettingsMcp(document.getElementById('settingsContent'));
  } catch (e) { showToastMsg(t('common.fail'), 'error'); }
}

async function _mcpToggleEnabled(sid) {
  const srv = _mcpServers[sid]; if (!srv) return;
  const newEnabled = srv.enabled === false;
  try {
    await authFetch('/api/settings/mcp', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: sid, enabled: newEnabled }) });
    showToastMsg(t('settings.saved'));
    await renderSettingsMcp(document.getElementById('settingsContent'));
  } catch (e) { showToastMsg(t('common.fail'), 'error'); }
}

async function _mcpConnect(sid) {
  showToastMsg(t('settings.mcpConnecting'));
  try {
    const r = await (await authFetch('/api/settings/mcp/' + encodeURIComponent(sid) + '/connect', { method: 'POST' })).json();
    if (r.ok) {
      showToastMsg(t('settings.mcpConnectSuccess') + (r.toolCount ? ' (' + t('settings.mcpTools', {count: r.toolCount}) + ')' : ''));
    } else {
      showToastMsg(t('settings.mcpConnectFail') + ': ' + (r.error || ''), 'error');
    }
    await renderSettingsMcp(document.getElementById('settingsContent'));
  } catch (e) { showToastMsg(t('common.fail'), 'error'); }
}

async function _mcpDisconnect(sid) {
  try {
    await authFetch('/api/settings/mcp/' + encodeURIComponent(sid) + '/disconnect', { method: 'POST' });
    showToastMsg(t('settings.mcpDisconnectSuccess'));
    await renderSettingsMcp(document.getElementById('settingsContent'));
  } catch (e) { showToastMsg(t('common.fail'), 'error'); }
}

async function _mcpDelete(sid) {
  if (!await appConfirm(t('settings.mcpDeleteConfirm', {id: sid}))) return;
  try {
    await authFetch('/api/settings/mcp/' + encodeURIComponent(sid), { method: 'DELETE' });
    showToastMsg(t('settings.saved'));
    await renderSettingsMcp(document.getElementById('settingsContent'));
  } catch (e) { showToastMsg(t('common.fail'), 'error'); }
}
