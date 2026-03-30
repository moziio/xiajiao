/* 虾饺 (Xiajiao) — Settings: Unified Model & Capability Management (Layer 2) */
let settingsProviders = {}, settingsModelsList = [], capabilityRouting = {};

const API_PROTOCOL_MAP = {
  'openai-completions': 'OpenAI Chat Completions (/v1/chat/completions) — 通用兼容协议，适用于 OpenAI、DashScope、DeepSeek、Moonshot 等',
  'openai-responses': 'OpenAI Responses API (/v1/responses) — 新版 OpenAI 协议，支持工具调用和结构化输出',
  'anthropic-messages': 'Anthropic Messages (/v1/messages) — Claude 系列模型专用协议',
  'google-generative-ai': 'Google Generative AI — Gemini 系列模型专用协议',
  'ollama': 'Ollama 本地推理 — 本地运行开源模型'
};

function _imageApiOptions() {
  return [
    { val: '', label: t('settings.apiDefault') },
    { val: 'chat-image', label: 'Chat Completions 文生图 — 通用，适配大多数服务商' },
    { val: 'openai-image', label: 'OpenAI Images API — DALL-E 等 /images/generations 接口' },
    { val: 'dashscope-multimodal', label: 'DashScope 原生多模态 — 阿里百炼 qwen-image 专用' },
    { val: 'dashscope-image', label: 'DashScope 异步文生图 — 阿里百炼 wanx 旧模型专用' },
  ];
}

const CAPABILITY_META = {
  chat: { icon: '💬', label: '对话', desc: '文本对话和问答' },
  image_gen: { icon: '🎨', label: '文生图', desc: '根据文本描述生成图片' },
  image_understand: { icon: '👁️', label: '图像理解', desc: '理解和分析图片内容' },
  video_gen: { icon: '🎬', label: '文生视频', desc: '根据文本生成视频' },
  tts: { icon: '🔊', label: '语音合成', desc: '将文本转换为语音' },
  stt: { icon: '🎤', label: '语音识别', desc: '将语音转换为文本' },
  embedding: { icon: '📐', label: '向量化', desc: '文本向量嵌入' }
};

const ALL_CAPABILITIES = ['chat', 'image_gen', 'image_understand', 'video_gen', 'tts', 'stt', 'embedding'];
const DISABLED_CAPABILITIES = ['video_gen', 'tts', 'stt'];

function getApiProtocolDesc(api) { return API_PROTOCOL_MAP[api] || api; }

function detectCapabilities(model) {
  const caps = [];
  const name = (model.name || '').toLowerCase();
  const rawId = (model.id || '').toLowerCase();
  const id = rawId.includes('/') ? rawId.split('/').pop() : rawId;
  const nameId = name + ' ' + id;
  const hasImageOutput = model.output && model.output.includes('image');
  const hasVideoOutput = model.output && model.output.includes('video');
  const hasAudioOutput = model.output && model.output.includes('audio');
  const hasImageInput = model.input && model.input.includes('image');
  const hasAudioInput = model.input && model.input.includes('audio');
  const api = (model.api || '').toLowerCase();

  const isPureImageGenByName = /\b(wanx|dall-e|dalle|stable-diffusion|sdxl|midjourney|mj-|imagen|t2i|txt2img|image-gen|flux|kolors|ideogram|playground-v|z-image|qwen-image|cogview|seedream|hunyuan-image)\b/.test(nameId);
  const isMultimodalImageByName = /\b(gpt-4o-image|gemini-image)\b/.test(nameId);

  const isVideoGenByName = /\b(video-gen|t2v|txt2video|sora|runway|kling|cogvideo|pika|gen-2|luma|minimax-video|vidu|animate)\b/.test(nameId) ||
    (/\bvideo\b/.test(nameId) && !/understand|vision|input/.test(nameId));

  const isTtsByName = /\b(tts|s2s|cosyvoice|sambert|text-to-speech|elevenlabs|eleven-|azure-tts|edge-tts)\b/.test(nameId) ||
    /\bspeech-\d/.test(nameId) ||
    /\beleven_/.test(nameId) ||
    (/(speech|voice)/.test(nameId) && /gen|synth|output/.test(nameId));

  const isSttByName = /\b(stt|asr|whisper|paraformer|sensevoice|speech-to-text|transcri|recognition)\b/.test(nameId);

  const isEmbeddingByName = /\b(embed|embedding|bge-|m3e|gte-|e5-|voyage-|cohere-embed|text-embedding|vectoriz)\b/.test(nameId);

  const isImageUnderstandByName = /\b(vl|vision|visual|gpt-4v|gpt-4-vision|gemini.*vision|gemini-pro-v|glm-4v|yi-vision|internvl|llava|cogvlm|minicpm-v|qwen.*vl)\b/.test(nameId) ||
    (hasImageInput && !hasImageOutput);

  // 优先级：精确API → 专用名称 → 具体能力(TTS/STT/Video/Embedding) → 宽泛image → 默认chat
  if (api === 'dashscope-image' || api === 'openai-image' || api === 'dashscope-multimodal' || api === 'chat-image' || isPureImageGenByName) {
    caps.push('image_gen');
  } else if (api.includes('tts') || hasAudioOutput || isTtsByName) {
    caps.push('tts');
  } else if (api.includes('stt') || api.includes('transcription') || hasAudioInput || isSttByName) {
    caps.push('stt');
  } else if (api.includes('video') || hasVideoOutput || isVideoGenByName) {
    caps.push('video_gen');
  } else if (api.includes('embedding') || isEmbeddingByName) {
    caps.push('embedding');
  } else if (isMultimodalImageByName || (hasImageOutput && !isPureImageGenByName)) {
    caps.push('chat');
    caps.push('image_gen');
  } else {
    caps.push('chat');
    if (hasImageInput || isImageUnderstandByName) caps.push('image_understand');
  }
  return caps;
}

// 搜索下拉组件
function renderCapSearchSelect(cap, modelsWithCap, routedModelId, defaultLabel) {
  const uid = 'capSel_' + cap;
  const routedModel = routedModelId ? modelsWithCap.find(m => m.id === routedModelId) : null;
  const displayText = routedModel ? (routedModel.name || routedModelId) + ' (' + routedModel.provider + ')' : defaultLabel;
  return `<div class="cap-search-select" id="${uid}">
    <div class="cap-search-trigger" onclick="toggleCapSearch('${cap}')">${escH(displayText)}<span class="cap-search-arrow">▼</span></div>
    <div class="cap-search-dropdown hidden">
      <input type="text" class="cap-search-input" placeholder="${t('settings.searchModel')}" oninput="filterCapOptions('${cap}', this.value)">
      <div class="cap-search-options"></div>
    </div>
  </div>`;
}

function toggleCapSearch(cap) {
  const uid = 'capSel_' + cap;
  const el = document.getElementById(uid);
  if (!el) return;
  const dd = el.querySelector('.cap-search-dropdown');
  const wasHidden = dd.classList.contains('hidden');
  document.querySelectorAll('.cap-search-dropdown').forEach(d => d.classList.add('hidden'));
  if (wasHidden) {
    dd.classList.remove('hidden');
    const input = dd.querySelector('.cap-search-input');
    if (input) { input.value = ''; input.focus(); }
    filterCapOptions(cap, '');
  }
}

