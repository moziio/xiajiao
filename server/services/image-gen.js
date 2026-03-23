const store = require('./storage');
const { createLogger } = require('../middleware/logger');
const log = createLogger('image-gen');

const IMG_GEN_RE = /\[IMG_GEN:\s*([^\]]+)\]/g;

function isEnabled() {
  const routing = store.getCapabilityRouting();
  return !!routing.image_gen;
}

function hasMarker(text) {
  IMG_GEN_RE.lastIndex = 0;
  return IMG_GEN_RE.test(text);
}

function resolveModel(modelId) {
  store.loadModels();
  const model = (store.localModels.models || []).find(m => m.id === modelId);
  if (!model) return null;
  const provider = (store.localModels.providers || {})[model.provider];
  if (!provider) return null;
  return { model, provider };
}

async function processText(text, onProgress, overrideModelId) {
  const imageModelId = overrideModelId || store.getCapabilityRouting().image_gen;
  if (!imageModelId) return text;

  const resolved = resolveModel(imageModelId);
  if (!resolved) {
    log.warn('image_gen model not found in capabilityRouting:', imageModelId);
    IMG_GEN_RE.lastIndex = 0;
    return text.replace(IMG_GEN_RE, '[图片生成不可用: 模型未找到，请在「模型→能力路由」中重新配置文生图模型]');
  }

  const { model, provider } = resolved;
  const apiType = detectImageApiType(model, provider);

  IMG_GEN_RE.lastIndex = 0;
  const matches = [];
  let m;
  while ((m = IMG_GEN_RE.exec(text)) !== null) {
    matches.push({ full: m[0], prompt: m[1].trim(), index: m.index });
  }

  if (!matches.length) return text;

  let result = text;
  const total = matches.length;
  for (let idx = matches.length - 1; idx >= 0; idx--) {
    const match = matches[idx];
    const progress = total - idx;
    try {
      log.info(`generating [${progress}/${total}]: "${match.prompt}" via ${model.id} (${apiType})`);
      if (onProgress) {
        const placeholder = result.slice(0, match.index) + `⏳ 正在生成图片 (${progress}/${total}): ${match.prompt}...` + result.slice(match.index + match.full.length);
        onProgress({ currentText: placeholder, progress, total, prompt: match.prompt });
      }
      const url = await callImageApi(apiType, provider, model, match.prompt);
      if (url) {
        result = result.slice(0, match.index) + `![${match.prompt}](${url})` + result.slice(match.index + match.full.length);
      }
    } catch (err) {
      log.error(`failed for "${match.prompt}":`, err.message);
      result = result.slice(0, match.index) + `[图片生成失败: ${err.message}]` + result.slice(match.index + match.full.length);
    }
  }
  return result;
}

function _apiModelId(model) {
  return (model.id || model.name || '').split('/').pop();
}

function detectImageApiType(model, provider) {
  if (model.api) return model.api;
  const modelName = _apiModelId(model).toLowerCase();
  if (/qwen-image/.test(modelName)) return 'dashscope-multimodal';
  if (/cogview|seedream|hunyuan-image|dall-e|dalle/.test(modelName)) return 'openai-image';
  if (/z-image|gpt-4o|gemini/.test(modelName)) return 'chat-image';
  if (/wanx|stable-diffusion|flux|kolors/.test(modelName)) return 'dashscope-image';
  const provApi = (provider.api || '').toLowerCase();
  if (/image/.test(provApi)) return provApi;
  return 'chat-image';
}

async function callImageApi(apiType, provider, model, prompt, signal) {
  if (apiType === 'openai-image' || apiType === 'openai-images') {
    return await callOpenAIImage(provider, model, prompt, signal);
  }
  if (apiType === 'dashscope-multimodal') {
    return await callDashScopeMultimodal(provider, model, prompt, signal);
  }
  if (apiType === 'chat-image') {
    return await callChatImage(provider, model, prompt, signal);
  }
  if (apiType === 'dashscope-image') {
    return await callDashScopeImage(provider, model, prompt, signal);
  }
  return await callChatImage(provider, model, prompt, signal);
}

