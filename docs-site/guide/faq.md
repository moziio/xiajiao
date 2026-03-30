---
title: "FAQ — Xiajiao IM"
description: "Frequently asked questions about installing, configuring, and running Xiajiao IM."
---

# FAQ

## Basics

### Is Xiajiao IM free?

Yes. MIT license—use, modify, and ship commercially.

### How is Xiajiao different from ChatGPT / Claude?

ChatGPT / Claude are **single-agent chats**. Xiajiao is a **multi-agent workspace** where agents can collaborate.

| Aspect | ChatGPT / Claude | Xiajiao |
|--------|------------------|---------|
| Agents | One | Unlimited |
| Collaboration | No | Yes (@mention + chains) |
| Long-term memory | Limited | Three-type durable memory |
| Data | Cloud | Fully local |
| Models | Fixed catalog | Any compatible API |
| Cost | Subscription | Your API spend |

### How is Xiajiao different from Dify / Coze / FastGPT?

**Positioning**

- **Dify / FastGPT:** build end-user AI apps  
- **Coze:** build and publish bots  
- **Xiajiao:** run an **agent team** as coworkers, not as a packaged SaaS product  

**Architecture**

| Aspect | Xiajiao | Dify | FastGPT |
|--------|---------|------|---------|
| External services | **None** (embedded SQLite) | Postgres + Redis + sandbox | Mongo + Postgres + OneAPI |
| npm deps | 6 | N/A (Python) | N/A |
| Deploy | `npm start` | `docker compose up` | `docker compose up` |

### Do I need a GPU?

No for Xiajiao—it calls remote LLMs. **Ollama** locally can use a GPU (or large RAM); that is separate from Xiajiao.

### Which models are supported?

Any OpenAI-compatible endpoint, including OpenAI, Anthropic (via adapters), Qwen, DeepSeek, Moonshot/Kimi, Zhipu GLM, Ollama, OpenRouter, etc. See [Model configuration](/guide/model-config).

## Installation

### Why Node.js 22+?

`node:sqlite` ships in Node 22, so no external database daemon is required—core to the “zero external services” design.

### Slow `npm install`

Only six packages; slowness is usually network. Try a mirror:

```bash
npm config set registry https://registry.npmmirror.com
npm install
```

### No Git?

Download the ZIP from GitHub → extract → `npm install && npm start`.

### Windows build errors

```powershell
npm install --global windows-build-tools
npm install
```

## Usage

### Agent not answering

1. Settings → Models — keys and base URL  
2. Agent has an assigned model  
3. Browser console (F12)  
4. Server logs  

### Create a custom agent

Contacts → New agent → name, emoji, model, tools, SOUL.md.

### How to write SOUL.md

Markdown “job description”:

```markdown
# Role name

One-line charter.

## Core skills
- Skill one
- Skill two

## Principles
- Rule one

## Output format
- Formatting rules
```

Be specific; vague instructions produce vague behavior.

### Remember my preferences?

1. Enable `autoInjectMemory` plus `memory_write` / `memory_search`  
2. Or state preferences explicitly so the agent stores them  

See [Agent memory](/features/agent-memory).

### Upload documents

Web UI → agent workspace. PDF, TXT, Markdown supported. Pipeline: parse → chunk → embed → index. Retrieval via `rag_query`.

### Multi-agent automation

1. **Chains** — order agents in a group  
2. **@mention** — route each message  
3. **`call_agent`** — agent invokes another agent  

See [Collaboration flow](/features/collaboration-flow).

### Message history

Persisted in SQLite (`data/xiajiao.db`) with FTS5 search.

## Security & privacy

### Where is data?

On your disk: messages in `data/xiajiao.db`, memory per workspace, uploads in `public/uploads/`. No Xiajiao-hosted relay.

### API key safety?

Stored locally; sent only to the provider you configured.

### Multi-user safety?

Password auth via `OWNER_KEY`—fine for trusted small teams. For the public internet add strong secrets, HTTPS, and IP restrictions if possible.

### Does open-sourcing expose my data?

No. `data/` and secrets belong in `.gitignore`.

## Technical choices

### Why SQLite instead of PostgreSQL?

Zero separate DB service, WAL concurrency, FTS5, easy backup (copy a file), plenty for small/medium teams.

### Why Vanilla JS instead of React/Vue?

No build step, tiny footprint, IM UI does not need a heavy component framework.

### Why not Express/Koa/Fastify?

`node:http` covers ~15 endpoints—fewer dependencies and less attack surface.

### MCP support?

Xiajiao acts as an MCP client. Connect external MCP servers (stdio or HTTP transport) in **Settings → MCP**; their tools auto-register as `mcp:{serverId}:{toolName}` and become available to Agents.

### Can I fork and extend?

Yes—MIT, clear layout under `server/routes`, `server/services`, `public/`. See GitHub `CONTRIBUTING.md` and [Developer guide](/guide/dev-guide).

## Operations

### Different models per agent

Set per agent in the UI (e.g. code → Sonnet, translation → GPT-4o, chores → Qwen Turbo). See [Model configuration](/guide/model-config).

### Backup / migrate

```bash
tar czf xiajiao-backup.tar.gz data/ public/uploads/
scp xiajiao-backup.tar.gz new-server:/opt/
ssh new-server "cd /opt && tar xzf xiajiao-backup.tar.gz"
```

### SQLite concurrency

WAL handles small teams (roughly 1–50 users) comfortably. For larger teams prefer SSD, periodic `VACUUM`, and static caching via Nginx.

### Upgrade

```bash
cd xiajiao
git pull
npm install
pm2 restart xiajiao
```

`data/` is preserved.

### Forgot password

```bash
OWNER_KEY="new-password" npm start
```

Password lives in the environment, not the DB.

### Inspect memories

```bash
sqlite3 data/workspace-{agentId}/memory.db \
  "SELECT type, content, created_at FROM memories ORDER BY created_at DESC LIMIT 20;"
```

### Fully air-gapped?

Yes—Xiajiao + local Ollama. Install deps on a networked machine once, copy the tree inward, run Ollama locally. See [Security](/guide/security).

## Advanced development

### Add an HTTP route

Edit the relevant module under `server/routes/` and register it from `server/router.js`. Restart Node.

### Add a custom tool

Three methods:

1. **HTTP custom tools (zero-code)**: Settings → HTTP Tools — configure any REST API as an Agent tool with `{{param}}` interpolation, no code needed
2. **JS auto-register**: drop a `.js` file into `server/services/tools/` or `data/custom-tools/` — auto-registered on startup
3. **MCP bridged**: connect external MCP servers in Settings → MCP

See [Tool calling — Custom tools](/features/tool-calling#custom-tools) and [Developer guide](/guide/dev-guide).

### Database schema?

[API reference — database tables](/guide/api-reference#database-schema).

### Automate via HTTP

```bash
curl -c cookies.txt -X POST http://localhost:18800/api/login \
  -H "Content-Type: application/json" -d '{"password":"admin"}'

curl -b cookies.txt -X POST http://localhost:18800/api/messages \
  -H "Content-Type: application/json" \
  -d '{"channelId":"ch_xxx","content":"@Code assistant daily summary","type":"text"}'
```

### Cron-style automation

Use `manage_schedule` from an agent, or describe schedules in SOUL.md.

## Related docs

- [Quick start](/guide/quick-start)
- [Model configuration](/guide/model-config)
- [Multi-agent chat](/features/multi-agent-chat)
- [Troubleshooting](/guide/troubleshooting)
- [Security](/guide/security)
- [Comparison](/guide/comparison)
- [API reference](/guide/api-reference)
- [Glossary](/guide/glossary)
