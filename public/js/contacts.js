/* OpenClaw IM — Contacts Module */

function getAgentCategories() { try { return JSON.parse(storageGet('im-agent-categories') || '[]'); } catch { return []; } }
function setAgentCategories(cats) { storageSet('im-agent-categories', JSON.stringify(cats)); }

function renderContactAgent(a) {
  const sid = escJs(a.id);
  const trainBtn = isOwner ? `<button class="contact-train-btn" onclick="event.stopPropagation();openManagePanel();setTimeout(()=>openAgentDetail('${sid}'),100)" title="${t('contacts.trainAgent') || '训练 / 编辑'}">&#9881;</button>` : '';
  return `<div class="contact-item" onclick="startChat('${sid}')" oncontextmenu="event.preventDefault();showAgentCatMenu(event,'${sid}')"><div class="contact-avatar" style="border-color:${a.color}40">${a.emoji}</div><div class="contact-info"><div class="contact-name">${esc(a.name)}</div><div class="contact-desc">${esc(a.id)}${a.model ? ' · '+esc(a.model) : ''}</div></div><div class="contact-action">${trainBtn}<button onclick="event.stopPropagation();openProfile('${sid}')">${t('contacts.profile')}</button></div></div>`;
}

let contactsSearchQuery = '';

function matchesContactSearch(text) {
  if (!contactsSearchQuery) return true;
  return text.toLowerCase().includes(contactsSearchQuery.toLowerCase());
}

function agentMatchesSearch(a) {
  if (!contactsSearchQuery) return true;
  const q = contactsSearchQuery.toLowerCase();
  return a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || (a.model || '').toLowerCase().includes(q);
}

function renderContacts() {
  const searchBox = `<div class="chat-search"><svg class="contacts-search-icon" viewBox="0 0 16 16" width="14" height="14"><circle cx="6.5" cy="6.5" r="5.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M11 11l3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><input class="chat-search-input contacts-search-input" placeholder="${t('contacts.searchPlaceholder')}" value="${escH(contactsSearchQuery)}" oninput="contactsSearchQuery=this.value;renderContactsList()" /></div>`;
  panelContacts.innerHTML = searchBox + '<div id="contactsListBody"></div>';
  renderContactsList();
}

