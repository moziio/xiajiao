/* 虾饺 (Xiajiao) — Group Management (Layer 2) */

function renderGroupManager() {
  manageModal.querySelector('.modal-content').innerHTML=`
    <div class="modal-header"><h3>${t('manage.groupTitle')}</h3><div class="modal-tabs"><button class="tab-btn" onclick="renderAgentManager()">${t('manage.agentTab')}</button><button class="tab-btn active" onclick="renderGroupManager()">${t('manage.groupTab')}</button></div><button class="modal-close" onclick="closeManagePanel()">&times;</button></div>
    <div class="modal-body"><div>${customGroups.length===0?'<div class="empty-hint">'+t('manage.noCustomGroups')+'</div>':''}${customGroups.map(g=>{const sgid=escJs(g.id);return`<div class="manage-item"><span class="manage-emoji">${g.emoji}</span><span class="manage-name">${esc(g.name)}</span><span class="manage-id">${t('contacts.memberCount', {count: g.members.length})}</span><div class="manage-actions"><button onclick="openGroupSettings('${sgid}')">&#9881;</button><button onclick="deleteGroupConfirm('${sgid}')" class="danger">&#128465;</button></div></div>`}).join('')}</div>
      <div class="manage-form"><h4>${t('manage.createGroup')}</h4><input id="newGroupName" placeholder="${t('manage.groupName')}" />
        <div class="mp-box">
          <input id="memberSearchInput" class="mp-search" placeholder="${t('manage.memberSearchPlaceholder')}" oninput="filterGroupMembers()" />
          <div class="mp-row mp-row-all" onclick="toggleAllMembers()"><span class="mp-row-label">${t('manage.selectAll')}</span><span id="mpSelectAllIcon" class="mp-check"></span><span id="memberSelectedCount" class="mp-count"></span></div>
          <div id="memberPickerList" class="mp-list">${renderMemberPickerItems(AGENTS, '')}</div>
        </div>
        <label style="margin-top:12px">${t('manage.groupLeader')}</label>
        <select id="newGroupLeader" class="train-input"><option value="">${t('manage.noLeader')}</option></select>
        <div class="hint">${t('manage.leaderHint')}</div>
        <div id="groupReviewCronRow" style="display:none">
          <label>${t('manage.reviewFreq')}</label>
          <select id="newGroupReviewCron" class="train-input">
            <option value="">${t('manage.noAutoReview')}</option>
            <option value="0 18 * * 1-5">${t('train.svCronWeekday18')}</option>
            <option value="0 10 * * 1-5">${t('train.svCronWeekday10')}</option>
            <option value="0 9 * * 1">${t('train.svCronMonday9')}</option>
            <option value="0 18 * * *">${t('train.svCronDaily18')}</option>
          </select>
        </div>
        <button class="btn-primary" onclick="createGroupAction()">${t('manage.createGroupBtn')}</button><div id="groupFormMsg" class="form-msg"></div></div></div>`;
  _memberChecked = new Set();
  updateMemberCount();
  refreshLeaderOptions();
}

// ── Member Picker ──
function renderMemberPickerItems(agents, query) {
  const q = query.toLowerCase().trim();
  const keywords = q ? q.split(/\s+/) : [];
  let filtered = agents;
  if (keywords.length) { filtered = agents.filter(a => { const haystack = [a.id, a.name, a.model || '', _agentDescCache[a.id] || ''].join(' ').toLowerCase(); return keywords.every(kw => haystack.includes(kw)); }); }
  if (filtered.length === 0) return `<div class="mp-empty">${t('manage.memberNoMatch')}</div>`;
  return filtered.map(a => {
    const sel = _memberChecked.has(a.id);
    const desc = _agentDescCache[a.id] || '';
    const firstLine = desc.replace(/^#.*\n?/, '').trim().split('\n')[0]?.slice(0, 60) || '';
    return `<div class="mp-row${sel ? ' selected' : ''}" data-id="${escH(a.id)}" onclick="mpToggle('${escJs(a.id)}')"><span class="mp-row-label"><span class="mp-row-name">${esc(a.emoji)} ${esc(a.name)}</span>${firstLine ? '<span class="mp-desc">' + esc(firstLine) + '</span>' : ''}</span><span class="mp-check">${sel ? '\u2713' : ''}</span></div>`;
  }).join('');
}

let _memberChecked = new Set();
function mpToggle(id) { if (_memberChecked.has(id)) _memberChecked.delete(id); else _memberChecked.add(id); refreshMemberList(); }
function filterGroupMembers() { refreshMemberList(); }
function refreshMemberList() { const q = ($('#memberSearchInput')?.value || ''); const list = $('#memberPickerList'); if (list) list.innerHTML = renderMemberPickerItems(AGENTS, q); updateMemberCount(); }

function toggleAllMembers() {
  const visible = AGENTS.filter(a => {
    const q = ($('#memberSearchInput')?.value || '').toLowerCase().trim();
    if (!q) return true;
    const kws = q.split(/\s+/);
    const h = [a.id, a.name, a.model || '', _agentDescCache[a.id] || ''].join(' ').toLowerCase();
    return kws.every(kw => h.includes(kw));
  });
  const allSelected = visible.every(a => _memberChecked.has(a.id));
  visible.forEach(a => { if (allSelected) _memberChecked.delete(a.id); else _memberChecked.add(a.id); });
  refreshMemberList();
}

function updateMemberCount() {
  const el = $('#memberSelectedCount');
  const icon = $('#mpSelectAllIcon');
  const count = _memberChecked.size;
  const total = AGENTS.length;
  if (el) el.textContent = count > 0 ? t('manage.selectedCount', { count, total }) : '';
  if (icon) {
    if (count === 0) { icon.textContent = ''; icon.className = 'mp-check'; }
    else if (count === total) { icon.textContent = '\u2713'; icon.className = 'mp-check active'; }
    else { icon.textContent = '\u2014'; icon.className = 'mp-check partial'; }
  }
  refreshLeaderOptions();
}

function refreshLeaderOptions() {
  const sel = $('#newGroupLeader'); if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '<option value="">' + t('manage.noLeader') + '</option>' + [..._memberChecked].map(id => { const a = AGENTS.find(x => x.id === id); return a ? `<option value="${escH(a.id)}">${esc(a.emoji)} ${esc(a.name)}</option>` : ''; }).join('');
  if (_memberChecked.has(prev)) sel.value = prev;
  const cronRow = $('#groupReviewCronRow');
  if (cronRow) cronRow.style.display = sel.value ? '' : 'none';
  sel.onchange = () => { if (cronRow) cronRow.style.display = sel.value ? '' : 'none'; };
}

async function createGroupAction() {
  const name=$('#newGroupName').value.trim(),msg=$('#groupFormMsg'); if(!name){msg.textContent=t('manage.fillGroupName');return;}
  const members=[..._memberChecked];
  const leader = $('#newGroupLeader')?.value || '';
  const reviewCron = leader ? ($('#newGroupReviewCron')?.value || '') : '';
  msg.textContent=t('manage.creating');
  try{const d=await(await authFetch('/api/groups',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,members,leader,reviewCron})})).json();if(d.ok){showToastMsg(t('manage.createSuccess'));closeManagePanel();}else msg.textContent=t('community.failPrefix')+(d.error||'unknown');}catch(e){msg.textContent=t('common.error')+e.message;}
}

// ── Group Settings ──
function openGroupSettings(gid) {
  const isDefault = gid === 'group';
  const g = isDefault ? null : customGroups.find(x => x.id === gid);
  if (!isDefault && !g) return;
  const members = isDefault ? AGENTS : (g.members || []).map(mid => AGENTS.find(a => a.id === mid)).filter(Boolean);
  const name = isDefault ? (storageGet('im-group-name') || t('contacts.defaultGroup')) : g.name;
  manageModal.classList.remove('hidden');
  const sg = escJs(gid);
  let h = '<div class="group-panel"><div class="group-panel-header"><span>' + t('chat.chatInfoCount', {count: members.length}) + '</span><button class="modal-close" onclick="closeManagePanel()">&times;</button></div><div class="group-panel-body">';
  h += '<div class="group-members-section"><div class="group-members-grid">';
  h += members.map(a => { const sa = escJs(a.id); return '<div class="group-member-cell"><div class="group-member-avatar" style="background:' + a.color + '40;border-color:' + a.color + '" onclick="closeManagePanel();openProfile(\'' + sa + '\')">' + a.emoji + '</div>' + (canManage() && !isDefault ? '<span class="group-member-remove" onclick="event.stopPropagation();kickFromPanel(\'' + sg + '\',\'' + sa + '\')">&times;</span>' : '') + '<div class="group-member-name">' + esc(a.name) + '</div></div>'; }).join('');
  if (canManage() && !isDefault) h += '<div class="group-member-cell"><div class="group-member-avatar group-member-add" onclick="inviteFromPanel(\'' + sg + '\')">+</div><div class="group-member-name">' + t('panel.invite') + '</div></div>';
  h += '</div></div>';
  h += '<div class="group-settings-section"><div class="group-setting-item"' + (canManage() ? ' onclick="renameFromPanel(\'' + sg + '\')"' : '') + '><span class="group-setting-label">' + t('panel.chatName') + '</span><span class="group-setting-value" id="panelGroupName">' + esc(name) + '</span><span class="group-setting-arrow">&rsaquo;</span></div>';
  if (!isDefault && canManage()) {
    const leaderAgent = g?.leader ? AGENTS.find(a => a.id === g.leader) : null;
    h += '<div class="group-setting-item" onclick="editGroupLeader(\'' + sg + '\')"><span class="group-setting-label">' + t('manage.groupLeader') + '</span><span class="group-setting-value">' + (leaderAgent ? leaderAgent.emoji + ' ' + esc(leaderAgent.name) : t('manage.noLeader')) + '</span><span class="group-setting-arrow">&rsaquo;</span></div>';
    const cronLabel = g?.reviewCron ? getCronLabel(g.reviewCron) : t('manage.noAutoReview');
    h += '<div class="group-setting-item" onclick="editGroupReviewCron(\'' + sg + '\')"><span class="group-setting-label">' + t('manage.reviewFreq') + '</span><span class="group-setting-value">' + esc(cronLabel) + '</span><span class="group-setting-arrow">&rsaquo;</span></div>';
    const chainLen = g?.collabChain ? g.collabChain.length : 0;
    h += '<div class="group-setting-item" onclick="editCollabChain(\'' + sg + '\')"><span class="group-setting-label">\u{1F517} \u534f\u4f5c\u94fe</span><span class="group-setting-value">' + (chainLen ? chainLen + ' \u6b65' : '\u672a\u914d\u7f6e') + '</span><span class="group-setting-arrow">&rsaquo;</span></div>';
  }
  h += '</div>';
  if (!isDefault && canManage()) h += '<div class="group-settings-section"><div class="group-setting-item group-setting-danger" onclick="deleteGroupConfirm(\'' + sg + '\')"><span class="group-setting-label">' + t('panel.dissolve') + '</span></div></div>';
  h += '</div></div>';
  manageModal.querySelector('.modal-content').innerHTML = h;
}

function getCronLabel(cron) {
  const map = { '0 18 * * 1-5': t('train.svCronWeekday18'), '0 10 * * 1-5': t('train.svCronWeekday10'), '0 9 * * 1': t('train.svCronMonday9'), '0 18 * * *': t('train.svCronDaily18') };
  return map[cron] || cron;
}

function editGroupLeader(gid) {
  const g = customGroups.find(x => x.id === gid); if (!g) return;
  const members = (g.members || []).map(mid => AGENTS.find(a => a.id === mid)).filter(Boolean);
  const sg = escJs(gid);
  let h = '<div class="group-panel"><div class="group-panel-header"><button class="group-panel-back" onclick="openGroupSettings(\'' + sg + '\')">&larr;</button><span>' + t('manage.groupLeader') + '</span><button class="modal-close" onclick="closeManagePanel()">&times;</button></div><div class="group-panel-body">';
  h += '<div class="group-setting-item' + (!g.leader ? ' selected' : '') + '" onclick="saveGroupField(\'' + sg + '\',\'leader\',\'\')"><span class="group-setting-label">' + t('manage.noLeader') + '</span>' + (!g.leader ? '<span class="mp-check active">\u2713</span>' : '') + '</div>';
  h += members.map(a => '<div class="group-setting-item' + (g.leader === a.id ? ' selected' : '') + '" onclick="saveGroupField(\'' + sg + '\',\'leader\',\'' + escJs(a.id) + '\')"><div class="group-invite-avatar" style="background:' + a.color + '40;border-color:' + a.color + '">' + a.emoji + '</div><span class="group-setting-label">' + esc(a.name) + '</span>' + (g.leader === a.id ? '<span class="mp-check active">\u2713</span>' : '') + '</div>').join('');
  h += '</div></div>';
  manageModal.querySelector('.modal-content').innerHTML = h;
}

function editGroupReviewCron(gid) {
  const g = customGroups.find(x => x.id === gid); if (!g) return;
  const presets = [ { value: '', label: t('manage.noAutoReview') }, { value: '0 18 * * 1-5', label: t('train.svCronWeekday18') }, { value: '0 10 * * 1-5', label: t('train.svCronWeekday10') }, { value: '0 9 * * 1', label: t('train.svCronMonday9') }, { value: '0 18 * * *', label: t('train.svCronDaily18') } ];
  const cur = g.reviewCron || '';
  const sg = escJs(gid);
  let h = '<div class="group-panel"><div class="group-panel-header"><button class="group-panel-back" onclick="openGroupSettings(\'' + sg + '\')">&larr;</button><span>' + t('manage.reviewFreq') + '</span><button class="modal-close" onclick="closeManagePanel()">&times;</button></div><div class="group-panel-body">';
  h += presets.map(p => '<div class="group-setting-item' + (cur === p.value ? ' selected' : '') + '" onclick="saveGroupField(\'' + sg + '\',\'reviewCron\',\'' + escJs(p.value) + '\')"><span class="group-setting-label">' + esc(p.label) + '</span>' + (cur === p.value ? '<span class="mp-check active">\u2713</span>' : '') + '</div>').join('');
  h += '</div></div>';
  manageModal.querySelector('.modal-content').innerHTML = h;
}

async function saveGroupField(gid, field, value) {
  const g = customGroups.find(x => x.id === gid); if (!g) return;
  try { const r = await (await authFetch('/api/groups/' + gid, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: g.name, members: g.members, [field]: value }) })).json(); if (r.ok) { g[field] = value; showToastMsg(t('profile.saved')); openGroupSettings(gid); } else { showToastMsg(t('common.fail') + (r.error || ''), 'error'); } } catch (e) { showToastMsg(t('common.error') + e.message, 'error'); }
}

function inviteFromPanel(gid) {
  const members = gid === 'group' ? AGENTS.map(a => a.id) : (customGroups.find(x => x.id === gid)?.members || []);
  const nonMembers = AGENTS.filter(a => !members.includes(a.id));
  if (!nonMembers.length) { showToastMsg(t('panel.allInGroup')); return; }
  const sg = escJs(gid);
  let h = '<div class="group-panel"><div class="group-panel-header"><button class="group-panel-back" onclick="openGroupSettings(\'' + sg + '\')">&larr;</button><span>' + t('panel.inviteTitle') + '</span><button class="modal-close" onclick="closeManagePanel()">&times;</button></div><div class="group-panel-body">';
  h += '<input class="member-search-input" placeholder="' + t('manage.memberSearchPlaceholder') + '" oninput="filterInvitePanel(this.value,\'' + sg + '\')" style="margin-bottom:8px" />';
  h += '<div id="invitePanelList">' + renderInviteListItems(nonMembers.map(a => ({...a, _gid: gid}))) + '</div>';
  h += '</div></div>';
  manageModal.querySelector('.modal-content').innerHTML = h;
}

function renderInviteListItems(agents) {
  return agents.map(a => {
    const desc = _agentDescCache[a.id] || '';
    const firstLine = desc.replace(/^#.*\n?/, '').trim().split('\n')[0]?.slice(0, 50) || '';
    const sgid = escJs(a._gid); const sa = escJs(a.id);
    return '<div class="group-setting-item" onclick="doInviteFromPanel(\'' + sgid + '\',\'' + sa + '\')"><div class="group-invite-avatar" style="background:' + a.color + '40;border-color:' + a.color + '">' + a.emoji + '</div><span class="group-setting-label">' + esc(a.name) + (firstLine ? '<span class="member-check-desc" style="display:block">' + esc(firstLine) + '</span>' : '') + '</span><span class="invite-add">+</span></div>';
  }).join('') || '<div class="member-picker-empty">' + t('manage.memberNoMatch') + '</div>';
}

function filterInvitePanel(query, gid) {
  const members = gid === 'group' ? AGENTS.map(a => a.id) : (customGroups.find(x => x.id === gid)?.members || []);
  let nonMembers = AGENTS.filter(a => !members.includes(a.id)).map(a => ({...a, _gid: gid}));
  if (query.trim()) { const keywords = query.toLowerCase().trim().split(/\s+/); nonMembers = nonMembers.filter(a => { const haystack = [a.id, a.name, a.model || '', _agentDescCache[a.id] || ''].join(' ').toLowerCase(); return keywords.every(kw => haystack.includes(kw)); }); }
  const el = document.getElementById('invitePanelList'); if (el) el.innerHTML = renderInviteListItems(nonMembers);
}

async function doInviteFromPanel(groupId, agentId) {
  const g = customGroups.find(x => x.id === groupId); if (!g) return;
  try { const r = await (await authFetch('/api/groups/' + groupId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: g.name, members: [...g.members, agentId] }) })).json(); if (r.ok) { const ag = AGENTS.find(a => a.id === agentId); showToastMsg(t('panel.joined', {name: (ag?.emoji||'') + ' ' + (ag?.name||agentId)})); if (activeChannel === groupId) switchChannel(groupId); inviteFromPanel(groupId); } else showToastMsg(t('panel.inviteFail') + ': ' + (r.error || ''), 'error'); } catch (e) { showToastMsg(t('panel.inviteFail'), 'error'); }
}

async function kickFromPanel(groupId, agentId) {
  const g = customGroups.find(x => x.id === groupId); if (!g || g.members.length <= 1) { showToastMsg(t('panel.atLeastOne')); return; } const ag = AGENTS.find(a => a.id === agentId);
  try { const r = await (await authFetch('/api/groups/' + groupId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: g.name, members: g.members.filter(m => m !== agentId) }) })).json(); if (r.ok) { showToastMsg(t('panel.removed', {name: (ag?.emoji||'') + ' ' + (ag?.name||agentId)})); if (activeChannel === groupId) switchChannel(groupId); openGroupSettings(groupId); } else showToastMsg(t('panel.removeFail') + ': ' + (r.error || ''), 'error'); } catch (e) { showToastMsg(t('panel.removeFail'), 'error'); }
}

function renameFromPanel(gid) {
  const el = document.getElementById('panelGroupName'); if (!el || !canManage()) return;
  const oldName = el.textContent;
  el.outerHTML = '<input class="group-setting-input" id="panelNameInput" value="' + escH(oldName) + '" maxlength="30" onclick="event.stopPropagation()" />';
  const input = document.getElementById('panelNameInput'); input.focus(); input.select();
  const done = async (save) => { const val = input.value.trim(); if (save && val && val !== oldName) { const info = resolveChannelInfo(gid); if (info) await doRename(gid, info, val, oldName); } openGroupSettings(gid); };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); done(true); } else if (e.key === 'Escape') { e.preventDefault(); done(false); } });
  input.addEventListener('blur', () => done(true));
}

async function deleteGroupConfirm(gid) {
  if(!await appConfirm(t('manage.deleteGroupConfirm', {name: customGroups.find(x=>x.id===gid)?.name||gid}))) return;
  try{const d=await(await authFetch('/api/groups/'+gid,{method:'DELETE'})).json();if(d.ok){if(activeChannel===gid){activeChannel=null;hideAllViews();welcomeScreen.classList.remove('hidden');welcomeScreen.style.display='flex';}closeManagePanel();}else showToastMsg(t('common.fail'),'error');}catch(e){appAlert(t('common.error')+e.message);}
}

// ── Collaboration Chain Config (M4.2) ──
function editCollabChain(gid) {
  const g = customGroups.find(x => x.id === gid); if (!g) return;
  const sg = escJs(gid);
  const chain = g.collabChain || [];
  const members = (g.members || []).map(mid => AGENTS.find(a => a.id === mid)).filter(Boolean);

  let h = '<div class="chain-panel">';
  h += '<div class="chain-panel-hd"><span class="chain-panel-title">🔗 协作链</span>';
  h += '<button class="collab-flow-btn" style="margin-left:auto;margin-right:8px" onclick="closeManagePanel();showFlowPanelForChannel(\'' + sg + '\')">📋 协作流记录</button>';
  h += '<button class="modal-close" onclick="closeManagePanel()">&times;</button></div>';

  if (chain.length === 0) {
    h += '<div class="chain-empty">尚未配置，添加 Agent 后消息将按顺序自动接力</div>';
  } else {
    h += '<div class="chain-nodes">';
    chain.forEach(function(node, idx) {
      var ag = AGENTS.find(function(a) { return a.id === node.agentId; });
      var emoji = ag ? ag.emoji : '❓';
      var name = ag ? esc(ag.name) : esc(node.agentId);
      var autoLabel = node.autoTrigger !== false ? '自动' : '手动';
      var autoCls = node.autoTrigger !== false ? 'chain-auto' : 'chain-manual';
      h += '<div class="chain-node">'
        + '<span class="chain-idx">' + (idx + 1) + '</span>'
        + '<span class="chain-emoji">' + emoji + '</span>'
        + '<span class="chain-name">' + name + '</span>'
        + '<span class="chain-mode ' + autoCls + '" onclick="toggleChainAuto(\'' + sg + '\',' + idx + ')">' + autoLabel + '</span>'
        + '<span class="chain-act" onclick="removeChainNode(\'' + sg + '\',' + idx + ')" title="移除">&times;</span>'
        + (idx > 0 ? '<span class="chain-act" onclick="moveChainNode(\'' + sg + '\',' + idx + ',-1)" title="上移">↑</span>' : '')
        + (idx < chain.length - 1 ? '<span class="chain-act" onclick="moveChainNode(\'' + sg + '\',' + idx + ',1)" title="下移">↓</span>' : '')
        + '</div>';
      if (idx < chain.length - 1) h += '<div class="chain-arrow">→</div>';
    });
    h += '</div>';
  }

  var chainIds = new Set(chain.map(function(n) { return n.agentId; }));
  var avail = members.filter(function(a) { return !chainIds.has(a.id); });
  if (avail.length > 0) {
    h += '<div class="chain-add"><select id="collabAddAgent" class="chain-select">';
    avail.forEach(function(a) { h += '<option value="' + escH(a.id) + '">' + esc(a.emoji) + ' ' + esc(a.name) + '</option>'; });
    h += '</select><button class="chain-add-btn" onclick="addChainNode(\'' + sg + '\')">+ 添加</button></div>';
  }

  if (chain.length > 0) {
    h += '<div class="chain-clear" onclick="clearCollabChain(\'' + sg + '\')">清空协作链</div>';
  }
  h += '</div>';
  manageModal.querySelector('.modal-content').innerHTML = h;
  manageModal.classList.remove('hidden');
}

async function addChainNode(gid) {
  var sel = document.getElementById('collabAddAgent'); if (!sel || !sel.value) return;
  var g = customGroups.find(function(x) { return x.id === gid; }); if (!g) return;
  var chain = (g.collabChain || []).slice();
  chain.push({ agentId: sel.value, role: '', autoTrigger: true });
  try { var r = await (await authFetch('/api/groups/' + gid, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: g.name, members: g.members, collabChain: chain }) })).json(); if (r.ok) { g.collabChain = chain; editCollabChain(gid); } else showToastMsg(r.error || '\u5931\u8d25', 'error'); } catch (e) { showToastMsg(e.message, 'error'); }
}

async function removeChainNode(gid, idx) {
  var g = customGroups.find(function(x) { return x.id === gid; }); if (!g) return;
  var chain = (g.collabChain || []).slice();
  chain.splice(idx, 1);
  try { var r = await (await authFetch('/api/groups/' + gid, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: g.name, members: g.members, collabChain: chain }) })).json(); if (r.ok) { g.collabChain = chain; editCollabChain(gid); } else showToastMsg(r.error || '\u5931\u8d25', 'error'); } catch (e) { showToastMsg(e.message, 'error'); }
}

async function toggleChainAuto(gid, idx) {
  var g = customGroups.find(function(x) { return x.id === gid; }); if (!g) return;
  var chain = (g.collabChain || []).slice();
  if (!chain[idx]) return;
  chain[idx] = Object.assign({}, chain[idx], { autoTrigger: !chain[idx].autoTrigger });
  try { var r = await (await authFetch('/api/groups/' + gid, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: g.name, members: g.members, collabChain: chain }) })).json(); if (r.ok) { g.collabChain = chain; editCollabChain(gid); } else showToastMsg(r.error || '\u5931\u8d25', 'error'); } catch (e) { showToastMsg(e.message, 'error'); }
}

async function moveChainNode(gid, idx, dir) {
  var g = customGroups.find(function(x) { return x.id === gid; }); if (!g) return;
  var chain = (g.collabChain || []).slice();
  var newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= chain.length) return;
  var tmp = chain[idx]; chain[idx] = chain[newIdx]; chain[newIdx] = tmp;
  try { var r = await (await authFetch('/api/groups/' + gid, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: g.name, members: g.members, collabChain: chain }) })).json(); if (r.ok) { g.collabChain = chain; editCollabChain(gid); } else showToastMsg(r.error || '\u5931\u8d25', 'error'); } catch (e) { showToastMsg(e.message, 'error'); }
}

async function clearCollabChain(gid) {
  var g = customGroups.find(function(x) { return x.id === gid; }); if (!g) return;
  try { var r = await (await authFetch('/api/groups/' + gid, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: g.name, members: g.members, collabChain: [] }) })).json(); if (r.ok) { g.collabChain = []; editCollabChain(gid); } else showToastMsg(r.error || '\u5931\u8d25', 'error'); } catch (e) { showToastMsg(e.message, 'error'); }
}
