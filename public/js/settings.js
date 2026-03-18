/* 虾饺 (Xiajiao) — Settings Panel Core (Layer 2) */

function openSettings(tab) {
  ['tabChats', 'tabContacts', 'tabCommunity', 'tabFavorites'].forEach(id => { const el = $('#' + id); if (el) el.className = ''; });
  const sb = $('#settingsBtn'); if (sb) sb.classList.add('active');
  hideAllViews();
  settingsView.classList.remove('hidden'); settingsView.style.display = 'flex';
  renderSettingsNav();
  switchSettingsTab(tab || activeSettingsTab);
}

function renderSettingsNav() {
  const tabs = [
    { id: 'general', icon: '\u2699\uFE0F', label: t('settings.general') },
    { id: 'models', icon: '\uD83E\uDDE0', label: t('settings.models') },
    { id: 'tools', icon: '\uD83D\uDEE0\uFE0F', label: t('settings.tools') },
    { id: 'gateway', icon: '\uD83D\uDD17', label: t('settings.gateway') },
    { id: 'auth', icon: '\uD83D\uDD12', label: t('settings.auth') },
    { id: 'metrics', icon: '\uD83D\uDCCA', label: t('settings.metrics'), adminOnly: true },
    { id: 'usage', icon: '\uD83D\uDCC8', label: t('settings.usage') },
    { id: 'about', icon: '\u2139\uFE0F', label: t('settings.about') }
  ].filter(tb => !tb.adminOnly || canManage());
  const nav = $('#settingsNav');
  nav.innerHTML = '<div class="settings-nav-title">' + t('settings.title') + '</div>' +
    tabs.map(tb => '<div class="settings-nav-item' + (tb.id === activeSettingsTab ? ' active' : '') + '" onclick="switchSettingsTab(\'' + tb.id + '\')">' +
      '<span class="settings-nav-icon">' + tb.icon + '</span>' + tb.label + '</div>').join('');
}

function switchSettingsTab(tab) {
  activeSettingsTab = tab;
  renderSettingsNav();
  const ct = $('#settingsContent');
  if (tab === 'general') renderSettingsGeneral(ct);
  else if (tab === 'models') renderSettingsModels(ct);
  else if (tab === 'tools') renderSettingsTools(ct);
  else if (tab === 'gateway') renderSettingsGateway(ct);
  else if (tab === 'auth') renderSettingsAuth(ct);
  else if (tab === 'metrics') renderSettingsMetrics(ct);
  else if (tab === 'usage') renderSettingsUsage(ct);
  else if (tab === 'about') renderSettingsAbout(ct);
}

function renderSettingsGeneral(ct) {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const currentLang = (window._i18nLang || 'zh');
  ct.innerHTML = '<div class="settings-section"><div class="settings-section-title">' + t('settings.general') + '</div>' +
    '<div class="settings-row"><div><div class="settings-label">' + t('settings.appName') + '</div></div><div class="settings-value">' +
      '<input class="settings-input" id="stAppName" value="' + escH(storageGet('im-app-name') || '虾饺') + '" onchange="saveGeneralSetting(\'appName\', this.value)"></div></div>' +
    '<div class="settings-row"><div><div class="settings-label">' + t('settings.theme') + '</div></div><div class="settings-value">' +
      '<select class="settings-select" onchange="applyTheme(this.value)"><option value="dark"' + (currentTheme === 'dark' ? ' selected' : '') + '>' + t('settings.themeDark') + '</option>' +
      '<option value="light"' + (currentTheme === 'light' ? ' selected' : '') + '>' + t('settings.themeLight') + '</option></select></div></div>' +
    '<div class="settings-row"><div><div class="settings-label">' + t('settings.language') + '</div></div><div class="settings-value">' +
      '<select class="settings-select" onchange="switchLangTo(this.value)"><option value="zh"' + (currentLang === 'zh' ? ' selected' : '') + '>中文</option>' +
      '<option value="en"' + (currentLang === 'en' ? ' selected' : '') + '>English</option></select></div></div>' +
    '<div class="settings-row"><div><div class="settings-label">' + t('settings.defaultModel') + '</div><div class="settings-label-hint">' + t('settings.defaultModelHint') + '</div></div><div class="settings-value">' +
      '<select class="settings-select" id="stDefaultModel" onchange="saveGeneralSetting(\'defaultModel\', this.value)">' +
      '<option value="">' + t('settings.noDefaultModel') + '</option>' +
      availableModels.map(m => '<option value="' + escH(m.id) + '"' + (storageGet('im-default-model') === m.id ? ' selected' : '') + '>' + esc(m.name) + '</option>').join('') +
      '</select></div></div></div>';
}

