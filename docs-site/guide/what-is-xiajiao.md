---
title: 虾饺是什么 — 虾饺 IM
description: 虾饺 IM 是一个 AI Agent 团队协作平台，6 个 npm 依赖，npm start 即跑，把 Agent 当同事管理。
---

# 虾饺是什么

虾饺 IM（Xiajiao）是一个**开源的 AI Agent 团队协作平台**。

用一句话概括：**像管微信群一样管理你的 AI Agent。**

你可以创建群组，拉入多个 Agent（小说家、编辑、翻译官、代码助手……），用 @mention 跟它们对话。Agent 之间也能互相协作、互相接力，就像一个真正的工作团队。

<p align="center">
  <img src="/images/hero-light-top.png" alt="虾饺 IM 界面" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>

## 30 秒了解虾饺

<p align="center">
  <img src="/images/demo.gif" alt="35 秒 Demo" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>

## 和其他平台有什么不同？

大多数 AI 平台的定位是 **AI 应用开发平台**——帮你构建面向用户的 AI 应用。

虾饺的定位是 **AI Agent 团队协作平台**——把 Agent 当同事，不当工具。

### 设计哲学对比

|  | 虾饺 | Dify / FastGPT | Coze |
|--|------|----------------|------|
| **核心概念** | Agent 是"同事" | Agent 是"应用" | Agent 是"Bot" |
| **交互方式** | IM 群聊 | 工作流画布 | Bot 配置界面 |
| **Agent 关系** | 平等协作，可互相 @mention | 预设 DAG 管线 | 独立运行 |
| **用户定位** | 给自己用 | 给终端用户用 | 给终端用户用 |

### 技术架构对比

|  | 虾饺 | Dify | FastGPT | Coze |
|--|------|------|---------|------|
| **语言** | JavaScript | Python | TypeScript | 闭源 |
| **npm 依赖** | **6 个** | N/A | 100+ | N/A |
| **外部依赖** | **0 个** | PostgreSQL + Redis + Sandbox | MongoDB + PG + OneAPI | 云服务 |
| **启动命令** | `npm start` | `docker compose up` | `docker compose up` | SaaS |
| **安装时间** | **< 10 秒** | 5-10 分钟 | 5-10 分钟 | 无需安装 |
| **镜像大小** | ~150MB | ~2GB+ | ~1GB+ | N/A |
| **数据私有** | ✅ 完全本地 | ✅ 自托管 | ✅ 自托管 | ❌ 云端 |

::: info 不是竞争，是互补
Dify / FastGPT 适合构建面向客户的 AI 应用。虾饺适合个人/团队日常使用的 AI 协作空间。场景不同，选择不同。
:::

## 核心能力

| 能力 | 说明 | 详情 |
|------|------|------|
| 🤖 多 Agent 群聊 | 群组 + @mention 路由 + Agent 间对话 | [详情](/features/multi-agent-chat) |
| 🔧 Tool Calling | 7 个内置工具（搜索、记忆、RAG、跨 Agent 调用等） | [详情](/features/tool-calling) |
| 🧠 持久记忆 | 三分类记忆（语义 / 情景 / 程序性），embedding 去重 | [详情](/features/agent-memory) |
| 📚 RAG 知识库 | BM25 + 向量混合检索 + RRF + LLM 重排序 | [详情](/features/rag) |
| 🔗 协作流 | 协作链 + 可视化面板 + 人工干预 | [详情](/features/collaboration-flow) |
| 🔌 多模型 | OpenAI / Claude / 通义 / DeepSeek / Ollama 等 | [详情](/guide/model-config) |

## 使用场景

### 场景 1：AI 写作团队

创建群组，拉入小说家、编辑、翻译官。配好协作链后，你说一句"写一首诗"，三个 Agent 自动接力：

> 小说家创作 → 编辑润色 → 翻译官英译

全程可视化面板实时显示进度。你可以中途暂停、编辑、重新触发。

### 场景 2：私人知识助理

把技术文档、学习笔记上传到 RAG 知识库。Agent 自动索引，之后问它问题，它基于你的文档回答——不瞎编。

适合：技术团队内部知识管理、个人学习笔记检索、产品文档问答。

### 场景 3：多模型对比

给不同 Agent 分配不同模型：代码助手用 Claude（擅长代码），翻译官用 GPT-4o（擅长多语言），日常助理用通义千问（便宜够用）。在群里同时 @它们，对比回答质量。

### 场景 4：自动化运维

用虾饺管家配置定时任务：每天早上 9 点搜索新闻并发送摘要，每周一生成周报模板，每月检查系统状态。

### 场景 5：代码开发助理

代码助手 + RAG 知识库。把项目文档、API 规范上传到知识库，代码助手基于你的项目规范写代码，不是通用的网上抄来的代码。

## SOUL.md：用 Markdown 定义 Agent 人格

每个 Agent 有一个 `SOUL.md` 文件，用 Markdown 写"岗位说明书"：

