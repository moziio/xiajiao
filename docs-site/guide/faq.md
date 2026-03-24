---
title: 常见问题 — 虾饺 IM
description: 虾饺 IM 常见问题与解答，包括安装、配置、使用、安全性等方面。
---

# 常见问题（FAQ）

## 基础问题

### 虾饺 IM 是免费的吗？

完全免费，MIT 开源协议。你可以自由使用、修改、商用。

### 虾饺和 ChatGPT / Claude 有什么区别？

ChatGPT / Claude 是 **单 Agent 对话工具**——一个 AI 和你聊天。

虾饺是 **多 Agent 协作平台**——你管理一支 AI 团队，Agent 之间可以互相协作。

| 维度 | ChatGPT / Claude | 虾饺 |
|------|------------------|------|
| Agent 数量 | 1 个 | 不限 |
| Agent 协作 | ❌ | ✅ @mention 路由 + 协作链 |
| 持久记忆 | 有限 | 三分类持久记忆 |
| 数据私有 | 云端存储 | 完全本地 |
| 模型选择 | 固定 | 任意模型 |
| 费用 | $20/月+ | 自带 API Key，按使用量付费 |

### 虾饺和 Dify / Coze / FastGPT 有什么区别？

**定位不同**：

- **Dify / FastGPT**：AI 应用开发平台——帮你构建面向终端用户的 AI 应用
- **Coze**：Bot 构建平台——帮你构建和发布 Bot
- **虾饺**：AI Agent 团队协作平台——Agent 是你的同事，不是你的产品

**架构不同**：

| 维度 | 虾饺 | Dify | FastGPT |
|------|------|------|---------|
| 外部依赖 | **0 个**（SQLite 内置） | PostgreSQL + Redis + Sandbox | MongoDB + PostgreSQL + OneAPI |
| 安装时间 | 10 秒 | 5-10 分钟 | 5-10 分钟 |
| 镜像大小 | ~150MB | ~2GB+ | ~1GB+ |
| npm 依赖 | 6 个 | N/A（Python） | N/A |
| 部署命令 | `npm start` | `docker compose up` | `docker compose up` |

### 虾饺需要 GPU 吗？

不需要。虾饺本身不运行 AI 模型，它通过 API 调用外部 LLM。

如果你想用 **Ollama** 在本地跑模型，那 Ollama 需要 GPU（或足够大的 RAM）。但这和虾饺无关。

### 支持哪些模型？

所有 OpenAI 兼容 API 的模型都支持，包括但不限于：

- OpenAI（GPT-4o / GPT-4 Turbo / GPT-3.5）
- Anthropic（Claude Opus / Sonnet / Haiku）
- 通义千问（Qwen Max / Plus / Turbo）
- DeepSeek（DeepSeek Chat / Coder）
- Kimi（Moonshot）
- GLM（智谱 ChatGLM）
- Ollama（Llama 3 / Qwen / Mistral / 任意开源模型）
- OpenRouter（聚合 100+ 模型）

详见 [模型配置](/guide/model-config)。

## 安装问题

### Node.js 版本要求为什么这么高（22+）？

虾饺使用了 Node.js 22 引入的 `node:sqlite` 内置模块。这让虾饺不需要安装任何外部数据库——SQLite 直接内置在 Node.js 运行时中。

这是虾饺"零外部依赖"设计的关键。

### `npm install` 很慢怎么办？

虾饺只有 6 个依赖，正常 5-10 秒完成。如果很慢，可能是网络问题：

```bash
# 使用淘宝镜像
npm config set registry https://registry.npmmirror.com
npm install
```

### 不会用 Git 怎么下载？

直接从 GitHub 下载 ZIP：

1. 打开 https://github.com/moziio/xiajiao
2. 点击绿色 "Code" 按钮
3. 选择 "Download ZIP"
4. 解压后在目录中运行 `npm install && npm start`

### Windows 上安装失败

最常见的原因是 `better-sqlite3` 原生模块编译问题。大多数情况下会自动下载预编译版本，无需手动编译。

如果确实编译失败：

```powershell
npm install --global windows-build-tools
npm install
```

## 使用问题

### Agent 不回复怎么办？

排查步骤：

1. **检查 LLM 配置**：设置 → 模型管理，确认 API Key 和 Base URL 正确
2. **检查 Agent 模型**：确认 Agent 关联了一个可用的模型
3. **检查浏览器控制台**：F12 → Console，看有没有错误信息
4. **检查服务端日志**：终端中查看是否有 API 调用错误

### 怎么创建自定义 Agent？

