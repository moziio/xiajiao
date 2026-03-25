---
title: "Architecture — Xiajiao IM"
description: "Technical architecture of Xiajiao IM: minimal design, layout, data flow, and core modules."
---

# Architecture

Xiajiao follows one rule: **ship full functionality with the least code and the fewest dependencies.**

<p align="center">
  <img src="/images/hero-light-top.png" alt="Xiajiao IM main UI" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>

This is a practical architecture, not a showcase. For product behavior see [Tool calling](/features/tool-calling), [Agent memory](/features/agent-memory), [RAG](/features/rag), [Multi-agent chat](/features/multi-agent-chat), and [Collaboration flow](/features/collaboration-flow).

## Design philosophy

### Three rules

1. **Prefer the standard library** — `node:http` instead of Express, `node:test` instead of Jest, `node:crypto` instead of uuid  
2. **Prefer one process** — no distributed stack for this workload  
3. **Prefer the filesystem** — SQLite instead of PostgreSQL, files instead of Redis  

### Why?

| Benefit | Explanation |
|---------|-------------|
| **Simple deploy** | `npm start`; no multi-service compose required |
| **Smaller risk** | Six dependencies, tiny supply-chain surface |
| **Lower maintenance** | Few packages to track for security |
| **Understandable** | Clear modules, readable structure |
| **Portable** | Copy the folder; minimal external state |

## System overview

```
┌────────────────────────────────────────────────┐
│  Browser client (Vanilla JS + CSS)         │
│  ├── Message list + Markdown rendering      │
│  ├── Contacts (agents / groups)             │
│  ├── Settings                               │
│  └── Collaboration flow panel               │
└──────────┬──────────────┬────────────────────┘
           │ HTTP/REST    │ WebSocket
┌──────────▼──────────────▼────────────────────┐
│  Node.js server (single process)             │
│                                              │
│  ┌────────────┐  ┌────────────┐              │
│  │ HTTP routes│  │ WebSocket  │              │
│  │ (node:http)│  │ (ws)       │              │
│  └──────┬─────┘  └──────┬─────┘              │
│         │               │                    │
│  ┌──────▼───────────────▼─────┐              │
│  │       Business logic       │              │
│  │                            │              │
│  │  ┌─────────┐ ┌───────────┐ │              │
│  │  │ LLM     │ │ Tools     │ │              │
│  │  │ (multi) │ │ (7 tools) │ │              │
│  │  └─────────┘ └───────────┘ │              │
│  │                            │              │
│  │  ┌─────────┐ ┌───────────┐ │              │
│  │  │ Memory  │ │ RAG       │ │              │
│  │  │ (3 types)│ │ (hybrid)  │ │              │
│  │  └─────────┘ └───────────┘ │              │
│  │                            │              │
│  │  ┌─────────┐ ┌───────────┐ │              │
│  │  │ Chains  │ │ Schedules │ │              │
│  │  └─────────┘ └───────────┘ │              │
│  └─────────────┬──────────────┘              │
│                │                             │
│  ┌─────────────▼────────────────┐            │
│  │        Data layer             │            │
│  │  SQLite (WAL + FTS5)          │            │
│  │  + filesystem (SOUL.md / RAG) │            │
│  └──────────────────────────────┘            │
│                                              │
└────────────────────────────────────────────────┘
         │
         ▼
  ┌─────────────┐
  │ LLM provider │  OpenAI / Claude / Qwen / Ollama / …
  └─────────────┘
```

## Repository layout

```
xiajiao/
├── server/
│   ├── index.js               # Entry — HTTP + WebSocket bootstrap
│   ├── storage.js             # Data — SQLite + agent files
│   ├── ws.js                  # WebSocket — live pushes
│   │
│   ├── api/                   # REST routes
│   │   ├── messages.js
│   │   ├── channels.js
│   │   ├── agents.js
│   │   ├── settings.js
│   │   ├── uploads.js
│   │   └── ...
│   │
│   ├── services/
│   │   ├── llm.js             # LLM — providers, stream, tool loop
│   │   ├── tools.js
│   │   ├── memory.js
│   │   ├── rag.js
│   │   ├── collaboration.js
│   │   ├── schedule.js
│   │   └── search-engines.js
│   │
│   └── test/
│       ├── storage.test.js
│       ├── llm.test.js
│       ├── memory.test.js
│       ├── rag.test.js
│       └── ...
│
├── public/
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   ├── uploads/
│   └── lib/
│       ├── marked.min.js
│       └── highlight.min.js
│
├── data/
│   ├── im.db
│   ├── agents.json
│   ├── workspace-xxx/
│   │   ├── SOUL.md
│   │   ├── memory.db
│   │   └── rag/
│   └── _soul-templates/
│
├── docs-site/
├── Dockerfile
├── package.json
└── README.md
```

