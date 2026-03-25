---
title: "Migration guide — Xiajiao IM"
description: "Step-by-step migration from ChatGPT, Dify, Coze, and FastGPT to Xiajiao IM."
---

# Migration guide

Move from other AI platforms to Xiajiao while keeping agent definitions and knowledge bases.

## From ChatGPT

Custom Instructions / GPTs → Xiajiao SOUL.md + Agents.

### Steps

1. **Install Xiajiao** (~30 seconds)

```bash
git clone https://github.com/moziio/xiajiao.git
cd xiajiao && npm install && npm start
```

2. **Configure OpenAI API key**

Settings → Model management → Add OpenAI → paste key → pick a model (e.g. `gpt-4o`).

3. **Migrate Custom Instructions**

Copy ChatGPT Custom Instructions into SOUL.md:

| ChatGPT | Xiajiao SOUL.md |
|---------|-----------------|
| "What would you like ChatGPT to know about you?" | `## User context` |
| "How would you like ChatGPT to respond?" | `## Output rules` |

**Example Custom Instructions:**

```
I'm a Python developer. I use FastAPI and PostgreSQL.
Keep responses concise. Use code blocks for code.
```

**As SOUL.md:**

```markdown
# Code assistant

You are a senior Python backend engineer.

## User context
- Python developer
- Stack: FastAPI + PostgreSQL

## Output rules
- Keep replies concise
- Use fenced code blocks
- Prefer Python examples
```

4. **Migrate GPTs**

Each GPT → one Xiajiao agent. GPT Instructions → SOUL.md; GPT Knowledge → RAG uploads.

### What you gain

| Capability | ChatGPT | Xiajiao |
|------------|---------|---------|
| Multi-agent teamwork | No | Yes (@mention + chains) |
| Agent-to-agent chat | No | Yes (`call_agent`) |
| Durable memory | Limited | Three-type + embedding dedup |
| Data locality | Cloud | Fully local |
| Cost | ~$20/mo | MIT + your API usage |
| Model choice | Fixed | Any compatible model |

## From Dify

Dify Apps / Workflows → Xiajiao agents + collaboration chains.

### Steps

1. **Export the system prompt** from Dify app settings.

2. **Turn it into SOUL.md**

Structure the prompt in Markdown:

```markdown
# [Agent name]

[First paragraph as role description]

## Working principles
[Rules from the Dify prompt]

## Output format
[Format requirements from the prompt]
```

3. **Migrate the knowledge base**

Export documents (PDF/TXT) from Dify → upload to the agent’s RAG workspace. Xiajiao re-chunks and indexes automatically.

4. **Migrate workflows**

| Dify | Xiajiao |
|------|---------|
| Linear workflow | Collaboration chain |
| Branches | Leader agent routing |
| LLM node | Agent |
| Retrieval node | `rag_query` tool |
| HTTP node | Custom tool |

::: warning Note
Dify’s visual workflow canvas has no 1:1 equivalent. Complex branching is expressed via the leader agent’s SOUL.md routing logic.
:::

### Trade-offs

| You lose | You gain |
|----------|----------|
| Drag-and-drop canvas | IM-style multi-agent chat |
| Hosted API product | Agent collaboration chains |
| Multi-tenant SaaS | Three-type durable memory |
| — | No external infra |
| — | Fully offline capable (+ Ollama) |

## From Coze

Coze Bot → Xiajiao agent.

### Steps

1. **Export bot settings**

Copy persona → SOUL.md; download knowledge docs → upload to Xiajiao RAG.

2. **Replace plugins**

| Coze plugin | Xiajiao |
|-------------|---------|
| Search | `web_search` |
| Knowledge | `rag_query` |
| Scheduled triggers | `manage_schedule` |
| Others | Custom tools |

Coze has 100+ plugins; Xiajiao ships seven built-ins. Heavy plugin reliance may be a poor fit.

3. **Models**

Coze often uses ByteDance models; on Xiajiao you can use any supported provider.

## From FastGPT

Knowledge apps → Xiajiao agent + RAG.

### Steps

1. Export KB documents → upload to Xiajiao  
2. Copy system prompt → SOUL.md  
3. Workflows → chains (linear) + leader routing (branches)

## Universal migration checklist

- Install and run Xiajiao  
- Configure at least one LLM provider  
- Create agents with SOUL.md  
- Upload knowledge (if any)  
- Smoke-test chat  
- Configure collaboration chains if needed  
- Verify memory over several turns  
- Set up schedules if needed  
- Configure backups  

## Related docs

- [Quick start](/guide/quick-start)
- [SOUL.md guide](/guide/soul-guide)
- [SOUL.md templates](/guide/soul-templates)
- [Model configuration](/guide/model-config)
- [Platform comparison](/guide/comparison)
- [Recipes](/guide/recipes)
