const store = require('./storage');
const { createLogger } = require('../middleware/logger');
const log = createLogger('image-gen');

const IMG_GEN_RE = /\[IMG_GEN:\s*([^\]]+)\]/g;

function isEnabled() {
  const tm = store.imSettings.toolModels || {};
  return !!(tm.imageGeneration && tm.imageAutoIntercept !== false);
}

function hasMarker(text) {
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

async function processText(text) {
  const tm = store.imSettings.toolModels || {};
  if (!tm.imageGeneration || tm.imageAutoIntercept === false) return text;

  const resolved = resolveModel(tm.imageGeneration);
  if (!resolved) {
    log.warn('model not found:', tm.imageGeneration);
    return text;
  }

  const { model, provider } = resolved;
  const apiType = model.api || provider.api || 'dashscope-image';

  IMG_GEN_RE.lastIndex = 0;
  const matches = [];
  let m;
  while ((m = IMG_GEN_RE.exec(text)) !== null) {
    matches.push({ full: m[0], prompt: m[1].trim(), index: m.index });
  }

  if (!matches.length) return text;

  let result = text;
  for (const match of matches.reverse()) {
    try {
      log.info(`generating: "${match.prompt}" via ${model.id} (${apiType})`);
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

async function callImageApi(apiType, provider, model, prompt) {
  if (apiType === 'openai-image' || apiType === 'openai-images') {
    return await callOpenAIImage(provider, model, prompt);
  }
  return await callDashScopeImage(provider, model, prompt);
}

function _dashScopeApiBase(providerUrl) {
  const raw = (providerUrl || '').replace(/\/+$/, '');
  if (raw.includes('dashscope.aliyuncs.com')) {
    return 'https://dashscope.aliyuncs.com/api/v1';
  }
  return raw;
}

async function callDashScopeImage(provider, model, prompt) {
  const baseUrl = _dashScopeApiBase(provider.baseUrl);
  const modelName = model.name || model.id.split('/').pop();

  const createResp = await fetch(`${baseUrl}/services/aigc/text2image/image-synthesis`, {
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
  });

  if (!createResp.ok) {
    const errText = await createResp.text().catch(() => '');
    throw new Error(`DashScope API ${createResp.status}: ${errText.slice(0, 200)}`);
  }

  const createData = await createResp.json();
  const taskId = createData.output?.task_id;
  if (!taskId) throw new Error('No task_id in response');

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000));

    const pollResp = await fetch(`${baseUrl}/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${provider.apiKey}` },
    });
    if (!pollResp.ok) continue;

    const pollData = await pollResp.json();
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
  throw new Error('Image generation timed out');
}

async function callOpenAIImage(provider, model, prompt) {
  const baseUrl = (provider.baseUrl || '').replace(/\/+$/, '');
  const modelName = model.name || model.id.split('/').pop();

  const resp = await fetch(`${baseUrl}/v1/images/generations`, {
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
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`OpenAI Image API ${resp.status}: ${errText.slice(0, 200)}`);
  }

  const data = await resp.json();
  const url = data.data?.[0]?.url || data.data?.[0]?.b64_json;
  if (!url) throw new Error('No image URL in response');
  return url;
}

module.exports = { IMG_GEN_RE, isEnabled, hasMarker, processText, resolveModel };
