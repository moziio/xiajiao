---
title: "Developer guide — Xiajiao IM"
description: "How to contribute to Xiajiao IM: setup, style, tests, and pull requests."
---

# Developer guide

Thanks for helping improve Xiajiao. The backend is ~9.5k lines (excluding the largest UI files), organized for approachable contributions.

## Environment

### Requirements

- Node.js >= 22.0.0  
- Git  
- Editor of your choice (VS Code, Cursor, Vim, …)

### Run locally

```bash
git clone https://github.com/moziio/xiajiao.git
cd xiajiao
npm install
npm start
```

Restart Node after server changes; refresh the browser for `public/` edits (no bundler).

### Tests

```bash
npm test
```

`node:test` with ~53 unit tests, usually a few seconds.

## Code style

### JavaScript

- **No HTTP framework** — `node:http` only  
- **No transpiler** — native ESM  
- **No frontend bundler** — Vanilla JS in `public/`  
- **Prefer `const`** over `let`; avoid `var`  
- **async/await** instead of callback pyramids  

### Comments

- Only where intent is non-obvious  
- Explain *why*, not *what* the next line does  
- JSDoc on exported helpers:

```javascript
/**
 * Search memories for dedupe / retrieval using cosine similarity.
 * Similarity >= DEDUP_THRESHOLD counts as duplicate.
 * @param {string} agentId
 * @param {string} text
 * @param {number} [topK=10]
 * @returns {Promise<Array<{content: string, type: string, similarity: number}>>}
 */
async function searchMemory(agentId, text, topK = 10) {
  // ...
}
```

### Dependencies

**Do not add packages unless all are true:**

1. Standard library cannot do it  
2. A faithful implementation would exceed ~200 lines  
3. The feature is core, not a nice-to-have  
4. The dependency is maintained and reputable  

Call out any new dependency explicitly in the PR description.

## Project map

```
server/
├── index.js
├── storage.js
├── ws.js
├── api/
├── services/
│   ├── llm.js
│   ├── tools.js
│   ├── memory.js
│   ├── rag.js
│   └── ...
└── test/
```

### Which file to change?

| Goal | Location |
|------|----------|
| New REST surface | `server/api/` + route registration in `index.js` |
| New tool | `server/services/tools.js` |
| LLM pipeline tweaks | `server/services/llm.js` |
| Memory / RAG | `server/services/memory.js`, `rag.js` |
| UI | `public/app.js`, `public/styles.css` |
| Search engines | `server/services/search-engines.js` |
| Schema migrations | `server/storage.js` |

## Testing

### All tests

```bash
npm test
```

### Single file

```bash
node --test server/test/memory.test.js
```

### Example test

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Memory', () => {
  it('should write and search memory', async () => {
    await memory.write('agent-1', 'semantic', 'user prefers Python');
    const results = await memory.search('agent-1', 'programming language');
    assert.ok(results.length > 0);
    assert.ok(results[0].content.includes('Python'));
  });
});
```

### Coverage (approximate)

| Area | Tests | Focus |
|------|-------|-------|
| storage | ~15 | CRUD |
| memory | ~10 | write/search/dedupe |
| rag | ~8 | chunk/index/search |
| llm | ~5 | API + tools |
| tools | ~8 | handlers |
| misc | ~7 | helpers/config |

## Pull requests

### 1. Fork & clone

```bash
git clone https://github.com/YOUR_USER/xiajiao.git
cd xiajiao
git remote add upstream https://github.com/moziio/xiajiao.git
```

### 2. Branch

```bash
git checkout -b feature/my-feature
```

Naming: `feature/*`, `fix/*`, `docs/*`, `refactor/*`.

### 3. Develop & test

```bash
npm test
```

### 4. Commit

```bash
git add .
git commit -m "feat: describe the change"
```

Follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`).

### 5. Push & open PR

```bash
git push origin feature/my-feature
```

Describe motivation, scope, and how you verified the change.

## Good first issues

| Level | Area | Examples |
|-------|------|----------|
| Easy | Docs | Fixes, clarifications, translations |
| Easy | UI | CSS tweaks, responsive fixes |
| Medium | Search | New engine adapter |
| Medium | Tests | More cases |
| Hard | Features | Workflow engine, deeper MCP work |

## Tutorial: add a search engine (Brave)

### 1. Adapter

```javascript
async function braveSearch(query) {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { 'X-Subscription-Token': process.env.BRAVE_API_KEY }
  });
  const data = await res.json();
  return data.web.results.map(r => ({
    title: r.title,
    url: r.url,
    snippet: r.description
  }));
}
```

### 2. Register

```javascript
const engines = {
  google: googleSearch,
  bing: bingSearch,
  brave: braveSearch,
};
```

### 3. Tests

```javascript
describe('Brave Search', () => {
  it('should return search results', async () => {
    const results = await braveSearch('Node.js');
    assert.ok(results.length > 0);
    assert.ok(results[0].title);
    assert.ok(results[0].url);
  });
});
```

### 4. PR

```bash
git checkout -b feature/brave-search
git add server/services/search-engines.js server/test/search.test.js
git commit -m "feat: add Brave search adapter"
git push origin feature/brave-search
```

Roughly one service file + tests (~30 lines).

## Debugging

### LLM traffic

Temporary logging in `server/services/llm.js`:

```javascript
console.log('LLM request:', JSON.stringify(messages, null, 2));
console.log('LLM chunk:', chunk);
```

### SQLite

```bash
sqlite3 data/im.db ".tables"
sqlite3 data/im.db "SELECT * FROM messages ORDER BY created_at DESC LIMIT 5;"
sqlite3 data/im.db "SELECT * FROM settings;"
```

### Memory DB

```bash
sqlite3 data/workspace-{agentId}/memory.db \
  "SELECT type, content, created_at FROM memories ORDER BY created_at DESC LIMIT 10;"
```

### VS Code launch config

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Xiajiao",
  "program": "${workspaceFolder}/server/index.js",
  "runtimeVersion": "22",
  "env": { "OWNER_KEY": "admin" }
}
```

## Related docs

- [Architecture](/guide/architecture)
- [API reference](/guide/api-reference)
- [Performance](/guide/performance)
- [FAQ](/guide/faq)
- [GitHub Issues](https://github.com/moziio/xiajiao/issues)
