---
title: 多 Agent 群聊 — 虾饺 IM
description: 创建群组、拉入多个 Agent、@mention 路由消息。Agent 之间可对话、接力协作，像管理真实团队。
---

# 多 Agent 群聊

虾饺的核心交互方式是 IM 群聊。像微信群一样管理 AI Agent：创建群组，拉入多个 Agent，用 @mention 精确路由消息。

<p align="center">
  <img src="/images/hero-light-top.png" alt="多 Agent 群聊" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>

## 为什么是"群聊"而不是"工作流"？

大多数 AI 平台用"工作流"来编排 Agent——拖拽节点、连线、配参数。这很强大，但也很重：

| 维度 | 工作流模式（Dify 等） | 群聊模式（虾饺） |
|------|---------------------|----------------|
| 上手难度 | 需要学习 DAG 概念和 UI | 发消息就行 |
| 灵活度 | 流程预设，修改需改画布 | 随时 @任何 Agent |
| 协作方式 | 固定管线 | 自由组合 |
| 适合场景 | 生产环境固定流程 | 探索、创意、灵活协作 |
| 人机交互 | 配置后自动执行 | 实时对话，随时干预 |

虾饺选择群聊模式，是因为它更**直觉**、更**灵活**。你不需要提前规划好所有流程，只需要把合适的 Agent 拉到一起，像和同事聊天一样发指令。

## 基本概念

### Agent —— 你的 AI 同事

每个 Agent 是一个独立的 AI 角色，有自己的：

| 属性 | 说明 | 示例 |
|------|------|------|
| **名称 + Emoji** | 方便识别和 @mention | ✍️ 小说家 |
| **SOUL.md** | Markdown 人格设定文件 | 定义角色、风格、行为规则 |
| **模型** | 使用哪个 LLM | `anthropic/claude-opus-4-6` |
| **工具权限** | 允许使用哪些内置工具 | `web_search`, `memory_write` |
| **记忆空间** | 独立的持久记忆 | 每个 Agent 有自己的记忆，互不干扰 |
| **工作区** | 独立的文件存储 | `data/workspace-{id}/` |

#### 内置 5 个开箱即用的 Agent

| Agent | 角色 | 擅长 | 默认工具 |
|-------|------|------|---------|
| 🤖 虾饺管家 | 系统管理 | 渠道管理、定时任务、系统问答 | web_search, manage_channel, manage_schedule, memory |
| ✍️ 小说家 | 创意写作 | 诗歌、散文、短篇故事、文生图 | web_search, memory |
| 📝 编辑 | 文字编辑 | 润色、语法修正、结构优化 | memory |
| 🌐 翻译官 | 翻译 | 中英双向、文学翻译、技术文档 | web_search, memory |
| 💻 代码助手 | 开发 | 全栈开发、代码生成、技术方案 | web_search, memory, rag_query |

::: tip 自定义 Agent
你可以创建任意数量的自定义 Agent。给它取个名字，选择模型，写一份 SOUL.md 人格设定，配置工具权限，就完成了。
:::

### 群组 —— Agent 的协作空间

群组是多个 Agent 在一起工作的空间。群组有以下属性：

| 属性 | 说明 |
|------|------|
| **名称 + Emoji** | 群组标识 |
| **成员** | 拉入的 Agent 列表 |
| **Leader** | 可选，处理没有 @mention 的消息 |
| **协作链** | 可选，定义 Agent 自动接力顺序 |

<div style="text-align: center; margin: 1.5rem 0;">
  <img src="/images/group-chat-light.png" alt="浅色模式群聊 — AI Writing Team 创作协作" style="max-width: 480px; width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
  <p style="color: var(--vp-c-text-2); font-size: 0.85rem; margin-top: 0.5rem;">浅色模式群聊 — AI Writing Team 的创作协作</p>
</div>

## @mention 路由机制

在群聊中输入 `@` 会弹出 Agent 列表，选择目标 Agent 后发送消息。

### 路由规则

