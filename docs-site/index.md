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
      text: 快速开始
      link: /guide/quick-start
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
    details: 三分类记忆系统（语义 / 情景 / 程序性），embedding 去重 + 混合搜索，Agent 越用越懂你。
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
    details: 协作链自动接力 + 可视化面板实时状态 + 人工干预节点。一句话触发整条 Agent 流水线。
    link: /features/collaboration-flow
    linkText: 了解更多
---

<div style="text-align: center; margin: 3rem 0 1rem;">
  <h2 style="border: none;">🎬 一句话触发 Agent 协作链</h2>
  <p style="color: var(--vp-c-text-2);">创作 → 编辑 → 翻译，全自动接力。35 秒看完完整流程：</p>
</div>

<p align="center">
  <img src="/images/demo.gif" alt="虾饺 IM — 协作流演示" style="max-width: 800px; width: 100%; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.12);" />
</p>

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

<div style="text-align: center; margin: 2rem 0;">
  <h2 style="border: none;">🏗️ 不像其他平台</h2>
</div>

<div style="max-width: 700px; margin: 0 auto 3rem; padding: 0 1rem;">

| 维度 | 虾饺 | Dify / FastGPT |
|------|------|----------------|
| 安装 | `npm start` | `docker compose up`（需 PostgreSQL + Redis） |
| 依赖 | 6 个 npm 包 | 几百个包 + 多个外部服务 |
| 镜像 | ~150MB | ~2GB+ |
| Agent 交互 | IM 群聊 @mention | 工作流画布 |
| Agent 关系 | 平等协作 | 预设管线 |
| 数据 | 完全本地 SQLite | 需配置数据库 |

</div>

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
```

</div>

<div style="text-align: center; color: var(--vp-c-text-2); margin-bottom: 1rem;">
  <p>分享一个 <code>.md</code> 文件就能克隆一个 Agent 人格。Git 版本控制，diff 一目了然。</p>
</div>

<div style="text-align: center; margin: 3rem 0 1rem;">
  <h2 style="border: none;">🔌 支持所有主流模型</h2>
</div>

<div style="max-width: 500px; margin: 0 auto 2rem; padding: 0 1rem;">

| Provider | 代表模型 |
|----------|---------|
| OpenAI | GPT-4o / GPT-4o-mini |
| Anthropic | Claude Sonnet / Opus |
| 通义千问 | Qwen Max / Plus / Turbo |
| DeepSeek | DeepSeek Chat / Coder |
| Ollama | Llama 3 / Qwen 2 / Mistral |
| OpenRouter | 100+ 模型聚合 |

</div>

<div style="text-align: center; color: var(--vp-c-text-2); margin-bottom: 3rem;">
  <p>不同 Agent 可以用不同模型 — 代码助手用 Claude，翻译官用 GPT-4o，日常聊天用通义。</p>
  <p><a href="/guide/model-config">查看完整模型配置教程 →</a></p>
</div>

<div style="text-align: center; color: var(--vp-c-text-2); margin-bottom: 2rem;">
  <p><strong>虾饺 (Xiajiao)</strong> — 取名自广式点心：小巧精致，内料丰富。</p>
  <p>
    <a href="/guide/what-is-xiajiao">虾饺是什么</a> ·
    <a href="/guide/quick-start">快速开始</a> ·
    <a href="/guide/faq">常见问题</a> ·
    <a href="https://github.com/moziio/xiajiao">GitHub</a>
  </p>
</div>
