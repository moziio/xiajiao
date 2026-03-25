---
title: 术语表 — 虾饺 IM
description: 虾饺 IM 中用到的核心概念和术语解释——Agent、SOUL.md、RAG、Embedding、协作链等。
---

# 术语表

虾饺中会遇到的核心概念，按字母顺序排列。

## A

### Agent

虾饺中的 AI 角色。每个 Agent 有自己的名字、头像、人格设定（SOUL.md）、模型配置和工具权限。你可以把 Agent 理解为一个有特定技能的 AI 同事。

→ [多 Agent 群聊](/zh/features/multi-agent-chat)

### @mention

在群组中用 `@Agent名` 指定某个 Agent 回复。类似微信群里 @某个人。

```
你：@翻译官 把这段话翻译成英文
```

→ [多 Agent 群聊](/zh/features/multi-agent-chat)

## B

### BM25

一种经典的关键词检索算法。虾饺的 RAG 系统用 BM25 做精确关键词匹配，配合向量检索做语义匹配，两路结果通过 RRF 融合。

→ [RAG 知识库](/zh/features/rag)

## C

### call_agent

虾饺的内置工具之一。允许一个 Agent 调用另一个 Agent 完成子任务。最多支持 3 层嵌套。

```
代码助手 → call_agent(翻译官, "翻译这段代码注释")
```

→ [Tool Calling](/zh/features/tool-calling)

### Chunk

RAG 系统中文档的切片单元。虾饺采用双层设计：小块（~200 字）用于精确检索，大块（~800 字）提供完整上下文。

→ [RAG 知识库](/zh/features/rag)

### Cron

定时任务的时间表达式。例如 `0 9 * * *` 表示每天早上 9 点执行。虾饺通过 `manage_schedule` 工具支持 Cron 定时任务。

→ [Tool Calling](/zh/features/tool-calling)

## D

### Docker Compose

容器编排工具。虾饺提供 `docker-compose.yml`，支持一键 Docker 部署。但虾饺的核心理念是"不需要 Docker"——`npm start` 就够了。

→ [Docker 部署](/zh/deployment/docker)

## E

### Embedding

将文本转换为数字向量的技术。虾饺用 embedding 实现记忆的语义搜索和去重。两段文字意思相近时，它们的 embedding 向量余弦相似度接近 1。

```
"喜欢 Python" → [0.23, 0.87, 0.11, ...]
"偏好 Python 语言" → [0.21, 0.85, 0.13, ...]
余弦相似度 = 0.97 → 判定为重复，不再写入
```

→ [Agent 持久记忆](/zh/features/agent-memory)

## F

### FTS5

SQLite 的全文搜索引擎（Full-Text Search 5）。虾饺用 FTS5 做消息历史搜索和 RAG 的 BM25 关键词检索。零外部依赖——不需要 Elasticsearch。

## G

### Group（群组）

虾饺中多个用户和 Agent 共同对话的空间。可以设置协作链、指定 Leader、配置成员权限。

→ [多 Agent 群聊](/zh/features/multi-agent-chat)

## I

### IM

即时通讯（Instant Messaging）。虾饺的核心交互模式——Agent 在 IM 界面中像同事一样与你对话。

## L

### Leader

群组中的默认响应 Agent。当用户发消息但没有 @mention 任何 Agent 时，Leader 负责回复。

→ [多 Agent 群聊](/zh/features/multi-agent-chat)

### LLM

大语言模型（Large Language Model）。如 GPT-4o、Claude、通义千问等。虾饺调用 LLM API 生成 Agent 的回复。

→ [模型配置](/zh/guide/model-config)

## M

### MCP

Model Context Protocol，模型上下文协议。一种标准化的工具调用协议。虾饺的 Tool Calling 兼容 MCP 标准。

### memory_write / memory_search

虾饺的内置记忆工具。`memory_write` 将信息写入持久记忆，`memory_search` 检索已有记忆。

→ [Agent 持久记忆](/zh/features/agent-memory)

## O

### OWNER_KEY

虾饺的登录密码，通过环境变量设置。默认值是 `admin`，生产环境必须修改。

```bash
OWNER_KEY="your-strong-password" npm start
```

→ [安全与隐私](/zh/guide/security)

## P

### Provider

LLM 服务提供商。如 OpenAI、Anthropic、阿里云（通义千问）、DeepSeek 等。虾饺支持任何兼容 OpenAI API 格式的 Provider。

→ [模型配置](/zh/guide/model-config)

### PWA

