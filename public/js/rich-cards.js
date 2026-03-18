/* 虾饺 (Xiajiao) — Rich Card Rendering (P3.2) */

/* ── Reply / Quote ── */
let _replyTarget = null;

function setReplyTarget(msgId) {
  const m = allMessages.find(x => x.id === msgId);
  if (!m) return;
  _replyTarget = { id: m.id, text: m.text || '', sender: m.agent ? (AGENTS.find(a => a.id === m.agent)?.name || 'Agent') : (m.userName || ''), type: m.type };
  _renderReplyBar();
  msgInput.focus();
}

function clearReplyTarget() { _replyTarget = null; _renderReplyBar(); }

function _renderReplyBar() {
  let bar = document.getElementById('replyBar');
  if (!_replyTarget) { if (bar) bar.remove(); return; }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'replyBar';
    bar.className = 'reply-bar';
    const compose = document.getElementById('composeBox');
    const attachStrip = document.getElementById('attachStrip');
    compose.insertBefore(bar, attachStrip || compose.firstChild);
  }
  const preview = _replyTarget.text.length > 60 ? _replyTarget.text.slice(0, 60) + '...' : _replyTarget.text;
  bar.innerHTML = `<div class="reply-bar-inner"><span class="reply-bar-icon">↩</span><span class="reply-bar-sender">${esc(_replyTarget.sender)}</span><span class="reply-bar-text">${esc(preview)}</span></div><button class="reply-bar-close" onclick="clearReplyTarget()">&times;</button>`;
}

function getAndClearReply() {
  const r = _replyTarget;
  _replyTarget = null;
  _renderReplyBar();
  return r ? r.id : null;
}

/* ── Card Renderer ── */
function renderCards(cards) {
  if (!cards || !cards.length) return '';
  return cards.map(c => renderCard(c)).join('');
}

function renderCard(card) {
  switch (card.type) {
    case 'link-preview': return _renderLinkPreview(card);
    case 'info-card': return _renderInfoCard(card);
    case 'image-gallery': return _renderGallery(card);
    case 'action-card': return _renderActionCard(card);
    case 'progress': return _renderProgressCard(card);
    default: return '';
  }
}

function _renderLinkPreview(c) {
  const img = c.image ? `<div class="rc-link-img"><img data-lazy-src="${escH(c.image)}" alt="" class="lazy-media" onerror="this.parentElement.remove()" /></div>` : '';
  const domain = c.url ? (() => { try { return new URL(c.url).hostname; } catch { return ''; } })() : '';
  return `<a class="rich-card rc-link" href="${escH(c.url || '#')}" target="_blank" rel="noopener">${img}<div class="rc-link-body"><div class="rc-link-title">${esc(c.title || c.url || '')}</div>${c.description ? `<div class="rc-link-desc">${esc(c.description)}</div>` : ''}${domain ? `<div class="rc-link-domain">${esc(domain)}</div>` : ''}</div></a>`;
}

function _renderInfoCard(c) {
  const tags = (c.tags || []).map(tag => `<span class="rc-tag">${esc(tag)}</span>`).join('');
  const img = c.image ? `<img class="rc-info-img lazy-media" data-lazy-src="${escH(c.image)}" alt="" />` : '';
  return `<div class="rich-card rc-info">${img}<div class="rc-info-body"><div class="rc-info-title">${esc(c.title || '')}</div>${c.description ? `<div class="rc-info-desc">${esc(c.description)}</div>` : ''}${tags ? `<div class="rc-tags">${tags}</div>` : ''}</div></div>`;
}

