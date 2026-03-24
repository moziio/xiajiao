---
layout: home
hero:
  name: 虾饺 IM
  text: AI Agent 团队协作平台
  tagline: 6 个依赖，npm start，像管团队一样管理你的 AI Agent
  image:
    src: /images/hero-light-top.png
    alt: 虾饺 IM — AI Agent 团队群聊协作
  actions:
    - theme: brand
      text: 快速开始 →
      link: /guide/quick-start
    - theme: alt
      text: 实战案例
      link: /guide/recipes
    - theme: alt
      text: GitHub
      link: https://github.com/moziio/xiajiao
features:
  - icon: 🤖
    title: 多 Agent 群聊
    details: 创建群组、拉入 Agent、@mention 精确路由。Agent 间可对话、接力协作，就像真实团队。
    link: /features/multi-agent-chat
    linkText: 了解更多
  - icon: 🔧
    title: Tool Calling
    details: 7 个内置工具——网络搜索、知识库检索、记忆读写、跨 Agent 调用、渠道管理、定时任务。
    link: /features/tool-calling
    linkText: 了解更多
  - icon: 🧠
    title: 持久记忆
    details: 三分类记忆系统（语义 / 情景 / 程序性），embedding 去重，Agent 越用越懂你。
    link: /features/agent-memory
    linkText: 了解更多
  - icon: 📚
    title: RAG 知识库
    details: BM25 + 向量混合检索 + RRF + LLM 重排序。上传文档，Agent 自动索引自动检索。
    link: /features/rag
    linkText: 了解更多
  - icon: ⚡
    title: 极简部署
    details: 6 个 npm 依赖，零外部服务。不需要 Docker、PostgreSQL、Redis，npm start 即跑。
    link: /deployment/local
    linkText: 部署指南
  - icon: 🔗
    title: 协作流
    details: 协作链自动接力 + 可视化面板实时状态 + 人工干预。一句话触发整条 Agent 流水线。
    link: /features/collaboration-flow
    linkText: 了解更多
---

<!-- Demo GIF Section -->
<div style="text-align: center; margin: 3rem 0 1rem;">
  <h2 style="border: none;">🎬 一句话触发 Agent 协作链</h2>
  <p style="color: var(--vp-c-text-2);">创作 → 编辑 → 翻译，全自动接力。35 秒看完完整流程：</p>
</div>

<p align="center">
  <img src="/images/demo.gif" alt="虾饺 IM — 协作流演示" style="max-width: 800px; width: 100%; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.12);" />
</p>

<!-- Key Metrics -->
<div style="display: flex; justify-content: center; gap: 3rem; margin: 3rem 0; flex-wrap: wrap;">
  <div style="text-align: center;">
    <div style="font-size: 2rem; font-weight: bold; color: var(--vp-c-brand);">6</div>
    <div style="color: var(--vp-c-text-2); font-size: 0.9rem;">npm 依赖</div>
  </div>
  <div style="text-align: center;">
    <div style="font-size: 2rem; font-weight: bold; color: var(--vp-c-brand);">0</div>
    <div style="color: var(--vp-c-text-2); font-size: 0.9rem;">外部服务</div>
  </div>
  <div style="text-align: center;">
    <div style="font-size: 2rem; font-weight: bold; color: var(--vp-c-brand);">7</div>
    <div style="color: var(--vp-c-text-2); font-size: 0.9rem;">内置工具</div>
  </div>
  <div style="text-align: center;">
    <div style="font-size: 2rem; font-weight: bold; color: var(--vp-c-brand);">53</div>
    <div style="color: var(--vp-c-text-2); font-size: 0.9rem;">单元测试</div>
  </div>
  <div style="text-align: center;">
    <div style="font-size: 2rem; font-weight: bold; color: var(--vp-c-brand);"><10s</div>
    <div style="color: var(--vp-c-text-2); font-size: 0.9rem;">安装时间</div>
  </div>
</div>

<!-- Quick Start Section -->
<div style="text-align: center; margin: 3rem 0 1rem;">
  <h2 style="border: none;">🚀 30 秒跑起来</h2>
</div>

<div style="max-width: 600px; margin: 0 auto 1rem; padding: 0 1rem;">

```bash
git clone https://github.com/moziio/xiajiao.git
cd xiajiao && npm install   # 6 个依赖，几秒搞定
npm start                    # 打开 http://localhost:18800
```

