/* 虾饺 (Xiajiao) — Storage Abstraction (Layer 0) */

function storageSet(key, val) {
  try { localStorage.setItem(key, val); } catch {}
  try { document.cookie = encodeURIComponent(key) + '=' + encodeURIComponent(val) + ';path=/;max-age=31536000;SameSite=Lax'; } catch {}
}
function storageGet(key) {
  try { const v = localStorage.getItem(key); if (v) return v; } catch {}
  try { const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)')); if (m) return decodeURIComponent(m[1]); } catch {}
  return null;
}
function storageRemove(key) {
  try { localStorage.removeItem(key); } catch {}
  try { document.cookie = encodeURIComponent(key) + '=;path=/;max-age=0;SameSite=Lax'; } catch {}
}
