# 虾饺 IM 产品演进规划

> 版本：v1.0 | 日期：2026-03-11 | 状态：规划中

---

## 现状画像

### 代码规模

| 文件 | 行数 | 职责 |
|------|------|------|
| `server.js` | ~1240 | HTTP Server + WebSocket + Gateway 连接 + 所有 API 路由 |
| `public/js/app.js` | ~2960 | 全部前端逻辑（登录、聊天、通讯录、社区、设置等） |
| `scheduler.js` | ~350 | 定时任务（例会、巡检、周报、社交） |
| `public/css/style.css` | ~900 | 全部样式 |
| `public/js/i18n.js` + `lang/` | ~530×2 | 国际化引擎 + 中英文包 |

### 依赖

```json
{ "ws": "^8.19.0", "formidable": "^3.5.2", "node-cron": "^4.2.1" }
```

### 架构

```
浏览器 (Vanilla JS)
  ──WebSocket──> server.js ──WebSocket──> OpenClaw Gateway ──> LLM API
                    ↕
              agents.json / models.json / data/（本地配置）
              openclaw.json（Gateway 配置）
```

### 核心问题

1. **前后端都是单文件巨石**，新增功能容易引发连锁 bug（如变量 TDZ 问题）
2. **Agent 回复只有纯文字**，无法图文混排、卡片交互
3. **依赖 OpenClaw Gateway**，Gateway 不可用则 Agent 完全瘫痪
4. **知识库是文件级**，无向量切片和语义检索
5. **无工作流编排**，多 Agent 协作只能靠群聊 @ 手动串联

---

## 竞对对标

| 能力 | 虾饺 IM | Coze | Dify | FastGPT |
|------|---------|------|------|---------|
| IM 对话体验 | ✅ 群聊/单聊/@ | ❌ | ❌ | ❌ |
| 多 Agent 群聊 | ✅ | ❌ | ❌ | ❌ |
| Agent 社区 | ✅ 虾区 | ❌ | ❌ | ❌ |
| 定时任务 | ✅ cron | ✅ 触发器 | ❌ | ❌ |
| 图文混排回复 | ❌ | ✅ | ✅ | ❌ |
| 工作流编排 | ❌ | ✅ | ✅ | ✅ |
| RAG 知识库 | ❌ 文件级 | ✅ | ✅ | ✅ |
| Tool/插件 | ❌ | ✅ | ✅ | ✅ |
| 私有部署成本 | ✅ 极低 | ❌ SaaS | 中 | 中 |

**虾饺独特优势**：IM 范式 + Agent 社交属性 + 极轻量部署
**主要差距**：多模态、RAG、工作流、Gateway 依赖

---

## 演进路线

### P1：架构重构 + 多模态基础（2-3 周）

> 目标：代码可维护，Agent 支持图文回复

#### P1.1 后端模块化拆分

将 `server.js` 1240 行拆为模块化结构：

```
server/
├── index.js              # 入口：HTTP + WebSocket 启动
├── router.js             # 轻量路由表（替代 if/else 链）
├── middleware/
│   └── auth.js           # 认证：isOwnerReq, guardOwner
├── routes/
│   ├── auth.js           # POST/DELETE/GET /api/auth
│   ├── agents.js         # /api/agents CRUD + files + workspace
│   ├── groups.js         # /api/groups CRUD
│   ├── community.js      # /api/community/posts
│   ├── settings.js       # /api/settings (general/providers/models/gateway)
│   └── tools.js          # /api/tools（新：文生图等工具调用）
├── services/
│   ├── gateway.js        # Gateway WebSocket 连接管理
│   ├── chat.js           # 消息路由、@处理、群聊分发
│   ├── storage.js        # JSON 文件读写统一管理
│   └── media.js          # 新：文生图、文件处理
├── scheduler.js          # 定时任务（已有，平移）
└── config.js             # 常量、路径、环境变量
```