function filterCapOptions(cap, query) {
  const uid = 'capSel_' + cap;
  const el = document.getElementById(uid);
  if (!el) return;
  const container = el.querySelector('.cap-search-options');
  const modelsWithCap = settingsModelsList.filter(m => getModelCapabilities(m).includes(cap));
  const routedModelId = capabilityRouting[cap];
  const q = query.toLowerCase().trim();
  const defaultLabel = cap === 'chat' ? t('settings.capFollowDefault') : t('settings.capNone');

  let h = '';
  let matchCount = 0;
  // 默认选项仅在无搜索词或匹配默认标签时显示
  if (!q || defaultLabel.toLowerCase().includes(q)) {
    h += `<div class="cap-search-option${!routedModelId ? ' selected' : ''}" onclick="selectCapOption('${cap}', '')">${escH(defaultLabel)}</div>`;
    matchCount++;
  }
  for (const m of modelsWithCap) {
    const label = (m.name || m.id) + ' (' + m.provider + ')';
    if (q && !label.toLowerCase().includes(q) && !m.id.toLowerCase().includes(q)) continue;
    h += `<div class="cap-search-option${routedModelId === m.id ? ' selected' : ''}" onclick="selectCapOption('${cap}', '${escJs(m.id)}')">${escH(label)}</div>`;
    matchCount++;
  }
  container.innerHTML = matchCount > 0 ? h : `<div class="cap-search-empty">${t('settings.noMatch')}</div>`;
}

function selectCapOption(cap, modelId) {
  document.querySelectorAll('.cap-search-dropdown').forEach(d => d.classList.add('hidden'));
  setCapRoute(cap, modelId);
}

document.addEventListener('click', e => {
  if (!e.target.closest('.cap-search-select')) {
    document.querySelectorAll('.cap-search-dropdown').forEach(d => d.classList.add('hidden'));
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.cap-search-dropdown').forEach(d => d.classList.add('hidden'));
  }
});

function getModelCapabilities(model) {
  try {
    const caps = detectCapabilities(model);
    return Array.isArray(caps) ? caps : [];
  } catch { return []; }
}

async function renderSettingsModels(ct) {
  ct.innerHTML = '<div class="settings-section"><div class="settings-section-title">' + t('settings.capDashboardTitle') + '</div>' +
    '<div class="settings-section-desc">' + t('settings.capDashboardDesc') + '</div>' +
    '<div id="stCapabilityDashboard"></div></div>' +
    '<div class="settings-section"><div class="settings-section-title">' + t('settings.providerTitle') + '</div>' +
    '<div class="settings-section-desc">' + t('settings.providerDesc') + '</div><div id="stProviderList"></div>' +
    '<button class="settings-btn settings-btn-outline" onclick="toggleAddProvider()" style="margin-top:8px">' + t('settings.addProvider') + '</button>' +
    '<div id="stAddProviderForm" class="hidden" style="margin-top:12px"></div></div>' +
    '<div class="settings-section"><div class="settings-section-title">' + t('settings.modelsTitle') + '</div><div id="stModelList"></div>' +
    '<button class="settings-btn settings-btn-outline" onclick="toggleAddModel()" style="margin-top:8px">' + t('settings.addModel') + '</button>' +
    '<div id="stAddModelForm" class="hidden" style="margin-top:12px"></div></div>';
  await loadSettingsProviders();
  await loadCapabilityRouting();
}

async function loadSettingsProviders() {
  try { const r = await (await authFetch('/api/settings/providers')).json(); settingsProviders = r.providers || {}; settingsModelsList = r.models || []; } catch { settingsProviders = {}; settingsModelsList = []; }
  try { renderProviderList(); } catch (e) { console.error('renderProviderList error:', e); }
  try { renderModelList(); } catch (e) { console.error('renderModelList error:', e); }
}

async function loadCapabilityRouting() {
  try {
    const r = await (await authFetch('/api/settings/routing')).json();
    capabilityRouting = r.routing || {};
  } catch { capabilityRouting = {}; }
  renderCapabilityDashboard();
}

function renderCapabilityDashboard() {
  const el = document.getElementById('stCapabilityDashboard');
  if (!el) return;

  const strategy = capabilityRouting.strategy || {};
  const preferDedicated = strategy.preferDedicated === true;

  let h = '<div class="cap-dashboard">';
  h += '<div class="cap-strategy-row">' +
    '<span class="cap-strategy-label">' + t('settings.capStrategy') + '</span>' +
    '<label class="cap-strategy-toggle"><input type="checkbox" id="stCapPreferDedicated"' + (preferDedicated ? ' checked' : '') + ' onchange="updateCapStrategy()">' +
    '<span>' + t('settings.capPreferDedicated') + '</span></label>' +
    '<span class="cap-strategy-hint">' + t('settings.capStrategyHint') + '</span></div>';
  h += '<div class="cap-grid">';

  for (const cap of ALL_CAPABILITIES) {
    const meta = CAPABILITY_META[cap];
    const isDisabled = DISABLED_CAPABILITIES.includes(cap);

    if (isDisabled) {
      h += '<div class="cap-card cap-card-disabled" data-cap="' + cap + '">' +
        '<div class="cap-card-header">' +
        '<span class="cap-card-icon">' + meta.icon + '</span>' +
        '<div class="cap-card-info"><div class="cap-card-name">' + meta.label + '</div>' +
        '<div class="cap-card-desc">' + meta.desc + '</div></div></div>' +
        '<div class="cap-card-status cap-status-disabled">' + t('settings.capDisabled') + '</div>' +
        '<div class="cap-coming-soon">' + t('settings.capComingSoon') + '</div>' +
        '</div>';
      continue;
    }

    const routedModelId = capabilityRouting[cap];
    const routedModel = routedModelId ? settingsModelsList.find(m => m.id === routedModelId) : null;
    const modelsWithCap = settingsModelsList.filter(m => getModelCapabilities(m).includes(cap));
    const hasModels = modelsWithCap.length > 0;

    let statusClass = 'cap-status-none';
    let statusText = t('settings.capNotConfigured');
    let routedIsAuto = false;
    if (routedModel) {
      statusClass = 'cap-status-ok';
      statusText = routedModel.name || routedModelId;
      routedIsAuto = !routedModel.capabilities;
    } else if (cap === 'chat' && settingsModelsList.some(m => getModelCapabilities(m).includes('chat'))) {
      statusClass = 'cap-status-ok';
      statusText = t('settings.capFollowDefault');
    }

    h += '<div class="cap-card" data-cap="' + cap + '">' +
      '<div class="cap-card-header">' +
      '<span class="cap-card-icon">' + meta.icon + '</span>' +
      '<div class="cap-card-info"><div class="cap-card-name">' + meta.label + '</div>' +
      '<div class="cap-card-desc">' + meta.desc + '</div></div></div>' +
      '<div class="cap-card-status ' + statusClass + '">' + statusText + '</div>' +
      (routedIsAuto ? '<div class="cap-auto-warn">' + t('settings.capAutoRouteWarn') + '</div>' : '');

    if (hasModels) {
      const defaultLabel = cap === 'chat' ? t('settings.capFollowDefault') : t('settings.capNone');
      h += renderCapSearchSelect(cap, modelsWithCap, routedModelId, defaultLabel);
    } else {
      h += '<div class="cap-no-model">' + t('settings.capNoModel') + '</div>';
    }
    h += '</div>';
  }
  h += '</div></div>';
  el.innerHTML = h;
}

async function setCapRoute(cap, modelId) {
  const body = {};
  body[cap] = modelId || null;
  try {
    await authFetch('/api/settings/routing', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    capabilityRouting[cap] = modelId || null;
    showToastMsg(t('settings.saved'));
    renderCapabilityDashboard();
  } catch (e) { showToastMsg(t('common.fail'), 'error'); }
}

async function updateCapStrategy() {
  const preferDedicated = document.getElementById('stCapPreferDedicated')?.checked;
  try {
    await authFetch('/api/settings/routing', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ strategy: { preferDedicated } }) });
    capabilityRouting.strategy = { preferDedicated };
    showToastMsg(t('settings.saved'));
  } catch (e) { showToastMsg(t('common.fail'), 'error'); }
}

let _modelListFilter = { provider: '', search: '' };

