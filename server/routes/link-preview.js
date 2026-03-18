const { jsonRes, isOwnerReq } = require('../middleware/auth');

const cache = new Map();
const MAX_CACHE = 200;
const CACHE_TTL = 3600_000;

function cleanCache() {
  if (cache.size <= MAX_CACHE) return;
  const entries = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts);
  const removeCount = cache.size - MAX_CACHE + 20;
  for (let i = 0; i < removeCount; i++) cache.delete(entries[i][0]);
}

const MAX_BODY = 100_000;

async function fetchOG(url, _depth) {
  const depth = _depth || 0;
  if (depth > 3) return null;

  const cached = cache.get(url);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);

  try {
    const resp = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; XiajiaoIM-LinkBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      redirect: 'manual',
    });

    if ([301, 302, 303, 307, 308].includes(resp.status)) {
      clearTimeout(timer);
      const loc = resp.headers.get('location');
      if (!loc) return null;
      const resolved = resolveUrl(url, loc);
      if (isPrivateUrl(resolved)) return null;
      return fetchOG(resolved, depth + 1);
    }

    if (!resp.ok) { clearTimeout(timer); return null; }

    const cl = parseInt(resp.headers.get('content-length') || '0', 10);
    if (cl > MAX_BODY) { clearTimeout(timer); return null; }

    const ct = resp.headers.get('content-type') || '';
    if (!ct.includes('text/html') && !ct.includes('xhtml')) { clearTimeout(timer); return null; }

    const body = await resp.text();
    clearTimeout(timer);
    const html = body.slice(0, 50000);

    const title = extractMeta(html, 'og:title') || extractMeta(html, 'twitter:title') || extractTitle(html);
    const description = extractMeta(html, 'og:description') || extractMeta(html, 'twitter:description') || extractMeta(html, 'description', true);
    const image = extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image');

    if (!title) return null;

    let absImage = image ? resolveUrl(url, image) : '';
    if (absImage && (!/^https?:\/\//i.test(absImage) || absImage.length > 2000)) absImage = '';
    const data = { title: title.slice(0, 200), description: (description || '').slice(0, 300), image: absImage };

    cache.set(url, { data, ts: Date.now() });
    cleanCache();

    return data;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

function extractMeta(html, property, isName) {
  const attr = isName ? 'name' : 'property';
  const ep = escRe(property);
  const patterns = [
    new RegExp(`<meta[^>]+${attr}="${ep}"[^>]+content="([^"]*)"`, 'i'),
    new RegExp(`<meta[^>]+${attr}='${ep}'[^>]+content='([^']*)'`, 'i'),
    new RegExp(`<meta[^>]+${attr}="${ep}"[^>]+content='([^']*)'`, 'i'),
    new RegExp(`<meta[^>]+${attr}='${ep}'[^>]+content="([^"]*)"`, 'i'),
    new RegExp(`<meta[^>]+content="([^"]*)"[^>]+${attr}="${ep}"`, 'i'),
    new RegExp(`<meta[^>]+content='([^']*)'[^>]+${attr}='${ep}'`, 'i'),
    new RegExp(`<meta[^>]+content="([^"]*)"[^>]+${attr}='${ep}'`, 'i'),
    new RegExp(`<meta[^>]+content='([^']*)'[^>]+${attr}="${ep}"`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return decodeEntities(m[1]);
  }
  return '';
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? decodeEntities(m[1].trim()) : '';
}

function decodeEntities(str) {
  return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function resolveUrl(base, rel) {
  if (rel.startsWith('http://') || rel.startsWith('https://')) return rel;
  try { return new URL(rel, base).href; } catch { return rel; }
}

function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

const BLOCKED_HOSTS = /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|0\.0\.0\.0|\[::1?\])$/i;

function isPrivateUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    if (!['http:', 'https:'].includes(parsed.protocol)) return true;
    return BLOCKED_HOSTS.test(parsed.hostname);
  } catch { return true; }
}

async function handle(req, res, urlPath, query) {
  if (urlPath === '/api/link-preview' && req.method === 'GET') {
    if (!isOwnerReq(req)) return jsonRes(res, 403, { error: 'auth required' });
    const url = query.get('url');
    if (!url) return jsonRes(res, 400, { error: 'url required' });

    try { new URL(url); } catch { return jsonRes(res, 400, { error: 'invalid url' }); }
    if (isPrivateUrl(url)) return jsonRes(res, 400, { error: 'private url not allowed' });

    const data = await fetchOG(url);
    if (!data) return jsonRes(res, 200, { title: '', description: '', image: '' });
    return jsonRes(res, 200, data);
  }
  return false;
}

module.exports = { handle };
