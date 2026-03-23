/**
 * M12 — AES Crypto Middleware
 * AES-256-CBC 加解密，适用于企业微信/飞书的消息加密模式
 */
const crypto = require('crypto');

function process(rawBody, ctx) {
  const config = ctx?.config || {};
  const aesKey = config.encodingAESKey;
  if (!aesKey) return rawBody;

  let encrypted = null;
  if (typeof rawBody === 'string') {
    try {
      const parsed = JSON.parse(rawBody);
      encrypted = parsed.Encrypt || parsed.encrypt;
    } catch {
      encrypted = rawBody;
    }
  } else if (rawBody && typeof rawBody === 'object') {
    encrypted = rawBody.Encrypt || rawBody.encrypt;
  }

  if (!encrypted) return rawBody;

  try {
    const decrypted = _decrypt(encrypted, aesKey);
    try { return JSON.parse(decrypted); } catch { return decrypted; }
  } catch (e) {
    (ctx?.log || console).warn('AES decrypt failed:', e.message);
    return rawBody;
  }
}

function _decrypt(ciphertext, encodingAESKey) {
  const key = Buffer.from(encodingAESKey + '=', 'base64');
  const iv = key.subarray(0, 16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key.subarray(0, 32), iv);
  decipher.setAutoPadding(false);
  let decrypted = Buffer.concat([decipher.update(ciphertext, 'base64'), decipher.final()]);

  const padLen = decrypted[decrypted.length - 1];
  if (padLen >= 1 && padLen <= 32) {
    decrypted = decrypted.subarray(0, decrypted.length - padLen);
  }

  if (decrypted.length < 20) throw new Error('decrypted buffer too short');
  const contentLen = decrypted.readUInt32BE(16);
  if (contentLen > decrypted.length - 20) throw new Error('invalid content length');
  return decrypted.subarray(20, 20 + contentLen).toString('utf8');
}

function encrypt(plaintext, encodingAESKey, corpId) {
  const key = Buffer.from(encodingAESKey + '=', 'base64');
  const iv = key.subarray(0, 16);

  const random = crypto.randomBytes(16);
  const msg = Buffer.from(plaintext, 'utf8');
  const msgLen = Buffer.alloc(4);
  msgLen.writeUInt32BE(msg.length, 0);
  const corpBuf = Buffer.from(corpId || '', 'utf8');

  let data = Buffer.concat([random, msgLen, msg, corpBuf]);
  const padLen = 32 - (data.length % 32);
  data = Buffer.concat([data, Buffer.alloc(padLen, padLen)]);

  const cipher = crypto.createCipheriv('aes-256-cbc', key.subarray(0, 32), iv);
  cipher.setAutoPadding(false);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return encrypted.toString('base64');
}

module.exports = { process, encrypt };