function renderContactsList() {
  const body = document.getElementById('contactsListBody');
  if (!body) return;
  const cats = getAgentCategories();
  const assigned = new Set(cats.flatMap(c => c.agents || []));
  const ungrouped = AGENTS.filter(a => !assigned.has(a.id));
  const q = contactsSearchQuery;
  let h = '';
  for (const cat of cats) {
    const catAgents = (cat.agents || []).map(id => AGENTS.find(a => a.id === id)).filter(Boolean);
    const filtered = q ? catAgents.filter(agentMatchesSearch) : catAgents;
    if (q && !filtered.length && !matchesContactSearch(cat.name)) continue;
    const showAgents = q ? filtered : catAgents;
    const collapsed = !q && storageGet('im-cat-collapsed-' + cat.name) === '1';
    const safeCatName = escJs(cat.name);
    h += `<div class="contacts-section"><div class="contacts-section-title contacts-cat-title" onclick="toggleCatCollapse('${safeCatName}')"><svg class="cat-chevron ${collapsed ? '' : 'open'}" viewBox="0 0 16 16" width="14" height="14"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> ${esc(cat.name)} <span class="cat-count">(${showAgents.length})</span>${isOwner ? `<span class="cat-actions"><span class="cat-action-btn" onclick="event.stopPropagation();renameCat('${safeCatName}')" title="${t('contacts.renameCategory')}">&#9998;</span><span class="cat-action-btn" onclick="event.stopPropagation();deleteCat('${safeCatName}')" title="${t('contacts.deleteCategory')}">&times;</span></span>` : ''}</div>`;
    if (!collapsed) { h += showAgents.map(a => renderContactAgent(a)).join(''); }
    h += '</div>';
  }
  const filteredUngrouped = q ? ungrouped.filter(agentMatchesSearch) : ungrouped;
  if (filteredUngrouped.length) {
    const ucCollapsed = !q && storageGet('im-cat-collapsed-__uncategorized') === '1';
    h += `<div class="contacts-section"><div class="contacts-section-title" onclick="toggleCatCollapse('__uncategorized')"><svg class="cat-chevron ${ucCollapsed ? '' : 'open'}" viewBox="0 0 16 16" width="14" height="14"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> ${t('contacts.uncategorized')} <span class="cat-count">(${filteredUngrouped.length})</span></div>`;
    if (!ucCollapsed) { h += filteredUngrouped.map(a => renderContactAgent(a)).join(''); }
    h += '</div>';
  }
  if (isOwner && !q) {
    h += `<div class="contacts-cat-bar">`;
    h += `<div class="add-btn" onclick="createCat()"><div class="add-icon">\uD83D\uDCC1</div> ${t('contacts.createCategory')}</div>`;
    h += `<div class="add-btn" onclick="openManagePanel('agents')"><div class="add-icon">+</div> ${t('contacts.addAgent')}</div>`;
    h += `</div>`;
  }
  const allGroups = [{ id: 'group', name: t('contacts.defaultGroup'), desc: t('contacts.allAgents'), emoji: '\u{1F465}' }].concat(customGroups.map(g => ({ id: g.id, name: g.name, desc: t('contacts.memberCount', {count: g.members.length}), emoji: g.emoji || '\u{1F465}' })));
  const filteredGroups = q ? allGroups.filter(g => matchesContactSearch(g.name) || matchesContactSearch(g.desc)) : allGroups;
  if (filteredGroups.length) {
    const grpCollapsed = !q && storageGet('im-cat-collapsed-__groups') === '1';
    h += `<div class="contacts-section"><div class="contacts-section-title" onclick="toggleCatCollapse('__groups')"><svg class="cat-chevron ${grpCollapsed ? '' : 'open'}" viewBox="0 0 16 16" width="14" height="14"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> ${t('contacts.groupSection', {count: filteredGroups.length})}</div>`;
    if (!grpCollapsed) {
      h += filteredGroups.map(g => { const sgid = escJs(g.id); return `<div class="contact-item" onclick="startChat('${sgid}')"><div class="contact-avatar">${g.emoji}</div><div class="contact-info"><div class="contact-name">${esc(g.name)}</div><div class="contact-desc">${esc(g.desc)}</div></div><div class="contact-action"><button onclick="event.stopPropagation();startChat('${sgid}')">${t('contacts.startChat')}</button></div></div>`; }).join('');
      if (canManage() && !q) h += `<div class="add-btn" onclick="openManagePanel('groups')"><div class="add-icon">+</div> ${t('contacts.createGroup')}</div>`;
    }
    h += '</div>';
  }
  if (typeof renderWorkflowContacts === 'function') {
    h += renderWorkflowContacts();
  }
  if (q && !h.trim()) {
    h = `<div class="chat-list-empty" style="padding:30px;text-align:center"><p style="color:var(--text3)">${t('contacts.noMatch')}</p></div>`;
  }
  body.innerHTML = h;
}

