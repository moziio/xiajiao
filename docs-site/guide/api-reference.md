---
title: API 与协议参考 — 虾饺 IM
description: 虾饺 IM 的 HTTP API 端点、WebSocket 消息协议、数据库表结构参考。
---

# API 与协议参考

虾饺的通信分两层：HTTP API 处理增删改查，WebSocket 处理实时消息推送。

## HTTP API

### 认证

除登录接口外，所有 API 需要在 Cookie 中携带 Session Token。

```
Cookie: session=<token>
```

Token 通过 `/api/login` 获取。

### 认证接口

#### POST `/api/login`

登录获取 Session Token。

```json
// Request
{ "password": "your-owner-key" }

// Response 200
{ "ok": true }
// Set-Cookie: session=<token>; HttpOnly; SameSite=Strict

// Response 401
{ "error": "Invalid password" }
```

#### POST `/api/logout`

```json
// Response 200
{ "ok": true }
```

### 消息接口

#### GET `/api/messages?channelId=<id>&limit=50&before=<msgId>`

获取频道消息（分页）。

```json
// Response 200
{
  "messages": [
    {
      "id": "msg_xxx",
      "channelId": "ch_xxx",
      "agentId": "agent_xxx",  // null if from user
      "userId": "user_xxx",    // null if from agent
      "content": "消息内容",
      "type": "text",          // text | image | file | tool_call | tool_result
      "metadata": {},
      "createdAt": "2026-03-24T10:00:00Z"
    }
  ]
}
```

#### POST `/api/messages`

发送消息。

```json
// Request
{
  "channelId": "ch_xxx",
  "content": "@小说家 写一首诗",
  "type": "text"
}

// Response 200
{ "id": "msg_xxx", "ok": true }
```

### Agent 接口

#### GET `/api/agents`

获取所有 Agent 列表。

```json
// Response 200
{
  "agents": [
    {
      "id": "agent_xxx",
      "name": "虾饺管家",
      "avatar": "🤖",
      "description": "虾饺 IM 的管理助手",
      "model": "gpt-4o",
      "tools": ["web_search", "memory_write", "memory_search"],
      "status": "online"
    }
  ]
}
```

#### GET `/api/agents/:id`

获取 Agent 详情（含 SOUL.md 内容）。

#### PUT `/api/agents/:id`

更新 Agent 配置。

```json
// Request
{
  "name": "新名字",
  "model": "claude-sonnet",
  "tools": ["web_search", "rag_query"]
}
```

#### POST `/api/agents`

创建新 Agent。

### 频道/群组接口

#### GET `/api/channels`

获取所有频道列表。

#### POST `/api/channels`

创建新频道。

```json
// Request
{
  "name": "写作工作室",
  "type": "group",      // dm | group
  "agentIds": ["agent_1", "agent_2"]
}
```

#### PUT `/api/channels/:id`

更新频道设置（名称、成员等）。

#### POST `/api/channels/:id/members`

添加成员到频道。

### 设置接口

#### GET `/api/settings`

获取系统设置。

#### PUT `/api/settings`

更新系统设置（模型配置等）。

### RAG 接口

#### POST `/api/rag/upload`

上传文档到知识库。

```bash
curl -X POST http://localhost:18800/api/rag/upload \
  -H "Cookie: session=<token>" \
  -F "file=@document.pdf" \
  -F "agentId=agent_xxx"
```

#### POST `/api/rag/query`

查询知识库。

```json
// Request
{
  "agentId": "agent_xxx",
  "query": "部署流程是什么？",
  "topK": 5
}
```

### 文件接口

#### POST `/api/upload`

上传文件。返回文件 URL。

```bash
curl -X POST http://localhost:18800/api/upload \
  -H "Cookie: session=<token>" \
  -F "file=@image.png"
```

```json
// Response 200
{ "url": "/uploads/2026-03/image-xxx.png" }
```

## WebSocket 协议

### 连接

```javascript
const ws = new WebSocket('ws://localhost:18800/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: sessionToken
  }));
};
```

### 消息格式