function renderProviderList() {
  const el = document.getElementById('stProviderList'); if (!el) return;
  const pids = Object.keys(settingsProviders);
  if (!pids.length) { el.innerHTML = '<div style="color:var(--text3);font-size:13px;padding:8px 0">' + t('common.noData') + '</div>'; return; }
  el.innerHTML = pids.map(pid => {
    const p = settingsProviders[pid]; const mc = settingsModelsList.filter(m => m.provider === pid).length;
    const spid = escJs(pid);
    const provModels = settingsModelsList.filter(m => m.provider === pid);
    const capCounts = {};
    provModels.forEach(m => { getModelCapabilities(m).forEach(c => { capCounts[c] = (capCounts[c] || 0) + 1; }); });
    const capBadges = Object.entries(capCounts).map(([c, n]) => {
      const meta = CAPABILITY_META[c];
      return '<span class="prov-cap-badge" title="' + escH(meta?.label || c) + '">' + (meta?.icon || '') + ' ' + n + '</span>';
    }).join('');
    const isActive = _modelListFilter.provider === pid;

    return '<div class="provider-card' + (isActive ? ' active' : '') + '" id="prov-' + escH(pid) + '">' +
      '<div class="provider-card-header" onclick="filterModelsByProvider(\'' + spid + '\')" style="cursor:pointer">' +
      '<div><div class="provider-card-name">' + escH(pid) + ' <span class="provider-model-count">' + t('settings.modelCount', {count: mc}) + '</span></div>' +
      '<div class="provider-card-url">' + escH(p.baseUrl) + '</div>' +
      '<div style="margin-top:3px"><span class="provider-api-badge" data-api="' + escH(p.api || 'openai-completions') + '" title="' + escH(getApiProtocolDesc(p.api || 'openai-completions')) + '">' + esc(p.api || 'openai-completions') + '</span></div>' +
      '<div class="provider-card-key">API Key: ' + maskKey(p.apiKey) + '</div>' +
      '<div class="prov-cap-badges">' + capBadges + '</div></div>' +
      '<div class="provider-card-actions" onclick="event.stopPropagation()">' +
      '<button class="settings-btn settings-btn-outline" onclick="quickAddModelForProvider(\'' + spid + '\')" title="' + t('settings.addModel') + '">+</button>' +
      '<button class="settings-btn settings-btn-outline" onclick="refreshProviderModels(\'' + spid + '\')" title="' + t('settings.refreshModels') + '">&#x1F504;</button>' +
      '<button class="settings-btn settings-btn-outline" onclick="editProvider(\'' + spid + '\')">' + t('settings.editProvider') + '</button>' +
      '<button class="settings-btn settings-btn-danger" onclick="deleteProvider(\'' + spid + '\')">' + t('settings.deleteProvider') + '</button></div></div>' +
      '<div id="provQuickAdd-' + escH(pid) + '" class="hidden"></div>' +
      '<div id="provEdit-' + escH(pid) + '"></div></div>';
  }).join('');
}

function filterModelsByProvider(pid) {
  const wasActive = _modelListFilter.provider === pid;
  if (wasActive) {
    _modelListFilter.provider = '';
  } else {
    _modelListFilter.provider = pid;
  }
  renderProviderList();
  renderModelList();
  if (!wasActive) {
    const toolbar = document.querySelector('.model-list-toolbar');
    if (toolbar) toolbar.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
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
  try { await authFetch('/api/settings/providers/' + pid, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ baseUrl: url, apiKey: key, api }) }); showToastMsg(t('settings.saved')); await loadSettingsProviders(); await loadModels(); renderCapabilityDashboard(); } catch (e) { showToastMsg(t('common.fail'), 'error'); }
}

async function deleteProvider(pid) {
  if (!await appConfirm(t('settings.deleteProviderConfirm'))) return;
  try {
    const resp = await authFetch('/api/settings/providers/' + pid, { method: 'DELETE' });
    const r = await resp.json();
    if (!r.ok) {
      showToastMsg(t('common.fail') + ': ' + (r.error || ''), 'error');
      return;
    }
    showToastMsg(t('settings.deleted'));
    if (_modelListFilter.provider === pid) { _modelListFilter.provider = ''; _modelListFilter.search = ''; }
    await loadSettingsProviders(); await loadModels(); renderCapabilityDashboard();
    try { const r = await (await authFetch('/api/agents')).json(); if (r.agents) updateAgentList(r.agents); } catch {}
  } catch (e) { showToastMsg(t('common.fail') + ': ' + e.message, 'error'); }
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

  resultEl.innerHTML = '<div style="padding:12px;color:var(--text3);font-size:13px">' + t('settings.discovering') + '</div>';

  try {
    const r = await (await authFetch('/api/settings/providers/discover', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ baseUrl, apiKey, api }) })).json();
    const models = r.models || [];

    if (!models.length) {
      const resp = await authFetch('/api/settings/providers', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id, baseUrl, apiKey, api }) });
      const saveR = await resp.json();
      if (!saveR.ok) {
        showToastMsg(t('common.fail') + ': ' + (saveR.error || ''), 'error');
        return;
      }
      await loadSettingsProviders();
      await loadModels();
      renderCapabilityDashboard();

      const formEl = document.getElementById('stAddProviderForm');
      if (formEl) formEl.classList.add('hidden');

      let hintMsg = t('settings.providerSavedNoDiscover');
      if (r.error) {
        hintMsg = t('settings.discoverFailedButSaved');
      }
      showToastMsg(hintMsg, 'warn');

      window._apDiscoverData = { id, baseUrl, apiKey, api, models: [], alreadySaved: true };
      const apiOpts = _imageApiOptions().map(a => '<option value="' + a.val + '">' + a.label + '</option>').join('');
      let h = '<div class="discover-model-list"><div class="discover-header"><span>' + t('settings.manualAddModel') + '</span></div>' +
        '<div style="padding:12px;border:1px solid var(--border);border-radius:8px;">' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">' +
        '<input class="settings-input" id="qaId-' + escH(id) + '" placeholder="' + t('settings.modelIdPlaceholder') + '" style="flex:1;min-width:150px;">' +
        '<input class="settings-input" id="qaName-' + escH(id) + '" placeholder="' + t('settings.modelNamePlaceholder') + '" style="flex:1;min-width:150px;opacity:0.7;">' +
        '<select class="settings-select" id="qaApi-' + escH(id) + '" style="min-width:140px">' + apiOpts + '</select>' +
        '<button class="settings-btn settings-btn-primary" onclick="submitQuickAddModelFromDiscover(\'' + escJs(id) + '\')" style="white-space:nowrap">' + t('settings.addModel') + '</button></div>' +
        '<div style="color:var(--text3);font-size:12px;margin-top:8px">💡 ' + t('settings.manualAddModelTip') + '</div></div></div>';
      resultEl.innerHTML = h;
      return;
    }

    const resp = await authFetch('/api/settings/providers', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id, baseUrl, apiKey, api }) });
    const saveR = await resp.json();
    if (!saveR.ok) {
      showToastMsg(t('common.fail') + ': ' + (saveR.error || ''), 'error');
      return;
    }

    await loadSettingsProviders();
    await loadModels();
    renderCapabilityDashboard();

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
    resultEl.innerHTML = '';
    showToastMsg(t('common.fail') + ': ' + e.message, 'error');
  }
}

function toggleDiscoverAll(checked) { document.querySelectorAll('.ap-model-check').forEach(cb => cb.checked = checked); }

async function confirmAddProvider() {
  const d = window._apDiscoverData; if (!d) return;
  try {
    const checks = document.querySelectorAll('.ap-model-check:checked');
    const models = [];
    for (const cb of checks) {
      const m = d.models[parseInt(cb.dataset.idx)];
      if (!m) continue;
      models.push({ id: d.id + '/' + m.id, name: m.name || m.id, provider: d.id, input: ['text'], contextWindow: m.contextWindow || 128000, maxTokens: m.maxTokens || 8192 });
    }
    if (models.length) {
      const r = await (await authFetch('/api/settings/models/batch', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ models }) })).json();
      showToastMsg(t('settings.providerAdded', { count: r.added || models.length }) + (r.skipped ? ' (' + r.skipped + ' ' + t('settings.skipped') + ')' : ''));
    }
  } catch (e) { showToastMsg(t('common.fail') + ': ' + (e.message || ''), 'error'); }
  const formEl = document.getElementById('stAddProviderForm');
  if (formEl) formEl.classList.add('hidden');
  window._apDiscoverData = null;
  await loadSettingsProviders();
  await loadModels();
  renderCapabilityDashboard();
}