function saveGeneralSetting(key, val) {
  if (key === 'appName') {
    storageSet('im-app-name', val);
    authFetch('/api/settings', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({appName: val}) });
  } else if (key === 'defaultModel') {
    storageSet('im-default-model', val);
    authFetch('/api/settings', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({defaultModel: val}) });
  }
  showToastMsg(t('settings.saved'));
}

function switchLangTo(lang) {
  if (typeof setLang === 'function') setLang(lang);
  else { window._i18nLang = lang; storageSet('im-lang', lang); }
  if (typeof renderChatList === 'function') renderChatList();
  if (typeof renderContacts === 'function') renderContacts();
  renderSettingsNav(); renderSettingsGeneral($('#settingsContent'));
}

async function renderSettingsUsage(ct) {
  ct.innerHTML = '<div class="settings-section"><div class="settings-section-title">' + t('settings.usageTitle') + '</div><div id="stUsageContent" style="color:var(--text3)">' + t('common.loading') + '</div></div>';
  try {
    const data = await (await authFetch('/api/settings/usage')).json();
    const el = document.getElementById('stUsageContent'); if (!el) return;
    let h = '<div class="stats-grid">';
    h += statCard(data.totalMessages, t('settings.totalMessages'));
    h += statCard(data.agentCount, t('settings.agentCount'));
    h += statCard(data.groupCount, t('settings.groupCount'));
    h += statCard(data.modelCount, t('settings.modelCountLabel'));
    h += statCard(data.postCount, t('settings.postCount'));
    h += statCard(data.kbFileCount, t('settings.kbFileCount'));
    h += '</div>';
    const stats = data.agentStats || {};
    const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 15);
    if (sorted.length) {
      const max = sorted[0][1] || 1;
      h += '<div class="settings-section-title" style="margin-top:20px">' + t('settings.agentRanking') + '</div><div class="stats-bar-chart">';
      sorted.forEach(([aid, cnt]) => { const ag = AGENTS.find(a => a.id === aid); const pct = Math.round((cnt / max) * 100); h += '<div class="stats-bar-row"><div class="stats-bar-label">' + escH(ag?.name || aid) + '</div><div class="stats-bar-track"><div class="stats-bar-fill" style="width:' + pct + '%"></div></div><div class="stats-bar-count">' + cnt + '</div></div>'; });
      h += '</div>';
    }
    el.innerHTML = h;
  } catch (e) { const el = document.getElementById('stUsageContent'); if (el) el.innerHTML = t('common.loadFail'); }
}

function statCard(num, label) { return '<div class="stat-card"><div class="stat-card-number">' + (num || 0) + '</div><div class="stat-card-label">' + label + '</div></div>'; }

