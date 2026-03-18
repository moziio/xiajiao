/* OpenClaw IM Client v4.0 — Entry Point (Modular Edition)
 * Modules loaded via <script> tags before this file:
 *   state.js → login.js → chat.js → contacts.js → community.js → settings.js → manage.js
 */

// ── WebSocket ──
function connect() {
  if (ws && ws.readyState <= 1) return;
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
  ws.onopen = () => {
    reconnectBanner.classList.add('hidden'); reconnectDelay = 1000;
    var lastTs = 0;
    if (allMessages && allMessages.length) { for (var i = allMessages.length - 1; i >= 0; i--) { if (allMessages[i].ts) { lastTs = allMessages[i].ts; break; } } }
    ws.send(JSON.stringify({ type: 'join', userId: me.id, name: me.name, color: me.color, token: ownerToken || '', lastTs: lastTs }));
  };
  ws.onmessage = ev => { try { var d = JSON.parse(ev.data); if (d.type === 'ping') { ws.send('{"type":"pong"}'); return; } handleMessage(d); } catch {} };
  ws.onclose = () => { reconnectBanner.classList.remove('hidden'); scheduleReconnect(); };
  ws.onerror = () => {};
}
function scheduleReconnect() { clearTimeout(reconnectHandle); reconnectHandle = setTimeout(() => { reconnectDelay = Math.min(reconnectDelay * 1.5, 15000); connect(); }, reconnectDelay); }
function reconnect() { clearTimeout(reconnectHandle); reconnectDelay = 1000; connect(); }

document.addEventListener('visibilitychange', function() {
  if (document.visibilityState !== 'visible') return;
  if (!ws || ws.readyState >= 2) { reconnect(); return; }
  try { ws.send('{"type":"pong"}'); } catch { reconnect(); }
});

