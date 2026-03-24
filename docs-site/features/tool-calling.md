---
title: Tool Calling — 虾饺 IM
description: 7 个内置工具，Agent 不只聊天，还能搜索、记忆、调用其他 Agent、管理渠道和定时任务。
---

# Tool Calling（工具调用）

Agent 不只聊天——它们能**动手做事**。虾饺提供 7 个内置工具，并支持扩展。

<p align="center">
  <img src="/images/tool-calling.png" alt="Tool Calling 实时调用" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>

## 内置工具

| 工具 | 能力 |
|------|------|
| `web_search` | 网络搜索（6 引擎：auto / DuckDuckGo / Brave / Kimi / Perplexity / Grok） |
| `rag_query` | 知识库语义检索 |
| `memory_write` | 写入持久记忆 |
| `memory_search` | 搜索历史记忆 |
| `call_agent` | 调用其他 Agent（3 层嵌套保护） |
| `manage_channel` | 创建、启停外部平台连接器（飞书 / 钉钉 / 企微 / Telegram） |
| `manage_schedule` | 创建和管理 Cron 定时任务 |

## 工作原理

Tool Calling 实现了一个完整的 LLM 调用循环：

```
用户消息 → LLM 推理 → 判断是否需要工具 → 调用工具 → 结果回注 → LLM 再次推理 → 最终回复
```

整个过程对用户透明：聊天界面会实时显示 Agent 正在调用哪个工具、传入了什么参数、返回了什么结果。

## 工具权限

每个 Agent 可以独立配置允许使用哪些工具。在 Agent 设置中的 `tools.allow` 字段控制：

```json
{
  "tools": {
    "allow": ["web_search", "memory_write", "memory_search"]
  }
}
```

## 跨 Agent 调用

`call_agent` 工具允许一个 Agent 调用另一个 Agent 完成子任务。内置 3 层嵌套保护，防止无限递归。

例如：代码助手收到一个需求，调用翻译官把中文需求翻译成英文，再自己写代码。

## 下一步

- [Agent 持久记忆](/features/agent-memory) — memory_write 和 memory_search 的详细机制
- [RAG 知识库](/features/rag) — rag_query 的检索原理