**原则**：
- 不引入 Express/Koa，继续用原生 `http`
- 用路由表 `{ method, path, handler }` 替代 if/else 链
- 每个路由文件导出 handler 数组
- `services/` 放业务逻辑，`routes/` 只做参数解析和响应

#### P1.2 前端组件化拆分

将 `app.js` 2960 行拆为 ES Module：

```
public/js/
├── app.js                # 入口：初始化、WebSocket、全局事件
├── store.js              # 集中状态管理（替代散落的全局变量）
├── utils.js              # 工具函数（esc, formatTime, stripMd 等）
├── components/
│   ├── login.js          # 登录页
│   ├── chat.js           # 聊天视图 + 消息渲染 + 输入处理
│   ├── contacts.js       # 通讯录 + Agent/群组管理
│   ├── community.js      # 虾区
│   ├── favorites.js      # 收藏
│   ├── settings.js       # 设置面板
│   ├── modals.js         # 弹窗（alert/confirm/prompt）
│   └── richMessage.js    # 新：富媒体消息渲染
├── i18n.js               # 国际化（已有）
└── lang/                 # 语言包（已有）
```

**原则**：
- 用 `<script type="module">` 加载，浏览器原生支持，无需构建工具
- `store.js` 统一管理状态，组件通过 import 访问
- 逐步拆分，每次迁移一个模块并验证

#### P1.3 Markdown 渲染增强

- Agent 回复中 `![desc](url)` 渲染为圆角、限宽、可点击放大的图片
- 视频链接自动识别为 `<video>` 播放器
- 代码块语法高亮（引入 highlight.js）
- 表格样式美化

#### P1.4 文生图工具拦截

在 IM Server 层拦截 Agent 回复中的特定标记，调用文生图 API：

```
Agent 回复: "好的，我为你生成图片 [IMG_GEN: 一只橘猫，水彩风格]"
  → IM Server 检测 [IMG_GEN: ...] 标记
  → 调用 DashScope wanx2.1-t2i-turbo API
  → 替换为: "好的，我为你生成图片 ![橘猫](https://oss-url...)"
  → 前端渲染图文混排
```

不走 Gateway Tool Calling，完全自主可控。

---

### P2：脱离 Gateway + RAG 知识库（3-4 周）

> 目标：完全独立运行，只需 API Key；知识库支持语义检索

#### P2.1 脱离 OpenClaw Gateway

按 `docs/虾饺拆分.md` Phase 2 执行：

```
目标架构：
  浏览器 → IM Server → LLM API（直连，无 Gateway）
```

核心改造：

| 模块 | 改造内容 |
|------|---------|
| `services/llm.js`（新建） | 直接调用 OpenAI 兼容 `/v1/chat/completions`，支持流式 SSE |
| `sendToGateway()` | 替换为 `sendToLLM()`，从 `models.json` 读取 Provider 配置 |
| Agent 上下文 | 自建对话历史窗口（最近 N 轮 + SOUL.md + 知识库片段） |
| 流式响应 | 用 fetch stream 解析 SSE，通过 WebSocket 推送到前端 |
| Tool Calling | 自实现 function calling 循环（调用 → 执行工具 → 再次调用） |
| Gateway 代码 | 保留但标记为可选，通过配置开关选择直连或走 Gateway |

完成后：**`npm start` + 一个 API Key 即可运行**。

#### P2.2 向量知识库（RAG）

轻量级本地向量检索，零外部依赖：

| 组件 | 方案 |
|------|------|
| 文本切片 | 自实现（按段落 + 固定 token 数，重叠窗口） |
| Embedding | DashScope `text-embedding-v3`（API 调用） |
| 向量存储 | `data/workspace-{agent}/embeddings.json` |
| 相似度搜索 | 余弦相似度（纯 JS，无依赖） |
| 检索流程 | 用户提问 → Embedding → Top-K 相似块 → 注入 system prompt → LLM 回答 |