// ── Message Dispatcher ──
function handleMessage(msg) {
  switch (msg.type) {
    case 'joined':
      me = Object.assign(me || {}, msg.user, { id: _myUserId || msg.user?.id });
      isOwner = !!msg.isOwner;
      myRole = msg.role || (isOwner ? 'owner' : 'guest');
      if (msg.guestCanChat !== undefined) _guestCanChat = !!msg.guestCanChat;
      updateOwnerUI();
      allMessages = allMessages.filter(function(m) {
        if (m._status === 'sending') { var el = document.getElementById('m-' + (m.id || m._tempId)); if (el) el.remove(); return false; }
        return true;
      });
      if (msg.incremental && allMessages && allMessages.length) {
        var incoming = (msg.history || []).map(function(m) { if (!m.channel) m.channel = guessChannel(m); return m; });
        if (incoming.length) {
          var existIds = new Set(allMessages.map(function(m) { return m.id; }));
          var added = incoming.filter(function(m) { return !existIds.has(m.id); });
          if (added.length) { allMessages = allMessages.concat(added); allMessages.sort(function(a, b) { return (a.ts || 0) - (b.ts || 0); }); }
        }
      } else {
        allMessages = (msg.history || []).map(function(m) { if (!m.channel) m.channel = guessChannel(m); return m; });
      }
      onlineUsers = msg.users || [];
      if (msg.agents?.length > 0) updateAgentList(msg.agents);
      if (msg.groups) customGroups = msg.groups;
      updateGatewayDot(msg.gatewayConnected);
      _loadServerPrefs();
      renderChatList(); renderContacts(); updateOnlineIndicator();
      if (typeof loadWorkflows === 'function') {
        loadWorkflows().then(() => {
          renderChatList();
          renderContacts();
          if (activeChannel && activeChannel.startsWith('wf_')) switchChannel(activeChannel);
        });
      }
      var _offQ = typeof _getOfflineQueue === 'function' ? _getOfflineQueue() : [];
      for (var _qi = 0; _qi < _offQ.length; _qi++) {
        var _qe = _offQ[_qi];
        if (!allMessages.some(function(m) { return m._tempId === _qe.tempId; })) {
          allMessages.push({
            id: _qe.tempId, _tempId: _qe.tempId, _status: 'queued', _payload: _qe.payload,
            type: 'user', userId: me.id, userName: me.name, userColor: me.color,
            text: _qe.payload.text || '', files: _qe.payload.files, file: _qe.payload.file,
            channel: _qe.payload.channel, ts: _qe.ts,
            ...(_qe.payload.replyTo ? { replyTo: _qe.payload.replyTo } : {})
          });
        }
      }
      if (activeChannel) switchChannel(activeChannel);
      if (typeof _drainOfflineQueue === 'function') _drainOfflineQueue();
      break;
    case 'message':
      if (!msg.message.channel) msg.message.channel = guessChannel(msg.message);
      if (msg.message._tempId) {
        var _existing = allMessages.find(function(x) { return x._tempId === msg.message._tempId; });
        if (_existing) {
          var _tid = _existing._tempId;
          Object.assign(_existing, msg.message, { _status: 'delivered', _tempId: _tid });
          delete _existing._payload;
          _updateMsgStatus(_tid);
          if (_existing.text && typeof autoDetectLinkPreviews === 'function') autoDetectLinkPreviews(_existing.id, _existing.text);
          renderChatList();
          break;
        }
      }
      allMessages.push(msg.message);
      if (msg.message.type === 'agent') { clearAgentTyping(); setSendBtnStop(false); }
      if (msg.message.channel !== activeChannel && msg.message.userId !== me?.id) unreadCounts.set(msg.message.channel, (unreadCounts.get(msg.message.channel) || 0) + 1);
      renderNewMessage(msg.message); renderChatList();
      break;
    case 'agent_stream': handleAgentStream(msg); break;
    case 'agent_lifecycle': handleAgentLifecycle(msg); break;
    case 'tool_call_start': if (typeof handleToolCallStart === 'function') handleToolCallStart(msg); break;
    case 'tool_call_end': if (typeof handleToolCallEnd === 'function') handleToolCallEnd(msg); break;
    case 'agent_error': clearAgentTyping(); setSendBtnStop(false); addSystemMsg(t('common.agentError', {error: msg.error}), activeChannel || 'group'); break;
    case 'error': showToastMsg(msg.error || t('common.fail'), 'error'); break;
    case 'agents_update': if (msg.agents) updateAgentList(msg.agents); break;
    case 'groups_update': if (msg.groups) { customGroups = msg.groups; renderChatList(); renderContacts(); } break;
    case 'collab_chain_waiting': if (typeof handleCollabChainWaiting === 'function') handleCollabChainWaiting(msg); break;
    case 'collab_flow_update': if (typeof handleCollabFlowUpdate === 'function') handleCollabFlowUpdate(msg); break;
    case 'community_update':
      if (activeTab === 'community' && communityView.style.display !== 'none') { refreshCommunityFeed(); }
      else { communityUnread++; updateCommunityBadge(); }
      if (msg.post) showPostToast(msg.post);
      break;
    case 'user_joined':
      onlineUsers.push(msg.user);
      updateOnlineIndicator();
      if (canManage() && msg.user && msg.user.id !== me?.id) showToastMsg(t('visitor.joined', {name: msg.user.name}), 'info');
      break;
    case 'user_left':
      onlineUsers = onlineUsers.filter(u => u.id !== msg.userId);
      updateOnlineIndicator();
      if (canManage() && msg.userId !== me?.id) showToastMsg(t('visitor.left', {name: msg.userName || ''}), 'info');
      break;
    case 'guest_chat_toggle': _guestCanChat = !!msg.guestCanChat; break;
    case 'gateway_status': updateGatewayDot(msg.connected); if (msg.agents) updateAgentList(msg.agents); break;
    case 'typing': if (msg.userId !== me?.id) showTyping(msg.userName); break;
    case 'workflow_start':
    case 'workflow_step':
    case 'workflow_waiting':
    case 'workflow_complete':
      if (typeof handleWorkflowEvent === 'function') handleWorkflowEvent(msg);
      break;
  }
}

