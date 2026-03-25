---
title: "API & protocol reference — Xiajiao IM"
description: "HTTP endpoints, WebSocket message shapes, and SQLite schema reference for Xiajiao IM."
---

# API & protocol reference

Xiajiao splits traffic: **HTTP** for CRUD, **WebSocket** for realtime delivery.

## HTTP API

### Authentication

Except login, send the session cookie on every request:

```
Cookie: session=<token>
```

Obtain the token via `POST /api/login`.

### Auth endpoints

#### `POST /api/login`

```json
// Request
{ "password": "your-owner-key" }

// 200
{ "ok": true }
// Set-Cookie: session=<token>; HttpOnly; SameSite=Strict

// 401
{ "error": "Invalid password" }
```

#### `POST /api/logout`

```json
// 200
{ "ok": true }
```

### Messages

#### `GET /api/messages?channelId=<id>&limit=50&before=<msgId>`

```json
// 200
{
  "messages": [
    {
      "id": "msg_xxx",
      "channelId": "ch_xxx",
      "agentId": "agent_xxx",
      "userId": "user_xxx",
      "content": "Message text",
      "type": "text",
      "metadata": {},
      "createdAt": "2026-03-24T10:00:00Z"
    }
  ]
}
```

#### `POST /api/messages`

```json
// Request
{
  "channelId": "ch_xxx",
  "content": "@Novelist write a short poem",
  "type": "text"
}

// 200
{ "id": "msg_xxx", "ok": true }
```

### Agents

#### `GET /api/agents`

```json
// 200
{
  "agents": [
    {
      "id": "agent_xxx",
      "name": "Xiajiao Butler",
      "avatar": "🤖",
      "description": "Housekeeping assistant for Xiajiao IM",
      "model": "gpt-4o",
      "tools": ["web_search", "memory_write", "memory_search"],
      "status": "online"
    }
  ]
}
```

#### `GET /api/agents/:id`

Agent detail including SOUL.md body.

#### `PUT /api/agents/:id`

```json
// Request
{
  "name": "New name",
  "model": "claude-sonnet",
  "tools": ["web_search", "rag_query"]
}
```

#### `POST /api/agents`

Create agent.

### Channels / groups

#### `GET /api/channels`

List channels.

#### `POST /api/channels`

```json
// Request
{
  "name": "Writing studio",
  "type": "group",
  "agentIds": ["agent_1", "agent_2"]
}
```

#### `PUT /api/channels/:id`

Update channel.

#### `POST /api/channels/:id/members`

Add members.

### Settings

#### `GET /api/settings`

#### `PUT /api/settings`

Update models, keys, etc.

### RAG

#### `POST /api/rag/upload`

```bash
curl -X POST http://localhost:18800/api/rag/upload \
  -H "Cookie: session=<token>" \
  -F "file=@document.pdf" \
  -F "agentId=agent_xxx"
```

#### `POST /api/rag/query`

```json
// Request
{
  "agentId": "agent_xxx",
  "query": "What is the deployment process?",
  "topK": 5
}
```

### Uploads

#### `POST /api/upload`

```bash
curl -X POST http://localhost:18800/api/upload \
  -H "Cookie: session=<token>" \
  -F "file=@image.png"
```

```json
// 200
{ "url": "/uploads/2026-03/image-xxx.png" }
```

## WebSocket protocol

### Connect

```javascript
const ws = new WebSocket('ws://localhost:18800/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: sessionToken
  }));
};
```

### Envelope

```json
{
  "type": "message-type",
  "data": { }
}
```

### Client → server

#### `auth`

```json
{ "type": "auth", "token": "session-token" }
```

#### `ping`

```json
{ "type": "ping" }
```

#### `subscribe`

```json
{ "type": "subscribe", "channelId": "ch_xxx" }
```

### Server → client

#### `auth_ok`

```json
{ "type": "auth_ok", "userId": "user_xxx" }
```

#### `pong`

```json
{ "type": "pong" }
```

#### `message`

