---
title: 开发者指南 — 虾饺 IM
description: 参与虾饺 IM 开发——代码规范、开发环境、测试、PR 流程。
---

# 开发者指南

欢迎参与虾饺的开发！虾饺的代码量不大（~5000 行），结构清晰，适合入门开源贡献。

## 开发环境

### 前置要求

- Node.js >= 22.0.0
- Git
- 一个趁手的编辑器（VS Code / Cursor / Vim）

### 本地启动

```bash
git clone https://github.com/moziio/xiajiao.git
cd xiajiao
npm install
npm start
```

修改代码后，重启 Node.js 进程即可（前端修改刷新浏览器即可，零构建）。

### 运行测试

```bash
npm test
```

使用 `node:test` 标准测试框架，53 个单元测试，通常 2-3 秒跑完。

## 代码规范

### JavaScript 风格

- **无框架**：不用 Express / Koa，直接用 `node:http`
- **无编译**：不用 TypeScript / Babel，原生 ES Module
- **无构建**：前端直接写 Vanilla JS，不用 Webpack / Vite
- **const 优先**：能用 `const` 不用 `let`，不用 `var`
- **async/await**：异步代码用 async/await，不用回调

### 注释规范

- 只在非显而易见的地方写注释
- 不要写"做了什么"（代码已经说了），写"为什么这样做"
- 函数级别用 JSDoc 注释：

```javascript
/**
 * 在记忆库中搜索相似记忆，用于去重和检索。
 * 使用余弦相似度，阈值 0.9 以上视为重复。
 * @param {string} agentId - Agent 标识
 * @param {string} text - 搜索文本
 * @param {number} topK - 返回数量
 * @returns {Array<{content: string, type: string, similarity: number}>}
 */
async function searchMemory(agentId, text, topK = 10) {
  // ...
}
```

### 依赖规范

**铁律：不引入新依赖，除非满足以下所有条件：**

1. Node.js 标准库无法实现
2. 自己实现超过 200 行代码
3. 该功能是核心功能（不是 nice-to-have）
4. 该包维护活跃，安全记录良好

提 PR 前如果引入了新依赖，需要在 PR 描述中详细说明理由。

## 项目结构

```
server/
├── index.js          # 入口：HTTP 服务 + 路由分发
├── storage.js        # 数据层：SQLite 操作 + Agent 文件管理
├── ws.js             # WebSocket：实时消息推送
├── api/              # REST API 路由处理
│   ├── messages.js   # 消息 CRUD
│   ├── channels.js   # 频道管理
│   ├── agents.js     # Agent 管理
│   └── ...
├── services/         # 核心业务逻辑
│   ├── llm.js        # LLM 调用（多 Provider + Tool Calling）
│   ├── tools.js      # 工具注册 + 分发
│   ├── memory.js     # 记忆系统
│   ├── rag.js        # RAG 检索
│   └── ...
└── test/             # 单元测试
    └── *.test.js
```

### 改代码去哪个文件？

| 想做什么 | 改哪个文件 |
|---------|-----------|
| 添加新的 REST API | `server/api/` 下新建文件 + `index.js` 注册路由 |
| 添加新的工具 | `server/services/tools.js` |
| 修改 LLM 调用逻辑 | `server/services/llm.js` |
| 修改记忆/RAG 逻辑 | `server/services/memory.js` / `rag.js` |
| 修改前端 UI | `public/app.js` + `public/styles.css` |
| 添加新的搜索引擎 | `server/services/search-engines.js` |
| 修改数据库 schema | `server/storage.js` |

## 测试

### 运行全部测试

```bash
npm test
```

### 运行单个测试文件

```bash
node --test server/test/memory.test.js
```

### 写测试

使用 `node:test` 标准库：

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Memory', () => {
  it('should write and search memory', async () => {
    await memory.write('agent-1', 'semantic', 'user prefers Python');
    const results = await memory.search('agent-1', 'programming language');
    assert.ok(results.length > 0);
    assert.ok(results[0].content.includes('Python'));
  });
});
```

### 测试覆盖的模块

| 模块 | 测试数量 | 覆盖内容 |
|------|---------|---------|
| storage | ~15 | 数据库 CRUD |
| memory | ~10 | 记忆写入、搜索、去重 |
| rag | ~8 | 分块、索引、检索 |
| llm | ~5 | API 调用、Tool Calling |
| tools | ~8 | 各工具的执行逻辑 |
| misc | ~7 | 工具函数、配置解析 |

## PR 流程

### 1. Fork & Clone

```bash
git clone https://github.com/你的用户名/xiajiao.git
cd xiajiao
git remote add upstream https://github.com/moziio/xiajiao.git
```

### 2. 创建分支

```bash
git checkout -b feature/my-feature
```

分支命名：
- `feature/xxx` — 新功能
- `fix/xxx` — Bug 修复
- `docs/xxx` — 文档更新
- `refactor/xxx` — 重构

### 3. 开发 & 测试

```bash
# 开发...
npm test  # 确保测试通过
```

### 4. 提交

```bash
git add .
git commit -m "feat: add xxx feature"
```

Commit message 格式遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
feat: 新功能
fix: Bug 修复
docs: 文档更新
refactor: 重构（不影响功能）
test: 测试相关
chore: 构建/工具相关
```

### 5. 提交 PR

```bash
git push origin feature/my-feature
```

在 GitHub 上创建 Pull Request，描述清楚：
- 这个 PR 做了什么
- 为什么需要这个改动
- 如何测试

## 适合新手的 Issue

如果你是第一次贡献，可以从这些方向入手：

| 难度 | 方向 | 示例 |
|------|------|------|
| ⭐ 简单 | 文档 | 修正错误、补充说明、翻译 |
| ⭐ 简单 | UI | 修复样式、响应式适配 |
| ⭐⭐ 中等 | 工具 | 添加新的搜索引擎适配器 |
| ⭐⭐ 中等 | 测试 | 补充测试用例 |
| ⭐⭐⭐ 进阶 | 功能 | 工作流引擎、MCP 集成 |

## 下一步

- [架构设计](/guide/architecture) — 理解代码结构
- [常见问题](/guide/faq) — 技术 FAQ
- [GitHub Issues](https://github.com/moziio/xiajiao/issues) — 找一个 Issue 开始
