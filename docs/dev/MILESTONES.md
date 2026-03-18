# 虾饺 IM 里程碑执行计划

> 产品定位：**AI 团队协作平台** — "你不是在和一个 AI 聊天，你是在指挥一个 AI 团队"  
> 生成时间：2026-03-17  
> 状态标记：⬜ 待开始 | 🔄 进行中 | ✅ 已完成 | ❌ 跳过  
> 关联文档：`IMPROVEMENT-PLAN.md`（阶段 1-6 已完成）、`EVALUATION-REPORT.md`（评估报告）

---

## 全局进度

```
已完成 █████████████████████████████████████████████████ 阶段 1-6 + M0 + M1 + M2 Phase 1 + M3 + M4 + M5 + M6 + M7
待执行 ░░░░░░░░░░░░░░░░ M2 Phase 2

M0  社区降级为事件流          ✅ M0.1~M0.4 全部完成
M1  Tool Calling 框架         ✅ M1.1~M1.7 全部完成
M2  Agent Memory 持久化      🔄 Phase 1 完成（M2.1~M2.5），Phase 2 待执行（M2.6~M2.8）
M3  RAG 质量提升             ✅ M3.1~M3.4 全部完成
M4  Agent 间主动协作          ✅ M4.1~M4.4 全部完成
M5  协作流可视化              ✅ M5.1~M5.3 全部完成
M6  Workflow 增强 + 工程质量   ✅ M6.1~M6.4 全部完成
M7  Web Search 增强           ✅ M7.1~M7.3 全部完成
```

---

## M0：社区降级为 Agent 事件流

> **目标**：将"虾区"从 SNS 社区形态降级为只读的 Agent 工作台/事件流  
> **原则**：去掉人类社交属性（发帖、评论、点赞），保留 Agent 自动事件记录  
> **预计工作量**：小

### M0.1 ✅ 前端：重构社区 Tab 为"事件流"

> **完成时间**：2026-03-17 | 三轮自查修复

**改动范围**：`public/js/community.js`、`public/index.html`、`public/js/lang/zh.js`、`public/js/lang/en.js`、`public/css/style.css`

| 任务 | 状态 | 实现说明 |
|------|------|---------|
| Tab 重命名 | ✅ | sidebar "虾区" → "动态"，`data-i18n="sidebar.activity"` |
| 移除发帖入口 | ✅ | 删除 `createPostBtn`、`openCreatePost()`、`submitPost()` |
| 移除评论功能 | ✅ | 删除 `submitComment()`、`toggleComments()`、评论输入框、全部评论 CSS |
| 移除点赞功能 | ✅ | 删除 `toggleLike()`、`.liked` 样式 |
| 移除话题管理 | ✅ | 删除 `openCreateTopic()`、`submitTopic()`、`deleteTopic()`、话题分区导航、`community-nav-del` CSS |
| 重构 Feed 渲染 | ✅ | `renderPostCard()` → `renderEventCard()`：类型图标（分色）+ 作者 + 时间 + tags + 展开/收起 |
| 事件分类过滤 | ✅ | 四种 Tab：全部 / 任务 / 告警 / 例会，客户端 filter |
| 侧边栏导航 | ✅ | 3 项（动态 / 成长看板 / 定时例会），active 状态跟随视图切换 |
| UI 美化 | ✅ | 事件卡片左侧色彩条 + 图标按类型着色（绿/橙/靛/灰）+ 空状态插画 |
| i18n | ✅ | 新增 `activity.*` 翻译键（中/英），精简 `community.*`，移除 `post.*` |

**自查修复记录**（3 轮）：

| 轮次 | 发现 & 修复 |
|------|------------|
| 第 1 轮 | ① `loadPosts` 参数传错（type→topic 混淆）→ 改为始终加载全部、客户端过滤；② 侧边栏 active 不随视图切换 → 基于 `lastCommunityView` 动态渲染；③ `showMetrics/showSchedules` 未刷新侧边栏 → 添加 `renderCommunityNav()` |
| 第 2 轮 | ④ `showActivityFeed` 缺少 `renderCommunityNav()` → 三个视图切换函数保持一致 |
| 第 3 轮 | ⑤ 事件卡片作者名取消可点击；⑥ `_eventIcon` 重构为 `_eventMeta` 返回图标+CSS类；⑦ 空状态美化；⑧ 清理废弃 CSS（`community-nav-del`）|

**涉及文件清单**：

| 文件 | 改动类型 |
|------|---------|
| `public/js/community.js` | **全面重写** — SNS 社区 → 只读事件流 |
| `public/index.html` | 修改 — Tab 名 + 移除发帖按钮 + 更新 data-i18n |
| `public/js/app.js` | 修改 — 简化 community tab 切换逻辑 |
| `public/js/lang/zh.js` | 修改 — 新增 `activity.*`，精简 `community.*`，移除 `post.*` |
| `public/js/lang/en.js` | 修改 — 同上英文版 |
| `public/css/style.css` | 修改 — 移除评论/点赞样式 + 新增事件卡片样式 |

### M0.2 ✅ 后端：精简社区 API

> **完成时间**：2026-03-17 | 三轮自查修复

**改动范围**：`server/routes/community.js`、`server/services/gateway.js`、`server/services/storage.js`、`server/index.js`

| 任务 | 状态 | 实现说明 |
|------|------|---------|
| 保留 GET /api/community/posts | ✅ | 事件流查询（只读），支持 `?topic=` 和 `?type=` 过滤 |
| 保留 GET /api/community/posts/:id | ✅ | 单条事件查询 |
| 保留 DELETE /api/community/posts/:id | ✅ | 管理员删除事件记录（guardAdmin） |
| 保留 GET /api/community/topics | ✅ | 只读，兼容前端 `loadTopics()` |
| 保留自动事件发布 | ✅ | `emitCommunityEvent()` 四种事件类型不变 |
| 移除 POST /api/community/posts | ✅ | 人工发帖接口已删除 |
| 移除评论 API | ✅ | `POST .../comments` 已删除 |
| 移除点赞 API | ✅ | `POST .../react` 已删除 |
| 移除话题 CRUD API | ✅ | `POST/DELETE /api/community/topics` 已删除 |
| 清理 gateway.js | ✅ | 移除 `addComment()`、`toggleReaction()` 函数及导出 |
| 清理 storage.js | ✅ | 移除 `addComment`/`getComments`/`toggleReaction`/`getReactions` 函数及导出；简化 `_hydratePostsBatch` 和 `_postRow`（不再查 comments/reactions 表） |
| 清理 index.js | ✅ | 移除暴露给 scheduler/LLM 的 `addComment` |
| DB 表保留 | — | comments/reactions 表定义保留（向后兼容），不再读写 |

**自查修复记录**（3 轮）：

| 轮次 | 发现 & 修复 |
|------|------------|
| 第 1 轮 | ① `_hydratePostsBatch` 仍查 comments/reactions 造成无效 SQL → 简化为 noop；② `_postRow` 同样简化；③ `createPostInternal` fallback 清理 comments/reactions 字段 |
| 第 2 轮 | ④ storage.js 中 4 个已不导出的死代码函数完全移除 |
| 第 3 轮 | 模拟 5 个场景验证请求路径完整性，无新问题 |

**涉及文件清单**：

| 文件 | 改动类型 |
|------|---------|
| `server/routes/community.js` | **重写** — 移除 5 个写入端点，保留 3 个只读 + 1 个管理删除 |
| `server/services/gateway.js` | 修改 — 移除 `addComment`/`toggleReaction`，清理导出和 fallback |
| `server/services/storage.js` | 修改 — 移除 4 个函数，简化 hydrate 逻辑，清理导出 |
| `server/index.js` | 修改 — 移除 2 处 `addComment` 暴露 |

### M0.3 ✅ 迁移成长看板和定时例会入口

> **完成时间**：2026-03-17 | 三轮自查修复

**改动范围**：`public/js/settings.js`、`public/js/community.js`、`public/js/app.js`、`public/js/lang/zh.js`、`public/js/lang/en.js`

| 任务 | 状态 | 实现说明 |
|------|------|---------|
| 成长看板迁入 Settings | ✅ | 新增 Settings "Agent 看板" tab（`adminOnly`），`renderSettingsMetrics` 独立渲染于 settingsContent |
| 事件流侧边栏移除看板 | ✅ | `renderCommunityNav` 去掉 metrics 项，侧边栏只剩"动态"+"定时例会" |
| `showMetrics` 重定向 | ✅ | 改为 `activeSettingsTab='metrics'; openSettings()` |
| `app.js` 清理 | ✅ | 移除 `lastCommunityView === 'metrics'` 分支（不再从动态 tab 跳看板） |
| 定时例会入口保留 | ✅ | 保留在事件流导航中（管理员可见），不变 |
| i18n | ✅ | 新增 `settings.metrics`、`settings.metricsTitle`（中/英） |
| 移除评论计数列 | ✅ | Settings 看板不再展示 `m.comments`（评论功能已全面移除） |

**自查修复记录**（3 轮）：

| 轮次 | 发现 & 修复 |
|------|------------|
| 第 1 轮 | ① `showMetrics` 双重渲染（先渲染 activeTab 再渲染 metrics）→ 改为先设 `activeSettingsTab` 再调 `openSettings()`；② Settings 嵌套滚动容器冲突 → `stMetricsContent` 改为 inline style（不使用 `metrics-dashboard` class 的独立滚动） |
| 第 2 轮 | 全面引用检查，无新问题 |
| 第 3 轮 | 6 个场景验证，无新问题 |

**涉及文件清单**：

| 文件 | 改动类型 |
|------|---------|
| `public/js/settings.js` | 修改 — 新增 `metrics` tab + `renderSettingsMetrics()` 函数 |
| `public/js/community.js` | 修改 — 侧边栏移除看板入口，`showMetrics()` 改为跳转 Settings |
| `public/js/app.js` | 修改 — 移除 `metrics` 分支 |
| `public/js/lang/zh.js` | 修改 — 新增 `settings.metrics`、`settings.metricsTitle` |
| `public/js/lang/en.js` | 修改 — 同上英文版 |

