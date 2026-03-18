/* OpenClaw IM — Formatting & Text Utilities (Layer 0) */

function truncate(s, n) { return s.length > n ? s.slice(0, n) + '...' : s; }
function stripMd(s) { if (!s) return ''; return s.replace(/```[\s\S]*?```/g, '[代码]').replace(/`([^`]+)`/g, '$1').replace(/!\[([^\]]*)\]\([^)]*\)/g, '[图片]').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/^#{1,6}\s+/gm, '').replace(/(\*\*|__)(.*?)\1/g, '$2').replace(/(\*|_)(.*?)\1/g, '$2').replace(/~~(.*?)~~/g, '$1').replace(/^>\s+/gm, '').replace(/^[-*+]\s+/gm, '').replace(/^\d+\.\s+/gm, '').replace(/\n+/g, ' ').trim(); }
function formatTime(ts) {
  const d = new Date(ts), n = new Date(), loc = _lang === 'zh' ? 'zh-CN' : 'en-US';
  if (d.toDateString() === n.toDateString()) return d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
  const y = new Date(n); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return t('time.yesterday');
  if (_lang === 'zh') return d.getFullYear() === n.getFullYear() ? (d.getMonth()+1) + '月' + d.getDate() + '日' : d.getFullYear() + '/' + (d.getMonth()+1) + '/' + d.getDate();
  return d.getFullYear() === n.getFullYear() ? (d.getMonth()+1) + '/' + d.getDate() : d.getFullYear() + '/' + (d.getMonth()+1) + '/' + d.getDate();
}
function formatMsgTime(ts) {
  const d = new Date(ts), n = new Date(), loc = _lang === 'zh' ? 'zh-CN' : 'en-US', time = d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === n.toDateString()) return t('time.today') + ' ' + time;
  const y = new Date(n); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return t('time.yesterday') + ' ' + time;
  if (_lang === 'zh') { if (d.getFullYear() === n.getFullYear()) return (d.getMonth()+1) + '月' + d.getDate() + '日 ' + time; return d.getFullYear() + '年' + (d.getMonth()+1) + '月' + d.getDate() + '日 ' + time; }
  if (d.getFullYear() === n.getFullYear()) return (d.getMonth()+1) + '/' + d.getDate() + ' ' + time;
  return d.getFullYear() + '/' + (d.getMonth()+1) + '/' + d.getDate() + ' ' + time;
}

function esc(s) { const el=document.createElement('span'); el.textContent=s||''; return el.innerHTML; }
function escH(s) { return (s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escJs(s) { return (s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\u0022').replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'); }
function maskKey(k) { if (!k || k.length < 8) return '****'; return k.slice(0, 4) + '****' + k.slice(-4); }
function formatText(text) {
  let h = esc(text); const ps = [];
  for (const a of AGENTS) { ps.push(a.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')); ps.push(a.id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')); }
  if (ps.length) { const re = new RegExp('@('+ps.join('|')+')','g'); h = h.replace(re, (m,x) => { const ag = AGENTS.find(a => a.id===x||a.name===x); return ag ? `<span class="mention" onclick="insertMention('${escJs(ag.id)}')">@${esc(ag.name)}</span>` : m; }); }
  h = h.replace(/(https?:\/\/[^\s<]+)/g, function(url) {
    const u = url.replace(/['">\]]+$/, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const su = escH(u);
    if (/\.(png|jpg|jpeg|gif|webp|svg)(\?[^\s]*)?$/i.test(u)) {
      return `<div class="md-img-wrap"><img data-lazy-src="${su}" alt="" class="lazy-media" onclick="openLightbox(this.src||this.dataset.lazySrc)" /></div>`;
    }
    if (/\.(mp4|webm|mov|ogg)(\?[^\s]*)?$/i.test(u)) {
      return `<div class="md-video-wrap"><video controls data-lazy-src="${su}" class="lazy-media"></video></div>`;
    }
    return `<a href="${su}" target="_blank" style="color:var(--cyan)">${su}</a>`;
  });
  return h;
}
function formatSize(b) { return b<1024?b+' B':b<1048576?(b/1024).toFixed(1)+' KB':(b/1048576).toFixed(1)+' MB'; }
function randomColor() { return DC[Math.floor(Math.random()*DC.length)]; }
let _markedConfigured = false;
const _VIDEO_RE = /\.(mp4|webm|mov|ogg)(\?[^"]*)?$/i;

function _configureMarked() {
  if (_markedConfigured || typeof marked === 'undefined') return;
  _markedConfigured = true;

  const renderer = new marked.Renderer();

  renderer.image = function({ href, title, text }) {
    const safeHref = /^https?:\/\//i.test(href) ? escH(href) : '';
    if (!safeHref) return escH(text || href || '');
    if (_VIDEO_RE.test(href)) {
      return `<div class="md-video-wrap"><video controls data-lazy-src="${safeHref}" title="${escH(title || text || '')}" class="lazy-media"></video></div>`;
    }
    const alt = escH(text || '');
    const cap = title ? `<div class="md-img-caption">${escH(title)}</div>` : '';
    return `<div class="md-img-wrap"><img data-lazy-src="${safeHref}" alt="${alt}" class="lazy-media" onclick="openLightbox(this.src||this.dataset.lazySrc)" />${cap}</div>`;
  };

  renderer.link = function({ href, title, tokens }) {
    const linkText = this.parser.parseInline(tokens);
    if (!/^https?:\/\//i.test(href) && !/^mailto:/i.test(href)) return linkText;
    const safeHref = escH(href);
    if (_VIDEO_RE.test(href)) {
      return `<div class="md-video-wrap"><video controls data-lazy-src="${safeHref}" class="lazy-media"></video><div class="md-video-label">${linkText}</div></div>`;
    }
    const titleAttr = title ? ` title="${escH(title)}"` : '';
    return `<a href="${safeHref}"${titleAttr} target="_blank" rel="noopener">${linkText}</a>`;
  };

  renderer.code = function({ text, lang }) {
    if (lang === 'mermaid') {
      return _renderMermaidContainer(text);
    }
    const language = lang && typeof hljs !== 'undefined' && hljs.getLanguage(lang) ? lang : '';
    let highlighted;
    if (language && typeof hljs !== 'undefined') {
      try { highlighted = hljs.highlight(text, { language }).value; } catch { highlighted = escH(text); }
    } else if (typeof hljs !== 'undefined') {
      try { highlighted = hljs.highlightAuto(text).value; } catch { highlighted = escH(text); }
    } else {
      highlighted = escH(text);
    }
    const langLabel = language || 'code';
    return `<div class="md-code-block"><div class="md-code-header"><span class="md-code-lang">${escH(langLabel)}</span><button class="md-code-copy" onclick="copyCodeBlock(this)">${t('common.copy') || 'Copy'}</button></div><pre><code class="${language ? 'hljs language-' + language : 'hljs'}">${highlighted}</code></pre></div>`;
  };

  renderer.table = function({ header, rows }) {
    let h = '<div class="md-table-wrap"><table><thead><tr>';
    for (const cell of header) {
      const align = cell.align ? ` style="text-align:${cell.align}"` : '';
      h += `<th${align}>${this.parser.parseInline(cell.tokens)}</th>`;
    }
    h += '</tr></thead><tbody>';
    for (const row of rows) {
      h += '<tr>';
      for (const cell of row) {
        const align = cell.align ? ` style="text-align:${cell.align}"` : '';
        h += `<td${align}>${this.parser.parseInline(cell.tokens)}</td>`;
      }
      h += '</tr>';
    }
    h += '</tbody></table></div>';
    return h;
  };

  marked.setOptions({ breaks: true, gfm: true, renderer });
}

let _mermaidDebounce = null;

function renderMarkdown(text) {
  if (typeof marked !== 'undefined') {
    _configureMarked();
    try {
      const html = marked.parse(text || '');
      if (_pendingMermaids.length) {
        clearTimeout(_mermaidDebounce);
        _mermaidDebounce = setTimeout(() => runPendingMermaids(), 80);
      }
      return html;
    } catch {}
  }
  return formatText(text);
}

function openLightbox(src) {
  const lb = document.getElementById('imgLightbox');
  const img = document.getElementById('lightboxImg');
  if (!lb || !img) return;
  img.src = src;
  lb.classList.remove('hidden');
  lb.style.display = 'flex';
}
function closeLightbox() {
  const lb = document.getElementById('imgLightbox');
  if (lb) { lb.classList.add('hidden'); lb.style.display = 'none'; }
}
function copyCodeBlock(btn) {
  const pre = btn.closest('.md-code-block')?.querySelector('pre code');
  if (!pre) return;
  navigator.clipboard.writeText(pre.textContent || '').then(() => {
    btn.textContent = t('common.copied') || 'Copied!';
    setTimeout(() => { btn.textContent = t('common.copy') || 'Copy'; }, 1500);
  });
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeLightbox(); if (typeof clearReplyTarget === 'function') clearReplyTarget(); if (typeof closeMsgCtxMenu === 'function') closeMsgCtxMenu(); } });

// ── Mermaid Rendering ──

let _mermaidCounter = 0;
let _pendingMermaids = [];
let _mermaidInited = false;
let _mermaidLoadPromise = null;

function _getBootVersion() {
  var el = document.querySelector('script[src*="?v="]');
  if (el) { var m = el.src.match(/\?v=([^&"]+)/); if (m) return m[1]; }
  return '';
}

function _ensureMermaid() {
  if (typeof mermaid !== 'undefined') return Promise.resolve();
  if (_mermaidLoadPromise) return _mermaidLoadPromise;
  _mermaidLoadPromise = new Promise(function(resolve) {
    var ver = _getBootVersion();
    var s = document.createElement('script');
    s.src = '/js/mermaid.min.js' + (ver ? '?v=' + ver : '');
    s.onload = function() {
      if (typeof mermaid !== 'undefined') {
        try { mermaid.initialize({ startOnLoad: false, suppressErrorRendering: true }); } catch(e) {}
        console.log('[mermaid] lazy loaded OK');
        resolve();
      } else {
        _loadMermaidCDN(resolve);
      }
    };
    s.onerror = function() { _loadMermaidCDN(resolve); };
    document.head.appendChild(s);
  });
  return _mermaidLoadPromise;
}

function _loadMermaidCDN(resolve) {
  console.warn('[mermaid] local failed, CDN fallback...');
  import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs').then(function(mod) {
    window.mermaid = mod.default;
    mod.default.initialize({ startOnLoad: false, suppressErrorRendering: true });
    console.log('[mermaid] CDN OK');
    resolve();
  }).catch(function(e) {
    console.error('[mermaid] CDN also failed:', e);
    resolve();
  });
}

function _renderMermaidContainer(text) {
  const id = 'mmd-' + (++_mermaidCounter);
  _pendingMermaids.push({ id, source: text });
  clearTimeout(_mermaidDebounce);
  _mermaidDebounce = setTimeout(() => runPendingMermaids(), 80);
  return `<div class="md-mermaid" id="${id}"><div class="md-mermaid-header"><span class="md-mermaid-label">DIAGRAM</span><span class="md-mermaid-actions"><button class="md-mermaid-btn" onclick="mermaidCopySource(this)" title="\u590D\u5236\u6E90\u7801">${t('common.copy') || 'Copy'}</button><button class="md-mermaid-btn" onclick="mermaidExportPng(this)" title="\u5BFC\u51FA PNG">PNG</button><button class="md-mermaid-btn" onclick="mermaidToggleSource(this)" title="\u67E5\u770B\u6E90\u7801">&lt;/&gt;</button></span></div><div class="md-mermaid-body"><pre class="mermaid">${escH(text)}</pre></div><pre class="md-mermaid-source hidden"><code>${escH(text)}</code></pre></div>`;
}

function _initMermaid() {
  if (_mermaidInited || typeof mermaid === 'undefined') return;
  _mermaidInited = true;
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  try {
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
      securityLevel: 'loose',
      suppressErrorRendering: true,
      themeVariables: isDark ? {
        darkMode: true,
        background: '#0d1a2a',
        primaryColor: '#1a3a4a',
        primaryTextColor: '#e0e6ed',
        primaryBorderColor: '#00d4ff',
        lineColor: '#4a8ab5',
        secondaryColor: '#0d2a2a',
        tertiaryColor: '#1a1a3a',
        noteBkgColor: '#1a2a3a',
        noteTextColor: '#e0e6ed',
        noteBorderColor: '#4a8ab5',
        actorBkg: '#0d3b66',
        actorTextColor: '#e0e6ed',
        actorBorder: '#00d4ff',
        signalColor: '#e0e6ed',
        signalTextColor: '#e0e6ed',
        labelBoxBkgColor: '#1a2a3a',
        labelTextColor: '#e0e6ed',
      } : {},
    });
  } catch(e) { console.error('[mermaid] initialize error:', e); }
}

function _sanitizeMermaidSource(src) {
  var firstLine = src.trim().split('\n')[0].trim().toLowerCase();

  // ── Diagram type fixes ──
  src = src.replace(/^blockDiagram\b/m, 'block-beta');
  src = src.replace(/^flowChart\b/m, 'flowchart');
  src = src.replace(/^classDiagram\b(?!\s)/m, 'classDiagram');
  src = src.replace(/^Sequence[Dd]iagram\b/m, 'sequenceDiagram');

  // ── block-beta: block:ID:Label → block:ID["Label"] ──
  src = src.replace(/^(\s*block):(\w+):(.+)$/gm, function(m, pre, id, label) {
    label = label.trim();
    if (!/^\[/.test(label)) return pre + ':' + id + '["' + label.replace(/"/g, "'") + '"]';
    return m;
  });

  // ── sequenceDiagram specific ──
  if (/^sequencediagram/.test(firstLine)) {
    // class X as Label → participant X as Label
    src = src.replace(/^(\s*)class\s+(\S+)\s+as\s+/gm, '$1participant $2 as ');
    // Full-width colon after arrows: A->>B： → A->>B:
    src = src.replace(/^(\s*\S+\s*--?>?>?\s*\S+)\uff1a/gm, '$1:');
    // Full-width colon in Note lines
    src = src.replace(/^(\s*Note\s+(?:left|right|over)\s+(?:of\s+)?\S+)\uff1a/gm, '$1:');
  }

  // ── Quote participant/actor aliases with special chars ──
  src = src.replace(
    /^(\s*(?:participant|actor)\s+\S+\s+as\s+)(.+)$/gm,
    function(match, prefix, alias) {
      alias = alias.trim();
      if (/[(){}[\]<>#|]/.test(alias) && !/^["']/.test(alias)) {
        return prefix + '"' + alias.replace(/"/g, "'") + '"';
      }
      return match;
    }
  );

  // ── Full-width punctuation in structural positions (all types) ──
  // Full-width brackets in node defs: 【】→ []  （）→ ()
  src = src.replace(/\uff08/g, '(').replace(/\uff09/g, ')');
  src = src.replace(/\u3010/g, '[').replace(/\u3011/g, ']');
  // Full-width arrows: → is fine in labels, but ＞ in arrows breaks syntax
  src = src.replace(/\uff1e\uff1e/g, '>>').replace(/\uff1e/g, '>');

  return src;
}

function _cleanMermaidTemp() {
  document.querySelectorAll('[id^="dmmd-"], [id^="mmd-"][id$="-svg"], body > .error, body > svg[id^="mmd-"]').forEach(function(el) {
    if (el.closest('.messages') || el.closest('.md-mermaid')) return;
    el.remove();
  });
}

async function runPendingMermaids() {
  if (!_pendingMermaids.length) return;
  await _ensureMermaid();
  if (typeof mermaid === 'undefined') {
    var batch = _pendingMermaids.splice(0);
    for (var i = 0; i < batch.length; i++) {
      var c = document.getElementById(batch[i].id);
      if (!c) continue;
      var b = c.querySelector('.md-mermaid-body');
      if (b) b.innerHTML = '<pre class="md-mermaid-error"><code>' + escH(batch[i].source) + '</code></pre><div class="md-mermaid-error-msg">Mermaid \u5E93\u672A\u52A0\u8F7D</div>';
    }
    return;
  }
  _initMermaid();
  var batch = _pendingMermaids.splice(0);
  var seen = new Set();
  for (var i = batch.length - 1; i >= 0; i--) {
    var srcKey = batch[i].source.trim();
    if (seen.has(srcKey)) { batch.splice(i, 1); continue; }
    seen.add(srcKey);
  }
  for (var idx = 0; idx < batch.length; idx++) {
    var item = batch[idx];
    var container = document.getElementById(item.id);
    if (!container) continue;
    if (container.closest('.streaming-bubble')) continue;
    var bodyEl = container.querySelector('.md-mermaid-body');
    if (!bodyEl) continue;
    var ok = false;
    var sanitized = _sanitizeMermaidSource(item.source);
    try {
      if (typeof mermaid.render === 'function') {
        var result = await mermaid.render(item.id + '-svg', sanitized);
        var svg = result.svg;
        if (svg && svg.indexOf('Syntax error') === -1 && svg.indexOf('Parse error') === -1) {
          bodyEl.innerHTML = svg;
          ok = true;
        }
      }
    } catch (e) {
      console.warn('[mermaid] render error:', e.message || e);
    }
    _cleanMermaidTemp();
    if (ok) {
      _tryBeautifyMermaid(item.id, sanitized);
    } else {
      bodyEl.innerHTML = '<pre class="md-mermaid-error"><code>' + escH(item.source) + '</code></pre><div class="md-mermaid-error-msg">\u8BE5\u56FE\u8868\u8BED\u6CD5\u6709\u8BEF\uFF0C\u53EF\u70B9\u51FB &lt;/&gt; \u67E5\u770B\u6E90\u7801</div>';
    }
  }
}

var _beautifyQueue = [];
var _beautifyRunning = false;

async function _tryBeautifyMermaid(elId, source) {
  if (source.includes('classDef ') || source.includes('style ') || source.includes(':::')) return;
  _beautifyQueue.push({ elId: elId, source: source });
  if (!_beautifyRunning) _processBeautifyQueue();
}

async function _processBeautifyQueue() {
  if (_beautifyRunning || !_beautifyQueue.length) return;
  _beautifyRunning = true;
  while (_beautifyQueue.length) {
    var item = _beautifyQueue.shift();
    await _doBeautify(item.elId, item.source);
  }
  _beautifyRunning = false;
}

async function _doBeautify(elId, source) {
  var ctrl = new AbortController();
  var timer = setTimeout(function() { ctrl.abort(); }, 12000);
  try {
    var resp = await authFetch('/api/mermaid/beautify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: source }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) return;
    var result = await resp.json();
    if (!result.ok || !result.styled) return;
    var container = document.getElementById(elId);
    if (!container) return;
    var bodyEl = container.querySelector('.md-mermaid-body');
    if (!bodyEl) return;
    var styledSanitized = _sanitizeMermaidSource(result.styled);
    try {
      var renderResult = await mermaid.render(elId + '-sty', styledSanitized);
      var svg = renderResult.svg;
      if (svg && svg.indexOf('Syntax error') === -1) {
        bodyEl.style.opacity = '0';
        setTimeout(function() { bodyEl.innerHTML = svg; bodyEl.style.opacity = '1'; }, 150);
        var srcEl = container.querySelector('.md-mermaid-source code');
        if (srcEl) srcEl.textContent = result.styled;
      }
    } catch(e) { /* styled render failed, keep original */ }
    _cleanMermaidTemp();
  } catch(e) { clearTimeout(timer); }
}

function mermaidExportPng(btn) {
  const container = btn.closest('.md-mermaid');
  const svg = container?.querySelector('.md-mermaid-body svg');
  if (!svg) return;
  const svgData = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement('canvas');
  const bbox = svg.getBoundingClientRect();
  const scale = 2;
  canvas.width = bbox.width * scale;
  canvas.height = bbox.height * scale;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#0d1a2a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const a = document.createElement('a');
    a.download = 'diagram.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  };
  img.onerror = () => { if (typeof showToastMsg === 'function') showToastMsg('PNG 导出失败', 'warn'); };
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
}

function mermaidCopySource(btn) {
  const container = btn.closest('.md-mermaid');
  const src = container?.querySelector('.md-mermaid-source code');
  if (!src) return;
  const orig = btn.textContent;
  navigator.clipboard.writeText(src.textContent || '').then(() => {
    btn.textContent = t('common.copied') || 'Copied!';
    setTimeout(() => { btn.textContent = orig; }, 1500);
  });
}

function mermaidToggleSource(btn) {
  const container = btn.closest('.md-mermaid');
  const src = container?.querySelector('.md-mermaid-source');
  if (src) src.classList.toggle('hidden');
}
function modelOptions(sel) { let h = '<option value="">' + t('manage.defaultModel') + '</option>'; for (const m of availableModels) h += `<option value="${escH(m.id)}" ${m.id===sel?'selected':''}>${esc(m.name||m.id)}</option>`; return h; }
