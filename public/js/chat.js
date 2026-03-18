/* 虾饺 (Xiajiao) — Chat Core Module (Layer 2) */

// ── Active Conversations ──
function getActiveChannels() {
  const cs = new Set(); for (const m of allMessages) if (m.channel && m.type !== 'system') cs.add(m.channel);
  for (const [ch, d] of channelDrafts) if (d) cs.add(ch);
  const r = []; for (const c of cs) { const lm = [...allMessages].reverse().find(m => m.channel === c && m.type !== 'system'); const info = resolveChannelInfo(c); if (!info) continue; r.push({ ...info, lastMsg: lm || null, lastTs: lm ? lm.ts : Date.now() }); }
  return r.sort((a, b) => b.lastTs - a.lastTs);
}
let _pinnedCache = [];
function getPinnedChannels() { return _pinnedCache; }
function setPinnedChannels(arr) {
  _pinnedCache = arr;
  authFetch('/api/user/pinned', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pinned: arr }) }).catch(() => {});
}
function togglePin(chId) {
  const p = getPinnedChannels(), i = p.indexOf(chId);
  const wasPinned = i >= 0;
  if (wasPinned) p.splice(i, 1); else p.unshift(chId);
  setPinnedChannels(p); renderChatList(); closeChatMenu();
  showToastMsg(wasPinned ? t('ctx.unpinDone') : t('ctx.pinDone'));
}
function channelClick(chId) { switchChannel(chId); }
function markAsRead(chId) { unreadCounts.delete(chId); renderChatList(); closeChatMenu(); }
async function clearChannelMessages(chId) {
  closeChatMenu();
  if (!chId) return;
  if (!await appConfirm(t('rich.clearConfirm'))) return;
  try {
    var r = await (await authFetch('/api/messages/channel/' + encodeURIComponent(chId), { method: 'DELETE' })).json();
    if (r.ok) {
      var favs = getFavorites();
      var remaining = favs.filter(function(f) { return f.channel !== chId; });
      if (remaining.length !== favs.length) saveFavorites(remaining);
      allMessages = allMessages.filter(function(m) { return chId === 'group' ? (m.channel !== 'group' && m.channel) : m.channel !== chId; });
      if (activeChannel === chId) { messagesEl.innerHTML = ''; _renderedOffset = 0; _channelHasMore[chId] = false; }
      renderChatList();
      showToastMsg(t('rich.channelCleared'));
    }
  } catch (e) { showToastMsg(e.message, 'error'); }
}
async function deleteChat(chId) {
  closeChatMenu();
  try { await authFetch('/api/messages/channel/' + encodeURIComponent(chId), { method: 'DELETE' }); } catch {}
  allMessages = allMessages.filter(m => m.channel !== chId && !(chId === 'group' && !m.channel));
  channelDrafts.delete(chId);
  unreadCounts.delete(chId);
  const pinned = getPinnedChannels().filter(p => p !== chId);
  setPinnedChannels(pinned);
  if (activeChannel === chId) {
    activeChannel = null;
    hideAllViews();
    welcomeScreen.classList.remove('hidden');
    welcomeScreen.style.display = 'flex';
  }
  renderChatList();
  showToastMsg(t('ctx.deleteChatDone'));
}
let _chatMenuCloseFn = null;
function closeChatMenu() {
  if (_chatMenuCloseFn) { document.removeEventListener('mousedown', _chatMenuCloseFn); _chatMenuCloseFn = null; }
  const m = document.getElementById('chatCtxMenu'); if (m) m.remove();
}
function showChatMenu(e, chId) {
  e.preventDefault(); e.stopPropagation(); closeChatMenu();
  const pinned = getPinnedChannels(), isPinned = pinned.includes(chId), unread = unreadCounts.get(chId) || 0;
  const safeChId = escJs(chId);
  const menu = document.createElement('div'); menu.id = 'chatCtxMenu'; menu.className = 'ctx-menu';
  menu.innerHTML = `<div class="ctx-item" onclick="togglePin('${safeChId}')"><span class="ctx-icon">${isPinned ? '\u{274C}' : '\u{1F4CC}'}</span>${isPinned ? t('ctx.unpin') : t('ctx.pin')}</div>${unread > 0 ? `<div class="ctx-item" onclick="markAsRead('${safeChId}')"><span class="ctx-icon">\u{2705}</span>${t('ctx.markRead')}</div>` : ''}${canManage() ? `<div class="ctx-item ctx-danger" onclick="clearChannelMessages('${safeChId}')"><span class="ctx-icon">\u{1F9F9}</span>${t('ctx.clearMessages')}</div><div class="ctx-item ctx-danger" onclick="deleteChat('${safeChId}')"><span class="ctx-icon">\u{1F5D1}\uFE0F</span>${t('ctx.deleteChat')}</div>` : ''}`;
  document.body.appendChild(menu);
  requestAnimationFrame(() => {
    const r = menu.getBoundingClientRect();
    let x = e.clientX, y = e.clientY;
    if (x + r.width > window.innerWidth - 8) x = window.innerWidth - r.width - 8;
    if (y + r.height > window.innerHeight - 8) y = window.innerHeight - r.height - 8;
    if (x < 0) x = 0; if (y < 0) y = 0;
    menu.style.left = x + 'px'; menu.style.top = y + 'px';
  });
  setTimeout(() => {
    const close = (ev) => { if (menu.parentNode && menu.contains(ev.target)) return; closeChatMenu(); };
    _chatMenuCloseFn = close;
    document.addEventListener('mousedown', close);
  }, 0);
}
let chatSearchQuery = '';
function renderChatList() {
  let active = getActiveChannels();
  const searchBox = '<div class="chat-search"><input class="chat-search-input" placeholder="' + t('chat.searchPlaceholder') + '" value="' + escH(chatSearchQuery) + '" oninput="chatSearchQuery=this.value;renderChatListItems()" /></div>';
  if (!active.length) { panelChats.innerHTML = searchBox + '<div class="chat-list-empty"><div class="empty-icon">&#128172;</div><p>' + t('chat.emptyTitle') + '<br>' + t('chat.emptyHint') + '</p></div>'; return; }
  panelChats.innerHTML = searchBox + '<div id="chatListItems"></div>';
  renderChatListItems();
}
function renderChatListItems() {
  const container = document.getElementById('chatListItems'); if (!container) return;
  let active = getActiveChannels();
  if (chatSearchQuery) { const q = chatSearchQuery.toLowerCase(); active = active.filter(ch => ch.name.toLowerCase().includes(q) || ch.id.toLowerCase().includes(q)); }
  if (!active.length) { container.innerHTML = '<div class="chat-list-empty" style="padding:20px"><p>' + t('chat.noMatch') + '</p></div>'; return; }
  const pinned = getPinnedChannels();
  active.sort((a, b) => { const ap = pinned.includes(a.id) ? 1 : 0, bp = pinned.includes(b.id) ? 1 : 0; if (ap !== bp) return bp - ap; return b.lastTs - a.lastTs; });
  container.innerHTML = active.map(ch => { const draft = channelDrafts.get(ch.id); const unread = unreadCounts.get(ch.id) || 0; const isPinned = pinned.includes(ch.id); const preview = draft ? `<span class="channel-draft">${t('chat.draft')}</span> ${esc(truncate(draft, 20))}` : esc(truncate(stripMd(ch.lastMsg?.text || ''), 30)); const isGroup = ch.type === 'group' || ch.type === 'custom-group'; const isWf = ch.type === 'workflow'; const typeTag = isWf ? `<span class="channel-type-tag channel-tag-wf">${t('workflow.section')}</span>` : isGroup ? `<span class="channel-type-tag channel-tag-group">${t('chat.tagGroup')}</span>` : `<span class="channel-type-tag channel-tag-agent">${t('chat.tagAgent')}</span>`; const safeId = escJs(ch.id); return `<div class="channel-item ${ch.id === activeChannel ? 'active' : ''} ${isPinned ? 'pinned' : ''}" data-ch="${escH(ch.id)}" onclick="channelClick('${safeId}')" oncontextmenu="showChatMenu(event,'${safeId}')"><div class="channel-avatar">${ch.emoji}${unread > 0 ? `<span class="channel-unread">${unread > 99 ? '99+' : unread}</span>` : ''}</div><div class="channel-info"><div class="channel-name">${esc(ch.name)} ${typeTag}</div><div class="channel-preview">${preview}</div></div><span class="channel-time">${formatTime(ch.lastTs)}</span></div>`; }).join('');
}

// ── Draft ──
function saveDraft() { if (!activeChannel) return; const text = msgInput.value; if (text) channelDrafts.set(activeChannel, text); else channelDrafts.delete(activeChannel); }
function restoreDraft(channelId) { const draft = channelDrafts.get(channelId) || ''; msgInput.value = draft; msgInput.style.height = 'auto'; if (draft) msgInput.style.height = Math.min(msgInput.scrollHeight, 160) + 'px'; msgInput.focus(); }