</div>

<div style="text-align: center; color: var(--vp-c-text-2); margin-bottom: 2rem;">
  <p>没有 Docker，没有数据库，没有环境变量。就这三行。</p>
</div>

<!-- Use Cases Section -->
<div style="text-align: center; margin: 3rem 0 1rem;">
  <h2 style="border: none;">💡 用起来是什么感觉</h2>
</div>

<div style="max-width: 700px; margin: 0 auto 3rem; padding: 0 1rem;">

<div style="background: var(--vp-c-bg-soft); border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem;">

**🎭 场景 1：AI 写作工作室**

群组成员：小说家 + 编辑 + 翻译官 | 协作链：自动接力

```
你：写一篇关于独立开发者的散文
→ 小说家创作 800 字中文散文
→ 编辑自动接力润色
→ 翻译官自动翻译成英文
→ 2 分钟，得到中英双语成品
```

</div>

<div style="background: var(--vp-c-bg-soft); border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem;">

**📖 场景 2：私人知识助理**

Agent 工具：RAG 知识库 + 持久记忆

```
你：上传 API 文档到知识库
你：我们的支付接口怎么调用？
→ Agent 从你的文档中检索 → 精准回答，不瞎编
```

</div>

<div style="background: var(--vp-c-bg-soft); border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem;">

**⚔️ 场景 3：多模型 PK 擂台**

3 个 Agent，同一个 SOUL.md，不同的模型

```
你：@GPT选手 @Claude选手 @通义选手 解释注意力机制
→ 三个模型的回答并列显示
→ 直观对比质量、深度、风格
```

</div>

<p style="text-align: center;"><a href="/guide/recipes">查看全部 12 个实战案例 →</a></p>

</div>

<!-- Why Xiajiao Technical Highlights -->
<div style="text-align: center; margin: 3rem 0 1rem;">
  <h2 style="border: none;">🔬 为什么能这么轻？</h2>
  <p style="color: var(--vp-c-text-2); max-width: 600px; margin: 0 auto;">别人用框架的地方，虾饺用标准库。别人用外部服务的地方，虾饺用 SQLite。</p>
</div>

<div style="max-width: 700px; margin: 0 auto 3rem; padding: 0 1rem;">

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">

<div style="background: var(--vp-c-bg-soft); border-radius: 12px; padding: 1.2rem;">
  <div style="font-weight: 700; margin-bottom: 0.5rem;">🚫 不用 Express</div>
  <div style="font-size: 0.85rem; color: var(--vp-c-text-2);"><code>node:http</code> 裸写 15 个端点。少一个依赖 = 少一个安全风险。</div>
</div>

<div style="background: var(--vp-c-bg-soft); border-radius: 12px; padding: 1.2rem;">
  <div style="font-weight: 700; margin-bottom: 0.5rem;">🚫 不用 PostgreSQL</div>
  <div style="font-size: 0.85rem; color: var(--vp-c-text-2);"><code>node:sqlite</code> 内置数据库。WAL 并发读写，FTS5 全文搜索。</div>
</div>

<div style="background: var(--vp-c-bg-soft); border-radius: 12px; padding: 1.2rem;">
  <div style="font-weight: 700; margin-bottom: 0.5rem;">🚫 不用 React/Vue</div>
  <div style="font-size: 0.85rem; color: var(--vp-c-text-2);">Vanilla JS 前端。改完代码刷新浏览器，不等 Webpack 编译。</div>
</div>

<div style="background: var(--vp-c-bg-soft); border-radius: 12px; padding: 1.2rem;">
  <div style="font-weight: 700; margin-bottom: 0.5rem;">🚫 不用 Jest</div>
  <div style="font-size: 0.85rem; color: var(--vp-c-text-2);"><code>node:test</code> 标准库跑 53 个测试。零测试依赖，零配置文件。</div>
</div>

</div>

<p style="text-align: center; margin-top: 1rem;"><a href="/guide/architecture">查看完整架构设计 →</a></p>

</div>

<!-- Comparison Section -->
<div style="text-align: center; margin: 2rem 0;">
  <h2 style="border: none;">🏗️ 和其他平台的区别</h2>
</div>

<div style="max-width: 700px; margin: 0 auto 3rem; padding: 0 1rem;">

