---
title: 架构设计 — 虾饺 IM
description: 虾饺 IM 的技术架构详解——极简设计哲学、代码结构、数据流、核心模块。
---

# 架构设计

虾饺的架构设计遵循一个原则：**用最少的代码和依赖，实现完整的功能。**

<p align="center">
  <img src="/images/hero-light-top.png" alt="虾饺 IM 整体界面" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>

这不是一个炫技的架构，而是一个实用的架构。功能层面的用户文档见 [Tool Calling](/zh/features/tool-calling)、[Agent 持久记忆](/zh/features/agent-memory)、[RAG 知识库](/zh/features/rag)、[多 Agent 群聊](/zh/features/multi-agent-chat)、[协作流](/zh/features/collaboration-flow)。

## 设计哲学

### 三条铁律

1. **能用标准库的，不引入第三方包** — `node:http` 替代 Express，`node:test` 替代 Jest，`node:crypto` 替代 uuid
2. **能用单进程的，不搞分布式** — 一个 Node.js 进程搞定一切
3. **能用文件系统的，不搞外部服务** — SQLite 替代 PostgreSQL，文件替代 Redis

### 为什么这样设计？

| 好处 | 说明 |
|------|------|
| **部署简单** | `npm start` 就跑，不需要 Docker Compose 编排多个服务 |
| **安全风险小** | 6 个依赖，供应链攻击面极小 |
| **维护成本低** | 不用追踪几百个包的安全更新 |
| **可理解** | 模块划分清晰，代码结构简洁 |
| **可移植** | 复制目录就能迁移，不依赖外部状态 |

## 整体架构

```
┌────────────────────────────────────────────────┐
│  浏览器客户端 (Vanilla JS + CSS)               │
│  ├── 消息列表 + Markdown 渲染                   │
│  ├── 通讯录 (Agent / 群组)                      │
│  ├── 设置面板                                   │
│  └── 协作流可视化面板                            │
└──────────┬──────────────┬──────────────────────┘
           │ HTTP/REST    │ WebSocket
┌──────────▼──────────────▼──────────────────────┐
│  Node.js 服务 (单进程)                          │
│                                                │
│  ┌────────────┐  ┌────────────┐                │
│  │ HTTP 路由   │  │ WebSocket  │                │
│  │ (node:http) │  │ 服务 (ws)  │                │
│  └──────┬─────┘  └──────┬─────┘                │
│         │               │                      │
│  ┌──────▼───────────────▼─────┐                │
│  │       业务逻辑层             │                │
│  │                             │                │
│  │  ┌─────────┐ ┌───────────┐ │                │
│  │  │ LLM 调用 │ │ Tool 调用  │ │                │
│  │  │ (多模型)  │ │ (7 个工具) │ │                │
│  │  └─────────┘ └───────────┘ │                │
│  │                             │                │
│  │  ┌─────────┐ ┌───────────┐ │                │
│  │  │ 记忆系统  │ │ RAG 检索  │ │                │
│  │  │ (三分类)  │ │ (混合检索) │ │                │
│  │  └─────────┘ └───────────┘ │                │
│  │                             │                │
│  │  ┌─────────┐ ┌───────────┐ │                │
│  │  │ 协作链   │ │ 定时任务   │ │                │
│  │  └─────────┘ └───────────┘ │                │
│  └─────────────┬───────────────┘                │
│                │                                │
│  ┌─────────────▼────────────────┐               │
│  │        数据层                 │               │
│  │  SQLite (WAL + FTS5)         │               │
│  │  + 文件系统 (SOUL.md / RAG)   │               │
│  └──────────────────────────────┘               │
│                                                │
└────────────────────────────────────────────────┘
         │
         ▼
  ┌─────────────┐
  │ LLM Provider │  OpenAI / Claude / 通义 / Ollama / ...
  └─────────────┘
```

## 目录结构

