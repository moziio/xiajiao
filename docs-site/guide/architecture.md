---
title: 架构设计 — 虾饺 IM
description: 虾饺 IM 的技术架构详解——极简设计哲学、代码结构、数据流、核心模块。
---

# 架构设计

虾饺的架构设计遵循一个原则：**用最少的代码和依赖，实现完整的功能。**

这不是一个炫技的架构，而是一个实用的架构。

## 设计哲学

### 三条铁律

1. **能用标准库的，不引入第三方包** — `node:http` 替代 Express，`node:test` 替代 Jest，`node:crypto` 替代 uuid
2. **能用单进程的，不搞分布式** — 一个 Node.js 进程搞定一切
3. **能用文件系统的，不搞外部服务** — SQLite 替代 PostgreSQL，文件替代 Redis

### 为什么这样设计？

| 好处 | 说明 |
|------|------|
| **部署简单** | `npm start` 就跑，不需要 Docker Compose 编排多个服务 |
| **安全风险小** | 6 个依赖 vs 600 个依赖，攻击面差 100 倍 |
| **维护成本低** | 不用追踪几百个包的安全更新 |
| **可理解** | 一个人能读完全部源码 |
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

核心是一个 Tool Calling 循环：

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

```
写入流程：
  text → embedding → 查重（余弦相似度 > 0.9？）
  ├── 是 → 更新已有记忆
  └── 否 → 插入新记忆（带类型标签）

检索流程：
  query → embedding → 余弦相似度搜索 → Top-K → 注入 System Prompt
```

每个 Agent 有独立的 `memory.db`，存储 embedding 向量和文本。

### RAG 系统 (`server/services/rag.js`)

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

```
用户消息 → Agent A → [输出] → 注入上下文 → Agent B → [输出] → Agent C → 完成
           ↑                                ↑                    ↑
        状态推送(WS)                    状态推送(WS)          状态推送(WS)
           ↓                                ↓                    ↓
        前端面板更新                     前端面板更新           前端面板更新
```

## 6 个依赖详解

| 包 | 大小 | 作用 | 为什么不能去掉 |
|---|------|------|--------------|
| `ws` | 74KB | WebSocket 服务 | Node.js 内置 HTTP 没有 WebSocket 服务端 |
| `better-sqlite3` | 8MB | SQLite 同步驱动 | `node:sqlite` 是异步的，embedding 计算需要同步 API |
| `marked` | 200KB | Markdown→HTML | SOUL.md 和消息渲染 |
| `pdf-parse` | 300KB | PDF 文本提取 | RAG 知识库需要解析 PDF |
| `highlight.js` | 3MB | 代码语法高亮 | 消息中的代码块着色 |
| `sharp` | 25MB | 图片处理 | 上传图片生成缩略图 |

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

| 指标 | 数值 | 说明 |
|------|------|------|
| 启动时间 | < 1 秒 | 无需预热 |
| 内存占用 | ~50MB | 空闲状态 |
| 并发连接 | ~100 | WebSocket 长连接 |
| 消息延迟 | ~10ms | 不含 LLM 调用时间 |
| SQLite 写入 | ~5000 QPS | WAL 模式 |
| SQLite 读取 | ~50000 QPS | 包括 FTS5 搜索 |

瓶颈在 LLM API 调用（网络延迟 + 生成时间），不在虾饺本身。

## 扩展性

### 添加新工具

在 `server/services/tools.js` 中注册新工具：

```javascript
const tools = {
  web_search: { /* ... */ },
  rag_query: { /* ... */ },
  // 添加你的工具
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

### 添加新 API

在 `server/api/` 中添加新文件，然后在 `index.js` 中注册路由。

### 添加新搜索引擎

在 `server/services/search-engines.js` 中添加新的搜索引擎适配器。

## 下一步

- [贡献指南](/guide/dev-guide) — 如何参与开发
- [常见问题](/guide/faq) — 技术问题解答
- [快速开始](/guide/quick-start) — 先跑起来体验一下
