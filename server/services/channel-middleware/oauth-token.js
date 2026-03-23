/**
 * M9 — OAuth Token Middleware
 * 通用 Token 获取 + 缓存 + 自动刷新
 * 适用于所有需要 OAuth/Bearer Token 的平台（企微、飞书、钉钉、Telegram 等）
 */
const { createLogger } = require('../../middleware/logger');
const log = createLogger('oauth-token');

const _cache = new Map();

function _renderVars(tpl, vars) {
  if (typeof tpl === 'string') {
    return tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] !== undefined ? String(vars[key]) : '');
  }
  if (tpl && typeof tpl === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(tpl)) out[k] = _renderVars(v, vars);
    return out;
  }
  return tpl;
}

function _getByPath(obj, dotPath) {
  if (!obj || !dotPath) return undefined;
  let cur = obj;
  for (const p of dotPath.split('.')) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

async function getToken(mergedConfig, userConfig) {
  const authCfg = mergedConfig.auth;
  if (!authCfg || authCfg.type !== 'oauth-token') return null;

  const cacheKey = _renderVars(authCfg.cacheKey || 'default', userConfig);
  const cached = _cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const tokenUrl = _renderVars(authCfg.tokenUrl, userConfig);
  if (!tokenUrl) { log.warn('tokenUrl missing'); return null; }

  const tokenParams = _renderVars(authCfg.tokenParams || {}, userConfig);

  try {
    let res;
    if (authCfg.tokenMethod === 'POST') {
      res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokenParams),
        signal: AbortSignal.timeout(10000),
      });
    } else {
      const url = new URL(tokenUrl);
      for (const [k, v] of Object.entries(tokenParams)) url.searchParams.set(k, v);
      res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    }

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      log.error(`token request failed: HTTP ${res.status} ${errBody.slice(0, 200)}`);
      return null;
    }

    const data = await res.json();
    const token = _getByPath(data, authCfg.tokenPath || 'access_token');
    const expiresIn = _getByPath(data, authCfg.expiresPath || 'expires_in') || 7200;

    if (!token) {
      log.error('token not found at path:', authCfg.tokenPath, 'response:', JSON.stringify(data).slice(0, 300));
      return null;
    }

    _cache.set(cacheKey, { token, expiresAt: Date.now() + (expiresIn - 300) * 1000 });
    log.info(`token obtained for "${cacheKey}" (expires in ${expiresIn}s)`);
    return token;
  } catch (e) {
    log.error('token fetch error:', e.message);
    return null;
  }
}

function clearCache(cacheKey) {
  if (cacheKey) _cache.delete(cacheKey);
  else _cache.clear();
}

module.exports = { getToken, clearCache };
