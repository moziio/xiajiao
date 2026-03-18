/* 虾饺 (Xiajiao) — Login & Auth Module */

async function doOwnerLogin() {
  const name = nameInput.value.trim();
  if (!name) { nameInput.focus(); return; }
  const key = $('#ownerKeyInput')?.value || '';
  if (!key) { $('#loginMsg').textContent = t('login.enterKey'); return; }
  $('#loginMsg').textContent = t('login.verifying');
  try {
    const r = await (await authFetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) })).json();
    if (!r.ok) { $('#loginMsg').textContent = r.error || t('login.keyError'); return; }
    ownerToken = r.token;
    myRole = r.role || 'owner';
    isOwner = myRole === 'owner';
    storageSet('im-owner-token', ownerToken);
    storageSet('im-owner-name', name);
    storageSet('im-user-role', myRole);
    storageRemove('im-guest-name');
    enterApp(name);
  } catch { $('#loginMsg').textContent = t('login.connectFail'); }
}

function doGuestLogin() {
  const name = nameInput.value.trim();
  if (!name) { nameInput.focus(); return; }
  ownerToken = '';
  myRole = 'guest';
  storageRemove('im-owner-token');
  storageRemove('im-owner-name');
  storageRemove('im-user-role');
  storageSet('im-guest-name', name);
  enterApp(name);
}

function enterApp(name) {
  let id = storageGet('im-user-id');
  let color = storageGet('im-user-color');
  if (!id) { id = 'u-' + Date.now(); storageSet('im-user-id', id); }
  if (!color) { color = randomColor(); storageSet('im-user-color', color); }
  me = { id, name, color, avatar: storageGet('im-user-avatar') || '', avatarImg: storageGet('im-user-avatar-img') || '' };
  _myUserId = id;
  loginPage.classList.add('hidden'); appPage.classList.remove('hidden');
  updateOwnerUI(); updateUserBar();
  connect(); loadModels(); loadTopics();
}

function updateUserBar() {
  const avEl = document.getElementById('userAvatarEl'), nmEl = document.getElementById('userNameEl');
  if (avEl) {
    if (me?.avatarImg) { avEl.textContent = ''; avEl.style.background = `url(${me.avatarImg}) center/cover`; }
    else if (me?.avatar) { avEl.textContent = me.avatar; avEl.style.background = 'transparent'; }
    else { avEl.textContent = (me?.name || '?')[0].toUpperCase(); avEl.style.background = me?.color || '#00d4ff'; }
  }
  if (nmEl) nmEl.textContent = me?.name || t('profile.user');
}

function getUserAvatarHtml() {
  if (me?.avatarImg) return { html: '', bg: `url(${me.avatarImg}) center/cover no-repeat` };
  if (me?.avatar) return { html: me.avatar, bg: 'transparent' };
  return { html: (me?.name || '?')[0].toUpperCase(), bg: me?.color || '#00d4ff' };
}

function editMyAvatar() {
  const ct = document.getElementById('groupSideContent');
  const panel = document.getElementById('groupSidePanel');
  if (!ct || !panel) return;
  const ua = getUserAvatarHtml();
  let h = '<div class="sp-header"><span class="sp-title">' + t('panel.myAvatar') + '</span><button class="sp-close" onclick="closeGroupPanel()">&times;</button></div>';
  h += '<div class="sp-body"><div class="sp-section sp-agent-card"><div class="sp-avatar-big sp-avatar-edit" style="background:' + ua.bg + ';border-color:' + (me?.color || '#00d4ff') + ';font-size:36px">' + ua.html + '</div><div class="sp-agent-name">' + esc(me?.name || t('profile.user')) + '</div></div>';
  h += '<div class="sp-section"><div class="sp-upload-row"><button class="sp-upload-btn" onclick="document.getElementById(\'avatarFileInput\').click()">' + t('panel.uploadPhoto') + '</button><input type="file" id="avatarFileInput" hidden accept="image/*" onchange="handleAvatarUpload(this)"></div></div>';
  h += '<div class="sp-section"><div class="sp-note-label">' + t('panel.selectEmoji') + '</div><div class="sp-emoji-grid">';
  h += EMOJI_PICKS.map(e => '<div class="sp-emoji-cell" onclick="setMyAvatar(\'' + e + '\')">' + e + '</div>').join('');
  h += '</div></div></div>';
  ct.innerHTML = h; panel.classList.add('open');
}