async function generateDirect(provider, model, prompt, signal) {
  const apiType = detectImageApiType(model, provider);
  log.info(`generateDirect: model="${model.name || model.id}" apiType="${apiType}" prompt="${prompt.slice(0, 60)}"`);
  return await callImageApi(apiType, provider, model, prompt, signal);
}

function extractImageUrl(text) {
  if (!text || typeof text !== 'string') return null;
  const mdMatch = text.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
  if (mdMatch) return mdMatch[1];
  const rawUrl = text.match(/(https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|webp|gif|bmp|svg))/i);
  if (rawUrl) return rawUrl[1];
  const trimmed = text.trim();
  if (trimmed.startsWith('http') && !trimmed.includes(' ')) return trimmed;
  return null;
}

function parseApiError(statusCode, rawText) {
  try {
    const parsed = JSON.parse(rawText);
    const errCode = parsed.error?.code || parsed.code || '';
    const msg = parsed.error?.message || parsed.message || '';

    const knownCodes = {
      'Arrearage': '账户欠费，请登录控制台充值后重试',
      'invalid_api_key': 'API Key 无效或已过期，请检查密钥配置',
      'model_not_found': '模型不存在，请检查模型名称是否正确',
      'rate_limit_exceeded': '请求频率超限或余额不足',
      'InvalidApiKey': 'API Key 无效，请检查密钥配置',
    };
    if (knownCodes[errCode]) return knownCodes[errCode];

    if (msg) {
      const statusHints = {
        400: '请求参数错误',
        401: 'API Key 无效或过期',
        403: '无权限访问该模型',
        404: '接口不存在，请检查 API 类型是否选择正确（如该服务商不支持标准接口，可通过 one-api 等中转工具接入）',
        429: '请求频率超限或余额不足',
      };
      return `${statusHints[statusCode] || 'HTTP ' + statusCode}：${msg.slice(0, 100)}`;
    }
  } catch {}
  return `HTTP ${statusCode}：${rawText.slice(0, 100)}`;
}

async function callDashScopeMultimodal(provider, model, prompt, signal) {
  const raw = (provider.baseUrl || '').replace(/\/+$/, '');
  const isDashScope = raw.includes('dashscope.aliyuncs.com');
  const apiBase = isDashScope ? 'https://dashscope.aliyuncs.com/api/v1' : raw;
  const endpoint = isDashScope
    ? `${apiBase}/services/aigc/multimodal-generation/generation`
    : `${apiBase}/chat/completions`;
  const modelName = _apiModelId(model);

  const body = isDashScope ? {
    model: modelName,
    input: { messages: [{ role: 'user', content: [{ text: prompt }] }] },
    parameters: { size: '1328*1328' },
  } : {
    model: modelName,
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
  };

  const fetchOpts = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify(body),
  };
  if (signal) fetchOpts.signal = signal;

  const resp = await fetch(endpoint, fetchOpts);

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(parseApiError(resp.status, errText));
  }

  const data = await resp.json().catch(() => null);
  if (!data) throw new Error('API 返回了非 JSON 响应');

  if (data.code) {
    throw new Error(parseApiError(400, JSON.stringify(data)));
  }

  const dsContent = data.output?.choices?.[0]?.message?.content;
  if (Array.isArray(dsContent)) {
    for (const item of dsContent) {
      if (item.image) return item.image;
      if (item.url) return item.url;
    }
  }

  const oaiContent = data.choices?.[0]?.message?.content;
  if (Array.isArray(oaiContent)) {
    for (const item of oaiContent) {
      if (item.type === 'image_url' && item.image_url?.url) return item.image_url.url;
      if (item.type === 'image' && item.url) return item.url;
      if (item.type === 'text' && item.text) {
        const url = extractImageUrl(item.text);
        if (url) return url;
      }
    }
  }
  if (typeof oaiContent === 'string') {
    const url = extractImageUrl(oaiContent);
    if (url) return url;
  }

  throw new Error('模型未返回图片，请检查提示词或重试');
}