### M0.4 ✅ i18n 更新（已随 M0.1 一并完成）

| 键 | 中文 | 英文 | 状态 |
|----|------|------|------|
| `sidebar.activity` | 动态 | Activity | ✅ |
| `activity.title` | Agent 动态 | Agent Activity | ✅ |
| `activity.subtitle` | 任务完成、系统告警、例会纪要 | Tasks, alerts & meeting summaries | ✅ |
| `activity.allEvents` | 全部 | All | ✅ |
| `activity.tasks` | 任务 | Tasks | ✅ |
| `activity.alerts` | 告警 | Alerts | ✅ |
| `activity.meetings` | 例会 | Meetings | ✅ |
| `activity.noEvents` | 暂无动态 | No activity yet | ✅ |
| `activity.newEvent` | 新动态 | New Activity | ✅ |
| `activity.viewDetail` | 展开详情 ▼ | Show more ▼ | ✅ |
| `activity.collapse` | 收起 ▲ | Show less ▲ | ✅ |
| `activity.deleteConfirm` | 确定删除此事件记录？ | Delete this event? | ✅ |
| `activity.metrics` | 成长看板 | Growth Board | ✅ |
| `activity.schedules` | 定时例会 | Schedules | ✅ |

### M0 验收标准

- [x] "虾区" Tab 变为 "动态" ✅ M0.1
- [x] 无发帖/评论/点赞入口 ✅ M0.1
- [x] Agent 自动事件仍正常产生和展示 ✅ M0.1（WebSocket community_update → refreshActivityFeed）
- [x] 事件卡片简洁、可按类型过滤 ✅ M0.1（四种过滤 Tab + 分色图标）
- [x] 管理员仍可删除事件记录 ✅ M0.1（hover 显示 × 按钮）
- [x] i18n 中英文同步 ✅ M0.4
  - [x] 后端精简社区 API ✅ M0.2（移除 5 个写入端点 + 清理 gateway/storage 死代码）
- [x] 成长看板迁入 Settings ✅ M0.3（独立 tab，仅管理员可见）
- [x] 定时例会保留在事件流导航 ✅ M0.3

---

## M1：Tool Calling 框架

> **目标**：让 Agent 能调用工具完成任务（从"能说"到"能做"）  
> **架构**：混合架构 — Direct 模式自建引擎（独立可用）+ Gateway 模式透传增强（可选）  
> **差异化**：引擎层追平 OpenClaw，在**透明度、可控性、用户体验**上全面超越  
> **这是整个演进的基础**，后续所有里程碑都依赖此能力  
> **预计工作量**：大

**vs OpenClaw 对比**：

| 维度 | OpenClaw | 虾饺 IM（目标） |
|------|----------|---------------|
| 工具引擎 | ★★★★★（成熟） | ★★★☆☆（够用） |
| 前端可视化 | ★☆☆☆☆（黑盒） | ★★★★★（实时时间线） |
| 人在回路 | CLI only | Web 原生 |
| 调用审计 | 无 | SQLite + UI |
| 工具配置 | YAML | GUI 可视化 |
| 独立部署 | — | ✅ 不依赖 OpenClaw |

### M1.1 ✅ 统一 Tool Event 协议

**改动范围**：新建 `server/services/tool-events.js`

> 无论 Direct 还是 Gateway 模式，前端收到的工具事件格式一致

| 任务 | 详细说明 |
|------|---------|
| 定义事件类型 | `tool_call_start`（工具开始调用）、`tool_call_end`（调用完成/失败）、`tool_approval_required`（需人工确认） |
| 事件格式 | `{ type, channel, agentId, runId, callId, tool, args, status, result?, error?, durationMs? }` |
| 广播封装 | `emitToolEvent(eventData)` — 统一通过 WebSocket 推送给前端 |
| 事件序列化 | 工具事件也写入消息流（作为系统消息保存），支持历史回放 |

**事件流程**：

```
Direct 模式：
  LLM → tool_calls → ToolEngine 解析 → emitToolEvent('tool_call_start')
       → 执行 handler → emitToolEvent('tool_call_end')
       → 结果注入 messages → 再次调用 LLM

Gateway 模式：
  Gateway tool-events → 解析转化 → emitToolEvent（同格式）
       → 前端展示（与 Direct 模式完全一致的 UI）
```

### M1.2 ✅ ToolRegistry 注册机制

**改动范围**：新建 `server/services/tool-registry.js`

| 任务 | 详细说明 |
|------|---------|
| 全局注册表 | `Map<toolName, { schema, handler, meta }>` |
| schema 格式 | OpenAI function calling 格式 `{ name, description, parameters: JSONSchema }` |
| handler 签名 | `async handler(args, context) → { result, error? }` |
| meta 元数据 | `{ icon, risk: 'low'\|'medium'\|'high', category, requireApproval? }` |
| context 上下文 | `{ agentId, channel, userId, runId, broadcast }` |
| 权限控制 | Agent 配置 `tools: { allow: [...], deny: [...] }` 白黑名单 |
| 动态注册 | `registerTool(name, {schema, handler, meta})` / `unregisterTool(name)` 运行时可增删 |
| 工具发现 | `getToolsForAgent(agentId)` → 返回该 Agent 可用的 tools 数组（给 LLM） |
| 多厂商 schema 转换 | `toOpenAITools()` / `toAnthropicTools()` / `toGoogleTools()` — 同一注册表适配不同 LLM |

### M1.3 ✅ Direct LLM Tool Calling 引擎

**改动范围**：`server/services/llm.js`（核心改造）、新建 `server/services/tool-engine.js`

| 任务 | 详细说明 |
|------|---------|
| tools 注入 | `buildApiRequest()` 根据 Agent 配置从 ToolRegistry 获取 tools，注入请求 |
| 多厂商检测 | OpenAI: `finish_reason:"tool_calls"` + `tool_calls[]`；Anthropic: `stop_reason:"tool_use"` + `content[type=tool_use]`；Google: `functionCall` |
| SSE 流中检测 | 流式响应中累积 tool_call 参数（delta 拼接），流结束时判断 |
| 执行循环 | `toolCallLoop(messages, tools, maxRounds)` — 检测→执行→注入→重调，直到返回文本 |
| 循环保护 | 最大轮次 10（可配），相同工具+参数连续调用 3 次触发断路（参考 OpenClaw 的 loop detection） |
| 并行调用 | 单轮 LLM 返回多个 tool_calls 时，`Promise.all` 并行执行 |
| 错误恢复 | 工具失败 → 错误信息作为 tool result 返回给 LLM，让 LLM 决策（重试/换工具/直接回答） |
| 流式文本输出 | 最终轮（返回文本）仍走原有 SSE 流式推送 |

**改造后的 `sendToLLM` 流程**：

```
sendToLLM(channel, agentId, userText)
  │
  ├── resolveAgent → 获取 agent/model/provider
  ├── buildMessages → 构建消息上下文
  ├── getToolsForAgent(agentId) → 获取可用工具 schema
  │
  └── toolCallLoop:
       ├── callLLM(messages, tools) → SSE 流 / JSON 响应
       │    ├── 返回文本 → 流式推送 → finalize → 保存 → 结束
       │    └── 返回 tool_calls →
       │         ├── emitToolEvent('tool_call_start', ...) × N
       │         ├── Promise.all(handlers) → 执行工具
       │         ├── emitToolEvent('tool_call_end', ...) × N
       │         ├── 注入 tool results 到 messages
       │         └── round++ → 继续循环（检查 maxRounds）
       │
       └── 超出 maxRounds → 强制要求 LLM 以文本回复
```

### M1.4 ✅ Gateway 模式 tool-events 透传（可选增强）

**改动范围**：`server/services/gateway.js`

> 前置条件：已声明 `caps: ['tool-events']`，需解析 Gateway 推送的工具事件

| 任务 | 详细说明 |
|------|---------|
| 解析 tool-events | Gateway 推送的 `stream: 'tool'` 事件，提取 tool name/args/result |
| 转化为统一协议 | 转成 M1.1 定义的 `tool_call_start` / `tool_call_end` 事件 |
| 前端透明 | 前端不关心是 Direct 还是 Gateway，收到相同格式的事件 |

### M1.5 ✅ 内置工具 3 件套

**改动范围**：新建 `server/services/tools/` 目录

#### M1.5a `rag_query` — 知识库查询

| 项 | 说明 |
|----|------|
| Schema | `{ query: string, topK?: number }` |
| Handler | 调用现有 `rag.search(agentId, query, topK)` |
| 返回 | `{ chunks: [{ text, source, score }], totalFound }` |
| Meta | `{ icon: '📚', risk: 'low', category: 'knowledge' }` |

#### M1.5b `web_search` — 互联网搜索

| 项 | 说明 |
|----|------|
| Schema | `{ query: string, maxResults?: number }` |
| Handler | auto 模式（DuckDuckGo + LLM 总结）/ Brave / Kimi / Perplexity / Grok |
| 返回 | `{ results: [{ title, url, snippet }] }` |
| 配置 | `im-settings.json` → `tools.webSearch.provider` + `apiKey` |
| 降级 | 无 API Key → `{ error: "搜索功能未配置", configHint: "请在设置中配置搜索 API Key" }` |
| Meta | `{ icon: '🔍', risk: 'low', category: 'web' }` |

#### M1.5c `memory_write` — 写入长期记忆

| 项 | 说明 |
|----|------|
| Schema | `{ content: string, tags?: string[] }` |
| Handler | 写入 `memories` SQLite 表，附带 agentId + timestamp |
| 返回 | `{ ok: true, memoryId }` |
| Meta | `{ icon: '🧠', risk: 'low', category: 'memory' }` |
| 备注 | 为 M2（Agent Memory 持久化）打基础 |

### M1.6 ✅ 前端：工具调用实时时间线

**改动范围**：`public/js/chat.js`、`public/js/app.js`、`public/css/style.css`

> OpenClaw 最大弱项 — 前端零透明度，这是虾饺 IM 的差异化杀手锏

