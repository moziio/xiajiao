/* OpenClaw IM — Settings: Provider & Model Management (Layer 2) */
let settingsProviders = {}, settingsModelsList = [];

const API_PROTOCOL_MAP = {
  'openai-completions': 'OpenAI Chat Completions (/v1/chat/completions) — 通用兼容协议，适用于 OpenAI、DashScope、DeepSeek、Moonshot 等',
  'openai-responses': 'OpenAI Responses API (/v1/responses) — 新版 OpenAI 协议，支持工具调用和结构化输出',
  'anthropic-messages': 'Anthropic Messages (/v1/messages) — Claude 系列模型专用协议',
  'google-generative-ai': 'Google Generative AI — Gemini 系列模型专用协议',
  'ollama': 'Ollama 本地推理 — 本地运行开源模型'
};
function getApiProtocolDesc(api) { return API_PROTOCOL_MAP[api] || api; }

async function renderSettingsModels(ct) {
  ct.innerHTML = '<div class="settings-section"><div class="settings-section-title">' + t('settings.providerTitle') + '</div><div class="settings-section-desc">' + t('settings.providerDesc') + '</div><div id="stProviderList"></div>' +
    '<button class="settings-btn settings-btn-outline" onclick="toggleAddProvider()" style="margin-top:8px">' + t('settings.addProvider') + '</button><div id="stAddProviderForm" class="hidden" style="margin-top:12px"></div></div>' +
    '<div class="settings-section"><div class="settings-section-title">' + t('settings.modelsTitle') + '</div><div id="stModelList"></div>' +
    '<button class="settings-btn settings-btn-outline" onclick="toggleAddModel()" style="margin-top:8px">' + t('settings.addModel') + '</button><div id="stAddModelForm" class="hidden" style="margin-top:12px"></div></div>';
  await loadSettingsProviders();
}

async function loadSettingsProviders() {
  try { const r = await (await authFetch('/api/settings/providers')).json(); settingsProviders = r.providers || {}; settingsModelsList = r.models || []; } catch { settingsProviders = {}; settingsModelsList = []; }
  renderProviderList(); renderModelList();
}

function renderProviderList() {
  const el = document.getElementById('stProviderList'); if (!el) return;
  const pids = Object.keys(settingsProviders);
  if (!pids.length) { el.innerHTML = '<div style="color:var(--text3);font-size:13px;padding:8px 0">' + t('common.noData') + '</div>'; return; }
  el.innerHTML = pids.map(pid => {
    const p = settingsProviders[pid]; const mc = settingsModelsList.filter(m => m.provider === pid).length;
    const spid = escJs(pid);
    return '<div class="provider-card" id="prov-' + escH(pid) + '"><div class="provider-card-header"><div><div class="provider-card-name">' + escH(pid) + ' <span class="provider-model-count">' + t('settings.modelCount', {count: mc}) + '</span></div>' +
      '<div class="provider-card-url">' + escH(p.baseUrl) + '</div>' +
      '<div style="margin-top:3px"><span class="provider-api-badge" data-api="' + escH(p.api || 'openai-completions') + '" title="' + escH(getApiProtocolDesc(p.api || 'openai-completions')) + '">' + esc(p.api || 'openai-completions') + '</span></div>' +
      '<div class="provider-card-key">API Key: ' + maskKey(p.apiKey) + '</div></div>' +
      '<div class="provider-card-actions"><button class="settings-btn settings-btn-outline" onclick="quickAddModelForProvider(\'' + spid + '\')" title="' + t('settings.addModel') + '">+</button>' +
      '<button class="settings-btn settings-btn-outline" onclick="refreshProviderModels(\'' + spid + '\')" title="' + t('settings.refreshModels') + '">&#x1F504;</button>' +
      '<button class="settings-btn settings-btn-outline" onclick="editProvider(\'' + spid + '\')">' + t('settings.editProvider') + '</button>' +
      '<button class="settings-btn settings-btn-danger" onclick="deleteProvider(\'' + spid + '\')">' + t('settings.deleteProvider') + '</button></div></div>' +
      '<div id="provQuickAdd-' + escH(pid) + '" class="hidden"></div>' +
      '<div id="provEdit-' + escH(pid) + '"></div></div>';
  }).join('');
}

function editProvider(pid) {
  const el = document.getElementById('provEdit-' + pid); if (!el) return;
  const p = settingsProviders[pid] || {};
  if (el.innerHTML) { el.innerHTML = ''; return; }
  const curApi = p.api || 'openai-completions';
  const apiOpts = ['openai-completions','openai-responses','anthropic-messages','google-generative-ai','ollama'].map(a => '<option value="' + a + '"' + (a === curApi ? ' selected' : '') + '>' + a + '</option>').join('');
  el.innerHTML = '<div class="add-form" style="margin-top:10px;border:none;padding:8px 0"><div class="add-form-row">' +
    '<input class="settings-input" id="epUrl-' + pid + '" value="' + escH(p.baseUrl) + '" placeholder="' + t('settings.baseUrlPlaceholder') + '" autocomplete="off">' +
    '<input class="settings-input" id="epKey-' + pid + '" value="' + escH(p.apiKey) + '" placeholder="' + t('settings.apiKeyPlaceholder') + '" type="password" autocomplete="new-password"></div>' +
    '<div class="add-form-row"><select class="settings-select" id="epApi-' + pid + '" style="min-width:170px">' + apiOpts + '</select>' +
    '<button class="settings-btn settings-btn-primary" onclick="saveProviderEdit(\'' + escJs(pid) + '\')">' + t('common.save') + '</button>' +
    '<button class="settings-btn settings-btn-outline" onclick="editProvider(\'' + escJs(pid) + '\')">' + t('common.cancel') + '</button></div></div>';
}