// ── Rename ──
function startRenameChannel() {
  if (!activeChannel || !canManage() || renaming) return;
  const info = resolveChannelInfo(activeChannel); if (!info) return;
  renaming = true; const oldName = info.name;
  chatName.innerHTML = ''; const input = document.createElement('input'); input.className = 'rename-input'; input.value = oldName; input.maxLength = 30; chatName.appendChild(input); input.focus(); input.select();
  const finish = (save) => { if (!renaming) return; renaming = false; const val = input.value.trim(); chatName.textContent = oldName; if (save && val && val !== oldName) doRename(activeChannel, info, val, oldName); };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); finish(true); } else if (e.key === 'Escape') { e.preventDefault(); finish(false); } });
  input.addEventListener('blur', () => finish(true));
}
async function doRename(channelId, info, newName, oldName) {
  chatName.textContent = newName;
  try {
    if (info.type === 'direct') { const r = await (await authFetch('/api/agents/' + channelId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName }) })).json(); if (!r.ok) { chatName.textContent = oldName; showToastMsg(t('panel.renameFail') + ': ' + (r.error || ''), 'error'); return; } const ag = AGENTS.find(a => a.id === channelId); if (ag) ag.name = newName; }
    else if (info.type === 'custom-group') { const g = customGroups.find(x => x.id === channelId); const r = await (await authFetch('/api/groups/' + channelId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName, members: g ? g.members : [] }) })).json(); if (!r.ok) { chatName.textContent = oldName; showToastMsg(t('panel.renameFail') + ': ' + (r.error || ''), 'error'); return; } if (g) g.name = newName; }
    else if (info.type === 'group') { storageSet('im-group-name', newName); }
    showToastMsg(t('panel.renamed', {name: newName})); renderChatList(); renderContacts();
  } catch (e) { chatName.textContent = oldName; showToastMsg(t('panel.renameFail'), 'error'); }
}

// ── Invite / Kick ──
function toggleInvitePopup(groupId) {
  let popup = document.getElementById('invitePopup');
  if (popup && !popup.classList.contains('hidden')) { popup.classList.add('hidden'); return; }
  const members = groupId === 'group' ? AGENTS.map(a => a.id) : (customGroups.find(x => x.id === groupId)?.members || []);
  const nonMembers = AGENTS.filter(a => !members.includes(a.id));
  if (!nonMembers.length) { showToastMsg(t('panel.allInGroup')); return; }
  if (!popup) { popup = document.createElement('div'); popup.id = 'invitePopup'; document.querySelector('.chat-header').appendChild(popup); }
  popup.className = 'invite-popup';
  popup.innerHTML = '<div class="invite-title">' + t('panel.inviteAgent') + '</div>' + nonMembers.map(a => `<div class="invite-item" onclick="event.stopPropagation();inviteAgent('${escJs(groupId)}','${escJs(a.id)}')"><span class="invite-emoji">${a.emoji}</span><span class="invite-name">${esc(a.name)}</span><span class="invite-add">+</span></div>`).join('');
  popup.classList.remove('hidden');
  setTimeout(() => { const close = e => { if (!popup.contains(e.target)) { popup.classList.add('hidden'); document.removeEventListener('mousedown', close); } }; document.addEventListener('mousedown', close); }, 0);
}
async function kickAgent(groupId, agentId) {
  const g = customGroups.find(x => x.id === groupId); if (!g) return;
  if (g.members.length <= 1) { showToastMsg(t('panel.atLeastOne')); return; }
  const ag = AGENTS.find(a => a.id === agentId);
  try { const r = await (await authFetch('/api/groups/' + groupId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: g.name, members: g.members.filter(m => m !== agentId) }) })).json(); if (r.ok) { showToastMsg(t('panel.removed', {name: (ag?.emoji||'') + ' ' + (ag?.name||agentId)})); switchChannel(groupId); } else showToastMsg(t('panel.removeFail') + ': ' + (r.error || ''), 'error'); } catch (e) { showToastMsg(t('panel.removeFail'), 'error'); }
}
async function inviteAgent(groupId, agentId) {
  const g = customGroups.find(x => x.id === groupId); if (!g) return;
  try { const r = await (await authFetch('/api/groups/' + groupId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: g.name, members: [...g.members, agentId] }) })).json(); if (r.ok) { const ag = AGENTS.find(a => a.id === agentId); showToastMsg(t('panel.joined', {name: (ag?.emoji||'') + ' ' + (ag?.name||agentId)})); switchChannel(groupId); } else showToastMsg(t('panel.inviteFail') + ': ' + (r.error || ''), 'error'); } catch (e) { showToastMsg(t('panel.inviteFail'), 'error'); }
}

// ── Header Member Bar ──
function _buildMemberBar(agents, chId, safeChId, isCustom) {
  const avatars = agents.slice(0, 6).map(a => {
    const c = a.color || '#00d4ff';
    return `<span class="hdr-avatar" style="background:${c}30;border-color:${c}" onclick="insertMention('${escJs(a.id)}')" title="@${esc(a.name)}">${a.emoji || '🤖'}</span>`;
  }).join('');
  const overflow = agents.length > 6 ? `<span class="hdr-avatar hdr-overflow">+${agents.length - 6}</span>` : '';
  const mentionBtn = `<span class="hdr-btn" onclick="toggleMentionMenu('${safeChId}')" title="@提及">@</span>`;
  const chainBtn = isCustom && canManage() ? `<span class="hdr-btn" onclick="editCollabChain('${safeChId}')" title="协作链">🔗</span>` : '';
  const inviteBtn = isCustom && canManage() ? `<span class="hdr-btn" onclick="event.stopPropagation();toggleInvitePopup('${safeChId}')" title="${t('panel.invite')}">+</span>` : '';
  const moreBtn = `<span class="hdr-btn" onclick="toggleGroupPanel('${safeChId}')" title="设置">⋮</span>`;
  const searchBtn = `<span class="hdr-btn" onclick="toggleChatSearch()" title="搜索">🔍</span>`;
  return `<div class="hdr-avatars">${avatars}${overflow}</div><div class="hdr-toolbar">${mentionBtn}${chainBtn}${inviteBtn}${moreBtn}${searchBtn}</div>`;
}

function toggleMentionMenu(chId) {
  let menu = document.getElementById('mentionMenu');
  if (menu && !menu.classList.contains('hidden')) { menu.classList.add('hidden'); return; }
  if (!menu) { menu = document.createElement('div'); menu.id = 'mentionMenu'; menu.className = 'mention-menu'; document.querySelector('.chat-header').appendChild(menu); }
  const info = resolveChannelInfo(chId);
  const agents = info?.type === 'group' ? AGENTS : (info?.members || []).map(mid => AGENTS.find(a => a.id === mid)).filter(Boolean);
  menu.innerHTML = `<div class="mention-menu-item mention-all" onclick="insertMention('__all__');closeMentionMenu()">📢 @${t('chat.mentionAll')}</div>` +
    agents.map(a => `<div class="mention-menu-item" onclick="insertMention('${escJs(a.id)}');closeMentionMenu()"><span style="margin-right:4px">${a.emoji}</span> ${esc(a.name)}</div>`).join('');
  menu.classList.remove('hidden');
  setTimeout(() => { const close = (e) => { if (menu.contains(e.target)) return; menu.classList.add('hidden'); document.removeEventListener('mousedown', close); }; document.addEventListener('mousedown', close); }, 0);
}
function closeMentionMenu() { const m = document.getElementById('mentionMenu'); if (m) m.classList.add('hidden'); }

// ── Channel Switch ──
function switchChannel(id) {
  saveDraft(); hideMentionPopup(); closeGroupPanel(); closeMentionMenu();
  if (typeof closeChatSearch === 'function') closeChatSearch();
  if (typeof clearReplyTarget === 'function') clearReplyTarget();
  if (_multiSelectMode) exitMultiSelectMode();
  const invP = document.getElementById('invitePopup'); if (invP) invP.classList.add('hidden');
  if (renaming) { renaming = false; }
  unreadCounts.delete(id); activeChannel = id; hideAllViews();
  chatView.classList.remove('hidden'); chatView.style.display = 'flex';
  const info = resolveChannelInfo(id); if (!info) return;
  chatName.textContent = info.name; chatName.classList.toggle('editable', canManage() && info.type !== 'workflow');
  const safeChId = escJs(id);
  const moreBtn = `<span class="hdr-btn" onclick="toggleGroupPanel('${safeChId}')">&#8942;</span>`;
  if (info.type === 'group') { chatStatus.textContent = t('chat.agentCount', {count: AGENTS.length}); memberTags.innerHTML = _buildMemberBar(AGENTS, id, safeChId, false); }
  else if (info.type === 'custom-group') { const ma = (info.members||[]).map(mid => AGENTS.find(a => a.id === mid)).filter(Boolean); chatStatus.textContent = t('chat.memberCount', {count: ma.length}); memberTags.innerHTML = _buildMemberBar(ma, id, safeChId, true); }
  else if (info.type === 'workflow') {
    const wf = workflowDefs.find(w => w.id === id.slice(3));
    const stepNames = wf?.steps?.map(s => s.name).join(' → ') || '';
    chatStatus.textContent = stepNames || `${t('workflow.stepsUnit')} ${wf?.steps?.length || 0}`;
    const wfBtns = wf && isOwner ? `<span class="hdr-btn hdr-btn-accent" onclick="triggerWorkflow('${escJs(wf.id)}')" title="${t('workflow.runBtn')}">▶</span><span class="hdr-btn" onclick="openWorkflowBuilder('${escJs(wf.id)}')" title="${t('workflow.edit')}">⚙</span>` : '';
    memberTags.innerHTML = `<div class="hdr-toolbar">${wfBtns}${moreBtn}<span class="hdr-btn" onclick="toggleChatSearch()" title="搜索">🔍</span></div>`;
  }
  else { const ag = AGENTS.find(a => a.id === id); chatStatus.textContent = ag ? `AI Agent${ag.model ? ' · '+ag.model : ''}` : ''; memberTags.innerHTML = `<div class="hdr-toolbar">${moreBtn}<span class="hdr-btn" onclick="toggleChatSearch()" title="搜索">🔍</span></div>`; }
  msgInput.placeholder = info.type === 'workflow' ? t('workflow.inputPH') : isDirectAgent(id) ? t('chat.directPlaceholder', {name: (resolveChannelInfo(id)?.name || id)}) : t('chat.inputPlaceholder');
  if (info.type === 'workflow' && typeof getWfRunForChannel === 'function') {
    const wfRun = getWfRunForChannel(id);
    if (wfRun?.status === 'waiting') { renderWfApprovalButtons(wfRun.runId, ''); setSendBtnStop(false); }
    else if (wfRun?.status === 'running') { clearWfApprovalButtons(); setSendBtnStop(true); }
    else { clearWfApprovalButtons(); setSendBtnStop(false); }
  } else { if (typeof clearWfApprovalButtons === 'function') clearWfApprovalButtons(); setSendBtnStop(false); }
  updateTrainToolbar(id); renderChatList(); renderMessages(); restoreDraft(id);
  if (window.innerWidth <= 768) sidebar.classList.add('collapsed');
  if (typeof onChannelSwitch === 'function') onChannelSwitch(id);
}
function showSidebar() { sidebar.classList.remove('collapsed'); }

