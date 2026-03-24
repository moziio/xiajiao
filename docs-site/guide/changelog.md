---
title: 更新日志 — 虾饺 IM
description: 虾饺 IM 的版本更新历史，记录每次发布的新功能、改进和修复。
---

# 更新日志

## v1.0.0 — 2026-03-19

首个公开发布版本。经过约 4 个月的开发，从一个"想让 3 个 Agent 像流水线一样接力"的想法，到今天的完整平台。

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

### 文档站

首次发布即配备完整文档站（VitePress 构建，GitHub Actions 自动部署）：

| 类别 | 页面数 | 内容 |
|------|--------|------|
| 入门指南 | 4 | 虾饺是什么、快速开始、安装指南、模型配置大全 |
| 进阶 | 6 | SOUL.md 指南、模板库、实战案例、平台对比、安全与隐私、架构设计 |
| 参考 | 5 | API 参考、性能调优、故障排查、FAQ、术语表 |
| 功能 | 6 | 群聊、Tool Calling、记忆、RAG、协作流、渠道接入 |
| 部署 | 3 | 本地、Docker、云服务器 |
| 开发 | 3 | 开发者指南、更新日志 |
| **合计** | **27** | **~6500 行 Markdown** |

---

## 开发时间线

这个项目是一个人从零开始做的。以下是关键里程碑：

### 2025 年 11 月 — 起步

> "为什么不能 `npm start` 就跑？"

那时候想搭一个 AI 写作团队——小说家、编辑、翻译官三个 Agent 接力。试了 Dify、Coze、FastGPT，安装都要半小时以上。

开始用 `node:http` 写第一个 HTTP 端点。选择零框架路线。

**主要成果**：
- 基础 HTTP 服务器（`node:http`）
- 用户认证（`node:crypto`）
- 单 Agent 对话
- 前端原型（Vanilla JS）

### 2025 年 12 月 — 群聊 + 协作

> "Agent 能不能像微信群一样聊天？"

实现了群组系统和 @mention 路由。这个月最大的挑战是 WebSocket 流式输出——LLM 返回 SSE，要转成 WebSocket 帧，还要处理 tool_call 在文字中间突然打断的情况。

**关键决策**：
- 选择 SQLite（`node:sqlite`）而非 PostgreSQL — 零运维
- WebSocket 用 `ws` 库 — Node.js 标准库不含 WebSocket
- 前端继续 Vanilla JS — 改完刷新就生效

**主要成果**：
- 群组系统 + @mention 路由
- WebSocket 实时消息推送
- 流式输出（stream_start → stream_chunk → stream_end）
- 多模型支持（OpenAI / Claude / 通义）

### 2026 年 1 月 — Tool Calling + 记忆

> "Agent 能不能像真正的同事一样记住我？"

Tool Calling 的实现比想象中复杂得多。核心挑战：流式回复中间突然出现 tool_call JSON，要暂停文本流、执行工具、把结果注回上下文、继续流式回复。

持久记忆的三分类设计（语义/情景/程序性）参考了认知科学。embedding 去重阈值试了 0.8 → 0.85 → 0.9 → 0.95，最终选定 0.9。

**主要成果**：
- 7 个内置工具
- 三分类持久记忆 + embedding 去重
- SOUL.md 人格系统
- 协作链 + 可视化面板

### 2026 年 2 月 — RAG + 安全

> "Agent 能不能基于我的文档回答？"

RAG 系统采用三阶段管线：BM25 关键词 + 向量语义 → RRF 融合 → LLM 重排序。分层分块设计（200 字小块检索、800 字大块提供上下文）是一个关键的性能/质量权衡。

安全方面实现了 RBAC 四级权限、CSRF 防护、速率限制。全程只有 6 个 npm 依赖，`npm audit` 全绿。

**主要成果**：
- RAG 知识库（PDF + 文本）
- 三阶段检索管线
- RBAC 权限系统
- CSRF + Rate Limiting
- 飞书 WebSocket 渠道接入
- PWA 离线 + 中英双语

### 2026 年 3 月 — 开源准备

> "代码写完了，文档得写好。"

清理代码、优化 README、搭建 VitePress 文档站。文档从 0 写到 27 页 6500 行。录制 Demo GIF、准备多平台推广文案。

**主要成果**：
- 53 个单元测试
- 完整 VitePress 文档站（27 页）
- Docker 支持
- GitHub Actions CI/CD
- 5 篇多平台推广文案

---

## 数字回顾

| 指标 | 数值 |
|------|------|
| 开发周期 | ~4 个月 |
| npm 依赖 | 6 |
| 后端代码 | ~10,000 行 JS |
| 前端代码 | ~5,000 行 JS + CSS |
| 单元测试 | 53 |
| 文档页数 | 27 |
| 文档行数 | ~6,500 行 Markdown |
| Git 提交 | ~300+ |
| 内置 Agent | 5 |
| 内置工具 | 7 |
| 支持模型商 | 8+ |

---

## Roadmap

### 近期（v1.1 ~ v1.2）

| 状态 | 特性 | 说明 | 预计时间 |
|------|------|------|---------|
| 🚧 进行中 | 工作流引擎 | 条件分支、错误处理、循环、可视化画布 | v1.1 |
| 🚧 进行中 | Agent 间协商 | 结构化多轮讨论，投票决策，意见汇总 | v1.1 |
| 📋 计划中 | 更多渠道接入 | 企业微信、钉钉、Telegram Bot 全适配 | v1.2 |
| 📋 计划中 | 消息搜索增强 | 全局消息搜索、按 Agent/日期/关键词筛选 | v1.2 |
| 📋 计划中 | Agent 导入/导出 | 一键导出 Agent（含 SOUL.md + 配置），分享给他人 | v1.2 |

### 中期（v1.3 ~ v2.0）

| 状态 | 特性 | 说明 |
|------|------|------|
| 📋 计划中 | MCP 工具市场 | 社区工具一键安装，标准化工具接口 |
| 📋 计划中 | 语音输入 | Whisper API 集成，语音转文字发消息 |
| 📋 计划中 | 移动端适配 | 响应式优化 + PWA 更好的移动体验 |
| 📋 计划中 | 图片理解 | GPT-4V / Claude Vision 支持，图片描述 + OCR |
| 📋 计划中 | Agent 模板市场 | 社区共享 Agent 模板，一键克隆 |

### 远期（v2.0+）

| 状态 | 特性 | 说明 |
|------|------|------|
| 🤔 探索中 | Agent 自主学习 | Agent 根据反馈自我优化 SOUL.md |
| 🤔 探索中 | 多租户支持 | 团队 SaaS 化部署，租户隔离 |
| 🤔 探索中 | Electron 桌面端 | 原生桌面应用，托盘通知 |
| 🤔 探索中 | 插件系统 | 用户自定义工具和集成，热加载 |
| 🤔 探索中 | Agent 组织结构 | 层级管理、项目分组、权限委派 |

---

## 参与贡献

虾饺是 MIT 协议开源的个人项目，欢迎任何形式的贡献：

- **Bug 反馈**: [GitHub Issues](https://github.com/moziio/xiajiao/issues)
- **功能建议**: [GitHub Discussions](https://github.com/moziio/xiajiao/discussions)
- **代码贡献**: Fork → Branch → PR，详见 [开发者指南](/guide/dev-guide)
- **文档改进**: 每页底部都有"在 GitHub 上编辑"链接
- **SOUL.md 模板**: 分享你设计的 Agent 人格模板

如果觉得虾饺有用，一个 Star 是最大的鼓励。
