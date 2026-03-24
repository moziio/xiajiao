---
title: 迁移指南 — 虾饺 IM
description: 从 ChatGPT、Dify、Coze、FastGPT 迁移到虾饺 IM 的详细步骤。
---

# 迁移指南

从其他 AI 平台迁移到虾饺，保留你的 Agent 设定和知识库。

## 从 ChatGPT 迁移

ChatGPT 的 Custom Instructions / GPTs → 虾饺的 SOUL.md + Agent。

### 步骤

1. **安装虾饺**（30 秒）

```bash
git clone https://github.com/moziio/xiajiao.git
cd xiajiao && npm install && npm start
```

2. **配置 OpenAI API Key**

设置 → 模型管理 → 添加 OpenAI → 填入 API Key → 选择模型（如 `gpt-4o`）。

3. **迁移 Custom Instructions**

把 ChatGPT 的 Custom Instructions 复制过来，转为 SOUL.md 格式：

| ChatGPT 的设置 | 虾饺的 SOUL.md |
|---------------|---------------|
| "What would you like ChatGPT to know about you?" | `## 用户背景` 段落 |
| "How would you like ChatGPT to respond?" | `## 输出规则` 段落 |

**ChatGPT Custom Instructions 示例**：
```
I'm a Python developer. I use FastAPI and PostgreSQL.
Keep responses concise. Use code blocks for code.
```

**转为 SOUL.md**：
```markdown
# 代码助手

你是一位资深 Python 后端工程师。

## 用户背景
- 用户是 Python 开发者
- 技术栈：FastAPI + PostgreSQL

## 输出规则
- 回复简洁
- 代码用代码块包裹
- 优先使用 Python 示例
```

4. **迁移 GPTs**

每个 GPT → 一个虾饺 Agent。GPT 的 Instructions → SOUL.md，GPT 的 Knowledge → RAG 知识库。

### 你能多得到什么

| 能力 | ChatGPT | 虾饺 |
|------|---------|------|
| 多 Agent 协作 | ❌ | ✅ @mention + 协作链 |
| Agent 间对话 | ❌ | ✅ call_agent |
| 持久记忆 | 有限 | ✅ 三分类 + embedding 去重 |
| 数据私有 | ❌ 云端 | ✅ 完全本地 |
| 免费使用 | $20/月 | ✅ MIT 开源 |
| 模型自由 | 固定 | ✅ 任意模型 |

## 从 Dify 迁移

Dify 的 App / Workflow → 虾饺的 Agent + 协作链。

### 步骤

1. **导出 Dify 的 System Prompt**

在 Dify 应用设置中找到 System Prompt，复制内容。

2. **转为 SOUL.md**

Dify 的 System Prompt 通常就是一段文本。在虾饺中，用 Markdown 结构化：

```markdown
# [Agent 名称]

[把 Dify System Prompt 的第一段作为角色描述]

## 工作原则
[提取 Dify prompt 中的规则部分]

## 输出格式
[提取 Dify prompt 中的格式要求]
```

3. **迁移知识库**

从 Dify 导出知识库文档（PDF/TXT） → 上传到虾饺 Agent 的 RAG 知识库。

虾饺的 RAG 会自动重新分块和索引，不需要手动配置分块参数。

4. **迁移工作流**

| Dify 功能 | 虾饺等价 |
|-----------|---------|
| 线性工作流 | 协作链 |
| 条件分支 | Leader Agent 路由 |
| LLM 节点 | Agent |
| 知识检索节点 | `rag_query` 工具 |
| HTTP 请求节点 | 自定义工具 |

::: warning 注意
Dify 的可视化工作流画布在虾饺中没有直接对应。复杂的条件分支需要通过 Leader Agent 的 SOUL.md 来定义路由逻辑。
:::

### 你少了什么、多了什么

| 少了 | 多了 |
|------|------|
| 拖拽式工作流画布 | IM 式多 Agent 群聊 |
| API 发布 | Agent 协作链 |
| 多租户 | 三分类持久记忆 |
| — | 零外部依赖部署 |
| — | 完全离线运行（+ Ollama） |

## 从 Coze 迁移

Coze 的 Bot → 虾饺的 Agent。

### 步骤

1. **导出 Bot 设置**

在 Coze 的 Bot 配置中，复制：
- 人设描述 → SOUL.md
- 知识库文档 → 下载后上传到虾饺 RAG

2. **插件替换**

| Coze 插件 | 虾饺等价 |
|-----------|---------|
| 搜索插件 | `web_search` 工具 |
| 知识库 | `rag_query` 工具 |
| 定时触发 | `manage_schedule` 工具 |
| 其他插件 | 自定义工具开发 |

Coze 有 100+ 插件生态，虾饺只有 7 个内置工具。如果你依赖大量 Coze 插件，虾饺可能不适合。

3. **配置模型**

Coze 默认用字节旗下模型。迁移到虾饺后，你可以自由选择任何模型。

## 从 FastGPT 迁移

FastGPT 的知识库应用 → 虾饺的 Agent + RAG。

### 步骤

1. **导出知识库文档** → 上传到虾饺
2. **复制 System Prompt** → 转为 SOUL.md
3. **工作流** → 协作链（线性部分）+ Leader 路由（分支部分）

## 通用迁移清单

不管从哪个平台迁移，检查这些：

```
✅ 安装虾饺并跑起来
✅ 配置至少一个 LLM Provider
✅ 创建 Agent 并写好 SOUL.md
✅ 上传知识库文档（如有）
✅ 测试基本对话正常
✅ 设置协作链（如需多 Agent 协作）
✅ 验证 Agent 记忆功能（聊几轮，看记忆是否生效）
✅ 配置定时任务（如需）
✅ 设置备份脚本
```

## 下一步

- [快速开始](/guide/quick-start) — 安装虾饺
- [SOUL.md 写作指南](/guide/soul-guide) — 写好 Agent 人格设定
- [SOUL.md 模板库](/guide/soul-templates) — 20+ 现成模板
- [模型配置](/guide/model-config) — 8 个 Provider 配置教程
- [平台对比](/guide/comparison) — 详细功能对比
- [实战案例](/guide/recipes) — 12 个 Agent 团队配置方案