// ── Messages ──
var _RENDER_BATCH = 50;
var _MAX_DOM_MSGS = 200;
var _renderedOffset = 0;

function filterMessages() { if (!activeChannel) return []; return activeChannel === 'group' ? allMessages.filter(m => m.channel === 'group' || !m.channel) : allMessages.filter(m => m.channel === activeChannel); }

function renderMessages() {
  var msgs = filterMessages();
  _renderedOffset = Math.max(0, msgs.length - _RENDER_BATCH);
  var batch = _renderedOffset > 0 ? msgs.slice(_renderedOffset) : msgs;
  messagesEl.innerHTML = batch.map(renderMsg).join('');
  if (_renderedOffset > 0) _channelHasMore[activeChannel] = true;
  scrollBottom();
}

function renderNewMessage(m) {
  if (!activeChannel) return;
  if ((activeChannel === 'group' && (m.channel === 'group' || !m.channel)) || m.channel === activeChannel) {
    if (m.runId) { const el = document.getElementById('stream-' + m.runId); if (el) el.remove(); }
    messagesEl.insertAdjacentHTML('beforeend', renderMsg(m)); scrollBottom();
    if ((m.type === 'user' || m.type === 'agent') && m.text && !m._tempId && typeof autoDetectLinkPreviews === 'function') {
      autoDetectLinkPreviews(m.id, m.text);
    }
    _trimDom();
  }
}

function _trimDom() {
  var count = messagesEl.children.length;
  if (count <= _MAX_DOM_MSGS) return;
  var excess = count - _MAX_DOM_MSGS;
  for (var i = 0; i < excess; i++) messagesEl.removeChild(messagesEl.firstElementChild);
  _renderedOffset += excess;
  _channelHasMore[activeChannel] = true;
}
const rawMsgStore = new Map();
const _RAW_STORE_MAX = 500;
function _trimRawStore() { if (rawMsgStore.size <= _RAW_STORE_MAX) return; const it = rawMsgStore.keys(); let del = rawMsgStore.size - _RAW_STORE_MAX; while (del-- > 0) { rawMsgStore.delete(it.next().value); } }
function renderMsg(m) {
  if (m.type === 'system') {
    if (typeof renderRichSystemMsg === 'function') { const rich = renderRichSystemMsg(m); if (rich) return rich; }
    return `<div class="msg system"><div class="msg-bubble">${esc(m.text)}</div></div>`;
  }
  const isSelf = m.type === 'user' && (m.userId === me?.id || m.userId === _myUserId || (isOwner && m.userName === me?.name)), isAgent = m.type === 'agent';
  let avC, avB, sN;
  if (isAgent) { const ag = AGENTS.find(a => a.id === m.agent); avC = ag?.emoji||'\u{1F916}'; avB = ag?.color||'#00d4ff'; sN = ag?.name||'Agent'; }
  else if (isSelf && me?.avatarImg) { avC = ''; avB = `url(${me.avatarImg}) center/cover no-repeat`; sN = me.name||t('profile.owner'); }
  else if (isSelf && me?.avatar) { avC = me.avatar; avB = 'transparent'; sN = me.name||t('profile.owner'); }
  else { avC = (m.userName||'?')[0].toUpperCase(); avB = m.userColor||'#00d4ff'; sN = m.userName||t('profile.user'); }

  let quoteHtml = '';
  if (m.replyTo && typeof renderQuoteBlock === 'function') quoteHtml = renderQuoteBlock(m.replyTo);

  const rawText = m.text || '';
  let content;
  if (m.blocks && m.blocks.length && typeof renderBlocks === 'function') {
    content = renderBlocks(m.blocks);
  } else {
    content = isAgent ? renderMarkdown(rawText) : formatText(rawText);
  }

  const msgFiles = m.files || (m.file ? [m.file] : []);
  let fileKbBtn = '';
  let useGallery = false;

  if (msgFiles.length >= 2 && typeof autoGalleryFromFiles === 'function' && typeof renderCard === 'function') {
    const gallery = autoGalleryFromFiles(msgFiles);
    if (gallery) { content += renderCard(gallery); useGallery = true; }
  }
  if (!useGallery && msgFiles.length) {
    for (const file of msgFiles) {
      const fname = (file.name || '').toLowerCase();
      const safeUrl = escH(file.url || '');
      if (file.type?.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|svg)$/.test(fname)) {
        content += `<div class="md-img-wrap"><img data-lazy-src="${safeUrl}" alt="${escH(file.name||'')}" class="lazy-media" onclick="openLightbox(this.src||this.dataset.lazySrc)" /></div>`;
      } else if (/\.(mp4|webm|mov|ogg)$/.test(fname)) {
        content += `<div class="md-video-wrap"><video controls data-lazy-src="${safeUrl}" class="lazy-media"></video></div>`;
      } else {
        content += `<br><a class="file-link" href="${safeUrl}" target="_blank">&#128196; ${esc(file.name)}</a>`;
        if (isDirectAgent(activeChannel) && isOwner && /\.(md|txt|json|csv)$/i.test(fname)) { fileKbBtn = `<button class="msg-action-btn train-kb-btn" onclick="event.stopPropagation();trainSaveFileToKB('${escJs(file.url||'')}','${escJs(file.name||'')}')" title="${t('train.saveToKbTitle')}">\u{1F4DA}</button>`; }
      }
    }
  }

  if (m.cards && typeof renderCards === 'function') content += renderCards(m.cards);

  const msgUid = isAgent && rawText ? 'rm-' + (m.ts || Date.now()) + '-' + Math.random().toString(36).slice(2,6) : '';
  if (msgUid) { rawMsgStore.set(msgUid, rawText); _trimRawStore(); }
  const copyBtn = msgUid ? `<button class="msg-action-btn" onclick="copyMsgText('${msgUid}')" title="${t('fav.copyTitle')}">&#128203;</button>` : '';
  const favId = (m.ts||0) + '_' + (m.agent||m.userId||'');
  const safeFavId = escJs(favId);
  const isFav = isFavorited(favId);
  const favBtn = `<button class="msg-action-btn${isFav?' fav-on':''}" data-fav="${escH(favId)}" onmousedown="event.stopPropagation()" onclick="toggleFav('${safeFavId}',event)" title="${isFav?t('fav.unfavTitle'):t('fav.favTitle')}">${isFav?'\u2605':'\u2606'}</button>`;
  let rememberBtn = '';
  if (isDirectAgent(activeChannel) && isOwner && rawText) { const rmKey = 'trm-' + (m.ts || Date.now()) + '-' + Math.random().toString(36).slice(2,6); rawMsgStore.set(rmKey, rawText); _trimRawStore(); rememberBtn = `<button class="msg-action-btn train-remember-btn" onclick="event.stopPropagation();trainRememberMsg(${m.ts||0},'${escJs(m.agent||'')}','${escJs(m.userId||'')}',rawMsgStore.get('${rmKey}')||'')" title="${t('train.rememberTitle')}">\u{1F4CC}</button>`; }
  const midAttr = escH(m.id || '');
  const replyBtn = `<button class="msg-action-btn" onclick="event.stopPropagation();if(typeof setReplyTarget==='function')setReplyTarget(this.closest('.msg').dataset.msgId)" title="${t('rich.reply')}">↩</button>`;
  const actions = `<div class="msg-actions">${replyBtn}${favBtn}${copyBtn}${rememberBtn}${fileKbBtn}</div>`;
  let statusHtml = '';
  if (isSelf && m._status) {
    const stCls = 'msg-status msg-status-' + m._status;
    if (m._status === 'sending') statusHtml = `<span class="${stCls}" data-temp-id="${escH(m._tempId||'')}" title="${t('chat.sending')||'发送中'}">&#8943;</span>`;
    else if (m._status === 'queued') statusHtml = `<span class="${stCls}" data-temp-id="${escH(m._tempId||'')}" title="${t('chat.queuedHint')||'断线暂存，重连后自动发送'}">&#8593;</span>`;
    else if (m._status === 'failed') statusHtml = `<span class="${stCls}" data-temp-id="${escH(m._tempId||'')}" title="${t('chat.retryHint')||'发送失败，点击重试'}" onclick="retrySend('${escJs(m._tempId||'')}')">&#9888;</span>`;
    else if (m._status === 'delivered') statusHtml = `<span class="${stCls}" data-temp-id="${escH(m._tempId||'')}">&#10003;</span>`;
  }
  let collabBadge = '';
  if (isAgent && m.calledBy) {
    const callerAg = AGENTS.find(a => a.id === m.calledBy);
    const callerName = callerAg ? callerAg.name : m.calledBy;
    collabBadge = `<div class="collab-relay-badge">\u{1F91D} ${esc(callerName)} \u2192 ${esc(sN)}</div>`;
  }
  const collabCls = (isAgent && m.calledBy) ? ' collab-msg' : '';
  return `<div class="msg ${isSelf?'self':isAgent?'agent':''}${collabCls}" id="m-${midAttr}" data-msg-id="${midAttr}" oncontextmenu="if(typeof showMsgContextMenu==='function')showMsgContextMenu(event,this.dataset.msgId)"><div class="msg-avatar" style="background:${avB}">${avC}</div><div class="msg-body">${collabBadge}<div class="msg-meta"><span>${esc(sN)}</span><span>${formatMsgTime(m.ts)}${statusHtml}</span></div><div class="msg-bubble${isAgent?' md-content':''}">${quoteHtml}${content}${actions}</div></div></div>`;
}
function copyMsgText(uid) { const raw = rawMsgStore.get(uid); if (!raw) return; navigator.clipboard.writeText(raw).then(() => { const btn = document.querySelector(`[onclick="copyMsgText('${uid}')"]`); if (btn) { btn.textContent = '\u2705'; setTimeout(() => { btn.innerHTML = '&#128203;'; }, 1500); } }).catch(() => {}); }