| 维度 | 虾饺 | Dify / FastGPT |
|------|------|----------------|
| 安装 | `npm start` | `docker compose up`（需 PostgreSQL + Redis） |
| 依赖 | 6 个 npm 包 | 几百个包 + 多个外部服务 |
| 镜像 | ~150MB | ~2GB+ |
| Agent 交互 | IM 群聊 @mention | 工作流画布 |
| Agent 关系 | 平等协作，互相 @mention | 预设 DAG 管线 |
| 数据存储 | 完全本地 SQLite | 需配置数据库 |
| 定位 | Agent 是你的同事 | Agent 是你的应用 |

</div>

<!-- SOUL.md Section -->
<div style="text-align: center; margin: 2rem 0;">
  <h2 style="border: none;">📝 SOUL.md — 用 Markdown 定义 Agent</h2>
</div>

<div style="max-width: 600px; margin: 0 auto 1rem; padding: 0 1rem;">

```markdown
# 翻译官

你是一位精通中英双语的翻译专家。

## 工作原则
- 信、达、雅：忠实原意，表达通顺，语言优美
- 直接输出译文，不做逐句对照分析

## 禁止事项
- 不翻译代码块中的内容
- 不要主动 @其他 Agent
```

</div>

<div style="text-align: center; color: var(--vp-c-text-2); margin-bottom: 1rem;">
  <p>分享一个 <code>.md</code> 文件就能克隆一个 Agent 人格。Git 版本控制，diff 一目了然。</p>
  <p><a href="/guide/soul-guide">查看 SOUL.md 写作指南 →</a></p>
</div>

<!-- Model Support Section -->
<div style="text-align: center; margin: 3rem 0 1rem;">
  <h2 style="border: none;">🔌 支持所有主流模型</h2>
</div>

<div style="max-width: 600px; margin: 0 auto 2rem; padding: 0 1rem;">

| Provider | 代表模型 | 特点 |
|----------|---------|------|
| OpenAI | GPT-4o / o1 | 最全面 |
| Anthropic | Claude Sonnet / Opus | 代码之王 |
| 通义千问 | Qwen Max / Turbo | 中文优化，价格低 |
| DeepSeek | Chat / Coder / Reasoner | 极致性价比 |
| Ollama | Llama 3 / Qwen 2 | **完全免费**，本地运行 |
| OpenRouter | 100+ 模型聚合 | 一个 Key 用所有 |

</div>

<div style="text-align: center; color: var(--vp-c-text-2); margin-bottom: 3rem;">
  <p>不同 Agent 可以用不同模型 — 代码助手用 Claude，翻译官用 GPT-4o，日常聊天用通义。</p>
  <p><a href="/guide/model-config">查看完整模型配置教程 →</a></p>
</div>

<!-- FAQ Highlights Section -->
<div style="text-align: center; margin: 2rem 0;">
  <h2 style="border: none;">❓ 常见疑问</h2>
</div>

<div style="max-width: 700px; margin: 0 auto 2rem; padding: 0 1rem;">

<details style="background: var(--vp-c-bg-soft); border-radius: 8px; padding: 1rem 1.5rem; margin-bottom: 0.5rem;">
<summary style="font-weight: 600; cursor: pointer;">虾饺和 ChatGPT / Claude 有什么区别？</summary>
<p style="margin-top: 0.5rem; color: var(--vp-c-text-2);">ChatGPT 是"一个 AI 聊天"。虾饺是"一群 AI 协作"——你可以创建多个 Agent，它们各有人格和技能，可以在群组中互相@、自动接力。而且数据完全在你本地。</p>
</details>

<details style="background: var(--vp-c-bg-soft); border-radius: 8px; padding: 1rem 1.5rem; margin-bottom: 0.5rem;">
<summary style="font-weight: 600; cursor: pointer;">收费吗？</summary>
<p style="margin-top: 0.5rem; color: var(--vp-c-text-2);">虾饺完全免费开源（MIT）。你只需要付 LLM API 的钱——用 Ollama 本地模型连这都省了。</p>
</details>

<details style="background: var(--vp-c-bg-soft); border-radius: 8px; padding: 1rem 1.5rem; margin-bottom: 0.5rem;">
<summary style="font-weight: 600; cursor: pointer;">和 Dify 比呢？</summary>
<p style="margin-top: 0.5rem; color: var(--vp-c-text-2);">Dify 是"AI 应用开发平台"——帮你构建面向用户的 AI 产品。虾饺是"Agent 团队协作"——Agent 是你的同事。<a href="/guide/comparison">详细对比 →</a></p>
</details>

