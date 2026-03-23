/* 虾饺 (Xiajiao) — Toast & Dialog (Layer 0) */

function showToastMsg(text, type) {
  const old = document.querySelector('.toast-notify');
  if (old) old.remove();
  const icons = { success: '\u2705', error: '\u274C', info: '\uD83D\uDCA1', warn: '\u26A0\uFE0F' };
  const cls = type === 'error' ? 'toast-error' : type === 'warn' ? 'toast-warn' : type === 'info' ? 'toast-info' : 'toast-success';
  const icon = icons[type] || icons.success;
  const toast = document.createElement('div');
  toast.className = 'toast-notify ' + cls;
  const closable = type === 'error' || type === 'warn';
  toast.innerHTML = '<span class="toast-icon">' + icon + '</span><span class="toast-text">' + esc(text) + '</span>'
    + (closable ? '<span class="toast-close" title="关闭">&times;</span>' : '');
  const dismiss = () => { toast.classList.remove('show'); setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300); };
  toast.onclick = dismiss;
  document.body.appendChild(toast);
  requestAnimationFrame(() => { requestAnimationFrame(() => toast.classList.add('show')); });
  const duration = type === 'error' ? 6000 : type === 'warn' ? 5000 : 2500;
  setTimeout(dismiss, duration);
}

function appAlert(msg) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'app-dialog-overlay';
    overlay.innerHTML = `<div class="app-dialog"><div class="app-dialog-body">${esc(msg)}</div><div class="app-dialog-actions"><button class="app-dialog-btn primary" id="dlgOk">${t('common.ok')}</button></div></div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('show')));
    const close = () => { overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 200); resolve(); };
    overlay.querySelector('#dlgOk').onclick = close;
    overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(); });
  });
}

function appConfirm(msg) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'app-dialog-overlay';
    overlay.innerHTML = `<div class="app-dialog"><div class="app-dialog-body">${esc(msg)}</div><div class="app-dialog-actions"><button class="app-dialog-btn" id="dlgCancel">${t('common.cancel')}</button><button class="app-dialog-btn primary" id="dlgOk">${t('common.ok')}</button></div></div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('show')));
    const close = (val) => { overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 200); resolve(val); };
    overlay.querySelector('#dlgOk').onclick = () => close(true);
    overlay.querySelector('#dlgCancel').onclick = () => close(false);
    overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(false); });
  });
}

function appConfirmRich(html) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'app-dialog-overlay';
    overlay.innerHTML = `<div class="app-dialog"><div class="app-dialog-body app-dialog-rich">${html}</div><div class="app-dialog-actions"><button class="app-dialog-btn" id="dlgCancel">${t('common.cancel')}</button><button class="app-dialog-btn primary" id="dlgOk">${t('common.ok')}</button></div></div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('show')));
    const close = (val) => { overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 200); resolve(val); };
    overlay.querySelector('#dlgOk').onclick = () => close(true);
    overlay.querySelector('#dlgCancel').onclick = () => close(false);
    overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(false); });
  });
}

function appPrompt(msg, defaultVal, placeholder) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'app-dialog-overlay';
    overlay.innerHTML = `<div class="app-dialog"><div class="app-dialog-body">${esc(msg)}</div><input class="app-dialog-input" id="dlgInput" value="${escH(defaultVal || '')}" placeholder="${escH(placeholder || '')}" /><div class="app-dialog-actions"><button class="app-dialog-btn" id="dlgCancel">${t('common.cancel')}</button><button class="app-dialog-btn primary" id="dlgOk">${t('common.ok')}</button></div></div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('show')));
    const input = overlay.querySelector('#dlgInput');
    setTimeout(() => { input.focus(); input.select(); }, 50);
    const close = (val) => { overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 200); resolve(val); };
    overlay.querySelector('#dlgOk').onclick = () => close(input.value);
    overlay.querySelector('#dlgCancel').onclick = () => close(null);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') close(input.value); if (e.key === 'Escape') close(null); });
    overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(null); });
  });
}
