# 虾饺 IM 开源发布执行表

> 目标：**今天完成 GitHub 首发**
> 日期：2026-03-18
> 状态：⬜ 待做 | 🔄 进行中 | ✅ 已完成

---

## 一、代码清理（30 分钟）

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 1.1 | `OWNER_KEY` 默认值 `openclaw-admin` → `xiajiao-admin` | ⬜ | `server/config.js` 第 33 行 |
| 1.2 | README 环境变量表中 OWNER_KEY 默认值同步更新 | ⬜ | `README.md` |
| 1.3 | 根目录 `.md` 移入 `docs/dev/` | ⬜ | `MILESTONES.md`、`EVALUATION-REPORT.md`、`IMPROVEMENT-PLAN.md`、`P3.4-SQLite-Security-Quality-Review.md` → `docs/dev/` |
| 1.4 | 语言包 openclaw 残留文案检查 | ⬜ | `public/js/lang/zh.js`、`en.js` |
| 1.5 | 安全扫描：源码无硬编码密钥 | ⬜ | `rg "sk-|apiKey.*['\"][a-zA-Z0-9]" --glob "*.js" -l` |
| 1.6 | 示例配置文件无真实密钥 | ⬜ | 检查 `*.example.json` |

---

## 二、README 重写（40 分钟）

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 2.1 | 重写开头：一句话定位 + 核心卖点 | ⬜ | "4 个依赖 · 零外部服务 · npm start" |
| 2.2 | 特性列表更新 | ⬜ | 加入 Tool Calling / Agent 记忆 / 协作流 / Web Search；社区改为"Agent 事件流" |
| 2.3 | 竞品对比表 | ⬜ | 虾饺 vs Dify vs Coze vs FastGPT（部署依赖、功能） |
| 2.4 | Roadmap 更新 | ⬜ | P1-P3 ✅，P4 大部分 ✅，P5/P6 规划中 |
| 2.5 | 截图占位符 → 真实截图 | ⬜ | 录制后放入 `docs/images/`，README 引用 |
| 2.6 | GitHub 用户名占位符 | ⬜ | `your-username` → 真实用户名 |
| 2.7 | 英文 README 要素 | ⬜ | 项目标题下加一行英文 subtitle |

---

## 三、补充文档（15 分钟）

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 3.1 | 创建 `CONTRIBUTING.md` | ⬜ | 环境要求、运行方法、提交规范、架构概览 |
| 3.2 | 创建 `CHANGELOG.md` | ⬜ | v5.0.0 首版变更日志 |
| 3.3 | `.gitignore` 补充 `.env` / `*.pem` | ⬜ | 防止未来误提交 |

---

## 四、截图素材（20 分钟）

| # | 素材 | 状态 | 用途 |
|---|------|------|------|
| 4.1 | 主界面全景截图（深色主题） | ⬜ | README 首屏 hero image |
| 4.2 | 多 Agent 群聊截图 / GIF | ⬜ | 核心卖点展示 |
| 4.3 | Tool Calling 时间线截图 | ⬜ | 差异化功能 |
| 4.4 | 协作流面板截图 | ⬜ | 独特功能 |

> 截图放入 `docs/images/` 目录，README 用相对路径引用。
> 没时间录 GIF 就先用静态截图，后续补 GIF。

---

## 五、Git + GitHub（20 分钟）

### 5.1 环境准备

| # | 任务 | 状态 | 命令 |
|---|------|------|------|
| 5.1.1 | 安装 GitHub CLI | ⬜ | `winget install GitHub.cli` |
| 5.1.2 | GitHub CLI 登录 | ⬜ | `gh auth login` |
| 5.1.3 | Git 全局配置 | ⬜ | `git config --global user.name "xxx"` / `git config --global user.email "xxx"` |

### 5.2 初始化 + 推送

| # | 任务 | 状态 | 命令 |
|---|------|------|------|
| 5.2.1 | Git 初始化 | ⬜ | `git init` |
| 5.2.2 | 暂存全部文件 | ⬜ | `git add .` |
| 5.2.3 | 安全检查 | ⬜ | `git status` 确认无敏感文件 |
| 5.2.4 | 首次提交 | ⬜ | `git commit -m "feat: xiajiao-im v5.0.0"` |
| 5.2.5 | 创建 GitHub 仓库 + 推送 | ⬜ | `gh repo create xiajiao-im --public --source . --push` |

### 5.3 仓库配置

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 5.3.1 | 仓库 Topics | ⬜ | `ai-agent`, `im`, `chatbot`, `llm`, `rag`, `tool-calling`, `sqlite`, `nodejs`, `self-hosted` |
| 5.3.2 | 仓库 About 描述 | ⬜ | AI Agent 团队协作平台 — 4 个依赖，npm start |
| 5.3.3 | 创建 Release v5.0.0 | ⬜ | `gh release create v5.0.0 --title "v5.0.0" --notes "..."` |
| 5.3.4 | 启用 Discussions | ⬜ | GitHub Settings → Features → Discussions |
| 5.3.5 | 创建 Issue 模板 | ⬜ | Bug Report + Feature Request（可后补） |

---

## 六、首发推广（今天或明天）

| # | 平台 | 状态 | 策略 |
|---|------|------|------|
| 6.1 | V2EX 分享创造 | ⬜ | 技术故事向，强调 4 依赖 + npm start |
| 6.2 | 掘金 | ⬜ | 2000 字技术文章 |
| 6.3 | X / 即刻 | ⬜ | 短推 + 截图 |
| 6.4 | 知乎 | ⬜ | 自问自答"轻量 AI Agent 平台" |
| 6.5 | Hacker News | ⬜ | `Show HN: Xiajiao IM — AI Agent team platform, 4 deps, no Docker` |
| 6.6 | Reddit r/selfhosted | ⬜ | 强调 self-hosted + 零依赖 |

---

## 今日执行顺序

```
第 1 步 ──→ 代码清理（一 1.1~1.6）     ██████ 30 min
第 2 步 ──→ README 重写（二 2.1~2.7）   ████████ 40 min
第 3 步 ──→ 补充文档（三 3.1~3.3）      ████ 15 min
第 4 步 ──→ 截图素材（四 4.1~4.4）      █████ 20 min  ← 需要你手动操作
第 5 步 ──→ Git + GitHub（五 5.1~5.3）  █████ 20 min
第 6 步 ──→ 首发推广（六 6.1~6.6）      后续
                                        ─────────
                                        总计 ~2 小时
```

> **第 4 步"截图"需要你手动录制**，其余步骤我可以帮你执行。
> 如果截图来不及，先用文字版 README 发布，截图明天补。
