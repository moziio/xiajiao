---
title: Agent 持久记忆 — 虾饺 IM
description: 三分类记忆系统——语义、情景、程序性记忆，Agent 越用越懂你。
---

# Agent 持久记忆

虾饺实现了一套**三分类持久记忆系统**，让 Agent 越用越懂你。

## 三分类记忆

| 类型 | 说明 | 示例 |
|------|------|------|
| **语义记忆** | 事实和知识 | "用户偏好 Python"、"公司用阿里云" |
| **情景记忆** | 对话事件 | "上次讨论了部署方案"、"用户提到想做微信接入" |
| **程序性记忆** | 行为模式 | "回复要简洁"、"代码示例用 TypeScript" |

## 工作流程

1. **写入**：Agent 在对话中通过 `memory_write` 工具主动写入记忆，带类型标签
2. **检索**：下次对话时，系统自动通过 embedding 相似度检索相关记忆
3. **注入**：检索结果注入到 Agent 的 System Prompt 中
4. **去重**：embedding 向量相似度去重，避免重复记忆

## 自动注入

当 Agent 配置了 `autoInjectMemory: true` 时，每次对话开始前系统会自动：

1. 对用户消息做 embedding
2. 在记忆库中做相似度搜索
3. 将匹配的记忆拼接到 System Prompt 的记忆区段

Agent 无需手动调用 `memory_search`，记忆自动生效。

## 下一步

- [RAG 知识库](/features/rag) — 文档级别的知识检索
- [Tool Calling](/features/tool-calling) — memory_write / memory_search 工具详情
