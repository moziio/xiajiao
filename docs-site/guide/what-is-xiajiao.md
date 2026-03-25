---
title: What is Xiajiao — Xiajiao IM
description: "Xiajiao IM is an AI agent team collaboration platform: 6 npm dependencies, run with npm start, manage agents like coworkers."
---

# What is Xiajiao

**Xiajiao IM (虾饺)** is an **open-source AI agent team collaboration platform**.

In one sentence: **manage your AI agents the way you manage a group chat.**

You can create groups, add multiple agents (novelist, editor, translator, coding assistant, …), and talk to them with @mentions. Agents can also collaborate and hand off work to each other like a real team.

<p align="center">
  <img src="/images/hero-light-top.png" alt="Xiajiao IM interface" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>

## Xiajiao in 30 seconds

<p align="center">
  <img src="/images/demo.gif" alt="Xiajiao collaboration flow demo" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>

### Real conversation screenshots

<p align="center">
  <img src="/images/demo.png" alt="Agent conversation demo" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>

> Real conversation from the Xiajiao steward agent: automatically calling tools to query system status, show channel connection info, and present it in a structured table.

## How is it different from other platforms?

Most AI platforms are **AI application development platforms**—they help you build AI apps for end users.

Xiajiao is an **AI agent team collaboration platform**—agents are coworkers, not disposable tools.

### Design philosophy

|  | Xiajiao | Dify / FastGPT | Coze |
|--|---------|----------------|------|
| **Core idea** | Agents are “coworkers” | Agents are “apps” | Agents are “bots” |
| **Interaction** | IM group chat | Workflow canvas | Bot configuration UI |
| **Agent relationships** | Peer collaboration, mutual @mentions | Preset DAG pipelines | Independent runs |
| **Who it is for** | For yourself / personal use | End users | End users |

### Technical architecture

|  | Xiajiao | Dify | FastGPT | Coze |
|--|---------|------|---------|------|
| **Language** | JavaScript | Python | TypeScript | Closed source |
| **npm dependencies** | **6** | N/A | 100+ | N/A |
| **External services** | **0** | PostgreSQL + Redis + sandbox | MongoDB + PG + OneAPI | Cloud |
| **Start command** | `npm start` | `docker compose up` | `docker compose up` | SaaS |
| **Install** | `npm install` (6 packages) | Multi-service Docker | Multi-service Docker | Nothing to install |
| **Data stays local** | Yes, fully local | Yes, self-hosted | Yes, self-hosted | No, cloud |

::: info Complementary, not competing
Dify / FastGPT fit customer-facing AI apps. Xiajiao fits a personal or team AI collaboration space for daily use. Different scenarios, different tools.
:::

## Core capabilities

| Capability | Summary | Details |
|------------|---------|---------|
| 🤖 Multi-agent group chat | Groups + @mention routing + agent-to-agent chat | [Details](/features/multi-agent-chat) |
| 🔧 Tool calling | Seven built-in tools (search, memory, RAG, cross-agent calls, …) | [Details](/features/tool-calling) |
| 🧠 Persistent memory | Three memory types (semantic / episodic / procedural), embedding dedup | [Details](/features/agent-memory) |
| 📚 RAG knowledge base | BM25 + vector hybrid retrieval + RRF + LLM reranking | [Details](/features/rag) |
| 🔗 Collaboration flow | Chains + visual panel + human-in-the-loop | [Details](/features/collaboration-flow) |
| 🔌 Multiple models | OpenAI / Claude / Qwen / DeepSeek / Ollama, … | [Details](/guide/model-config) |

### Text-to-image (AI illustrations)

Agents such as the novelist can generate images from copy in group chat; the collaboration panel and chat show illustrations together so “text-to-image” is easy to see.

<p align="center">
  <img src="/images/summer-night-ai-art.png" alt="Collaboration chain and summer night sky AI art—stars, fireflies, moonlight, and figures on a bamboo mat" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>

## Use cases

### Case 1: AI writing team

Create a group with novelist, editor, and translator. After you set up a collaboration chain, say “write a poem” once and three agents run in sequence:

> Novelist drafts → editor polishes → translator renders English

The visual panel shows progress live. You can pause, edit, or re-run mid-flight.

### Case 2: Private knowledge assistant

Upload docs and notes to the RAG knowledge base. Agents index them; later, answers come from your material—not generic hallucination.

Good for internal tech knowledge, personal study notes, and product Q&A.

### Case 3: Compare models

Assign different models per agent: coding assistant on Claude (strong at code), translator on GPT-4o (strong at multilingual), daily helper on Qwen (cheap and sufficient). @mention several in one group and compare answers.

### Case 4: Ops automation

Use the Xiajiao steward with cron: daily 9:00 news digest, Monday weekly report template, monthly health checks.

### Case 5: Coding assistant

Coding assistant + RAG. Upload project docs and API specs so code follows your standards, not random snippets from the web.

### One-to-one chat

Open an agent from the contact list for a private thread—no group required—for Q&A and code generation.

<div style="text-align: center; margin: 1.5rem 0;">
  <img src="/images/coder-chat.png" alt="One-to-one chat with coding assistant" style="max-width: 480px; width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
  <p style="color: var(--vp-c-text-2); font-size: 0.85rem; margin-top: 0.5rem;">Real coding assistant thread—agent explains the approach then outputs runnable code</p>
</div>

## SOUL.md: define agent personas in Markdown

Each agent has a `SOUL.md` file—a Markdown “job description”:

```markdown
# 翻译官

你是一位精通中英双语的翻译专家。

## 工作原则
- 信、达、雅：忠实原意，表达通顺，语言优美
- 直接输出译文，不做逐句对照分析
- 遇到专业术语保留原文并附注中文

## 禁止事项
- 不翻译代码块中的内容
- 不要主动 @其他 Agent
```

### Why Markdown?

| Benefit | Why it matters |
|---------|----------------|
| **Simple** | Edit in any text editor—no complex UI |
| **Version control** | Git diff shows exactly what changed |
| **Shareable** | Share one `.md` file to clone a persona |
| **Portable** | Plain text, no vendor lock-in |
| **Expressive** | Headings, lists, tables, code blocks—enough for rich role specs |

## Who is it for?

| Audience | How they use it |
|----------|-----------------|
| **Indie developers** | Want an AI team without heavy DevOps |
| **AI enthusiasts** | Explore multi-agent collaboration and SOUL.md personas |
| **Small teams** | Self-hosted workspace without vendor lock-in |
| **Researchers** | Prototype agent messaging, memory, and RAG |
| **Creators** | AI writing teams and automated content pipelines |
| **Students** | Learn agent concepts with readable code |

## Technical overview

| Layer | Technology | Notes |
|-------|------------|-------|
| Runtime | Node.js 22+ | Native `node:sqlite`, no external DB |
| HTTP | `node:http` | No framework—stdlib only |
| WebSocket | `ws` | Real-time push |
| Database | SQLite | WAL + FTS5, concurrent reads and full-text search |
| Frontend | Vanilla JS + CSS | No build step — changes take effect immediately |
| npm deps | **6** | Each one justified |
| Tests | 53 unit tests | `node:test` standard library test framework |

> **Design rule**: every dependency is liability, not asset. Prefer the standard library over third-party packages.

## What happens when you send one message?

When you send `@CodingAssistant write a login API` in Xiajiao, roughly 14 steps run:

```
1. Message stored in SQLite
2. WebSocket broadcast to online clients
3. Parse @mention → target: CodingAssistant
4. Load CodingAssistant SOUL.md
5. Retrieve persistent memory ("User prefers Python; company uses Alibaba Cloud")
6. Inject memory into system prompt
7. Send full context to LLM API (streaming)
8. LLM chooses to call web_search
9. Run search → merge results into context
10. LLM continues generating code
11. Stream tokens to the browser over WebSocket
12. Store full reply in SQLite
13. CodingAssistant calls memory_write ("User needs login API")
14. If a collaboration chain exists → trigger next agent
```

The entire process is fully transparent to the user—tool-calling steps appear live in the chat UI.

## When not to use Xiajiao

Xiajiao is **not universal**. Consider alternatives for:

| Need | Suggestion | Why |
|------|------------|-----|
| Customer-facing AI apps | Dify | Workflows + API + multi-tenant |
| No self-hosting | Coze / ChatGPT Team | Managed SaaS |
| 100+ plugins | Coze | Large plugin ecosystem |
| Massive concurrency | Custom microservices | SQLite single-process limits |

See [platform comparison](/guide/comparison) for detail.

## Six dependencies—why enough?

People question “only six npm packages.” Here is why each one stays:

| Package | Role | Why not remove | Alternative |
|---------|------|----------------|-------------|
| `ws` | WebSocket server | Node has no built-in WS server | None practical |
| `formidable` | Multipart uploads | Boundary parsing and streaming not in stdlib | Hand-roll parser |
| `node-cron` | Cron scheduling | No cron expression support in stdlib | `setInterval` (weak for complex schedules) |
| `pdf-parse` | PDF text | RAG needs PDF text | Drop PDF upload |
| `@larksuiteoapi/node-sdk` | Feishu connector | Feishu WS protocol is proprietary | None |
| `@modelcontextprotocol/sdk` | MCP | JSON-RPC + capability negotiation; DIY risks incompatibility | Hand-written (risky) |

**What does a “normal” project need?**

| Project | npm dependency count | Notes |
|---------|----------------------|-------|
| Xiajiao | 6 | Stdlib first |
| Express hello world | 30+ | Framework pulls many |
| Empty Next.js | 200+ | React + toolchain |
| Dify frontend | 300+ | Full enterprise UI |

More dependencies are not “bad”—for a self-use tool, stdlib-first means smaller attack surface and fewer upgrades.

## What the name means

**Xiajiao (虾饺)** is named after the Cantonese dim sum—small, refined, rich filling. A thin wrapper around fresh shrimp.

Fewest dependencies, broadest capability—that is the idea behind Xiajiao.

## Roadmap

| Status | Item |
|--------|------|
| ✅ Done | Multi-agent chat, tool calling, persistent memory, RAG, collaboration flow, RBAC |
| 🚧 In progress | Workflow engine, agent negotiation |
| 📋 Planned | MCP tool marketplace, voice input, mobile layout |
| 🤔 Exploring | Self-improving agents, multi-tenant |

## Next steps

| You want to… | Read this |
|--------------|-----------|
| Try it now | [Quick start](/guide/quick-start) — three steps to run |
| Configure models | [Model configuration](/guide/model-config) — eight providers |
| Design agents | [SOUL.md guide](/guide/soul-guide) — strong personas |
| Copy templates | [SOUL.md templates](/guide/soul-templates) — 20 templates |
| Copy setups | [Recipes](/guide/recipes) — 12 team configs |
| Understand architecture | [Architecture](/guide/architecture) — structure and data flow |
| Compare platforms | [Comparison](/guide/comparison) — vs Dify / Coze / FastGPT |
| Security | [Security & privacy](/guide/security) — data sovereignty |