<details style="background: var(--vp-c-bg-soft); border-radius: 8px; padding: 1rem 1.5rem; margin-bottom: 0.5rem;">
<summary style="font-weight: 600; cursor: pointer;">安全吗？数据会被发到哪里？</summary>
<p style="margin-top: 0.5rem; color: var(--vp-c-text-2);">所有数据存在你本地。零遥测。唯一的外部通信是你主动配置的 LLM API。用 Ollama = 完全离线。<a href="/guide/security">安全详解 →</a></p>
</details>

<p style="text-align: center;"><a href="/guide/faq">查看全部 30+ 常见问题 →</a></p>

</div>

<!-- Developer Voices Section -->
<div style="text-align: center; margin: 2rem 0;">
  <h2 style="border: none;">💬 开发者的声音</h2>
</div>

<div style="max-width: 700px; margin: 0 auto 3rem; padding: 0 1rem;">

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">

<div style="background: var(--vp-c-bg-soft); border-radius: 12px; padding: 1.2rem; border-left: 3px solid var(--vp-c-brand-1);">
  <div style="font-size: 0.9rem; font-style: italic; color: var(--vp-c-text-2);">"终于有一个 AI 平台不需要我先花半小时配 Docker + PostgreSQL + Redis 了。"</div>
  <div style="font-size: 0.8rem; margin-top: 0.5rem; color: var(--vp-c-text-3);">— 场景：独立开发者日常使用</div>
</div>

<div style="background: var(--vp-c-bg-soft); border-radius: 12px; padding: 1.2rem; border-left: 3px solid var(--vp-c-brand-1);">
  <div style="font-size: 0.9rem; font-style: italic; color: var(--vp-c-text-2);">"用 SOUL.md 定义 Agent 人格太直觉了。改一个 .md 文件，Agent 性格就变了。"</div>
  <div style="font-size: 0.8rem; margin-top: 0.5rem; color: var(--vp-c-text-3);">— 场景：AI Agent 原型验证</div>
</div>

<div style="background: var(--vp-c-bg-soft); border-radius: 12px; padding: 1.2rem; border-left: 3px solid var(--vp-c-brand-1);">
  <div style="font-size: 0.9rem; font-style: italic; color: var(--vp-c-text-2);">"6 个依赖。我用一天就读完了全部源码。这在 2026 年的 JS 项目里简直是奇迹。"</div>
  <div style="font-size: 0.8rem; margin-top: 0.5rem; color: var(--vp-c-text-3);">— 场景：想 Fork 二次开发</div>
</div>

<div style="background: var(--vp-c-bg-soft); border-radius: 12px; padding: 1.2rem; border-left: 3px solid var(--vp-c-brand-1);">
  <div style="font-size: 0.9rem; font-style: italic; color: var(--vp-c-text-2);">"协作链太惊艳了。一句话触发，三个 Agent 串联干活，面板实时显示进度。"</div>
  <div style="font-size: 0.8rem; margin-top: 0.5rem; color: var(--vp-c-text-3);">— 场景：内容自动化生产</div>
</div>

</div>

</div>

<!-- Documentation Links Section -->
<div style="text-align: center; margin: 2rem 0;">
  <h2 style="border: none;">📖 深入了解</h2>
</div>