```
xiajiao/
├── server/                    # 后端代码
│   ├── index.js               # 入口 — HTTP + WebSocket 服务启动
│   ├── storage.js             # 数据层 — SQLite 操作 + Agent 管理
│   ├── ws.js                  # WebSocket — 实时消息推送
│   │
│   ├── api/                   # REST API 路由
│   │   ├── messages.js        # 消息 CRUD + 搜索
│   │   ├── channels.js        # 频道 / 群组管理
│   │   ├── agents.js          # Agent CRUD
│   │   ├── settings.js        # 系统设置
│   │   ├── uploads.js         # 文件上传
│   │   └── ...
│   │
│   ├── services/              # 核心业务逻辑
│   │   ├── llm.js             # LLM 调用 — 多 Provider、流式输出、Tool Calling 循环
│   │   ├── tools.js           # 工具注册 + 调用分发
│   │   ├── memory.js          # 记忆系统 — 三分类、embedding、去重
│   │   ├── rag.js             # RAG — 分块、索引、混合检索、重排序
│   │   ├── collaboration.js   # 协作链 — 编排、状态管理
│   │   ├── schedule.js        # 定时任务 — Cron 调度
│   │   └── search-engines.js  # 搜索引擎适配器
│   │
│   └── test/                  # 单元测试 (node:test)
│       ├── storage.test.js
│       ├── llm.test.js
│       ├── memory.test.js
│       ├── rag.test.js
│       └── ...
│
├── public/                    # 前端静态文件（零构建）
│   ├── index.html             # 单页应用入口
│   ├── app.js                 # 主逻辑 — 路由、渲染、事件
│   ├── styles.css             # 样式 — 含 Light/Dark 主题
│   ├── uploads/               # 用户上传文件
│   └── lib/                   # 前端第三方库（直接引用）
│       ├── marked.min.js      # Markdown 渲染
│       └── highlight.min.js   # 代码高亮
│
├── data/                      # 运行时数据（.gitignore 排除）
│   ├── im.db                  # 主数据库
│   ├── agents.json            # Agent 列表
│   ├── workspace-xxx/         # Agent 独立工作区
│   │   ├── SOUL.md            # 人格设定
│   │   ├── memory.db          # 独立记忆库
│   │   └── rag/               # RAG 文档和索引
│   └── _soul-templates/       # SOUL.md 模板
│
├── docs-site/                 # VitePress 文档站源码
├── Dockerfile                 # Docker 构建文件
├── package.json               # 6 个依赖
└── README.md                  # 项目文档
```

## 核心模块详解

### HTTP 路由 (`server/index.js`)

不使用任何框架，直接基于 `node:http`：

```javascript
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith('/api/messages')) {
    return handleMessages(req, res, url);
  }
  if (url.pathname.startsWith('/api/channels')) {
    return handleChannels(req, res, url);
  }
  // ... 更多路由
  // 静态文件 fallback
  return serveStatic(req, res, url);
});
```

为什么不用 Express？因为虾饺的路由很简单——大约 15 个 API 端点。用 `node:http` 加几个 `if/else` 就搞定了，没必要引入一个框架。

### WebSocket (`server/ws.js`)

使用 `ws` 库（唯一无法替代的依赖——Node.js 内置 HTTP 不含 WebSocket 服务端）：

```
客户端 → WebSocket 连接 → 服务端
  ↓                         ↓
消息发送  ←──── 广播 ────→  消息推送到所有客户端
                            Agent 回复推送
                            Tool Calling 状态推送
                            协作链进度推送
```

WebSocket 用于：
- 实时消息推送
- LLM 流式输出（逐 token 推送）
- Tool Calling 状态更新
- 协作链进度通知

### LLM 调用 (`server/services/llm.js`)

核心是一个 [Tool Calling](/zh/features/tool-calling) 循环：

```
while (true) {
  response = await callLLM(messages)

  if (response.hasToolCalls) {
    for (toolCall of response.toolCalls) {
      result = await executeTool(toolCall)
      messages.push(toolResult)
    }
    continue  // 带着工具结果再次调用 LLM
  }

  break  // 没有工具调用，返回最终回复
}
```