async function submitQuickAddModelFromDiscover(pid) {
  const rawId = document.getElementById('qaId-' + pid)?.value?.trim();
  const name = document.getElementById('qaName-' + pid)?.value?.trim();
  const api = document.getElementById('qaApi-' + pid)?.value;
  if (!rawId) { showToastMsg(t('settings.fillRequired'), 'error'); return; }
  const id = rawId.includes('/') ? rawId : pid + '/' + rawId;

  const body = { id, name: name || rawId, provider: pid, input: ['text'], contextWindow: 128000, maxTokens: 8192 };
  if (api === 'dashscope-image' || api === 'openai-image') {
    body.output = ['image'];
    body.api = api;
  } else if (api) {
    body.api = api;
  }

  try {
    await authFetch('/api/settings/models', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    showToastMsg(t('settings.saved'));
    const resultEl = document.getElementById('apDiscoverResult');
    if (resultEl) resultEl.innerHTML = '';
    await loadSettingsProviders(); await loadModels(); renderCapabilityDashboard();
  } catch (e) { showToastMsg(t('common.fail'), 'error'); }
}

async function refreshProviderModels(pid) {
  const p = settingsProviders[pid]; if (!p) return;
  showToastMsg(t('settings.discovering'));
  try {
    const r = await (await authFetch('/api/settings/providers/discover', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ baseUrl: p.baseUrl, apiKey: p.apiKey, api: p.api }) })).json();
    if (r.error || !(r.models || []).length) {
      showToastMsg(t('settings.discoverFailTip'), 'warn');
      quickAddModelForProvider(pid);
      return;
    }
    const models = r.models;
    const existing = new Set(settingsModelsList.filter(m => m.provider === pid).map(m => m.id));
    const newModels = models.filter(m => !existing.has(pid + '/' + m.id)).map(m => ({ id: pid + '/' + m.id, name: m.name || m.id, provider: pid, input: ['text'], contextWindow: m.contextWindow || 128000, maxTokens: m.maxTokens || 8192 }));
    if (newModels.length) {
      const br = await (await authFetch('/api/settings/models/batch', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ models: newModels }) })).json();
      showToastMsg(t('settings.modelsRefreshed', { added: br.added || newModels.length, total: models.length }));
    } else {
      showToastMsg(t('settings.modelsRefreshed', { added: 0, total: models.length }));
    }
    await loadSettingsProviders(); await loadModels(); renderCapabilityDashboard();
  } catch (e) { showToastMsg(t('settings.discoverFailTip'), 'warn'); quickAddModelForProvider(pid); }
}

function renderModelList() {
  const el = document.getElementById('stModelList'); if (!el) return;
  if (!settingsModelsList.length) { el.innerHTML = '<div style="color:var(--text3);font-size:13px;padding:8px 0">' + t('common.noData') + '</div>'; return; }

  // 筛选器和搜索栏
  const pids = Object.keys(settingsProviders);
  let h = '<div class="model-list-toolbar">';
  h += '<div class="model-filter-tags">' +
    '<span class="model-filter-tag' + (!_modelListFilter.provider ? ' active' : '') + '" onclick="clearModelFilter()">' + t('settings.filterAll') + '</span>';
  pids.forEach(pid => {
    const count = settingsModelsList.filter(m => m.provider === pid).length;
    h += '<span class="model-filter-tag' + (_modelListFilter.provider === pid ? ' active' : '') + '" onclick="filterModelsByProvider(\'' + escJs(pid) + '\')">' + escH(pid) + ' (' + count + ')</span>';
  });
  h += '</div>';
  h += '<div class="model-search-wrap">';
  h += '<input type="text" class="model-search-input" id="stModelSearch" placeholder="' + t('settings.searchModelPlaceholder') + '" value="' + escH(_modelListFilter.search) + '" oninput="onModelSearchInput(this.value)">';
  if (_modelListFilter.search) {
    h += '<span class="model-search-clear" onclick="clearModelSearch()" title="' + t('common.clear') + '">&times;</span>';
  }
  h += '</div></div>';

  // 筛选模型
  let filtered = settingsModelsList;
  if (_modelListFilter.provider) {
    filtered = filtered.filter(m => m.provider === _modelListFilter.provider);
  }
  if (_modelListFilter.search) {
    const q = _modelListFilter.search.toLowerCase();
    filtered = filtered.filter(m => (m.name || '').toLowerCase().includes(q) || (m.id || '').toLowerCase().includes(q));
  }

  if (!filtered.length) {
    h += '<div class="model-list-empty">' + t('settings.noMatchingModels') + '</div>';
    el.innerHTML = h;
    return;
  }

  // 按 Provider 分组
  const byProv = {}; filtered.forEach(m => { (byProv[m.provider] = byProv[m.provider] || []).push(m); });
  const FOLD_THRESHOLD = 15;

  for (const [pid, models] of Object.entries(byProv)) {
    const shouldFold = models.length > FOLD_THRESHOLD;
    const foldId = 'modelFold-' + pid.replace(/[^a-zA-Z0-9]/g, '_');
    
    h += '<div class="model-group">';
    h += '<div class="model-group-header">' + escH(pid) + ' <span class="model-group-count">(' + models.length + ')</span></div>';
    
    const visibleModels = shouldFold ? models.slice(0, FOLD_THRESHOLD) : models;
    const hiddenModels = shouldFold ? models.slice(FOLD_THRESHOLD) : [];

    visibleModels.forEach(m => { h += renderModelRow(m); });

    if (hiddenModels.length > 0) {
      h += '<div id="' + foldId + '" class="model-fold-hidden">';
      hiddenModels.forEach(m => { h += renderModelRow(m); });
      h += '</div>';
      h += '<div class="model-fold-toggle" onclick="toggleModelFold(\'' + foldId + '\', this)">' +
        '<span class="fold-text">' + t('settings.showMore', {count: hiddenModels.length}) + '</span></div>';
    }
    h += '</div>';
  }

  h += '<div class="model-list-summary">' + t('settings.totalModels', {count: filtered.length}) + '</div>';
  el.innerHTML = h;
}

function renderModelRow(m) {
  const caps = getModelCapabilities(m);
  const isAutoDetected = !m.capabilities;
  const capTags = caps.map(c => {
    const meta = CAPABILITY_META[c];
    if (isAutoDetected) {
      return '<span class="model-cap-tag cap-auto" title="' + escH(t('settings.capAutoHint')) + '">' + (meta?.icon || '') + ' ' + (meta?.label || c) + '</span>';
    }
    return '<span class="model-cap-tag" title="' + escH(meta?.label || c) + '">' + (meta?.icon || '') + ' ' + (meta?.label || c) + '</span>';
  }).join('');
  const encodedId = encodeURIComponent(m.id);
  const autoHint = isAutoDetected ? '<span class="cap-auto-hint" title="' + escH(t('settings.capAutoHintFull')) + '">⚡' + t('settings.capAutoLabel') + '</span>' : '';
  return '<div class="model-row"><div class="model-row-name">' + escH(m.name) + autoHint + '</div>' +
    '<div class="model-row-caps">' + capTags + '</div>' +
    '<button class="settings-btn settings-btn-outline" style="padding:4px 10px;font-size:11px" onclick="editModelCapabilities(\'' + encodedId + '\')" title="' + t('settings.editCaps') + '">✏️</button>' +
    '<button class="settings-btn settings-btn-danger" style="padding:4px 10px;font-size:11px" onclick="deleteSettingsModel(\'' + encodedId + '\')">&times;</button></div>';
}

function clearModelFilter() {
  _modelListFilter.provider = '';
  _modelListFilter.search = '';
  renderProviderList();
  renderModelList();
}

