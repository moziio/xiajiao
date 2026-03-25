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

### 文档站

首次发布即配备完整文档站（VitePress 构建，GitHub Actions 自动部署）：

| 类别 | 页面数 | 内容 |
|------|--------|------|
| 入门指南 | 4 | 虾饺是什么、快速开始、安装指南、模型配置大全 |
| 进阶 | 7 | SOUL.md 指南、模板库、实战案例、平台对比、安全与隐私、架构设计、迁移指南 |
| 参考 | 5 | API 参考、性能调优、故障排查、FAQ、术语表 |
| 功能 | 6 | 群聊、Tool Calling、记忆、RAG、协作流、渠道接入 |
| 部署 | 3 | 本地、Docker、云服务器 |
| 开发 | 2 | 开发者指南、更新日志 |
| 站点 | 1 | VitePress 首页（`index.md`） |
| **合计** | **28** | **约 7000 行 Markdown** |

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
- **代码贡献**: Fork → Branch → PR，详见 [开发者指南](/zh/guide/dev-guide)
- **文档改进**: 每页底部都有"在 GitHub 上编辑"链接
- **SOUL.md 模板**: 分享你设计的 Agent 人格模板

如果觉得虾饺有用，一个 Star 是最大的鼓励。

## 相关文档

- [开发者指南](/zh/guide/dev-guide) — 参与贡献与代码规范
- [快速开始](/zh/guide/quick-start) — 安装与首次使用
- [安装指南](/zh/guide/installation) — 各平台安装步骤
- [API 与协议参考](/zh/guide/api-reference) — 接口与协议
- [常见问题](/zh/guide/faq) — 使用中的疑问与解答
