# 贡献指南

感谢你对虾饺 (Xiajiao) 的关注！欢迎任何形式的贡献：Issue 反馈、功能建议、代码提交、文档改进。

## 开发环境

- **Node.js >= 22.0.0**（项目使用原生 `node:sqlite` 模块）
- 无需其他工具——没有构建步骤，没有 Docker，没有外部数据库

## 本地运行

```bash
git clone https://github.com/moziio/xiajiao.git
cd xiajiao
npm install
npm start
# 浏览器打开 http://localhost:18800，进入 设置 → 模型管理 添加 API Key
```

## 运行测试

```bash
npm test
```

测试使用 Node.js 原生 `node:test` + `node:assert`，无需额外安装。

## 提交代码

1. Fork 本仓库
2. 创建分支：`git checkout -b feat/my-feature`
3. 提交改动（见下方提交规范）
4. 推送分支：`git push origin feat/my-feature`
5. 创建 Pull Request

### 提交规范

```
feat: 新功能
fix: 修复 Bug
docs: 文档变更
refactor: 重构（不改变功能）
test: 添加或修改测试
chore: 构建/工具/配置变更
```

示例：`feat: add Telegram channel support`

## 项目架构

```
server/
├── middleware/     # 认证、日志、限流
├── routes/         # HTTP API 路由
├── services/       # 核心业务逻辑（LLM、RAG、记忆、工作流...）
├── migrations/     # SQLite 数据库迁移
└── tests/          # 单元测试

public/
├── js/core/        # 基础设施（API、格式化、弹窗）
├── js/             # 功能模块（聊天、通讯录、设置...）
└── css/            # 样式
```

详细架构说明见 [README](README.md#项目结构)。

## 需要帮助？

- 在 [GitHub Issues](https://github.com/moziio/xiajiao/issues) 中提 Bug 或建议
- 在 [GitHub Discussions](https://github.com/moziio/xiajiao/discussions) 中交流讨论