<div style="display: flex; justify-content: center; gap: 1.2rem; flex-wrap: wrap; max-width: 900px; margin: 0 auto 3rem; padding: 0 1rem;">
  <a href="/guide/quick-start" style="text-align: center; text-decoration: none; color: inherit; padding: 1rem; border-radius: 8px; background: var(--vp-c-bg-soft); min-width: 120px; flex: 1; max-width: 160px; transition: transform 0.2s, box-shadow 0.2s;">
    <div style="font-size: 1.5rem;">🚀</div>
    <div style="font-weight: 600; margin-top: 0.5rem;">快速开始</div>
    <div style="font-size: 0.8rem; color: var(--vp-c-text-2);">3 步跑起来</div>
  </a>
  <a href="/guide/soul-guide" style="text-align: center; text-decoration: none; color: inherit; padding: 1rem; border-radius: 8px; background: var(--vp-c-bg-soft); min-width: 120px; flex: 1; max-width: 160px; transition: transform 0.2s, box-shadow 0.2s;">
    <div style="font-size: 1.5rem;">📝</div>
    <div style="font-weight: 600; margin-top: 0.5rem;">SOUL.md 指南</div>
    <div style="font-size: 0.8rem; color: var(--vp-c-text-2);">写出好人格</div>
  </a>
  <a href="/guide/soul-templates" style="text-align: center; text-decoration: none; color: inherit; padding: 1rem; border-radius: 8px; background: var(--vp-c-bg-soft); min-width: 120px; flex: 1; max-width: 160px; transition: transform 0.2s, box-shadow 0.2s;">
    <div style="font-size: 1.5rem;">📋</div>
    <div style="font-weight: 600; margin-top: 0.5rem;">模板库</div>
    <div style="font-size: 0.8rem; color: var(--vp-c-text-2);">20+ 可复制模板</div>
  </a>
  <a href="/guide/recipes" style="text-align: center; text-decoration: none; color: inherit; padding: 1rem; border-radius: 8px; background: var(--vp-c-bg-soft); min-width: 120px; flex: 1; max-width: 160px; transition: transform 0.2s, box-shadow 0.2s;">
    <div style="font-size: 1.5rem;">🍳</div>
    <div style="font-weight: 600; margin-top: 0.5rem;">实战案例</div>
    <div style="font-size: 0.8rem; color: var(--vp-c-text-2);">10 个照搬方案</div>
  </a>
  <a href="/guide/comparison" style="text-align: center; text-decoration: none; color: inherit; padding: 1rem; border-radius: 8px; background: var(--vp-c-bg-soft); min-width: 120px; flex: 1; max-width: 160px; transition: transform 0.2s, box-shadow 0.2s;">
    <div style="font-size: 1.5rem;">⚔️</div>
    <div style="font-weight: 600; margin-top: 0.5rem;">平台对比</div>
    <div style="font-size: 0.8rem; color: var(--vp-c-text-2);">vs Dify/Coze</div>
  </a>
  <a href="/guide/architecture" style="text-align: center; text-decoration: none; color: inherit; padding: 1rem; border-radius: 8px; background: var(--vp-c-bg-soft); min-width: 120px; flex: 1; max-width: 160px; transition: transform 0.2s, box-shadow 0.2s;">
    <div style="font-size: 1.5rem;">🏗️</div>
    <div style="font-weight: 600; margin-top: 0.5rem;">架构设计</div>
    <div style="font-size: 0.8rem; color: var(--vp-c-text-2);">技术深度解析</div>
  </a>
  <a href="/guide/security" style="text-align: center; text-decoration: none; color: inherit; padding: 1rem; border-radius: 8px; background: var(--vp-c-bg-soft); min-width: 120px; flex: 1; max-width: 160px; transition: transform 0.2s, box-shadow 0.2s;">
    <div style="font-size: 1.5rem;">🔒</div>
    <div style="font-weight: 600; margin-top: 0.5rem;">安全与隐私</div>
    <div style="font-size: 0.8rem; color: var(--vp-c-text-2);">数据完全私有</div>
  </a>
  <a href="/guide/model-config" style="text-align: center; text-decoration: none; color: inherit; padding: 1rem; border-radius: 8px; background: var(--vp-c-bg-soft); min-width: 120px; flex: 1; max-width: 160px; transition: transform 0.2s, box-shadow 0.2s;">
    <div style="font-size: 1.5rem;">🔌</div>
    <div style="font-weight: 600; margin-top: 0.5rem;">模型配置</div>
    <div style="font-size: 0.8rem; color: var(--vp-c-text-2);">8 个 Provider</div>
  </a>
</div>

<!-- Footer -->
<div style="text-align: center; color: var(--vp-c-text-2); margin-bottom: 2rem;">
  <p><strong>虾饺 (Xiajiao)</strong> — 取名自广式点心：小巧精致，内料丰富。</p>
  <p>
    <a href="/guide/what-is-xiajiao">虾饺是什么</a> ·
    <a href="/guide/quick-start">快速开始</a> ·
    <a href="/guide/faq">常见问题</a> ·
    <a href="/guide/changelog">更新日志</a> ·
    <a href="https://github.com/moziio/xiajiao">GitHub</a>
  </p>
</div>