支持两种 API 协议：
- `openai-completions`：OpenAI 及其兼容 API
- `anthropic-messages`：Claude 专用协议

流式输出通过 SSE 或 WebSocket 逐 token 推送给客户端。

### 记忆系统 (`server/services/memory.js`)

用户侧说明见 [Agent 持久记忆](/zh/features/agent-memory)。

```
写入流程：
  text → embedding → 查重（余弦相似度 > 0.85？）
  ├── 是 → 更新已有记忆
  └── 否 → 插入新记忆（带类型标签）

检索流程：
  query → embedding → 余弦相似度搜索 → Top-K → 注入 System Prompt
```

每个 Agent 有独立的 `memory.db`，存储 embedding 向量和文本。

### RAG 系统 (`server/services/rag.js`)

用户侧说明见 [RAG 知识库](/zh/features/rag)。

```
索引流程：
  文档 → 解析（PDF/TXT/MD）→ 分层分块 → embedding → 存入 SQLite

检索流程：
  query → BM25 + 向量检索 → RRF 融合 → LLM 重排序 → Top-K
```

### 数据层 (`server/storage.js`)

所有数据存储在 SQLite 中，使用 WAL 模式支持并发读取：

| 表 | 内容 |
|---|------|
| `messages` | 消息（含 FTS5 全文搜索索引） |
| `channels` | 频道 / 群组 |
| `settings` | 系统设置（LLM 配置等） |

Agent 相关数据存储在文件系统中（`data/workspace-xxx/`），而非数据库。这样做的好处是：
- SOUL.md 可以直接用文本编辑器修改
- 工作区可以整体复制/迁移
- 结构清晰直观

## 数据流

### 一条消息的完整旅程

```
1. 用户在浏览器发送消息
   ↓
2. HTTP POST /api/messages
   ↓
3. 消息存入 SQLite (messages 表)
   ↓
4. WebSocket 广播给所有客户端
   ↓
5. 解析 @mention，确定目标 Agent
   ↓
6. 加载 Agent 的 SOUL.md → System Prompt
   ↓
7. 自动注入记忆（如果开启了 autoInjectMemory）
   ↓
8. 构建消息上下文（历史消息 + 记忆 + SOUL.md）
   ↓
9. 调用 LLM API（流式）
   ↓
10. LLM 返回 → 检查是否有 Tool Calling
    ├── 有 → 执行工具 → 结果回注 → 回到步骤 9
    └── 没有 → 继续
   ↓
11. 逐 token 通过 WebSocket 推送给客户端
   ↓
12. Agent 回复存入 SQLite
   ↓
13. 如果有协作链 → 触发下一个 Agent（回到步骤 5）
```

### 协作链的数据流

协作链的产品说明见 [协作流](/zh/features/collaboration-flow)；群聊与 @mention 见 [多 Agent 群聊](/zh/features/multi-agent-chat)。

```
用户消息 → Agent A → [输出] → 注入上下文 → Agent B → [输出] → Agent C → 完成
           ↑                                ↑                    ↑
        状态推送(WS)                    状态推送(WS)          状态推送(WS)
           ↓                                ↓                    ↓
        前端面板更新                     前端面板更新           前端面板更新
```

## 6 个依赖详解

| 包 | 作用 | 为什么不能去掉 |
|---|------|--------------|
| `ws` | WebSocket 服务端 | Node.js 标准库没有 WebSocket 服务端实现 |
| `formidable` | 文件上传解析 | `multipart/form-data` 的流式解析，标准库不提供 |
| `node-cron` | 定时任务调度 | Cron 表达式解析，标准库不支持 |
| `pdf-parse` | PDF 文本提取 | RAG 知识库需要从 PDF 提取文字 |
| `@larksuiteoapi/node-sdk` | 飞书连接器 | 飞书 WebSocket 长连接协议是私有的 |
| `@modelcontextprotocol/sdk` | MCP 协议 | JSON-RPC + 能力协商，手写容易不兼容 |