function clearModelSearch() {
  _modelListFilter.search = '';
  renderModelList();
  const input = document.getElementById('stModelSearch');
  if (input) input.focus();
}

let _modelSearchTimer = null;
function onModelSearchInput(value) {
  _modelListFilter.search = value;
  if (_modelSearchTimer) clearTimeout(_modelSearchTimer);
  _modelSearchTimer = setTimeout(() => {
    renderModelList();
    const input = document.getElementById('stModelSearch');
    if (input) { input.focus(); input.setSelectionRange(value.length, value.length); }
  }, 200);
}

function toggleModelFold(foldId, btn) {
  const el = document.getElementById(foldId);
  if (!el) return;
  const isHidden = el.classList.contains('model-fold-hidden');
  if (isHidden) {
    el.classList.remove('model-fold-hidden');
    btn.querySelector('.fold-text').textContent = t('settings.showLess');
  } else {
    el.classList.add('model-fold-hidden');
    const count = el.querySelectorAll('.model-row').length;
    btn.querySelector('.fold-text').textContent = t('settings.showMore', {count});
  }
}

function editModelCapabilities(encodedModelId) {
  const modelId = decodeURIComponent(encodedModelId);
  const model = settingsModelsList.find(m => m.id === modelId);
  if (!model) return;
  const currentCaps = getModelCapabilities(model);

  let h = '<div class="edit-caps-form"><div class="edit-caps-title">' + t('settings.editCapsTitle') + ': ' + escH(model.name) + '</div>';
  h += '<div class="cap-checkbox-list">';
  for (const cap of ALL_CAPABILITIES) {
    const meta = CAPABILITY_META[cap];
    h += '<label class="cap-checkbox-item"><input type="checkbox" class="edit-cap-check" data-cap="' + cap + '"' + (currentCaps.includes(cap) ? ' checked' : '') + '>' +
      '<span class="cap-cb-icon">' + meta.icon + '</span>' +
      '<span class="cap-cb-label">' + meta.label + '</span></label>';
  }
  h += '</div>';
  h += '<div class="edit-caps-actions"><button class="settings-btn settings-btn-primary" onclick="saveModelCapabilities(\'' + encodedModelId + '\')">' + t('common.save') + '</button>' +
    '<button class="settings-btn settings-btn-outline" onclick="closeEditCapsDialog()">' + t('common.cancel') + '</button></div></div>';

  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';
  overlay.id = 'editCapsOverlay';
  overlay.innerHTML = '<div class="dialog-box">' + h + '</div>';
  overlay.onclick = (e) => { if (e.target === overlay) closeEditCapsDialog(); };
  document.body.appendChild(overlay);
}

function closeEditCapsDialog() {
  const overlay = document.getElementById('editCapsOverlay');
  if (overlay) overlay.remove();
}

async function saveModelCapabilities(encodedModelId) {
  const modelId = decodeURIComponent(encodedModelId);
  const checks = document.querySelectorAll('.edit-cap-check:checked');
  const caps = Array.from(checks).map(cb => cb.dataset.cap);
  if (!caps.length) { showToastMsg(t('settings.capAtLeastOne'), 'error'); return; }
  try {
    await authFetch('/api/settings/models/' + encodedModelId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capabilities: caps })
    });
    const model = settingsModelsList.find(m => m.id === modelId);
    if (model) model.capabilities = caps;
    closeEditCapsDialog();
    renderModelList();
    renderCapabilityDashboard();
    showToastMsg(t('settings.saved'));
  } catch (e) { showToastMsg(t('common.fail'), 'error'); }
}

function quickAddModelForProvider(pid) {
  let el = document.getElementById('provQuickAdd-' + pid);
  if (!el) {
    const provCard = document.getElementById('prov-' + pid);
    if (provCard) {
      const div = document.createElement('div');
      div.id = 'provQuickAdd-' + pid;
      div.className = 'hidden';
      provCard.appendChild(div);
      el = div;
    }
  }
  if (!el) {
    showToastMsg(t('settings.providerNotFound'), 'error');
    return;
  }
  if (!el.classList.contains('hidden')) { el.classList.add('hidden'); el.innerHTML = ''; return; }
  el.classList.remove('hidden');

  const apiOpts = _imageApiOptions().map(a => '<option value="' + a.val + '">' + a.label + '</option>').join('');

  el.innerHTML = '<div class="add-form" style="margin-top:8px;border:none;padding:8px 0"><div class="add-form-row">' +
    '<input class="settings-input" id="qaId-' + pid + '" placeholder="' + t('settings.modelIdPlaceholder') + '">' +
    '<input class="settings-input" id="qaName-' + pid + '" placeholder="' + t('settings.modelNamePlaceholder') + '" style="opacity:0.7">' +
    '<select class="settings-select" id="qaApi-' + pid + '" style="min-width:140px">' + apiOpts + '</select>' +
    '<button class="settings-btn settings-btn-primary" onclick="submitQuickAddModel(\'' + escJs(pid) + '\')" style="white-space:nowrap">' + t('settings.addModel') + '</button></div>' +
    '<div style="color:#888;font-size:12px;margin-top:4px">💡 对话模型保持默认即可；文生图模型请选择对应 API 类型。如服务商不兼容，可通过 one-api 等中转工具接入。</div></div>';
}

