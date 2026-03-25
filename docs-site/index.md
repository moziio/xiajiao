---
layout: home
hero:
  name: Xiajiao IM
  text: AI Agent Team Collaboration
  tagline: 6 deps, npm start — manage your AI agents like managing a team
  image:
    src: /images/hero-light-top.png
    alt: Xiajiao IM — Multi-Agent Group Chat
  actions:
    - theme: brand
      text: Quick Start →
      link: /guide/quick-start
    - theme: alt
      text: Recipes
      link: /guide/recipes
    - theme: alt
      text: GitHub
      link: https://github.com/moziio/xiajiao
features:
  - icon: 🤖
    title: Multi-Agent Chat
    details: Create groups, add agents, @mention for precise routing. Agents talk to each other and collaborate like a real team.
    link: /features/multi-agent-chat
    linkText: Learn more
  - icon: 🔧
    title: Tool Calling
    details: 7 built-in tools (6 categories) — web search, RAG retrieval, memory read/write, cross-agent calls, channel management, scheduled tasks.
    link: /features/tool-calling
    linkText: Learn more
  - icon: 🧠
    title: Persistent Memory
    details: Three-category memory (semantic / episodic / procedural), embedding dedup. The more you use an agent, the better it knows you.
    link: /features/agent-memory
    linkText: Learn more
  - icon: 📚
    title: RAG Knowledge Base
    details: BM25 + vector hybrid retrieval + RRF + LLM re-ranking. Upload docs, agents auto-index and auto-retrieve.
    link: /features/rag
    linkText: Learn more
  - icon: ⚡
    title: Minimal Setup
    details: 6 npm deps, zero external services. No Docker, PostgreSQL, or Redis needed — just npm start.
    link: /deployment/local
    linkText: Deploy guide
  - icon: 🔗
    title: Collaboration Flow
    details: Auto-relay collaboration chains + real-time visual panel + human intervention. One message triggers the entire agent pipeline.
    link: /features/collaboration-flow
    linkText: Learn more
---

<!-- Demo Section -->
<div style="text-align: center; margin: 3rem 0 1rem;">
  <h2 style="border: none;">💬 Drive Your Agent Team Through Chat</h2>
  <p style="color: var(--vp-c-text-2);">Chat with agents via IM — they auto-invoke tools, query status, manage channels — all visible in real time.</p>
</div>

<p align="center">
  <img src="/images/demo.gif" alt="Xiajiao IM — Collaboration Flow Demo" style="max-width: 800px; width: 100%; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.12);" />
</p>

<!-- Key Metrics -->
<div style="display: flex; justify-content: center; gap: 3rem; margin: 3rem 0; flex-wrap: wrap;">
  <div style="text-align: center;">
    <div style="font-size: 2rem; font-weight: bold; color: var(--vp-c-brand);">6</div>
    <div style="color: var(--vp-c-text-2); font-size: 0.9rem;">npm deps</div>
  </div>
  <div style="text-align: center;">
    <div style="font-size: 2rem; font-weight: bold; color: var(--vp-c-brand);">0</div>
    <div style="color: var(--vp-c-text-2); font-size: 0.9rem;">external services</div>
  </div>
  <div style="text-align: center;">
    <div style="font-size: 2rem; font-weight: bold; color: var(--vp-c-brand);">7</div>
    <div style="color: var(--vp-c-text-2); font-size: 0.9rem;">built-in tools</div>
  </div>
  <div style="text-align: center;">
    <div style="font-size: 2rem; font-weight: bold; color: var(--vp-c-brand);">53</div>
    <div style="color: var(--vp-c-text-2); font-size: 0.9rem;">unit tests</div>
  </div>
</div>

<!-- Quick Start Section -->
<div style="text-align: center; margin: 3rem 0 1rem;">
  <h2 style="border: none;">🚀 Up and Running in 30 Seconds</h2>
</div>

<div style="max-width: 600px; margin: 0 auto 1rem; padding: 0 1rem;">

```bash
git clone https://github.com/moziio/xiajiao.git
cd xiajiao && npm install   # 6 deps, done in seconds
npm start                    # Open http://localhost:18800
```

</div>

<div style="text-align: center; color: var(--vp-c-text-2); margin-bottom: 2rem;">
  <p>No Docker, no PostgreSQL / Redis (built-in SQLite), no extra env vars. Just these three lines.</p>
</div>

<!-- Use Cases Section -->
<div style="text-align: center; margin: 3rem 0 1rem;">
  <h2 style="border: none;">💡 What It Feels Like</h2>
</div>

<div style="max-width: 700px; margin: 0 auto 3rem; padding: 0 1rem;">

<div style="background: var(--vp-c-bg-soft); border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem;">

**🎭 Scenario 1: AI Writing Studio**

Group: Novelist + Editor + Translator | Chain: auto-relay

```
You: Write an essay about indie developers
→ Novelist writes 800-word Chinese essay
→ Editor auto-relays to polish
→ Translator auto-translates to English
→ 2 min, bilingual masterpiece ready
```

</div>

<div style="background: var(--vp-c-bg-soft); border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem;">