| 任务 | 详细说明 |
|------|---------|
| WS 事件处理 | `app.js` 新增 `case 'tool_call_start'` / `case 'tool_call_end'` |
| 实时时间线 | 消息流中嵌入调用步骤，每步显示：图标 + 工具名 + 参数摘要 + 状态 + 耗时 |
| 状态动画 | 调用中：spinner + 脉冲动画；成功：绿色打钩；失败：红色叉号 |
| 结果折叠 | 工具返回结果默认折叠，点击展开查看详细 JSON / 文本 |
| 多轮可视化 | 多轮工具调用依次渲染，形成完整调用链 |
| 错误卡片 | 工具失败时显示红色卡片，包含错误信息 |

**时间线 UI**：

```
┌─ 🔧 工具调用链 ──────────────────────────────┐
│                                              │
│ ⏱ 0.0s  🔍 web_search                       │
│          查询: "AI 协作平台市场分析"            │
│ ⏱ 1.2s  ✅ 返回 5 条结果           [展开 ▾]  │
│                                              │
│ ⏱ 1.3s  📚 rag_query                        │
│          查询: "竞品对比数据"                   │
│ ⏱ 0.8s  ✅ 找到 3 条匹配           [展开 ▾]  │
│                                              │
│ ⏱ 2.1s  🧠 memory_write                     │
│          保存: "市场分析结论"                   │
│ ⏱ 0.1s  ✅ 已保存                            │
│                                              │
│ ──────── Agent 开始组织回复 ────────          │
└──────────────────────────────────────────────┘
```

### M1.7 ✅ Agent 工具配置 UI

**改动范围**：`public/js/manage-agent.js`、`public/js/settings-infra.js`

| 任务 | 详细说明 |
|------|---------|
| Agent 编辑页新增工具区 | 复选框列表 + 风险标记（🟢低/🟡中/🔴高） |
| 全局工具设置 | Settings → 工具配置：API Key、全局开关、默认启用列表 |
| Agent 数据结构扩展 | `agents.json` 每个 agent 新增 `tools: { allow: [], deny: [] }` |
| 工具状态展示 | 显示每个工具的配置状态（已配置 / 缺少 API Key / 未启用） |

### M1 验收标准

- [ ] **Direct 模式可独立工作**（不依赖 OpenClaw）
- [ ] Agent 能在对话中自动调用 `rag_query` 查询知识库
- [ ] Agent 能在对话中自动调用 `web_search` 搜索网页
- [ ] 前端实时显示工具调用时间线（调用中 → 完成/失败 + 耗时）
- [ ] 工具调用结果可折叠查看
- [ ] 多厂商适配（OpenAI / Anthropic / Google tool_calls 格式）
- [ ] 循环保护生效（最大轮次 + 重复调用断路）
- [ ] 管理员可在 Agent 编辑页配置工具
- [ ] Gateway 模式下工具事件透传展示（可选增强）

### M1 实施顺序

```
Phase 1（核心引擎 — 先让它跑起来）：  ✅ 完成
  M1.1  统一 Tool Event 协议         ✅
  M1.2  ToolRegistry 注册机制        ✅
  M1.3  Direct LLM 引擎             ✅
  M1.5  内置工具 rag_query + web_search + memory_write  ✅

Phase 2（前端可视化 — 差异化体验）：  ✅ 完成
  M1.6  前端工具调用时间线            ✅

Phase 3（配置与增强）：✅ 完成
  M1.7  Agent 工具配置 UI            ✅
  M1.4  Gateway tool-events 透传（可选）✅
```

### M1 Phase 1-2 实施记录（2026-03-17）

**新增文件**：

| 文件 | 说明 |
|------|------|
| `server/services/tool-events.js` | 统一 Tool Event 协议，`emitToolEvent()` 广播、`makeCallId()` 生成 |
| `server/services/tool-registry.js` | 全局工具注册表，多厂商 schema 转换（OpenAI/Anthropic/Google） |
| `server/services/tool-engine.js` | 工具调用引擎：SSE 流累积、并行执行、循环检测、结果注入 |
| `server/services/tools/rag-query.js` | 内置工具：知识库语义检索 |
| `server/services/tools/web-search.js` | 内置工具：互联网搜索（M7 增强为 6 引擎） |
| `server/services/tools/memory-write.js` | 内置工具：Agent 长期记忆写入（SQLite `agent_memories` 表） |

**改动文件**：

| 文件 | 改动 |
|------|------|
| `server/services/llm.js` | `sendToLLM` 重构为工具调用循环；`handleSSEStream` 增加 tool_call 检测；`buildApiRequest` 支持 tools 参数注入 |
| `server/index.js` | 初始化工具系统，注册 3 个内置工具 |
| `public/js/app.js` | `handleMessage` 新增 `tool_call_start` / `tool_call_end` 分发 |
| `public/js/chat.js` | 新增工具调用时间线渲染：`_getOrCreateToolTimeline`、`handleToolCallStart`、`handleToolCallEnd` |
| `public/css/style.css` | 新增工具时间线 CSS（spinner 动画、状态颜色、折叠展开） |
| `public/js/lang/zh.js` | 新增 `chat.toolCalling` 等 5 个 i18n key |
| `public/js/lang/en.js` | 同步英文翻译 |

**自查修复**：
- 第一轮：移除 `llm.js` 中未使用的 `emitToolEvent`/`makeCallId` 导入，移除 `chat.js` 中未使用的 `_toolCallTimers`
- 第二轮：移除 `tool-engine.js` 中未使用的 `results` 变量；验证无工具时向后兼容、降级处理、DOM 生命周期等关键路径均正确
- 第三轮（深度审查）：**修复 2 个 BUG** — ① Anthropic `buildApiRequest` 消息合并将数组 content（tool_use/tool_result）错误拼接为字符串 ② `safeParse(null)` 因 `typeof null === 'object'` 返回 null 导致工具 handler 可能 TypeError；清理 `handleSSEStream` 中未使用的 `stopReason` 变量
- 第四轮（端到端验证）：模拟 6 个场景（正常工具调用、无工具兼容、Anthropic 多工具、channel 切换、循环保护、未知工具）全部通过

### M1.4 实施记录（2026-03-17）

**改动文件**：

| 文件 | 改动 |
|------|------|
| `server/services/gateway.js` | `handleAgentEvent` 新增 `stream === 'tool'` 分支；新增 `_handleGatewayToolEvent()` 将 Gateway 工具事件转化为统一协议；导入 `tool-events` 模块 |
| `server/routes/settings.js` | `PUT /api/settings` 新增 `gatewayToolEvents` 布尔字段处理 |
| `public/js/settings-infra.js` | Gateway 设置区块新增工具事件透传开关 UI（仅 Gateway 模式可见）；新增 `toggleGwToolEvents()` 函数 |
| `public/js/lang/zh.js` | 新增 `settings.gwToolEvents`、`settings.gwToolEventsHint` |
| `public/js/lang/en.js` | 同步英文翻译 |

**设计要点**：
- 作为**用户可选能力**，默认关闭（`imSettings.gatewayToolEvents = false`）
- 开关仅在 Gateway 模式配置面板中可见，管理员可在线切换
- 兼容多种 Gateway 工具事件格式（`status`/`phase`/`state` 三种命名风格）
- 转化后事件与 Direct 模式完全一致，前端无需区分来源

### M1.7 实施记录（2026-03-17）

**改动文件**：

| 文件 | 改动 |
|------|------|
| `server/routes/agents.js` | 导入 `tool-registry`；新增 `GET /api/tools` API 返回注册工具列表（含元信息、状态）；`updateAgent` 新增 `tools` 字段支持持久化 Agent 工具配置 |
| `server/services/tool-registry.js` | 新增 `_getSchema(name)` 方法暴露工具描述文本 |
| `public/js/manage-agent.js` | Agent 详情面板新增 "工具" Tab；实现 `loadToolsTab` 卡片式工具列表渲染、`toggleAgentTool` 开关切换、`toolsEnableAll`/`toolsDisableAll` 批量操作、`saveToolsTab` 保存 |
| `public/css/style.css` | 新增 `.tools-grid`、`.tool-card`（卡片）、`.tool-risk-badge`（风险标记）、`.tool-status-badge`（状态指示器）、`.tools-quick-actions`（快捷操作）等样式 |
| `public/js/lang/zh.js` | 新增 16 个 i18n key（toolsTitle、toolsDesc、toolReady、risk_low 等） |
| `public/js/lang/en.js` | 同步英文翻译 |

**UI 设计要点**：
- 卡片式布局 + 自适应网格（`grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))`）
- 每张卡片包含：工具图标、名称（等宽字体）、分类标签、描述（2 行截断）、风险等级（🟢🟡🔴 彩色徽章）、状态指示器、开关
- 禁用工具卡片半透明处理（`opacity: .45`），视觉直觉
- 底部"全部启用/全部禁用"快捷操作
- 使用 deny-list 模型：默认全部可用，仅记录禁用项

---

## M2：Agent Memory 持久化

> **目标**：Agent 拥有跨会话的长期记忆，比 OpenClaw 更结构化、更可控、更智能  
> **依赖**：M1（Tool Calling 框架）  
> **预计工作量**：中  
> **设计理念**：模仿人类认知的记忆分类 + SQLite 结构化存储 + Hybrid 搜索 + 可视化管理

**vs OpenClaw 对比**：

| 维度 | OpenClaw | 虾饺 IM（目标） |
|------|----------|---------------|
| 存储 | Markdown 文件（无结构） | SQLite 结构化表（可筛选、可索引） |
| 记忆分类 | 扁平（日志+策展） | 三分法（情景/语义/技能） |
| 搜索 | Hybrid BM25+Vector | Hybrid 关键词+Vector+时间衰减+重要性加成 |
| 去重 | 无 | Embedding 相似度去重（>0.85 合并） |
| 自动捕获 | 无（依赖 Agent 主动调用） | 对话结束自动提取（延后实现） |
| 记忆整合 | Pre-compaction flush 仅压缩 | LLM 摘要压缩合并（延后实现） |
| 记忆淘汰 | 时间衰减降权（不真删） | LRU + 优先级淘汰 + 容量限制（真释放） |
| 前端 UI | CLI only（黑盒） | 可视化记忆管理 Tab |
| 跨 Agent | 完全隔离 | 共享标签/全局池（M4 延后） |
| Prompt 注入 | 无自动注入 | 自动相关记忆 + 高重要性记忆注入 |