async function saveProviderEdit(pid) {
  const url = document.getElementById('epUrl-' + pid)?.value; const key = document.getElementById('epKey-' + pid)?.value; const api = document.getElementById('epApi-' + pid)?.value;
  try { await authFetch('/api/settings/providers/' + pid, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ baseUrl: url, apiKey: key, api }) }); showToastMsg(t('settings.saved')); await loadSettingsProviders(); loadModels(); } catch (e) { showToastMsg(t('common.fail'), 'error'); }
}

async function deleteProvider(pid) {
  if (!await appConfirm(t('settings.deleteProviderConfirm'))) return;
  try { await authFetch('/api/settings/providers/' + pid, { method: 'DELETE' }); showToastMsg(t('settings.saved')); await loadSettingsProviders(); loadModels(); } catch (e) { showToastMsg(t('common.fail'), 'error'); }
}

const PROVIDER_PRESETS = [
  { id: 'dashscope', name: '阿里 通义千问', url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', api: 'openai-completions' },
  { id: 'deepseek', name: 'DeepSeek', url: 'https://api.deepseek.com/v1', api: 'openai-completions' },
  { id: 'moonshot', name: '月之暗面 Kimi', url: 'https://api.moonshot.cn/v1', api: 'openai-completions' },
  { id: 'zhipu', name: '智谱 AI', url: 'https://open.bigmodel.cn/api/paas/v4', api: 'openai-completions' },
  { id: 'baichuan', name: '百川智能', url: 'https://api.baichuan-ai.com/v1', api: 'openai-completions' },
  { id: 'stepfun', name: '阶跃星辰', url: 'https://api.stepfun.com/v1', api: 'openai-completions' },
  { id: 'siliconflow', name: '硅基流动', url: 'https://api.siliconflow.cn/v1', api: 'openai-completions' },
  { id: 'doubao', name: '字节 豆包', url: 'https://ark.cn-beijing.volces.com/api/v3', api: 'openai-completions' },
  { id: 'spark', name: '讯飞星火', url: 'https://spark-api-open.xf-yun.com/v1', api: 'openai-completions' },
  { id: 'openai', name: 'OpenAI', url: 'https://api.openai.com/v1', api: 'openai-completions' },
  { id: 'anthropic', name: 'Anthropic Claude', url: 'https://api.anthropic.com', api: 'anthropic-messages' },
  { id: 'google', name: 'Google Gemini', url: 'https://generativelanguage.googleapis.com/v1beta', api: 'google-generative-ai' },
  { id: 'ollama', name: 'Ollama 本地', url: 'http://localhost:11434/v1', api: 'ollama' },
];

function applyPreset(idx) {
  const p = PROVIDER_PRESETS[idx]; if (!p) return;
  const eId = document.getElementById('apId'), eUrl = document.getElementById('apUrl'), eApi = document.getElementById('apApi');
  if (eId) eId.value = p.id;
  if (eUrl) eUrl.value = p.url;
  if (eApi) eApi.value = p.api;
}

function toggleAddProvider() {
  const el = document.getElementById('stAddProviderForm'); if (!el) return;
  el.classList.toggle('hidden');
  if (!el.classList.contains('hidden')) {
    const apiOpts = ['openai-completions','openai-responses','anthropic-messages','google-generative-ai','ollama'].map(a => '<option value="' + a + '"' + (a === 'openai-completions' ? ' selected' : '') + '>' + a + '</option>').join('');
    const presetBtns = PROVIDER_PRESETS.map((p, i) => '<button class="preset-tag" onclick="applyPreset(' + i + ')" title="' + escH(p.url) + '">' + escH(p.name) + '</button>').join('');
    el.innerHTML = '<div class="add-form"><div class="add-form-header"><div class="add-form-title">' + t('settings.addProvider') + '</div>' +
      '<button class="add-form-close" onclick="toggleAddProvider()" title="' + t('common.cancel') + '">&times;</button></div>' +
      '<div class="preset-tags">' + presetBtns + '</div>' +
      '<div class="add-form-row"><div class="form-field"><label class="form-label">' + t('settings.providerIdLabel') + '</label><input class="settings-input" id="apId" placeholder="' + t('settings.providerIdPlaceholder') + '" autocomplete="off"></div>' +
      '<div class="form-field"><label class="form-label">' + t('settings.baseUrlLabel') + '</label><input class="settings-input" id="apUrl" placeholder="' + t('settings.baseUrlPlaceholder') + '" autocomplete="off"></div></div>' +
      '<div class="add-form-row"><div class="form-field"><label class="form-label">' + t('settings.apiKeyLabel') + '</label><input class="settings-input" id="apKey" placeholder="' + t('settings.apiKeyPlaceholder') + '" type="password" autocomplete="new-password"></div>' +
      '<div class="form-field"><label class="form-label">' + t('settings.apiTypeLabel') + '</label><select class="settings-select" id="apApi" style="width:100%">' + apiOpts + '</select></div></div>' +
      '<div class="add-form-row" style="gap:8px"><button class="settings-btn settings-btn-primary" onclick="submitAddProvider()" style="flex:1">' + t('settings.discoverAndAdd') + '</button>' +
      '<button class="settings-btn settings-btn-outline" onclick="toggleAddProvider()">' + t('common.cancel') + '</button></div>' +
      '<div id="apDiscoverResult"></div></div>';
  }
}

async function submitAddProvider() {
  const id = document.getElementById('apId')?.value?.trim(); const baseUrl = document.getElementById('apUrl')?.value?.trim(); const apiKey = document.getElementById('apKey')?.value?.trim(); const api = document.getElementById('apApi')?.value || 'openai-completions';
  if (!id || !baseUrl) { showToastMsg(t('settings.fillRequired'), 'error'); return; }
  const resultEl = document.getElementById('apDiscoverResult');

  try {
    await authFetch('/api/settings/providers', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id, baseUrl, apiKey, api }) });
  } catch (e) { showToastMsg(t('common.fail') + ': ' + e.message, 'error'); return; }

  resultEl.innerHTML = '<div style="padding:12px;color:var(--text3);font-size:13px">' + t('settings.discovering') + '</div>';
  try {
    const r = await (await authFetch('/api/settings/providers/discover', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ baseUrl, apiKey }) })).json();
    const models = (r.error ? [] : r.models) || [];
    if (!models.length) {
      showToastMsg(t('settings.providerSavedNoDiscover'));
      document.getElementById('stAddProviderForm').classList.add('hidden');
      await loadSettingsProviders(); loadModels();
      return;
    }
    window._apDiscoverData = { id, baseUrl, apiKey, api, models, alreadySaved: true };
    let h = '<div class="discover-model-list"><div class="discover-header"><span>' + t('settings.foundModels', { count: models.length }) + '</span>' +
      '<label class="discover-check-all"><input type="checkbox" id="apCheckAll" onchange="toggleDiscoverAll(this.checked)" checked> ' + t('settings.selectAll') + '</label></div>' +
      '<div style="max-height:280px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:4px">';
    models.forEach((m, i) => {
      h += '<label class="discover-model-item"><input type="checkbox" class="ap-model-check" data-idx="' + i + '" checked>' +
        '<span class="discover-model-name">' + escH(m.name || m.id) + '</span>' +
        '<span class="discover-model-id">' + escH(m.id) + '</span></label>';
    });
    h += '</div><button class="settings-btn settings-btn-primary" onclick="confirmAddProvider()" style="margin-top:10px;width:100%">' + t('settings.confirmAdd') + '</button></div>';
    resultEl.innerHTML = h;
  } catch (e) {
    showToastMsg(t('settings.providerSavedNoDiscover'));
    document.getElementById('stAddProviderForm').classList.add('hidden');
    await loadSettingsProviders(); loadModels();
  }
}