function setMyAvatar(emoji) {
  storageSet('im-user-avatar', emoji); storageRemove('im-user-avatar-img');
  if (me) { me.avatar = emoji; me.avatarImg = ''; }
  updateUserBar(); showToastMsg(t('panel.avatarUpdated'));
  closeGroupPanel(); renderMessages();
}

function handleAvatarUpload(input) {
  const file = input.files?.[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const size = 80;
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2, sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      storageSet('im-user-avatar-img', dataUrl); storageRemove('im-user-avatar');
      if (me) { me.avatarImg = dataUrl; me.avatar = ''; }
      updateUserBar(); showToastMsg(t('panel.avatarUpdated'));
      closeGroupPanel(); renderMessages();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function updateOwnerUI() {
  const badge = $('#ownerBadge');
  const logoutBtn = document.getElementById('logoutBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  if (badge) {
    badge.classList.toggle('hidden', myRole === 'guest');
    if (myRole !== 'guest') {
      const icons = { owner: '\u2605 ', admin: '\u2606 ', member: '' };
      badge.textContent = (icons[myRole] || '') + (t('role.' + myRole) || myRole);
    }
  }
  if (logoutBtn) logoutBtn.classList.remove('hidden');
  if (settingsBtn) settingsBtn.classList.toggle('hidden', !isOwner);
}

function updateOnlineIndicator() {
  const countEl = document.getElementById('onlineCount');
  if (countEl) countEl.textContent = onlineUsers.length;
  const panel = document.getElementById('onlinePanel');
  if (panel && !panel.classList.contains('hidden')) renderOnlinePanel();
}

function toggleOnlinePanel() {
  const panel = document.getElementById('onlinePanel');
  if (!panel) return;
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) renderOnlinePanel();
}

function renderOnlinePanel() {
  const panel = document.getElementById('onlinePanel');
  if (!panel) return;
  if (!onlineUsers.length) {
    panel.innerHTML = `<div class="olp-empty">${t('visitor.noUsers')}</div>`;
    return;
  }
  let h = `<div class="olp-title">${t('visitor.onlineTitle')} (${onlineUsers.length})</div>`;
  for (const u of onlineUsers) {
    const isSelf = u.id === me?.id;
    const role = t('role.' + (u.role || (u.isOwner ? 'owner' : 'guest'))) || (u.isOwner ? t('visitor.owner') : t('visitor.guest'));
    h += `<div class="olp-item${isSelf ? ' olp-self' : ''}"><span class="olp-dot"></span><span class="olp-name">${esc(u.name)}</span><span class="olp-role">${role}</span></div>`;
  }
  panel.innerHTML = h;
}

async function doLogout() {
  if (!await appConfirm(t('sidebar.logoutConfirm'))) return;
  if (ownerToken) authFetch('/api/auth', { method: 'DELETE' }).catch(() => {});
  ownerToken = '';
  isOwner = false;
  myRole = 'guest';
  storageRemove('im-owner-token');
  storageRemove('im-owner-name');
  storageRemove('im-guest-name');
  storageRemove('im-user-role');
  location.reload();
}

(async function tryAutoLogin() {
  const savedToken = storageGet('im-owner-token');
  const savedOwnerName = storageGet('im-owner-name');
  if (savedToken && savedOwnerName) {
    try {
      const r = await (await fetch('/api/auth/verify', { headers: { 'Authorization': 'Bearer ' + savedToken } })).json();
      if (r.role && r.role !== 'guest') {
        ownerToken = savedToken;
        myRole = r.role;
        isOwner = r.role === 'owner';
        storageSet('im-user-role', myRole);
        enterApp(savedOwnerName);
        return;
      }
      storageRemove('im-owner-token');
      storageRemove('im-owner-name');
      storageRemove('im-user-role');
    } catch {}
  }
  const savedGuestName = storageGet('im-guest-name');
  if (savedGuestName) enterApp(savedGuestName);
})();

nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') { const key = $('#ownerKeyInput')?.value || ''; key ? doOwnerLogin() : doGuestLogin(); } });
$('#ownerKeyInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') doOwnerLogin(); });