function _renderGallery(c) {
  const imgs = c.images || [];
  if (!imgs.length) return '';
  const cls = imgs.length === 1 ? 'single' : imgs.length === 2 ? 'double' : imgs.length <= 4 ? 'quad' : 'grid';
  const showCount = Math.min(imgs.length, 9);
  const items = imgs.slice(0, showCount).map((src, i) => {
    const isLast = (i === showCount - 1) && imgs.length > 9;
    const overlay = isLast ? `<div class="rc-gallery-overlay">+${imgs.length - showCount}</div>` : '';
    return `<div class="rc-gallery-item" onclick="openLightbox('${escJs(src)}')"><img data-lazy-src="${escH(src)}" alt="" class="lazy-media" />${overlay}</div>`;
  }).join('');
  return `<div class="rich-card rc-gallery rc-gallery-${cls}">${items}</div>`;
}

function _renderActionCard(c) {
  const actions = c.actions || [];
  if (!actions.length && !c.title && !c.description) return '';
  const btns = actions.map(a => {
    if (a.action === 'open_url') return `<a class="rc-action-btn" href="${escH(a.url || '#')}" target="_blank" rel="noopener">${esc(a.label)}</a>`;
    if (a.action === 'send_text') return `<button class="rc-action-btn" onclick="insertAndSend('${escJs(a.text || '')}')">${esc(a.label)}</button>`;
    if (a.action === 'copy') return `<button class="rc-action-btn" onclick="navigator.clipboard.writeText('${escJs(a.text || '')}');showToastMsg('${escJs(t('common.copied') || 'Copied')}')">${esc(a.label)}</button>`;
    return `<button class="rc-action-btn" onclick="handleCardAction('${escJs(a.action)}','${escJs(a.data || '')}')">${esc(a.label)}</button>`;
  }).join('');
  return `<div class="rich-card rc-action">${c.title ? `<div class="rc-action-title">${esc(c.title)}</div>` : ''}${c.description ? `<div class="rc-action-desc">${esc(c.description)}</div>` : ''}<div class="rc-action-btns">${btns}</div></div>`;
}

function _renderProgressCard(c) {
  const pct = Math.round(Math.min(100, Math.max(0, c.percent || 0)));
  const statusCls = c.status === 'done' ? 'done' : c.status === 'error' ? 'error' : c.status === 'waiting' ? 'waiting' : 'running';
  const icon = c.status === 'done' ? '✅' : c.status === 'error' ? '❌' : c.status === 'waiting' ? '⏸' : '⏳';
  return `<div class="rich-card rc-progress rc-progress-${statusCls}"><div class="rc-progress-header">${icon} <strong>${esc(c.title || '')}</strong></div>${c.description ? `<div class="rc-progress-desc">${esc(c.description)}</div>` : ''}<div class="rc-progress-bar"><div class="rc-progress-fill" style="width:${pct}%"></div></div><div class="rc-progress-label">${pct}%</div></div>`;
}

/* ── Quote block inside message ── */
function renderQuoteBlock(replyToId) {
  if (!replyToId) return '';
  const m = allMessages.find(x => x.id === replyToId);
  if (!m) return `<div class="rc-quote"><span class="rc-quote-deleted">${t('rich.deletedMsg')}</span></div>`;
  const sender = m.agent ? (AGENTS.find(a => a.id === m.agent)?.name || 'Agent') : (m.userName || '');
  const preview = (m.text || '').length > 80 ? m.text.slice(0, 80) + '...' : (m.text || '');
  const qid = escJs(m.id || '');
  return `<div class="rc-quote" onclick="scrollToMsg('${qid}')"><span class="rc-quote-sender">${esc(sender)}</span><span class="rc-quote-text">${esc(preview)}</span></div>`;
}