function toggleDiscoverAll(checked) { document.querySelectorAll('.ap-model-check').forEach(cb => cb.checked = checked); }

async function confirmAddProvider() {
  const d = window._apDiscoverData; if (!d) return;
  try {
    const checks = document.querySelectorAll('.ap-model-check:checked');
    for (const cb of checks) { const m = d.models[parseInt(cb.dataset.idx)]; if (!m) continue; const modelId = d.id + '/' + m.id; try { await authFetch('/api/settings/models', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: modelId, name: m.name || m.id, provider: d.id, input: ['text'], contextWindow: m.contextWindow || 128000, maxTokens: m.maxTokens || 8192 }) }); } catch {} }
    showToastMsg(t('settings.providerAdded', { count: checks.length }));
    document.getElementById('stAddProviderForm').classList.add('hidden');
    window._apDiscoverData = null;
    await loadSettingsProviders(); loadModels();
  } catch (e) { showToastMsg(t('common.fail'), 'error'); }
}

async function refreshProviderModels(pid) {
  const p = settingsProviders[pid]; if (!p) return;
  showToastMsg(t('settings.discovering'));
  try {
    const r = await (await authFetch('/api/settings/providers/discover', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ baseUrl: p.baseUrl, apiKey: p.apiKey }) })).json();
    if (r.error || !(r.models || []).length) {
      showToastMsg(t('settings.discoverFailTip'), 'warn');
      quickAddModelForProvider(pid);
      return;
    }
    const models = r.models;
    const existing = new Set(settingsModelsList.filter(m => m.provider === pid).map(m => m.id));
    let added = 0;
    for (const m of models) { const modelId = pid + '/' + m.id; if (existing.has(modelId)) continue; try { await authFetch('/api/settings/models', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: modelId, name: m.name || m.id, provider: pid, input: ['text'], contextWindow: m.contextWindow || 128000, maxTokens: m.maxTokens || 8192 }) }); added++; } catch {} }
    showToastMsg(t('settings.modelsRefreshed', { added, total: models.length }));
    await loadSettingsProviders(); loadModels();
  } catch (e) { showToastMsg(t('settings.discoverFailTip'), 'warn'); quickAddModelForProvider(pid); }
}