function addSystemMsg(text, ch) { const m = { type: 'system', text, ts: Date.now(), channel: ch||'group' }; allMessages.push(m); if (activeChannel === m.channel) { messagesEl.insertAdjacentHTML('beforeend', renderMsg(m)); scrollBottom(); _trimDom(); } }

// ── Streaming ──
function handleAgentStream(msg) {
  if (activeChannel !== (msg.channel||'group')) return;
  const key = msg.runId||'unknown', ag = AGENTS.find(a => a.id === msg.agentId), elId = 'stream-'+key;
  let el = document.getElementById(elId);
  const rendered = renderMarkdown(msg.text || '');
  if (!el) {
    clearAgentTyping();
    messagesEl.insertAdjacentHTML('beforeend', `<div class="msg agent" id="${elId}"><div class="msg-avatar" style="background:${ag?.color||'#00d4ff'}">${ag?.emoji||'\u{1F916}'}</div><div class="msg-body"><div class="msg-meta"><span>${esc(ag?.name||'Agent')}</span><span>${t('chat.replying')}</span></div><div class="msg-bubble md-content streaming-bubble">${rendered}</div></div></div>`);
    scrollBottom();
  } else { const b = el.querySelector('.msg-bubble'); if (b) b.innerHTML = rendered; scrollBottom(); }
}
function handleAgentLifecycle(msg) {
  const ag = AGENTS.find(a => a.id === msg.agentId);
  if (msg.phase === 'start') { showTyping(ag?.name || 'Agent', true); setSendBtnStop(true); }
  else if (msg.phase === 'end') {
    clearAgentTyping(); setSendBtnStop(false);
    setTimeout(() => {
      const el = document.getElementById('stream-' + (msg.runId || 'unknown'));
      if (!el) return;
      const bubble = el.querySelector('.msg-bubble');
      const hasContent = bubble && bubble.textContent.trim().length > 0;
      if (hasContent) {
        bubble.classList.remove('streaming-bubble');
        const meta = el.querySelector('.msg-meta span:last-child');
        if (meta) meta.textContent = formatMsgTime(Date.now());
      } else {
        el.remove();
      }
    }, 500);
  }
}

// ── Tool Call Timeline ──
function _getOrCreateToolTimeline(msg) {
  const ch = msg.channel || 'group';
  if (activeChannel !== ch) return null;
  const runKey = msg.runId || 'unknown';
  const timelineId = 'tool-timeline-' + runKey;
  let timeline = document.getElementById(timelineId);
  if (!timeline) {
    const ag = AGENTS.find(a => a.id === msg.agentId);
    clearAgentTyping();
    messagesEl.insertAdjacentHTML('beforeend',
      `<div class="msg agent tool-timeline-wrap" id="${timelineId}">` +
      `<div class="msg-avatar" style="background:${ag?.color || '#00d4ff'}">${ag?.emoji || '\u{1F916}'}</div>` +
      `<div class="msg-body"><div class="msg-meta"><span>${esc(ag?.name || 'Agent')}</span><span>${t('chat.toolCalling') || '\u{1F527} 工具调用'}</span></div>` +
      `<div class="tool-timeline"></div></div></div>`
    );
    timeline = document.getElementById(timelineId);
    scrollBottom();
  }
  return timeline?.querySelector('.tool-timeline') || null;
}

function handleToolCallStart(msg) {
  const tl = _getOrCreateToolTimeline(msg);
  if (!tl) return;
  const callId = msg.callId || '';
  const toolName = msg.tool || '';
  const argsText = _summarizeArgs(msg.args);

  tl.insertAdjacentHTML('beforeend',
    `<div class="tool-call-step" id="tc-${esc(callId)}" data-start="${Date.now()}">` +
    `<div class="tool-call-header">` +
    `<span class="tool-call-spinner"></span>` +
    `<span class="tool-call-name">${_toolIcon(toolName)} ${esc(toolName)}</span>` +
    `</div>` +
    `<div class="tool-call-args">${esc(argsText)}</div>` +
    `<div class="tool-call-status running">${t('chat.toolRunning') || '执行中...'}</div>` +
    `</div>`
  );
  scrollBottom();
}

function handleToolCallEnd(msg) {
  const callId = msg.callId || '';
  const el = document.getElementById('tc-' + callId);
  if (!el) return;

  const startTs = parseInt(el.dataset.start || '0');
  const duration = startTs ? ((Date.now() - startTs) / 1000).toFixed(1) : '?';

  const statusEl = el.querySelector('.tool-call-status');
  const spinner = el.querySelector('.tool-call-spinner');
  if (spinner) spinner.remove();

  if (msg.error) {
    if (statusEl) {
      statusEl.className = 'tool-call-status error';
      statusEl.textContent = `\u274C ${msg.error} (${duration}s)`;
    }
  } else {
    if (statusEl) {
      statusEl.className = 'tool-call-status success';
      const summary = _summarizeResult(msg.tool, msg.result);
      statusEl.innerHTML = `\u2705 ${esc(summary)} (${duration}s)`;

      if (msg.result && typeof msg.result === 'object') {
        const detailId = 'tcd-' + callId;
        statusEl.insertAdjacentHTML('afterend',
          `<div class="tool-call-detail-toggle" onclick="document.getElementById('${detailId}').classList.toggle('hidden')">[${t('chat.toolExpand') || '展开结果'} \u25BE]</div>` +
          `<pre class="tool-call-detail hidden" id="${detailId}">${esc(JSON.stringify(msg.result, null, 2).slice(0, 2000))}</pre>`
        );
      }
    }
  }
  scrollBottom();
}

function _toolIcon(name) {
  const icons = { rag_query: '\u{1F4DA}', web_search: '\u{1F50D}', memory_write: '\u{1F9E0}', memory_search: '\u{1F50E}' };
  return icons[name] || '\u{1F527}';
}

function _summarizeArgs(args) {
  if (!args || typeof args !== 'object') return '';
  if (args.query) return `${t('chat.toolQuery') || '查询'}: "${args.query}"`;
  if (args.content) return `${t('chat.toolContent') || '内容'}: "${(args.content || '').slice(0, 80)}"`;
  const keys = Object.keys(args).slice(0, 3);
  return keys.map(k => `${k}: ${JSON.stringify(args[k]).slice(0, 40)}`).join(', ');
}

function _summarizeResult(tool, result) {
  if (!result) return '完成';
  if (result.error) return result.error;
  if (tool === 'rag_query') {
    const n = result.chunks?.length || 0;
    return n ? `找到 ${n} 条相关内容` : (result.message || '未找到结果');
  }
  if (tool === 'web_search') {
    const n = result.results?.length || 0;
    return n ? `返回 ${n} 条搜索结果` : '无搜索结果';
  }
  if (tool === 'memory_write') return result.ok ? (result.deduplicated ? '记忆已更新（去重合并）' : '已保存到记忆') : '保存失败';
  if (tool === 'memory_search') {
    const n = result.results?.length || result.total || 0;
    return n ? `回忆起 ${n} 条相关记忆` : '未找到相关记忆';
  }
  return '完成';
}

