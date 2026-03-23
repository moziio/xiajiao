/**
 * 内置工具：web_search — 互联网搜索
 * 7 个 provider: auto | duckduckgo | bing | brave | kimi | perplexity | grok
 * auto 模式零配置：DuckDuckGo → Bing 自动降级 + LLM 总结（国内被墙也能用）
 */
const fs = require('fs');
const cfg = require('../../config');
const store = require('../storage');
const { createLogger } = require('../../middleware/logger');
const log = createLogger('web-search');

const VALID_PROVIDERS = ['auto', 'duckduckgo', 'bing', 'brave', 'kimi', 'perplexity', 'grok'];
const CACHE_TTL = 15 * 60 * 1000;
const CACHE_MAX = 100;
const _cache = new Map();

const schema = {
  description: '搜索互联网获取最新信息。当用户提问涉及实时数据、新闻、或知识库中没有的内容时调用此工具。',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: '搜索关键词' },
      maxResults: { type: 'number', description: '返回最多 N 条结果（默认 5）' },
    },
    required: ['query'],
  },
};

function getSearchConfig() {
  try {
    const s = JSON.parse(fs.readFileSync(cfg.SETTINGS_FILE, 'utf8'));
    return s.tools?.webSearch || {};
  } catch {
    return {};
  }
}

function _cacheKey(provider, query) {
  return provider + ':' + query.toLowerCase().trim();
}

function _getFromCache(provider, query) {
  const key = _cacheKey(provider, query);
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _cache.delete(key); return null; }
  return entry.data;
}