知识库上传/更新时自动触发切片和 Embedding。

---

### P3：工作流编排 + 富媒体消息（4-6 周）

> 目标：对标 Coze 核心能力

#### P3.1 Agent 工作流

多 Agent 管道式协作：

```json
{
  "id": "content-pipeline",
  "name": "内容生产流水线",
  "steps": [
    { "agent": "wechat-editor", "action": "选题策划", "input": "user" },
    { "agent": "wechat-writer", "action": "撰写初稿", "input": "prev" },
    { "agent": "wechat-publisher", "action": "排版发布", "input": "prev" }
  ],
  "trigger": "manual"
}
```

- 前端：流程编辑器（节点拖拽 + 连线）
- 后端：工作流执行引擎（顺序/并行/条件分支）
- 内置模板：内容生产、数据分析、客服接待

#### P3.2 结构化富媒体消息

消息协议从纯文字升级为块级结构：

```json
{
  "type": "agent",
  "blocks": [
    { "type": "text", "content": "分析结果：" },
    { "type": "image", "url": "...", "caption": "趋势图" },
    { "type": "table", "headers": ["指标","数值"], "rows": [...] },
    { "type": "actions", "buttons": [
      { "label": "导出", "action": "export" },
      { "label": "深入分析", "action": "drill" }
    ]}
  ]
}
```

- 向下兼容：旧消息仍为 `{ text: "..." }` 格式
- 渲染器：`richMessage.js` 根据 block type 选择渲染策略
- 按钮交互：点击后发送特定指令给 Agent

#### P3.3 语音对话模式

按 `docs/语音会话技术方案.md` 方案 A 实现：

录音 → ASR → 文字发送 → Agent 回复 → TTS 自动播放 → 下一轮录音

#### P3.4 数据持久化升级

从 JSON 文件迁移到 SQLite（可选）：

| 当前 | 目标 | 理由 |
|------|------|------|
| `chat-history.json` | SQLite `messages` 表 | 支持分页查询、全文搜索 |
| `community-posts.json` | SQLite `posts` 表 | 支持复杂筛选 |
| `agents.json` | 保留 JSON | 数据量小，JSON 更直观 |
| `models.json` | 保留 JSON | 同上 |

引入 `better-sqlite3`（编译型，性能好）或 `sql.js`（纯 JS，零编译）。

---

## 技术选型总结

| 层面 | 当前 | P1 目标 | P2 目标 | P3 目标 |
|------|------|---------|---------|---------|
| 后端 | 单文件 http | 模块化路由 | + LLM 直连层 | + 工作流引擎 |
| 前端 | 单文件 Vanilla JS | ES Module 拆文件 | + 状态管理 | + 富媒体渲染 |
| LLM | OpenClaw Gateway | Gateway（不变） | 直连 API | + Tool Calling |
| 知识库 | 文件拼入 prompt | 不变 | 向量 RAG | + 多模态索引 |
| 消息 | 纯文字 + MD | + 图片增强 | + 文生图 | 结构化 blocks |
| 存储 | JSON 文件 | JSON 文件 | JSON 文件 | + SQLite 可选 |
| 依赖 | 3 个 npm 包 | 3 个 | 3 个 | + better-sqlite3 |

---

## 执行原则

1. **每步可验证**：每个子任务完成后必须重启验证，确保不破坏现有功能
2. **渐进式迁移**：不做大爆炸重写，逐模块拆分，旧代码和新模块可并存
3. **向下兼容**：消息格式、API 接口、配置文件格式都保持向下兼容
4. **零构建工具**：前端不引入 Webpack/Vite，用浏览器原生 ES Module
5. **最小依赖**：能用标准库实现的不引入 npm 包

---

## 里程碑检查点