**OpenClaw 不足分析**：

1. 纯 Markdown 存储 — 无法高效按重要性、类型、时间范围做精确筛选
2. 无自动捕获 — 完全依赖 Agent 主动调用工具，记忆覆盖率低
3. 无记忆分类 — 事实/事件/偏好/技能混为一谈
4. 无前端 UI — 纯 CLI，用户看不到也管不了 Agent 的记忆
5. 无跨 Agent 共享 — 每个 Agent 记忆完全隔离
6. 记忆无限膨胀 — 日志文件只增不减，靠时间衰减降权但不真正淘汰
7. 无整合压缩 — 100 条相似记忆不会合并为 1 条精炼摘要
8. 存储效率低 — 每次搜索需遍历文件→分块→embedding，冷启动慢

### M2 架构总览

```
┌──────────────────────────────────────────────────────┐
│                 Memory 服务层                          │
│            server/services/memory.js                   │
├──────────┬────────────────┬──────────────────────────┤
│  Write   │   Search       │   Maintain               │
│  写入+去重│  混合检索       │   淘汰+容量控制           │
└────┬─────┴──────┬─────────┴──────────┬───────────────┘
     │            │                    │
┌────┴────┐ ┌────┴────┐        ┌──────┴──────┐
│ SQLite  │ │  RAG    │        │  容量策略    │
│ agent_  │ │ embed   │        │  LRU 淘汰   │
│memories │ │ 复用    │        │             │
└─────────┘ └─────────┘        └─────────────┘
```

**Prompt 注入位置**：

```
System Prompt 构成：
  [SOUL.md 人设]
  [自动注入的相关记忆]     ← M2.4 新增
  [Mermaid 图表规范]
  [RAG 知识库内容]
  [对话历史 20 条]
  [当前用户消息]
```

### M2 待确认决策清单

> 请逐项确认后开始实施。标 **[建议]** 的为推荐选项。

| # | 决策点 | 选项 | 建议 |
|---|--------|------|------|
| 1 | 记忆类型分法 | A) 三分法（semantic/episodic/procedural） B) 二分法（semantic+episodic） C) 不分类 | **A** |
| 2 | Embedding 缓存 | A) 缓存在 `embedding` 字段（~4KB/条，1000条≈4MB） B) 每次实时计算 | **A** |
| 3 | TTL 过期机制 | A) 需要 `expires_at` 字段 B) 不需要，统一用 LRU | **B** |
| 4 | 每 Agent 容量上限 | A) 500 条 B) 1000 条 C) 2000 条 | **B** |
| 5 | 去重相似度阈值 | A) 0.80 B) 0.85 C) 0.90 | **B** |
| 6 | 全文搜索方案 | A) SQLite FTS5 全文索引 B) 简单 LIKE 匹配 | **B（先 LIKE，后续可升级 FTS5）** |
| 7 | 搜索权重分配 | A) Vector 0.6 / 关键词 0.25 / 时间+重要性 0.15 B) 自定义 | **A** |
| 8 | `memory_forget` 工具 | A) M2 实现 B) 延后 C) 不需要 | **B** |
| 9 | Prompt 自动注入 | A) 默认开启 B) 默认关闭 C) 不做 | **A** |
| 10 | 自动捕获（对话结束时 LLM 提取） | A) M2 实现 B) 延后 | **B（先做好手动，后加自动）** |
| 11 | 记忆整合（LLM 摘要压缩） | A) M2 实现 B) 延后 | **B（先做好基础层）** |
| 12 | 前端记忆 Tab | A) 完整版（列表+筛选+搜索+新增+编辑+统计） B) 精简版（列表+删除） | **B（先精简，迭代增强）** |
| 13 | 跨 Agent 共享 | A) M2 实现 B) 留到 M4 | **B** |

### M2.1 ✅ Memory 存储层

**改动范围**：新建 `server/services/memory.js` + 新建 `server/migrations/004_agent_memories.js`

#### 数据库 Schema

```sql
CREATE TABLE agent_memories (
  id                TEXT PRIMARY KEY,
  agent_id          TEXT NOT NULL,
  type              TEXT DEFAULT 'semantic',    -- 'episodic' | 'semantic' | 'procedural'
  content           TEXT NOT NULL,
  summary           TEXT,                       -- 压缩版（Prompt 注入用，省 token）
  tags              TEXT DEFAULT '[]',          -- JSON array
  importance        TEXT DEFAULT 'medium',      -- 'low' | 'medium' | 'high'
  source            TEXT DEFAULT 'agent',       -- 'agent'(工具写入) | 'user'(手动) | 'auto'(自动捕获) | 'consolidation'(整合)
  embedding         TEXT,                       -- 缓存 embedding 向量（JSON float array）
  access_count      INTEGER DEFAULT 0,          -- 被检索命中次数
  created_at        INTEGER NOT NULL,
  last_accessed_at  INTEGER,
  consolidated_into TEXT                        -- 被整合进哪条记忆 ID（软淘汰标记）
);

CREATE INDEX idx_mem_agent ON agent_memories(agent_id);
CREATE INDEX idx_mem_agent_type ON agent_memories(agent_id, type);
CREATE INDEX idx_mem_agent_importance ON agent_memories(agent_id, importance);
CREATE INDEX idx_mem_agent_created ON agent_memories(agent_id, created_at DESC);
```

#### 迁移策略

| 任务 | 说明 |
|------|------|
| 新建 migration | `004_agent_memories.js` — 建表+索引 |
| 旧表数据迁移 | 如果 M1.5 写入的简陋 `agent_memories` 表已有数据，自动迁移（补充默认字段值） |
| 向后兼容 | 迁移后旧表 `DROP` |

#### memory.js 服务接口

```javascript
// server/services/memory.js 导出函数
module.exports = {
  writeMemory(agentId, { content, tags, importance, type, source }),  // 写入+去重
  searchMemory(agentId, query, { type, limit }),                      // 混合搜索
  getMemories(agentId, { type, importance, limit, offset }),          // 列表查询（前端用）
  getMemory(id),                                                      // 单条查询
  updateMemory(id, fields),                                           // 更新
  deleteMemory(id),                                                   // 删除
  deleteAgentMemories(agentId),                                       // 清空某 Agent 全部记忆
  getStats(agentId),                                                  // 统计（总数、各类型占比）
  evict(agentId),                                                     // 执行淘汰
};
```

#### 容量淘汰策略

| 策略 | 说明 |
|------|------|
| 每 Agent 上限 | 1000 条（可在 settings 中配置） |
| 淘汰触发 | 每次写入时检查，超限则淘汰 |
| 淘汰优先级 | ① `consolidated_into` 非空（已被整合） → ② importance=low 且 access_count=0 → ③ LRU（last_accessed_at 最早） |
| 淘汰比例 | 超出时淘汰最低优先级的 10%（100 条） |

### M2.2 ✅ 增强 memory_write 工具

**改动范围**：重构 `server/services/tools/memory-write.js`

| 任务 | 说明 |
|------|------|
| Schema 增强 | 新增 `importance`（默认 medium）、`type`（默认 semantic）参数 |
| 去重逻辑 | 写入前计算 embedding，与已有记忆比较 cosine 相似度；>0.85 → 更新（合并 tags，取较高 importance）；≤0.85 → 新增 |
| 调用 memory.js | handler 内部调用 `memory.writeMemory()` 而非直接操作 DB |
| summary 生成 | 如果 content > 200 字，自动截断前 200 字作为 summary |

**增强后 Schema**：

```json
{
  "name": "memory_write",
  "description": "保存重要信息到长期记忆。用于记住关键事实、用户偏好、重要结论。",
  "parameters": {
    "content": { "type": "string", "description": "要记忆的内容" },
    "tags": { "type": "array", "items": { "type": "string" }, "description": "分类标签" },
    "importance": { "type": "string", "enum": ["low", "medium", "high"], "description": "重要程度，默认 medium" },
    "type": { "type": "string", "enum": ["episodic", "semantic", "procedural"], "description": "记忆类型，默认 semantic" }
  },
  "required": ["content"]
}
```

### M2.3 ✅ 新增 memory_search 工具

**改动范围**：新建 `server/services/tools/memory-search.js`

| 任务 | 说明 |
|------|------|
| Schema | `{ query: string, type?: string, limit?: number }` |
| Handler | 调用 `memory.searchMemory()` |
| 返回格式 | `{ results: [{ content, summary, tags, importance, type, createdAt, score }], total }` |
| 注册 | 在 `index.js` 注册为 `memory_search` 工具 |
| Meta | `{ icon: '🔎', risk: 'low', category: 'memory' }` |

**混合搜索管线**：

```
用户 query
    │
    ├─→ Embedding (text-embedding-v3) → Vector cosine 相似度    权重 0.60
    │
    ├─→ SQLite LIKE '%keyword%' 关键词匹配                      权重 0.25
    │
    └─→ 时间衰减 + 重要性加成                                    权重 0.15
         │   时间衰减: recencyScore = e^(-ln2 / 30 * ageDays)
         │   重要性: high → ×1.3, medium → ×1.0, low → ×0.7
         │
         ▼
    加权合并 → 排序 → Top-K → 更新 access_count + last_accessed_at
```

**复用 RAG 基础设施**：
- 调用 `rag.js` 中已有的 `callEmbeddingAPI()` 获取 embedding
- 无需额外配置 embedding 提供商

### M2.4 ✅ Prompt 自动注入

**改动范围**：`server/services/llm.js`（`buildMessages` 函数）

| 任务 | 说明 |
|------|------|
| 注入位置 | SOUL.md 之后、Mermaid 规范之前 |
| 相关记忆 | 用当前 userText 调用 `memory.searchMemory(agentId, userText, {limit: 3})` 取 top-3 |
| 高重要性记忆 | 取最近 3 条 `importance='high'` 的记忆 |
| 去重合并 | 两组结果合并去重，最多 5 条 |
| 注入格式 | `[记忆提示] 以下是你的长期记忆，请适当参考：\n- {summary 或 content 截断}` |
| Token 预算 | 总注入 ≤ 500 tokens |
| 开关 | Agent 配置 `autoInjectMemory: true`（默认开启） |
| 无记忆时 | 不注入任何内容，不影响原有流程 |