function _setCache(provider, query, data) {
  const key = _cacheKey(provider, query);
  if (_cache.size >= CACHE_MAX) {
    const oldest = _cache.keys().next().value;
    _cache.delete(oldest);
  }
  _cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

async function handler(args, context) {
  const query = (args.query || '').trim();
  const maxResults = Math.min(Math.max(args.maxResults || 5, 1), 10);
  if (!query) return { results: [], error: '搜索查询不能为空' };

  const config = getSearchConfig();
  let provider = config.provider || 'auto';
  if (!VALID_PROVIDERS.includes(provider)) provider = 'auto';

  const cached = _getFromCache(provider, query);
  if (cached) { log.info(`cache hit: ${provider}:${query.slice(0, 30)}`); return cached; }

  const apiKey = config.apiKey || '';

  try {
    let result;
    if (provider === 'auto') {
      result = await searchWithAutoSummary(query, maxResults, context);
    } else if (provider === 'duckduckgo') {
      result = await searchDuckDuckGo(query, maxResults);
    } else if (provider === 'bing') {
      result = await searchBing(query, maxResults);
    } else if (provider === 'brave') {
      if (!apiKey) return _noKeyError('Brave', 'brave.com/search/api');
      result = await searchBrave(query, maxResults, apiKey, config.braveMode);
    } else if (provider === 'kimi') {
      if (!apiKey) return _noKeyError('Kimi', 'platform.moonshot.cn');
      result = await searchKimi(query, maxResults, apiKey, config.baseUrl);
    } else if (provider === 'perplexity') {
      if (!apiKey) return _noKeyError('Perplexity', 'perplexity.ai');
      result = await searchPerplexity(query, maxResults, apiKey, config.baseUrl);
    } else if (provider === 'grok') {
      if (!apiKey) return _noKeyError('Grok', 'x.ai');
      result = await searchGrok(query, maxResults, apiKey);
    } else {
      result = await searchWithAutoSummary(query, maxResults, context);
    }
    _setCache(provider, query, result);
    return result;
  } catch (err) {
    log.error(`search failed [${provider}]: ${err.message}`);
    if (provider !== 'auto' && provider !== 'duckduckgo' && provider !== 'bing') {
      log.info('fallback to auto mode');
      try {
        const fallback = await searchWithAutoSummary(query, maxResults, context);
        _setCache('auto', query, fallback);
        return fallback;
      } catch (e2) {
        log.error(`fallback also failed: ${e2.message}`);
      }
    }
    return { results: [], error: `搜索失败: ${err.message}` };
  }
}

function _noKeyError(name, site) {
  return { results: [], error: `${name} 未配置 API Key`, configHint: `请在 设置 → 工具配置 → 互联网搜索 中填写 ${name} API Key（${site}）` };
}

// ─── DuckDuckGo HTML 抓取 ──────────────────────────────────────────────
async function searchDuckDuckGo(query, maxResults) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const params = new URLSearchParams({ q: query });
    const resp = await fetch('https://html.duckduckgo.com/html/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
      body: params.toString(),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`DuckDuckGo HTTP ${resp.status}`);
    const html = await resp.text();
    return { results: _parseDDGHtml(html, maxResults) };
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function _parseDDGHtml(html, maxResults) {
  const results = [];
  const blockRe = /<a[^>]+class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRe = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

  const links = [...html.matchAll(blockRe)];
  const snippets = [...html.matchAll(snippetRe)];

  for (let i = 0; i < Math.min(links.length, maxResults); i++) {
    let url = links[i][1] || '';
    if (url.startsWith('//duckduckgo.com/l/?uddg=')) {
      try { url = decodeURIComponent(url.split('uddg=')[1].split('&')[0]); } catch {}
    }
    const title = _stripHtml(links[i][2] || '');
    const snippet = snippets[i] ? _stripHtml(snippets[i][1] || '') : '';
    if (url && title) results.push({ title, url, snippet });
  }
  return results;
}

function _stripHtml(s) {
  return s.replace(/<\/?b>/gi, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/\s+/g, ' ').trim();
}

// ─── Bing HTML 抓取（cn.bing.com 国内可用）────────────────────────────
async function searchBing(query, maxResults) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const params = new URLSearchParams({ q: query, count: String(maxResults) });
    const resp = await fetch(`https://cn.bing.com/search?${params}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`Bing HTTP ${resp.status}`);
    const html = await resp.text();
    return { results: _parseBingHtml(html, maxResults) };
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function _parseBingHtml(html, maxResults) {
  const results = [];
  const liRe = /<li[^>]+class="b_algo"[^>]*>([\s\S]*?)(?=<li[^>]+class="b_algo"|<\/ol>|<\/ul>|$)/gi;
  const blocks = [...html.matchAll(liRe)];

  for (let i = 0; i < Math.min(blocks.length, maxResults); i++) {
    const block = blocks[i][1];
    const linkMatch = block.match(/<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;
    const url = linkMatch[1];
    const title = _stripHtml(linkMatch[2]);
    const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)
      || block.match(/<span[^>]+class="[^"]*algoSlug_icon[^"]*"[^>]*>[\s\S]*?<\/span>([\s\S]*?)(?=<\/div>)/i)
      || block.match(/<div[^>]+class="b_caption"[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/i);
    const snippet = snippetMatch ? _stripHtml(snippetMatch[1] || snippetMatch[2] || '') : '';
    if (url && title) results.push({ title, url, snippet });
  }
  return results;
}

// ─── Auto: DuckDuckGo → Bing fallback + LLM 总结 ─────────────────────
async function searchWithAutoSummary(query, maxResults, context) {
  let searchResult;
  let triedBing = false;
  try {
    searchResult = await searchDuckDuckGo(query, maxResults);
  } catch (ddgErr) {
    log.warn(`DuckDuckGo failed (${ddgErr.message}), falling back to Bing`);
    triedBing = true;
    try {
      searchResult = await searchBing(query, maxResults);
    } catch (bingErr) {
      log.error(`Bing also failed: ${bingErr.message}`);
      throw new Error(`DuckDuckGo: ${ddgErr.message}; Bing: ${bingErr.message}`);
    }
  }
  if (!triedBing && !searchResult.results.length) {
    log.info('DuckDuckGo returned 0 results, trying Bing');
    try {
      const bingResult = await searchBing(query, maxResults);
      if (bingResult.results.length) searchResult = bingResult;
    } catch (e) { log.warn(`Bing fallback: ${e.message}`); }
  }
  if (!searchResult.results.length) return searchResult;

  const summary = await _llmSummarize(query, searchResult.results, context);
  return { results: searchResult.results, summary };
}

async function _llmSummarize(query, results, context) {
  try {
    const { model, provider } = _resolveToolModel(context);
    if (!model || !provider) { log.warn('no model available for auto summary'); return ''; }

    const snippetText = results.map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`).join('\n\n');
    const messages = [
      { role: 'system', content: '你是搜索结果分析助手。根据搜索结果简洁回答用户问题，引用来源编号[1][2]等。不超过 300 字。如果搜索结果无法回答问题，如实说明。' },
      { role: 'user', content: `问题：${query}\n\n搜索结果：\n${snippetText}` },
    ];

    const baseUrl = (provider.baseUrl || '').replace(/\/+$/, '');
    const apiType = model.api || provider.api || 'openai-completions';
    const apiKey = provider.apiKey || '';
    const modelId = model.id.includes('/') ? model.id.split('/').pop() : model.id;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);

    try {
      let resp;
      if (apiType === 'anthropic-messages') {
        resp = await fetch(baseUrl + '/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: modelId, max_tokens: 500, messages: [{ role: 'user', content: messages.map(m => m.content).join('\n\n') }] }),
          signal: ctrl.signal,
        });
      } else if (apiType === 'google-generative-ai') {
        const url = `${baseUrl}/models/${modelId}:generateContent?key=${apiKey}`;
        resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: messages.map(m => m.content).join('\n\n') }] }], generationConfig: { maxOutputTokens: 500 } }),
          signal: ctrl.signal,
        });
      } else {
        resp = await fetch(baseUrl + '/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ model: modelId, messages, max_tokens: 500, temperature: 0.3 }),
          signal: ctrl.signal,
        });
      }

      if (!resp.ok) { log.warn(`LLM summary failed: HTTP ${resp.status}`); return ''; }
      const data = await resp.json();

      if (apiType === 'anthropic-messages') return (data.content?.[0]?.text || '').trim();
      if (apiType === 'google-generative-ai') return (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
      return (data.choices?.[0]?.message?.content || '').trim();
    } finally { clearTimeout(timer); }
  } catch (err) {
    log.warn(`LLM summary error: ${err.message}`);
    return '';
  }
}

