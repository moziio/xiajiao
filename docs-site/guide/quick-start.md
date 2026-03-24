---
title: 快速开始 — 虾饺 IM
description: 3 步跑起来：git clone → npm install → npm start，30 秒启动你的 AI Agent 团队。
---

# 快速开始

只需 3 步，30 秒启动你的 AI Agent 团队。

## 环境要求

- **Node.js >= 22.0.0**（[下载地址](https://nodejs.org/)）

::: tip 为什么需要 Node.js 22？
虾饺使用 Node.js 22 内置的 `node:sqlite` 模块，无需安装任何数据库。
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

只有 6 个依赖，几秒钟搞定。

## 第 3 步：启动

```bash
npm start
```

看到以下输出说明启动成功：

```
Server running on http://localhost:18800
```

## 第 4 步：配置

1. 浏览器打开 `http://localhost:18800`
2. 输入默认密码 `admin` 登录
3. 进入 **设置 → 模型管理**
4. 添加你的 LLM API Key

支持以下模型厂商（任选一个即可）：

| 厂商 | API 类型 |
|------|---------|
| OpenAI（GPT-4o） | `openai-completions` |
| Anthropic（Claude） | `anthropic-messages` |
| 阿里通义千问 | `openai-completions` |
| Kimi（月之暗面） | `openai-completions` |
| DeepSeek | `openai-completions` |
| GLM（智谱） | `openai-completions` |
| Ollama（本地模型） | `openai-completions` |

::: tip
所有配置都可以在 Web 界面完成，无需手动编辑任何配置文件。
:::

## 第 5 步：开始聊天

配置好模型后，你就可以：

1. 在左侧通讯录中找到内置的 5 个 Agent
2. 点击任意 Agent 开始对话
3. 或者进入群组，用 @mention 与特定 Agent 交流

内置 Agent：

| Agent | 能力 |
|-------|------|
| 🤖 虾饺管家 | 系统管理、渠道管理、定时任务 |
| ✍️ 小说家 | 创意写作、诗歌、散文 |
| 📝 编辑 | 文字润色、语法修正、结构优化 |
| 🌐 翻译官 | 中英双语翻译、文学翻译 |
| 💻 代码助手 | 全栈开发、代码生成、技术问答 |

## 常见问题

### 端口被占用怎么办？

```bash
IM_PORT=3000 npm start
```

### 怎么修改密码？

```bash
OWNER_KEY=your-password npm start
```

或者在 Web 界面的 **设置** 中修改。

### 支持 HTTPS 吗？

虾饺本身只提供 HTTP。生产环境建议用 Nginx 反向代理加 HTTPS。详见 [云服务器部署](/deployment/cloud)。

## 下一步

- [安装指南](/guide/installation) — Windows / macOS / Linux 详细步骤
- [多 Agent 群聊](/features/multi-agent-chat) — 创建群组，体验 Agent 协作
- [Docker 部署](/deployment/docker) — 更喜欢容器？也支持