所有 WebSocket 消息使用 JSON 格式：

```json
{
  "type": "消息类型",
  "data": { /* 消息数据 */ }
}
```

### 客户端 → 服务端

#### `auth` — 认证

```json
{ "type": "auth", "token": "session-token" }
```

#### `ping` — 心跳

```json
{ "type": "ping" }
```

#### `subscribe` — 订阅频道

```json
{ "type": "subscribe", "channelId": "ch_xxx" }
```

### 服务端 → 客户端

#### `auth_ok` — 认证成功

```json
{ "type": "auth_ok", "userId": "user_xxx" }
```

#### `pong` — 心跳响应

```json
{ "type": "pong" }
```

#### `message` — 新消息

```json
{
  "type": "message",
  "data": {
    "id": "msg_xxx",
    "channelId": "ch_xxx",
    "agentId": "agent_xxx",
    "content": "完整消息内容",
    "type": "text",
    "createdAt": "2026-03-24T10:00:00Z"
  }
}
```

#### `stream_start` — 流式输出开始

```json
{
  "type": "stream_start",
  "data": {
    "messageId": "msg_xxx",
    "channelId": "ch_xxx",
    "agentId": "agent_xxx"
  }
}
```

#### `stream_chunk` — 流式输出片段

```json
{
  "type": "stream_chunk",
  "data": {
    "messageId": "msg_xxx",
    "content": "一小段文本"
  }
}
```

#### `stream_end` — 流式输出结束

```json
{
  "type": "stream_end",
  "data": {
    "messageId": "msg_xxx"
  }
}
```

#### `tool_call` — 工具调用中

```json
{
  "type": "tool_call",
  "data": {
    "messageId": "msg_xxx",
    "toolName": "web_search",
    "arguments": { "query": "Node.js 22 features" },
    "status": "calling"  // calling | completed | error
  }
}
```

#### `tool_result` — 工具调用结果

```json
{
  "type": "tool_result",
  "data": {
    "messageId": "msg_xxx",
    "toolName": "web_search",
    "result": "搜索结果..."
  }
}
```

#### `collab_status` — 协作链状态更新

```json
{
  "type": "collab_status",
  "data": {
    "chainId": "chain_xxx",
    "currentAgent": "agent_xxx",
    "step": 2,
    "totalSteps": 3,
    "status": "running"  // running | paused | completed | error
  }
}
```

## 数据库表结构

虾饺使用 SQLite，所有表在 `data/im.db` 中。

### 核心表

| 表名 | 说明 |
|------|------|
| `users` | 用户信息 |
| `channels` | 频道/群组 |
| `channel_members` | 频道成员关系 |
| `messages` | 消息记录 |
| `agents` | Agent 配置（冗余存储，主要在 agents.json） |
| `settings` | 系统设置（含模型 API Key） |
| `sessions` | 登录会话 |

### 记忆表（每个 Agent 独立数据库）

文件：`data/workspace-{agentId}/memory.db`

| 表名 | 说明 |
|------|------|
| `memories` | 记忆条目 |
| `memory_embeddings` | 记忆向量（用于语义检索） |

### RAG 表（每个 Agent 独立）

文件：`data/workspace-{agentId}/rag/rag.db`

| 表名 | 说明 |
|------|------|
| `documents` | 文档元信息 |
| `chunks` | 文档分块 |
| `chunk_embeddings` | 分块向量 |
| `chunk_fts` | FTS5 全文索引 |

## 错误码

| HTTP 状态码 | 含义 |
|------------|------|
| `200` | 成功 |
| `400` | 请求参数错误 |
| `401` | 未认证或 Token 过期 |
| `403` | 权限不足 |
| `404` | 资源不存在 |
| `429` | 请求过于频繁 |
| `500` | 服务器内部错误 |

## 下一步

- [架构设计](/guide/architecture) — 了解代码结构和模块
- [开发者指南](/guide/dev-guide) — 参与开发和贡献
- [安全与隐私](/guide/security) — 认证和安全机制
- [故障排查](/guide/troubleshooting) — 常见问题修复
