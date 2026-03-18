# OpenClaw → 虾饺 IM 一键迁移技术方案

> 状态：待实施 | 优先级：P3（可选方案）  
> 创建时间：2026-03-14

## 1. 背景

虾饺 IM v5.0 已脱离 OpenClaw Gateway 独立运行（P2.1），但现有 OpenClaw 用户可能有大量已配置的 Provider、Model、Agent 数据。需要提供一键迁移能力，让用户无缝从 OpenClaw 切换到虾饺 IM。

## 2. 数据结构对比

### 2.1 Providers

```
┌─ OpenClaw (openclaw.json) ──────────────────┐
│ models.providers.{name}: {                   │
│   baseUrl, apiKey, api,                      │
│   models: [ { id, name, ... } ]  ← 嵌套     │
│ }                                            │
├─ 虾饺 IM (models.json) ────────────────────-─┤
│ providers.{name}: {                          │
│   baseUrl, apiKey, api   ← 无 models 子字段  │
│ }                                            │
└──────────────────────────────────────────────┘
```

**转换规则**：提取 `baseUrl`, `apiKey`, `api`，丢弃嵌套的 `models` 数组。

### 2.2 Models

```
┌─ OpenClaw ──────────────────────────────────────┐
│ 嵌套在 provider 内部                             │
│ id 无前缀: "qwen3.5-plus"                       │
│ 含 cost 字段: { input, output, cacheRead, ... }  │
├─ 虾饺 IM ───────────────────────────────────────-┤
│ 独立顶层数组                                      │
│ id 有前缀: "bailian/qwen3.5-plus"                │
│ 含 provider 字段指向所属 provider                  │
│ 无 cost 字段                                      │
└──────────────────────────────────────────────────┘
```

**转换规则**：
```javascript
// 伪代码
for (const [provId, prov] of Object.entries(openclaw.models.providers)) {
  for (const m of prov.models || []) {
    imModels.push({
      id: `${provId}/${m.id}`,
      name: m.name || m.id,
      provider: provId,
      reasoning: m.reasoning || false,
      input: m.input || ['text'],
      contextWindow: m.contextWindow || 128000,
      maxTokens: m.maxTokens || 8192,
      ...(m.output ? { output: m.output } : {}),
      ...(m.api && m.api !== prov.api ? { api: m.api } : {}),
    });
  }
}
```

### 2.3 Agents

```
┌─ OpenClaw ────────────────────────────────────┐
│ agents.list[]: {                              │
│   id, name, workspace,                        │
│   model: { primary: "bailian/qwen3.5-plus" }  │
│ }                                             │
├─ 虾饺 IM ────────────────────────────────────-┤
│ agents[]: {                                   │
│   id, name, workspace,                        │
│   model: "bailian/qwen3.5-plus",              │
│   createdAt: 1773390383458                    │
│ }                                             │
└───────────────────────────────────────────────┘
```

**转换规则**：`model.primary` → `model`（展平），补充 `createdAt`。

### 2.4 不需要迁移的数据

| 数据 | 原因 |
|------|------|
| Workspace 目录 (SOUL.md, 知识库文件) | 两边共享同一路径，无需拷贝 |
| RAG 向量索引 (.rag-index.json) | 迁移后首次搜索自动重建 |
| im-settings.json | IM 专属配置，OpenClaw 无对应项 |
| 社区动态 (community-posts.json) | IM 专属功能 |
| 日程任务 (schedules) | IM 专属功能 |

### 2.5 可选迁移（复杂度高）

| 数据 | 难度 | 说明 |
|------|------|------|
| 聊天记录 | 高 | OpenClaw 由 Gateway 管理，格式差异大，需逐条转换 |
| Agent 指标 (metrics) | 低 | 可重置，意义不大 |
| Agent 画像 (profiles) | 低 | 可重新生成 |

## 3. 迁移脚本设计

### 3.1 文件位置

```
web-im-client/
├── migrate-from-openclaw.js    ← 迁移脚本
```

### 3.2 执行方式