function _resolveToolModel(context) {
  store.loadModels();
  const models = store.localModels.models || [];
  const providers = store.localModels.providers || {};
  if (!models.length) return {};

  const agentId = context?.agentId;
  if (agentId) {
    store.loadAgents();
    const agent = store.localAgents.find(a => a.id === agentId);
    if (agent?.model) {
      const m = models.find(x => x.id === agent.model);
      if (m) { const p = providers[m.provider]; if (p) return { model: m, provider: p }; }
    }
  }

  const defId = store.imSettings.defaultModel || store.getFirstAvailableModel();
  if (defId) {
    const m = models.find(x => x.id === defId);
    if (m) { const p = providers[m.provider]; if (p) return { model: m, provider: p }; }
  }

  const m = models[0];
  const p = providers[m.provider];
  return p ? { model: m, provider: p } : {};
}

// ─── Brave Search API ──────────────────────────────────────────────────
async function searchBrave(query, maxResults, apiKey, braveMode) {
  const mode = braveMode === 'llm-context' ? 'llm-context' : 'web';
  const params = new URLSearchParams({ q: query, count: String(maxResults) });
  if (mode === 'llm-context') params.set('result_filter', 'query');
  const endpoint = 'https://api.search.brave.com/res/v1/web/search';

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const resp = await fetch(`${endpoint}?${params}`, {
      headers: { 'Accept': 'application/json', 'Accept-Encoding': 'gzip', 'X-Subscription-Token': apiKey },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`Brave API ${resp.status}: ${(await resp.text().catch(() => '')).slice(0, 200)}`);
    const data = await resp.json();
    const webResults = (data.web?.results || []).slice(0, maxResults).map(r => ({
      title: r.title || '', url: r.url || '', snippet: r.description || '',
    }));
    return { results: webResults };
  } catch (err) { clearTimeout(timer); throw err; }
}