```json
{
  "type": "message",
  "data": {
    "id": "msg_xxx",
    "channelId": "ch_xxx",
    "agentId": "agent_xxx",
    "content": "Full message body",
    "type": "text",
    "createdAt": "2026-03-24T10:00:00Z"
  }
}
```

#### `stream_start` / `stream_chunk` / `stream_end`

```json
{ "type": "stream_start", "data": { "messageId": "msg_xxx", "channelId": "ch_xxx", "agentId": "agent_xxx" } }
```

```json
{ "type": "stream_chunk", "data": { "messageId": "msg_xxx", "content": "token slice" } }
```

```json
{ "type": "stream_end", "data": { "messageId": "msg_xxx" } }
```

#### `tool_call` / `tool_result`

```json
{
  "type": "tool_call",
  "data": {
    "messageId": "msg_xxx",
    "toolName": "web_search",
    "arguments": { "query": "Node.js 22 features" },
    "status": "calling"
  }
}
```

```json
{
  "type": "tool_result",
  "data": {
    "messageId": "msg_xxx",
    "toolName": "web_search",
    "result": "Search results…"
  }
}
```

#### `collab_status`

```json
{
  "type": "collab_status",
  "data": {
    "chainId": "chain_xxx",
    "currentAgent": "agent_xxx",
    "step": 2,
    "totalSteps": 3,
    "status": "running"
  }
}
```

## Database schema

Main DB: `data/im.db` (SQLite).

### Core tables

| Table | Purpose |
|-------|---------|
| `users` | Users |
| `channels` | Channels / groups |
| `channel_members` | Membership |
| `messages` | Messages |
| `agents` | Agent rows (also `agents.json`) |
| `settings` | Settings + model keys |
| `sessions` | Login sessions |

### Per-agent memory

Path: `data/workspace-{agentId}/memory.db`

| Table | Purpose |
|-------|---------|
| `memories` | Memory rows |
| `memory_embeddings` | Vectors for semantic search |

### Per-agent RAG

Path: `data/workspace-{agentId}/rag/rag.db`

| Table | Purpose |
|-------|---------|
| `documents` | Document metadata |
| `chunks` | Chunks |
| `chunk_embeddings` | Embeddings |
| `chunk_fts` | FTS5 index |

## HTTP status codes

| Code | Meaning | Typical cause |
|------|---------|---------------|
| `200` | OK | — |
| `400` | Bad request | Missing fields, bad JSON |
| `401` | Unauthorized | Not logged in, expired session |
| `403` | Forbidden | Guest hitting admin APIs |
| `404` | Not found | Bad channel/agent/message id |
| `429` | Too many requests | Rate limit |
| `500` | Server error | LLM failure, DB error |

## curl quick test

### Login

```bash
curl -c cookies.txt -X POST http://localhost:18800/api/login \
  -H "Content-Type: application/json" \
  -d '{"password":"admin"}'
```

### List agents

```bash
curl -b cookies.txt http://localhost:18800/api/agents | python3 -m json.tool
```

### Send message

```bash
curl -b cookies.txt -X POST http://localhost:18800/api/messages \
  -H "Content-Type: application/json" \
  -d '{"channelId":"ch_xxx","content":"@Code assistant hello","type":"text"}'
```

### Fetch history

```bash
curl -b cookies.txt "http://localhost:18800/api/messages?channelId=ch_xxx&limit=10"
```

::: tip
`-c cookies.txt` stores cookies; `-b cookies.txt` sends them so commands share the session.
:::

## WebSocket debugging

```bash
npm install -g wscat
wscat -c "ws://localhost:18800/ws" -H "Cookie: session=your-token"
> {"type":"auth","token":"your-session-token"}
< {"type":"auth_ok","userId":"user_xxx"}
> {"type":"subscribe","channelId":"ch_xxx"}
```

## Related docs

- [Architecture](/guide/architecture)
- [Developer guide](/guide/dev-guide)
- [Security](/guide/security)
- [Troubleshooting](/guide/troubleshooting)
- [Glossary](/guide/glossary)