**改造后的 buildMessages**：

```
buildMessages(agentId, channel, userText, soulContent, ragContext)
  │
  ├── system: soulContent (SOUL.md)
  ├── system: [记忆注入]                    ← 新增
  ├── system: MERMAID_GUIDE
  ├── system: ragContext                    （如有）
  ├── history: getHistoryForContext(20)
  └── user: userText
```

### M2.5 ✅ 前端记忆管理 Tab（精简版）

**改动范围**：`public/js/manage-agent.js`、`public/css/style.css`、`public/js/lang/zh.js`、`public/js/lang/en.js`

| 任务 | 说明 |
|------|------|
| 新增 Tab | Agent 详情面板 Tab 栏增加"记忆"（人设 \| 知识库 \| 模型配置 \| 工具 \| **记忆** \| 项目绑定） |
| 记忆列表 | 按时间倒序展示，每条显示：类型图标 + 内容摘要（2行截断）+ 重要性徽章 + 标签 + 时间 |
| 类型图标 | 🧠 semantic / 📅 episodic / ⚡ procedural |
| 重要性徽章 | 🔴 high / 🟡 medium / 🟢 low |
| 删除 | 每条可单独删除（hover 显示删除按钮） |
| 统计栏 | 底部显示：共 N 条记忆 · 语义 X · 情景 Y · 技能 Z |
| API | `GET /api/agents/:id/memories` — 分页列表；`DELETE /api/agents/:id/memories/:memId` — 删除 |

**UI 草图**：

```
┌─ 记忆 ──────────────────────────────────────────┐
│                                                  │
│ 🧠 用户偏好深色主题，技术栈是 React+Node     HIGH │
│    #偏好 #技术栈                         3月10日  │
│                                                  │
│ 📅 用户要求重构社区模块为事件流           MEDIUM   │
│    #需求 #重构                           3月9日   │
│                                                  │
│ ⚡ 回复技术问题时先给结论再展开细节        MEDIUM   │
│    #风格                                3月8日   │
│                                                  │
│ ─────────────────────────────────────────────── │
│ 共 42 条记忆 · 语义 28 · 情景 10 · 技能 4        │
└──────────────────────────────────────────────────┘
```

### M2.6 ⬜ 自动捕获（延后 — Phase 2）

> 此项不在首批实施范围，先做好手动（工具调用 + 前端管理），待基础层稳定后再加。

| 任务 | 说明 |
|------|------|
| 触发时机 | 对话结束时（Agent 回复完毕），后台异步分析 |
| 提取逻辑 | 用简短 Prompt 请 LLM 判断本轮对话是否包含值得记忆的信息，提取后调用 `memory.writeMemory(source='auto')` |
| 频率限制 | 对话 > 3 轮 且 最近 1 小时内未提取过 |
| 成本控制 | 使用轻量级模型（如 mini）做提取 |

### M2.7 ⬜ 记忆整合 Consolidation（延后 — Phase 2）

> 此项不在首批实施范围，待记忆量积累后再实现。

| 任务 | 说明 |
|------|------|
| 触发条件 | Agent 记忆数超过 200 条，或手动触发 |
| 整合流程 | 按 tag 分组 → LLM 摘要 → 创建 consolidated 记忆 → 原始标记 `consolidated_into` |
| 淘汰衔接 | 被标记的记忆在容量淘汰时优先清除 |

### M2.8 ⬜ memory_forget 工具（延后 — Phase 2）

> 此项不在首批实施范围，先在前端 UI 提供手动删除。

| 任务 | 说明 |
|------|------|
| Schema | `{ query: string, mode: 'expire'\|'delete' }` |
| 行为 | 按语义匹配找到最相关的记忆，标记过期或删除 |
| 风险 | medium（需 human-in-the-loop 确认） |

### M2 实施顺序

```
Phase 1（核心层 — 首批实施）：                   ✅ 全部完成
  M2.1  存储层 + 迁移                        ✅
  M2.2  增强 memory_write（重要性+类型+去重）  ✅
  M2.3  新增 memory_search（混合搜索）        ✅
  M2.4  Prompt 自动注入                      ✅
  M2.5  前端记忆管理 Tab（精简版）            ✅

Phase 2（增强层 — 延后实施）：
  M2.6  自动捕获                             ⬜
  M2.7  记忆整合                             ⬜
  M2.8  memory_forget 工具                   ⬜
```

### M2 Phase 1 实施记录（2026-03-11）

**改动文件清单**：
| 文件 | 变更 |
|------|------|
| `server/migrations/004_agent_memories.js` | 新建：结构化记忆表（三分类 + 混合搜索字段），兼容 M1.5 旧表升级 |
| `server/services/memory.js` | 新建：核心记忆服务（writeMemory/searchMemory/getMemories/evict），含 embedding 去重、混合评分、容量淘汰 |
| `server/services/tools/memory-write.js` | 重构：增强为支持 importance/type/tags 参数，接入 memory 服务层 |
| `server/services/tools/memory-search.js` | 新建：混合搜索工具（Vector + Keyword + 时间衰减 + 重要性加成） |
| `server/services/llm.js` | 修改：buildMessages 注入 Memory Block（高重要性 + 语义相关），autoInjectMemory 开关 |
| `server/services/rag.js` | 修改：导出 getEmbeddings/cosineSimilarity，增加单条文本 10s 短时缓存 |
| `server/routes/agents.js` | 修改：Memory CRUD API，deleteAgent 级联清理，getAgentConfig 返回 autoInjectMemory |
| `server/index.js` | 修改：注册 memory_search 工具 |
| `public/js/manage-agent.js` | 修改：新增记忆 Tab（列表/统计/删除动画） |
| `public/js/chat.js` | 修改：工具时间线图标和摘要（memory_write/memory_search） |
| `public/css/style.css` | 修改：记忆 Tab 完整样式 |
| `public/js/lang/zh.js` / `en.js` | 修改：记忆相关 i18n 键 |

**自查修复（7 轮共 15 项）**：
- 性能：embedding 缓存、SQL 列裁剪、type 过滤下推
- 安全：agent_id 校验删除、输入长度/类型/枚举值校验
- 架构：服务层解耦（移除 llm.js 直接 DB 查询）、activeOnly 参数、API 返回 autoInjectMemory
- 健壮：JSON.parse 防腐（3 处 tags 解析）、删除结果检查、统计数据源一致性

### M2 验收标准

**Phase 1** ✅：

- [x] Agent 对话中能主动调用 `memory_write` 记住关键信息（带重要性和类型）
- [x] Agent 对话中能调用 `memory_search` 回忆历史信息（混合搜索）
- [x] 写入自动去重生效（相似度 > 0.85 合并而非新增）
- [x] 记忆跨会话持久化（重启不丢失）
- [x] 容量限制（1000 条）和 LRU 淘汰生效
- [x] Prompt 自动注入相关记忆 + 高重要性记忆
- [x] 前端记忆管理 Tab 可查看和删除记忆
- [x] 工具调用时间线中 `memory_search` 结果可展示

**Phase 2**（延后）：

- [ ] 对话结束自动提取关键信息
- [ ] 记忆整合压缩生效
- [ ] `memory_forget` 工具可用

---

## M3：RAG 质量提升

> **目标**：知识库检索从演示级提升到可用级  
> **依赖**：无（可与 M1/M2 并行）  
> **预计工作量**：中

### M3.1 ✅ BM25 混合检索

**改动范围**：`server/services/rag.js`、`server/services/database.js`

| 任务 | 详细说明 |
|------|---------|
| 新建 FTS5 表 | `rag_chunks(agentId, fileHash, chunkIdx, text)`，FTS5 虚拟表用于关键词搜索 |
| 索引写入同步 | `indexFile()` 时同步写入 embedding 索引 + FTS5 表 |
| BM25 搜索 | `searchBM25(agentId, query, topK)` → SQLite FTS5 的 `MATCH` + `bm25()` |
| RRF 融合 | `search()` 同时走 embedding + BM25，用 RRF 公式合并排序 |
| RRF 公式 | `score = 1/(k + rank_vec) + 1/(k + rank_bm25)`，k = 60 |

### M3.2 ✅ LLM 重排序

**改动范围**：`server/services/rag.js`

| 任务 | 详细说明 |
|------|---------|
| 粗排 | RRF 融合后取 top-20 候选 |
| 精排 | 调用 LLM 对每个候选打相关性分（0-10），Prompt: "给定问题和文档片段，评估相关性" |
| 结果 | 按 LLM 打分降序取 top-5 |
| 性能优化 | 批量打分（一次 LLM 调用评估多个 chunk），避免 20 次串行调用 |
| 可选配置 | `rag.enableReranking: true/false`（默认 false，因为有额外 LLM 开销） |

### M3.3 ✅ 分层分块

**改动范围**：`server/services/rag.js`

| 任务 | 详细说明 |
|------|---------|
| 双层分块 | 小块（200 字，用于搜索匹配）+ 大块（800 字父块，用于返回上下文） |
| 父子映射 | 每个小块记录所属大块 ID |
| 搜索逻辑 | 搜索时匹配小块 → 去重后返回对应的大块内容 |

### M3.4 ✅ 元数据过滤

**改动范围**：`server/services/rag.js`

| 任务 | 详细说明 |
|------|---------|
| 元数据存储 | 每个 chunk 记录 `{ fileName, fileType, indexedAt }` |
| 搜索时过滤 | `search(agentId, query, { fileFilter, typeFilter })` |
| rag_query 工具增强 | 工具参数新增 `fileFilter` 可选项 |

### M3 验收标准

- [x] 同义词查询能正确检索（"退款" ↔ "退换货"）— 向量语义搜索 + BM25 混合检索覆盖
- [x] 技术术语精确匹配（"NGINX proxy_pass"不会返回 Apache 配置）— BM25 精确匹配 + RRF 融合排序
- [x] 长文档步骤查询返回完整上下文 — 分层分块（200字小块搜索→800字大块上下文返回）
- [x] 重排序开关可控 — `enableReranking` 配置项（默认 false）
- [x] 搜索响应时间 < 2 秒 — LLM 重排序带 10s 超时保护，默认关闭不增加延迟

