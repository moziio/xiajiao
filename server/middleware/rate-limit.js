/**
 * 轻量级速率限制（基于内存滑动窗口）
 * - HTTP API: 默认 120 次/分钟/IP
 * - WebSocket 消息: 默认 60 条/分钟/IP
 * - 自动清理过期窗口，防止内存泄漏
 */

const _buckets = new Map();
const _WINDOW_MS = 60 * 1000;
const _HTTP_LIMIT = 120;
const _WS_LIMIT = 60;

setInterval(() => {
  const cutoff = Date.now() - _WINDOW_MS * 2;
  for (const [key, bucket] of _buckets) {
    if (bucket.ts < cutoff) _buckets.delete(key);
  }
}, 120000);

function _getBucket(key) {
  const now = Date.now();
  let bucket = _buckets.get(key);
  if (!bucket || now - bucket.ts > _WINDOW_MS) {
    bucket = { count: 0, ts: now };
    _buckets.set(key, bucket);
  }
  return bucket;
}

function _getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || 'unknown';
}

function checkHttpRate(req) {
  const ip = _getIp(req);
  const bucket = _getBucket('http:' + ip);
  bucket.count++;
  return bucket.count <= _HTTP_LIMIT;
}

function checkWsRate(ws) {
  const ip = ws._socket?.remoteAddress || 'unknown';
  const bucket = _getBucket('ws:' + ip);
  bucket.count++;
  return bucket.count <= _WS_LIMIT;
}

module.exports = { checkHttpRate, checkWsRate };