function renderModelList() {
  const el = document.getElementById('stModelList'); if (!el) return;
  if (!settingsModelsList.length) { el.innerHTML = '<div style="color:var(--text3);font-size:13px;padding:8px 0">' + t('common.noData') + '</div>'; return; }
  const byProv = {}; settingsModelsList.forEach(m => { (byProv[m.provider] = byProv[m.provider] || []).push(m); });
  let h = '';
  for (const [pid, models] of Object.entries(byProv)) {
    h += '<div style="margin-bottom:16px"><div style="font-size:13px;color:var(--text3);margin-bottom:6px;font-weight:600">' + escH(pid) + '</div>';
    models.forEach(m => {
      const cat = getModelCategory(m);
      const catInfo = MODEL_CATEGORIES[cat];
      h += '<div class="model-row"><div class="model-row-name">' + escH(m.name) + '</div>' +
        '<span class="model-row-cap" title="' + escH(catInfo ? catInfo.zhLabel : cat) + '">' + (catInfo ? catInfo.icon : '') + '</span>' +
        '<div class="model-row-id">' + escH(m.id) + '</div>' +
        '<div class="model-row-caps">' + (m.input || ['text']).map(c => '<span class="model-row-cap">' + c + '</span>').join('') + '</div>' +
        '<button class="settings-btn settings-btn-danger" style="padding:4px 10px;font-size:11px" onclick="deleteSettingsModel(\'' + escJs(m.id) + '\')">&times;</button></div>';
    });
    h += '</div>';
  }
  el.innerHTML = h;
}

function quickAddModelForProvider(pid) {
  const el = document.getElementById('provQuickAdd-' + pid); if (!el) return;
  if (!el.classList.contains('hidden')) { el.classList.add('hidden'); el.innerHTML = ''; return; }
  el.classList.remove('hidden');
  el.innerHTML = '<div class="add-form" style="margin-top:8px;border:none;padding:8px 0"><div class="add-form-row">' +
    '<input class="settings-input" id="qaId-' + pid + '" placeholder="' + t('settings.modelIdPlaceholder') + ' (e.g. qwen-max)">' +
    '<input class="settings-input" id="qaName-' + pid + '" placeholder="' + t('settings.modelNamePlaceholder') + '">' +
    '<button class="settings-btn settings-btn-primary" onclick="submitQuickAddModel(\'' + escJs(pid) + '\')" style="white-space:nowrap">' + t('settings.addModel') + '</button></div></div>';
}

async function submitQuickAddModel(pid) {
  const rawId = document.getElementById('qaId-' + pid)?.value?.trim();
  const name = document.getElementById('qaName-' + pid)?.value?.trim();
  if (!rawId) { showToastMsg(t('settings.fillRequired'), 'error'); return; }
  const id = rawId.includes('/') ? rawId : pid + '/' + rawId;
  try {
    await authFetch('/api/settings/models', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id, name: name || rawId, provider: pid, input: ['text'], contextWindow: 128000, maxTokens: 8192 }) });
    showToastMsg(t('settings.saved'));
    const el = document.getElementById('provQuickAdd-' + pid);
    if (el) { el.classList.add('hidden'); el.innerHTML = ''; }
    await loadSettingsProviders(); loadModels();
  } catch (e) { showToastMsg(t('common.fail'), 'error'); }
}

function toggleAddModel() {
  const el = document.getElementById('stAddModelForm'); if (!el) return;
  el.classList.toggle('hidden');
  if (!el.classList.contains('hidden')) {
    const provOpts = Object.keys(settingsProviders).map(p => '<option value="' + escH(p) + '">' + escH(p) + '</option>').join('');
    el.innerHTML = '<div class="add-form"><div class="add-form-title">' + t('settings.addModel') + '</div><div class="add-form-row"><select class="settings-select" id="amProv" style="min-width:120px"><option value="">' + t('settings.selectProvider') + '</option>' + provOpts + '</select><input class="settings-input" id="amId" placeholder="' + t('settings.modelIdPlaceholder') + '"></div><div class="add-form-row"><input class="settings-input" id="amName" placeholder="' + t('settings.modelNamePlaceholder') + '"><input class="settings-input" id="amCtx" placeholder="' + t('settings.contextWindow') + '" type="number" value="128000" style="width:120px"><button class="settings-btn settings-btn-primary" onclick="submitAddModel()">' + t('settings.addModel') + '</button></div></div>';
  }
}

async function submitAddModel() {
  const provider = document.getElementById('amProv')?.value; const rawId = document.getElementById('amId')?.value?.trim(); const name = document.getElementById('amName')?.value?.trim(); const ctx = parseInt(document.getElementById('amCtx')?.value) || 128000;
  if (!provider || !rawId) { showToastMsg(t('common.fail'), 'error'); return; }
  const id = rawId.includes('/') ? rawId : provider + '/' + rawId;
  try { await authFetch('/api/settings/models', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id, name: name || rawId, provider, contextWindow: ctx, maxTokens: 4096 }) }); showToastMsg(t('settings.saved')); document.getElementById('stAddModelForm').classList.add('hidden'); await loadSettingsProviders(); loadModels(); } catch (e) { showToastMsg(t('common.fail'), 'error'); }
}