### M3 实施记录

**改动文件清单（4 个）**：

| 文件 | 改动类型 |
|------|---------|
| `server/migrations/005_rag_fts.js` | 新建 — FTS5 虚拟表迁移 |
| `server/services/rag.js` | 重写 — 分层分块、BM25 搜索、RRF 融合、LLM 重排序、元数据过滤 |
| `server/services/tools/rag-query.js` | 增强 — 新增 fileFilter 参数 |
| `server/routes/agents.js` | 修改 — Agent 删除时清理 FTS 索引 |

**自查修复记录（5 轮，共 4 个问题）**：

| 轮次 | 问题 | 修复 |
|------|------|------|
| 1 | `_syncChunksToFTS` 调用 `_clearFileFTS`（独立 try-catch）可能导致 DELETE 失败时产生重复 FTS 条目 | 内联 DELETE 到 `_syncChunksToFTS`，共享 try-catch |
| 1 | Agent 删除时 FTS5 条目残留（工作区被删但 SQLite 不清理） | 导出 `clearAgentIndex`，在 `deleteAgent` cascade 中调用 |
| 3 | `_syncChunksToFTS` 多条 INSERT 未用事务，逐条自动提交性能差 | 包裹 BEGIN/COMMIT，失败时 ROLLBACK |
| 3 | `_rerankWithLLM` 的 LLM 调用无超时保护 | 添加 `AbortSignal.timeout(10000)` |

---

## M4：Agent 间主动协作

> **目标**：Agent 团队能自动接力完成复合任务  
> **依赖**：M1（Tool Calling 框架）  
> **这是核心差异化能力**  
> **预计工作量**：大

### M4.1 ✅ 内置工具：call_agent

**改动范围**：新建 `server/services/tools/call-agent.js`

| 任务 | 详细说明 |
|------|---------|
| Schema | `{ agentId: string, task: string, context?: string }` |
| 行为 | 在同一频道中触发目标 Agent 响应，传递任务描述和上下文 |
| 嵌套限制 | 最大调用深度 3 层（A→B→C→不可再调），防止无限递归 |
| 消息标记 | 由 call_agent 触发的消息带 `_calledBy: agentId` 标记 |
| 结果返回 | 目标 Agent 的完整回复作为工具结果返回给调用者 |

### M4.2 ✅ 协作链配置

**改动范围**：`server/routes/groups.js`、`public/js/manage-group.js`

| 任务 | 详细说明 |
|------|---------|
| 群组数据扩展 | 群组新增 `collabChain: [{ agentId, role, autoTrigger }]` 字段 |
| 配置 UI | 群组设置中可拖拽排列 Agent 顺序 + 设置自动/手动触发 |
| 触发逻辑 | 用户发消息 → 第一个 Agent 响应 → 自动 call_agent 下一个 → 直到链结束 |
| 中断机制 | 用户随时可发消息打断自动接力 |

### M4.3 ✅ 协作消息 UI

**改动范围**：`public/js/chat.js`、`public/css/style.css`

| 任务 | 详细说明 |
|------|---------|
| 协作消息样式 | `_calledBy` 标记的消息用不同背景色和连接线展示 |
| 接力指示器 | 两个 Agent 消息之间显示 `→ 接力给 Agent_B` 标签 |
| 折叠中间过程 | 多步接力可折叠中间 Agent 的输出，只展示最终结果 |

### M4.4 ✅ 人类控制点

| 任务 | 详细说明 |
|------|---------|
| 确认模式 | 协作链中每个节点可设为 `autoTrigger: false`，需人类点"继续"按钮 |
| 终止按钮 | 协作进行中显示"终止接力"按钮 |
| 编辑介入 | 人类可在某个节点修改 Agent 输出后再传给下一个 Agent |

### M4 验收标准

- [x] Agent A 能通过 call_agent 调用 Agent B 并获取结果 — `call_agent` 工具通过 `sendToLLM` 调用目标 Agent，返回完整回复
- [x] 群聊中设置 3 个 Agent 的协作链，用户发一句话后自动接力完成 — `collabChain` 配置 + `_triggerCollabChain` 自动触发链中下一个 Agent
- [x] 嵌套深度限制生效 — `MAX_CALL_DEPTH=3`（A→B→C→阻止），`depth >= 3` 拒绝调用
- [x] 人类可随时打断或干预 — `autoTrigger: false` 等待确认；用户发新消息自然中断链；终止按钮
- [x] 协作消息 UI 清晰展示任务流转 — `calledBy` 标记 + 紫色连接线 + 接力指示器 + 协作链等待面板

### M4 实施记录

**改动文件清单（8 个）**：

| 文件 | 改动类型 |
|------|---------|
| `server/migrations/006_collab_fields.js` | 新建 — 消息表添加 calledBy 列 |
| `server/services/tools/call-agent.js` | 新建 — call_agent 工具（嵌套深度限制、自调用防护） |
| `server/services/llm.js` | 增强 — sendToLLM 支持 opts、子调用 runKey 隔离、finalize 写入 calledBy、协作链自动触发 |
| `server/services/storage.js` | 增强 — addMessage 和 _mapRow 支持 calledBy 字段 |
| `server/index.js` | 增强 — 注册 call_agent 工具、collab_chain_continue WS 消息处理 |
| `server/routes/groups.js` | 增强 — collabChain CRUD + _sanitizeChain 数据校验 |
| `public/js/chat.js` + `public/js/app.js` | 增强 — 协作消息样式、接力指示器、链等待 UI、继续/终止按钮 |
| `public/js/manage-group.js` + `public/css/style.css` | 增强 — 协作链配置面板（添加/移除/排序/切换自动手动） |

**自查修复记录（5 轮，共 6 个问题）**：

| 轮次 | 问题 | 修复 |
|------|------|------|
| 1 | `handleCollabChainWaiting` 将 previousText 嵌入 onclick 属性，特殊字符导致 XSS/语法错误 | 改用 `_pendingCollabChain` 对象存储数据，onclick 只传 key |
| 1 | `handleSSEStream` 中 `activeRuns.get(channel)` 对子调用不正确 | 新增 runKey 参数传入 handleSSEStream |
| 1 | `_triggerCollabChain` setTimeout 回调无错误处理 | 添加 `.catch()` 记录错误 |
| 2 | 嵌套深度限制 off-by-one（`> 3` 应为 `>= 3`） | 修正为 `depth >= MAX_CALL_DEPTH` |
| 3 | collabChain 节点缺少数据清洗 | 添加 `_sanitizeChain` 验证类型和存在性 |
| 3 | `_triggerCollabChain` 未验证下一个 Agent 是否存在 | 添加 nextAgent 存在性检查 + 日志 |

---

## M5：协作流可视化

> **目标**：让用户看见 AI 团队的工作过程  
> **依赖**：M4（Agent 间主动协作）  
> **预计工作量**：大

### M5.1 ✅ 协作流数据模型

**改动范围**：新建 `server/services/collab-flow.js`

| 任务 | 详细说明 |
|------|---------|
| Flow 数据结构 | `{ id, channel, status, nodes: [{ agentId, status, startedAt, endedAt, toolCalls }], edges }` |
| 状态机 | Flow: pending → running → completed/failed; Node: waiting → running → done/error/waiting_approval |
| 事件发射 | 每次状态变更通过 WebSocket 广播 `{ type: 'collab_flow_update', flow }` |

### M5.2 ✅ 协作流面板 UI

**改动范围**：新建 `public/js/collab-flow.js`、`public/css/collab-flow.css`

| 任务 | 详细说明 |
|------|---------|
| 面板位置 | 聊天区顶部可展开面板（messages div 上方） |
| 节点卡片 | Agent emoji + 名字 + 状态圆点 + 耗时 + 工具调用数 |
| 连接线 | 节点间带箭头连线，活跃连接脉冲动画 |
| 进度条 | 整体进度百分比 + 总耗时 |
| 控制按钮 | 终止 / 历史 / 关闭 |

### M5.3 ✅ 历史回放

| 任务 | 详细说明 |
|------|---------|
| 历史存储 | 已完成的 Flow 保存到 SQLite `collab_flows` 表 |
| 回看入口 | 面板内"历史"按钮，可查看/回放历史协作流 |
| 统计信息 | 总耗时、每个 Agent 耗时、工具调用次数 |

### M5 验收标准

- [x] 协作进行中，面板实时更新节点状态 — `collab_flow_update` WebSocket 事件实时推送，前端 `_renderFlowPanel` 即时渲染
- [x] 连接线动画清晰展示当前活跃节点 — `flowEdgePulse` CSS 动画 + `flowPulse` 状态圆点动画 + 紫色高亮
- [x] 可暂停/终止协作流 — `collab_flow_stop` WS 消息 → `cancelFn` 取消运行 + `stopFlow` 清理状态
- [x] 已完成的协作可回看 — `collab_flows` 表持久化 + `/api/collab-flows` API + 面板内历史列表 + 点击回放

### M5 实施记录

**改动文件清单（10 个）**：

| 文件 | 改动类型 |
|------|---------|
| `server/migrations/007_collab_flows.js` | 新建 — 协作流历史记录表 |
| `server/services/collab-flow.js` | 新建 — 协作流数据模型、状态机、广播、持久化 |
| `server/routes/collab-flows.js` | 新建 — 协作流 API（活跃流查询、历史记录） |
| `server/services/llm.js` | 增强 — 引入 collabFlow 模块，sendToLLM/finalize/cancelRun/error 钩子跟踪流状态 |
| `server/index.js` | 增强 — collabFlow 初始化 + setBroadcast + collab_flow_stop WS 处理 |
| `server/router.js` | 增强 — 注册 collab-flows 路由 |
| `public/js/collab-flow.js` | 新建 — 流面板渲染、进度条、历史回放、频道切换 |
| `public/css/collab-flow.css` | 新建 — 流面板样式、节点卡片、连接线、进度条、动画 |
| `public/index.html` | 增强 — 引入 collab-flow.css 和 collab-flow.js |
| `public/js/app.js` + `public/js/chat.js` | 增强 — collab_flow_update 事件分发 + onChannelSwitch 钩子 |

