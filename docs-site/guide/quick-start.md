---
title: 快速开始 — 虾饺 IM
description: 3 步跑起来：git clone → npm install → npm start，30 秒启动你的 AI Agent 团队。
---

# 快速开始

只需 3 步，30 秒启动你的 AI Agent 团队。

## 环境要求

- **Node.js >= 22.0.0**（[下载地址](https://nodejs.org/)）

::: tip 为什么需要 Node.js 22？
虾饺使用 Node.js 22 内置的 `node:sqlite` 模块，无需安装任何数据库。这是虾饺零外部依赖的关键。
:::

## 第 1 步：克隆仓库

```bash
git clone https://github.com/moziio/xiajiao.git
cd xiajiao
```

## 第 2 步：安装依赖

```bash
npm install
```

只有 6 个依赖，5-10 秒搞定。

<details>
<summary>好奇这 6 个依赖是什么？</summary>

| 包 | 作用 | 为什么不能去掉 |
|---|------|--------------|
| `ws` | WebSocket 服务 | Node.js 内置 HTTP 不含 WebSocket |
| `better-sqlite3` | SQLite FFI 驱动 | `node:sqlite` 是异步的，需要同步 API 做 embedding |
| `marked` | Markdown→HTML | SOUL.md 渲染 |
| `pdf-parse` | PDF 文本提取 | RAG 知识库需要解析 PDF |
| `highlight.js` | 代码高亮 | 消息中的代码块着色 |
| `sharp` | 图片处理 | 上传图片缩略图 |

</details>

## 第 3 步：启动

```bash
npm start
```

看到以下输出说明启动成功：

```
Server running on http://localhost:18800
```

## 第 4 步：配置 LLM

1. 浏览器打开 `http://localhost:18800`
2. 输入默认密码 `admin` 登录
3. 进入 **设置 → 模型管理**
4. 添加你的 LLM API Key

### 支持的模型厂商

虾饺支持所有 OpenAI 兼容 API。以下是常用厂商：

| 厂商 | API Base URL | API 类型 | 费用参考 |
|------|-------------|---------|---------|
| **OpenAI** | `https://api.openai.com/v1` | `openai-completions` | $5-60/M tokens |
| **Anthropic** | `https://api.anthropic.com` | `anthropic-messages` | $3-75/M tokens |
| **通义千问** | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `openai-completions` | ¥0.3-60/M tokens |
| **DeepSeek** | `https://api.deepseek.com` | `openai-completions` | ¥1-16/M tokens |
| **Kimi** | `https://api.moonshot.cn/v1` | `openai-completions` | ¥12/M tokens |
| **GLM（智谱）** | `https://open.bigmodel.cn/api/paas/v4` | `openai-completions` | ¥1-100/M tokens |
| **Ollama** | `http://localhost:11434/v1` | `openai-completions` | **免费**（本地运行） |
| **OpenRouter** | `https://openrouter.ai/api/v1` | `openai-completions` | 按模型计费 |

::: tip 省钱方案
- **完全免费**：Ollama 本地运行 Llama 3 / Qwen 2（需要 8GB+ 显存）
- **极低成本**：DeepSeek / 通义千问，几分钱就能用很久
- **最佳体验**：Claude Opus / GPT-4o，适合高质量创作和编码
:::

::: info Ollama 本地运行
如果你不想付费，可以用 [Ollama](https://ollama.com/) 在本地运行开源模型。安装后：

```bash
ollama pull llama3.1      # 下载模型
ollama pull qwen2.5       # 或者通义千问
```

然后在虾饺中配置 API Base URL 为 `http://localhost:11434/v1`，无需 API Key。
:::

### 配置步骤详解

1. **点击"添加配置"**
2. **填写 Provider 名称**（随便取，比如"通义千问"）
3. **填写 API Base URL**（参考上表）
4. **填写 API Key**（从厂商控制台获取）
5. **选择默认模型**（如 `qwen-turbo`、`gpt-4o`）
6. **保存**

然后为每个 Agent 指定使用哪个 Provider 和模型：

```
设置 → Agent → 代码助手 → 模型：选择 "通义千问 / qwen-plus"
```

::: tip 混合配置
不同 Agent 可以用不同模型。比如：
- 代码助手用 Claude（擅长代码）
- 翻译官用 GPT-4o（擅长多语言）
- 日常聊天用 Qwen（便宜够用）
:::

## 第 5 步：开始聊天

配置好模型后，你就可以：

### 一对一对话

在左侧通讯录中点击任意 Agent，进入一对一对话：

| Agent | 适合聊什么 |
|-------|----------|
| 🤖 虾饺管家 | "帮我设置一个每天 9 点的定时任务" |
| ✍️ 小说家 | "写一首关于春天的诗" |
| 📝 编辑 | "帮我润色这段文案" |
| 🌐 翻译官 | "把这段话翻译成英文" |
| 💻 代码助手 | "用 Python 写一个爬虫" |

### 群组协作

1. 在通讯录中点击"新建群组"
2. 拉入多个 Agent
3. 用 `@Agent名` 和特定 Agent 对话

```
你：@小说家 写一首关于月光的诗
小说家：月明清辉照窗台...

你：@翻译官 把这首诗翻译成英文
翻译官：The moonlight gently graces my windowsill...
```

### 设置协作链

在群组设置中配置协作链，实现自动接力：

```
小说家 → 编辑 → 翻译官
```

之后你只需说一句话，三个 Agent 自动依次完成各自的工作。

## 验证一切正常

如果以下几点都满足，说明安装成功：

- [x] `http://localhost:18800` 能打开
- [x] 能用密码登录
- [x] 设置页面能保存 LLM 配置
- [x] 和 Agent 对话能收到回复
- [x] 回复中显示 Tool Calling 调用过程（如果开启了工具）

## 常见问题

### 端口被占用

```
Error: listen EADDRINUSE :::18800
```

换个端口：

```bash
IM_PORT=3000 npm start
```

### Node.js 版本不对

```bash
node -v
# 如果低于 v22.0.0，需要升级
```

详见 [安装指南](/guide/installation)。

### 怎么修改密码？

启动时设置环境变量：

```bash
OWNER_KEY=your-strong-password npm start
```

### 支持 HTTPS 吗？

虾饺本身只提供 HTTP。生产环境建议用 Nginx 反向代理加 HTTPS。详见 [云服务器部署](/deployment/cloud)。

### Agent 没有回复？

1. 检查 LLM 配置是否正确（API Key / Base URL）
2. 检查浏览器控制台是否有报错
3. 检查 Agent 是否分配了模型

## 首次使用推荐路径

安装好之后，按这个顺序体验虾饺的核心功能：

### 5 分钟体验（了解基本操作）

1. 点击"代码助手"，发一条消息试试
2. 看看 Agent 的流式输出效果
3. 试试发一段代码让它审查

### 15 分钟探索（体验多 Agent 协作）

4. 创建一个群组，拉入小说家 + 编辑 + 翻译官
5. 设置协作链：小说家 → 编辑 → 翻译官
6. 发一条消息，看三个 Agent 自动接力
7. 观察可视化面板的状态变化

### 30 分钟深入（定制自己的 Agent）

8. 在通讯录中创建一个新 Agent
9. 编辑它的 SOUL.md，写入你需要的人格（参考 [模板库](/guide/soul-templates)）
10. 给它配置合适的工具和模型
11. 和它聊几轮，根据效果调整 SOUL.md

### 1 小时高阶（构建 Agent 团队）

12. 上传文档到 RAG 知识库
13. 设置定时任务（每天新闻摘要）
14. 尝试 [实战案例](/guide/recipes) 中的配置方案

## 下一步

| 你想... | 看这里 |
|---------|--------|
| 详细安装步骤 | [安装指南](/guide/installation) — Windows / macOS / Linux |
| 体验群聊 | [多 Agent 群聊](/features/multi-agent-chat) — 创建群组，@mention |
| 配更多模型 | [模型配置](/guide/model-config) — 8 个 Provider 详细教程 |
| 用 Docker | [Docker 部署](/deployment/docker) — 容器化部署 |
| 写 Agent 人格 | [SOUL.md 指南](/guide/soul-guide) — 写出好的人格设定 |
| 照搬方案 | [实战案例](/guide/recipes) — 12 个 Agent 团队配置 |
| 遇到问题 | [故障排查](/guide/troubleshooting) — 按症状排查 |
