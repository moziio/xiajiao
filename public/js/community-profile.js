/* OpenClaw IM — Agent Profile Modal (Layer 2) */

async function openProfile(agentId) {
  profileModal.classList.remove('hidden');
  const mc = profileModal.querySelector('.modal-content');
  mc.innerHTML = '<div class="modal-body"><div class="empty-hint">' + t('profile.loading') + '</div></div>';
  try {
    const data = await (await authFetch('/api/profiles/' + agentId)).json();
    const ag = data.agent || AGENTS.find(a => a.id === agentId);
    if (!ag) { mc.innerHTML = '<div class="modal-body"><div class="empty-hint">' + t('profile.notFound') + '</div></div>'; return; }
    let agentModel = ag.model || '';
    try { agentModel = (await (await authFetch('/api/agents/' + agentId + '/config')).json()).model || agentModel; } catch {}
    const m = data.metrics || {};
    const avgRating = m.ratings?.length ? (m.ratings.reduce((s, r) => s + r.score, 0) / m.ratings.length).toFixed(1) : '-';
    const saId = escJs(agentId);

    mc.innerHTML =
      `<div class="profile-header">` +
        `<div class="profile-avatar" style="border-color:${ag.color || '#00d4ff'}">${ag.emoji || '\u{1F916}'}</div>` +
        `<div class="profile-info">` +
          `<div class="profile-name">${esc(ag.name)}</div>` +
          `<div class="profile-role">${esc(ag.id)}</div>` +
          (isOwner ? `<div class="profile-model-edit"><select id="profModelSelect" onchange="saveAgentModel('${saId}',this.value)">${modelOptions(agentModel)}</select><span id="profModelMsg" class="form-msg" style="display:inline;margin-left:8px;font-size:11px"></span></div>` : (agentModel ? `<div class="profile-model">${t('profile.model', {model: esc(agentModel)})}</div>` : '')) +
        `</div>` +
        `<button class="modal-close" onclick="profileModal.classList.add('hidden')">&times;</button>` +
      `</div>` +

      `<div class="profile-section"><h4>${t('profile.metrics')}</h4>` +
        `<div class="profile-stats">` +
          `<div class="profile-stat"><div class="profile-stat-val">${m.messages || 0}</div><div class="profile-stat-lbl">${t('profile.messages')}</div></div>` +
          `<div class="profile-stat"><div class="profile-stat-val">${m.tasks || 0}</div><div class="profile-stat-lbl">${t('profile.tasks')}</div></div>` +
          `<div class="profile-stat"><div class="profile-stat-val">${avgRating}</div><div class="profile-stat-lbl">${t('profile.rating')}</div></div>` +
        `</div>` +
      `</div>` +

      (data.soul ? `<div class="profile-section"><h4>${t('profile.soulDesc')}</h4><div class="profile-soul">${esc(data.soul)}</div></div>` : '') +

      `<div class="profile-section"><h4>${t('profile.rateTitle')}</h4>` +
        `<div style="display:flex;gap:4px;flex-wrap:wrap">${[1,2,3,4,5].map(s => `<button class="rate-btn" onclick="rateAgent('${saId}',${s})">${'&#9733;'.repeat(s)} ${t('profile.rateBtn', {score:s})}</button>`).join('')}</div>` +
        `<div id="rateMsg" class="form-msg"></div>` +
      `</div>` +

      (isOwner ? `<div class="profile-section profile-quick-actions">` +
        `<h4>${t('profile.quickActions') || '快捷操作'}</h4>` +
        `<div class="profile-action-grid">` +
          `<button class="profile-action-btn" onclick="profileModal.classList.add('hidden');openManagePanel();setTimeout(()=>openAgentDetail('${saId}'),100)"><span class="profile-action-icon">\u{270D}\uFE0F</span>${t('profile.editSoul') || '编辑人设'}</button>` +
          `<button class="profile-action-btn" onclick="profileModal.classList.add('hidden');openManagePanel();setTimeout(()=>{openAgentDetail('${saId}');setTimeout(()=>switchTrainTab('kb'),100)},100)"><span class="profile-action-icon">\u{1F4DA}</span>${t('profile.editKb') || '知识库'}</button>` +
          `<button class="profile-action-btn" onclick="profileModal.classList.add('hidden');openManagePanel();setTimeout(()=>{openAgentDetail('${saId}');setTimeout(()=>switchTrainTab('tools'),100)},100)"><span class="profile-action-icon">\u{1F527}</span>${t('profile.editTools') || '工具配置'}</button>` +
          `<button class="profile-action-btn" onclick="profileModal.classList.add('hidden');openManagePanel();setTimeout(()=>{openAgentDetail('${saId}');setTimeout(()=>switchTrainTab('project'),100)},100)"><span class="profile-action-icon">\u{1F4C1}</span>${t('profile.editProject') || '项目绑定'}</button>` +
        `</div>` +
      `</div>` : '') +

      `<div class="profile-section">` +
        `<button class="btn-primary" onclick="profileModal.classList.add('hidden');startChat('${saId}')">${t('profile.startChat')}</button>` +
      `</div>`;
  } catch { mc.innerHTML = '<div class="modal-body"><div class="empty-hint">' + t('profile.loadFail') + '</div></div>'; }
}

async function saveAgentModel(agentId, model) {
  const msg = document.getElementById('profModelMsg');
  try {
    if (msg) msg.textContent = t('common.saving');
    const r = await (await authFetch('/api/agents/' + agentId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model }) })).json();
    if (r.ok) { if (msg) { msg.textContent = t('profile.saved'); msg.style.color = 'var(--green)'; } }
    else { if (msg) { msg.textContent = t('profile.fail') + (r.error || ''); msg.style.color = 'var(--red)'; } }
  } catch (e) { if (msg) { msg.textContent = t('profile.error'); msg.style.color = 'var(--red)'; } }
}

async function rateAgent(agentId, score) {
  try {
    await authFetch(`/api/metrics/${agentId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating: score, fromId: me.id }) });
    const el = document.getElementById('rateMsg');
    if (el) el.textContent = t('profile.rated', {score});
  } catch {}
}