async function deleteSettingsModel(mid) {
  if (!await appConfirm(t('settings.deleteModelConfirm'))) return;
  try { await authFetch('/api/settings/models/' + encodeURIComponent(mid), { method: 'DELETE' }); showToastMsg(t('settings.saved')); await loadSettingsProviders(); loadModels(); } catch (e) { showToastMsg(t('common.fail'), 'error'); }
}

// ── Tool Models Settings ──
let _toolModels = {};

async function renderSettingsTools(ct) {
  ct.innerHTML =
    '<div class="settings-section"><div class="settings-section-title">🔍 互联网搜索</div>' +
    '<div class="settings-section-desc">默认使用"自动"模式（DuckDuckGo + 模型总结），无需任何配置。也可切换为其他搜索引擎。</div>' +
    '<div id="stWebSearchContent"><div style="color:var(--text3);padding:12px">' + t('common.loading') + '</div></div></div>' +
    '<div class="settings-section" style="margin-top:20px"><div class="settings-section-title">' + t('settings.toolModelsTitle') + '</div>' +
    '<div class="settings-section-desc">' + t('settings.toolModelsDesc') + '</div>' +
    '<div id="stToolModelsContent"><div style="color:var(--text3);padding:12px">' + t('common.loading') + '</div></div></div>' +
    '<div class="settings-section" style="margin-top:20px"><div class="settings-section-title">' + t('settings.ragTitle') + '</div>' +
    '<div class="settings-section-desc">' + t('settings.ragDesc') + '</div>' +
    '<div id="stRagContent"><div style="color:var(--text3);padding:12px">' + t('common.loading') + '</div></div></div>';
  _loadWebSearchSettings();
  try {
    const r = await (await authFetch('/api/settings/tool-models')).json();
    _toolModels = r.toolModels || {};
    await loadSettingsProviders();
    _renderToolModelsForm();
  } catch (e) { document.getElementById('stToolModelsContent').innerHTML = t('common.loadFail'); }
  _loadRagSettings();
}

const _WS_PROVIDERS = [
  { id: 'auto',       label: '自动（推荐）',    hint: '免费 · DuckDuckGo 搜索 + 当前模型总结，无需任何配置', needsKey: false, needsBase: false, needsBrave: false },
  { id: 'duckduckgo', label: 'DuckDuckGo',      hint: '免费 · 无需 API Key，仅返回搜索结果（无总结）', needsKey: false, needsBase: false, needsBrave: false },
  { id: 'kimi',       label: 'Kimi（月之暗面）', hint: '国内友好 · 中文搜索优秀 · <a href="https://platform.moonshot.cn" target="_blank" style="color:var(--cyan)">platform.moonshot.cn</a>', needsKey: true, needsBase: true, needsBrave: false },
  { id: 'brave',      label: 'Brave Search',     hint: '免费额度 · <a href="https://brave.com/search/api" target="_blank" style="color:var(--cyan)">brave.com/search/api</a>', needsKey: true, needsBase: false, needsBrave: true },
  { id: 'perplexity', label: 'Perplexity',       hint: '高质量 · 支持 OpenRouter 中转 · <a href="https://perplexity.ai" target="_blank" style="color:var(--cyan)">perplexity.ai</a>', needsKey: true, needsBase: true, needsBrave: false },
  { id: 'grok',       label: 'Grok (xAI)',       hint: '实时搜索 · 带引用 · <a href="https://x.ai" target="_blank" style="color:var(--cyan)">x.ai</a>', needsKey: true, needsBase: false, needsBrave: false },
];
let _wsCfg = {};

async function _loadWebSearchSettings() {
  const el = document.getElementById('stWebSearchContent'); if (!el) return;
  try {
    _wsCfg = await (await authFetch('/api/settings/web-search')).json();
    _renderWebSearchForm(el);
  } catch (e) { el.innerHTML = t('common.loadFail'); }
}

function _renderWebSearchForm(el) {
  const cfg = _wsCfg;
  const curProv = cfg.provider || 'auto';
  const provMeta = _WS_PROVIDERS.find(p => p.id === curProv) || _WS_PROVIDERS[0];

  let h = '<div style="display:flex;flex-direction:column;gap:14px">';

  const opts = _WS_PROVIDERS.map(p =>
    '<option value="' + p.id + '"' + (p.id === curProv ? ' selected' : '') + '>' + p.label + '</option>'
  ).join('');
  h += '<div class="settings-row"><div><div class="settings-label">搜索服务商</div>' +
    '<div style="font-size:11px;color:var(--text3)" id="stWsHint">' + provMeta.hint + '</div></div>' +
    '<div class="settings-value"><select class="settings-select" id="stWsProvider" onchange="_onWsProviderChange()">' + opts + '</select></div></div>';

  h += '<div id="stWsDynFields">';
  h += _renderWsDynFields(provMeta, cfg);
  h += '</div>';

  h += '<div style="display:flex;gap:8px;justify-content:flex-end">' +
    '<button class="settings-btn settings-btn-primary" onclick="_saveWebSearch()">保存</button></div>';
  h += '</div>';
  el.innerHTML = h;
}