// ─── Kimi (月之暗面) ───────────────────────────────────────────────────
async function searchKimi(query, maxResults, apiKey, baseUrl) {
  const base = (baseUrl || 'https://api.moonshot.cn/v1').replace(/\/+$/, '');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const resp = await fetch(base + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'moonshot-v1-auto',
        messages: [
          { role: 'system', content: '你是一个搜索引擎助手。请根据用户问题搜索互联网并返回相关结果。用中文回答，引用来源链接。' },
          { role: 'user', content: query },
        ],
        temperature: 0.3,
        tools: [{ type: 'builtin_function', function: { name: '$web_search' } }],
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`Kimi API ${resp.status}: ${(await resp.text().catch(() => '')).slice(0, 200)}`);
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '';
    const refs = _extractUrlsFromText(content, maxResults);
    return { results: refs, summary: content };
  } catch (err) { clearTimeout(timer); throw err; }
}

// ─── Perplexity ────────────────────────────────────────────────────────
async function searchPerplexity(query, maxResults, apiKey, baseUrl) {
  const base = (baseUrl || 'https://api.perplexity.ai').replace(/\/+$/, '');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const resp = await fetch(base + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: 'You are a helpful search assistant. Answer the question with citations.' },
          { role: 'user', content: query },
        ],
        max_tokens: 1024,
        temperature: 0.2,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`Perplexity API ${resp.status}: ${(await resp.text().catch(() => '')).slice(0, 200)}`);
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];
    const results = citations.slice(0, maxResults).map((url, i) => ({
      title: `来源 ${i + 1}`, url: typeof url === 'string' ? url : (url.url || ''), snippet: '',
    }));
    if (!results.length) {
      const extracted = _extractUrlsFromText(content, maxResults);
      results.push(...extracted);
    }
    return { results, summary: content };
  } catch (err) { clearTimeout(timer); throw err; }
}

// ─── Grok (xAI) ───────────────────────────────────────────────────────
async function searchGrok(query, maxResults, apiKey) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const resp = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'grok-3-fast-latest',
        messages: [{ role: 'user', content: query }],
        search_parameters: { mode: 'auto', max_search_results: maxResults },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`Grok API ${resp.status}: ${(await resp.text().catch(() => '')).slice(0, 200)}`);
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '';

    const results = [];
    const searchResults = data.choices?.[0]?.message?.search_results || [];
    for (const sr of searchResults.slice(0, maxResults)) {
      results.push({ title: sr.title || '', url: sr.url || '', snippet: sr.snippet || sr.text || '' });
    }
    if (!results.length) {
      const extracted = _extractUrlsFromText(content, maxResults);
      results.push(...extracted);
    }
    return { results, summary: content };
  } catch (err) { clearTimeout(timer); throw err; }
}

// ─── 辅助：从文本中提取 URL ────────────────────────────────────────────
function _extractUrlsFromText(text, maxResults) {
  const urlRe = /https?:\/\/[^\s\])"'<>]+/g;
  const urls = [...new Set((text.match(urlRe) || []))];
  return urls.slice(0, maxResults).map((url, i) => ({
    title: `来源 ${i + 1}`,
    url: url.replace(/[.,;:!?]+$/, ''),
    snippet: '',
  }));
}

const meta = { icon: '🔍', risk: 'low', category: 'web' };

module.exports = { schema, handler, meta };
