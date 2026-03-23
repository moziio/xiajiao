<p align="center">
  <!-- 替换为实际 Logo -->
  <!-- <img src="docs/images/logo.png" alt="虾饺 IM" width="120" /> -->
  <h1 align="center">🦐 虾饺 IM</h1>
</p>

<p align="center">
  <strong>AI Agent 团队协作平台 — 一行 <code>npm start</code>，管理你的 AI 团队</strong>
</p>

<p align="center">
  轻量、自托管、开源——把 AI Agent 当同事管理：群聊、@提及、工具调用、持久记忆、协作流。<br/>
  不需要 Docker，不需要 PostgreSQL，不需要 Redis。<code>npm start</code> 即跑。
</p>

<p align="center">
  <a href="./README.md">English</a> · <strong>简体中文</strong>
</p>

<p align="center">
  <a href="#-快速开始">快速开始</a> ·
  <a href="#-为什么选虾饺">为什么选虾饺</a> ·
  <a href="#-功能全景">功能全景</a> ·
  <a href="CHANGELOG.md">更新日志</a> ·
  <a href="CONTRIBUTING.md">贡献指南</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen?style=flat-square" alt="Node.js" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/npm%E4%BE%9D%E8%B5%96-6-orange?style=flat-square" alt="Dependencies" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome" />
  <img src="https://img.shields.io/badge/SQLite-%E5%86%85%E7%BD%AE-blueviolet?style=flat-square" alt="SQLite" />
</p>

<p align="center">
  <img src="docs/images/hero-light-top.png" alt="虾饺 IM — AI Agent 团队群聊协作" width="800" />
</p>

<p align="center">
  <em>@小说家 写一首诗 → 实时回复 → @翻译官 翻译成英文 — 全在一个聊天窗口完成。</em>
</p>

<details>
<summary><strong>🎬 35 秒演示</strong></summary>
<br/>
<p align="center">
  <img src="docs/images/demo.gif" alt="虾饺 IM — 协作流演示" width="800" />
</p>
<p align="center">
  <em>一句话触发整条协作链 — 创作、编辑、翻译，全自动接力。</em>
</p>
</details>

<details>
<summary><strong>📸 更多截图</strong></summary>

<br/>

<table>
<tr>
<td width="50%" align="center">
  <strong>Agent 写诗并分析构思</strong><br/><br/>
  <img src="docs/images/hero-light-middle.png" alt="Agent 协作 — 诗歌分析与交接" width="400" />
</td>
<td width="50%" align="center">
  <strong>翻译官接力英译</strong><br/><br/>
  <img src="docs/images/hero-light-translation.png" alt="Agent 将诗歌翻译为英文" width="400" />
</td>
</tr>
<tr>
<td width="50%" align="center">
  <strong>Tool Calling 实时调用</strong><br/><br/>
  <img src="docs/images/tool-calling.png" alt="Tool Calling — 记忆搜索与写入" width="400" />
</td>
<td width="50%" align="center">
  <strong>协作流可视化面板</strong><br/><br/>
  <img src="docs/images/collab-flow.png" alt="可视化协作流水线" width="400" />
</td>
</tr>
<tr>
<td width="50%" align="center">
  <strong>通讯录管理 Agent</strong><br/><br/>
  <img src="docs/images/contacts-light.png" alt="Agent 通讯录" width="400" />
</td>
<td width="50%" align="center">
  <strong>简洁登录页</strong><br/><br/>
  <img src="docs/images/login-light.png" alt="登录页面" width="400" />
</td>
</tr>
</table>

</details>

> **虾饺 (Xiajiao)** — 取名自广式点心：小巧精致，内料丰富。  
> 最少的依赖，最全的能力。

---

## ⚡ 快速开始

### 方式一：npm（推荐）

**环境要求：** Node.js >= 22.0.0

```bash
git clone https://github.com/moziio/xiajiao.git
cd xiajiao && npm install
npm start
```