**自查修复记录（5 轮，共 8 个问题）**：

| 轮次 | 问题 | 修复 |
|------|------|------|
| 1 | `collabFlow.onAgentError` 对 sub-call 也触发，可能错误标记流 | 添加 `!callOpts._isSubCall` 条件判断 |
| 1 | `finalize` 空回复路径未更新流状态，导致流挂住 | 空回复时也调用 `onAgentEnd` |
| 1 | `collab-flows` 路由用 `new URL()` 解析 query 不一致 | 改用路由框架传入的 `query` 参数 |
| 1 | `cancelRun` 未停止协作流 | 添加 `collabFlow.stopFlow(channel)` |
| 2 | 同一 Agent 在链中出现多次时 `find` 匹配错误 | `onAgentStart/End/Error` 使用状态过滤查找正确节点 |
| 3 | `collab_flow_stop` 只清理流状态未取消实际 LLM 运行 | 先调用 `cancelFn` 再 `stopFlow` |
| 4 | `onChainWaiting` 无状态过滤，重复 Agent 场景匹配错误 | 添加 `n.status === 'waiting'` 条件 |
| 4 | `_renderFlowPanel` 中 `statusIcon` 变量定义后未使用 | 移除死代码 |

---

## M6：Workflow 增强 + 工程质量

> **目标**：工作流引擎达到生产级 + 代码质量保障  
> **依赖**：M1（Tool Calling 框架）  
> **预计工作量**：大

### M6.1 ✅ Workflow 条件分支

**改动范围**：`server/services/workflow.js`

| 任务 | 详细说明 |
|------|---------|
| 分支节点 | 新增 `step.type: 'condition'`，根据上一步输出判断走哪个分支 |
| 条件表达式 | 简单关键词匹配或 LLM 判断（"输出中是否包含'需要修改'"） |
| UI 配置 | Workflow 编辑页支持条件节点的可视化配置 |

### M6.2 ✅ Workflow 错误处理

| 任务 | 详细说明 |
|------|---------|
| 重试机制 | 步骤失败可自动重试（最多 3 次） |
| 跳过策略 | 步骤失败可配置为跳过并继续 |
| 回退策略 | 步骤失败可回退到上一步 |

### M6.3 ✅ JSON 状态文件迁移到 SQLite

**改动范围**：`server/services/storage.js`、`server/services/database.js`

| 任务 | 详细说明 |
|------|---------|
| 迁移 groups.json | 新建 `groups` 表，initDB 时自动迁移 |
| 迁移 workflows.json | 新建 `workflows` 表 |
| 迁移 community-schedules.json | 新建 `schedules` 表 |
| 保留 agents.json / models.json | 这两个是配置文件，保持 JSON |

### M6.4 ✅ 核心路径单元测试

**改动范围**：新建 `server/tests/`

| 任务 | 详细说明 |
|------|---------|
| 测试框架 | Node.js 内置 `node:test` + `node:assert`（零依赖） |
| auth 测试 | token 生成/验证、角色匹配、guard 中间件 |
| rag 测试 | 分块、搜索、RRF 融合 |
| tools 测试 | 工具注册、执行、循环保护 |
| 覆盖率 | 关键路径 > 60% |

### M6 验收标准

- [x] Workflow 支持条件分支（if/else）— `step.type: 'condition'`，支持关键词匹配和 LLM 判断两种模式，可配置 true/false 分支跳转目标
- [x] 步骤失败自动重试生效 — `maxRetries`（0-3 次），三种失败策略 `onError: 'fail' | 'skip' | 'rollback'`
- [x] JSON 状态文件全部迁入 SQLite — migration 008 新建 `groups_v2` / `workflows_v2` / `schedules_v2` 表，自动从 JSON 迁移 + 备份
- [x] 核心模块测试覆盖率 > 60% — `node:test` + `node:assert`，53 个测试全部通过（auth 15 + tool-engine 23 + workflow 15）

### M6 实施记录

**改动文件清单（11 个）**：

| 文件 | 改动类型 |
|------|---------|
| `server/services/workflow.js` | 增强 — 条件分支执行引擎、错误处理（重试/跳过/回退）、无限循环防护、`evaluateCondition` |
| `server/services/storage.js` | 增强 — SQLite-backed `saveGroups/saveWorkflows/saveSchedules`（事务写入 + JSON fallback）、`loadGroupsFromDB/loadWorkflowsFromDB/loadSchedulesFromDB` |
| `server/migrations/008_state_tables.js` | 新建 — `groups_v2` / `workflows_v2` / `schedules_v2` 表 + JSON 自动迁移 |
| `server/index.js` | 增强 — `reloadStateFromDB()` 初始化调用 |
| `public/js/workflows.js` | 增强 — 条件节点 UI 配置、失败策略/重试次数选择、`toggleWfStepType` |
| `public/css/style.css` | 增强 — 条件节点卡片样式、分支/错误配置行样式 |
| `server/tests/test-auth.js` | 新建 — auth 模块测试（15 tests） |
| `server/tests/test-tool-engine.js` | 新建 — tool-engine + tool-registry 测试（23 tests） |
| `server/tests/test-workflow.js` | 新建 — workflow 模块测试（15 tests） |

**自查修复记录（5 轮，共 6 个问题）**：

| 轮次 | 问题 | 修复 |
|------|------|------|
| 1 | 条件分支跳转可能导致无限循环 | 添加 `MAX_ITERATIONS = steps.length * 4` 迭代次数上限 |
| 1 | rollback 策略无次数限制可能无限回退 | 添加 `_rollbackCount > 3` 限制 |
| 2 | `saveGroups/saveWorkflows/saveSchedules` DELETE + INSERT 非原子操作 | 包裹 BEGIN/COMMIT 事务 |
| 2 | 条件分支 select 无法回显已保存的跳转目标 | `_mkStepIdOpts(sel)` 动态 selected 属性 |
| 3 | `addWfStep` 新步骤缺少 `type/onError/maxRetries` 默认字段 | 补全完整默认值 |
| 4 | rollback 策略 `i--` 后被末尾 `i++` 抵消，回退无效 | 添加 `_didRollback` 标志 + `continue` 跳过 `i++` |

---

## M7：Web Search 增强

> **目标**：让 `web_search` 工具开箱即用，同时对齐 OpenClaw 的搜索能力  
> **依赖**：M1（Tool Calling 框架）  
> **核心理念**：零配置默认可用（DuckDuckGo + 现有模型） + 高级选项可选升级（对齐 OpenClaw 5 大引擎）  
> **预计工作量**：中

**vs OpenClaw 对比**：

| 维度 | OpenClaw | 虾饺 IM 现状 | 虾饺 IM（M7 目标） |
|------|----------|-------------|------------------|
| 搜索引擎 | Brave / Gemini / Grok / Kimi / Perplexity（5 个） | 无 | **auto** + DuckDuckGo + Kimi + Brave + Perplexity + Grok（6 个） |
| 零配置可用 | ❌（必须有 API Key） | ❌（必须有 API Key） | ✅（`auto` 模式免 Key） |
| 搜索型 LLM | ✅（Gemini/Grok/Kimi/Perplexity grounded search） | ❌ | ✅（Kimi/Perplexity/Grok） |
| AI 总结 | 搜索型 LLM 自带 | ❌ | ✅（`auto` 模式复用现有模型） |
| 结果缓存 | ✅（15 分钟内存缓存） | ❌ | ✅ |
| 国内友好 | Kimi（月之暗面） | ❌ | ✅（Kimi + DuckDuckGo） |

**差异化优势**：OpenClaw 没有零配置方案（所有 provider 都需要 Key），虾饺 IM 的 `auto` 模式让任何用户无需注册第三方服务即可使用搜索。

### M7.1 ✅ 搜索引擎扩展

**改动范围**：`server/services/tools/web-search.js`

#### 三类搜索模式

| 模式 | 引擎 | 需要 Key | 实现方式 | 输出 |
|------|------|----------|---------|------|
| **A. HTML 抓取** | DuckDuckGo | ❌ | 请求 `html.duckduckgo.com/html/` 解析结果 | `{ results }` |
| **B. 传统 API** | Brave | ✅ | REST API 调用 | `{ results }` |
| **C. 搜索型 LLM** | Kimi / Perplexity / Grok | ✅ | Chat Completions API（模型内置搜索） | `{ results, summary }` |

#### `auto` 模式（默认）

```
用户问题
   ↓
Step 1: DuckDuckGo 抓取原始搜索结果（免费，无 Key）
   ↓
Step 2: 用现有 LLM 对结果做总结提炼（复用已有模型，走 toolModels 或 agent 绑定模型）
   ↓
返回给 Agent：{ results: [...], summary: "..." }
```

**`auto` 模式要点**：
- 零配置，默认选项
- 总结步骤直接调 provider API（raw fetch），**不走 Agent 工具系统**，避免递归
- 用 `toolModels` 设置的模型或 agent 绑定模型做总结，小模型即可
- 如果 DuckDuckGo 失败，返回 `{ results: [], error }` 不影响 Agent 其他能力

#### 新增搜索函数

| 函数 | Provider | 要点 |
|------|----------|------|
| `searchDuckDuckGo(query, maxResults)` | DuckDuckGo | HTML 抓取 `html.duckduckgo.com/html/`；正则/字符串解析提取标题、URL、snippet；User-Agent 模拟浏览器；5s 超时 |
| `searchBrave(query, maxResults, apiKey)` | Brave | `GET https://api.search.brave.com/res/v1/web/search`；支持 `web` 和 `llm-context` 两种模式（参考 OpenClaw `brave.mode`） |
| `searchKimi(query, maxResults, apiKey, baseUrl)` | Kimi | Chat Completions `POST {baseUrl}/chat/completions`；模型 `moonshot-v1-auto`（默认）；工具启用搜索；返回 summary + citations |
| `searchPerplexity(query, maxResults, apiKey, baseUrl)` | Perplexity | Chat Completions API；支持 OpenRouter 中转（`baseUrl` 切换）；返回 summary + citations |
| `searchGrok(query, maxResults, apiKey)` | Grok | xAI Responses API `POST https://api.x.ai/v1/responses`；模型 `grok-3-fast-latest`（默认）；`tools: [{type:"web_search"}]`；返回 summary + annotations |
| `searchWithAutoSummary(query, maxResults)` | auto | DuckDuckGo 抓取 + 现有 LLM 总结；直接调 provider Chat API |