async function submitQuickAddModel(pid) {
  const rawId = document.getElementById('qaId-' + pid)?.value?.trim();
  const name = document.getElementById('qaName-' + pid)?.value?.trim();
  const api = document.getElementById('qaApi-' + pid)?.value;
  if (!rawId) { showToastMsg(t('settings.fillRequired'), 'error'); return; }
  const id = rawId.includes('/') ? rawId : pid + '/' + rawId;

  const body = { id, name: name || rawId, provider: pid, input: ['text'], contextWindow: 128000, maxTokens: 8192 };
  if (api === 'dashscope-image' || api === 'openai-image') {
    body.output = ['image'];
    body.api = api;
  } else if (api) {
    body.api = api;
  }

  try {
    await authFetch('/api/settings/models', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    showToastMsg(t('settings.saved'));
    const el = document.getElementById('provQuickAdd-' + pid);
    if (el) { el.classList.add('hidden'); el.innerHTML = ''; }
    await loadSettingsProviders(); await loadModels(); renderCapabilityDashboard();
  } catch (e) { showToastMsg(t('common.fail'), 'error'); }
}

function toggleAddModel() {
  const el = document.getElementById('stAddModelForm'); if (!el) return;
  el.classList.toggle('hidden');
  if (!el.classList.contains('hidden')) {
    const provOpts = Object.keys(settingsProviders).map(p => '<option value="' + escH(p) + '">' + escH(p) + '</option>').join('');
    const apiOpts = _imageApiOptions().map(a => '<option value="' + a.val + '">' + a.label + '</option>').join('');

    el.innerHTML = '<div class="add-form"><div class="add-form-title">' + t('settings.addModel') + '</div><div class="add-form-row">' +
      '<select class="settings-select" id="amProv" style="min-width:120px"><option value="">' + t('settings.selectProvider') + '</option>' + provOpts + '</select>' +
      '<input class="settings-input" id="amId" placeholder="' + t('settings.modelIdPlaceholder') + '"></div>' +
      '<div class="add-form-row"><input class="settings-input" id="amName" placeholder="' + t('settings.modelNamePlaceholder') + '" style="opacity:0.7">' +
      '<select class="settings-select" id="amApi" style="min-width:120px">' + apiOpts + '</select>' +
      '<button class="settings-btn settings-btn-primary" onclick="submitAddModel()">' + t('settings.addModel') + '</button></div>' +
      '<div style="color:#888;font-size:12px;margin-top:4px">💡 对话模型保持默认即可；文生图模型请选择对应 API 类型。如服务商不兼容，可通过 one-api 等中转工具接入。</div></div>';
  }
}

async function submitAddModel() {
  const provider = document.getElementById('amProv')?.value;
  const rawId = document.getElementById('amId')?.value?.trim();
  const name = document.getElementById('amName')?.value?.trim();
  const api = document.getElementById('amApi')?.value;
  if (!provider || !rawId) { showToastMsg(t('common.fail'), 'error'); return; }
  const id = rawId.includes('/') ? rawId : provider + '/' + rawId;

  const body = { id, name: name || rawId, provider, contextWindow: 128000, maxTokens: 4096 };
  if (api === 'dashscope-image' || api === 'openai-image') {
    body.output = ['image'];
    body.api = api;
  } else if (api) {
    body.api = api;
  }

  try {
    await authFetch('/api/settings/models', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    showToastMsg(t('settings.saved'));
    document.getElementById('stAddModelForm').classList.add('hidden');
    await loadSettingsProviders(); await loadModels(); renderCapabilityDashboard();
  } catch (e) { showToastMsg(t('common.fail'), 'error'); }
}

async function deleteSettingsModel(encodedMid) {
  const mid = decodeURIComponent(encodedMid);
  if (!await appConfirm(t('settings.deleteModelConfirm'))) return;
  try {
    await authFetch('/api/settings/models/' + encodedMid, { method: 'DELETE' });
    showToastMsg(t('settings.saved'));
    await loadSettingsProviders(); await loadModels(); renderCapabilityDashboard();
    try { const r = await (await authFetch('/api/agents')).json(); if (r.agents) updateAgentList(r.agents); } catch {}
  } catch (e) { showToastMsg(t('common.fail'), 'error'); }
}

// ══════════════════════════════════════════════════════════════
// ── Tools Settings (Web Search, RAG) ──
// ══════════════════════════════════════════════════════════════

const _WS_PROVIDERS = [
  { id: 'auto',       label: '自动（推荐）',    hint: '免费 · DuckDuckGo → Bing 自动降级 + LLM 总结，国内外均可用', needsKey: false, needsBase: false, needsBrave: false },
  { id: 'duckduckgo', label: 'DuckDuckGo',      hint: '免费 · 无需 API Key，仅返回搜索结果（国内需代理）', needsKey: false, needsBase: false, needsBrave: false },
  { id: 'bing',       label: 'Bing（必应）',    hint: '免费 · 国内可直接访问 · 无需 API Key', needsKey: false, needsBase: false, needsBrave: false },
  { id: 'kimi',       label: 'Kimi（月之暗面）', hint: '国内友好 · 中文搜索优秀 · <a href="https://platform.moonshot.cn" target="_blank" style="color:var(--cyan)">platform.moonshot.cn</a>', needsKey: true, needsBase: true, needsBrave: false },
  { id: 'brave',      label: 'Brave Search',     hint: '免费额度 · <a href="https://brave.com/search/api" target="_blank" style="color:var(--cyan)">brave.com/search/api</a>', needsKey: true, needsBase: false, needsBrave: true },
  { id: 'perplexity', label: 'Perplexity',       hint: '高质量 · 支持 OpenRouter 中转 · <a href="https://perplexity.ai" target="_blank" style="color:var(--cyan)">perplexity.ai</a>', needsKey: true, needsBase: true, needsBrave: false },
  { id: 'grok',       label: 'Grok (xAI)',       hint: '实时搜索 · 带引用 · <a href="https://x.ai" target="_blank" style="color:var(--cyan)">x.ai</a>', needsKey: true, needsBase: false, needsBrave: false },
];
let _wsCfg = {};

async function renderSettingsTools(ct) {
  ct.innerHTML =
    '<div class="settings-section"><div class="settings-section-title">🌐 HTTP 自定义工具</div>' +
    '<div class="settings-section-desc">零代码配置 HTTP API，让 Agent 调用任意外部接口。配置后自动注册为工具，无需写代码。</div>' +
    '<div id="stHttpToolsList"><div style="color:var(--text3);padding:12px">' + t('common.loading') + '</div></div>' +
    '<button class="settings-btn settings-btn-outline" onclick="_htToggleAdd()" style="margin-top:10px">+ 添加 HTTP 工具</button>' +
    '<div id="htAddFormWrap" class="hidden" style="margin-top:14px"></div></div>' +
    '<div class="settings-section" style="margin-top:20px"><div class="settings-section-title">🔍 ' + t('settings.webSearchTitle') + '</div>' +
    '<div class="settings-section-desc">' + t('settings.webSearchDesc') + '</div>' +
    '<div id="stWebSearchContent"><div style="color:var(--text3);padding:12px">' + t('common.loading') + '</div></div></div>' +
    '<div class="settings-section" style="margin-top:20px"><div class="settings-section-title">' + t('settings.ragTitle') + '</div>' +
    '<div class="settings-section-desc">' + t('settings.ragDesc') + '</div>' +
    '<div id="stRagContent"><div style="color:var(--text3);padding:12px">' + t('common.loading') + '</div></div></div>';
  _htLoadList();
  await loadSettingsProviders();
  await loadCapabilityRouting();
  _loadWebSearchSettings();
  _loadRagSettings();
}

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
  h += '<div class="settings-row"><div><div class="settings-label">' + t('settings.wsProvider') + '</div>' +
    '<div style="font-size:11px;color:var(--text3)" id="stWsHint">' + provMeta.hint + '</div></div>' +
    '<div class="settings-value"><select class="settings-select" id="stWsProvider" onchange="_onWsProviderChange()">' + opts + '</select></div></div>';

  h += '<div id="stWsDynFields">';
  h += _renderWsDynFields(provMeta, cfg);
  h += '</div>';

  h += '<div style="display:flex;gap:8px;justify-content:flex-end">' +
    '<button class="settings-btn settings-btn-primary" onclick="_saveWebSearch()">' + t('common.save') + '</button></div>';
  h += '</div>';
  el.innerHTML = h;
}

function _renderWsDynFields(provMeta, cfg) {
  let h = '';
  if (provMeta.needsKey) {
    h += '<div class="settings-row"><div><div class="settings-label">API Key</div></div>' +
      '<div class="settings-value"><input class="settings-input" id="stWsApiKey" type="password" placeholder="' +
      (cfg.hasKey ? cfg.apiKey : t('settings.wsApiKeyPH')) + '" style="width:260px"></div></div>';
  }
  if (provMeta.needsBase) {
    const basePlaceholder = provMeta.id === 'kimi' ? 'https://api.moonshot.cn/v1' :
      provMeta.id === 'perplexity' ? 'https://api.perplexity.ai 或 OpenRouter 地址' : '';
    h += '<div class="settings-row"><div><div class="settings-label">Base URL' + t('settings.wsBaseUrlOpt') + '</div>' +
      '<div style="font-size:11px;color:var(--text3)">' + t('settings.wsBaseUrlHint') + '</div></div>' +
      '<div class="settings-value"><input class="settings-input" id="stWsBaseUrl" value="' +
      escH(cfg.baseUrl || '') + '" placeholder="' + escH(basePlaceholder) + '" style="width:260px"></div></div>';
  }
  if (provMeta.needsBrave) {
    h += '<div class="settings-row"><div><div class="settings-label">' + t('settings.wsBraveMode') + '</div></div>' +
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
  const embeddingModels = settingsModelsList.filter(m => getModelCapabilities(m).includes('embedding'));
  const embeddingModelId = capabilityRouting.embedding;
  const embeddingModel = embeddingModelId ? settingsModelsList.find(m => m.id === embeddingModelId) : null;
  const hasEmbedding = !!embeddingModel;
  const hasEmbeddingModels = embeddingModels.length > 0;

  let h = '<div class="rag-simple-form">';

  h += '<div class="rag-beta-banner">' +
    '<span class="rag-beta-tag">Beta</span>' +
    '<div class="rag-beta-info">' +
    '<div class="rag-beta-line">✅ ' + t('settings.ragSupportedFormats') + '</div>' +
    '<div class="rag-beta-line">⚠️ ' + t('settings.ragLimitedPdf') + '</div>' +
    '<div class="rag-beta-line">🚫 ' + t('settings.ragUnsupportedFormats') + '</div>' +
    '<div class="rag-beta-line">📏 ' + t('settings.ragLimitsInfo') + '</div>' +
    '</div></div>';

  h += '<div class="rag-main-toggle">' +
    '<label class="rag-switch"><input type="checkbox" id="stRagEnabled"' + (cfg.enabled ? ' checked' : '') + ' onchange="_onRagToggle()">' +
    '<span class="rag-switch-slider"></span></label>' +
    '<div class="rag-toggle-info">' +
    '<div class="rag-toggle-title">' + t('settings.ragEnabled') + '</div>' +
    '<div class="rag-toggle-desc">' + t('settings.ragSimpleDesc') + '</div>' +
    '</div></div>';

  // 向量化模型选择器
  h += '<div class="rag-model-section">' +
    '<div class="rag-model-label">' + t('settings.ragEmbeddingModel') + '</div>';

  if (hasEmbeddingModels) {
    h += '<div class="rag-model-select-row">' +
      '<select class="settings-select rag-model-select" id="stRagEmbeddingModel" onchange="_onRagModelChange()">' +
      '<option value="">' + t('settings.ragSelectModel') + '</option>';
    for (const m of embeddingModels) {
      const label = (m.name || m.id) + ' (' + m.provider + ')';
      h += '<option value="' + escH(m.id) + '"' + (embeddingModelId === m.id ? ' selected' : '') + '>' + escH(label) + '</option>';
    }
    h += '</select>';
    if (hasEmbedding) {
      h += '<button class="settings-btn" onclick="testRagEmbedding()" id="stRagTestBtn">' + t('settings.ragTestBtn') + '</button>';
    }
    h += '</div>';
    h += '<div id="stRagTestResult" style="font-size:12px;margin-top:4px"></div>';

    // 状态提示
    if (hasEmbedding) {
      h += '<div class="rag-model-hint ok">✓ ' + t('settings.ragReady') + '</div>';
    } else {
      h += '<div class="rag-model-hint warning">⚠ ' + t('settings.ragPleaseSelect') + '</div>';
    }
  } else {
    // 没有 embedding 模型
    h += '<div class="rag-no-model">' +
      '<div class="rag-no-model-text">' + t('settings.ragNoEmbeddingModels') + '</div>' +
      '<button class="settings-btn settings-btn-primary" onclick="switchSettingsTab(\'models\')">' + t('settings.ragAddModel') + '</button>' +
      '</div>';
  }

  h += '</div></div>';
  el.innerHTML = h;
}

async function _onRagModelChange() {
  const modelId = document.getElementById('stRagEmbeddingModel')?.value || '';
  try {
    await authFetch('/api/settings/routing', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embedding: modelId || null })
    });
    capabilityRouting.embedding = modelId || null;
    showToastMsg(t('settings.saved'));
    _loadRagSettings();
  } catch (e) {
    showToastMsg(t('common.fail') + ': ' + e.message, 'error');
  }
}

