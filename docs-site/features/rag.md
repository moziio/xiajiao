---
title: RAG 知识库 — 虾饺 IM
description: BM25 + 向量混合检索、RRF 融合、LLM 重排序，上传文档即可自动索引自动检索。
---

# RAG 知识库

虾饺内置生产级 RAG（Retrieval-Augmented Generation）系统。上传文档，Agent 自动索引、自动检索。

## 检索流程

```
用户提问 → BM25 关键词检索 + 向量语义检索 → RRF 融合排序 → LLM 重排序 → 注入上下文 → Agent 回答
```

## 核心特性

### 混合检索

同时使用两种检索策略：

- **BM25**：基于关键词的传统检索，擅长精确匹配
- **向量检索**：基于 embedding 的语义检索，擅长理解意图

两者结合，兼顾精确性和语义理解。

### RRF 融合

使用 Reciprocal Rank Fusion（互惠排名融合）将两种检索结果合并排序，比简单拼接效果更好。

### LLM 重排序

初步检索后，用 LLM 对候选结果做二次排序，进一步提升相关性。

### 分层分块

文档切片采用分层策略：

- **小块**（200 字）：用于精确检索
- **大块**（800 字）：用于上下文理解

检索命中小块后，自动扩展到对应的大块，确保 Agent 获得足够的上下文。

## 支持的文档格式

- PDF（通过 pdf-parse 提取文本）
- TXT / Markdown
- 其他纯文本格式

## 使用方式

Agent 通过 `rag_query` 工具自动检索知识库，也可以在对话中主动触发。

## 下一步

- [Agent 持久记忆](/features/agent-memory) — 个性化记忆系统
- [协作流](/features/collaboration-flow) — 多 Agent 自动协作
