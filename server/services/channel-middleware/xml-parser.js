/**
 * M12 — XML Parser Middleware
 * XML → JSON 转换，适用于微信系平台的 Webhook 回调
 * 轻量实现，不依赖外部 XML 库
 */

function process(rawBody, ctx) {
  if (typeof rawBody !== 'string') return rawBody;
  const trimmed = rawBody.trim();
  if (!trimmed.startsWith('<')) return rawBody;

  try {
    return _parseXml(trimmed);
  } catch (e) {
    (ctx?.log || console).warn('XML parse failed:', e.message);
    return rawBody;
  }
}

function _parseXml(xml) {
  const result = {};
  const tagRe = /<(\w+)>([\s\S]*?)<\/\1>/g;
  let match;

  while ((match = tagRe.exec(xml)) !== null) {
    const key = match[1];
    let value = match[2].trim();

    if (value.startsWith('<![CDATA[') && value.endsWith(']]>')) {
      value = value.slice(9, -3);
    }

    if (value.includes('<') && value.includes('>')) {
      value = _parseXml(value);
    }

    result[key] = value;
  }

  return result;
}

module.exports = { process };
