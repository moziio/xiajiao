# Changelog — 虾饺 (Xiajiao)

## v1.0.0 (2026-03-18) — 首次开源发布

### 核心能力
- **Tool Calling** — 统一工具调用框架 + ToolRegistry + 5 个内置工具（web_search / rag_query / memory_write / memory_search / call_agent）
- **Agent 记忆** — 三分类持久记忆（语义 / 情景 / 程序性），embedding 去重，混合搜索，Prompt 自动注入
- **RAG 知识库** — BM25 + 向量混合检索，RRF 融合，LLM 重排序，分层分块
- **Agent 协作** — call_agent 跨 Agent 调用（3 层嵌套保护）+ 协作链 + 协作流可视化面板
- **工作流** — 条件分支（if/else）+ 错误处理（重试/跳过/回退）+ 人工审批节点
- **Web Search** — 6 种搜索引擎（auto/DuckDuckGo/Brave/Kimi/Perplexity/Grok），15 分钟缓存

### IM 体验
- 多 Agent 私聊 / 群聊 / @mention 路由
- 富媒体消息（结构化 Block 协议：文本、代码块、表格、图片、操作按钮）
- Markdown + 代码高亮 + Mermaid 图表渲染
- 消息搜索（FTS5）、编辑、删除、回复
- 频道草稿、置顶、未读计数
- 发送状态指示（sending / delivered / failed）
- 断线重连 + 增量补发 + 离线队列

### 多模型
- OpenAI / Anthropic / 通义千问 / GLM / Kimi / MiniMax 等主流模型
- LLM 直连模式（无需 Gateway）
- DashScope 图像生成

### 基础设施
- SQLite 持久化（node:sqlite, WAL, FTS5, 8 个迁移）
- RBAC 四级权限（owner / admin / member / guest）
- CSRF 防护 + 速率限制 + 错误脱敏
- 结构化日志 + Request ID
- Token 主动撤销
- PWA（Service Worker + 离线页）
- 中英双语 i18n
- 53 个单元测试（auth / tool-engine / workflow）
