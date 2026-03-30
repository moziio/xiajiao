---
title: "Platform comparison — Xiajiao IM"
description: "Detailed comparison of Xiajiao IM with Dify, Coze, FastGPT, and ChatGPT Team: positioning, architecture, features, and deployment."
---

# Platform comparison

Xiajiao (虾饺) and other AI platforms are not the same category. Here is a balanced comparison to help you choose.

## One-line positioning

| Platform | One-line positioning |
|----------|----------------------|
| **Xiajiao (虾饺)** | AI Agent team collaboration platform — Agents are your colleagues |
| **Dify** | AI application platform — Build user-facing AI apps |
| **Coze** | Bot builder — Build and publish AI bots |
| **FastGPT** | AI knowledge-base Q&A — Document-driven AI apps |
| **ChatGPT Team** | AI chat — Team edition of ChatGPT |

## When to choose Xiajiao (虾饺)?

✅ **Choose Xiajiao (虾饺)** when you:

- Want an AI team for yourself, not for end customers
- Dislike Docker Compose and PostgreSQL
- Want `npm start` and you are running
- Need Agents to collaborate with each other
- Care about fully private data
- Want maximum capability with minimal dependencies
- Are a Node.js developer and may fork for customization

❌ **Do not choose Xiajiao (虾饺)** when you:

- Need to build user-facing AI applications
- Need a visual workflow canvas (drag-and-drop)
- Need a 100+ plugin ecosystem
- Need enterprise multi-tenancy and SSO
- Need a mobile app (not supported yet)

## Detailed comparison

### Deployment and architecture

|  | Xiajiao (虾饺) | Dify | Coze | FastGPT |
|--|----------------|------|------|---------|
| **Start command** | `npm start` | `docker compose up` | N/A (SaaS) | `docker compose up` |
| **External dependencies** | **0** | PostgreSQL + Redis + Sandbox | — | MongoDB + PostgreSQL + OneAPI |
| **npm/pip dependencies** | **6** | 200+ Python | — | 100+ |
| **Install** | `npm install` (6 packages) | Multi-service Docker | No install | Multi-service Docker |
| **Language** | JavaScript | Python | Closed source | TypeScript |
| **Database** | SQLite (built-in) | PostgreSQL | Cloud | MongoDB + PostgreSQL |
| **Frontend** | Vanilla JS (zero build) | React | — | Next.js |
| **Resource needs** | Low (single process) | Higher (multi-service) | — | Higher (multi-service) |

### Core features

|  | Xiajiao (虾饺) | Dify | Coze | FastGPT |
|--|----------------|------|------|---------|
| **Multi-Agent group chat** | ✅ IM-style @mention | ❌ | ❌ | ❌ |
| **Agent-to-Agent collaboration** | ✅ Collaboration chain + call_agent | Workflow orchestration | Bot-to-bot calls | ❌ |
| **@mention routing** | ✅ | ❌ | ❌ | ❌ |
| **Visual panel** | ✅ Collaboration-chain status | ✅ Workflow canvas | ✅ | ✅ |
| **Persistent memory** | ✅ Three memory types | ❌ | Variables | ❌ |
| **RAG knowledge base** | ✅ BM25 + vectors + LLM rerank | ✅ | ✅ | ✅ |
| **Tool calling** | ✅ 7 built-in + HTTP tools + JS + MCP | ✅ Custom | ✅ 100+ plugins | ✅ |
| **Workflow canvas** | ❌ (collaboration chain instead) | ✅ Drag-and-drop | ✅ | ✅ |
| **SOUL.md persona** | ✅ Markdown file | System prompt | Persona config | System prompt |
| **Multiple models** | ✅ Any OpenAI-compatible API | ✅ | Limited | ✅ via OneAPI |
| **Scheduled tasks** | ✅ Cron | External trigger needed | ✅ | External trigger needed |
| **Channel integrations** | ✅ Feishu / DingTalk / WeCom / Telegram | ❌ | ✅ | ✅ |

### Data and security

|  | Xiajiao (虾饺) | Dify | Coze | FastGPT |
|--|----------------|------|------|---------|
| **Data location** | Your machine | Your machine (self-hosted) | Vendor cloud | Your machine |
| **Fully offline** | ✅ (with Ollama) | ❌ needs external services | ❌ | ❌ |
| **Open source** | ✅ MIT | ✅ Apache 2.0 | ❌ | ✅ Apache 2.0 |
| **Code size** | ~20k lines (frontend + backend) | ~50k lines | N/A | ~30k lines |
| **Auditability** | ✅ Clear structure | ⚠️ Team effort | ❌ | ⚠️ Team effort |

