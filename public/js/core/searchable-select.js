/* 虾饺 (Xiajiao) — Searchable Select & Model Categorization (Layer 0) */

const MODEL_CATEGORIES = {
  image:       { icon: '\uD83C\uDFA8', zhLabel: '图像生成', enLabel: 'Image' },
  code:        { icon: '\uD83D\uDCBB', zhLabel: '编码',     enLabel: 'Code' },
  vision:      { icon: '\uD83D\uDC41\uFE0F', zhLabel: '视觉',     enLabel: 'Vision' },
  reasoning:   { icon: '\uD83E\uDDE0', zhLabel: '推理',     enLabel: 'Reasoning' },
  math:        { icon: '\uD83D\uDCD0', zhLabel: '数学',     enLabel: 'Math' },
  multimodal:  { icon: '\uD83C\uDF10', zhLabel: '多模态',   enLabel: 'Multimodal' },
  tts:         { icon: '\uD83D\uDD0A', zhLabel: '语音合成', enLabel: 'TTS' },
  asr:         { icon: '\uD83C\uDF99\uFE0F', zhLabel: '语音识别', enLabel: 'ASR' },
  embedding:   { icon: '\uD83D\uDCCC', zhLabel: '向量化',   enLabel: 'Embedding' },
  video:       { icon: '\uD83C\uDFAC', zhLabel: '视频生成', enLabel: 'Video' },
  translation: { icon: '\uD83C\uDF0D', zhLabel: '翻译',     enLabel: 'Translation' },
  chat:        { icon: '\uD83D\uDCAC', zhLabel: '对话',     enLabel: 'Chat' },
  thirdparty:  { icon: '\uD83D\uDD17', zhLabel: '第三方',   enLabel: '3rd Party' },
};

function getModelCategory(model) {
  const rawId = ((typeof model === 'string' ? model : model.id) || '').toLowerCase();
  const id = rawId.includes('/') ? rawId.split('/').pop() : rawId;
  const m = typeof model === 'object' ? model : {};
  const caps = m.capabilities;

  if (caps && caps.length) {
    if (caps.includes('image_gen')) return 'image';
    if (caps.includes('tts')) return 'tts';
    if (caps.includes('stt')) return 'asr';
    if (caps.includes('embedding')) return 'embedding';
    if (caps.includes('video_gen')) return 'video';
  }

  if (m.output && m.output.includes('image')) return 'image';
  if (m.api && /dashscope-image|openai-image|dashscope-multimodal|chat-image/.test(m.api)) return 'image';
  if (/\b(wanx|dall-e|dalle|z-image|qwen-image|gpt-4o-image|gemini-image|stable-diffusion|sdxl|midjourney|mj-|imagen|t2i|txt2img|image-gen|flux|kolors|ideogram|playground-v|cogview|seedream|hunyuan-image)\b/.test(id)) return 'image';

  if (/coder|code/.test(id)) return 'code';
  if (/vl-|vision|ocr|qvq/.test(id)) return 'vision';
  if (/omni/.test(id)) return 'multimodal';
  if (/tts|s2s|speech-[0-9]|cosyvoice|sambert|eleven[_-]|elevenlabs|text-to-speech/.test(id)) return 'tts';
  if (/asr|stt|whisper|paraformer|sensevoice|speech-to-text|transcri/.test(id)) return 'asr';
  if (/\b(embed|embedding|bge-|m3e|gte-|e5-|voyage-|text-embedding)\b/.test(id)) return 'embedding';
  if (/livetranslate|mt-/.test(id)) return 'translation';
  if (/math/.test(id)) return 'math';
  if (/deep-search|deep-research/.test(id)) return 'reasoning';
  if (/deepseek-r1|qwq|thinking/.test(id)) return 'reasoning';

  if (caps && caps.includes('image_understand') && /vl|vision/.test(id)) return 'vision';

  if (/deepseek|minimax|kimi|glm|gui-plus/.test(id)) return 'thirdparty';

  return 'chat';
}

function getModelCategoryLabel(catKey) {
  const cat = MODEL_CATEGORIES[catKey];
  if (!cat) return catKey;
  return cat.icon + ' ' + (typeof _lang !== 'undefined' && _lang === 'en' ? cat.enLabel : cat.zhLabel);
}

/**
 * Renders a searchable select dropdown into a container element.
 * @param {string|HTMLElement} container - Element or ID
 * @param {Object} opts
 * @param {Array} opts.items - [{id, label, group?, badge?}]
 * @param {string} opts.value - Current selected value
 * @param {string} opts.placeholder - Search placeholder text
 * @param {string} opts.emptyLabel - Label for "none" option
 * @param {Function} opts.onChange - callback(newValue, item)
 * @param {boolean} opts.grouped - Group items by opts.items[].group
 * @returns {{ getValue, setValue, destroy }}
 */
