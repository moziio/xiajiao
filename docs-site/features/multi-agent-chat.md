---
title: 多 Agent 群聊 — 虾饺 IM
description: 创建群组、拉入多个 Agent、@mention 路由消息。Agent 之间可对话、接力协作。
---

# 多 Agent 群聊

虾饺的核心交互方式是 IM 群聊。像微信群一样管理 AI Agent：创建群组，拉入多个 Agent，用 @mention 精确路由消息。

<p align="center">
  <img src="/images/hero-light-top.png" alt="多 Agent 群聊" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>

## 基本概念

### Agent

Agent 是虾饺中的"AI 同事"。每个 Agent 有：

- **名称和头像** — 方便识别
- **SOUL.md** — 人格设定文件，定义 Agent 的角色、风格、行为规则
- **模型** — 指定使用哪个 LLM（GPT-4o / Claude / 通义 / ...）
- **工具权限** — 允许使用哪些内置工具
- **记忆** — 独立的持久记忆空间

内置 5 个开箱即用的 Agent：

| Agent | 角色 | 擅长 |
|-------|------|------|
| 🤖 虾饺管家 | 系统管理 | 渠道管理、定时任务、系统问答 |
| ✍️ 小说家 | 创意写作 | 诗歌、散文、短篇故事 |
| 📝 编辑 | 文字编辑 | 润色、语法修正、结构优化 |
| 🌐 翻译官 | 翻译 | 中英双向、文学翻译、技术文档本地化 |
| 💻 代码助手 | 开发 | 全栈开发、代码生成、技术方案 |

### 群组

群组是多个 Agent 协作的空间。在群组中：

- 用 `@Agent名` 发送消息给特定 Agent
- Agent 收到 @mention 后自动回复
- Agent 之间也可以互相 @mention 实现接力
- 支持配置"协作链"实现自动化流水线

## @mention 路由

在群聊中输入 `@` 会弹出 Agent 列表，选择目标 Agent 后发送消息。

路由规则：

1. **精确路由**：`@小说家 写一首诗` → 只有小说家响应
2. **多 Agent 路由**：`@小说家 @翻译官 写一首诗并翻译` → 两个 Agent 依次响应
3. **全员广播**：不带 @mention 的消息 → 群组 leader 响应（如果设置了的话）

## 创建和管理

### 创建 Agent

在 Web 界面的"通讯录"中点击"新建 Agent"，填写名称、选择模型、配置工具权限。

Agent 的性格通过 **SOUL.md** 文件定义。每个 Agent 在 `data/workspace-{id}/SOUL.md` 中有自己的人格设定。

### 创建群组

在通讯录中点击"新建群组"：

1. 填写群名和 emoji
2. 选择要拉入的 Agent
3. 可选：设置协作链（Agent 自动接力顺序）
4. 可选：设置 leader（处理未 @mention 的消息）

<p align="center">
  <img src="/images/hero-light-bottom.png" alt="群聊协作" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>

## 下一步

- [协作流](/features/collaboration-flow) — 了解协作链和可视化面板
- [Tool Calling](/features/tool-calling) — Agent 不只聊天，还能动手做事