渐进式 Web 应用（Progressive Web App）。虾饺的前端支持 PWA，可以添加到手机桌面像 App 一样使用，支持离线缓存。

## R

### RAG

检索增强生成（Retrieval-Augmented Generation）。上传文档后，Agent 回答问题时先从文档中检索相关片段，再基于检索结果生成回答。防止 AI"瞎编"。

→ [RAG 知识库](/zh/features/rag)

### RBAC

基于角色的访问控制（Role-Based Access Control）。虾饺支持四级角色：Owner → Admin → Member → Guest。

→ [安全与隐私](/zh/guide/security)

### RRF

倒数排名融合（Reciprocal Rank Fusion）。虾饺 RAG 用 RRF 将 BM25 和向量检索的结果合并排序。

公式：`score = Σ 1/(k + rank_i)`，其中 k=60。

→ [RAG 知识库](/zh/features/rag)

## S

### SOUL.md

虾饺最独特的设计。每个 Agent 有一个 `SOUL.md` 文件，用 Markdown 格式定义 Agent 的人格、能力、工作原则和输出规则。等价于 System Prompt，但更结构化、可版本控制。

```markdown
# 翻译官
你是一位精通中英双语的翻译专家。
## 工作原则
- 信、达、雅
```

→ [SOUL.md 写作指南](/zh/guide/soul-guide) · [SOUL.md 模板库](/zh/guide/soul-templates)

### Stream（流式输出）

LLM 逐 token 返回回复，虾饺通过 WebSocket 实时推送给前端，像打字机一样显示。用户不用等整个回复生成完才看到。

→ [架构设计](/zh/guide/architecture)

### System Prompt

发送给 LLM 的系统指令。虾饺的 System Prompt 由 SOUL.md 内容 + 自动注入的记忆 + RAG 检索结果组装而成。

## T

### Tool Calling

LLM 在回复过程中调用外部工具的能力。虾饺有 7 个内置工具：web_search、rag_query、memory_write、memory_search、call_agent、manage_channel、manage_schedule。

→ [Tool Calling](/zh/features/tool-calling)

## V

### Vanilla JS

不使用任何框架（React/Vue/Angular）的纯 JavaScript。虾饺的整个前端都用 Vanilla JS 编写——改完代码刷新浏览器就生效，不需要编译。

## W

### WAL

Write-Ahead Logging，SQLite 的一种日志模式。虾饺默认开启 WAL，允许并发读写，写入性能提升 2-5 倍。

```bash
sqlite3 data/im.db "PRAGMA journal_mode;"  # 应输出 wal
```

→ [性能调优](/zh/guide/performance)

### web_search

虾饺的内置搜索工具。支持 6 个搜索引擎，自动故障切换。Agent 在回答问题时可以自动联网搜索。

→ [Tool Calling](/zh/features/tool-calling)

### WebSocket

全双工通信协议。虾饺用 WebSocket（`ws` 库）实现消息的实时推送和流式输出。连接建立后，服务端可以主动推送消息给客户端。

→ [API 与协议参考](/zh/guide/api-reference)

### Workspace

Agent 的工作空间目录（`data/workspace-{id}/`）。包含 Agent 的 SOUL.md、记忆数据库、RAG 知识库文件。每个 Agent 的 Workspace 完全隔离。

## X

### 协作链

协作流中的**线性接力顺序**配置：在群组中设置 Agent 的接力顺序，如 `小说家 → 编辑 → 翻译官`。一条消息触发后，Agent 按顺序自动执行。完整的协作流还包括可视化面板与人工干预等，不单指协作链。

```
用户发一条消息
  → 小说家处理（~5s）
  → 编辑处理（~3s）
  → 翻译官处理（~3s）
  → 用户看到最终结果
```

→ [协作流](/zh/features/collaboration-flow)

### 虾饺

广式点心（Har Gow）。薄如蝉翼的外皮包裹着鲜嫩的虾仁。项目取名自此——小巧精致，内料丰富。最少的依赖，最全的能力。

## 相关文档

- [架构设计](/zh/guide/architecture) — 理解整体架构与模块划分
- [SOUL.md 写作指南](/zh/guide/soul-guide) — Agent 人格与 SOUL.md 相关术语
- [RAG 知识库](/zh/features/rag) — RAG、Embedding、Chunk、BM25 等概念
- [多 Agent 群聊](/zh/features/multi-agent-chat) — Agent、@mention、群组、Leader
- [API 与协议参考](/zh/guide/api-reference) — WebSocket、HTTP API 等协议术语