async function renderSettingsAbout(ct) {
  ct.innerHTML = '<div class="settings-section"><div class="settings-section-title">' + t('settings.aboutTitle') + '</div><div id="stAboutContent" style="color:var(--text3)">' + t('common.loading') + '</div></div>';
  try {
    const data = await (await authFetch('/api/settings/about')).json();
    const el = document.getElementById('stAboutContent'); if (!el) return;
    const upSec = Math.floor(data.uptime || 0); const upH = Math.floor(upSec / 3600); const upM = Math.floor((upSec % 3600) / 60);
    const llmModeLabel = data.llmMode === 'gateway' ? 'Gateway' : (t('settings.directMode') || 'Direct LLM');
    const connClass = data.gatewayConnected ? 'online' : 'offline';
    const connText = data.gatewayConnected ? t('settings.llmConnected') : t('settings.llmDisconnected');
    el.innerHTML = aboutRow(t('settings.appName'), escH(data.appName)) + aboutRow(t('settings.version'), 'v' + data.version) + aboutRow(t('settings.nodeVersion'), data.nodeVersion) + aboutRow(t('settings.platform'), data.platform + ' (' + data.arch + ')') + aboutRow(t('settings.dataDir'), '<span style="font-family:monospace;font-size:12px">' + escH(data.dataDir) + '</span>') + aboutRow(t('settings.agentCountLabel'), data.agentCount) + aboutRow(t('settings.groupCountLabel'), data.groupCount) + aboutRow(t('settings.modelCountAbout'), data.modelCount) + aboutRow(t('settings.llmModeLabel') || 'LLM Mode', llmModeLabel) + aboutRow(t('settings.llmStatusLabel') || 'LLM Status', '<span class="about-badge ' + connClass + '">' + connText + '</span>') + aboutRow(t('settings.uptime'), t('settings.uptimeFormat', {h: upH, m: upM}));
  } catch (e) { const el = document.getElementById('stAboutContent'); if (el) el.innerHTML = t('common.loadFail'); }
}

function aboutRow(label, value) { return '<div class="about-row"><div class="about-label">' + label + '</div><div class="about-value">' + value + '</div></div>'; }

async function renderSettingsMetrics(ct) {
  ct.innerHTML = '<div class="settings-section"><div class="settings-section-title">' + t('settings.metricsTitle') + '</div><div id="stMetricsContent" style="display:flex;flex-direction:column;gap:12px">' +
    '<div class="empty-hint">' + t('common.loading') + '</div></div></div>';
  try {
    const data = await (await authFetch('/api/metrics')).json();
    const el = document.getElementById('stMetricsContent');
    if (!el) return;
    const allMetrics = data.metrics || {};
    if (!Object.keys(allMetrics).length) { el.innerHTML = '<div class="empty-hint">' + t('common.noData') + '</div>'; return; }
    el.innerHTML = AGENTS.map(ag => {
      const m = allMetrics[ag.id] || {};
      const avgR = m.ratings?.length ? (m.ratings.reduce((s, r) => s + r.score, 0) / m.ratings.length).toFixed(1) : '-';
      const sagid = escJs(ag.id);
      return `<div class="metric-card"><div class="metric-card-header"><div class="metric-card-avatar" onclick="openProfile('${sagid}')" style="background:${ag.color}">${ag.emoji}</div><div class="metric-card-name">${esc(ag.name)}</div><div class="metric-card-rating">&#9733; ${avgR}</div></div><div class="metric-grid"><div class="metric-stat"><div class="metric-stat-value">${m.messages||0}</div><div class="metric-stat-label">${t('common.metrics.messages')}</div></div><div class="metric-stat"><div class="metric-stat-value">${m.tasks||0}</div><div class="metric-stat-label">${t('common.metrics.tasks')}</div></div><div class="metric-stat"><div class="metric-stat-value">${m.posts||0}</div><div class="metric-stat-label">${t('common.metrics.posts')}</div></div><div class="metric-stat"><div class="metric-stat-value">${m.reviews||0}</div><div class="metric-stat-label">${t('common.metrics.reviews')}</div></div></div></div>`;
    }).join('');
  } catch { const el = document.getElementById('stMetricsContent'); if (el) el.innerHTML = '<div class="empty-hint">' + t('common.loadFail') + '</div>'; }
}
