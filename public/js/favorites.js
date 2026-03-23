/* 虾饺 (Xiajiao) — Favorites Module (Layer 2) */

let _activeFavId = null;
let _favCache = [];

function getFavorites() { return _favCache; }
function saveFavorites(arr) {
  _favCache = arr;
  authFetch('/api/user/favorites', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ favorites: arr }) }).catch(() => {});
}
function isFavorited(favId) { return getFavorites().some(f => f.id === favId); }
function toggleFav(favId, event) {
  if (event) { event.stopPropagation(); event.preventDefault(); }
  const favs = getFavorites(), idx = favs.findIndex(f => f.id === favId);
  if (idx >= 0) { favs.splice(idx, 1); saveFavorites(favs); showToastMsg(t('fav.unfavorited')); }
  else { const [ts, sender] = [favId.split('_')[0], favId.split('_').slice(1).join('_')]; const m = allMessages.find(x => String(x.ts) === ts && (x.agent === sender || x.userId === sender)); if (!m) return; const isAg = m.type === 'agent', ag = isAg ? AGENTS.find(a => a.id === m.agent) : null, chInfo = resolveChannelInfo(m.channel || 'group'); const mFiles = m.files || (m.file ? [m.file] : []); favs.unshift({ id: favId, text: m.text || '', senderName: isAg ? (ag?.name || 'Agent') : (m.userName || me?.name || t('profile.user')), senderEmoji: isAg ? (ag?.emoji || '\u{1F916}') : (me?.avatar || ''), senderColor: isAg ? (ag?.color || '#00d4ff') : (m.userColor || me?.color || '#00d4ff'), isAgent: isAg, ts: m.ts, channel: m.channel || 'group', channelName: chInfo?.name || '', file: mFiles[0] || null, files: mFiles.length ? mFiles : undefined, savedAt: Date.now() }); saveFavorites(favs); showToastMsg(t('fav.favorited')); }
  const isFav = isFavorited(favId), btn = event?.target || document.querySelector(`[data-fav="${favId}"]`);
  if (btn) { btn.className = 'msg-action-btn' + (isFav ? ' fav-on' : ''); btn.textContent = isFav ? '\u2605' : '\u2606'; btn.title = isFav ? t('fav.unfavTitle') : t('fav.favTitle'); }
  if (activeTab === 'favorites') { renderFavItems(); if (_activeFavId === favId && !isFav) { _activeFavId = null; _showFavWelcome(); } }
}

let favSearchQuery = '';

function renderFavorites() {
  const pf = document.getElementById('panelFavorites'); if (!pf) return;
  pf.innerHTML = '<div class="chat-search"><input class="chat-search-input" placeholder="' + t('fav.searchPlaceholder') + '" value="' + escH(favSearchQuery) + '" oninput="favSearchQuery=this.value;renderFavItems()" /></div><div id="favListItems"></div>';
  renderFavItems();
}

function renderFavItems() {
  const c = document.getElementById('favListItems'); if (!c) return;
  let favs = getFavorites();
  if (favSearchQuery) { const q = favSearchQuery.toLowerCase(); favs = favs.filter(f => (f.text||'').toLowerCase().includes(q) || (f.senderName||'').toLowerCase().includes(q) || (f.channelName||'').toLowerCase().includes(q) || (f.files||[]).some(x=>(x.name||'').toLowerCase().includes(q)) || (f.file?.name||'').toLowerCase().includes(q)); }
  if (!favs.length) { c.innerHTML = '<div class="chat-list-empty"><div class="empty-icon">&#11088;</div><p>' + (favSearchQuery ? t('fav.noMatch') : t('fav.emptyTitle') + '<br>' + t('fav.emptyHint')) + '</p></div>'; return; }
  c.innerHTML = '<div class="fav-list">' + favs.map(f => {
    const avC = f.senderEmoji || (f.senderName||'?')[0];
    const avB = f.senderEmoji ? 'transparent' : (f.senderColor||'#00d4ff');
    const favFiles = f.files || (f.file ? [f.file] : []);
    const preview = f.text ? esc(truncate(f.text, 60)) : (favFiles.length ? '\u{1F4C4} ' + esc(favFiles.map(x=>x.name).join(', ')) : '');
    const active = f.id === _activeFavId ? ' active' : '';
    const sfid = escJs(f.id);
    const delBtn = `<button class="fav-del" onclick="event.stopPropagation();removeFav('${sfid}')" title="${t('common.delete')}">&times;</button>`;
    const fileLinks = favFiles.map(x => `<div class="fav-file"><a href="${escH(x.url)}" target="_blank" onclick="event.stopPropagation()">\u{1F4CE} ${esc(x.name)}</a></div>`).join('');
    return `<div class="fav-item${active}" onclick="showFavDetail('${sfid}')"><div class="fav-header"><div class="fav-avatar" style="background:${avB}">${avC}</div><span class="fav-sender">${esc(f.senderName)}</span><span class="fav-time">${formatMsgTime(f.ts)}</span>${delBtn}</div><div class="fav-content">${preview}</div>${fileLinks}<div class="fav-from">${t('fav.from')}${esc(f.channelName)}</div></div>`;
  }).join('') + '</div>';
}