## Core modules

### HTTP routing (`server/index.js`)

Plain `node:http`—no framework:

```javascript
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith('/api/messages')) {
    return handleMessages(req, res, url);
  }
  if (url.pathname.startsWith('/api/channels')) {
    return handleChannels(req, res, url);
  }
  // …more routes
  return serveStatic(req, res, url);
});
```

Why not Express? ~15 API endpoints; `if/else` is enough.

### WebSocket (`server/ws.js`)

Uses `ws` (Node’s built-in HTTP has no server WebSocket):

```
Client → WebSocket → server
  ↓                    ↓
Send/receive ← broadcast → push messages, agent replies,
                           tool status, chain progress
```

Used for live messages, streamed LLM tokens, tool updates, and collaboration status.

### LLM (`server/services/llm.js`)

Centered on a [tool-calling](/features/tool-calling) loop:

```
while (true) {
  response = await callLLM(messages)

  if (response.hasToolCalls) {
    for (toolCall of response.toolCalls) {
      result = await executeTool(toolCall)
      messages.push(toolResult)
    }
    continue
  }

  break
}
```

Protocols: `openai-completions`, `anthropic-messages`. Streaming via SSE or WebSocket.

### Memory (`server/services/memory.js`)

See [Agent memory](/features/agent-memory).

```
Write:
  text → embedding → dedupe (cosine > 0.85?)
  ├── yes → update existing
  └── no  → insert (typed)

Retrieve:
  query → embedding → cosine top-K → inject into system prompt
```

Per-agent `memory.db` stores embeddings and text.

### RAG (`server/services/rag.js`)

See [RAG](/features/rag).

```
Index:  doc → parse (PDF/TXT/MD) → chunk → embed → SQLite
Search: query → BM25 + vectors → RRF → rerank → top-K
```

### Storage (`server/storage.js`)

SQLite with WAL:

| Table | Purpose |
|-------|---------|
| `messages` | Messages + FTS5 |
| `channels` | Channels / groups |
| `settings` | App + LLM config |

Agent files live under `data/workspace-xxx/` (SOUL.md, memory, RAG) for easy editing and migration.

## Data flow

### One user message

```
1. Browser sends message
2. HTTP POST /api/messages
3. Persist to SQLite
4. WebSocket broadcast
5. Parse @mention → target agent
6. Load SOUL.md → system prompt
7. Inject memory if autoInjectMemory
8. Build context (history + memory + SOUL)
9. Call LLM (stream)
10. Tool calls? → execute → back to 9
11. Stream tokens over WebSocket
12. Save agent reply
13. Collaboration chain? → next agent (back to 5)
```

### Collaboration chain

See [Collaboration flow](/features/collaboration-flow) and [Multi-agent chat](/features/multi-agent-chat).

```
User → Agent A → output → context → Agent B → output → Agent C → done
        ↑ WS status    ↑ WS status           ↑ WS status
```

## The six dependencies

| Package | Role | Why keep it |
|---------|------|-------------|
| `ws` | WebSocket server | No stdlib WS server |
| `formidable` | Multipart uploads | Streaming parse |
| `node-cron` | Cron scheduling | No stdlib cron parser |
| `pdf-parse` | PDF text for RAG | — |
| `@larksuiteoapi/node-sdk` | Feishu connector | Private long-lived protocol |
| `@modelcontextprotocol/sdk` | MCP | JSON-RPC + capability negotiation |

Everything else uses Node built-ins:

| Need | Built-in | Typical third-party |
|------|----------|---------------------|
| HTTP | `node:http` | Express / Koa / Fastify |
| DB | `node:sqlite` | pg / mysql2 |
| Tests | `node:test` | Jest / Mocha / Vitest |
| UUID | `node:crypto` | uuid / nanoid |
| Paths | `node:path` | — |
| Files | `node:fs` | fs-extra |

