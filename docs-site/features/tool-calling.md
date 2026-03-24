---
title: Tool Calling — 虾饺 IM
description: 7 个内置工具，Agent 不只聊天，还能搜索网络、检索知识库、读写记忆、调用其他 Agent。
---

# Tool Calling（工具调用）

Agent 不只聊天——它们能**动手做事**。虾饺提供 7 个内置工具，全部开箱即用。

<p align="center">
  <img src="/images/tool-calling.png" alt="Tool Calling 实时调用" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>
<p align="center" style="color: var(--vp-c-text-2);">
  <em>Agent 实时调用 memory_search 回忆上下文，memory_write 持久化洞察 — 全过程可见。</em>
</p>

## 工作原理

Tool Calling 实现了一个完整的 LLM 调用循环。Agent 不是一次性回复，而是"思考—行动—观察—再思考"的循环：

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  用户消息                                             │
│     ↓                                                │
│  LLM 推理：需要工具吗？                                │
│     │                                                │
│     ├─ 否 → 直接生成回复 → 发送给用户                   │
│     │                                                │
│     └─ 是 → 生成工具调用请求                           │
│              ↓                                       │
│           执行工具（可能多个）                           │
│              ↓                                       │
│           工具结果回注到上下文                           │
│              ↓                                       │
│           LLM 再次推理（可能再次调用工具）                │
│              ↓                                       │
│           最终回复                                     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

::: info 透明可见
整个过程对用户完全透明——聊天界面实时显示 Agent 正在调用哪个工具、传入了什么参数、返回了什么结果。不是黑箱。
:::

## 7 个内置工具详解

### 1. `web_search` — 网络搜索

Agent 可以搜索互联网获取实时信息。

| 属性 | 说明 |
|------|------|
| 引擎数量 | 6 个 |
| 引擎列表 | auto / DuckDuckGo / Brave / Kimi / Perplexity / Grok |
| 模式 | `auto` 模式自动选择可用引擎 |
| 故障切换 | 一个引擎失败自动尝试下一个 |

**使用场景**：

```
你：@代码助手 Node.js 22 有什么新特性？
代码助手：[调用 web_search: "Node.js 22 new features"] → 获取搜索结果 → 整理回复
```

### 2. `rag_query` — 知识库检索

从你上传的文档中检索相关信息。

| 属性 | 说明 |
|------|------|
| 检索方式 | BM25 + 向量混合检索 |
| 排序 | RRF 融合 + LLM 重排序 |
| 分块 | 200 字小块 + 800 字大块 |

**使用场景**：

```
你：@代码助手 我们的 API 认证方式是什么？
代码助手：[调用 rag_query: "API 认证方式"] → 从你上传的 API 文档中检索 → 精准回答
```

详见 [RAG 知识库](/features/rag)。

### 3. `memory_write` — 写入持久记忆

Agent 主动把重要信息写入持久记忆。

| 属性 | 说明 |
|------|------|
| 记忆类型 | semantic / episodic / procedural |
| 存储方式 | embedding + SQLite |
| 去重 | embedding 相似度去重，防止重复存储 |

**使用场景**：

```
你：我是后端开发，主要用 Python，公司用 AWS
代码助手：[调用 memory_write: type="semantic", content="用户是后端开发，主要用 Python，公司用 AWS"]
→ 下次对话时自动记住这些偏好
```

### 4. `memory_search` — 搜索记忆

检索 Agent 的持久记忆。

**使用场景**：

```
你：我上次让你帮我查的那个部署方案是什么来着？
代码助手：[调用 memory_search: "部署方案"] → 找到之前的记忆 → 回忆并回答
```

详见 [Agent 持久记忆](/features/agent-memory)。

### 5. `call_agent` — 跨 Agent 调用

一个 Agent 可以调用另一个 Agent 完成子任务。

| 属性 | 说明 |
|------|------|
| 嵌套保护 | 最多 3 层（A→B→C 允许，A→B→C→D 拒绝） |
| 调用方式 | 指定目标 Agent ID + 消息内容 |
| 返回值 | 被调用 Agent 的完整回复 |

**使用场景**：

```
你：@代码助手 帮我写一个 README 的英文版
代码助手：好的，我先写中文版，然后调用翻译官翻译。
  [调用 call_agent: agent="translator", message="请把以下 README 翻译成英文：..."]
翻译官：[返回英文翻译]
代码助手：这是完整的英文 README：...
```

::: warning 嵌套保护
3 层嵌套限制是为了防止 Agent 之间无限递归调用（A 调 B、B 调 A、A 又调 B...）。
:::

### 6. `manage_channel` — 渠道管理

