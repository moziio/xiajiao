# 虾饺 (Xiajiao)

**AI Agent 团队协作平台 — 4 个依赖 · 零外部服务 · `npm start` 即跑**

> Manage your AI agents like managing a team — group chat, @mention, tool calling, memory, and collaboration flows.

> **Xiajiao (虾饺)** — named after the Cantonese shrimp dumpling: small, delicate, but packed with flavor. Minimal dependencies, maximum capability.

<!-- 截图占位：替换为实际截图后取消注释 -->
<!-- ![虾饺](docs/images/hero.png) -->

---

## 为什么选虾饺？

|  | 虾饺 | Dify | Coze | FastGPT |
|--|------|------|------|---------|
| npm 依赖 | **4 个** | 100+ | SaaS | 80+ |
| 外部服务 | **无** | PostgreSQL + Redis + 向量库 | — | MongoDB + MySQL |
| 启动方式 | **`npm start`** | `docker compose up` | 注册账号 | `docker compose up` |
| 多 Agent 群聊 | **✅** | ❌ | ❌ | ❌ |
| Agent 间协作 | **✅ 协作链 + 可视化** | 工作流 | Bot 编排 | ❌ |
| Tool Calling | **✅ 5 个内置工具** | ✅ | ✅ 100+ 插件 | ✅ |
| Agent 记忆 | **✅ 三分类持久记忆** | ❌ | 变量 | ❌ |
| RAG 知识库 | **✅ BM25 + 向量混合** | ✅ | ✅ | ✅ |

**核心差异**：Dify / Coze 是 AI 应用开发平台；虾饺是 **AI Agent 团队协作平台**——把 Agent 当同事，不当工具。

---

## 功能全景

### IM 核心
- 多 Agent 私聊 / 群聊，@mention 精确路由
- Markdown 渲染 + 代码高亮 + Mermaid 图表
- 富媒体消息（文本、代码块、表格、图片、操作按钮）
- 消息搜索（FTS5 全文检索）、编辑、删除、回复
- 频道草稿、置顶、未读计数

### Agent 能力
- **Tool Calling** — 5 个内置工具，实时调用时间线 UI
  - `web_search`：6 种搜索引擎（auto / DuckDuckGo / Brave / Kimi / Perplexity / Grok）
  - `rag_query`：知识库语义检索
  - `memory_write` / `memory_search`：持久记忆读写
  - `call_agent`：跨 Agent 调用（3 层嵌套保护）
- **Agent 记忆** — 三分类（语义 / 情景 / 程序性），embedding 去重，混合搜索，自动注入 Prompt
- **RAG 知识库** — BM25 + 向量混合检索，RRF 融合，LLM 重排序，分层分块（200 字小块 + 800 字大块）
- **AI 文生图** — DashScope 集成，对话中自动识别画图意图

### 协作
- **协作链** — 群组内 Agent 自动接力，上一个输出成为下一个输入
- **协作流可视化** — 实时状态面板 + 历史回放 + 人工干预（确认 / 终止 / 编辑）
- **工作流编排** — 多步骤、条件分支、错误处理（重试 / 跳过 / 回退）、人工审批
- **定时例会** — Cron 表达式驱动，Agent 定期汇报

### 多模型支持
兼容 OpenAI 兼容 API 的所有厂商：
- OpenAI (GPT-4o) / Anthropic (Claude) / 通义千问 / GLM / Kimi / MiniMax / DeepSeek 等
- DashScope 图像生成

### 基础设施
- **SQLite 持久化** — `node:sqlite`（WAL + FTS5），一个 db 文件搞定一切
- **RBAC 权限** — owner > admin > member > guest 四级
- **安全** — CSRF 防护、速率限制、错误脱敏、Token 主动撤销
- **PWA** — Service Worker + 离线页
- **中英双语** — i18n 内置

---

## 快速开始

### 环境要求

- **Node.js >= 22.0.0**（使用原生 `node:sqlite` 模块）

### 快速启动

```bash
git clone https://github.com/FengWanMin/xiajiao.git
cd xiajiao && npm install
npm start
```