function showFavDetail(favId) {
  const favs = getFavorites();
  const f = favs.find(x => x.id === favId);
  if (!f) return;

  _activeFavId = favId;
  renderFavItems();

  hideAllViews();
  const view = document.getElementById('favDetailView');
  view.classList.remove('hidden'); view.style.display = 'flex';

  const nameEl = document.getElementById('favDetailName');
  const metaEl = document.getElementById('favDetailMeta');
  const actEl = document.getElementById('favDetailActions');
  const bodyEl = document.getElementById('favDetailBody');

  nameEl.textContent = f.senderName;
  metaEl.textContent = formatMsgTime(f.ts) + (f.channelName ? ' \u00B7 ' + f.channelName : '');

  let actHtml = `<button onclick="favDetailCopy()">${t('fav.copy') || '\u{1F4CB} \u590D\u5236'}</button>`
    + `<button onclick="favDetailGoto()">${t('fav.goto') || '\u{1F4AC} \u8DF3\u8F6C\u4F1A\u8BDD'}</button>`;
  actHtml += `<button class="btn-danger" onclick="favDetailRemove()">${t('fav.remove') || '\u2716 \u53D6\u6D88\u6536\u85CF'}</button>`;
  actEl.innerHTML = actHtml;

  const avC = f.senderEmoji || (f.senderName||'?')[0];
  const avB = f.senderEmoji ? 'transparent' : (f.senderColor||'#00d4ff');
  const fullTime = new Date(f.ts).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });

  let html = `<div class="fav-detail-sender"><div class="fav-detail-sender-avatar" style="background:${avB}">${avC}</div><div class="fav-detail-sender-info"><div class="fav-detail-sender-name">${esc(f.senderName)}</div><div class="fav-detail-sender-time">${fullTime}</div></div></div>`;

  if (f.text) {
    html += `<div class="fav-detail-text md-content">${renderMarkdown(f.text)}</div>`;
  }

  const detailFiles = f.files || (f.file ? [f.file] : []);
  for (const df of detailFiles) {
    const icon = df.name.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i) ? '\u{1F5BC}\uFE0F' : '\u{1F4CE}';
    html += `<div class="fav-detail-attachment">${icon} <a href="${escH(df.url)}" target="_blank">${esc(df.name)}</a>`;
    if (df.size) html += `<span style="color:var(--text3);font-size:12px">(${formatSize(df.size)})</span>`;
    html += '</div>';
    if (df.name.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
      html += `<div style="margin-top:12px"><img src="${escH(df.url)}" style="max-width:100%;max-height:400px;border-radius:8px;border:1px solid var(--border)" /></div>`;
    }
  }

  html += `<div class="fav-detail-channel">\u{1F4C1} ${t('fav.from')}${esc(f.channelName || t('fav.unknownChannel') || '\u672A\u77E5\u9891\u9053')}</div>`;

  bodyEl.innerHTML = html;
}

function favDetailCopy() {
  const f = getFavorites().find(x => x.id === _activeFavId);
  if (!f) return;
  navigator.clipboard.writeText(f.text || '').then(() => showToastMsg(t('fav.copied') || '\u5DF2\u590D\u5236'));
}

function favDetailGoto() {
  const f = getFavorites().find(x => x.id === _activeFavId);
  if (!f || !f.channel) return;
  if (resolveChannelInfo(f.channel)) {
    saveDraft(); activeChannel = f.channel; switchTab('chats');
  } else {
    showToastMsg(t('fav.channelGone') || '\u8BE5\u4F1A\u8BDD\u5DF2\u4E0D\u5B58\u5728', 'warning');
  }
}

function favDetailRemove() {
  if (!_activeFavId) return;
  saveFavorites(getFavorites().filter(x => x.id !== _activeFavId));
  showToastMsg(t('fav.deleted'));
  _activeFavId = null;
  renderFavItems();
  _showFavWelcome();
}

function _showFavWelcome() {
  hideAllViews();
  welcomeScreen.classList.remove('hidden');
  welcomeScreen.style.display = 'flex';
}

function removeFav(favId) {
  saveFavorites(getFavorites().filter(f => f.id !== favId));
  renderFavItems();
  showToastMsg(t('fav.deleted'));
  if (_activeFavId === favId) { _activeFavId = null; _showFavWelcome(); }
}