function _onRagToggle() {
  saveRagSettings();
}

async function saveRagSettings() {
  const enabled = document.getElementById('stRagEnabled')?.checked ?? true;
  try {
    await authFetch('/api/settings/rag', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) });
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

/* ── HTTP 自定义工具管理 ── */

let _httpTools = [];
let _htEditingId = null;

async function _htLoadList() {
  var el = document.getElementById('stHttpToolsList');
  if (!el) return;
  try {
    var r = await (await authFetch('/api/settings/http-tools')).json();
    _httpTools = r.tools || [];
    _htRenderList(el);
  } catch (e) { el.innerHTML = '<div style="color:var(--text3)">加载失败</div>'; }
}

function _htRenderList(el) {
  if (!_httpTools.length) {
    el.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text3);border:1px dashed var(--border);border-radius:10px">' +
      '<div style="font-size:24px;margin-bottom:6px">🌐</div>' +
      '<div>尚未配置 HTTP 工具</div>' +
      '<div style="font-size:12px;margin-top:4px">添加后，Agent 可通过 Tool Calling 调用外部 API</div></div>';
    return;
  }
  var h = '<div style="display:flex;flex-direction:column;gap:8px">';
  for (var i = 0; i < _httpTools.length; i++) {
    var tool = _httpTools[i];
    var method = (tool.method || 'GET').toUpperCase();
    var methodColor = method === 'GET' ? 'var(--green)' : method === 'POST' ? 'var(--cyan)' : method === 'PUT' ? '#e67e22' : method === 'DELETE' ? 'var(--red)' : 'var(--text2)';
    h += '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg3);border-radius:10px;border:1px solid var(--border)">';
    h += '<span style="font-size:11px;font-weight:700;color:' + methodColor + ';font-family:monospace;min-width:44px">' + method + '</span>';
    h += '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px;color:var(--text1)">' + esc(tool.name) + '</div>';
    h += '<div style="font-size:11px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(tool.description || tool.url || '') + '</div></div>';
    h += '<button class="settings-btn settings-btn-outline" style="padding:4px 10px;font-size:12px" onclick="_htEdit(\'' + escJs(tool.id) + '\')">编辑</button>';
    h += '<button class="settings-btn" style="padding:4px 10px;font-size:12px;color:var(--red)" onclick="_htDelete(\'' + escJs(tool.id) + '\')">删除</button>';
    h += '</div>';
  }
  h += '</div>';
  el.innerHTML = h;
}

function _htToggleAdd() {
  var wrap = document.getElementById('htAddFormWrap');
  if (!wrap) return;
  _htEditingId = null;
  if (wrap.classList.contains('hidden')) {
    wrap.classList.remove('hidden');
    wrap.innerHTML = _htRenderForm(null);
  } else {
    wrap.classList.add('hidden');
    wrap.innerHTML = '';
  }
}