**📖 Scenario 2: Private Knowledge Assistant**

Agent tools: RAG + Persistent Memory

```
You: Upload API docs to knowledge base
You: How do I call the payment API?
→ Agent retrieves from YOUR docs → accurate answer, no hallucination
```

</div>

<div style="background: var(--vp-c-bg-soft); border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem;">

**⚔️ Scenario 3: Multi-Model Arena**

3 agents, same SOUL.md, different models

```
You: @GPT @Claude @Qwen Explain attention mechanism
→ Three models answer side by side
→ Compare quality, depth, style at a glance
```

</div>

<p style="text-align: center;"><a href="/guide/recipes">See all 12 recipes →</a></p>

</div>

<!-- Real Screenshots Section -->
<div style="text-align: center; margin: 3rem 0 1rem;">
  <h2 style="border: none;">📸 Real Screenshots</h2>
  <p style="color: var(--vp-c-text-2);">These are from a live Xiajiao instance, not mockups.</p>
</div>

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; max-width: 900px; margin: 0 auto 3rem; padding: 0 1rem;">
  <div>
    <img src="/images/summer-night-ai-art.png" alt="Collaboration chain + AI-generated summer night art" style="width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
    <p style="text-align: center; font-size: 0.85rem; color: var(--vp-c-text-2);">Collaboration chain + AI art generation</p>
  </div>
  <div>
    <img src="/images/hero-light-middle.png" alt="Group chat @mention routing" style="width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
    <p style="text-align: center; font-size: 0.85rem; color: var(--vp-c-text-2);">Group chat @mention routing</p>
  </div>
  <div>
    <img src="/images/poetry-translation-light.png" alt="Poetry writing + translation relay" style="width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
    <p style="text-align: center; font-size: 0.85rem; color: var(--vp-c-text-2);">Poetry + auto-translation relay</p>
  </div>
  <div>
    <img src="/images/hero-light-bottom.png" alt="AI creative group chat" style="width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
    <p style="text-align: center; font-size: 0.85rem; color: var(--vp-c-text-2);">Agent poetry + AI image generation</p>
  </div>
  <div>
    <img src="/images/news-agent.png" alt="News Agent" style="width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
    <p style="text-align: center; font-size: 0.85rem; color: var(--vp-c-text-2);">News Agent — search & structured output</p>
  </div>
</div>

<!-- Why Xiajiao Technical Highlights -->
<div style="text-align: center; margin: 3rem 0 1rem;">
  <h2 style="border: none;">🔬 Why So Lightweight?</h2>
  <p style="color: var(--vp-c-text-2); max-width: 600px; margin: 0 auto;">Where others use frameworks, Xiajiao uses Node.js standard libraries. Where others need external services, Xiajiao uses SQLite.</p>
</div>

<div style="max-width: 700px; margin: 0 auto 3rem; padding: 0 1rem;">

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">

<div style="background: var(--vp-c-bg-soft); border-radius: 12px; padding: 1.2rem;">
  <div style="font-weight: 700; margin-bottom: 0.5rem;">🚫 No Express</div>
  <div style="font-size: 0.85rem; color: var(--vp-c-text-2);"><code>node:http</code> handles 15 endpoints. One less dep = one less security risk.</div>
</div>

<div style="background: var(--vp-c-bg-soft); border-radius: 12px; padding: 1.2rem;">
  <div style="font-weight: 700; margin-bottom: 0.5rem;">🚫 No PostgreSQL</div>
  <div style="font-size: 0.85rem; color: var(--vp-c-text-2);"><code>node:sqlite</code> built-in DB. WAL for concurrent reads, FTS5 for full-text search.</div>
</div>

<div style="background: var(--vp-c-bg-soft); border-radius: 12px; padding: 1.2rem;">
  <div style="font-weight: 700; margin-bottom: 0.5rem;">🚫 No React/Vue</div>
  <div style="font-size: 0.85rem; color: var(--vp-c-text-2);">Vanilla JS frontend. Edit code, refresh browser — no Webpack build step.</div>
</div>

<div style="background: var(--vp-c-bg-soft); border-radius: 12px; padding: 1.2rem;">
  <div style="font-weight: 700; margin-bottom: 0.5rem;">🚫 No Jest</div>
  <div style="font-size: 0.85rem; color: var(--vp-c-text-2);"><code>node:test</code> runs 53 tests. Zero test deps, zero config files.</div>
</div>

</div>

<p style="text-align: center; margin-top: 1rem;"><a href="/guide/architecture">See full architecture →</a></p>

</div>

<!-- Comparison Section -->
<div style="text-align: center; margin: 2rem 0;">
  <h2 style="border: none;">🏗️ How It Compares</h2>
</div>

<div style="max-width: 700px; margin: 0 auto 3rem; padding: 0 1rem;">

| Dimension | Xiajiao | Dify / FastGPT |
|-----------|---------|----------------|
| Install | `npm start` | `docker compose up` (needs PostgreSQL + Redis) |
| Deps | 6 npm packages | Multiple packages + external services |
| Agent UX | IM group chat + @mention | Workflow canvas |
| Agent Relations | Equal collaboration, mutual @mention | Predefined DAG pipelines |
| Data Storage | Fully local SQLite | Requires DB config |
| Philosophy | Agents are your colleagues | Agents are your apps |