function _renderWsDynFields(provMeta, cfg) {
  let h = '';
  if (provMeta.needsKey) {
    h += '<div class="settings-row"><div><div class="settings-label">API Key</div></div>' +
      '<div class="settings-value"><input class="settings-input" id="stWsApiKey" type="password" placeholder="' +
      (cfg.hasKey ? cfg.apiKey : '填入 API Key') + '" style="width:260px"></div></div>';
  }
  if (provMeta.needsBase) {
    const basePlaceholder = provMeta.id === 'kimi' ? 'https://api.moonshot.cn/v1' :
      provMeta.id === 'perplexity' ? 'https://api.perplexity.ai 或 OpenRouter 地址' : '';
    h += '<div class="settings-row"><div><div class="settings-label">Base URL（可选）</div>' +
      '<div style="font-size:11px;color:var(--text3)">留空使用默认地址</div></div>' +
      '<div class="settings-value"><input class="settings-input" id="stWsBaseUrl" value="' +
      escH(cfg.baseUrl || '') + '" placeholder="' + escH(basePlaceholder) + '" style="width:260px"></div></div>';
  }
  if (provMeta.needsBrave) {
    h += '<div class="settings-row"><div><div class="settings-label">搜索模式</div></div>' +
      '<div class="settings-value"><select class="settings-select" id="stWsBraveMode">' +
      '<option value="web"' + ((cfg.braveMode || 'web') === 'web' ? ' selected' : '') + '>Web Search</option>' +
      '<option value="llm-context"' + (cfg.braveMode === 'llm-context' ? ' selected' : '') + '>LLM Context</option>' +
      '</select></div></div>';
  }
  return h;
}

function _onWsProviderChange() {
  const sel = document.getElementById('stWsProvider');
  if (!sel) return;
  const provMeta = _WS_PROVIDERS.find(p => p.id === sel.value) || _WS_PROVIDERS[0];
  const hintEl = document.getElementById('stWsHint');
  if (hintEl) hintEl.innerHTML = provMeta.hint;
  const dynEl = document.getElementById('stWsDynFields');
  if (dynEl) dynEl.innerHTML = _renderWsDynFields(provMeta, _wsCfg);
}

