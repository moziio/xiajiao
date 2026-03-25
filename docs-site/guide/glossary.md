---
title: "Glossary — Xiajiao IM"
description: "Core concepts in Xiajiao IM: agents, SOUL.md, RAG, embeddings, collaboration chains, and more."
---

# Glossary

Key terms you will see in Xiajiao, grouped alphabetically.

## A

### Agent

An AI role with its own name, avatar, SOUL.md persona, model, and tools. Think of an agent as a specialized coworker.

→ [Multi-agent chat](/features/multi-agent-chat)

### @mention

In a group, `@AgentName` routes the message to that agent.

```
You: @Translator turn this paragraph into English
```

→ [Multi-agent chat](/features/multi-agent-chat)

## B

### BM25

Classic lexical scoring. Xiajiao’s RAG combines BM25 (keyword) with vector (semantic) search, fused via RRF.

→ [RAG](/features/rag)

## C

### call_agent

Built-in tool: one agent can delegate a subtask to another (up to three nesting levels).

```
Code assistant → call_agent(translator, "translate these comments")
```

→ [Tool calling](/features/tool-calling)

### Chunk

RAG splits documents into chunks—small (~200 characters) for precision, large (~800) for context.

→ [RAG](/features/rag)

### Cron

Cron expressions schedule tasks (e.g. `0 9 * * *` daily at 09:00). Exposed via `manage_schedule`.

→ [Tool calling](/features/tool-calling)

## D

### Docker Compose

Optional orchestration (`docker-compose.yml`). Core idea remains: `npm start` is enough for many deployments.

→ [Docker deployment](/deployment/docker)

## E

### Embedding

Text → dense vector. Used for semantic memory search and deduplication. Similar meanings yield high cosine similarity.

```
"likes Python"     → [0.23, 0.87, …]
"prefers Python"   → [0.21, 0.85, …]
similarity ≈ 0.97 → treated as duplicate
```

→ [Agent memory](/features/agent-memory)

## F

### FTS5

SQLite full-text search (version 5). Powers message search and BM25-style RAG retrieval without Elasticsearch.

## G

### Group

A shared channel for people and agents—members, leader, optional collaboration chain.

→ [Multi-agent chat](/features/multi-agent-chat)

## I

### IM

Instant messaging—the primary UI metaphor in Xiajiao.

## L

### Leader

Default responder when no @mention is present.

→ [Multi-agent chat](/features/multi-agent-chat)

### LLM

Large language model (GPT-4o, Claude, Qwen, …). Xiajiao calls provider APIs on behalf of agents.

→ [Model configuration](/guide/model-config)

## M

### MCP

Model Context Protocol—standardized tool/schema negotiation. Xiajiao’s tool layer aligns with MCP ideas.

### memory_write / memory_search

Persist and retrieve long-term memories per agent.

→ [Agent memory](/features/agent-memory)

## O

### OWNER_KEY

Login password from the environment. Default `admin` must be changed in production.

```bash
OWNER_KEY="your-strong-password" npm start
```

→ [Security](/guide/security)

## P

### Provider

LLM vendor (OpenAI, Anthropic, Alibaba Qwen, DeepSeek, …). Any OpenAI-compatible endpoint works.

→ [Model configuration](/guide/model-config)

### PWA

Progressive Web App—installable UI with offline caching support.

## R

### RAG

Retrieval-augmented generation: fetch relevant chunks before answering to reduce hallucinations.

→ [RAG](/features/rag)

### RBAC

Role-based access control—Owner, Admin, Member, Guest.

→ [Security](/guide/security)

### RRF

Reciprocal Rank Fusion merges BM25 and vector rankings: `score = Σ 1/(k + rank_i)` with `k = 60`.

→ [RAG](/features/rag)

## S

### SOUL.md

Markdown persona file per agent—role, rules, tone. Structured alternative to a single blob system prompt; easy to version.

```markdown
# Translator
You are a bilingual expert.
## Principles
- Faithful, fluent, elegant
```

→ [SOUL.md guide](/guide/soul-guide) · [Templates](/guide/soul-templates)

### Stream

Token-by-token generation pushed over WebSocket for a typing effect.

→ [Architecture](/guide/architecture)

### System prompt

What the LLM sees as instructions—assembled from SOUL.md, memory, and RAG context.

## T

### Tool calling

LLM-invoked functions. Built-ins include `web_search`, `rag_query`, `memory_write`, `memory_search`, `call_agent`, `manage_channel`, `manage_schedule`.

→ [Tool calling](/features/tool-calling)

## V

### Vanilla JS

No React/Vue—plain browser JavaScript. Edit and refresh; no bundler required.

## W

### WAL

SQLite write-ahead logging—concurrent reads/writes and higher write throughput.

```bash
sqlite3 data/im.db "PRAGMA journal_mode;"  # expect wal
```

→ [Performance](/guide/performance)

### web_search

Built-in search across multiple engines with failover.

→ [Tool calling](/features/tool-calling)

### WebSocket

Full-duplex channel for pushes and streaming (`ws` package server-side).

→ [API reference](/guide/api-reference)

### Workspace

Per-agent folder `data/workspace-{id}/` holding SOUL.md, `memory.db`, and RAG files—isolated from other agents.

## X

### Collaboration chain

Linear handoff order inside a group (e.g. novelist → editor → translator). One user message can walk the chain; the full collaboration UI also shows status and human overrides.

```
User message
  → novelist (~5s)
  → editor (~3s)
  → translator (~3s)
  → final answer
```

→ [Collaboration flow](/features/collaboration-flow)

### Xiajiao (虾饺)

**Xiajiao (虾饺)** is a Cantonese dim sum—har gow—with a thin wrapper and shrimp filling. The project name evokes something small and precise with a rich interior: minimal dependencies, full capability.

## Related docs

- [Architecture](/guide/architecture)
- [SOUL.md guide](/guide/soul-guide)
- [RAG](/features/rag)
- [Multi-agent chat](/features/multi-agent-chat)
- [API reference](/guide/api-reference)