| 检查点 | 完成标志 | 对应阶段 |
|--------|---------|---------|
| M1 | `server.js` 拆为 ≥5 个模块文件，所有 API 正常 | P1.1 |
| M2 | `app.js` 拆为 ≥5 个组件文件，所有 UI 正常 | P1.2 |
| M3 | Agent 回复中图片自动渲染，文生图可用 | P1.3 + P1.4 |
| M4 | 无 Gateway 模式下 Agent 可正常对话 | P2.1 |
| M5 | 知识库支持语义搜索，回答质量可感知提升 | P2.2 |
| M6 | 工作流可创建并执行，富媒体消息可渲染 | P3.1 + P3.2 |

---

## 语言与架构决策

### 结论：保持 Node.js，不换语言

#### 决策依据

**1. 系统瓶颈在 LLM API，不在服务端**

```
虾饺 IM 并发模型：
  实际同时在线：几人 ~ 几十人（私有部署 / 团队内部）
  消息频率：每人每分钟 0-2 条
  Agent 回复耗时：3-30 秒（等 LLM 响应）

Node.js 单进程能力：
  WebSocket 长连接：10,000+
  每秒消息处理：5,000+

结论：Node.js 单进程能力远超实际需求，瓶颈永远在 LLM API
```

**2. Node.js 恰好最适合当前场景**

| 核心需求 | Node.js 表现 |
|---------|-------------|
| WebSocket 长连接 | 一等公民，`ws` 库极成熟 |
| LLM 流式调用 (SSE) | fetch + ReadableStream，天然异步 |
| JSON 处理 | 原生支持，零成本 |
| 文件 I/O | fs 模块，简单直接 |
| AI 编程效率 | JS/TS 是 AI 生成质量最高的语言之一 |

**3. 各语言对比**

| 维度 | Node.js | Go | Python | Java |
|------|---------|-----|--------|------|
| WebSocket | ✅ 原生级 | ✅ gorilla | ⚠️ asyncio 复杂 | ⚠️ Spring 重 |
| LLM 流式 | ✅ 天然异步 | ⚠️ 需手写 SSE | ✅ openai SDK | ⚠️ 啰嗦 |
| JSON | ✅ 原生 | ⚠️ 需定义 struct | ✅ 原生 | ⚠️ Jackson |
| AI 编程效率 | ✅ 极高 | 中等（代码量 2-3 倍） | ✅ 高 | ❌ 低（代码量 5-10 倍） |
| 部署 | `node server.js` | ✅ 单二进制 | 需 venv | 需 JDK/Maven |
| 当前迁移成本 | 0 | ~3000 行重写 | ~2000 行重写 | ~5000 行重写 |

**4. 投资回报率**

花 2 周重写换语言 = 功能零增加、用户无感知。
花 2 周做模块化 + 多模态 = 产品有实质性进步。

### 扩容路线：按需渐进，不提前过度设计

#### 阶段 1：当前（< 100 人） — 无需改动

```
单 Node.js 进程，绰绰有余
```

#### 阶段 2：几百用户 — 轻量改造（不换语言，3-5 天）

```
改造 1：状态外置
  当前 → clientSockets (Set), users (Map), ownerSessions (Set) 在内存
  改造 → 会话状态存 Redis，支持多进程共享

改造 2：多进程
  当前 → 单进程
  改造 → PM2 cluster 模式起 N 个 worker
  WebSocket 粘性会话 → Redis adapter

改造 3：持久化
  当前 → JSON 文件
  改造 → 消息/帖子存 PostgreSQL 或 SQLite

架构：
  Nginx (负载均衡)
    ├── Node.js worker 1 ──┐
    ├── Node.js worker 2 ──┤── Redis（共享状态）
    ├── Node.js worker 3 ──┘
    └── PostgreSQL（持久化）
```

#### 阶段 3：上万用户 — 部分微服务化（只重写 WebSocket 网关）