其他所有功能都用 Node.js 标准库实现：

| 功能 | 标准库 | 替代的第三方包 |
|------|--------|--------------|
| HTTP 服务 | `node:http` | Express / Koa / Fastify |
| 数据库 | `node:sqlite` | pg / mysql2 |
| 单元测试 | `node:test` | Jest / Mocha / Vitest |
| UUID 生成 | `node:crypto` | uuid / nanoid |
| 路径处理 | `node:path` | — |
| 文件操作 | `node:fs` | fs-extra |

## 安全模型

### 认证

- 简单密码保护（`OWNER_KEY` 环境变量）
- Session Cookie（`node:crypto` 生成随机 token）
- 适用于个人 / 信任的小团队

### 数据隔离

- 每个 Agent 有独立的工作区和记忆库
- Agent 之间的记忆互不可见
- 文件上传限制在指定目录

### LLM API Key 安全

- Key 存储在本地 SQLite
- 只发送给对应的 LLM Provider
- 不会发送给任何第三方

## 性能特征

虾饺是单进程 Node.js + SQLite 架构，启动快、资源占用低。

瓶颈在 LLM API 调用（网络延迟 + 生成时间），不在虾饺本身。SQLite WAL 模式的写入性能对 Agent 聊天场景绰绰有余。

## 关键模块走读

### HTTP 路由实现

虾饺不用框架，路由用最朴素的方式实现：

```javascript
// 简化版路由核心逻辑
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method;

  // 静态文件
  if (method === 'GET' && !path.startsWith('/api/')) {
    return serveStatic(req, res, path);
  }

  // API 路由表
  const routes = {
    'POST /api/login': handleLogin,
    'GET /api/messages': handleGetMessages,
    'POST /api/messages': handleSendMessage,
    'GET /api/agents': handleGetAgents,
    'PUT /api/agents/:id': handleUpdateAgent,
    // ... ~15 个端点
  };

  const handler = matchRoute(routes, method, path);
  if (handler) {
    await handler(req, res, params);
  } else {
    res.writeHead(404).end();
  }
});
```

15 个端点不需要 Express，手动匹配足够清晰。

### WebSocket 流式输出

LLM 的流式输出是虾饺的核心体验——逐 token 推送：

```
用户发消息
  ↓
解析 @mention → 确定目标 Agent
  ↓
加载 Agent SOUL.md + 检索相关记忆 + 获取最近消息
  ↓
组装 messages[] 发给 LLM API（stream: true）
  ↓
LLM 返回 SSE 流
  ↓ 逐 chunk 处理：
  │
  ├── 普通文本 chunk → WebSocket 推送 stream_chunk 给前端
  │
  ├── tool_call chunk → 
  │     ├── 推送 tool_call 状态给前端
  │     ├── 执行工具（web_search / rag_query / memory_write 等）
  │     ├── 推送 tool_result 给前端
  │     └── 把工具结果追加到 messages[]，继续调用 LLM
  │
  └── finish_reason: stop →
        ├── 推送 stream_end 给前端
        ├── 完整消息写入 SQLite
        └── 如果在协作链中 → 触发下一个 Agent
```

关键难点是 Tool Calling 的循环：LLM 可能在一次回复中多次调用工具，每次都需要"调用工具 → 拿结果 → 继续生成"的循环。

### 记忆系统工作流

```
写入记忆：
  Agent 调用 memory_write(type, content)
    ↓
  计算 content 的 embedding 向量
    ↓
  搜索已有记忆，计算余弦相似度
    ↓
  如果 similarity > 0.85 → 跳过（去重）
  如果 similarity > 0.7 → 更新已有记忆
  否则 → 插入新记忆
    ↓
  存入 memory.db

检索记忆：
  新消息到达 → 自动检索相关记忆
    ↓
  计算消息的 embedding 向量
    ↓
  余弦相似度搜索 top-K 相关记忆
    ↓
  按三分类组织（语义/情景/程序性）
    ↓
  注入到 System Prompt 中：
    """
    [你的相关记忆]
    语义记忆：用户偏好 Python，公司用阿里云
    情景记忆：上次讨论了支付接口设计
    程序性记忆：回复要简洁，代码用 TypeScript
    """
```