1. 进入通讯录
2. 点击"新建 Agent"
3. 填写名称、Emoji
4. 选择模型
5. 配置工具权限
6. 编写 SOUL.md 人格设定

### Agent 的 SOUL.md 怎么写？

SOUL.md 就是一份 Markdown 格式的"岗位说明书"。包含：

```markdown
# 角色名

一句话概述角色定位。

## 核心能力
- 能力 1
- 能力 2

## 工作原则
- 规则 1
- 规则 2

## 输出格式
- 格式要求
```

越清晰、越具体，Agent 表现越好。避免模糊的指令。

### 怎么让 Agent 记住我的偏好？

两种方式：

1. **自动记忆**：给 Agent 开启 `autoInjectMemory`，并允许使用 `memory_write` / `memory_search` 工具。Agent 会自动记住重要信息。

2. **手动告诉**：直接说"我偏好 Python，回复要简洁"，Agent 会主动调用 `memory_write` 保存。

详见 [Agent 持久记忆](/features/agent-memory)。

### 怎么上传文档到知识库？

目前通过 Web 界面上传文档到 Agent 工作区。支持 PDF、TXT、Markdown。

上传后系统自动完成：解析 → 分块 → embedding → 索引。Agent 使用 `rag_query` 工具自动检索。

### 怎么让多个 Agent 自动协作？

**方式 1：协作链**

创建群组时配置协作链，如 `小说家 → 编辑 → 翻译官`。发一条消息，三个 Agent 自动接力。

**方式 2：@mention**

在群组中 `@小说家 写首诗`，然后 `@翻译官 翻译上面的诗`。

**方式 3：call_agent**

Agent 自己调用其他 Agent 完成子任务（需要开启 `call_agent` 工具权限）。

详见 [协作流](/features/collaboration-flow)。

### 消息历史会保存吗？

是的，所有消息永久保存在 SQLite 数据库中（`data/im.db`）。支持全文搜索（FTS5）。

## 安全与隐私

### 数据存储在哪里？

**完全本地**。所有数据存储在你的机器上：

- 消息数据 → `data/im.db`
- Agent 记忆 → `data/workspace-xxx/memory.db`
- 上传文件 → `public/uploads/`

不经过任何第三方服务器。

### API Key 安全吗？

API Key 存储在本地 SQLite 数据库中。虾饺不会将你的 Key 发送到除了对应 LLM Provider 以外的任何地方。

### 多人使用安全吗？

虾饺目前的认证是简单的密码保护（`OWNER_KEY`）。适合个人或信任的小团队使用。

如果需要面向公网，建议：

1. 设置强密码
2. 使用 Nginx + HTTPS
3. 限制访问 IP

### 开源后我的数据会暴露吗？

不会。`data/` 目录和 `.env` 文件都在 `.gitignore` 中，不会被提交到 Git。

## 技术问题

### 为什么选择 SQLite 而不是 PostgreSQL？

1. **零部署**：不需要安装数据库服务
2. **足够用**：SQLite 支持百万级数据，单用户/小团队完全够用
3. **WAL 模式**：支持并发读取
4. **FTS5**：内置全文搜索
5. **简单备份**：复制一个文件就行

### 为什么前端用 Vanilla JS 而不是 React / Vue？

1. **零构建**：修改 JS 文件，刷新浏览器即生效
2. **零依赖**：不需要 Webpack / Vite / 任何构建工具
3. **够用**：IM 界面不需要复杂的组件化
4. **轻量**：整个前端资源 < 1MB

### 为什么不用 Express / Koa / Fastify？

`node:http` 模块完全够用。虾饺的 HTTP 路由很简单，不需要中间件生态。

少一个框架 = 少一个依赖 = 少一个安全风险 = 少一个版本要追踪。

### 支持 MCP（Model Context Protocol）吗？

Tool Calling 协议兼容 MCP 标准。已有的 7 个内置工具通过标准化的 JSON Schema 定义，可以方便地扩展。

### 能二次开发吗？

当然。MIT 协议，代码结构清晰：

```
server/
├── index.js           # 入口
├── api/               # REST API
├── services/          # 业务逻辑
│   ├── llm.js         # LLM 调用
│   ├── memory.js      # 记忆系统
│   ├── rag.js         # RAG 检索
│   └── tools.js       # 工具调用
├── storage.js         # 数据层
└── ws.js              # WebSocket
```