```
Nginx / API Gateway
  ├── WS 网关 (Go)        ← 唯一用 Go 重写的模块
  │   负责：连接管理、消息路由、心跳
  │   理由：goroutine 管理 10 万连接，内存极低
  │
  ├── API 服务 (Node.js)   ← 保持不变
  │   负责：CRUD、认证、文件上传
  │
  ├── LLM 服务 (Node.js)   ← 保持不变
  │   负责：AI 调用、流式响应、RAG
  │
  └── 定时任务 (Node.js)   ← 保持不变
      负责：cron 调度、巡检、周报

通信：Redis Pub/Sub 或消息队列
存储：PostgreSQL + Redis
```

**为什么只有 WS 网关用 Go**：
- 高并发连接管理是 Go 的绝对强项（goroutine per connection）
- API CRUD 是 I/O 密集，Node.js 足够
- LLM 调用本质是等 HTTP 响应，Go 没有优势
- 定时任务是低频操作，任何语言都行

#### 阶段 4：百万级 — 全面重新设计

到这个规模时，团队和资金都已具备，届时再做全面架构决策。
这是"奢侈的烦恼"，不是当前需要考虑的。

### 如果未来一定要换语言

**首选 Go**，理由：
- 编译为单二进制（`./xiajiao-im` 一个文件跑起来，连 Node.js 都不用装）
- 符合"5 分钟跑起来"的产品定位
- 并发模型（goroutine）天然适合 IM 场景
- 但这是 P3 之后的事，当前阶段 ROI 极低

### 总结

```
当前阶段决策：
  ✅ 保持 Node.js，不换语言
  ✅ 重心放在模块化重构 + 功能开发
  ✅ 架构改造按用户规模渐进推进，不提前过度设计
  ✅ 如需强类型保证，加 TypeScript（最佳折中，不换语言）
```

---

## 执行日志

> 每次改造完成后在此追加记录，格式：日期 | 阶段 | 内容 | 结果

| 日期 | 阶段 | 改造内容 | 结果 |
|------|------|---------|------|
| 2026-03-11 | 规划 | 完成演进规划文档 v1.0 | ✅ 已落地 |
| 2026-03-11 | 规划 | 语音会话技术方案沉淀（`docs/语音会话技术方案.md`） | ✅ 已落地，功能暂缓 |
| 2026-03-11 | 规划 | 语言与架构决策：保持 Node.js + 渐进扩容路线 | ✅ 已确认 |
| 2026-03-13 | P1.1 | 后端模块化拆分：server.js (1239行) → 12个模块文件 | ✅ 已落地，全量自测通过 |
| 2026-03-14 | P3.1 | Agent 工作流：引擎 + 构建器 + 执行面板 + 4个预置模板 + 通讯录/聊天集成 | ✅ 已落地 |
| 2026-03-14 | P3.2 | 结构化富媒体消息：块协议 + 块渲染器 + LLM 响应智能解析 + 按钮交互 + 多轮安全审计 | ✅ 已落地 |
| 2026-03-14 | 增强 | 虾聊/通讯录删除功能 + 级联清理 + 富文本确认弹窗 + 工作流 emoji 选择器 | ✅ 已落地 |
| 2026-03-14 | P3.3 | 语音对话模式（录音→ASR→文字→Agent→TTS→播放）| ⏸ 暂缓，后续改造 |
| 2026-03-14 | P3.4 | 数据持久化升级：JSON → SQLite（node:sqlite）+ FTS5 全文搜索 + 消息分页 + 消息搜索 | ✅ 已落地 |
| | | | |

### P1.1 后端模块化拆分详情

**改造日期**：2026-03-13

**原始状态**：单文件 `server.js`（1239 行），包含配置、存储、认证、Gateway 通信、消息路由、社区、5 组 API 路由

**改造后目录结构**：

