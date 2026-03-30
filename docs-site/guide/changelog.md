---
title: "Changelog — Xiajiao IM"
description: "Release history for Xiajiao IM: features, improvements, and fixes."
---

# Changelog

## v1.1.0 — 2026-03-24

### New features

- **HTTP custom tools** — zero-code HTTP API → Agent tool bridge. Configure any REST API as a callable tool in **Settings → HTTP Tools** with `{{param}}` interpolation, custom headers, body templates, and response extraction. No code, no restart.
- **Tool auto-register architecture** — drop a `.js` file into `server/services/tools/` or `data/custom-tools/` and it auto-registers on startup. `toolRegistry.autoRegisterTools()` replaces manual `registerTool()` calls.
- **Tool registry refactor** — centralized `server/services/tool-registry.js` manages global tool registration, per-agent allow/deny lists, and LLM schema conversion.
- **Settings API for HTTP tools** — full CRUD + test endpoints for managing HTTP custom tools via REST API.
- **HTTP tools management UI** — create, edit, delete, and test HTTP tools from the web frontend.

### Improvements

- **Dockerfile optimization** — switched base image from `node:22-alpine` to `node:22-slim` for better compatibility. Selective `COPY` of specific directories replaces `COPY . .` for smaller, more secure images. Added `NODE_ENV=production` default. Single volume `/app/data`.
- **`.dockerignore` update** — explicitly include `data/channel-presets` in Docker builds.

### Fixes

- **Channel session agent sync** — fixed `agent_id` not syncing in sessions when channel configuration changes.
- **External channel map refresh** — frontend now refreshes the external channel map after channel create/update/delete operations.

---

## v1.0.0 — 2026-03-19

First public release.

### Highlights

- **Multi-agent chat** — groups, multiple agents, @mention routing  
- **Collaboration chains** — ordered handoffs and full auto-pipelines  
- **Live panel** — per-step status and outputs  
- **Tool calling** — seven built-in tools with full LLM loop  
  - `web_search` (six engines, automatic failover)  
  - `rag_query` (BM25 + vectors + RRF + LLM rerank)  
  - `memory_write` / `memory_search` (three memory types)  
  - `call_agent` (nested calls with depth guard)  
  - `manage_channel` (Feishu / DingTalk / WeCom / Telegram connectors)  
  - `manage_schedule` (Cron schedules)  
- **Durable memory** — semantic / episodic / procedural with embedding dedupe and optional auto-inject  
- **RAG** — layered chunking (~200 / ~800 chars) and three-stage retrieval  
- **SOUL.md** — Markdown-defined personas  
- **Models** — OpenAI, Claude, Qwen, DeepSeek, Kimi, GLM, Ollama, OpenRouter, …  

### Technical notes

- Six npm dependencies, no mandatory external services  
- Node.js 22+ with `node:sqlite`  
- SQLite WAL + FTS5  
- Vanilla JS frontend (no bundler)  
- 53 `node:test` unit tests  
- PWA-friendly offline shell  
- English + Chinese docs  
- RBAC (four roles)  
- CSRF hooks + rate limits  
- Optional Docker packaging  

### Bundled agent personas

- 🤖 Xiajiao Butler — housekeeping, channels, schedules  
- ✍️ Novelist — creative writing  
- 📝 Editor — polish and grammar  
- 🌐 Translator — bilingual translation  
- 💻 Code assistant — full-stack help  

### Documentation site

VitePress site with GitHub Actions deployment:

| Section | Pages | Topics |
|---------|-------|--------|
| Getting started | 4 | Overview, quick start, install, models |
| Guides | 7 | SOUL.md, templates, recipes, comparison, security, architecture, migration |
| Reference | 5 | API, performance, troubleshooting, FAQ, glossary |
| Features | 6 | Chat, tools, memory, RAG, collaboration, integrations |
| Deployment | 3 | Local, Docker, cloud |
| Development | 2 | Developer guide, changelog |
| Site | 1 | VitePress home |
| **Total** | **28** | **~7000 lines of Markdown** |

---

## Roadmap

### Near term (v1.2 – v1.3)

| Status | Item | Notes | Target |
|--------|------|-------|--------|
| In progress | Workflow engine | Branching, errors, loops, canvas | v1.2 |
| In progress | Agent negotiation | Structured debates, voting, summaries | v1.2 |
| Planned | More channels | WeCom, DingTalk, Telegram parity | v1.2 |
| Planned | Search upgrades | Global history filters | v1.3 |
| Planned | Agent import/export | Share SOUL.md + settings bundles | v1.3 |

### Mid term (v1.3 – v2.0)

| Status | Item | Notes |
|--------|------|-------|
| Planned | MCP marketplace | Community tools |
| Planned | Voice input | Whisper-style STT |
| Planned | Mobile polish | Responsive + PWA improvements |
| Planned | Vision | GPT-4V / Claude vision, OCR |
| Planned | Agent template hub | One-click clones |

### Long term (v2.0+)

| Status | Item | Notes |
|--------|------|-------|
| Exploring | Self-tuning agents | Feedback-driven SOUL updates |
| Exploring | Multi-tenant SaaS | Isolated tenants |
| Exploring | Electron shell | Desktop client + tray |
| Exploring | Plugin runtime | Hot-loaded user tools |
| Exploring | Org charts | Hierarchy, projects, delegated roles |

---

## Contributing

Xiajiao is MIT-licensed. Contributions welcome:

- **Bugs:** [GitHub Issues](https://github.com/moziio/xiajiao/issues)  
- **Ideas:** [GitHub Discussions](https://github.com/moziio/xiajiao/discussions)  
- **Code:** fork → branch → PR — see [Developer guide](/guide/dev-guide)  
- **Docs:** “Edit on GitHub” links on each page  
- **Templates:** share SOUL.md presets with the community  

Stars on GitHub help others discover the project.

## Related docs

- [Developer guide](/guide/dev-guide)
- [Quick start](/guide/quick-start)
- [Installation](/guide/installation)
- [API reference](/guide/api-reference)
- [FAQ](/guide/faq)