// ── Send ──
function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || !activeChannel) return;
  if (activeChannel.startsWith('wf_')) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'chat', text, channel: activeChannel, mentions: [] }));
    }
    if (typeof getAndClearReply === 'function') getAndClearReply();
    const wfId = activeChannel.slice(3);
    if (typeof clearWfApprovalButtons === 'function') clearWfApprovalButtons();
    setSendBtnStop(true);
    runWorkflow(wfId, text);
    msgInput.value = '';
    msgInput.style.height = 'auto';
    return;
  }
  const readyFiles = pendingFiles.filter(pf => pf.serverData && !pf.uploading);
  if (!text && !readyFiles.length) return;
  if (pendingFiles.some(pf => pf.uploading)) { showToastMsg(t('common.uploading') || '文件上传中…', 'error'); return; }
  if (isDirectAgent(activeChannel) && isOwner && text.startsWith('/')) { if (handleTrainCommand(text)) { msgInput.value = ''; msgInput.style.height = 'auto'; return; } }
  const mentions = [];
  if (!isDirectAgent(activeChannel)) { const allLabel = t('chat.mentionAll'); if (text.includes('@' + allLabel)) { mentions.push('__all__'); } else { const re = /@(\S+)/g; let m; while ((m = re.exec(text)) !== null) { const ag = AGENTS.find(a => a.id === m[1] || a.name === m[1]); if (ag) mentions.push(ag.id); } } }
  const payload = { type: 'chat', text, channel: activeChannel, mentions };
  if (readyFiles.length) {
    payload.files = readyFiles.map(pf => pf.serverData);
    payload.file = readyFiles[0].serverData;
    if (!text) {
      const names = readyFiles.map(pf => pf.name).join(', ');
      payload.text = `[${t('chat.fileLabel', {name: names})}]`;
    }
  }
  if (typeof getAndClearReply === 'function') {
    const replyId = getAndClearReply();
    if (replyId) payload.replyTo = replyId;
  }
  const sendChannel = activeChannel;
  const isOnline = ws && ws.readyState === WebSocket.OPEN;

  const tempId = '_t' + Date.now() + Math.random().toString(36).slice(2, 6);
  payload._tempId = tempId;

  const optimistic = {
    id: tempId, _tempId: tempId, _status: isOnline ? 'sending' : 'queued', _payload: payload,
    type: 'user', userId: me.id, userName: me.name, userColor: me.color,
    text: payload.text, files: payload.files, file: payload.file,
    channel: sendChannel, ts: Date.now(),
    ...(payload.replyTo ? { replyTo: payload.replyTo } : {})
  };
  allMessages.push(optimistic);
  renderNewMessage(optimistic);
  renderChatList();

  msgInput.value = ''; msgInput.style.height = 'auto'; channelDrafts.delete(activeChannel); clearUpload(); hideMentionPopup();

  if (!isOnline) {
    _enqueueOffline(payload, tempId, optimistic.ts);
    return;
  }

  try { ws.send(JSON.stringify(payload)); } catch (e) {
    optimistic._status = 'queued';
    _updateMsgStatus(tempId);
    _enqueueOffline(payload, tempId, optimistic.ts);
    return;
  }

  setTimeout(function() {
    var m = allMessages.find(function(x) { return x._tempId === tempId; });
    if (m && m._status === 'sending') { m._status = 'failed'; _updateMsgStatus(tempId); }
  }, 12000);

  if (isDirectAgent(sendChannel)) {
    const ag = AGENTS.find(a => a.id === sendChannel);
    if (ag) showTyping(ag.name, true);
  } else if (mentions.length > 0) {
    const firstAg = AGENTS.find(a => mentions.includes(a.id));
    if (firstAg) showTyping(firstAg.name, true);
  }
}

function _updateMsgStatus(tempId) {
  var el = document.querySelector('[data-temp-id="' + tempId + '"]');
  if (!el) {
    var msgEl = document.getElementById('m-' + tempId);
    if (msgEl) el = msgEl.querySelector('.msg-status');
  }
  var m = allMessages.find(function(x) { return x._tempId === tempId; });
  if (!m) return;
  if (m.id && m.id !== tempId) {
    var msgEl = document.getElementById('m-' + tempId);
    if (msgEl) { msgEl.id = 'm-' + m.id; msgEl.setAttribute('data-msg-id', m.id); }
    if (typeof _selectedMsgIds !== 'undefined' && _selectedMsgIds.has(tempId)) { _selectedMsgIds.delete(tempId); _selectedMsgIds.add(m.id); }
  }
  if (!el) {
    if (m._status === 'delivered') delete m._status;
    return;
  }
  if (m._status === 'queued') {
    el.className = 'msg-status msg-status-queued';
    el.innerHTML = '&#8593;';
    el.title = t('chat.queuedHint') || '断线暂存，重连后自动发送';
    el.onclick = null;
  } else if (m._status === 'sending') {
    el.className = 'msg-status msg-status-sending';
    el.innerHTML = '&#8943;';
    el.title = t('chat.sending') || '发送中';
    el.onclick = null;
  } else if (m._status === 'delivered') {
    el.className = 'msg-status msg-status-delivered';
    el.innerHTML = '&#10003;';
    el.title = '';
    el.onclick = null;
    setTimeout(function() {
      var cur = document.querySelector('[data-temp-id="' + tempId + '"]');
      if (cur && cur.parentNode) cur.style.display = 'none';
      var dm = allMessages.find(function(x) { return x._tempId === tempId; });
      if (dm) delete dm._status;
    }, 3000);
  } else if (m._status === 'failed') {
    el.className = 'msg-status msg-status-failed';
    el.innerHTML = '&#9888;';
    el.title = t('chat.retryHint') || '发送失败，点击重试';
    el.onclick = function() { retrySend(tempId); };
  }
}

function retrySend(tempId) {
  var m = allMessages.find(function(x) { return x._tempId === tempId; });
  if (!m || !m._payload || m._status === 'sending') return;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    m._status = 'queued';
    _updateMsgStatus(tempId);
    _enqueueOffline(m._payload, tempId, m.ts);
    return;
  }
  m._status = 'sending';
  _updateMsgStatus(tempId);
  try { ws.send(JSON.stringify(m._payload)); } catch (e) {
    m._status = 'queued';
    _updateMsgStatus(tempId);
    _enqueueOffline(m._payload, tempId, m.ts);
    return;
  }
  setTimeout(function() {
    if (m._status === 'sending') { m._status = 'failed'; _updateMsgStatus(tempId); }
  }, 12000);
}

// ── Offline Queue ──
function _getOfflineQueue() { try { return JSON.parse(storageGet('im-offline-queue') || '[]'); } catch { return []; } }
function _saveOfflineQueue(q) { storageSet('im-offline-queue', JSON.stringify(q)); }

function _enqueueOffline(payload, tempId, ts) {
  var queue = _getOfflineQueue();
  if (queue.some(function(e) { return e.tempId === tempId; })) return;
  queue.push({ payload: payload, tempId: tempId, ts: ts });
  _saveOfflineQueue(queue);
}

function _drainOfflineQueue() {
  var queue = _getOfflineQueue();
  if (!queue.length) return;
  _saveOfflineQueue([]);
  for (var i = 0; i < queue.length; i++) {
    var entry = queue[i];
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      _saveOfflineQueue(queue.slice(i).concat(_getOfflineQueue()));
      return;
    }
    var m = allMessages.find(function(x) { return x._tempId === entry.tempId; });
    if (!m) continue;
    m._status = 'sending';
    _updateMsgStatus(entry.tempId);
    try { ws.send(JSON.stringify(entry.payload)); } catch (e) {
      m._status = 'failed'; _updateMsgStatus(entry.tempId);
      _saveOfflineQueue(queue.slice(i + 1).concat(_getOfflineQueue()));
      return;
    }
    (function(tid) {
      setTimeout(function() {
        var m2 = allMessages.find(function(x) { return x._tempId === tid; });
        if (m2 && m2._status === 'sending') { m2._status = 'failed'; _updateMsgStatus(tid); }
      }, 12000);
    })(entry.tempId);
  }
}

function handleTrainCommand(text) {
  const agentId = activeChannel;
  if (text.startsWith('/teach ')) { const content = text.slice(7).trim(); if (!content) { showToastMsg(t('train.teachUsage'), 'error'); return true; } (async () => { const fn = 'notes.md'; let existing = ''; try { existing = (await (await authFetch('/api/agents/' + agentId + '/files/' + encodeURIComponent(fn))).json()).content || ''; } catch {} const entry = `\n\n---\n**${_lang==='zh'?'用户教学':'User Teaching'}** (${new Date().toLocaleString()}):\n${content}\n`; const full = existing ? existing + entry : (_lang==='zh'?'# 记忆笔记':'# Memory Notes') + '\n' + entry; try { const r = await (await authFetch('/api/agents/' + agentId + '/files/' + encodeURIComponent(fn), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: full }) })).json(); if (r.ok) showToastMsg(t('train.teachSaved')); else showToastMsg(t('profile.saveFail'), 'error'); } catch (e) { showToastMsg(t('profile.saveFail') + ': ' + e.message, 'error'); } })(); return true; }
  if (text === '/remember') { trainRememberConversation(); return true; }
  if (text.startsWith('/soul ')) { const content = text.slice(6).trim(); if (!content) { showToastMsg(t('train.soulUsage'), 'error'); return true; } (async () => { try { const r = await (await authFetch('/api/agents/' + agentId + '/soul', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) })).json(); if (r.ok) showToastMsg(t('train.soulUpdated')); else showToastMsg(t('profile.saveFail'), 'error'); } catch (e) { showToastMsg(t('profile.saveFail') + ': ' + e.message, 'error'); } })(); return true; }
  return false;
}

// ── File Upload (Multi-file Queue) ──
let pendingFiles = [];
let _attachIdSeq = 0;

function _renderAttachStrip() {
  if (!pendingFiles.length) {
    attachStrip.innerHTML = '';
    attachStrip.classList.add('hidden');
    composeBox.classList.remove('has-files');
    return;
  }
  composeBox.classList.add('has-files');
  attachStrip.classList.remove('hidden');
  attachStrip.innerHTML = pendingFiles.map(pf => {
    const isImg = pf.isImage;
    const inner = isImg
      ? `<img src="${escH(pf.thumbUrl || pf.serverData?.url || '')}" alt="" />`
      : `<div class="attach-card-file"><span class="file-icon">\u{1F4C4}</span><span class="file-name">${esc(pf.name)}</span></div>`;
    return `<div class="attach-card${pf.uploading ? ' uploading' : ''}" data-attach-id="${pf.id}">${inner}<button class="attach-card-remove" onclick="removeAttach(${pf.id})">&times;</button></div>`;
  }).join('');
}

