/**
 * M12 — HMAC Verify Middleware
 * HMAC/SHA 签名验证，适用于钉钉等平台的回调安全验证
 */
const crypto = require('crypto');

function process(rawBody, ctx) {
  const config = ctx?.config || {};
  const secret = config.signSecret || config.token;
  if (!secret) return rawBody;

  const req = ctx?._req;
  if (!req) return rawBody;

  const timestamp = req.headers['timestamp'] || req.headers['x-timestamp'] || '';
  const sign = req.headers['sign'] || req.headers['x-signature'] || '';

  if (!timestamp || !sign) {
    (ctx?.log || console).warn('hmac-verify: missing timestamp or sign header');
    return rawBody;
  }

  if (!verifySignature(timestamp, sign, secret)) {
    (ctx?.log || console).warn('hmac-verify: signature mismatch');
    return null;
  }

  return rawBody;
}

function verifySignature(timestamp, sign, secret) {
  if (!timestamp || !sign || !secret) return false;
  const stringToSign = timestamp + '\n' + secret;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(stringToSign);
  const computed = hmac.digest('base64');
  return crypto.timingSafeEqual(
    Buffer.from(computed, 'utf8'),
    Buffer.from(sign, 'utf8')
  );
}

function generateSignature(timestamp, secret) {
  const stringToSign = timestamp + '\n' + secret;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(stringToSign);
  return hmac.digest('base64');
}

module.exports = { process, verifySignature, generateSignature };