### RAG 检索流水线

```
用户提问
  ↓
同时发起两路检索：
  ├── BM25 路：SQLite FTS5 全文搜索 → top-20 结果
  └── 向量路：embedding 余弦相似度搜索 → top-20 结果
  ↓
RRF (Reciprocal Rank Fusion) 合并两路结果
  score = Σ 1/(k + rank_i)  （k=60）
  ↓
取 top-10 候选 chunks
  ↓
LLM Reranking：用 LLM 对 10 个候选评分
  prompt: "请评估以下段落与问题的相关性（1-10 分）"
  ↓
取 top-5 最相关 chunks
  ↓
注入到 Agent 的 prompt 中
```

## 扩展性

### 添加新工具

在 `server/services/tools.js` 中注册新工具：

```javascript
const tools = {
  web_search: { /* ... */ },
  rag_query: { /* ... */ },
  my_custom_tool: {
    description: "我的自定义工具",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "查询内容" }
      }
    },
    handler: async (params) => {
      return { result: "工具执行结果" };
    }
  }
};
```

一个文件，一个对象，就是全部。不需要学框架概念、不需要配置中间件。

### 添加新 API

在 `server/api/` 中添加新文件，然后在 `index.js` 中注册路由。

### 添加新搜索引擎

在 `server/services/search-engines.js` 中添加新的搜索引擎适配器。已有 6 个引擎适配器可参考。

### 添加新 LLM Provider

只要兼容 OpenAI API 格式（`/v1/chat/completions`），直接在设置中配置即可。不需要改代码。

### 添加新渠道

渠道接入在 `server/services/channels/` 中。实现 `onMessage` 和 `sendMessage` 两个方法即可对接新平台。

## 和其他项目对比

| 维度 | 虾饺 | Dify（参考） | 典型 Node.js 项目 |
|------|------|-------------|------------------|
| 启动文件 | 1 个 `index.js` | 多个微服务 | 1 个 `app.js` |
| 路由 | 手动匹配 | Flask/Django | Express Router |
| ORM | 裸 SQL | SQLAlchemy | Sequelize/Prisma |
| 测试 | `node:test` | pytest | Jest |
| 构建 | 无 | pip + Docker | Webpack + Babel |
| 学习曲线 | 读 1 天 | 读 1-2 周 | 读 2-3 天 |

虾饺的架构不是"最佳实践"，而是"最小实践"。它证明了用 Node.js 标准库就能构建一个功能完整的 AI 平台。

## 相关文档

### 功能与使用

- [Tool Calling](/zh/features/tool-calling) — 工具循环与 7 个内置工具
- [Agent 持久记忆](/zh/features/agent-memory) — 三分类记忆与注入
- [RAG 知识库](/zh/features/rag) — 检索管线与文档上传
- [多 Agent 群聊](/zh/features/multi-agent-chat) — 群组与路由
- [协作流](/zh/features/collaboration-flow) — 协作链与可视化面板
- [外部集成](/zh/features/integrations) — 飞书 / 钉钉等渠道

### 开发与运维

- [API 与协议参考](/zh/guide/api-reference) — HTTP API 和 WebSocket 协议详情
- [贡献指南](/zh/guide/dev-guide) — 如何参与开发
- [安全与隐私](/zh/guide/security) — 安全模型详解
- [故障排查](/zh/guide/troubleshooting) — 常见问题诊断
- [常见问题](/zh/guide/faq) — 技术问题解答
- [快速开始](/zh/guide/quick-start) — 先跑起来体验一下
