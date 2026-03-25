---
title: Quick start — Xiajiao IM
description: "Three steps to run: git clone → npm install → npm start. Launch your AI agent team in about 30 seconds."
---

# Quick start

Three steps—about 30 seconds—to run your AI agent team.

## Requirements

- **Node.js >= 22.0.0** ([download](https://nodejs.org/))

::: tip Why Node.js 22?
Xiajiao uses the built-in `node:sqlite` module in Node.js 22, so you do not install a separate database. That is how it keeps zero external dependencies.
:::

## Step 1: Clone the repo

```bash
git clone https://github.com/moziio/xiajiao.git
cd xiajiao
```

## Step 2: Install dependencies

```bash
npm install
```

Only six packages—usually five to ten seconds.

<details>
<summary>What are the six dependencies?</summary>

| Package | Role | Why keep it |
|---------|------|-------------|
| `ws` | WebSocket server | Node has no WS server in stdlib |
| `formidable` | Multipart uploads | Boundary splitting and streaming for `multipart/form-data` not in stdlib |
| `node-cron` | Cron scheduling | Cron expressions (e.g. `0 9 * * 1` → Monday 9:00) not in stdlib |
| `pdf-parse` | PDF text | [RAG knowledge base](/features/rag) needs PDF text |
| `@larksuiteoapi/node-sdk` | Feishu connector | Feishu’s long-lived WebSocket protocol needs the official SDK |
| `@modelcontextprotocol/sdk` | MCP | JSON-RPC + capability negotiation; DIY is fragile |

</details>

## Step 3: Start

```bash
npm start
```

Success looks like:

```
Server running on http://localhost:18800
```

Open `http://localhost:18800` in a browser—you should see the login screen:

<p align="center">
  <img src="/images/login.png" alt="Xiajiao login screen" style="max-width: 400px; width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>

## Step 4: Configure the LLM

Base URLs, model names, and troubleshooting: [Model configuration](/guide/model-config).

1. Log in with the default password `admin`
2. Go to **Settings → Model management**
3. Add your LLM API key

### Supported providers

Xiajiao supports any OpenAI-compatible API. Common providers:

| Provider | API base URL | API type | Cost (rough) |
|----------|--------------|----------|----------------|
| **OpenAI** | `https://api.openai.com/v1` | `openai-completions` | $5–60 / M tokens |
| **Anthropic** | `https://api.anthropic.com` | `anthropic-messages` | $3–75 / M tokens |
| **Qwen (DashScope)** | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `openai-completions` | CN¥0.3–60 / M tokens |
| **DeepSeek** | `https://api.deepseek.com` | `openai-completions` | CN¥1–16 / M tokens |
| **Kimi (Moonshot)** | `https://api.moonshot.cn/v1` | `openai-completions` | CN¥12 / M tokens |
| **GLM (Zhipu)** | `https://open.bigmodel.cn/api/paas/v4` | `openai-completions` | CN¥1–100 / M tokens |
| **Ollama** | `http://localhost:11434/v1` | `openai-completions` | **Free** (local) |
| **OpenRouter** | `https://openrouter.ai/api/v1` | `openai-completions` | Per model |

::: tip Saving money
- **Free**: Ollama locally (Llama 3, Qwen 2, …—plan for 8GB+ VRAM)
- **Very cheap**: DeepSeek / Qwen—small spend goes far
- **Best quality**: Claude Opus / GPT-4o for serious writing and coding
:::

::: info Ollama locally
To avoid API bills, use [Ollama](https://ollama.com/) for open models:

```bash
ollama pull llama3.1      # download model
ollama pull qwen2.5       # or Qwen
```

In Xiajiao set API base URL to `http://localhost:11434/v1`; API key can be empty.
:::

### Configuration walkthrough

1. Click **Add configuration**
2. **Provider name**—any label (e.g. “Qwen”)
3. **API base URL**—from the table above
4. **API key**—from the vendor console
5. **Default model**—e.g. `qwen-turbo`, `gpt-4o`
6. **Save**

Then assign provider + model per agent:

```
Settings → Agents → Coding assistant → Model: pick "Qwen / qwen-plus"
```

::: tip Mix models
Different agents can use different models, for example:
- Coding assistant → Claude
- Translator → GPT-4o
- Casual chat → Qwen (cheap)
:::

## Step 5: Start chatting

After models are configured:

### One-to-one

Click any agent in the left contact list:

| Agent | Good for |
|-------|----------|
| 🤖 Xiajiao steward | “Set a daily 9:00 cron job” |
| ✍️ Novelist | “Write a poem about spring” |
| 📝 Editor | “Polish this copy” |
| 🌐 Translator | “Translate this to English” |
| 💻 Coding assistant | “Write a Python crawler” |

### Group collaboration

1. In contacts, click **New group**
2. Add several agents
3. Use `@AgentName` to target one agent

```
You: @Novelist write a poem about moonlight
Novelist: [reply in your language...]

You: @Translator translate that poem to English
Translator: The moonlight gently graces my windowsill...
```

### Collaboration chains

In group settings, define a chain for automatic handoff:

```
Novelist → Editor → Translator
```

One message from you can run all three in order.

## Sanity checks

You are good if:

- [x] `http://localhost:18800` loads
- [x] Password login works
- [x] Settings save LLM config
- [x] Agents reply in chat
- [x] Tool calls appear in the reply (when tools are enabled)

## Common issues

### Port in use

```
Error: listen EADDRINUSE :::18800
```

Use another port:

```bash
IM_PORT=3000 npm start
```

### Wrong Node.js version

```bash
node -v
# upgrade if below v22.0.0
```

See [Installation](/guide/installation).

### Change the password?

Set an environment variable at startup:

```bash
OWNER_KEY=your-strong-password npm start
```

### HTTPS?

Xiajiao serves HTTP only. For production, put Nginx (or similar) in front with TLS. See [Cloud deployment](/deployment/cloud).

### Agent not replying?

1. Check LLM config (API key / base URL)
2. Check the browser console for errors
3. Confirm the agent has a model assigned

## Recommended first-hour path

After installation, follow this order to explore Xiajiao's core features:

### Five minutes (basics)

1. Open **Coding assistant**, send a message
2. Watch streaming output
3. Paste code and ask for a review

### Fifteen minutes (multi-agent)

4. Create a group: novelist + editor + translator
5. Set chain: novelist → editor → translator
6. Send one prompt and watch the handoff
7. Watch the visual panel state

### Thirty minutes (custom agents)

8. Create a new agent from contacts
9. Edit its [SOUL.md](/guide/soul-guide) (see [templates](/guide/soul-templates))
10. Attach tools and a model
11. Chat and tune SOUL.md

<div style="text-align: center; margin: 1.5rem 0;">
  <img src="/images/agent-management.png" alt="Agent management—new agent and list" style="max-width: 480px; width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
  <p style="color: var(--vp-c-text-2); font-size: 0.85rem; margin-top: 0.5rem;">Agent management—manage the list; use the form below to create agents</p>
</div>

### One hour (team setup)

12. Upload docs to the RAG knowledge base
13. Add cron jobs (e.g. daily news digest)
14. Try setups from [Recipes](/guide/recipes)

## Next steps

| You want… | Read this |
|-----------|-----------|
| Detailed install | [Installation](/guide/installation) — Windows / macOS / Linux |
| Group chat | [Multi-agent chat](/features/multi-agent-chat) — groups and @mentions |
| More models | [Model configuration](/guide/model-config) — eight providers |
| Docker | [Docker deployment](/deployment/docker) |
| Personas | [SOUL.md guide](/guide/soul-guide) |
| Copy setups | [Recipes](/guide/recipes) — 12 team configs |
| Problems | [Troubleshooting](/guide/troubleshooting) |

## Related docs

- [Model configuration](/guide/model-config) — provider URLs, model IDs, checklists
- [SOUL.md guide](/guide/soul-guide) — roles and skills
- [Recipes](/guide/recipes) — twelve copy-paste team configs