async function callChatImage(provider, model, prompt, signal) {
  const baseUrl = (provider.baseUrl || '').replace(/\/+$/, '');
  const modelName = _apiModelId(model);

  const fetchOpts = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
    }),
  };
  if (signal) fetchOpts.signal = signal;

  const resp = await fetch(`${baseUrl}/chat/completions`, fetchOpts);

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(parseApiError(resp.status, errText));
  }

  const data = await resp.json().catch(() => null);
  if (!data) throw new Error('模型返回了非 JSON 响应');

  const rawContent = data.choices?.[0]?.message?.content;

  if (Array.isArray(rawContent)) {
    for (const item of rawContent) {
      if (item.type === 'image_url' && item.image_url?.url) return item.image_url.url;
      if (item.type === 'image' && item.url) return item.url;
      if (item.type === 'text' && item.text) {
        const url = extractImageUrl(item.text);
        if (url) return url;
      }
    }
    throw new Error('模型返回了响应但未包含图片 URL');
  }

  const url = extractImageUrl(rawContent || '');
  if (url) return url;
  throw new Error('模型未返回图片 URL，请确认该模型支持文生图');
}

function _dashScopeApiBase(providerUrl) {
  const raw = (providerUrl || '').replace(/\/+$/, '');
  if (raw.includes('dashscope.aliyuncs.com')) {
    return 'https://dashscope.aliyuncs.com/api/v1';
  }
  return raw;
}

async function callDashScopeImage(provider, model, prompt, signal) {
  const baseUrl = _dashScopeApiBase(provider.baseUrl);
  const modelName = _apiModelId(model);

  const createOpts = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify({
      model: modelName,
      input: { prompt },
      parameters: { size: '1024*1024', n: 1 },
    }),
  };
  if (signal) createOpts.signal = signal;
  const createResp = await fetch(`${baseUrl}/services/aigc/text2image/image-synthesis`, createOpts);

  if (!createResp.ok) {
    const errText = await createResp.text().catch(() => '');
    throw new Error(parseApiError(createResp.status, errText));
  }

  const createData = await createResp.json().catch(() => null);
  if (!createData) throw new Error('DashScope API returned non-JSON response');
  const taskId = createData.output?.task_id;
  if (!taskId) throw new Error('No task_id in response');

  for (let i = 0; i < 90; i++) {
    await new Promise(r => setTimeout(r, 2000));

    const pollOpts = { headers: { 'Authorization': `Bearer ${provider.apiKey}` } };
    if (signal) pollOpts.signal = signal;
    const pollResp = await fetch(`${baseUrl}/tasks/${taskId}`, pollOpts);
    if (!pollResp.ok) continue;

    const pollData = await pollResp.json().catch(() => null);
    if (!pollData) continue;
    const status = pollData.output?.task_status;
    if (status === 'SUCCEEDED') {
      const results = pollData.output?.results || [];
      const url = results[0]?.url || results[0]?.b64_image;
      if (url) return url;
      throw new Error('No image URL in result');
    }
    if (status === 'FAILED') {
      throw new Error(pollData.output?.message || 'Task failed');
    }
  }
  throw new Error('Image generation timed out (180s)');
}

async function callOpenAIImage(provider, model, prompt, signal) {
  const baseUrl = (provider.baseUrl || '').replace(/\/+$/, '');
  const modelName = _apiModelId(model);

  const fetchOpts = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'url',
    }),
  };
  if (signal) fetchOpts.signal = signal;

  const resp = await fetch(`${baseUrl}/images/generations`, fetchOpts);

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(parseApiError(resp.status, errText));
  }

  const data = await resp.json().catch(() => null);
  if (!data) throw new Error('OpenAI Image API returned non-JSON response');
  const url = data.data?.[0]?.url || data.data?.[0]?.b64_json;
  if (!url) throw new Error('No image URL in response');
  return url;
}

module.exports = { IMG_GEN_RE, isEnabled, hasMarker, processText, resolveModel, generateDirect };
