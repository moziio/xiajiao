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

## 和其他平台有什么不同？

大多数 AI 平台（Dify、Coze、FastGPT）的定位是 **AI 应用开发平台**——帮你构建面向用户的 AI 应用。

虾饺的定位是 **AI Agent 团队协作平台**——把 Agent 当同事，不当工具。

|  | 虾饺 | Dify / FastGPT |
|--|------|----------------|
| 核心概念 | Agent 是"同事" | Agent 是"应用" |
| 交互方式 | IM 群聊 | 工作流画布 |
| Agent 关系 | 平等协作 | 预设管线 |
| 启动方式 | `npm start` | `docker compose up` |
| 外部依赖 | **无** | PostgreSQL + Redis + ... |

## 核心能力

| 能力 | 说明 |
|------|------|
| 🤖 多 Agent 群聊 | 群组 + @mention 路由 + Agent 间对话 |
| 🔧 Tool Calling | 7 个内置工具，可扩展 |
| 🧠 持久记忆 | 三分类记忆（语义 / 情景 / 程序性） |
| 📚 RAG 知识库 | BM25 + 向量混合检索 + LLM 重排序 |
| 🔗 协作流 | 协作链 + 可视化面板 + 工作流引擎 |
| 🔌 多模型 | OpenAI / Claude / 通义 / Ollama 等 |

## 谁适合用？

- **独立开发者** — 想要一支 AI 团队，但不想折腾 DevOps
- **AI 爱好者** — 想体验多 Agent 协作模式
- **小团队** — 需要零供应商锁定的自托管 AI 工作空间
- **研究者** — 原型验证 Agent 间通信和记忆系统

## 技术概览

| 层 | 技术 |
|----|------|
| 运行时 | Node.js 22+（原生 `node:sqlite`） |
| HTTP | `node:http`（零框架） |
| WebSocket | `ws` |
| 数据库 | SQLite（WAL + FTS5） |
| 前端 | Vanilla JS + CSS（零构建） |
| 依赖 | **6 个** |
| 测试 | 53 个单元测试 |

> **设计哲学**：每个依赖都是负债，不是资产。能用标准库的，绝不引入第三方包。

## 名字的含义

**虾饺**取名自广式点心——小巧精致，内料丰富。

最少的依赖，最全的能力。这就是虾饺的理念。

## 下一步

准备好了？跟着 [快速开始](/guide/quick-start) 三步跑起来。