```
server/
├── config.js              # 常量、路径、MIME、默认数据（53行）
├── index.js               # HTTP/WS 入口、文件上传、启动逻辑（160行）
├── router.js              # API 路由分发器（27行）
├── middleware/
│   └── auth.js            # 认证（session、guardOwner、readBody、jsonRes）（35行）
├── services/
│   ├── storage.js         # JSON 文件读写、状态管理、bumpMetric（93行）
│   ├── gateway.js         # Gateway WebSocket 连接、事件处理、社区事件引擎、applyConfig（247行）
│   └── chat.js            # 消息路由（routeGroupMessage、detectAgent）（55行）
└── routes/
    ├── auth.js            # /api/auth 路由（30行）
    ├── agents.js          # /api/agents、/api/models 路由 + CRUD（155行）
    ├── groups.js          # /api/groups 路由 + CRUD（47行）
    ├── community.js       # /api/community、/api/profiles、/api/metrics、/api/schedules 路由（156行）
    └── settings.js        # /api/settings、providers、models、gateway 路由（162行）
```

**兼容性**：
- 旧 `server.js` 保留为代理入口（3行），`require('./server/index')`
- `package.json` 更新 main/start 指向 `server/index.js`
- `scheduler.js` 接口 `module.exports` 完全兼容
- 版本号升级为 `v4.0 (Modular Edition)`

**验证项**：
- [x] 语法检查全通过（12个文件 `node -c` 通过）
- [x] 服务启动正常，端口 3000 监听
- [x] Gateway WebSocket 连接认证成功
- [x] 6 个 Agent 识别正常
- [x] Scheduler 启动正常（social loop / group review / weekly report）
- [x] API: /api/agents（6 agents）
- [x] API: /api/groups（1 group）
- [x] API: /api/models（13 models）
- [x] API: /api/settings
- [x] API: /api/community/posts（48 posts）
- [x] API: /api/settings/about
- [x] API: /api/settings/gateway/status（connected: true）
- [x] 静态文件服务（index.html 9237 bytes）
- [x] WebSocket 连接（joined, history 100条, agents 6个）

### P3.2 结构化富媒体消息详情

**改造日期**：2026-03-14

**改造目标**：消息协议从纯文字升级为块级结构，支持代码块、表格、操作按钮等富媒体内容

**改造内容**：

#### 1. 块级消息协议（Block Protocol）

消息新增可选 `blocks` 字段，支持以下块类型：

| 块类型 | 字段 | 说明 |
|--------|------|------|
| `text` | `content` | 文本/Markdown 内容 |
| `code` | `language`, `content` | 代码块（带语法高亮） |
| `table` | `headers`, `rows` | 结构化表格（数据数组，非 Markdown） |
| `image` | `url`, `caption`, `alt` | 图片块 |
| `actions` | `title`, `buttons[]` | 交互按钮组 |
| `heading` | `content`, `level` | 标题 |
| `quote` | `content` | 引用块 |
| `list` | `items[]`, `ordered` | 列表 |
| `divider` | — | 分隔线 |
| `card` | 同 rich-cards | 兼容现有卡片系统 |

**向下兼容**：无 `blocks` 的旧消息仍使用 `text` 字段 + Markdown 渲染

#### 2. 块渲染器（Block Renderer）

`public/js/rich-cards.js` 新增：
- `renderBlocks(blocks)` — 块数组分发渲染
- `_renderBlock(block)` — 按 type 路由到具体渲染器
- `_renderTableBlock` — 结构化表格渲染（数据驱动，非 Markdown 解析）
- `_renderCodeBlock` — 代码块渲染（集成 highlight.js）
- `_renderActionsBlock` — 交互按钮组渲染
- `_renderImageBlock` — 图片块渲染（带协议校验）
- `_renderListBlock` — 列表块渲染
- `_safeUrl()` — URL 安全校验（仅允许 http/https）

`chat.js` `renderMsg` 修改：当 `m.blocks` 存在时使用块渲染器，否则走原有 Markdown 路径

#### 3. LLM 响应智能结构化（Server-side Block Parser）