function updateAgentList(agents) {
  AGENTS = agents.map((a, i) => { const ce = storageGet('im-emoji-' + a.id); return { id: a.id, name: a.name || a.id, emoji: ce || a.emoji || DE[i % DE.length], color: a.color || DC[i % DC.length], model: a.model || null }; });
  renderChatList(); renderContacts();
  prefetchAgentDescs();
}
async function prefetchAgentDescs() {
  var missing = AGENTS.filter(function(a) { return !_agentDescCache[a.id]; });
  if (!missing.length) return;
  try {
    var r = await (await authFetch('/api/agents/descriptions')).json();
    for (var id in r) _agentDescCache[id] = (r[id] || '').slice(0, 500);
  } catch {
    for (var i = 0; i < missing.length; i++) _agentDescCache[missing[i].id] = '';
  }
}
function guessChannel(m) { return m.channel || (m.type === 'agent' ? (m.agent || 'group') : 'group'); }

// ── Tab Switching ──
function switchTab(tab) {
  // leaving chats → save current channel
  if (activeTab === 'chats' && activeChannel) _lastChatsChannel = activeChannel;

  activeTab = tab;
  ['tabChats', 'tabContacts', 'tabCommunity', 'tabFavorites'].forEach(id => { const el = $('#' + id); if (el) el.className = ''; });
  const sb = $('#settingsBtn'); if (sb) sb.classList.remove('active');
  const activeBtn = $('#tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
  if (activeBtn) activeBtn.className = 'active';
  panelChats.classList.toggle('hidden', tab !== 'chats');
  panelContacts.classList.toggle('hidden', tab !== 'contacts');
  panelCommunity.classList.toggle('hidden', tab !== 'community');
  const pf = document.getElementById('panelFavorites'); if (pf) pf.classList.toggle('hidden', tab !== 'favorites');

  if (tab === 'chats') {
    renderChatList();
    const ch = activeChannel || _lastChatsChannel;
    if (ch && resolveChannelInfo(ch)) { switchChannel(ch); }
    else { hideAllViews(); welcomeScreen.classList.remove('hidden'); welcomeScreen.style.display = 'flex'; }
  } else if (tab === 'community') {
    communityUnread = 0; updateCommunityBadge(); renderCommunityNav();
    if (lastCommunityView === 'schedules') { showSchedules(); }
    else { showActivityFeed(); }
  } else if (tab === 'favorites') {
    renderFavorites();
    if (_activeFavId && getFavorites().some(f => f.id === _activeFavId)) { showFavDetail(_activeFavId); }
    else { hideAllViews(); welcomeScreen.classList.remove('hidden'); welcomeScreen.style.display = 'flex'; }
  } else {
    if (tab === 'contacts') renderContacts();
    hideAllViews(); welcomeScreen.classList.remove('hidden'); welcomeScreen.style.display = 'flex';
  }
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]');
  if (!a) return;
  const href = a.getAttribute('href') || '';
  if (href.startsWith('http://') || href.startsWith('https://')) {
    if (!a.hasAttribute('target')) a.setAttribute('target', '_blank');
    if (!a.hasAttribute('rel')) a.setAttribute('rel', 'noopener');
  }
});

// ── Server Prefs Sync (pinned & favorites) ──
async function _loadServerPrefs() {
  if (!ownerToken) return;
  try {
    const [pinnedResp, favResp] = await Promise.all([
      authFetch('/api/user/pinned').then(r => r.ok ? r.json() : null).catch(() => null),
      authFetch('/api/user/favorites').then(r => r.ok ? r.json() : null).catch(() => null),
    ]);
    _pinnedCache = pinnedResp?.pinned || [];
    _favCache = favResp?.favorites || [];
    renderChatList();
    if (activeTab === 'favorites' && typeof renderFavorites === 'function') renderFavorites();
  } catch {}
}

// ── Service Worker Registration ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'activated' && navigator.serviceWorker.controller) {
            showToastMsg(typeof t === 'function' ? t('app.swUpdated') : '应用已更新，刷新获取最新版本', 'info');
          }
        });
      });
    }).catch(() => {});
  });
}