管理外部平台连接器——让 Agent 能接入飞书、钉钉等平台。

| 操作 | 说明 |
|------|------|
| 创建连接器 | 配置平台类型和认证信息 |
| 启动 | 开始监听外部平台消息 |
| 停止 | 暂停监听 |

**支持的平台**：飞书（Lark）/ 钉钉 / 企微 / Telegram

### 7. `manage_schedule` — 定时任务

让 Agent 按 Cron 表达式定期执行任务。

| 属性 | 说明 |
|------|------|
| 语法 | 标准 Cron 表达式 |
| 示例 | `0 9 * * 1` = 每周一上午 9 点 |
| 能力 | 创建 / 删除 / 列出定时任务 |

**使用场景**：

```
你：@虾饺管家 每天早上 9 点给我一份新闻摘要
虾饺管家：[调用 manage_schedule: cron="0 9 * * *", task="新闻摘要"]
→ 每天 9 点自动触发，搜索新闻并发送摘要
```

## 工具权限配置

每个 Agent 可以独立配置允许使用的工具：

```json
{
  "id": "coder",
  "name": "代码助手",
  "tools": {
    "allow": ["web_search", "memory_write", "memory_search", "rag_query"]
  }
}
```

::: tip 最佳实践
- **虾饺管家**：开放所有工具（系统管理需要）
- **创作类 Agent**（小说家/编辑）：只开 memory，避免搜索干扰创作
- **技术类 Agent**（代码助手）：开 web_search + rag_query + memory
- **翻译类 Agent**：开 web_search（查术语）+ memory
:::

## 与其他平台 Tool Calling 的对比

|  | 虾饺 | Dify | Coze |
|--|------|------|------|
| 内置工具 | 7 个 | 10+ | 100+ 插件 |
| 自定义工具 | 通过 MCP 协议扩展 | 代码节点 | 插件开发 |
| 工具调用可见性 | ✅ 实时显示调用过程 | ✅ | 部分可见 |
| 跨 Agent 调用 | ✅ `call_agent` | ❌ | ❌ |
| 权限控制 | ✅ 按 Agent 配置 | ✅ | ✅ |

虾饺的工具数量不如 Coze 多，但胜在**跨 Agent 调用**和**完全透明的调用过程**。

## 工具调用的实际输出

以下是虾饺 Web 界面中 Tool Calling 的真实展示效果：

```
你：@代码助手 最新的 Bun 和 Node.js 性能对比数据

代码助手：让我搜索最新的对比数据。

  🔧 正在调用 web_search...
  ├── 查询: "Bun vs Node.js performance benchmark 2026"
  ├── 引擎: Google
  └── ✅ 找到 8 条结果

根据最新的基准测试数据（2026 年 3 月）：

| 指标 | Node.js 22 | Bun 1.x |
|------|-----------|---------|
| HTTP 请求/秒 | ~45,000 | ~78,000 |
| 启动时间 | ~50ms | ~8ms |
| 内存 (Hello World) | ~40MB | ~20MB |
| npm install 速度 | 1x | ~3x |

注意：实际性能取决于工作负载类型。Node.js 在长时间运行的服务中...

  🧠 正在写入记忆...
  └── ✅ 已记住: "用户关注 Bun vs Node.js 性能对比"
```

每个工具调用都在聊天界面实时显示进度，用户可以清晰看到 Agent 的"思考过程"。

## 自定义工具开发

想添加自己的工具？只需在 `server/services/tools.js` 中注册：

```javascript
my_tool: {
  description: "查询公司内部系统",
  parameters: {
    type: "object",
    properties: {
      system: { type: "string", enum: ["crm", "erp", "jira"] },
      query: { type: "string", description: "查询内容" }
    },
    required: ["system", "query"]
  },
  handler: async ({ system, query }) => {
    const result = await internalAPI.query(system, query);
    return { data: result };
  }
}
```

然后在 Agent 配置中启用这个工具。LLM 会根据工具的 `description` 和 `parameters` 自动判断何时调用。

## 下一步

- [Agent 持久记忆](/features/agent-memory) — memory_write 和 memory_search 的完整机制
- [RAG 知识库](/features/rag) — rag_query 的三阶段检索管线
- [协作流](/features/collaboration-flow) — 不用手动 @mention，让 Agent 自动接力
- [安全与隐私](/guide/security) — 数据安全与 API Key 保护
- [平台对比](/guide/comparison) — 虾饺 vs Dify vs Coze vs FastGPT
- [架构设计](/guide/architecture) — 了解 Tool Calling 循环的完整代码实现
- [模型配置](/guide/model-config) — 配置支持 Tool Calling 的模型