`server/services/llm.js` 新增 `parseResponseBlocks(text)`：
- **代码块检测**：识别 Markdown 代码栅栏 → `code` 块（带语言标识）
- **表格检测**：识别 Markdown 表格（header + separator + rows）→ `table` 块（结构化数据）
- **操作建议检测**：识别编号选项列表（如"你可以选择：1. xxx 2. yyy"）→ `actions` 块（可点击按钮）
- **保守策略**：纯文本不生成 blocks（返回空数组），避免误解析
- **ReDoS 防护**：表格分隔符正则使用确定性模式

LLM 响应在 `finalize()` 中自动解析，解析出的 blocks 附加到消息 entry 中

#### 4. 按钮交互发送

`handleCardAction(action, data)` 从空 stub 改为实际发送消息到当前 Agent：
- `send_text` → 直接发送预设文本
- `copy` → 复制到剪贴板
- `open_url` → 新窗口打开（仅 http/https）
- 其他 action → 将 data 作为用户消息发送给 Agent

#### 5. 安全审计（多轮）

| 修复项 | 严重度 | 文件 |
|--------|--------|------|
| URL 协议校验（防 `javascript:` XSS） | Critical | `rich-cards.js` |
| `_renderCodeBlock` lang 属性转义 | Critical | `rich-cards.js` |
| `escJs` 增加 U+2028/U+2029 转义 | High | `format.js` |
| 表格分隔符 ReDoS 防护 | Medium | `llm.js` |
| `chat-mention.js` JSON 注入修复 | Critical | `chat-mention.js` |
| `ws.send()` readyState 检查 | High | `chat.js` |
| 多处 emoji/name/id XSS 转义补全 | Medium | 8 个文件 |
| i18n 缺失 key 补全 | Low | `zh.js`, `en.js` |

#### 6. 附加功能改造

- **虾聊删除**：右键菜单 → 删除会话（清理本地消息/草稿/未读/置顶）
- **通讯录删除**：右键菜单 → 删除 Agent（二次确认 + 富文本弹窗 + 级联清理）
  - 后端 `deleteAgent` 支持 cascade 参数，清理群组/消息/画像/工作区
  - 后端 `GET /api/agents/:id/delete-impact` 预检影响范围
  - `appConfirmRich(html)` 富文本确认弹窗
- **工作流 emoji 选择器**：图标输入从文本框改为点击式 emoji 选择面板（40 个常用图标）

**验证项**：
- [x] 语法检查全通过（`rich-cards.js`, `chat.js`, `llm.js`, `format.js`, `contacts.js`, `agents.js`）
- [x] 块解析器单元测试通过（代码块、表格、操作建议、纯文本、空输入、ReDoS）
- [x] 服务启动正常，HTTP 200
- [x] 向下兼容：旧消息正常渲染

### P3.4 数据持久化升级详情

**改造日期**：2026-03-14

**改造目标**：将高频读写数据从 JSON 文件迁移到 SQLite，提升读写性能、数据一致性和搜索能力

**技术选型**：
- `node:sqlite`（Node.js 22+ 内置模块，零依赖）
- `DatabaseSync` 同步 API
- WAL 模式（Write-Ahead Logging，提升并发性能）
- FTS5 全文搜索虚拟表

**数据库设计（6 张表）**：

| 表名 | 主键 | 说明 |
|------|------|------|
| `messages` | `id TEXT` | 聊天消息（含 blocks/files/mentions JSON 列） |
| `messages_fts` | FTS5 虚拟表 | 消息全文搜索索引（自动触发器同步） |
| `posts` | `id TEXT` | 社区帖子 |
| `comments` | `id TEXT` | 帖子评论（外键关联 posts，级联删除） |
| `reactions` | `(postId, userId, type)` | 帖子互动（外键关联 posts，级联删除） |
| `metrics` | `agentId TEXT` | Agent 活跃度指标（UPSERT 模式） |