```
┌─────────────────────────────────────────────────┐
│  用户消息                                        │
│     ↓                                            │
│  包含 @mention？                                  │
│     │  是                        │  否           │
│     ↓                           ↓               │
│  精确路由到被 @的 Agent       有设置 Leader？      │
│  （可以 @多个 Agent）           │  是    │  否    │
│                                 ↓       ↓       │
│                           Leader 响应  无人响应   │
└─────────────────────────────────────────────────┘
```

<p align="center">
  <img src="/images/hero-light-middle.png" alt="@mention 路由实际效果" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>
<p align="center" style="color: var(--vp-c-text-2);">
  <em>真实对话：用户 @翻译官 发起翻译请求，翻译官自动响应并输出。</em>
</p>

### 三种路由方式

**1. 精确路由**（最常用）

```
你：@小说家 写一首关于春天的诗
→ 只有小说家响应
```

**2. 多 Agent 路由**

```
你：@小说家 @翻译官 写一首诗并翻译
→ 小说家先响应，翻译官随后响应
```

**3. 全员广播**

```
你：今天天气真好
→ 如果设置了 Leader，Leader 响应
→ 如果没设置，无人自动响应
```

### Agent 间通信

Agent 之间也可以互相 @mention。例如小说家写完诗后回复：

```
小说家："这是我写的诗。@翻译官 请帮忙翻译成英文。"
翻译官：[自动被触发，翻译诗歌]
```

这种自由的 Agent 间通信是虾饺独特的设计——不需要预设流程，Agent 可以在对话中自由协调。

::: warning 注意
如果不希望 Agent 自由 @mention 其他 Agent（避免连锁反应），可以在 SOUL.md 中设定规则：`不要 @其他 Agent，不要指挥别人做事`。
:::

## 创建和管理

<div style="text-align: center; margin: 1.5rem 0;">
  <img src="/images/agent-management.png" alt="Agent 管理面板 — 创建、编辑、删除 Agent" style="max-width: 480px; width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
  <p style="color: var(--vp-c-text-2); font-size: 0.85rem; margin-top: 0.5rem;">Agent 管理面板 — 创建、编辑、删除 Agent，一目了然</p>
</div>

### 创建 Agent

1. 在 Web 界面的"通讯录"中点击 **新建 Agent**
2. 填写基本信息：名称、Emoji、选择模型
3. 配置工具权限（勾选允许使用的工具）
4. 可选：开启 `autoInjectMemory` 自动注入记忆

<p align="center">
  <img src="/images/contacts-light.png" alt="Agent 通讯录" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>

### 编辑 SOUL.md

每个 Agent 在 `data/workspace-{id}/SOUL.md` 中有自己的人格设定。示例：

```markdown
# 代码助手

你是一位全栈开发工程师，擅长将需求转化为简洁可运行的代码。

## 工作原则
- 先确认需求，再动手写代码
- 偏好简洁高效的解决方案
- 代码自带必要注释，但不写废话注释
- 给出方案时说明取舍理由

## 技术栈
- 后端：Node.js / Python / Go
- 前端：HTML / CSS / JavaScript
- 数据库：SQLite / PostgreSQL / Redis

## 输出格式
- 代码用 markdown 代码块，标注语言
- 复杂逻辑先给思路概述，再写代码
```

::: tip SOUL.md 的优势
- 用文本编辑器就能修改，不需要复杂的 UI
- Git 版本控制，diff 一眼看出改了什么
- 分享一个 `.md` 文件就能克隆一个 Agent 人格
:::

### 创建群组

1. 在通讯录中点击 **新建群组**
2. 填写群名和 emoji
3. 选择要拉入的 Agent（至少 1 个）
4. 可选：设置协作链（Agent 自动接力顺序）
5. 可选：设置 leader（处理未 @mention 的消息）

<p align="center">
  <img src="/images/hero-light-bottom.png" alt="群聊协作" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>

## 实际使用场景

### 场景 1：AI 写作工作室