</div>

<!-- SOUL.md Section -->
<div style="text-align: center; margin: 2rem 0;">
  <h2 style="border: none;">📝 SOUL.md — Define Agents with Markdown</h2>
</div>

<div style="max-width: 600px; margin: 0 auto 1rem; padding: 0 1rem;">

```markdown
# Translator

You are a bilingual translation expert (Chinese ↔ English).

## Principles
- Faithfulness, expressiveness, elegance
- Output translation directly, no word-by-word analysis

## Restrictions
- Do not translate content inside code blocks
- Do not proactively @mention other agents
```

</div>

<div style="text-align: center; color: var(--vp-c-text-2); margin-bottom: 1rem;">
  <p>Share a single <code>.md</code> file to clone an agent's personality. Git version control, diffs at a glance.</p>
  <p><a href="/guide/soul-guide">SOUL.md writing guide →</a></p>
</div>

<!-- Model Support Section -->
<div style="text-align: center; margin: 3rem 0 1rem;">
  <h2 style="border: none;">🔌 All Major Models Supported</h2>
</div>

<div style="max-width: 600px; margin: 0 auto 2rem; padding: 0 1rem;">

| Provider | Models | Highlights |
|----------|--------|------------|
| OpenAI | GPT-4o / o1 | Most comprehensive |
| Anthropic | Claude Sonnet / Opus | Code king |
| Qwen | Qwen Max / Turbo | Chinese optimized, low cost |
| DeepSeek | Chat / Coder / Reasoner | Best value |
| Ollama | Llama 3 / Qwen 2 | **Completely free**, runs locally |
| OpenRouter | 100+ model aggregator | One key for all |

</div>

<div style="text-align: center; color: var(--vp-c-text-2); margin-bottom: 3rem;">
  <p>Different agents can use different models — Claude for coding, GPT-4o for translation, Qwen for daily chat.</p>
  <p><a href="/guide/model-config">Full model config guide →</a></p>
</div>

<!-- FAQ Highlights Section -->
<div style="text-align: center; margin: 2rem 0;">
  <h2 style="border: none;">❓ Common Questions</h2>
</div>

<div style="max-width: 700px; margin: 0 auto 2rem; padding: 0 1rem;">

<details style="background: var(--vp-c-bg-soft); border-radius: 8px; padding: 1rem 1.5rem; margin-bottom: 0.5rem;">
<summary style="font-weight: 600; cursor: pointer;">How is Xiajiao different from ChatGPT / Claude?</summary>
<p style="margin-top: 0.5rem; color: var(--vp-c-text-2);">ChatGPT is "one AI chatting". Xiajiao is "a team of AIs collaborating" — you create multiple agents, each with their own personality and skills, they @mention each other in groups and auto-relay. All data stays on your machine.</p>
</details>

<details style="background: var(--vp-c-bg-soft); border-radius: 8px; padding: 1rem 1.5rem; margin-bottom: 0.5rem;">
<summary style="font-weight: 600; cursor: pointer;">Is it free?</summary>
<p style="margin-top: 0.5rem; color: var(--vp-c-text-2);">Xiajiao is fully open source (MIT). You only pay for LLM API calls — use Ollama local models and even that's free.</p>
</details>

<details style="background: var(--vp-c-bg-soft); border-radius: 8px; padding: 1rem 1.5rem; margin-bottom: 0.5rem;">
<summary style="font-weight: 600; cursor: pointer;">How does it compare to Dify?</summary>
<p style="margin-top: 0.5rem; color: var(--vp-c-text-2);">Dify is an "AI app development platform" — for building AI products for end users. Xiajiao is "agent team collaboration" — agents are your colleagues. <a href="/guide/comparison">Detailed comparison →</a></p>
</details>

<details style="background: var(--vp-c-bg-soft); border-radius: 8px; padding: 1rem 1.5rem; margin-bottom: 0.5rem;">
<summary style="font-weight: 600; cursor: pointer;">Is it secure? Where does my data go?</summary>
<p style="margin-top: 0.5rem; color: var(--vp-c-text-2);">All data stored locally. Zero telemetry. The only external communication is the LLM API you configure. Use Ollama = fully offline. <a href="/guide/security">Security details →</a></p>
</details>

<p style="text-align: center;"><a href="/guide/faq">See 30+ FAQs →</a></p>

</div>

<!-- Footer -->
<div style="text-align: center; color: var(--vp-c-text-2); margin-bottom: 2rem;">
  <p><strong>Xiajiao (虾饺)</strong> — named after the Cantonese shrimp dumpling: small, delicate, packed with flavor.</p>
  <p>
    <a href="/guide/what-is-xiajiao">What is Xiajiao</a> ·
    <a href="/guide/quick-start">Quick Start</a> ·
    <a href="/guide/faq">FAQ</a> ·
    <a href="/guide/changelog">Changelog</a> ·
    <a href="https://github.com/moziio/xiajiao">GitHub</a>
  </p>
</div>