### 方式二：Docker

```bash
git clone https://github.com/moziio/xiajiao.git
cd xiajiao
docker build -t xiajiao .
docker run -d -p 18800:18800 \
  -v xiajiao-data:/app/data \
  -v xiajiao-uploads:/app/public/uploads \
  --name xiajiao xiajiao
```

---

浏览器打开 `http://localhost:18800` → 默认密码 `admin` 登录 → **设置 → 模型管理** 添加 API Key → 开始聊天！

> [!TIP]
> 登录密码和所有 API Key 都可以在 Web 界面直接修改，无需手动编辑任何配置文件。

---

## 🤔 为什么选虾饺？

大多数 AI 平台还没开始用，就要先装 Docker + PostgreSQL + Redis + 向量数据库。  
**虾饺走了一条完全不同的路**——唯一一个以 IM 方式让 Agent 真正*以团队形式协作*的平台：

### 谁适合用？

- **独立开发者** — 想要一支 AI 团队，但不想折腾 DevOps
- **AI 爱好者** — 想探索多 Agent 协作模式
- **小团队** — 需要一个零供应商锁定的自托管 AI 工作空间
- **研究者** — 原型验证 Agent 间通信和记忆系统

|  | 虾饺 | Dify | Coze | FastGPT |
|--|------|------|------|---------|
| **启动方式** | **`npm start`** | `docker compose up` | 注册 SaaS 账号 | `docker compose up` |
| **外部依赖** | **无** | PostgreSQL + Redis + Weaviate | — | MongoDB + MySQL |
| **npm 依赖数** | **6** | 100+ | — | 80+ |
| **多 Agent 群聊** | **✅** | ❌ | ❌ | ❌ |
| **Agent 间协作** | **✅ 协作链 + 可视化** | 工作流 | Bot 编排 | ❌ |
| **Agent 持久记忆** | **✅ 三分类记忆** | ❌ | 变量 | ❌ |
| **Tool Calling** | **✅ 7 个内置工具** | ✅ | ✅ 100+ 插件 | ✅ |
| **RAG 知识库** | **✅ BM25 + 向量混合** | ✅ | ✅ | ✅ |

> **核心差异**：Dify / Coze 是 *AI 应用开发平台*；虾饺是 **AI Agent 团队协作平台**——把 Agent 当同事，不当工具。

---

## ✨ 功能全景