function removeAttach(id) {
  const pf = pendingFiles.find(f => f.id === id);
  if (pf?.thumbUrl) URL.revokeObjectURL(pf.thumbUrl);
  pendingFiles = pendingFiles.filter(f => f.id !== id);
  _renderAttachStrip();
}

function clearUpload() {
  for (const pf of pendingFiles) { if (pf.thumbUrl) URL.revokeObjectURL(pf.thumbUrl); }
  pendingFiles = [];
  _renderAttachStrip();
}

async function _uploadFile(f) {
  const id = ++_attachIdSeq;
  const isImage = f.type?.startsWith('image/');
  const entry = { id, name: f.name, size: f.size, isImage, uploading: true, thumbUrl: null, serverData: null };
  if (isImage) entry.thumbUrl = URL.createObjectURL(f);
  pendingFiles.push(entry);
  _renderAttachStrip();

  const fd = new FormData(); fd.append('file', f);
  try {
    const res = await (await authFetch('/upload', { method: 'POST', body: fd })).json();
    const pf = pendingFiles.find(x => x.id === id);
    if (pf) { pf.uploading = false; pf.serverData = res; if (isImage && !pf.thumbUrl) pf.thumbUrl = res.url; }
  } catch (e) {
    showToastMsg(t('common.uploadFail') + e.message, 'error');
    pendingFiles = pendingFiles.filter(x => x.id !== id);
  }
  _renderAttachStrip();
}

fileInput.addEventListener('change', async () => {
  const files = Array.from(fileInput.files);
  if (!files.length) return;
  for (const f of files) _uploadFile(f);
  fileInput.value = '';
});

msgInput.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const f = item.getAsFile();
      if (f) _uploadFile(new File([f], `paste-${Date.now()}.png`, { type: f.type }));
      return;
    }
  }
});

if (composeBox) {
  msgInput.addEventListener('focus', () => composeBox.classList.add('focused'));
  msgInput.addEventListener('blur', () => composeBox.classList.remove('focused'));
}

const _dropZone = document.getElementById('chatView');
if (_dropZone) {
  _dropZone.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; _dropZone.classList.add('drag-over'); });
  _dropZone.addEventListener('dragleave', (e) => { if (!_dropZone.contains(e.relatedTarget)) _dropZone.classList.remove('drag-over'); });
  _dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); _dropZone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files);
    for (const f of files) _uploadFile(f);
  });
}

// ── Helpers ──
let typingClearTimer;
let _agentThinking = false;

function showTyping(n, isAgent) {
  typingIndicator.textContent = t('time.typing', {name: n});
  clearTimeout(typingClearTimer);
  if (isAgent) {
    _agentThinking = true;
    typingClearTimer = setTimeout(() => { clearAgentTyping(); setSendBtnStop(false); }, 60000);
  } else {
    typingClearTimer = setTimeout(() => { if (!_agentThinking) typingIndicator.textContent = ''; }, 3000);
  }
}

function clearAgentTyping() {
  _agentThinking = false;
  clearTimeout(typingClearTimer);
  typingIndicator.textContent = '';
}

function setSendBtnStop(isStop) {
  const btn = document.getElementById('sendBtn');
  if (!btn) return;
  if (isStop) {
    btn.classList.add('btn-stop');
    btn.innerHTML = '&#9632;';
    btn.title = t('chat.stopTitle') || '停止生成';
    btn.onclick = stopGeneration;
  } else {
    btn.classList.remove('btn-stop');
    btn.innerHTML = '&#10148;';
    btn.title = t('chat.sendTitle') || '发送';
    btn.onclick = sendMessage;
  }
}

function stopGeneration() {
  if (!activeChannel || !ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: 'stop', channel: activeChannel }));
  clearAgentTyping();
  setSendBtnStop(false);
  showToastMsg(t('chat.stopped') || '已停止生成');
}
function updateGatewayDot(c) { gwDot.className='status-dot '+(c?'online':'offline'); gwDot.title=c?t('common.llmConnected'):t('common.llmDisconnected'); }
function scrollBottom() { requestAnimationFrame(()=>{messagesEl.scrollTop=messagesEl.scrollHeight;}); }
function isDirectAgent(chId) { if (!chId || chId === 'group') return false; if (customGroups.find(x => x.id === chId)) return false; return !!AGENTS.find(a => a.id === chId); }

// ═══════════════════════════════════════════════
// ── Scroll-to-load-more ──
// ═══════════════════════════════════════════════
let _loadingMore = false;
let _channelHasMore = {};
let _scrollThrottle = null;

function _initScrollLoad() {
  messagesEl.addEventListener('scroll', () => {
    if (_scrollThrottle) return;
    _scrollThrottle = setTimeout(() => { _scrollThrottle = null; }, 120);
    if (messagesEl.scrollTop < 80 && activeChannel && !_loadingMore && _channelHasMore[activeChannel] !== false) {
      loadOlderMessages();
    }
  });
}

async function loadOlderMessages() {
  if (!activeChannel || _loadingMore) return;

  if (_renderedOffset > 0) {
    _loadingMore = true;
    var allFiltered = filterMessages();
    if (_renderedOffset > allFiltered.length) _renderedOffset = allFiltered.length;
    var batchStart = Math.max(0, _renderedOffset - 30);
    var batch = allFiltered.slice(batchStart, _renderedOffset);
    batch = batch.filter(function(m) { return m.id && !document.getElementById('m-' + m.id); });
    _renderedOffset = batchStart;
    if (batch.length) {
      var prevH = messagesEl.scrollHeight;
      messagesEl.insertAdjacentHTML('afterbegin', batch.map(renderMsg).join(''));
      requestAnimationFrame(function() { messagesEl.scrollTop = messagesEl.scrollHeight - prevH; });
      if (_multiSelectMode) _applyMultiSelectToMsgs();
    }
    if (batchStart > 0) _channelHasMore[activeChannel] = true;
    _loadingMore = false;
    return;
  }

  const msgs = filterMessages();
  if (!msgs.length) return;
  const oldestTs = msgs[0].ts;

  _loadingMore = true;
  const bar = document.getElementById('loadMoreBar');
  const barText = document.getElementById('loadMoreText');
  if (bar) bar.classList.remove('hidden');
  if (barText) barText.textContent = t('chat.loadingMore') || '加载中...';

  try {
    const r = await authFetch(`/api/messages?channel=${encodeURIComponent(activeChannel)}&before=${oldestTs}&limit=30`);
    const data = await r.json();
    if (data.messages && data.messages.length) {
      const prevHeight = messagesEl.scrollHeight;
      const existingIds = new Set(allMessages.map(e => e.id).filter(Boolean));
      const newMsgs = data.messages.filter(m => m.id && !existingIds.has(m.id));
      allMessages = [...newMsgs, ...allMessages];
      if (newMsgs.length) {
        var prependHtml = newMsgs.map(renderMsg).join('');
        messagesEl.insertAdjacentHTML('afterbegin', prependHtml);
        if (_multiSelectMode) _applyMultiSelectToMsgs();
      }
      requestAnimationFrame(() => { messagesEl.scrollTop = messagesEl.scrollHeight - prevHeight; });
    }
    _channelHasMore[activeChannel] = data.hasMore !== false && data.messages && data.messages.length >= 30;
  } catch (e) {
    console.warn('[chat] load more failed:', e.message);
  }
  if (bar) bar.classList.add('hidden');
  _loadingMore = false;
}

// ═══════════════════════════════════════════════
// ── Chat Search ──
// ═══════════════════════════════════════════════
let _searchDebounce = null;

function toggleChatSearch() {
  const panel = document.getElementById('chatSearchPanel');
  if (!panel) return;
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    const input = document.getElementById('chatSearchInput');
    if (input) { input.value = ''; input.focus(); }
    document.getElementById('chatSearchCount').textContent = '';
  }
}
function closeChatSearch() {
  const panel = document.getElementById('chatSearchPanel');
  if (panel) panel.classList.add('hidden');
  const countEl = document.getElementById('chatSearchCount');
  if (countEl) countEl.textContent = '';
  if (messagesEl) messagesEl.querySelectorAll('.msg.search-hit').forEach(el => el.classList.remove('search-hit'));
}

function _onSearchInput(e) {
  clearTimeout(_searchDebounce);
  _searchDebounce = setTimeout(() => _execSearch(e.target.value.trim()), 350);
}