浏览器打开 `http://localhost:18800` → 默认密码 `xiajiao-admin` 登录 → **设置 → 模型管理** 添加 API Key → 开始使用。

> 登录密码和 API Key 均可在设置页面中修改，无需手动编辑配置文件。

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `IM_PORT` | 服务端口 | `18800` |
| `OWNER_KEY` | 管理员密码 | `xiajiao-admin` |
| `LLM_MODE` | LLM 模式 (`direct` / `gateway`) | `direct` |
| `GATEWAY_WS` | Gateway WebSocket 地址（仅 gateway 模式） | `ws://127.0.0.1:18789` |
| `GATEWAY_HTTP` | Gateway HTTP 地址（仅 gateway 模式） | `http://127.0.0.1:18789` |
| `GATEWAY_TOKEN` | Gateway 认证令牌（仅 gateway 模式） | — |

---

## 项目结构

```
xiajiao/
├── server/                   # 后端
│   ├── index.js              # HTTP + WebSocket 入口
│   ├── middleware/            # 认证、日志、限流
│   ├── routes/               # API 路由（10 个模块）
│   ├── services/             # 核心服务
│   │   ├── llm.js            # LLM 调用 + Tool Calling 循环
│   │   ├── rag.js            # RAG 检索引擎
│   │   ├── memory.js         # Agent 记忆
│   │   ├── workflow.js       # 工作流引擎
│   │   ├── collab-flow.js    # 协作流状态机
│   │   ├── tool-registry.js  # 工具注册中心
│   │   └── database.js       # SQLite + 迁移
│   ├── migrations/           # 8 个数据库迁移
│   └── tests/                # 单元测试（53 用例）
├── public/                   # 前端（Vanilla JS，无构建步骤）
│   ├── js/                   # 20+ 模块（四层架构）
│   └── css/
├── models.example.json       # 模型配置示例
├── im-settings.example.json  # 系统设置示例
└── agents.example.json       # Agent 配置示例
```

---

## 配置

### models.json — 模型配置

```json
{
  "providers": {
    "bailian": {
      "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
      "apiKey": "sk-your-api-key",
      "api": "openai-completions"
    }
  },
  "models": [
    {
      "id": "bailian/qwen-plus",
      "name": "qwen-plus",
      "provider": "bailian",
      "reasoning": false,
      "input": ["text"],
      "contextWindow": 131072,
      "maxTokens": 8192
    }
  ]
}
```

支持的 API 类型：
- `openai-completions` — OpenAI 兼容接口（通义、Kimi、GLM、DeepSeek 等均可）
- `anthropic-messages` — Anthropic Messages API
- `dashscope-image` — DashScope 图像生成

---

## 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 运行时 | Node.js 22+ | 原生 `node:sqlite` |
| HTTP | `node:http` | 零框架 |
| WebSocket | `ws` | 实时通信 |
| 数据库 | SQLite | WAL 模式 + FTS5 全文搜索 |
| 前端 | Vanilla JS + CSS | 无构建步骤，修改即生效 |
| Markdown | marked.js + highlight.js + mermaid.js | 富文本渲染 |
| 依赖总计 | **4 个** | ws, formidable, node-cron, pdf-parse |

---

## Roadmap

- [x] **P1** — 核心 IM（对话、群聊、@mention、Markdown）
- [x] **P2** — Agent 协作（工作流、定时例会、社区事件流）
- [x] **P3** — 高级能力（Tool Calling、RAG、Agent 记忆、文生图、SQLite）
- [x] **P4** — 可靠性（安全加固、限流、RBAC、PWA、结构化日志、数据库迁移）
- [ ] **P5** — 渠道系统（企微、飞书、钉钉、Telegram 接入）
- [ ] **P6** — 企业级（多进程、外置状态、Electron 桌面端）

---

## 贡献

欢迎 Issue 和 PR！详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

[MIT](LICENSE)

---

> **虾饺 (Xiajiao)** — 你的 AI Agent 团队管理工具 🦐