| | 功能 | 亮点 |
|--|------|------|
| 🤖 | [多 Agent 群聊](#-多-agent-群聊) | @mention 路由，Agent 间对话 |
| 🔧 | [Tool Calling](#-tool-calling工具调用) | 7 个内置工具，可扩展 |
| 🧠 | [持久记忆](#-agent-持久记忆) | 三分类记忆，自动注入 Prompt |
| 📚 | [RAG 知识库](#-生产级-rag-知识库) | BM25 + 向量混合，LLM 重排序 |
| 🔗 | [协作流](#-协作流) | 协作链、可视化面板、工作流 |
| 🔌 | [多模型](#-多模型支持) | OpenAI / Claude / 通义 / Ollama / ... |

### 🤖 多 Agent 群聊

像微信群一样管理 AI Agent。创建群组、拉入多个 Agent、@mention 精确路由。Agent 之间可以互相对话、接力协作——就像真正的团队。

<p align="center">
  <img src="docs/images/hero-light-bottom.png" alt="多 Agent 协作 — 中英翻译对照" width="700" />
</p>

### 🔧 Tool Calling（工具调用）

Agent 不只聊天，还能**动手做事**。7 个内置工具 + 可扩展架构：

| 工具 | 能力 |
|------|------|
| `web_search` | 网络搜索（6 种引擎：auto / DuckDuckGo / Brave / Kimi / Perplexity / Grok） |
| `rag_query` | 知识库语义检索 |
| `memory_write` | 写入持久记忆 |
| `memory_search` | 搜索历史记忆 |
| `call_agent` | 调用其他 Agent（3 层嵌套保护） |
| `manage_channel` | 创建、启停外部平台连接器（飞书 / 钉钉 / 企微 / Telegram） |
| `manage_schedule` | 创建和管理 Cron 定时任务 |

<p align="center">
  <img src="docs/images/tool-calling.png" alt="Tool Calling — memory_search 和 memory_write 实时调用" width="700" />
</p>

<p align="center">
  <em>Agent 实时调用 memory_search 回忆上下文，memory_write 持久化洞察 — 全过程可见。</em>
</p>

### 🧠 Agent 持久记忆

三分类记忆系统，Agent 越用越懂你：

- **语义记忆** — 事实和知识（"用户偏好 Python"）
- **情景记忆** — 对话事件（"上次讨论了部署方案"）
- **程序性记忆** — 行为习惯（"回复要简洁"）

Embedding 去重 + 混合搜索 + 自动注入 Prompt。

### 📚 生产级 RAG 知识库

上传文档即刻可用——Agent 自动索引、自动检索：

- BM25 + 向量混合检索
- RRF（互惠排名融合）
- LLM 重排序
- 分层分块（200 字小块 + 800 字大块）

### 🔗 协作流

- **协作链** — 群组内 Agent 自动接力，上一个输出成为下一个输入
- **协作流可视化** — 实时状态面板 + 历史回放 + 人工干预（确认 / 终止 / 编辑）
- **工作流编排** — 多步骤、条件分支、错误处理（重试 / 跳过 / 回退）、人工审批

<p align="center">
  <img src="docs/images/collab-flow.png" alt="协作流可视化 — Agent 接力流水线" width="700" />
</p>

<p align="center">
  <em>可视化协作面板：小说家 → 编辑 → 翻译官 → 代码助手，实时进度 + 人工干预控制。</em>
</p>

### 🔌 多模型支持

支持所有 OpenAI 兼容 API 的模型厂商，一个接口全覆盖：

OpenAI (GPT-4o) · Anthropic (Claude) · 通义千问 · GLM · Kimi · MiniMax · DeepSeek · Ollama

### 📋 更多能力

| 能力 | 说明 |
|------|------|
| Markdown 渲染 | 代码高亮 + Mermaid 图表 + LaTeX |
| 全文搜索 | SQLite FTS5 消息检索 |
| 定时任务 | Cron 驱动，Agent 定期汇报 |
| AI 文生图 | DashScope 集成，对话中自动识别画图意图 |
| PWA 离线 | Service Worker + 离线页面 |
| 中英双语 | i18n 内置 |
| RBAC 权限 | owner > admin > member > guest 四级 |
| 安全防护 | CSRF + 速率限制 + 错误脱敏 + Token 撤销 |
| MCP 协议 | Model Context Protocol 支持 |
| 渠道接入 | 飞书 WebSocket 连接器 + Webhook |

---

## 🏗️ 技术栈

| 层 | 技术 | 为什么 |
|----|------|--------|
| 运行时 | Node.js 22+ | 原生 `node:sqlite`，零 native addon |
| HTTP | `node:http` | 零框架开销 |
| WebSocket | `ws` | 实时双向通信 |
| 数据库 | SQLite (WAL + FTS5) | 一个 `.db` 文件搞定一切 |
| 前端 | Vanilla JS + CSS | 无构建步骤，改完刷新即生效 |
| 依赖 | **6 个** | ws · formidable · node-cron · pdf-parse · @larksuiteoapi/node-sdk · @modelcontextprotocol/sdk |
| 测试 | 53 个单元测试 | `node:test` + `node:assert`，零测试框架 |

> **为什么这么少？** 我们把每个依赖都视为负债而非资产。能用标准库的绝不引入第三方包。

---

## ⚙️ 配置

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `IM_PORT` | 服务端口 | `18800` |
| `OWNER_KEY` | 管理员密码 | `admin` |
| `LLM_MODE` | LLM 模式 (`direct` / `gateway`) | `direct` |

### 模型配置

```bash
cp models.example.json models.json
```

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

支持的 API 类型：`openai-completions`（通义 / Kimi / GLM / DeepSeek / Ollama 等）· `anthropic-messages` · `dashscope-image`

> [!TIP]
> 也可以直接在 Web 界面 **设置 → 模型管理** 中添加和管理模型，无需手动编辑文件。

---

## 📁 项目结构

```
xiajiao/
├── server/                   # 后端
│   ├── index.js              # HTTP + WebSocket 入口
│   ├── middleware/            # 认证、日志、限流
│   ├── routes/               # API 路由
│   ├── services/             # 核心服务
│   │   ├── llm.js            # LLM + Tool Calling 循环
│   │   ├── rag.js            # RAG 检索引擎
│   │   ├── memory.js         # Agent 记忆
│   │   ├── workflow.js       # 工作流引擎
│   │   ├── collab-flow.js    # 协作流状态机
│   │   ├── tool-registry.js  # 工具注册中心
│   │   └── database.js       # SQLite + 迁移
│   ├── migrations/           # 数据库迁移
│   └── tests/                # 单元测试
├── public/                   # 前端（Vanilla JS，无构建步骤）
│   ├── js/                   # 功能模块
│   └── css/
├── data/_soul-templates/     # 默认 Agent SOUL.md 模板
├── models.example.json       # 模型配置示例
├── im-settings.example.json  # 系统设置示例
└── agents.example.json       # Agent 配置示例（5 个内置 Agent）
```

---

## 🗺️ Roadmap

> 🚀 虾饺正在快速迭代中，以下是已交付和规划中的能力：

| 阶段 | 状态 | 内容 |
|------|------|------|
| P1 核心 IM | ✅ 已交付 | 对话、群聊、@mention、Markdown |
| P2 Agent 协作 | ✅ 已交付 | 工作流、定时例会、社区事件流 |
| P3 高级能力 | ✅ 已交付 | Tool Calling、RAG、Agent 记忆、文生图 |
| P4 可靠性 | ✅ 已交付 | 安全加固、限流、RBAC、PWA、结构化日志 |
| P5 渠道系统 | 🚧 开发中 | 企微、飞书、钉钉、Telegram 接入 |
| P6 企业级 | 📋 已规划 | 多进程、外置状态、Electron 桌面端 |
| P7 插件生态 | 💭 探索中 | 插件市场、社区工具共享、一键安装 |
| P8 Agent Store | 💭 探索中 | 预设角色模板、一键克隆与定制 |
| P9 多模态 | 💭 探索中 | 语音输入、图片理解、视频分析 |
| P10 Agent 间协商 | 💭 探索中 | Agent 之间结构化多轮对话，有限轮次讨论与决策 |

> **这只是开始。** 有想法？欢迎 [提 Issue](https://github.com/moziio/xiajiao/issues) 或 [参与讨论](https://github.com/moziio/xiajiao/discussions)！

---

## 🤝 贡献

欢迎各种形式的贡献——Bug 反馈、功能建议、代码提交、文档改进、国际化翻译。

详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

---

## ⭐ 支持项目

> [!IMPORTANT]
> 给项目一个 **Star**，你将会收到每次新版本的通知，同时也能帮助更多人发现这个项目！

<!-- [![Star History Chart](https://api.star-history.com/svg?repos=moziio/xiajiao&type=Date)](https://star-history.com/#moziio/xiajiao&Date) -->

---

## 🔒 安全

为保护用户安全，请**不要**在 GitHub Issues 中公开发布安全问题。请直接通过邮件联系维护者，我们会尽快响应。

---

## 📄 许可证

[MIT](LICENSE)

---

<p align="center">
  <strong>虾饺 (Xiajiao)</strong> — 你的 AI Agent 团队管理工具 🦐<br/>
  <sub>小巧精致，内料丰富</sub>
</p>