```markdown
# 翻译官

你是一位精通中英双语的翻译专家。

## 工作原则
- 信、达、雅：忠实原意，表达通顺，语言优美
- 直接输出译文，不做逐句对照分析
- 遇到专业术语保留原文并附注中文

## 禁止事项
- 不翻译代码块中的内容
- 不要主动 @其他 Agent
```

### 为什么用 Markdown？

| 优势 | 说明 |
|------|------|
| **简单** | 用文本编辑器就能修改，不需要学习复杂的 UI |
| **版本控制** | Git diff 一眼看出改了什么 |
| **可分享** | 分享一个 `.md` 文件就能克隆一个 Agent 人格 |
| **可迁移** | 不依赖任何平台格式，纯文本永远可读 |
| **表达力** | Markdown 支持标题、列表、表格、代码块——足以表达复杂的角色设定 |

## 谁适合用？

| 用户群 | 使用方式 |
|--------|---------|
| **独立开发者** | 想要一支 AI 团队，但不想折腾 DevOps |
| **AI 爱好者** | 体验多 Agent 协作，探索 SOUL.md 人格设定 |
| **小团队** | 零供应商锁定的自托管 AI 工作空间 |
| **研究者** | 原型验证 Agent 间通信、记忆系统、RAG 管线 |
| **内容创作者** | AI 写作团队，协作链自动化内容生产 |
| **学生** | 学习 AI Agent 原理，代码简洁可读 |

## 技术概览

| 层 | 技术 | 说明 |
|----|------|------|
| 运行时 | Node.js 22+ | 原生 `node:sqlite`，无需外部数据库 |
| HTTP | `node:http` | 零框架，标准库直接用 |
| WebSocket | `ws` | 实时消息推送 |
| 数据库 | SQLite | WAL + FTS5，支持并发读和全文搜索 |
| 前端 | Vanilla JS + CSS | 零构建，修改即生效 |
| npm 依赖 | **6 个** | 每个都有不可替代的理由 |
| 测试 | 53 个单元测试 | `node:test` 标准库测试框架 |

> **设计哲学**：每个依赖都是负债，不是资产。能用标准库的，绝不引入第三方包。

## 一条消息背后发生了什么

当你在虾饺中发送 `@代码助手 写一个登录接口`，背后经历了 14 个步骤：

```
1. 消息存入 SQLite
2. WebSocket 广播给所有在线客户端
3. 解析 @mention → 目标: 代码助手
4. 加载代码助手的 SOUL.md
5. 检索代码助手的持久记忆（"用户偏好 Python，公司用阿里云"）
6. 注入记忆到 System Prompt
7. 组装完整上下文发给 LLM API（流式模式）
8. LLM 决定调用 web_search 工具
9. 执行搜索 → 结果回注上下文
10. LLM 继续生成代码
11. 逐 token 通过 WebSocket 推送到浏览器
12. 完整回复存入 SQLite
13. 代码助手主动 memory_write（"用户需要登录接口"）
14. 如果有协作链 → 触发下一个 Agent
```

整个过程对用户完全透明——Tool Calling 的每一步都在聊天界面实时显示。

## 不适合什么场景？

虾饺**不是万能的**，这些场景建议用其他平台：

| 场景 | 推荐 | 原因 |
|------|------|------|
| 构建面向客户的 AI 应用 | Dify | 工作流 + API 发布 + 多租户 |
| 不想自托管 | Coze / ChatGPT Team | SaaS 免运维 |
| 需要 100+ 插件 | Coze | 丰富的插件生态 |
| 大规模并发 | 自建微服务 | SQLite 单进程限制 |

详细对比见 [平台对比](/guide/comparison)。

## 名字的含义

**虾饺**取名自广式点心——小巧精致，内料丰富。

最少的依赖，最全的能力。这就是虾饺的理念。

## Roadmap

| 状态 | 特性 |
|------|------|
| ✅ 已完成 | 多 Agent 群聊、Tool Calling、持久记忆、RAG、协作流、RBAC |
| 🚧 进行中 | 工作流引擎、Agent 间协商 |
| 📋 计划中 | MCP 工具市场、语音输入、移动端适配 |
| 🤔 探索中 | Agent 自主学习、多租户支持 |

## 下一步

| 你想... | 看这里 |
|---------|--------|
| 立刻试试 | [快速开始](/guide/quick-start) — 3 步跑起来 |
| 配置模型 | [模型配置大全](/guide/model-config) — 8 个 Provider 详细教程 |
| 学 Agent 设计 | [SOUL.md 写作指南](/guide/soul-guide) — 写出好的 Agent 人格 |
| 复制 Agent 模板 | [SOUL.md 模板库](/guide/soul-templates) — 20+ 个模板 |
| 照搬方案 | [实战案例](/guide/recipes) — 12 个 Agent 团队配置 |
| 了解技术 | [架构设计](/guide/architecture) — 代码结构和数据流 |
| 对比平台 | [平台对比](/guide/comparison) — vs Dify/Coze/FastGPT |
| 确认安全 | [安全与隐私](/guide/security) — 数据主权详解 |