async function _htEdit(id) {
  try {
    var r = await (await authFetch('/api/settings/http-tools/' + encodeURIComponent(id))).json();
    _htEditingId = id;
    var wrap = document.getElementById('htAddFormWrap');
    if (!wrap) return;
    wrap.classList.remove('hidden');
    wrap.innerHTML = _htRenderForm(r.tool);
    wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (e) { showToastMsg('加载失败', 'error'); }
}

function _htRenderForm(tool) {
  var isEdit = !!tool;
  var title = isEdit ? '编辑 HTTP 工具' : '添加 HTTP 工具';
  var h = '<div style="border:1px solid var(--border);border-radius:10px;padding:16px;background:var(--bg3)">';
  h += '<div style="font-weight:600;font-size:14px;margin-bottom:12px">' + title + '</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  h += '<div><label style="font-size:12px;color:var(--text2);display:block;margin-bottom:3px">工具名称</label>' +
    '<input class="settings-input" id="htName" value="' + escH(tool ? tool.name : '') + '" placeholder="get_weather" style="width:100%;box-sizing:border-box;font-family:monospace"' + (isEdit ? ' disabled' : '') + '></div>';
  h += '<div><label style="font-size:12px;color:var(--text2);display:block;margin-bottom:3px">HTTP 方法</label>' +
    '<select class="settings-select" id="htMethod" style="width:100%">' +
    ['GET','POST','PUT','PATCH','DELETE'].map(function(m) { return '<option value="' + m + '"' + (tool && tool.method === m ? ' selected' : '') + '>' + m + '</option>'; }).join('') +
    '</select></div>';
  h += '</div>';
  h += '<div style="margin-top:10px"><label style="font-size:12px;color:var(--text2);display:block;margin-bottom:3px">描述（Agent 会看到这段文字来决定是否调用）</label>' +
    '<input class="settings-input" id="htDesc" value="' + escH(tool ? tool.description : '') + '" placeholder="查询天气信息" style="width:100%;box-sizing:border-box"></div>';
  h += '<div style="margin-top:10px"><label style="font-size:12px;color:var(--text2);display:block;margin-bottom:3px">URL（支持 {{param}} 模板变量）</label>' +
    '<input class="settings-input" id="htUrl" value="' + escH(tool ? tool.url : '') + '" placeholder="https://api.example.com/v1/data?city={{city}}" style="width:100%;box-sizing:border-box;font-family:monospace"></div>';
  h += '<div style="margin-top:10px"><label style="font-size:12px;color:var(--text2);display:block;margin-bottom:3px">Headers（JSON，可选）</label>' +
    '<input class="settings-input" id="htHeaders" value="' + escH(tool && tool.headers && Object.keys(tool.headers).length ? JSON.stringify(tool.headers) : '') + '" placeholder=\'{"Authorization":"Bearer {{token}}"}\' style="width:100%;box-sizing:border-box;font-family:monospace"></div>';
  h += '<div style="margin-top:10px"><label style="font-size:12px;color:var(--text2);display:block;margin-bottom:3px">Body 模板（仅 POST/PUT/PATCH，支持 {{param}} 变量）</label>' +
    '<textarea class="settings-input" id="htBody" rows="3" placeholder=\'{"query":"{{keyword}}","limit":10}\' style="width:100%;box-sizing:border-box;font-family:monospace;resize:vertical">' + esc(tool ? tool.bodyTemplate || '' : '') + '</textarea></div>';
  h += '<div style="margin-top:10px"><label style="font-size:12px;color:var(--text2);display:block;margin-bottom:3px">响应提取路径（可选，如 data.items）</label>' +
    '<input class="settings-input" id="htExtract" value="' + escH(tool ? tool.responseExtract || '' : '') + '" placeholder="data.result" style="width:200px;font-family:monospace"></div>';
  h += '<div style="margin-top:14px;border-top:1px solid var(--border);padding-top:12px">';
  h += '<div style="font-weight:600;font-size:13px;margin-bottom:8px">参数定义（Agent 调用时传入）</div>';
  h += '<div id="htParams">';
  var params = [];
  if (tool && tool.parameters && tool.parameters.properties) {
    var required = tool.parameters.required || [];
    for (var pk in tool.parameters.properties) {
      params.push({ key: pk, type: tool.parameters.properties[pk].type || 'string', desc: tool.parameters.properties[pk].description || '', required: required.indexOf(pk) >= 0 });
    }
  }
  h += _htRenderParams(params);
  h += '</div>';
  h += '<button class="settings-btn settings-btn-outline" onclick="_htAddParam()" style="margin-top:6px;font-size:12px;padding:4px 10px">+ 添加参数</button>';
  h += '</div>';
  h += '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">';
  h += '<button class="settings-btn settings-btn-primary" onclick="_htSave()">' + (isEdit ? '保存' : '创建') + '</button>';
  h += '<button class="settings-btn settings-btn-outline" onclick="_htToggleAdd()">取消</button>';
  h += '</div></div>';
  return h;
}

var _htParamRows = [];

function _htRenderParams(params) {
  _htParamRows = params && params.length ? params.slice() : [];
  return _htBuildParamRows();
}

function _htBuildParamRows() {
  if (!_htParamRows.length) return '<div style="color:var(--text3);font-size:12px;padding:6px 0">无参数（点击下方添加）</div>';
  var h = '<div style="display:flex;flex-direction:column;gap:6px">';
  for (var i = 0; i < _htParamRows.length; i++) {
    var p = _htParamRows[i];
    h += '<div style="display:flex;gap:6px;align-items:center">';
    h += '<input class="settings-input htpk" value="' + escH(p.key) + '" placeholder="key" style="width:100px;font-family:monospace;font-size:12px">';
    h += '<select class="settings-select htpt" style="width:80px;font-size:12px"><option value="string"' + (p.type === 'string' ? ' selected' : '') + '>string</option><option value="number"' + (p.type === 'number' ? ' selected' : '') + '>number</option><option value="boolean"' + (p.type === 'boolean' ? ' selected' : '') + '>boolean</option></select>';
    h += '<input class="settings-input htpd" value="' + escH(p.desc) + '" placeholder="描述" style="flex:1;font-size:12px">';
    h += '<label style="font-size:11px;white-space:nowrap;color:var(--text3);display:flex;align-items:center;gap:3px"><input type="checkbox" class="htpr"' + (p.required ? ' checked' : '') + '>必填</label>';
    h += '<button style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px" onclick="_htRemoveParam(' + i + ')">×</button>';
    h += '</div>';
  }
  h += '</div>';
  return h;
}

function _htCollectParams() {
  var keys = document.querySelectorAll('.htpk');
  var types = document.querySelectorAll('.htpt');
  var descs = document.querySelectorAll('.htpd');
  var reqs = document.querySelectorAll('.htpr');
  _htParamRows = [];
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i].value.trim();
    if (!k) continue;
    _htParamRows.push({ key: k, type: types[i] ? types[i].value : 'string', desc: descs[i] ? descs[i].value : '', required: reqs[i] ? reqs[i].checked : false });
  }
}

function _htAddParam() {
  _htCollectParams();
  _htParamRows.push({ key: '', type: 'string', desc: '', required: false });
  var el = document.getElementById('htParams');
  if (el) el.innerHTML = _htBuildParamRows();
}

function _htRemoveParam(idx) {
  _htCollectParams();
  _htParamRows.splice(idx, 1);
  var el = document.getElementById('htParams');
  if (el) el.innerHTML = _htBuildParamRows();
}

async function _htSave() {
  _htCollectParams();
  var name = (document.getElementById('htName')?.value || '').trim();
  var method = document.getElementById('htMethod')?.value || 'GET';
  var desc = (document.getElementById('htDesc')?.value || '').trim();
  var url = (document.getElementById('htUrl')?.value || '').trim();
  var headersStr = (document.getElementById('htHeaders')?.value || '').trim();
  var bodyTpl = (document.getElementById('htBody')?.value || '').trim();
  var extract = (document.getElementById('htExtract')?.value || '').trim();
  if (!name) { showToastMsg('请输入工具名称', 'error'); return; }
  if (!url) { showToastMsg('请输入 URL', 'error'); return; }
  var headers = {};
  if (headersStr) {
    try { headers = JSON.parse(headersStr); } catch { showToastMsg('Headers JSON 格式错误', 'error'); return; }
  }
  var properties = {};
  var required = [];
  for (var i = 0; i < _htParamRows.length; i++) {
    var p = _htParamRows[i];
    if (!p.key) continue;
    properties[p.key] = { type: p.type, description: p.desc };
    if (p.required) required.push(p.key);
  }
  var parameters = { type: 'object', properties: properties };
  if (required.length) parameters.required = required;
  var body = { name: name, method: method, description: desc, url: url, headers: headers, bodyTemplate: bodyTpl, responseExtract: extract, parameters: parameters };
  try {
    var resp;
    if (_htEditingId) {
      resp = await authFetch('/api/settings/http-tools/' + encodeURIComponent(_htEditingId), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      resp = await authFetch('/api/settings/http-tools', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    var rj = await resp.json();
    if (!resp.ok || rj.error) { showToastMsg(rj.error || '保存失败', 'error'); return; }
    showToastMsg(_htEditingId ? '已更新' : '已创建');
    _htEditingId = null;
    var wrap = document.getElementById('htAddFormWrap');
    if (wrap) { wrap.classList.add('hidden'); wrap.innerHTML = ''; }
    await _htLoadList();
  } catch (e) { showToastMsg(e.message || '保存失败', 'error'); }
}

async function _htDelete(id) {
  if (!await appConfirm('确定删除这个 HTTP 工具？已注册的工具将被移除。')) return;
  try {
    var resp = await authFetch('/api/settings/http-tools/' + encodeURIComponent(id), { method: 'DELETE' });
    if (!resp.ok) { showToastMsg('删除失败', 'error'); return; }
    showToastMsg('已删除');
    await _htLoadList();
  } catch { showToastMsg('删除失败', 'error'); }
}
