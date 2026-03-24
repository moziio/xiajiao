---
title: 更新日志 — 虾饺 IM
description: 虾饺 IM 的版本更新历史，记录每次发布的新功能、改进和修复。
---

# 更新日志

## v1.0.0 — 2026-03-19

首个公开发布版本。

### 核心功能

- **多 Agent 群聊** — 创建群组，拉入多个 Agent，用 @mention 精确路由消息
- **协作链** — 配置 Agent 接力顺序，一句话触发全自动流水线
- **可视化面板** — 实时显示协作链每个节点的状态和输出
- **Tool Calling** — 7 个内置工具，完整的 LLM 调用循环
  - `web_search`（6 个搜索引擎，自动故障切换）
  - `rag_query`（BM25 + 向量混合检索 + RRF + LLM 重排序）
  - `memory_write` / `memory_search`（三分类持久记忆）
  - `call_agent`（跨 Agent 调用，3 层嵌套保护）
  - `manage_channel`（飞书/钉钉/企微/Telegram 连接器）
  - `manage_schedule`（Cron 定时任务）
- **三分类持久记忆** — 语义/情景/程序性记忆，embedding 去重，自动注入
- **RAG 知识库** — 分层分块（200/800 字），三阶段检索管线
- **SOUL.md** — 用 Markdown 定义 Agent 人格设定
- **多模型支持** — OpenAI / Claude / 通义 / DeepSeek / Kimi / GLM / Ollama / OpenRouter

### 技术特性

- 6 个 npm 依赖，零外部服务
- Node.js 22+ 原生 `node:sqlite`
- SQLite WAL + FTS5 全文搜索
- Vanilla JS 前端，零构建
- 53 个单元测试（`node:test`）
- PWA 离线支持
- 中英双语
- RBAC 四级权限
- CSRF + 速率限制
- Docker 支持（可选）

### 内置 Agent

- 🤖 虾饺管家 — 系统管理、渠道管理、定时任务
- ✍️ 小说家 — 创意写作、诗歌、散文
- 📝 编辑 — 文字润色、语法修正
- 🌐 翻译官 — 中英双向翻译
- 💻 代码助手 — 全栈开发、代码生成

---

## Roadmap

| 状态 | 特性 |
|------|------|
| ✅ 已完成 | 多 Agent 群聊、Tool Calling、持久记忆、RAG、协作流、PWA、安全加固 |
| 🚧 进行中 | 工作流引擎（条件分支、错误处理） |
| 🚧 进行中 | Agent 间协商机制 |
| 📋 计划中 | MCP 工具市场 |
| 📋 计划中 | 语音输入 |
| 📋 计划中 | 移动端适配 |
| 🤔 探索中 | Agent 自主学习 |
| 🤔 探索中 | 多租户支持 |
| 🤔 探索中 | Electron 桌面端 |