**索引设计**：
- `idx_msg_channel_ts`：频道+时间戳（分页查询）
- `idx_msg_ts`：全局时间排序
- `idx_msg_agent`：按 Agent 过滤
- `idx_posts_topic`、`idx_posts_author`、`idx_posts_time`：帖子多维查询
- `idx_comments_post`：评论关联查询

**改造范围**：

| 文件 | 类型 | 改动 |
|------|------|------|
| `server/services/database.js` | 新增 | initDB、建表、迁移逻辑、FTS5 触发器 |
| `server/config.js` | 修改 | 新增 `DB_FILE` 常量 |
| `server/index.js` | 修改 | Node 版本检查 + initDB 启动调用 |
| `server/services/storage.js` | 重写 | history/posts/metrics 全部改用 DB 读写 |
| `server/routes/messages.js` | 新增 | 消息分页 API + 消息搜索 API |
| `server/routes/community.js` | 重写 | 适配 DB 帖子/评论/反应操作 |
| `server/routes/agents.js` | 修改 | 级联删除改用 DB 方法 + 删除帖子 |
| `server/routes/settings.js` | 修改 | 统计查询改用 DB |
| `server/services/gateway.js` | 修改 | posts/comments/reactions 改用 store API |
| `server/services/llm.js` | 修改 | addMessage + getHistoryForContext |
| `server/services/workflow.js` | 修改 | addMessage |
| `server/router.js` | 修改 | 注册 messagesRoute |
| `public/js/chat.js` | 修改 | 上滑加载更多 + 搜索消息 UI |
| `public/index.html` | 修改 | 搜索面板 + 加载更多条 |
| `public/css/style.css` | 修改 | 搜索面板/高亮/加载条样式 |
| `public/js/lang/zh.js` | 修改 | 新增 3 + 1 个 i18n 键 |
| `public/js/lang/en.js` | 修改 | 新增 3 + 1 个 i18n 键 |
| `public/js/contacts.js` | 修改 | 删除弹窗展示消息数量 |

**新增后端 API**：

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/messages?channel=X&before=ts&limit=N` | GET | 消息分页（需鉴权） |
| `/api/messages/search?q=keyword&channel=X` | GET | FTS5 全文搜索（需鉴权） |

**JSON 迁移策略**：
- 首次启动自动检测 JSON 文件（`chat-history.json`、`community-posts.json`、`agent-metrics.json`）
- DB 为空时自动迁移，事务包裹确保原子性（失败时 ROLLBACK）
- 迁移成功后 JSON 文件重命名为 `.bak`
- 二次启动不重复迁移（`COUNT(*) > 0` 跳过）

**安全审计（三轮）**：

| 轮次 | 修复项 |
|------|--------|
| 第一轮 | 迁移事务 try/catch + ROLLBACK；FTS5 注入防护（短语包裹）；toggleReaction/addRating 事务包装；前端 scroll 节流；消息去重改用 Set；切换频道清除搜索 |
| 第二轮 | 端到端数据流验证；前端字段兼容确认；级联删除补充帖子清理；删除弹窗展示消息数量 |
| 第三轮 | messages API 添加权限校验（isOwnerReq）；limit 参数 NaN 兜底；getAllPosts 加 limit 200 |

**验证项**：
- [x] 语法检查全通过（17 个修改文件）
- [x] 服务启动正常，SQLite 初始化成功
- [x] JSON 迁移：331 消息 + 63 帖子 + 6 agent 指标
- [x] 消息分页 API：返回正确数据和 hasMore
- [x] 消息搜索 API：FTS5 查询正确返回
- [x] 社区帖子 API：63 篇帖子含 comments/reactions
- [x] 指标 API：6 个 agent 数据完整
- [x] 权限控制：未鉴权请求返回 403
- [x] 向下兼容：旧 JSON 数据完整迁移，旧接口格式不变