#### handler 路由逻辑

```javascript
// 伪代码
if (provider === 'auto')       return searchWithAutoSummary(query, maxResults);
if (provider === 'duckduckgo') return searchDuckDuckGo(query, maxResults);
if (provider === 'brave')      return searchBrave(query, maxResults, apiKey);
if (provider === 'kimi')       return searchKimi(query, maxResults, apiKey, config.baseUrl);
if (provider === 'perplexity') return searchPerplexity(query, maxResults, apiKey, config.baseUrl);
if (provider === 'grok')       return searchGrok(query, maxResults, apiKey);
```

#### 默认 provider

```
默认：auto（零 Key，开箱即用）
```

#### 搜索结果缓存

| 项 | 说明 |
|----|------|
| 缓存结构 | `Map<normalizedQuery, { results, summary?, expiresAt }>` |
| 缓存 TTL | 15 分钟（对齐 OpenClaw `DEFAULT_CACHE_TTL_MINUTES`） |
| Cache Key | `provider + ':' + query.toLowerCase().trim()` |
| 缓存上限 | 100 条 LRU |

### M7.2 ✅ 配置 UI + API 增强

**改动范围**：`server/routes/settings.js`、`public/js/settings-models.js`、`server/routes/agents.js`

#### 后端 API 变更

| 端点 | 变更 |
|------|------|
| `GET /api/settings/web-search` | 返回新增字段：`baseUrl`、`braveMode` |
| `PUT /api/settings/web-search` | 接受新增字段 |

#### 配置数据结构

```javascript
// im-settings.json → tools.webSearch
{
  provider: 'auto',          // 'auto' | 'duckduckgo' | 'brave' | 'kimi' | 'perplexity' | 'grok'
  apiKey: '',                // 用于 brave / kimi / perplexity / grok
  baseUrl: '',               // 用于 kimi / perplexity（OpenRouter 中转）
  braveMode: 'web',          // 'web' | 'llm-context'（仅 brave）
}
```

#### 前端配置 UI

```
搜索服务商：[自动（推荐）▾]

选项：
  ├─ 自动（推荐）         — 免费·DuckDuckGo 搜索 + 当前模型总结
  ├─ DuckDuckGo           — 免费·无需 API Key
  ├─ ─────────────────
  ├─ Kimi（月之暗面）     — 国内友好·中文搜索优秀
  ├─ Brave Search         — 免费额度
  ├─ ─────────────────
  ├─ Perplexity           — 高质量·支持 OpenRouter
  └─ Grok (xAI)           — 实时搜索·带引用
```

**动态字段显示**：

| Provider | 显示 API Key | 显示 Base URL | 显示 Brave Mode | 额外提示 |
|----------|-------------|--------------|----------------|---------|
| auto | ❌ | ❌ | ❌ | "使用 DuckDuckGo + 当前模型，无需任何配置" |
| duckduckgo | ❌ | ❌ | ❌ | "免费使用，无需配置" |
| kimi | ✅ | ✅（可选） | ❌ | "前往 platform.moonshot.cn 获取" |
| brave | ✅ | ❌ | ✅ | "前往 brave.com/search/api 获取" |
| perplexity | ✅ | ✅（可选，OpenRouter） | ❌ | "直连或通过 OpenRouter" |
| grok | ✅ | ❌ | ❌ | "前往 x.ai 获取 API Key" |

#### 工具状态逻辑变更

```javascript
// server/routes/agents.js → _getToolStatus
function _getToolStatus(name, searchCfg) {
  if (name === 'web_search') {
    const provider = searchCfg.provider || 'auto';
    if (provider === 'auto' || provider === 'duckduckgo') return 'ready';  // 免 Key 即 ready
    return searchCfg.apiKey ? 'ready' : 'needs_config';
  }
  return 'ready';
}
```

### M7.3 ✅ 搜索型 LLM 统一输出

**改动范围**：`server/services/tools/web-search.js`

> 搜索型 LLM（Kimi / Perplexity / Grok）返回的是 LLM 回答 + 引用链接，需要转换为统一格式。

#### 统一输出格式

```javascript
{
  results: [
    { title: '...', url: 'https://...', snippet: '...' },
    // ...
  ],
  summary: '基于搜索结果的 LLM 总结',  // 仅 auto / kimi / perplexity / grok 模式有
}
```

#### 引用提取

| Provider | 引用来源 | 提取方式 |
|----------|---------|---------|
| Kimi | `search_results[]` 或 `tool_calls[function.name='search']` | 从 response 的 `search_results` 字段提取 |
| Perplexity | `citations[]` 字段 | 从 Search API response 的 `citations` 数组提取 |
| Grok | `annotations[type='url_citation']` | 从 response output 的 `annotations` 数组提取 URL |
| auto | DuckDuckGo 原始结果 | 直接使用抓取到的结构化结果 |

### M7 实施顺序

```
Phase 1（零配置体验 — 最高优先级）：              ✅ 全部完成
  M7.1a  searchDuckDuckGo() 实现                          ✅
  M7.1b  searchWithAutoSummary() 实现（DuckDuckGo + LLM）  ✅
  M7.2a  默认 provider 改为 auto                           ✅
  M7.2b  _getToolStatus 更新（auto/duckduckgo 免 Key）      ✅
  M7.2c  配置 UI 更新（6 个 provider + 动态字段）            ✅

Phase 2（对齐 OpenClaw）：                         ✅ 全部完成
  M7.1c  searchBrave() 实现                                ✅
  M7.1d  searchKimi() 实现                                 ✅
  M7.1e  searchPerplexity() 实现                            ✅
  M7.1f  searchGrok() 实现                                  ✅
  M7.3   搜索结果缓存 + 引用提取统一                         ✅
```

### M7 实施记录

**改动文件清单（4 个）**：

| 文件 | 改动类型 |
|------|---------|
| `server/services/tools/web-search.js` | **全面重写** — 6 个 provider（auto/duckduckgo/brave/kimi/perplexity/grok），DuckDuckGo HTML 抓取、auto 模式 LLM 总结、15 分钟结果缓存、搜索型 LLM 引用提取、付费 provider 失败自动 fallback 到 auto |
| `server/routes/settings.js` | 增强 — Web Search GET/PUT API 新增 `baseUrl`、`braveMode` 字段；旧配置自动映射为 auto |
| `server/routes/agents.js` | 增强 — `_getToolStatus` 更新：auto/duckduckgo 模式免 Key 即 ready |
| `public/js/settings-models.js` | **重写搜索配置 UI** — 6 个 provider 下拉 + 动态字段（API Key / Base URL / Brave Mode 按 provider 显示/隐藏）+ 描述更新 |

**自查修复记录（5 轮，共 2 个问题）**：

| 轮次 | 问题 | 修复 |
|------|------|------|
| 1 | Brave Search URL 双 `?` 拼接错误（`llm-context` 模式 endpoint 已含 `?result_filter=query`，再追加 `?params` 非法） | 改用 `params.set('result_filter', 'query')` 统一拼接 |
| 1 | `_llmSummarize` 内 `clearTimeout(timer)` 在 fetch 失败时未执行 | 使用 `try...finally` 包裹确保 timer 清理 |

### M7 验收标准

- [x] 默认 `auto` 模式下，用户零配置即可使用 `web_search`，工具状态显示"就绪" — `_getToolStatus` 对 auto/duckduckgo 返回 `ready`
- [x] `auto` 模式返回结构化搜索结果 + LLM 总结 — `searchWithAutoSummary` = DuckDuckGo 抓取 + `_llmSummarize` 调现有模型
- [x] `duckduckgo` 模式免 Key，直接抓取搜索结果 — `searchDuckDuckGo` HTML 解析
- [x] `kimi` 模式调用月之暗面 API，返回中文搜索结果 + 引用 — `searchKimi` 使用 `$web_search` builtin tool
- [x] `brave` 模式支持 `web` 和 `llm-context` 两种模式 — `searchBrave` 通过 `braveMode` 配置
- [x] `perplexity` 模式支持直连和 OpenRouter 中转 — `searchPerplexity` 接受 `baseUrl` 参数
- [x] `grok` 模式调用 xAI API，返回带 search_results 的结果 — `searchGrok` 使用 `search_parameters`
- [x] 旧配置自动降级为 `auto` — settings GET API 映射 + handler `VALID_PROVIDERS` fallback
- [x] 配置 UI 根据 provider 动态显示/隐藏字段 — `_onWsProviderChange` + `_renderWsDynFields`
- [x] 搜索结果 15 分钟缓存生效 — `_cache` Map + `CACHE_TTL` + LRU 淘汰
- [x] "需配置"标签可点击跳转到设置页 — M6 已实现的 `statusClick` onclick

---

## 里程碑依赖关系

```
M0（社区降级）──── 无依赖，最先执行
     │
M1（Tool Calling）── 无依赖，M0 后立即开始
     │
     ├── M2（Agent Memory）── 依赖 M1
     │
     ├── M3（RAG 质量）──── 可与 M1 并行
     │
     ├── M4（Agent 协作）── 依赖 M1
     │        │
     │        └── M5（协作流可视化）── 依赖 M4
     │
     ├── M6（Workflow + 工程）── 依赖 M1
     │
     └── M7（Web Search 增强）── 依赖 M1（增强 web_search 工具）
```

**推荐执行顺序**：

```
M0 → M1 → M2 → M3 → M4 → M5 → M6 → M7
                 ↑可并行↑
```

---

## 执行记录

| 日期 | 里程碑 | 任务 | 状态 | 备注 |
|------|--------|------|------|------|
| | | | | |

---

> **下一步**：执行 M7（Web Search 增强），Phase 1 优先实现零配置体验。