### Developer experience

|  | Xiajiao (虾饺) | Dify | Coze | FastGPT |
|--|----------------|------|------|---------|
| **Time to first success** | 5 minutes | 30 minutes | 10 minutes | 30 minutes |
| **Fork and customize** | Easy (JS, 6 deps) | Medium (Python, complex) | Not possible | Medium (TS, complex) |
| **Add custom tools** | HTTP tools (zero-code) / JS drop-in / MCP | API + config | Plugin development | API + config |
| **Customize Agents** | Edit `.md` files | Web UI | Web UI | Web UI |
| **Tests** | 53 unit tests | ✅ | N/A | ✅ |

## Scenario recommendations

### “I want an AI team for myself”

**Recommendation: Xiajiao (虾饺)**

Reason: IM-style interaction is intuitive; Agents can collaborate; `npm start` and go.

### “I want to build a customer-facing AI app”

**Recommendation: Dify**

Reason: Strong workflow, API publishing, multi-tenancy. Xiajiao (虾饺) is not designed for this.

### “I want a quick knowledge-base Q&A bot”

**Recommendation: FastGPT or Dify**

Reason: Mature RAG + workflow + publishing. Xiajiao (虾饺) RAG is oriented more toward personal use.

### “I do not want to self-host”

**Recommendation: Coze or ChatGPT Team**

Reason: SaaS, no ops. Xiajiao (虾饺), Dify, and FastGPT imply running your own server.

### “I want fully offline and fully private”

**Recommendation: Xiajiao (虾饺) + Ollama**

Reason: Xiajiao (虾饺) + Ollama can run with zero external connections. Other stacks still depend on PostgreSQL, Redis, etc.

### “I am a Node.js developer and want to learn or contribute”

**Recommendation: Xiajiao (虾饺)**

Reason: Six dependencies, clear structure, clear modules.

## Cost comparison

### Deployment cost

| Platform | Minimum hardware | Notes |
|----------|------------------|-------|
| Xiajiao (虾饺) | Modest (single process + SQLite) | No external services, small footprint |
| Dify | Higher (PostgreSQL + Redis) | Multi-service |
| FastGPT | Higher (MongoDB + PostgreSQL) | Multi-service |
| Coze | N/A | SaaS, no server cost |

The learning curve for Xiajiao (虾饺) is gentle because the core interaction is “chat in IM” — if you can use a messenger, you can use Xiajiao (虾饺).

## In fairness

What Xiajiao (虾饺) does **not** have:

- Drag-and-drop workflow canvas
- 100+ plugin ecosystem
- Enterprise multi-tenancy and SSO
- Full API publishing workflow
- Mobile app
- Massive concurrency (single-process SQLite)

Some of these are on the roadmap but are not the core direction. The core of Xiajiao (虾饺) is: **minimal dependencies, IM-style multi-Agent team collaboration.**

## Migrating to Xiajiao (虾饺)

### From ChatGPT

1. Install Xiajiao (虾饺) (three commands)
2. Add your OpenAI API key in model settings
3. Create custom Agents and move your Custom Instructions into `SOUL.md`
4. Enjoy multi-Agent collaboration and persistent memory

### From Dify

1. Export System Prompts from Dify → convert to `SOUL.md`
2. Export knowledge-base documents → upload to Xiajiao (虾饺) RAG
3. Workflows → Xiajiao (虾饺) collaboration chains (linear) or manual @mention

### Using together

Xiajiao (虾饺) does not conflict with other platforms:

- **Xiajiao (虾饺)** for day-to-day AI teamwork (for you)
- **Dify** for customer-facing AI apps
- **Coze** for bots on social platforms

## Decision tree

```
Do you need AI capabilities?
├── For users/customers → Dify / FastGPT (end-user AI apps)
└── For yourself / internal team
    ├── Need drag-and-drop workflow canvas? → Dify
    ├── Need minimal deploy + multi-Agent collaboration? → Xiajiao (虾饺)
    ├── Need social-platform bots? → Coze
    └── Need fully offline? → Xiajiao (虾饺) + Ollama
```

## Related docs

- [Quick start](/guide/quick-start) — Try Xiajiao (虾饺)
- [Security and privacy](/guide/security) — Data safety details
- [Architecture](/guide/architecture) — Implementation
- [Recipes](/guide/recipes) — Concrete scenarios
- [Glossary](/guide/glossary) — Terminology
