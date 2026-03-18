/* OpenClaw i18n Engine */
var I18N = window.I18N || {};
let _lang = 'zh';

function t(key, params) {
  const dict = I18N[_lang] || I18N['zh'] || {};
  let val = key.split('.').reduce((o, k) => o && o[k], dict);
  if (val === undefined || val === null) {
    val = key.split('.').reduce((o, k) => o && o[k], I18N['zh'] || {});
  }
  if (val === undefined || val === null) return key;
  if (params) {
    Object.keys(params).forEach(k => {
      val = val.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
    });
  }
  return val;
}

function getLang() { return _lang; }

function setLang(lang) {
  _lang = lang;
  window._i18nLang = lang;
  try { localStorage.setItem('im-lang', lang); } catch {}
  document.documentElement.setAttribute('lang', lang === 'zh' ? 'zh-CN' : 'en');
  refreshI18nDOM();
}

function detectLang() {
  try { const saved = localStorage.getItem('im-lang'); if (saved) return saved; } catch {}
  var nav = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
  return nav.startsWith('zh') ? 'zh' : 'en';
}

function refreshI18nDOM() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val && val !== key) el.textContent = val;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const val = t(key);
    if (val && val !== key) el.placeholder = val;
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const val = t(key);
    if (val && val !== key) el.title = val;
  });
}

function toggleLang() {
  setLang(_lang === 'zh' ? 'en' : 'zh');
  if (typeof renderChatList === 'function') renderChatList();
  if (typeof renderContacts === 'function') renderContacts();
  if (typeof updateOwnerUI === 'function') updateOwnerUI();
  if (activeChannel && typeof switchChannel === 'function') switchChannel(activeChannel);
  if (activeTab === 'community' && typeof renderCommunityNav === 'function') renderCommunityNav();
  if (activeTab === 'favorites' && typeof renderFavorites === 'function') renderFavorites();
}

_lang = detectLang();
window._i18nLang = _lang;
document.addEventListener('DOMContentLoaded', function() {
  refreshI18nDOM();
});