function showAgentCatMenu(e, agentId) {
  if (!isOwner) return;
  const old = document.querySelector('.agent-cat-menu');
  if (old) old.remove();
  const cats = getAgentCategories();
  const currentCat = cats.find(c => (c.agents || []).includes(agentId));
  const ag = AGENTS.find(a => a.id === agentId);
  if (!ag) return;
  const menu = document.createElement('div');
  menu.className = 'agent-cat-menu';
  let items = '';
  items += `<div class="acm-header">${ag.emoji} ${esc(ag.name)}</div>`;
  items += `<div class="acm-divider"></div>`;
  items += `<div class="acm-label">${t('contacts.moveTo')}</div>`;
  const safeAgentId = escJs(agentId);
  items += `<div class="acm-item${!currentCat ? ' acm-active' : ''}" onclick="moveAgentDirect('${safeAgentId}','')"><span class="acm-check">${!currentCat ? '\u2713' : ''}</span>${t('contacts.uncategorized')}</div>`;
  for (const c of cats) {
    const active = currentCat && currentCat.name === c.name;
    items += `<div class="acm-item${active ? ' acm-active' : ''}" onclick="moveAgentDirect('${safeAgentId}','${escJs(c.name)}')"><span class="acm-check">${active ? '\u2713' : ''}</span>${esc(c.name)}</div>`;
  }
  items += `<div class="acm-divider"></div>`;
  items += `<div class="acm-item acm-new" onclick="moveAgentNewCat('${safeAgentId}')"><span class="acm-check">+</span>${t('contacts.moveToNew')}</div>`;
  items += `<div class="acm-divider"></div>`;
  items += `<div class="acm-item" onclick="document.querySelector('.agent-cat-menu')?.remove();openManagePanel();setTimeout(()=>openAgentDetail('${safeAgentId}'),100)"><span class="acm-check">\u2699\uFE0F</span>${t('contacts.trainAgent') || '训练 / 编辑'}</div>`;
  items += `<div class="acm-item acm-danger" onclick="confirmDeleteAgent('${safeAgentId}')"><span class="acm-check">\u{1F5D1}\uFE0F</span>${t('contacts.deleteAgent')}</div>`;
  menu.innerHTML = items;
  document.body.appendChild(menu);
  const vw = window.innerWidth, vh = window.innerHeight;
  let x = e.clientX, y = e.clientY;
  requestAnimationFrame(() => {
    const rect = menu.getBoundingClientRect();
    if (x + rect.width > vw - 8) x = vw - rect.width - 8;
    if (y + rect.height > vh - 8) y = vh - rect.height - 8;
    if (x < 8) x = 8;
    if (y < 8) y = 8;
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.classList.add('show');
  });
  setTimeout(() => {
    const close = (ev) => { if (menu.contains(ev.target)) return; menu.remove(); document.removeEventListener('mousedown', close); };
    document.addEventListener('mousedown', close);
  }, 0);
}

function moveAgentDirect(agentId, catName) {
  const cats = getAgentCategories();
  cats.forEach(c => { c.agents = (c.agents || []).filter(id => id !== agentId); });
  if (catName) { const cat = cats.find(c => c.name === catName); if (cat) cat.agents.push(agentId); }
  setAgentCategories(cats);
  document.querySelector('.agent-cat-menu')?.remove();
  renderContacts();
  showToastMsg(t('contacts.agentMoved'));
}

async function moveAgentNewCat(agentId) {
  document.querySelector('.agent-cat-menu')?.remove();
  const name = await appPrompt(t('contacts.categoryNamePrompt'));
  if (!name || !name.trim()) return;
  const cats = getAgentCategories();
  if (cats.find(c => c.name === name.trim())) { showToastMsg(t('contacts.categoryExists'), 'error'); return; }
  cats.forEach(c => { c.agents = (c.agents || []).filter(id => id !== agentId); });
  cats.push({ name: name.trim(), agents: [agentId] });
  setAgentCategories(cats);
  renderContacts();
  showToastMsg(t('contacts.categoryCreated'));
}

function toggleCatCollapse(name) {
  const key = 'im-cat-collapsed-' + name;
  storageSet(key, storageGet(key) === '1' ? '0' : '1');
  renderContacts();
}

async function createCat() {
  const name = await appPrompt(t('contacts.categoryNamePrompt'));
  if (!name || !name.trim()) return;
  const cats = getAgentCategories();
  if (cats.find(c => c.name === name.trim())) { showToastMsg(t('contacts.categoryExists'), 'error'); return; }
  cats.push({ name: name.trim(), agents: [] });
  setAgentCategories(cats);
  renderContacts();
  showToastMsg(t('contacts.categoryCreated'));
}

