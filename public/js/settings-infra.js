/* OpenClaw IM — Settings: LLM Connection & Auth (Layer 2) */

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