async function _execSearch(q) {
  const countEl = document.getElementById('chatSearchCount');
  if (!q) { countEl.textContent = ''; return; }
  try {
    const ch = activeChannel ? `&channel=${encodeURIComponent(activeChannel)}` : '';
    const r = await authFetch(`/api/messages/search?q=${encodeURIComponent(q)}${ch}&limit=20`);
    const data = await r.json();
    const ids = (data.results || []).map(m => m.id);
    countEl.textContent = ids.length ? `${ids.length} ${t('chat.searchResults') || '条结果'}` : t('chat.noResults') || '无结果';
    messagesEl.querySelectorAll('.msg.search-hit').forEach(el => el.classList.remove('search-hit'));
    for (const id of ids) {
      const el = document.getElementById('m-' + id);
      if (el) el.classList.add('search-hit');
    }
    if (ids.length) {
      const first = document.getElementById('m-' + ids[0]);
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  } catch {}
}

(function _bindSearch() {
  const input = document.getElementById('chatSearchInput');
  if (input) input.addEventListener('input', _onSearchInput);
})();

_initScrollLoad();

// ═══════════════════════════════════════════════
// ── Message Deletion ──
// ═══════════════════════════════════════════════

async function deleteSingleMessage(msgId) {
  if (!canManage()) return;
  if (!await appConfirm(t('rich.deleteConfirm'))) return;
  try {
    const r = await (await authFetch('/api/messages/' + encodeURIComponent(msgId), { method: 'DELETE' })).json();
    if (r.ok) {
      _removeMsgLocally(msgId);
      showToastMsg(t('rich.deletedMsg'));
    }
  } catch (e) { showToastMsg(e.message, 'error'); }
}

function _removeMsgLocally(msgId) {
  const m = allMessages.find(x => x.id === msgId);
  if (m) {
    const favId = (m.ts || 0) + '_' + (m.agent || m.userId || '');
    if (isFavorited(favId)) {
      const favs = getFavorites().filter(f => f.id !== favId);
      saveFavorites(favs);
    }
  }
  allMessages = allMessages.filter(x => x.id !== msgId);
  const el = document.getElementById('m-' + msgId);
  if (el) el.remove();
  renderChatList();
}

function _removeMsgsLocally(msgIds) {
  const idSet = new Set(msgIds);
  const toRemove = allMessages.filter(x => idSet.has(x.id));
  const favs = getFavorites();
  let favChanged = false;
  for (const m of toRemove) {
    const favId = (m.ts || 0) + '_' + (m.agent || m.userId || '');
    const fi = favs.findIndex(f => f.id === favId);
    if (fi >= 0) { favs.splice(fi, 1); favChanged = true; }
  }
  if (favChanged) saveFavorites(favs);
  allMessages = allMessages.filter(x => !idSet.has(x.id));
  for (const id of msgIds) {
    const el = document.getElementById('m-' + id);
    if (el) el.remove();
  }
  renderChatList();
}

// ═══════════════════════════════════════════════
// ── Multi-Select Mode ──
// ═══════════════════════════════════════════════

let _multiSelectMode = false;
let _selectedMsgIds = new Set();

function enterMultiSelectMode(initialMsgId) {
  if (!canManage() || _multiSelectMode) return;
  _multiSelectMode = true;
  _selectedMsgIds.clear();
  if (initialMsgId) _selectedMsgIds.add(initialMsgId);
  messagesEl.classList.add('multi-select-mode');
  _renderMultiSelectToolbar();
  _applyMultiSelectToMsgs();
}

function exitMultiSelectMode() {
  _multiSelectMode = false;
  _selectedMsgIds.clear();
  messagesEl.classList.remove('multi-select-mode');
  var toolbar = document.getElementById('multiSelectToolbar');
  if (toolbar) toolbar.remove();
  messagesEl.querySelectorAll('.msg-checkbox').forEach(function(cb) { cb.remove(); });
  messagesEl.querySelectorAll('.msg[data-msg-id]').forEach(function(el) {
    el.classList.remove('ms-selected');
  });
}

function _getRenderedMsgIds() {
  var ids = [];
  messagesEl.querySelectorAll('.msg[data-msg-id]').forEach(function(el) {
    var id = el.getAttribute('data-msg-id');
    if (id) ids.push(id);
  });
  return ids;
}

function _renderMultiSelectToolbar() {
  var toolbar = document.getElementById('multiSelectToolbar');
  if (!toolbar) {
    toolbar = document.createElement('div');
    toolbar.id = 'multiSelectToolbar';
    toolbar.className = 'multi-select-toolbar';
    messagesEl.parentElement.insertBefore(toolbar, messagesEl);
  }
  var count = _selectedMsgIds.size;
  var allIds = _getRenderedMsgIds();
  var allSelected = allIds.length > 0 && allIds.every(function(id) { return _selectedMsgIds.has(id); });
  toolbar.innerHTML =
    '<span class="mst-count">' + t('rich.selected', {count: count}) + '</span>' +
    '<div class="mst-actions">' +
      '<button class="mst-btn" onclick="_toggleSelectAll()">' + (allSelected ? t('rich.deselectAll') : t('rich.selectAll')) + '</button>' +
      '<button class="mst-btn mst-btn-danger" onclick="_deleteSelected()"' + (count === 0 ? ' disabled' : '') + '>' + t('rich.deleteSelected') + '</button>' +
      '<button class="mst-btn mst-btn-danger" onclick="_clearChannel()">' + t('rich.clearChannel') + '</button>' +
      '<button class="mst-btn mst-btn-cancel" onclick="exitMultiSelectMode()">' + t('rich.cancelSelect') + '</button>' +
    '</div>';
}

function _applyMultiSelectToMsgs() {
  messagesEl.querySelectorAll('.msg[data-msg-id]').forEach(function(msgEl) {
    var msgId = msgEl.getAttribute('data-msg-id');
    if (!msgId) return;

    if (!msgEl.getAttribute('data-ms-bound')) {
      msgEl.setAttribute('data-ms-bound', '1');
      var handler = function(e) {
        if (!_multiSelectMode) return;
        e.preventDefault();
        e.stopPropagation();
        _toggleMsgSelection(msgId, msgEl);
      };
      msgEl.addEventListener('click', handler, true);
      msgEl.addEventListener('contextmenu', handler, true);
    }

    if (!msgEl.querySelector('.msg-checkbox')) {
      var cb = document.createElement('div');
      cb.className = 'msg-checkbox' + (_selectedMsgIds.has(msgId) ? ' checked' : '');
      cb.setAttribute('data-cb-id', msgId);
      msgEl.insertBefore(cb, msgEl.firstChild);
    }

    msgEl.classList.toggle('ms-selected', _selectedMsgIds.has(msgId));
  });
}

function _toggleMsgSelection(msgId, msgEl) {
  if (_selectedMsgIds.has(msgId)) _selectedMsgIds.delete(msgId);
  else _selectedMsgIds.add(msgId);
  var checked = _selectedMsgIds.has(msgId);
  if (!msgEl) msgEl = document.getElementById('m-' + msgId);
  if (msgEl) {
    msgEl.classList.toggle('ms-selected', checked);
    var cb = msgEl.querySelector('.msg-checkbox');
    if (cb) cb.classList.toggle('checked', checked);
  }
  _renderMultiSelectToolbar();
}

function _toggleSelectAll() {
  var allIds = _getRenderedMsgIds();
  var allSelected = allIds.length > 0 && allIds.every(function(id) { return _selectedMsgIds.has(id); });
  if (allSelected) _selectedMsgIds.clear();
  else for (var i = 0; i < allIds.length; i++) _selectedMsgIds.add(allIds[i]);
  messagesEl.querySelectorAll('.msg[data-msg-id]').forEach(function(el) {
    var id = el.getAttribute('data-msg-id');
    var sel = _selectedMsgIds.has(id);
    el.classList.toggle('ms-selected', sel);
    var cb = el.querySelector('.msg-checkbox');
    if (cb) cb.classList.toggle('checked', sel);
  });
  _renderMultiSelectToolbar();
}

async function _deleteSelected() {
  var ids = [..._selectedMsgIds];
  if (!ids.length) return;
  if (!await appConfirm(t('rich.batchDeleteConfirm', {count: ids.length}))) return;
  try {
    var r = await (await authFetch('/api/messages/batch-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: ids }) })).json();
    if (r.ok) {
      _removeMsgsLocally(ids);
      showToastMsg(t('rich.batchDeleted', {count: r.removed || ids.length}));
      exitMultiSelectMode();
    }
  } catch (e) { showToastMsg(e.message, 'error'); }
}

async function _clearChannel() {
  if (!activeChannel) return;
  if (!await appConfirm(t('rich.clearConfirm'))) return;
  try {
    var r = await (await authFetch('/api/messages/channel/' + encodeURIComponent(activeChannel), { method: 'DELETE' })).json();
    if (r.ok) {
      var favs = getFavorites();
      var remaining = favs.filter(function(f) { return f.channel !== activeChannel; });
      if (remaining.length !== favs.length) saveFavorites(remaining);
      allMessages = allMessages.filter(function(m) { return activeChannel === 'group' ? (m.channel !== 'group' && m.channel) : m.channel !== activeChannel; });
      messagesEl.innerHTML = '';
      _renderedOffset = 0;
      _channelHasMore[activeChannel] = false;
      renderChatList();
      showToastMsg(t('rich.channelCleared'));
      exitMultiSelectMode();
    }
  } catch (e) { showToastMsg(e.message, 'error'); }
}

// ═══════════════════════════════════════════════
// ── Lazy Media Loading (IntersectionObserver) ──
// ═══════════════════════════════════════════════

var _lazyIO = new IntersectionObserver(function(entries) {
  for (var i = 0; i < entries.length; i++) {
    if (!entries[i].isIntersecting) continue;
    var el = entries[i].target;
    var src = el.dataset.lazySrc;
    if (src) {
      var loadEvt = el.tagName === 'VIDEO' ? 'loadeddata' : 'load';
      el.addEventListener(loadEvt, function() { this.classList.remove('lazy-media'); }, { once: true });
      el.addEventListener('error', function() { this.classList.remove('lazy-media'); }, { once: true });
      el.src = src;
      if (el.tagName === 'VIDEO') el.preload = 'metadata';
      delete el.dataset.lazySrc;
    }
    _lazyIO.unobserve(el);
  }
}, { root: messagesEl, rootMargin: '300px 0px' });

var _lazyMO = new MutationObserver(function(mutations) {
  for (var i = 0; i < mutations.length; i++) {
    var nodes = mutations[i].addedNodes;
    for (var j = 0; j < nodes.length; j++) {
      var n = nodes[j];
      if (n.nodeType !== 1) continue;
      if (n.dataset && n.dataset.lazySrc) _lazyIO.observe(n);
      if (n.querySelectorAll) {
        var lazies = n.querySelectorAll('[data-lazy-src]');
        for (var k = 0; k < lazies.length; k++) _lazyIO.observe(lazies[k]);
      }
    }
  }
});
_lazyMO.observe(messagesEl, { childList: true, subtree: true });

// ═══════════════════════════════════════════════
// ── Mobile Gesture Enhancement (4.3) ──
// ═══════════════════════════════════════════════

var _isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// ── Pull-down to load older messages ──
(function() {
  if (!_isTouchDevice) return;

  var PTR_THRESHOLD = 60;
  var _ptrStartX = 0;
  var _ptrStartY = 0;
  var _ptrDist = 0;
  var _ptrActive = false;
  var _ptrEl = null;

  function _ensurePtrEl() {
    if (_ptrEl && _ptrEl.parentNode) return _ptrEl;
    _ptrEl = document.createElement('div');
    _ptrEl.className = 'ptr-indicator';
    messagesEl.parentNode.insertBefore(_ptrEl, messagesEl);
    return _ptrEl;
  }

  messagesEl.addEventListener('touchstart', function(e) {
    if (messagesEl.scrollTop > 5 || _loadingMore || _multiSelectMode) return;
    _ptrStartX = e.touches[0].clientX;
    _ptrStartY = e.touches[0].clientY;
    _ptrActive = true;
    _ptrDist = 0;
  }, { passive: true });

  messagesEl.addEventListener('touchmove', function(e) {
    if (!_ptrActive) return;
    var dy = e.touches[0].clientY - _ptrStartY;
    var dx = Math.abs(e.touches[0].clientX - _ptrStartX);
    if (dy < 0 || dx > dy) { _ptrActive = false; if (_ptrEl) _ptrEl.classList.remove('ptr-visible'); return; }
    _ptrDist = dy;

    var el = _ensurePtrEl();
    el.classList.add('ptr-visible');
    el.classList.remove('ptr-loading');
    if (_channelHasMore[activeChannel] === false) {
      el.textContent = t('chat.noMoreHistory');
    } else if (_ptrDist >= PTR_THRESHOLD) {
      el.textContent = t('chat.pullRelease');
    } else {
      el.textContent = t('chat.pullDown');
    }
  }, { passive: true });

  messagesEl.addEventListener('touchend', function() {
    if (!_ptrActive) return;
    _ptrActive = false;

    if (_ptrDist >= PTR_THRESHOLD && _channelHasMore[activeChannel] !== false && !_loadingMore) {
      var el = _ensurePtrEl();
      el.textContent = t('chat.pullLoading');
      el.classList.add('ptr-loading');
      loadOlderMessages().then(function() {
        setTimeout(function() {
          if (_ptrEl) { _ptrEl.classList.remove('ptr-visible', 'ptr-loading'); }
        }, 300);
      }, function() {
        if (_ptrEl) { _ptrEl.classList.remove('ptr-visible', 'ptr-loading'); }
      });
    } else {
      if (_ptrEl) _ptrEl.classList.remove('ptr-visible', 'ptr-loading');
    }
    _ptrDist = 0;
  }, { passive: true });

  messagesEl.addEventListener('touchcancel', function() {
    _ptrActive = false;
    _ptrDist = 0;
    if (_ptrEl) _ptrEl.classList.remove('ptr-visible', 'ptr-loading');
  }, { passive: true });
})();

// ── Swipe-right to reply ──
(function() {
  if (!_isTouchDevice) return;

  var SWIPE_THRESHOLD = 60;
  var _swStartX = 0;
  var _swStartY = 0;
  var _swMsgEl = null;
  var _swActive = false;
  var _swLocked = false;
  var _swHint = null;

  messagesEl.addEventListener('touchstart', function(e) {
    if (_multiSelectMode) return;
    var msgEl = e.target.closest('.msg');
    if (!msgEl || msgEl.classList.contains('system')) return;
    _swStartX = e.touches[0].clientX;
    _swStartY = e.touches[0].clientY;
    _swMsgEl = msgEl;
    _swActive = true;
    _swLocked = false;
  }, { passive: true });

  messagesEl.addEventListener('touchmove', function(e) {
    if (!_swActive || !_swMsgEl) return;
    var dx = e.touches[0].clientX - _swStartX;
    var dy = e.touches[0].clientY - _swStartY;

    if (!_swLocked && Math.abs(dx) < 8 && Math.abs(dy) < 8) return;

    if (!_swLocked) {
      if (Math.abs(dy) > Math.abs(dx)) {
        _swActive = false;
        _cleanupSwipe();
        return;
      }
      _swLocked = true;
    }

    if (dx < 10) return;

    e.preventDefault();

    var clampedDist = Math.min(dx, 80);
    _swMsgEl.style.transform = 'translateX(' + clampedDist + 'px)';
    _swMsgEl.style.transition = 'none';

    if (!_swHint) {
      _swHint = document.createElement('span');
      _swHint.className = 'msg-swipe-reply-hint';
      _swHint.textContent = '↩';
      var rect = _swMsgEl.getBoundingClientRect();
      var pRect = messagesEl.getBoundingClientRect();
      _swHint.style.top = (rect.top - pRect.top + messagesEl.scrollTop + rect.height / 2) + 'px';
      _swHint.style.left = (rect.left - pRect.left - 28) + 'px';
      _swHint.style.right = 'auto';
      messagesEl.appendChild(_swHint);
    }
    _swHint.style.opacity = Math.min(dx / SWIPE_THRESHOLD, 1);
  }, { passive: false });

  messagesEl.addEventListener('touchend', function() {
    if (!_swActive || !_swMsgEl) { _cleanupSwipe(); return; }

    var msgId = _swMsgEl.dataset.msgId;

    var curTransform = _swMsgEl.style.transform;
    var match = curTransform && curTransform.match(/translateX\(([-\d.]+)px\)/);
    var absDist = match ? Math.abs(parseFloat(match[1])) : 0;

    _resetSwipeAnim();

    if (absDist >= SWIPE_THRESHOLD && msgId) {
      if (typeof setReplyTarget === 'function') setReplyTarget(msgId);
    }

    _swActive = false;
    _swLocked = false;
  }, { passive: true });

  messagesEl.addEventListener('touchcancel', function() {
    _cleanupSwipe();
  }, { passive: true });

  function _cleanupSwipe() {
    if (_swHint) { _swHint.remove(); _swHint = null; }
    if (_swMsgEl) {
      _swMsgEl.style.transform = '';
      _swMsgEl.style.transition = '';
    }
    _swMsgEl = null;
    _swActive = false;
    _swLocked = false;
  }

  function _resetSwipeAnim() {
    if (!_swMsgEl) return;
    _swMsgEl.style.transition = 'transform .2s ease';
    _swMsgEl.style.transform = '';
    if (_swHint) { _swHint.style.opacity = '0'; }
    var el = _swMsgEl;
    var hint = _swHint;
    setTimeout(function() {
      el.style.transition = '';
      if (hint && hint.parentNode) hint.remove();
    }, 200);
    _swHint = null;
    _swMsgEl = null;
  }
})();

var _pendingCollabChain = {};

function handleCollabChainWaiting(msg) {
  if (msg.channel !== activeChannel) return;
  const nextAg = AGENTS.find(a => a.id === msg.nextAgentId);
  const nextName = nextAg ? nextAg.name : msg.nextAgentName || msg.nextAgentId;
  const nextEmoji = nextAg ? nextAg.emoji || '\u{1F916}' : '\u{1F916}';
  const waitKey = 'cw-' + msg.channel + '-' + Date.now();
  _pendingCollabChain[waitKey] = {
    channel: msg.channel,
    nextAgentId: msg.nextAgentId,
    previousText: msg.previousText || '',
    previousAgentId: msg.previousAgentId || '',
  };
  const safeKey = escJs(waitKey);
  const html = `<div class="msg system collab-chain-waiting" id="${escH(waitKey)}">
    <div class="collab-chain-bar">
      <span class="collab-chain-info">\u{1F517} \u534f\u4f5c\u94fe\u7b49\u5f85\u786e\u8ba4\uff1a\u4e0b\u4e00\u6b65\u7531 ${esc(nextEmoji)} <b>${esc(nextName)}</b> \u63a5\u529b (${msg.currentStep || '?'}/${msg.totalSteps || '?'})</span>
      <div class="collab-chain-actions">
        <button class="collab-btn collab-btn-go" onclick="collabChainContinue('${safeKey}')">\u2705 \u7ee7\u7eed</button>
        <button class="collab-btn collab-btn-stop" onclick="collabChainDismiss('${safeKey}')">\u274c \u7ec8\u6b62</button>
      </div>
    </div>
  </div>`;
  messagesEl.insertAdjacentHTML('beforeend', html);
  scrollBottom();
}

function collabChainContinue(waitKey) {
  const data = _pendingCollabChain[waitKey];
  if (!data) return;
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'collab_chain_continue', channel: data.channel, nextAgentId: data.nextAgentId, previousText: data.previousText, previousAgentId: data.previousAgentId }));
  }
  delete _pendingCollabChain[waitKey];
  const el = document.getElementById(waitKey);
  if (el) el.remove();
}

function collabChainDismiss(waitKey) {
  delete _pendingCollabChain[waitKey];
  const el = document.getElementById(waitKey);
  if (el) el.remove();
}
