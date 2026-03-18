/* 虾饺 (Xiajiao) — Chat Side Panel (Layer 2) */

function getChannelNote(id) { return storageGet('im-note-' + id) || ''; }
function saveChannelNote(id, note) { if (note) storageSet('im-note-' + id, note); else { try { localStorage.removeItem('im-note-' + id); } catch {} } }
function toggleGroupPanel(gid) { const panel = document.getElementById('groupSidePanel'); if (panel.classList.contains('open') && panel.dataset.gid === gid) { closeGroupPanel(); return; } panel.dataset.gid = gid; renderSidePanel(gid); panel.classList.add('open'); }
function closeGroupPanel() { const p = document.getElementById('groupSidePanel'); if (p) p.classList.remove('open'); }
function renderSidePanel(gid) {
  const ct = document.getElementById('groupSideContent'); if (!ct) return;
  const info = resolveChannelInfo(gid); if (!info) return;
  const isDefault = info.type === 'group', isCustom = info.type === 'custom-group', isDirect = info.type === 'direct', isWorkflow = info.type === 'workflow';
  const members = isDefault ? AGENTS : isCustom ? (info.members || []).map(mid => AGENTS.find(a => a.id === mid)).filter(Boolean) : [];
  const note = getChannelNote(gid);
  const sg = escJs(gid);
  let h = '<div class="sp-header"><span class="sp-title">' + (isDirect ? t('chat.chatInfo') : isWorkflow ? t('workflow.section') : t('chat.chatInfoCount', {count: members.length})) + '</span><button class="sp-close" onclick="closeGroupPanel()">&times;</button></div><div class="sp-body">';
  if (isWorkflow) {
    const wfId = gid.startsWith('wf_') ? gid.slice(3) : gid;
    const wf = workflowDefs.find(w => w.id === wfId);
    h += '<div class="sp-section sp-agent-card"><div class="sp-avatar-big" style="background:var(--accent-glow);border-color:var(--accent)">' + (wf?.emoji || '⚙️') + '</div><div class="sp-agent-name">' + esc(wf?.name || gid) + '</div>' + (wf?.description ? '<div class="sp-agent-model">' + esc(wf.description) + '</div>' : '') + '</div>';
    if (wf?.steps?.length) {
      h += '<div class="sp-section"><div class="sp-note-label">' + t('workflow.stepsLabel') + '</div>';
      h += wf.steps.map((s, i) => {
        const ag = AGENTS.find(a => a.id === s.agent);
        return '<div class="sp-item"><span class="sp-label">' + (i + 1) + '. ' + esc(s.name) + '</span><span class="sp-value">' + (ag ? ag.emoji + ' ' + esc(ag.name) : esc(s.agent)) + '</span></div>';
      }).join('');
      h += '</div>';
    }
    if (isOwner && wf) h += '<div class="sp-section sp-settings"><div class="sp-item sp-clickable" onclick="closeGroupPanel();openWorkflowBuilder(\'' + escJs(wfId) + '\')"><span class="sp-label">⚙️ ' + t('workflow.edit') + '</span><span class="sp-arrow">&rsaquo;</span></div></div>';
  }
  else if (isDirect) { const ag = AGENTS.find(a => a.id === gid); if (ag) { h += '<div class="sp-section sp-agent-card"><div class="sp-avatar-big sp-avatar-edit" style="background:' + ag.color + '40;border-color:' + ag.color + '" onclick="spEmojiPicker(\'' + sg + '\')" title="' + t('panel.clickChangeAvatar') + '">' + ag.emoji + '<span class="sp-avatar-edit-icon">&#9998;</span></div><div class="sp-agent-name">' + esc(ag.name) + '</div>' + (ag.model ? '<div class="sp-agent-model">' + esc(ag.model) + '</div>' : '') + '</div>'; } }
  else { const gEmoji = isCustom ? (customGroups.find(x => x.id === gid)?.emoji || '\u{1F465}') : (storageGet('im-emoji-group') || '\u{1F465}'); h += '<div class="sp-section sp-agent-card"><div class="sp-avatar-big sp-avatar-edit" style="background:#8b5cf640;border-color:#8b5cf6" onclick="spEmojiPicker(\'' + sg + '\')" title="' + t('panel.clickChangeAvatar') + '">' + gEmoji + '<span class="sp-avatar-edit-icon">&#9998;</span></div><div class="sp-agent-name">' + esc(info.name) + '</div><div class="sp-agent-model">' + t('contacts.memberCount', {count: members.length}) + '</div></div>'; h += '<div class="sp-section"><div class="sp-member-grid">'; h += members.map(a => { const sa = escJs(a.id); return '<div class="sp-member-cell">' + (canManage() && isCustom ? '<span class="sp-member-del" onclick="event.stopPropagation();spKick(\'' + sg + '\',\'' + sa + '\')">&times;</span>' : '') + '<div class="sp-member-avatar" style="background:' + a.color + '40;border-color:' + a.color + '" onclick="closeGroupPanel();openProfile(\'' + sa + '\')">' + a.emoji + '</div><div class="sp-member-name">' + esc(a.name) + '</div></div>'; }).join(''); if (canManage() && isCustom) h += '<div class="sp-member-cell"><div class="sp-member-avatar sp-member-add" onclick="spInvitePage(\'' + sg + '\')">+</div><div class="sp-member-name">' + t('panel.invite') + '</div></div>'; h += '</div></div>'; h += '<div class="sp-section sp-settings"><div class="sp-item' + (canManage() ? ' sp-clickable' : '') + '"' + (canManage() ? ' onclick="spRename(\'' + sg + '\')"' : '') + '><span class="sp-label">' + t('panel.chatName') + '</span><span class="sp-value" id="spName">' + esc(info.name) + '</span><span class="sp-arrow">&rsaquo;</span></div></div>'; }
  const isPinned = getPinnedChannels().includes(gid);
  h += '<div class="sp-section sp-settings"><div class="sp-item sp-clickable" onclick="spTogglePin(\'' + sg + '\')"><span class="sp-label">' + t('panel.pinChat') + '</span><div class="sp-switch ' + (isPinned ? 'on' : '') + '" id="spPinSwitch"><div class="sp-switch-dot"></div></div></div></div>';
  h += '<div class="sp-section sp-note-section"><div class="sp-note-label">' + t('panel.note') + '</div><textarea class="sp-note-inline" id="spNoteInline" placeholder="' + t('panel.notePlaceholder') + '" onblur="spAutoSaveNote(\'' + sg + '\')">' + esc(note) + '</textarea></div>';
  if (isCustom && canManage()) h += '<div class="sp-section sp-settings"><div class="sp-item sp-danger" onclick="spDeleteGroup(\'' + sg + '\')"><span class="sp-label">' + t('panel.dissolve') + '</span></div></div>';
  h += '</div>'; ct.innerHTML = h;
}
function spInvitePage(gid) {
  const ct = document.getElementById('groupSideContent'); if (!ct) return;
  const g = customGroups.find(x => x.id === gid); const mIds = gid === 'group' ? AGENTS.map(a => a.id) : (g?.members || []);
  const nonM = AGENTS.filter(a => !mIds.includes(a.id)); if (!nonM.length) { showToastMsg(t('panel.allInGroup')); return; }
  const sg = escJs(gid);
  let h = '<div class="sp-header"><button class="sp-back" onclick="renderSidePanel(\'' + sg + '\')">&larr;</button><span class="sp-title">' + t('panel.inviteTitle') + '</span><button class="sp-close" onclick="closeGroupPanel()">&times;</button></div><div class="sp-body">';
  h += '<input class="member-search-input" placeholder="' + t('manage.memberSearchPlaceholder') + '" oninput="filterSpInvite(this.value,\'' + sg + '\')" style="margin-bottom:8px" />';
  h += '<div id="spInviteList">' + renderSpInviteItems(nonM, gid) + '</div></div>'; ct.innerHTML = h;
}
function renderSpInviteItems(agents, gid) {
  const sg = escJs(gid);
  return agents.map(a => { const desc = _agentDescCache[a.id] || ''; const firstLine = desc.replace(/^#.*\n?/, '').trim().split('\n')[0]?.slice(0, 50) || ''; const sa = escJs(a.id); return '<div class="sp-item sp-clickable" onclick="spDoInvite(\'' + sg + '\',\'' + sa + '\')"><div class="sp-invite-avatar" style="background:' + a.color + '40;border-color:' + a.color + '">' + a.emoji + '</div><span class="sp-label">' + esc(a.name) + (firstLine ? '<span class="member-check-desc" style="display:block">' + esc(firstLine) + '</span>' : '') + '</span><span class="sp-add-icon">+</span></div>'; }).join('') || '<div class="member-picker-empty">' + t('manage.memberNoMatch') + '</div>';
}
function filterSpInvite(query, gid) {
  const mIds = gid === 'group' ? AGENTS.map(a => a.id) : (customGroups.find(x => x.id === gid)?.members || []);
  let nonM = AGENTS.filter(a => !mIds.includes(a.id));
  if (query.trim()) { const keywords = query.toLowerCase().trim().split(/\s+/); nonM = nonM.filter(a => { const haystack = [a.id, a.name, a.model || '', _agentDescCache[a.id] || ''].join(' ').toLowerCase(); return keywords.every(kw => haystack.includes(kw)); }); }
  const el = document.getElementById('spInviteList'); if (el) el.innerHTML = renderSpInviteItems(nonM, gid);
}
async function spDoInvite(groupId, agentId) {
  const g = customGroups.find(x => x.id === groupId); if (!g) return;
  try { const r = await (await authFetch('/api/groups/' + groupId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: g.name, members: [...g.members, agentId] }) })).json(); if (r.ok) { const ag = AGENTS.find(a => a.id === agentId); showToastMsg(t('panel.joined', {name: (ag?.emoji||'') + ' ' + (ag?.name||agentId)})); if (activeChannel === groupId) switchChannel(groupId); setTimeout(() => { toggleGroupPanel(groupId); spInvitePage(groupId); }, 50); } else showToastMsg(t('panel.inviteFail') + ': ' + (r.error || ''), 'error'); } catch (e) { showToastMsg(t('panel.inviteFail'), 'error'); }
}
async function spKick(groupId, agentId) {
  const g = customGroups.find(x => x.id === groupId); if (!g || g.members.length <= 1) { showToastMsg(t('panel.atLeastOne')); return; } const ag = AGENTS.find(a => a.id === agentId);
  try { const r = await (await authFetch('/api/groups/' + groupId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: g.name, members: g.members.filter(m => m !== agentId) }) })).json(); if (r.ok) { showToastMsg(t('panel.removed', {name: (ag?.emoji||'') + ' ' + (ag?.name||agentId)})); if (activeChannel === groupId) switchChannel(groupId); setTimeout(() => toggleGroupPanel(groupId), 50); } else showToastMsg(t('panel.removeFail') + ': ' + (r.error || ''), 'error'); } catch (e) { showToastMsg(t('panel.removeFail'), 'error'); }
}
function spRename(gid) {
  const el = document.getElementById('spName'); if (!el || !canManage()) return; const old = el.textContent;
  el.outerHTML = '<input class="sp-input" id="spNameInput" value="' + escH(old) + '" maxlength="30" onclick="event.stopPropagation()" />';
  const inp = document.getElementById('spNameInput'); inp.focus(); inp.select();
  const done = async (save) => { const v = inp.value.trim(); if (save && v && v !== old) { const info = resolveChannelInfo(gid); if (info) await doRename(gid, info, v, old); } renderSidePanel(gid); };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); done(true); } else if (e.key === 'Escape') { e.preventDefault(); done(false); } });
  inp.addEventListener('blur', () => done(true));
}
function spTogglePin(gid) { togglePin(gid); const sw = document.getElementById('spPinSwitch'); if (sw) sw.classList.toggle('on'); }
function spAutoSaveNote(gid) { const inp = document.getElementById('spNoteInline'); if (inp) saveChannelNote(gid, inp.value.trim()); }
function spEmojiPicker(gid) {
  const ct = document.getElementById('groupSideContent'); if (!ct) return;
  const sg = escJs(gid);
  let h = '<div class="sp-header"><button class="sp-back" onclick="renderSidePanel(\'' + sg + '\')">&larr;</button><span class="sp-title">' + t('panel.changeAvatar') + '</span><button class="sp-close" onclick="closeGroupPanel()">&times;</button></div>';
  h += '<div class="sp-body"><div class="sp-section"><div class="sp-emoji-grid">'; h += EMOJI_PICKS.map(e => '<div class="sp-emoji-cell" onclick="spSetEmoji(\'' + sg + '\',\'' + e + '\')">' + e + '</div>').join(''); h += '</div></div></div>'; ct.innerHTML = h;
}
async function spSetEmoji(gid, emoji) {
  const info = resolveChannelInfo(gid); if (!info) return;
  if (info.type === 'custom-group') { const g = customGroups.find(x => x.id === gid); if (g) { try { await (await authFetch('/api/groups/' + gid, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: g.name, emoji, members: g.members }) })).json(); } catch {} } }
  else if (info.type === 'group') { storageSet('im-emoji-group', emoji); }
  else { storageSet('im-emoji-' + gid, emoji); const ag = AGENTS.find(a => a.id === gid); if (ag) ag.emoji = emoji; }
  showToastMsg(t('panel.avatarUpdated')); renderChatList(); renderContacts();
  if (activeChannel === gid) switchChannel(gid); setTimeout(() => toggleGroupPanel(gid), 50);
}
async function spDeleteGroup(gid) {
  if (!await appConfirm(t('manage.deleteGroupConfirm', {name: customGroups.find(x => x.id === gid)?.name || gid}))) return;
  try { const d = await (await authFetch('/api/groups/' + gid, { method: 'DELETE' })).json(); if (d.ok) { closeGroupPanel(); if (activeChannel === gid) { activeChannel = null; hideAllViews(); welcomeScreen.classList.remove('hidden'); welcomeScreen.style.display = 'flex'; } renderChatList(); } else showToastMsg(t('common.fail'), 'error'); } catch (e) { showToastMsg(t('common.error') + e.message, 'error'); }
}