function initSearchableSelect(container, opts) {
  const el = typeof container === 'string' ? document.getElementById(container) : container;
  if (!el) return null;

  const items = opts.items || [];
  const grouped = opts.grouped !== false;
  let currentValue = opts.value || '';
  let isOpen = false;

  function findItem(v) { return items.find(i => i.id === v); }
  function displayLabel(v) {
    if (!v) return opts.emptyLabel || '—';
    const it = findItem(v);
    return it ? it.label : v;
  }

  el.innerHTML = '';
  el.classList.add('ss-wrap');

  const trigger = document.createElement('div');
  trigger.className = 'ss-trigger';
  trigger.innerHTML = '<span class="ss-trigger-text"></span><span class="ss-arrow">\u25BE</span>';
  el.appendChild(trigger);

  const dropdown = document.createElement('div');
  dropdown.className = 'ss-dropdown';
  el.appendChild(dropdown);

  function updateTrigger() {
    const txt = trigger.querySelector('.ss-trigger-text');
    const it = findItem(currentValue);
    if (it) {
      txt.textContent = it.label;
      txt.classList.remove('ss-placeholder');
    } else if (currentValue) {
      txt.textContent = currentValue;
      txt.classList.remove('ss-placeholder');
    } else {
      txt.textContent = opts.emptyLabel || opts.placeholder || '—';
      txt.classList.add('ss-placeholder');
    }
  }

  function buildDropdown(query) {
    const q = (query || '').toLowerCase().trim();
    let filtered = items;
    if (q) {
      filtered = items.filter(i =>
        (i.label || '').toLowerCase().includes(q) ||
        (i.id || '').toLowerCase().includes(q) ||
        (i.badge || '').toLowerCase().includes(q)
      );
    }

    let html = '';
    if (opts.emptyLabel) {
      const sel = !currentValue ? ' ss-item-selected' : '';
      html += '<div class="ss-item ss-item-empty' + sel + '" data-val="">' + escH(opts.emptyLabel) + '</div>';
    }

    if (grouped && !q) {
      const groups = {};
      const order = [];
      filtered.forEach(i => {
        const g = i.group || '';
        if (!groups[g]) { groups[g] = []; order.push(g); }
        groups[g].push(i);
      });
      order.forEach(g => {
        if (g) html += '<div class="ss-group-label">' + escH(g) + '</div>';
        groups[g].forEach(i => { html += renderItem(i); });
      });
    } else {
      filtered.forEach(i => { html += renderItem(i); });
    }

    if (!filtered.length && q) {
      html += '<div class="ss-empty">' + (t('common.noMatch') || 'No match') + '</div>';
    }

    dropdown.querySelector('.ss-list').innerHTML = html;
  }

  function renderItem(i) {
    const sel = i.id === currentValue ? ' ss-item-selected' : '';
    return '<div class="ss-item' + sel + '" data-val="' + escH(i.id) + '">' +
      '<span class="ss-item-label">' + escH(i.label) + '</span>' +
      (i.badge ? '<span class="ss-item-badge">' + escH(i.badge) + '</span>' : '') +
      '</div>';
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    dropdown.classList.add('ss-open');
    el.classList.add('ss-active');

    dropdown.innerHTML = '<input class="ss-search" type="text" placeholder="' + escH(opts.placeholder || '搜索...') + '" /><div class="ss-list"></div>';
    const searchInput = dropdown.querySelector('.ss-search');
    buildDropdown('');

    searchInput.addEventListener('input', () => buildDropdown(searchInput.value));
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { close(); e.stopPropagation(); }
    });

    dropdown.querySelector('.ss-list').addEventListener('click', (e) => {
      const item = e.target.closest('.ss-item');
      if (!item) return;
      const val = item.dataset.val;
      currentValue = val;
      updateTrigger();
      if (opts.onChange) opts.onChange(val, findItem(val));
      close();
    });

    setTimeout(() => searchInput.focus(), 30);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    dropdown.classList.remove('ss-open');
    el.classList.remove('ss-active');
    dropdown.innerHTML = '';
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    isOpen ? close() : open();
  });

  document.addEventListener('click', (e) => {
    if (isOpen && !el.contains(e.target)) close();
  });

  updateTrigger();

  return {
    getValue() { return currentValue; },
    setValue(v) { currentValue = v; updateTrigger(); },
    destroy() { el.innerHTML = ''; el.classList.remove('ss-wrap', 'ss-active'); }
  };
}
