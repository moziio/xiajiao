# 虾饺 IM 开源发布 Checklist

> 本文档记录开源前所有修改项，勾选即表示已完成。

---

## 一、已完成的文件变更

### 1. 新增文件

| 文件 | 用途 | 状态 |
|------|------|------|
| `.gitignore` | 排除敏感文件和运行时数据 | ✅ 已创建 |
| `LICENSE` | MIT 开源协议 | ✅ 已创建 |
| `README.md` | 项目介绍、快速开始、功能列表、Roadmap | ✅ 已创建 |
| `models.example.json` | 模型配置示例（不含真实密钥） | ✅ 已创建 |
| `im-settings.example.json` | 系统设置示例 | ✅ 已创建 |
| `agents.example.json` | Agent 配置示例 | ✅ 已创建 |

### 2. 修改文件

| 文件 | 变更内容 | 状态 |
|------|----------|------|
| `package.json` | name: `openclaw-im` → `xiajiao-im`，version: `2.0.0` → `5.0.0`，更新描述，添加 keywords/license/engines | ✅ 已修改 |

### 3. `.gitignore` 排除清单

以下文件/目录不会进入 git 仓库：

```
node_modules/           # 依赖
data/                   # 运行时数据（SQLite DB、Agent workspace）
*.db / *.db-wal / *.db-shm  # 数据库文件
models.json             # ⚠️ 含 API Key
im-settings.json        # 用户设置
agents.json             # 用户的 Agent 数据
groups.json             # 群组数据
workflows.json          # 工作流数据
agent-profiles.json     # Agent 社交资料
agent-metrics.json      # 统计数据
community-posts.json    # 社区帖子
community-schedules.json # 定时任务
message-history.json    # 消息历史
*.bak                   # 迁移备份
public/uploads/         # 用户上传文件
```

---

## 二、Git 初始化操作步骤

在项目根目录 `C:\Users\admin\.openclaw\web-im-client` 中执行：

```bash
# 1. 初始化 git 仓库
git init

# 2. 添加所有文件（.gitignore 会自动排除敏感文件）
git add .

# 3. 检查即将提交的文件，确认无敏感内容
git status

# ⚠️ 重点检查：以下文件不应出现在 staged 列表中
#   - models.json（含真实 API Key）
#   - agents.json（含个人 Agent 数据）
#   - im-settings.json
#   - data/ 下的任何文件
#   - *.bak 文件
#   - message-history.json

# 4. 首次提交
git commit -m "feat: 虾饺 IM v5.0 — 面向 AI Agent 的即时通讯平台"

# 5. 关联远程仓库（替换为你的 GitHub 仓库地址）
git remote add origin https://github.com/your-username/xiajiao-im.git

# 6. 推送
git branch -M main
git push -u origin main
```

---

## 三、发布后建议（本周内）

### 优先级 P0 — 发布当天

- [ ] 在 GitHub 上创建 Release tag `v5.0.0`
- [ ] 替换 README.md 中的截图占位符为实际截图
- [ ] 将 README.md 中的 `your-username` 替换为实际 GitHub 用户名

### 优先级 P1 — 本周

- [ ] 添加 `CONTRIBUTING.md` 贡献指南
- [ ] 添加 `CHANGELOG.md` 变更日志
- [ ] 考虑添加 GitHub Actions CI（至少跑一个 `npm install` + Node 22 环境验证）

### 优先级 P2 — 下周

- [ ] 按演进方案推进 P4（消息可靠性层、前端工程化）
- [ ] 每完成一个改造即 commit + push

---

## 四、安全确认

| 检查项 | 结果 |
|--------|------|
| `models.json` 含真实 API Key → 已被 `.gitignore` 排除 | ✅ 安全 |
| `models.example.json` 仅含占位符 `sk-your-*` | ✅ 安全 |
| `data/` 目录（含 Agent workspace 和 TOOLS.md 中可能引用的 Key）→ 已被排除 | ✅ 安全 |
| `*.bak` 备份文件 → 已被排除 | ✅ 安全 |
| `message-history.json` 聊天记录 → 已被排除 | ✅ 安全 |
| `server/config.js` 中 `OWNER_KEY` 默认值为 `openclaw-admin` → 建议用户通过环境变量覆盖 | ⚠️ 提醒 |
| 源代码文件（`.js`/`.html`/`.css`）→ 不含硬编码密钥 | ✅ 安全 |

---

## 五、当前文件清单（将进入 git 的文件）

```
xiajiao-im/
├── .gitignore                    # 新增
├── LICENSE                       # 新增 (MIT)
├── README.md                     # 新增
├── package.json                  # 修改 (name/version/desc)
├── package-lock.json
├── models.example.json           # 新增 (示例配置)
├── im-settings.example.json      # 新增 (示例配置)
├── agents.example.json           # 新增 (示例配置)
├── community-topics.json         # 保留 (默认话题数据)
├── migrate-from-openclaw.js      # 保留 (迁移工具)
├── server/                       # 全部保留
│   ├── index.js
│   ├── config.js
│   ├── router.js
│   ├── middleware/auth.js
│   ├── routes/ (7 files)
│   └── services/ (7 files)
├── public/                       # 全部保留
│   ├── index.html
│   ├── css/
│   ├── js/ (23 files)
│   └── js/lang/ (zh.js, en.js)
└── docs/                         # 保留 (演进文档)
```