```bash
# 命令行执行
node migrate-from-openclaw.js

# 或通过 IM 设置页面触发（未来可做 UI 入口）
```

### 3.3 核心流程

```
┌──────────────────────────────────────────────────────┐
│  1. 检测 openclaw.json 是否存在                        │
│     路径: ~/.openclaw/openclaw.json                   │
│     不存在 → 报错退出                                  │
├──────────────────────────────────────────────────────┤
│  2. 读取并解析 openclaw.json                           │
│     提取: models.providers, agents.list               │
├──────────────────────────────────────────────────────┤
│  3. 检查冲突                                          │
│     读取现有 models.json 和 agents.json                │
│     检测 provider/model/agent ID 是否重复              │
│     策略: 默认跳过重复项，--force 参数覆盖              │
├──────────────────────────────────────────────────────┤
│  4. 转换 Providers                                    │
│     openclaw.providers → im.providers                 │
│     去掉 models 子字段，保留 baseUrl/apiKey/api         │
├──────────────────────────────────────────────────────┤
│  5. 转换 Models                                       │
│     遍历每个 provider.models                           │
│     加前缀: id → providerId/id                        │
│     添加 provider 字段                                 │
│     去掉 cost 字段                                     │
├──────────────────────────────────────────────────────┤
│  6. 转换 Agents                                       │
│     model.primary → model                             │
│     补充 createdAt = Date.now()                        │
│     验证 workspace 目录存在                             │
├──────────────────────────────────────────────────────┤
│  7. 写入目标文件                                       │
│     备份原有 models.json → models.json.bak             │
│     备份原有 agents.json → agents.json.bak             │
│     写入合并后的数据                                    │
├──────────────────────────────────────────────────────┤
│  8. 输出迁移报告                                       │
│     Providers: N 个迁移, M 个跳过                      │
│     Models: N 个迁移, M 个跳过                         │
│     Agents: N 个迁移, M 个跳过                         │
│     提示: 重启服务器生效                                │
└──────────────────────────────────────────────────────┘
```

### 3.4 冲突处理策略

| 场景 | 默认行为 | --force 行为 |
|------|---------|-------------|
| Provider ID 已存在 | 跳过，保留 IM 侧配置 | 覆盖为 OpenClaw 侧配置 |
| Model ID 已存在 | 跳过 | 覆盖 |
| Agent ID 已存在 | 跳过 | 覆盖（保留 IM 侧的 createdAt） |
| Workspace 目录不存在 | 自动创建空目录 | 同左 |

### 3.5 安全措施

- 迁移前自动备份 `models.json.bak`、`agents.json.bak`
- 不修改 `openclaw.json`（只读）
- 不覆盖 `im-settings.json`
- 不清除聊天记录
- 支持 `--dry-run` 参数：只输出迁移预览，不实际写入

## 4. 未来扩展：UI 入口

在设置页面增加"从 OpenClaw 导入"按钮：

```
设置 → 基础设施 → 数据导入
┌──────────────────────────────────────┐
│  📥 从 OpenClaw 导入                  │
│                                      │
│  检测到 openclaw.json:               │
│  ✓ 2 个 Providers                    │
│  ✓ 12 个 Models                      │
│  ✓ 7 个 Agents                       │
│                                      │
│  [预览变更]  [开始导入]               │
└──────────────────────────────────────┘
```

API 端点设计：
- `GET /api/settings/migrate/preview` — 预览迁移内容（只读）
- `POST /api/settings/migrate/execute` — 执行迁移

## 5. 预估工作量

| 任务 | 预估 |
|------|------|
| 迁移脚本（命令行） | 50-80 行代码，约 1h |
| 冲突检测 + 备份 | 30 行代码，约 0.5h |
| UI 入口（可选） | 前端 + API，约 2h |
| 测试验证 | 0.5h |
| **合计** | **约 4h（含 UI）/ 2h（仅脚本）** |

## 6. 关联文档

- [虾饺IM演进规划](./虾饺IM演进规划.md) — P2.1 脱离 OpenClaw Gateway
- [技术架构](./technical-architecture.md) — 整体架构说明