async function _saveWebSearch() {
  const provider = document.getElementById('stWsProvider')?.value || 'auto';
  const apiKey = document.getElementById('stWsApiKey')?.value?.trim();
  const baseUrl = document.getElementById('stWsBaseUrl')?.value?.trim();
  const braveMode = document.getElementById('stWsBraveMode')?.value;
  const body = { provider };
  if (apiKey) body.apiKey = apiKey;
  if (baseUrl !== undefined && baseUrl !== null) body.baseUrl = baseUrl || '';
  if (braveMode) body.braveMode = braveMode;
  try {
    await authFetch('/api/settings/web-search', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    showToastMsg(t('settings.saved'));
    _loadWebSearchSettings();
  } catch (e) { showToastMsg(t('common.fail'), 'error'); }
}

async function _loadRagSettings() {
  const el = document.getElementById('stRagContent'); if (!el) return;
  try {
    const r = await (await authFetch('/api/settings/rag')).json();
    _renderRagForm(el, r);
  } catch (e) { el.innerHTML = t('common.loadFail'); }
}

function _renderRagForm(el, cfg) {
  const provOpts = Object.keys(settingsProviders || {}).map(p =>
    '<option value="' + escH(p) + '"' + (p === cfg.embeddingProvider ? ' selected' : '') + '>' + escH(p) + '</option>'
  ).join('');

  let h = '<div style="display:flex;flex-direction:column;gap:12px">';

  h += '<div class="settings-row"><div><div class="settings-label">' + t('settings.ragEnabled') + '</div></div>' +
    '<div class="settings-value"><label style="display:flex;align-items:center;gap:6px;cursor:pointer">' +
    '<input type="checkbox" id="stRagEnabled"' + (cfg.enabled ? ' checked' : '') + '> ' + (cfg.enabled ? t('settings.ragOn') : t('settings.ragOff')) +
    '</label></div></div>';

  h += '<div class="settings-row"><div><div class="settings-label">' + t('settings.ragProvider') + '</div>' +
    '<div style="font-size:11px;color:var(--text3)">' + t('settings.ragProviderHint') + '</div></div>' +
    '<div class="settings-value"><select class="settings-select" id="stRagProvider"><option value="">' + t('settings.ragProviderAuto') + '</option>' + provOpts + '</select></div></div>';

  const keyPlaceholder = cfg.hasCustomKey ? cfg.embeddingApiKey : t('settings.ragApiKeyPlaceholder');
  h += '<div class="settings-row" style="flex-direction:column;align-items:stretch;gap:6px">' +
    '<div><div class="settings-label">' + t('settings.ragApiKey') + '</div>' +
    '<div style="font-size:11px;color:var(--text3)">' + t('settings.ragApiKeyHint') + '</div></div>' +
    '<input class="settings-input" id="stRagApiKey" type="password" placeholder="' + escH(keyPlaceholder) + '" style="width:100%;box-sizing:border-box">' +
    '</div>';

  h += '<div class="settings-row"><div><div class="settings-label">' + t('settings.ragModel') + '</div></div>' +
    '<div class="settings-value"><input class="settings-input" id="stRagModel" value="' + escH(cfg.embeddingModel) + '" style="width:200px"></div></div>';

  h += '<div class="settings-row" style="flex-direction:column;align-items:stretch;gap:6px">' +
    '<div><div class="settings-label">' + t('settings.ragBaseUrl') + '</div>' +
    '<div style="font-size:11px;color:var(--text3)">' + t('settings.ragBaseUrlHint') + '</div></div>' +
    '<input class="settings-input" id="stRagBaseUrl" value="' + escH(cfg.embeddingBaseUrl) + '" placeholder="' + t('settings.ragBaseUrlPlaceholder') + '" style="width:100%;box-sizing:border-box">' +
    '</div>';

  h += '<button class="settings-btn settings-btn-primary" onclick="saveRagSettings()" style="align-self:flex-start;margin-top:4px">' + t('common.save') + '</button>';

  h += '<button class="settings-btn" onclick="testRagEmbedding()" style="align-self:flex-start;margin-top:2px" id="stRagTestBtn">' + t('settings.ragTestBtn') + '</button>';
  h += '<div id="stRagTestResult" style="font-size:12px;margin-top:4px"></div>';

  h += '</div>';
  el.innerHTML = h;
}

async function saveRagSettings() {
  const body = {};
  body.enabled = document.getElementById('stRagEnabled')?.checked ?? true;
  body.embeddingProvider = document.getElementById('stRagProvider')?.value || '';
  const apiKeyInput = document.getElementById('stRagApiKey')?.value?.trim();
  if (apiKeyInput) body.embeddingApiKey = apiKeyInput;
  body.embeddingModel = document.getElementById('stRagModel')?.value?.trim() || 'text-embedding-v3';
  body.embeddingBaseUrl = document.getElementById('stRagBaseUrl')?.value?.trim() || '';
  try {
    await authFetch('/api/settings/rag', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    showToastMsg(t('settings.saved'));
  } catch (e) { showToastMsg(t('common.fail') + ': ' + e.message, 'error'); }
}

async function testRagEmbedding() {
  const btn = document.getElementById('stRagTestBtn');
  const result = document.getElementById('stRagTestResult');
  if (!btn || !result) return;
  btn.disabled = true; btn.textContent = t('settings.ragTesting');
  result.innerHTML = '';
  try {
    const r = await (await authFetch('/api/settings/rag/test', { method: 'POST' })).json();
    if (r.ok) {
      result.innerHTML = '<span style="color:var(--green)">' + t('settings.ragTestOk') + ' (dim=' + (r.dimension || '?') + ', ' + r.latency + 'ms)</span>';
    } else {
      result.innerHTML = '<span style="color:var(--red)">' + t('settings.ragTestFail') + ': ' + escH(r.error || '') + '</span>';
    }
  } catch (e) {
    result.innerHTML = '<span style="color:var(--red)">' + t('settings.ragTestFail') + ': ' + escH(e.message) + '</span>';
  }
  btn.disabled = false; btn.textContent = t('settings.ragTestBtn');
}

function _getImgGenModels() {
  return (settingsModelsList || []).filter(m => {
    if (m.output && m.output.includes('image')) return true;
    if (m.api && (m.api === 'dashscope-image' || m.api === 'openai-image')) return true;
    return false;
  });
}

let _toolImgGenSS = null;

function _renderToolModelsForm() {
  const el = document.getElementById('stToolModelsContent'); if (!el) return;
  const imgModels = _getImgGenModels();

  let h = '<div class="settings-row" style="flex-direction:column;align-items:stretch;gap:8px">' +
    '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:20px">\uD83C\uDFA8</span>' +
    '<div><div class="settings-label">' + t('settings.toolImgGen') + '</div>' +
    '<div style="font-size:12px;color:var(--text3)">' + t('settings.toolImgGenDesc') + '</div></div></div>';

  if (!imgModels.length) {
    h += '<div style="padding:10px 14px;background:var(--bg3);border-radius:8px;border:1px dashed var(--border);font-size:13px;color:var(--text3)">' +
      t('settings.toolImgNoModelTip') + '</div>';
  } else {
    h += '<div id="stToolImgGenSS" style="width:100%"></div>' +
      '<div id="stToolImgGenHint" style="margin-top:4px"></div>';
  }

  h += '</div>';

  h += '<div style="margin-top:4px"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--text2)">' +
    '<input type="checkbox" id="stToolImgAuto"' + (_toolModels.imageAutoIntercept !== false ? ' checked' : '') + '>' +
    t('settings.toolImgAuto') + '</label></div>';

  h += '<button class="settings-btn settings-btn-primary" onclick="saveToolModels()" style="margin-top:12px">' + t('common.save') + '</button>';

  h += '<div style="margin-top:20px;border-top:1px solid var(--border);padding-top:16px">' +
    '<div class="settings-section-title" style="font-size:14px">' + t('settings.toolAddImgModel') + '</div>' +
    '<div style="font-size:12px;color:var(--text3);margin-bottom:10px">' + t('settings.toolAddImgModelDesc') + '</div>' +
    '<div id="stToolAddForm"></div></div>';

  _renderToolAddForm(h, el);
  _initToolImgGenSS();
}

function _renderToolAddForm(h, el) {
  const provOpts = Object.keys(settingsProviders).map(p => '<option value="' + escH(p) + '">' + escH(p) + '</option>').join('');
  const apiOpts = [
    { val: 'dashscope-image', label: 'DashScope \u6587\u751F\u56FE (wanx \u7B49)' },
    { val: 'openai-image', label: 'OpenAI Images (DALL-E \u7B49)' },
  ].map(a => '<option value="' + a.val + '">' + a.label + '</option>').join('');

  const presets = [
    { name: 'wanx2.1-t2i-turbo', label: '\u901A\u4E49\u4E07\u8C61 Turbo', api: 'dashscope-image' },
    { name: 'wanx2.1-t2i-plus', label: '\u901A\u4E49\u4E07\u8C61 Plus', api: 'dashscope-image' },
    { name: 'wanx-v1', label: '\u901A\u4E49\u4E07\u8C61 v1', api: 'dashscope-image' },
    { name: 'dall-e-3', label: 'DALL-E 3', api: 'openai-image' },
  ];
  const presetBtns = presets.map(p =>
    '<button class="settings-btn settings-btn-outline" style="padding:4px 10px;font-size:12px" ' +
    'onclick="fillToolPreset(\'' + p.name + '\',\'' + p.api + '\')">' + p.label + '</button>'
  ).join(' ');

  h += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;align-items:center">' +
    '<span style="font-size:12px;color:var(--text3);line-height:28px">' + t('settings.toolPresetsLabel') + '</span>' + presetBtns + '</div>';

  h += '<div class="add-form" style="border:1px solid var(--border);border-radius:8px;padding:12px">' +
    '<div class="add-form-row" style="gap:8px;margin-bottom:8px">' +
    '<select class="settings-select" id="stImgProv" style="min-width:100px"><option value="">' + t('settings.selectProvider') + '</option>' + provOpts + '</select>' +
    '<input class="settings-input" id="stImgName" placeholder="' + t('settings.toolModelNamePH') + '" style="flex:1"></div>' +
    '<div class="add-form-row" style="gap:8px">' +
    '<select class="settings-select" id="stImgApi" style="flex:1">' + apiOpts + '</select>' +
    '<button class="settings-btn settings-btn-primary" onclick="addImgGenModel()">' + t('settings.toolAddBtn') + '</button></div></div>';

  h += '<div class="settings-section-desc" style="margin-top:16px;padding:10px;background:var(--bg3);border-radius:8px;font-size:12px;line-height:1.6">' +
    '<strong>' + t('settings.toolImgHowTitle') + '</strong><br>' + t('settings.toolImgHowBody') + '</div>';

  el.innerHTML = h;
}

function _initToolImgGenSS() {
  const imgModels = _getImgGenModels();
  if (!imgModels.length) { _toolImgGenSS = null; return; }
  const items = imgModels.map(m => ({
    id: m.id,
    label: (m.name || m.id),
    badge: m.provider || '',
    group: getModelCategoryLabel(getModelCategory(m))
  }));
  const savedVal = _toolModels.imageGeneration || '';
  const validVal = savedVal && items.some(it => it.id === savedVal) ? savedVal : '';
  _toolImgGenSS = initSearchableSelect('stToolImgGenSS', {
    items,
    value: validVal,
    placeholder: t('common.searchModel') || '搜索模型...',
    emptyLabel: t('settings.toolModelNone'),
    grouped: false,
  });
  const hintEl = document.getElementById('stToolImgGenHint');
  if (hintEl) {
    if (savedVal && !validVal) {
      hintEl.innerHTML = '<span style="color:var(--danger);font-size:12px">' + escH(t('settings.toolModelInvalid', { id: savedVal })) + '</span>';
    } else {
      hintEl.innerHTML = '';
    }
  }
}

function fillToolPreset(name, api) {
  const nameEl = document.getElementById('stImgName');
  const apiEl = document.getElementById('stImgApi');
  if (nameEl) nameEl.value = name;
  if (apiEl) apiEl.value = api;
}

async function addImgGenModel() {
  const provider = document.getElementById('stImgProv')?.value;
  const name = document.getElementById('stImgName')?.value?.trim();
  const api = document.getElementById('stImgApi')?.value;
  if (!provider || !name) { showToastMsg(t('settings.fillRequired'), 'error'); return; }
  const id = provider + '/' + name;
  try {
    await authFetch('/api/settings/models', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, provider, input: ['text'], output: ['image'], api, contextWindow: 0, maxTokens: 0 })
    });
    showToastMsg(t('settings.saved'));
    await loadSettingsProviders();
    _renderToolModelsForm();
  } catch (e) { showToastMsg(e.message || t('common.fail'), 'error'); }
}

async function saveToolModels() {
  const imgGen = (_toolImgGenSS ? _toolImgGenSS.getValue() : '') || '';
  const autoIntercept = document.getElementById('stToolImgAuto')?.checked !== false;
  try {
    await authFetch('/api/settings/tool-models', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageGeneration: imgGen || null, imageAutoIntercept: autoIntercept })
    });
    _toolModels.imageGeneration = imgGen || null;
    _toolModels.imageAutoIntercept = autoIntercept;
    showToastMsg(t('settings.saved'));
  } catch (e) { showToastMsg(t('common.fail'), 'error'); }
}