PR 和 Issue 都欢迎。详见 [贡献指南](https://github.com/moziio/xiajiao/blob/master/CONTRIBUTING.md)。

## 运维与进阶

### 怎么给不同 Agent 配不同的模型？

每个 Agent 可以独立指定模型。在 Agent 配置中设置对应的模型名称即可：

- 代码助手 → `claude-sonnet`（代码能力强）
- 翻译官 → `gpt-4o`（多语言最强）
- 日常助理 → `qwen-turbo`（便宜够用）

详见 [模型配置大全](/guide/model-config)。

### 怎么备份和迁移数据？

```bash
# 完整备份（消息+记忆+知识库+上传文件）
tar czf xiajiao-backup.tar.gz data/ public/uploads/

# 迁移到新机器
scp xiajiao-backup.tar.gz new-server:/opt/
ssh new-server "cd /opt && tar xzf xiajiao-backup.tar.gz"
```

### SQLite 能支持多少用户并发？

虾饺开启了 SQLite WAL 模式，支持并发读写。对于 1-50 人的团队完全够用。

如果你是百人规模的团队，建议：
- 部署在 SSD 硬盘上
- 定期 `VACUUM` 优化数据库
- 考虑前置 Nginx 缓存静态资源

### 怎么升级虾饺？

```bash
cd xiajiao
git pull                # 拉取最新代码
npm install             # 更新依赖（如果有变化）
pm2 restart xiajiao     # 重启服务
```

`data/` 目录不受影响，升级不会丢数据。

### 忘记密码怎么办？

停止服务，用新密码重启：

```bash
OWNER_KEY="new-password" npm start
```

密码存在环境变量中，不在数据库里。

### 怎么查看 Agent 的记忆内容？

```bash
sqlite3 data/workspace-{agentId}/memory.db \
  "SELECT type, content, created_at FROM memories ORDER BY created_at DESC LIMIT 20;"
```

### 能把虾饺部署在内网完全离线使用吗？

可以。虾饺 + Ollama 本地模型 = 零外部网络连接。

1. 在有网的机器上 `npm install`（下载 6 个依赖）
2. 打包整个目录传到内网机器
3. 内网机器安装 Ollama + 下载模型
4. 启动虾饺，配置 Ollama 地址

详见 [安全与隐私](/guide/security)。

## 进阶开发

### 怎么给虾饺添加一个新的 API 端点？

在 `server/api/` 目录下修改对应模块，添加路由处理：

```javascript
// 在 server/api/routes.js 中
if (path === '/api/my-endpoint' && method === 'GET') {
  return { status: 200, data: { hello: 'world' } };
}
```

重启服务后即生效，不需要编译或构建。

### 怎么添加一个新的内置工具？

在 `server/services/tools.js` 中注册：

```javascript
registerTool({
  name: 'my_tool',
  description: '我的自定义工具',
  parameters: {
    type: 'object',
    properties: {
      input: { type: 'string', description: '输入内容' }
    }
  },
  handler: async ({ input }) => {
    return { result: `处理了: ${input}` };
  }
});
```

详见 [开发者指南](/guide/dev-guide)。

### 虾饺的数据库 Schema 是什么？

详见 [API 与协议参考](/guide/api-reference#数据库表结构)——包含所有表结构、字段说明。

### 怎么用虾饺的 API 做集成？

虾饺的 HTTP API 可以用于构建自动化流程：

```bash
# 1. 登录
curl -c cookies.txt -X POST http://localhost:18800/api/login \
  -H "Content-Type: application/json" -d '{"password":"admin"}'

# 2. 发送消息给 Agent
curl -b cookies.txt -X POST http://localhost:18800/api/messages \
  -H "Content-Type: application/json" \
  -d '{"channelId":"ch_xxx","content":"@代码助手 生成日报","type":"text"}'
```

配合 Cron 可以实现定时自动化。

### 怎么用定时任务做自动化？

虾饺支持通过 `manage_schedule` 工具设置 Cron 定时任务：

```
你：@虾饺管家 每天早上 9 点让新闻助手搜索 AI 新闻并发摘要
管家：好的，已设置定时任务 (0 9 * * *)
```

也可以在 Agent 的 SOUL.md 里预设定时行为。

## 下一步

- [快速开始](/guide/quick-start) — 3 步跑起来
- [模型配置](/guide/model-config) — 详细的模型配置教程
- [多 Agent 群聊](/features/multi-agent-chat) — 核心功能介绍
- [故障排查](/guide/troubleshooting) — 遇到问题看这里
- [安全与隐私](/guide/security) — 数据安全详解
- [平台对比](/guide/comparison) — 和 Dify/Coze/FastGPT 的区别
- [API 参考](/guide/api-reference) — 接口和协议详情
- [术语表](/guide/glossary) — 不懂的术语看这里