function scrollToMsg(msgId) {
  const sel = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(msgId) : msgId;
  const el = document.querySelector(`[data-msg-id="${sel}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('msg-highlight');
  setTimeout(() => el.classList.remove('msg-highlight'), 2000);
}

/* ── Auto Link Preview Detection ── */
const _linkPreviewCache = new Map();
const _LP_CACHE_MAX = 100;
const _URL_RE = /https?:\/\/[^\s<>"')\]]+/g;

async function autoDetectLinkPreviews(msgId, text) {
  if (!text) return;
  const rawUrls = text.match(_URL_RE);
  if (!rawUrls) return;
  const urls = rawUrls.map(u => u.replace(/[.,;:!?)]+$/, ''));
  const uniqueUrls = [...new Set(urls)].filter(u => !/\.(png|jpg|jpeg|gif|webp|svg|mp4|webm|mov|ogg)(\?|$)/i.test(u)).slice(0, 3);
  if (!uniqueUrls.length) return;

  for (const url of uniqueUrls) {
    if (_linkPreviewCache.has(url)) {
      _appendLinkCard(msgId, _linkPreviewCache.get(url));
      continue;
    }
    try {
      const res = await authFetch('/api/link-preview?url=' + encodeURIComponent(url));
      if (!res.ok) continue;
      const data = await res.json();
      if (data.title) {
        const card = { type: 'link-preview', title: data.title, description: data.description || '', image: data.image || '', url };
        _linkPreviewCache.set(url, card);
        if (_linkPreviewCache.size > _LP_CACHE_MAX) { const first = _linkPreviewCache.keys().next().value; _linkPreviewCache.delete(first); }
        _appendLinkCard(msgId, card);
      }
    } catch {}
  }
}

function _appendLinkCard(msgId, card) {
  const sel = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(msgId) : msgId;
  const el = document.querySelector(`[data-msg-id="${sel}"] .msg-bubble`);
  if (!el) return;
  const existing = el.querySelectorAll('.rc-link');
  for (const a of existing) { if (a.getAttribute('href') === card.url || a.href === card.url) return; }
  const actionsEl = el.querySelector('.msg-actions');
  const tmp = document.createElement('div');
  tmp.innerHTML = renderCard(card);
  if (actionsEl && tmp.firstChild) { el.insertBefore(tmp.firstChild, actionsEl); }
  else { el.insertAdjacentHTML('beforeend', tmp.innerHTML); }
}

/* ── Multi-image Gallery Auto ── */
function autoGalleryFromFiles(files) {
  if (!files || files.length < 2) return null;
  const imgs = files.filter(f => f.type?.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(f.name || ''));
  if (imgs.length < 2) return null;
  return { type: 'image-gallery', images: imgs.map(f => f.url).filter(Boolean) };
}

/* ── Message Context Menu (Right-click) ── */
let _ctxMenuCloseFn = null;

function showMsgContextMenu(e, msgId) {
  e.preventDefault();
  e.stopPropagation();
  if (typeof _multiSelectMode !== 'undefined' && _multiSelectMode) {
    _toggleMsgSelection(msgId);
    return;
  }
  closeMsgCtxMenu();

  const m = allMessages.find(x => x.id === msgId);
  if (!m) return;

  const menu = document.createElement('div');
  menu.id = 'msgCtxMenu';
  menu.className = 'ctx-menu msg-ctx-menu';

  const safeMsgId = escJs(msgId);
  let items = '';
  items += `<div class="ctx-item" onclick="setReplyTarget('${safeMsgId}');closeMsgCtxMenu()"><span class="ctx-icon">↩</span>${t('rich.reply')}</div>`;

  const rawText = m.text || '';
  if (rawText) {
    const copyId = 'mcc-' + Date.now();
    rawMsgStore.set(copyId, rawText); _trimRawStore();
    items += `<div class="ctx-item" onclick="copyMsgText('${copyId}');closeMsgCtxMenu()"><span class="ctx-icon">📋</span>${t('rich.copy')}</div>`;
  }

  const rawFavId = (m.ts || 0) + '_' + (m.agent || m.userId || '');
  const isFav = isFavorited(rawFavId);
  const safeFavId = escJs(rawFavId);
  items += `<div class="ctx-item" onclick="toggleFav('${safeFavId}',event);closeMsgCtxMenu()"><span class="ctx-icon">${isFav ? '★' : '☆'}</span>${isFav ? t('fav.unfavTitle') : t('fav.favTitle')}</div>`;

  if (canManage()) {
    items += `<div class="ctx-item" onclick="enterMultiSelectMode('${safeMsgId}');closeMsgCtxMenu()"><span class="ctx-icon">☑</span>${t('rich.multiSelect')}</div>`;
    items += `<div class="ctx-item ctx-danger" onclick="deleteSingleMessage('${safeMsgId}');closeMsgCtxMenu()"><span class="ctx-icon">🗑️</span>${t('rich.deleteMsg')}</div>`;
  }

  menu.innerHTML = items;
  document.body.appendChild(menu);

  requestAnimationFrame(() => {
    const r = menu.getBoundingClientRect();
    let x = e.clientX, y = e.clientY;
    if (x + r.width > window.innerWidth - 8) x = window.innerWidth - r.width - 8;
    if (y + r.height > window.innerHeight - 8) y = window.innerHeight - r.height - 8;
    if (x < 0) x = 0;
    if (y < 0) y = 0;
    menu.style.left = x + 'px'; menu.style.top = y + 'px';
  });

  setTimeout(() => {
    const close = (ev) => { if (menu.parentNode && menu.contains(ev.target)) return; closeMsgCtxMenu(); };
    _ctxMenuCloseFn = close;
    document.addEventListener('mousedown', close);
  }, 0);
}

function closeMsgCtxMenu() {
  if (_ctxMenuCloseFn) { document.removeEventListener('mousedown', _ctxMenuCloseFn); _ctxMenuCloseFn = null; }
  const m = document.getElementById('msgCtxMenu'); if (m) m.remove();
}

function insertAndSend(text) { if (typeof clearUpload === 'function') clearUpload(); msgInput.value = text; sendMessage(); }
function handleCardAction(action, data) {
  if (!activeChannel || activeChannel === 'group') return;
  const prompt = data || action;
  if (prompt) insertAndSend(prompt);
}

/* ── Block-Based Message Renderer (P3.2 Core) ── */
function renderBlocks(blocks) {
  if (!blocks || !blocks.length) return '';
  return blocks.map(b => _renderBlock(b)).join('');
}

function _renderBlock(block) {
  switch (block.type) {
    case 'text': return renderMarkdown(block.content || '');
    case 'heading': return `<h${Math.min(block.level||3,6)} class="blk-heading">${esc(block.content || '')}</h${Math.min(block.level||3,6)}>`;
    case 'image': return _renderImageBlock(block);
    case 'table': return _renderTableBlock(block);
    case 'code': return _renderCodeBlock(block);
    case 'actions': return _renderActionsBlock(block);
    case 'divider': return '<hr class="blk-divider" />';
    case 'card': return renderCard(block);
    case 'quote': return `<blockquote class="blk-quote">${renderMarkdown(block.content || '')}</blockquote>`;
    case 'list': return _renderListBlock(block);
    default: return block.content ? renderMarkdown(block.content) : '';
  }
}

function _safeUrl(url) {
  const u = (url || '').trim();
  return /^https?:\/\//i.test(u) ? escH(u) : '';
}

function _renderImageBlock(b) {
  const src = _safeUrl(b.url || b.src || '');
  if (!src) return '';
  const cap = b.caption ? `<div class="md-img-caption">${esc(b.caption)}</div>` : '';
  return `<div class="md-img-wrap"><img data-lazy-src="${src}" alt="${escH(b.caption || b.alt || '')}" class="lazy-media" onclick="openLightbox(this.src||this.dataset.lazySrc)" />${cap}</div>`;
}

function _renderTableBlock(b) {
  if (!b.headers || !b.rows) return '';
  let h = '<div class="md-table-wrap"><table><thead><tr>';
  for (const th of b.headers) h += `<th>${esc(String(th))}</th>`;
  h += '</tr></thead><tbody>';
  for (const row of b.rows) {
    h += '<tr>';
    const cells = Array.isArray(row) ? row : Object.values(row);
    for (const td of cells) h += `<td>${esc(String(td ?? ''))}</td>`;
    h += '</tr>';
  }
  h += '</tbody></table></div>';
  return h;
}

function _renderCodeBlock(b) {
  const lang = b.language || b.lang || '';
  const text = b.content || b.code || '';
  if (lang === 'mermaid' && typeof _renderMermaidContainer === 'function') {
    return _renderMermaidContainer(text);
  }
  let highlighted;
  if (lang && typeof hljs !== 'undefined' && hljs.getLanguage(lang)) {
    try { highlighted = hljs.highlight(text, { language: lang }).value; } catch { highlighted = escH(text); }
  } else if (typeof hljs !== 'undefined') {
    try { highlighted = hljs.highlightAuto(text).value; } catch { highlighted = escH(text); }
  } else {
    highlighted = escH(text);
  }
  const safeLang = escH(lang || 'code');
  return `<div class="md-code-block"><div class="md-code-header"><span class="md-code-lang">${safeLang}</span><button class="md-code-copy" onclick="copyCodeBlock(this)">${t('common.copy') || 'Copy'}</button></div><pre><code class="${lang ? 'hljs language-' + escH(lang) : 'hljs'}">${highlighted}</code></pre></div>`;
}

function _renderActionsBlock(b) {
  const buttons = b.buttons || b.actions || [];
  if (!buttons.length) return '';
  const btns = buttons.map(a => {
    const label = esc(a.label || a.text || '');
    if (a.action === 'open_url' || a.url) { const u = _safeUrl(a.url); if (!u) return ''; return `<a class="rc-action-btn" href="${u}" target="_blank" rel="noopener">${label}</a>`; }
    if (a.action === 'copy') return `<button class="rc-action-btn" onclick="navigator.clipboard.writeText('${escJs(a.data || a.text || '')}');showToastMsg('${escJs(t('common.copied') || 'Copied')}')">${label}</button>`;
    const sendText = a.data || a.text || a.label || '';
    return `<button class="rc-action-btn rc-action-send" onclick="handleCardAction('${escJs(a.action || 'send')}','${escJs(sendText)}')">${label}</button>`;
  }).join('');
  const title = b.title ? `<div class="rc-action-title">${esc(b.title)}</div>` : '';
  return `<div class="rich-card rc-action">${title}<div class="rc-action-btns">${btns}</div></div>`;
}

function _renderListBlock(b) {
  const items = b.items || [];
  if (!items.length) return '';
  const ordered = b.ordered;
  const tag = ordered ? 'ol' : 'ul';
  return `<${tag} class="blk-list">${items.map(i => `<li>${esc(String(i))}</li>`).join('')}</${tag}>`;
}

/* ── Workflow System Message Enhancement ── */
function renderRichSystemMsg(m) {
  const text = m.text || '';
  if (text.startsWith('🚀')) return `<div class="msg system"><div class="msg-bubble rc-sys rc-sys-start">${esc(text)}</div></div>`;
  if (text.startsWith('📋')) return `<div class="msg system"><div class="msg-bubble rc-sys rc-sys-step">${esc(text)}</div></div>`;
  if (text.startsWith('⏸')) return `<div class="msg system"><div class="msg-bubble rc-sys rc-sys-wait">${esc(text)}</div></div>`;
  if (text.startsWith('🎉')) return `<div class="msg system"><div class="msg-bubble rc-sys rc-sys-done">${esc(text)}</div></div>`;
  if (text.startsWith('❌')) return `<div class="msg system"><div class="msg-bubble rc-sys rc-sys-error">${esc(text)}</div></div>`;
  if (text.startsWith('⏭')) return `<div class="msg system"><div class="msg-bubble rc-sys rc-sys-skip">${esc(text)}</div></div>`;
  return null;
}