async function renameCat(oldName) {
  const newName = await appPrompt(t('contacts.categoryRenamePrompt'), oldName);
  if (!newName || !newName.trim() || newName.trim() === oldName) return;
  const cats = getAgentCategories();
  const cat = cats.find(c => c.name === oldName);
  if (!cat) return;
  if (cats.find(c => c.name === newName.trim())) { showToastMsg(t('contacts.categoryExists'), 'error'); return; }
  cat.name = newName.trim();
  setAgentCategories(cats);
  renderContacts();
}

async function deleteCat(name) {
  if (!await appConfirm(t('contacts.deleteCategoryConfirm', {name}))) return;
  const cats = getAgentCategories().filter(c => c.name !== name);
  setAgentCategories(cats);
  renderContacts();
  showToastMsg(t('contacts.categoryDeleted'));
}

function startChat(c) { switchTab('chats'); switchChannel(c); }

async function confirmDeleteAgent(agentId) {
  document.querySelector('.agent-cat-menu')?.remove();
  const ag = AGENTS.find(a => a.id === agentId);
  if (!ag) return;

  let impact;
  try { impact = await (await authFetch('/api/agents/' + agentId + '/delete-impact')).json(); } catch { impact = {}; }

  let html = `<div class="dlg-title">${t('contacts.deleteAgentConfirm', { name: esc(ag.name) })}</div>`;

  if (impact.groups?.length) {
    html += `<div class="dlg-warn"><div class="dlg-warn-title">⚠️ ${esc(t('contacts.deleteAgentGroupWarn'))}</div><ul>${impact.groups.map(g => `<li>${esc(g.name)}</li>`).join('')}</ul></div>`;
  }
  if (impact.workflows?.length) {
    html += `<div class="dlg-warn"><div class="dlg-warn-title">⚠️ ${esc(t('contacts.deleteAgentWfWarn'))}</div><ul>${impact.workflows.map(w => `<li>${esc(w.name)}</li>`).join('')}</ul></div>`;
  }
  if (impact.messageCount > 0) {
    html += `<div class="dlg-warn"><div class="dlg-warn-title">💬 ${esc(t('contacts.deleteAgentMsgWarn', { count: impact.messageCount }))}</div></div>`;
  }
  html += `<div class="dlg-hint">${esc(t('contacts.deleteAgentDataWarn'))}</div>`;

  if (!await appConfirmRich(html)) return;

  try {
    const r = await (await authFetch('/api/agents/' + agentId + '?cascade=1', { method: 'DELETE' })).json();
    if (r.ok) {
      const cats = getAgentCategories();
      cats.forEach(c => { c.agents = (c.agents || []).filter(id => id !== agentId); });
      setAgentCategories(cats);

      allMessages = allMessages.filter(m => m.channel !== agentId && m.agent !== agentId);
      channelDrafts.delete(agentId);
      unreadCounts.delete(agentId);

      if (activeChannel === agentId) {
        activeChannel = null;
        hideAllViews();
        welcomeScreen.classList.remove('hidden');
        welcomeScreen.style.display = 'flex';
      }

      if (r.cascaded?.groups?.length) {
        for (const gName of r.cascaded.groups) {
          const g = customGroups.find(x => x.name === gName);
          if (g) g.members = g.members.filter(m => m !== agentId);
        }
      }

      AGENTS = AGENTS.filter(a => a.id !== agentId);
      try {
        const fresh = await (await authFetch('/api/agents')).json();
        if (fresh.agents) updateAgentList(fresh.agents);
      } catch { renderContacts(); renderChatList(); }
      showToastMsg(t('contacts.deleteAgentDone', { name: ag.name }));
    } else {
      showToastMsg(t('contacts.deleteAgentFail') + (r.error ? ': ' + r.error : ''), 'error');
    }
  } catch (e) {
    showToastMsg(t('contacts.deleteAgentFail') + ': ' + e.message, 'error');
  }
}