## Security model

### Authentication

- Simple password protection (`OWNER_KEY` environment variable)
- Session cookie (random token via `node:crypto`)
- Suited to individuals and trusted small teams

### Data isolation

- Each agent has its own workspace and memory store
- Memories are not shared across agents
- Uploads are confined to designated directories

### LLM API key security

- Keys are stored in local SQLite
- They are only sent to the configured LLM provider
- They are never sent to any third party

## Performance

Single-process Node + SQLite: fast boot, low overhead. Bottleneck is LLM latency, not Xiajiao. WAL handles chat write patterns comfortably.

## Walkthroughs

### HTTP routing (simplified)

```javascript
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method;

  if (method === 'GET' && !path.startsWith('/api/')) {
    return serveStatic(req, res, path);
  }

  const routes = {
    'POST /api/login': handleLogin,
    'GET /api/messages': handleGetMessages,
    'POST /api/messages': handleSendMessage,
    'GET /api/agents': handleGetAgents,
    'PUT /api/agents/:id': handleUpdateAgent,
  };

  const handler = matchRoute(routes, method, path);
  if (handler) await handler(req, res, params);
  else res.writeHead(404).end();
});
```

### WebSocket streaming

```
User message → @mention → SOUL + memory + recent messages
→ LLM stream
→ chunks → WS stream_chunk / tool_call / tool_result → loop until finish
→ stream_end → persist → maybe next chain step
```

### Memory pipeline

```
Write (memory_write):
  embedding(content)
    → compare to existing (cosine)
    → similarity > 0.85 → skip (dedupe)
    → similarity > 0.7  → update existing
    → else → insert
    → persist memory.db

Retrieve:
  new message → embed → top-K by cosine
    → group as semantic / episodic / procedural
    → inject into system prompt, e.g.:

    [Relevant memories]
    Semantic: user prefers Python; company uses Alibaba Cloud
    Episodic: last time we discussed payment API design
    Procedural: keep answers short; code in TypeScript when asked
```

### RAG pipeline

```
User question
  → BM25 branch: FTS5 full-text → top 20
  → vector branch: embedding similarity → top 20
  → RRF merge: score = Σ 1/(k + rank_i), k = 60
  → top 10 candidates
  → LLM reranking: score each chunk vs question (e.g. 1–10)
  → top 5 chunks → injected into agent prompt
```

## Extensibility

### New tool (`server/services/tools.js`)

```javascript
const tools = {
  my_custom_tool: {
    description: "My custom tool",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Query text" }
      }
    },
    handler: async (params) => {
      return { result: "done" };
    }
  }
};
```

### New API

Add `server/api/*.js` and register in `index.js`.

### New search engine

Extend `server/services/search-engines.js`.

### New LLM provider

OpenAI-compatible `/v1/chat/completions` → configure in settings; no code change.

### New channel

Implement `onMessage` / `sendMessage` under `server/services/channels/`.

## Compared with other stacks

| Aspect | Xiajiao | Dify (rough) | Typical Node app |
|--------|---------|--------------|------------------|
| Entry | One `index.js` | Many services | One `app.js` |
| Routing | Manual | Framework router | Express |
| Data access | Raw SQL | ORM | ORM |
| Tests | `node:test` | pytest | Jest |
| Build | None | Docker/pip | Bundler |

Xiajiao optimizes for **minimal practice**, not maximal ceremony.

## Related docs

### Features & usage

- [Tool calling](/features/tool-calling) — tool loop and seven built-in tools
- [Agent memory](/features/agent-memory) — three memory types and injection
- [RAG](/features/rag) — retrieval pipeline and document uploads
- [Multi-agent chat](/features/multi-agent-chat) — groups and routing
- [Collaboration flow](/features/collaboration-flow) — collaboration chains and the visualization panel
- [Integrations](/features/integrations) — Feishu, DingTalk, and other channels

### Development & operations

- [API & protocol reference](/guide/api-reference) — HTTP API and WebSocket details
- [Developer guide](/guide/dev-guide) — how to contribute
- [Security](/guide/security) — security model in depth
- [Troubleshooting](/guide/troubleshooting) — common issues
- [FAQ](/guide/faq) — technical Q&A
- [Quick start](/guide/quick-start) — get it running first