```
群组：📝 写作工作室
成员：小说家 + 编辑 + 翻译官
协作链：小说家 → 编辑 → 翻译官

你：@小说家 写一首关于月光的诗
→ 小说家创作诗歌
→ 编辑自动接力润色
→ 翻译官自动接力英译
```

### 场景 2：技术问答群

```
群组：💻 技术支持
成员：代码助手 + 翻译官
Leader：代码助手

你：帮我写一个 Python 爬虫
→ 代码助手响应（因为是 Leader）

你：@翻译官 把这段错误信息翻译成中文
→ 翻译官响应
```

### 场景 3：一对一私聊

```
直接点击通讯录中的 Agent，进入一对一对话。
无需创建群组，适合日常问答。
```

<div style="text-align: center; margin: 1.5rem 0;">
  <img src="/images/coder-chat.png" alt="代码助手一对一对话" style="max-width: 480px; width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
  <p style="color: var(--vp-c-text-2); font-size: 0.85rem; margin-top: 0.5rem;">代码助手实际对话 — Agent 分析思路后输出可运行代码</p>
</div>

## 消息能力

虾饺的消息支持丰富的格式：

| 能力 | 说明 |
|------|------|
| **Markdown 渲染** | 标题、列表、表格、引用 |
| **代码高亮** | 100+ 语言语法高亮 |
| **Mermaid 图表** | 流程图、时序图、甘特图 |
| **LaTeX 公式** | 行内和块级数学公式 |
| **图片** | 文生图 / 上传图片 |
| **全文搜索** | SQLite FTS5，快速检索历史消息 |
| **流式输出** | LLM 回复逐字显示，像打字机一样 |

<div style="text-align: center; margin: 1.5rem 0;">
  <img src="/images/poem-ai-art-full.png" alt="群聊中长诗与夏夜星空 AI 配图——诗文与插图连续展示" style="max-width: 520px; width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
  <p style="color: var(--vp-c-text-2); font-size: 0.85rem; margin-top: 0.5rem;">群聊中的富内容：诗歌正文与 AI 生成插图衔接展示</p>
</div>

## 群组管理最佳实践

### 群组设计原则

| 原则 | 说明 |
|------|------|
| 一群一主题 | "写作工作室"、"技术讨论"、"知识库问答"分开 |
| Agent 数量 2-4 | 太多 Agent 反而混乱，每个群聚焦 |
| 明确 Leader | 没有 @mention 时，Leader 接收消息 |
| SOUL.md 定边界 | 明确每个 Agent 负责什么、不做什么 |

### 常见的群组配置模式

**模式 1：生产线型**（有协作链）

```
群组：内容工厂
链条：创作者 → 编辑 → 翻译
触发方式：发一条消息，三步自动完成
```

**模式 2：专家组型**（无协作链）

```
群组：技术咨询
成员：前端专家 + 后端专家 + DBA
触发方式：@mention 你需要的专家
```

**模式 3：助理型**（一个 Leader + 辅助）

```
群组：日常助理
Leader：虾饺管家（接收所有非 @mention 消息）
辅助：翻译官（需要翻译时手动 @）
```

**模式 4：对比型**（同角色不同模型）

```
群组：模型 PK
成员：GPT-4o 选手 + Claude 选手 + 通义选手
触发方式：同时 @mention 三个，对比回答质量
```

## 下一步

- [协作流](/features/collaboration-flow) — 了解协作链和可视化面板的完整机制
- [Tool Calling](/features/tool-calling) — Agent 不只聊天，还能搜索、记忆、调用其他 Agent
- [Agent 持久记忆](/features/agent-memory) — Agent 如何记住你的偏好
- [SOUL.md 写作指南](/guide/soul-guide) — 如何写出高质量的 Agent 人格设定
- [SOUL.md 模板库](/guide/soul-templates) — 20 个可直接复制的 Agent 人格模板
- [平台对比](/guide/comparison) — 虾饺 vs Dify vs Coze vs FastGPT
- [实战案例](/guide/recipes) — 12 个可直接照搬的 Agent 团队配置方案
