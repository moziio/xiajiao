---
title: "Collaboration Flow — Xiajiao (虾饺) IM"
description: "Collaboration chains for automatic handoffs, a live visual panel, human-in-the-loop steps, and one-message Agent pipelines."
---

# Collaboration flow

Xiajiao (虾饺) collaboration flow lets multiple Agents **hand off automatically**—send one message and the whole pipeline runs.

<p align="center">
  <img src="/images/collab-flow.png" alt="Multi-agent collaboration — poem plus ink-style illustration and team summary" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>
<p align="center" style="color: var(--vp-c-text-2);">
  <em>Real case: Novelist finishes copy, ink-style art generates, team summary follows.</em>
</p>

## What is collaboration flow?

Collaboration flow = **collaboration chain** + **visual panel**.

- **Chain**: define Agent order in a group; messages flow automatically  
- **Panel**: live status, outputs, and progress per Agent  

<p align="center">
  <img src="/images/collab-flow-running.png" alt="Collaboration flow panel — running" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>
<p align="center" style="color: var(--vp-c-text-2);">
  <em>Running: Novelist (15s done) → Translator (in progress) → Publish, 33%. The top panel shows each node.</em>
</p>

You instruct the first Agent; the rest run in sequence with full visibility. Works best with groups and @mention from [Multi-agent group chat](/features/multi-agent-chat).

<p align="center">
  <img src="/images/poem-with-ai-art.png" alt="Chain and chat together — poem request with illustration on-chain" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>
<p align="center" style="color: var(--vp-c-text-2);">
  <em>Chain state and chat together: @Novelist poem + art shows chain progress and Agent output (including later image gen).</em>
</p>

## vs manual @mention

| Dimension | Manual @mention | Collaboration flow |
|-----------|-----------------|---------------------|
| Trigger | You @ each Agent | One user message |
| Flow | Independent replies | Previous output feeds next |
| Visibility | Thread only | Live panel + thread |
| Human steps | @ anytime | Pause/confirm between nodes |
| Best for | Ad hoc work | Repeatable pipelines |

## Collaboration chain

### Configuration

In group settings, define order:

```
Novelist → Editor → Translator
```

Each arrow means: when the previous Agent finishes, its output is passed to the next.

### Example run

```
You: Write a poem about moonlight

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  ✍️ Novelist │ ──→ │  📝 Editor   │ ──→ │  🌐 Translator │
│             │     │             │     │             │
│ Write poem  │     │ Polish      │     │ EN translate│
│ Done        │     │ Running     │     │ Waiting     │
└─────────────┘     └─────────────┘     └─────────────┘
```

**What happens**

1. **Novelist** gets “Write a poem about moonlight” and writes.  
2. Text goes to **Editor** with context: “Novelist produced the following—please polish.”  
3. Polished text goes to **Translator** with context: “Translate the polished poem to English.”  
4. Final: original + polished + English.  

<p align="center">
  <img src="/images/hero-light-translation.png" alt="Translator outputs English poem" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>
<p align="center" style="color: var(--vp-c-text-2);">
  <em>Translator handoff in the chain — “Beneath the Stars”</em>
</p>

<div style="text-align: center; margin: 1.5rem 0;">
  <img src="/images/poetry-translation-light.png" alt="Light mode — Novelist then Translator" style="max-width: 480px; width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
  <p style="color: var(--vp-c-text-2); font-size: 0.85rem; margin-top: 0.5rem;">Light mode — Novelist writes, Translator follows to English</p>
</div>

### Context passed along

Each Agent sees prior output **and** chain metadata:

```
[Collaboration chain context]
Chain: Novelist → Editor → Translator
Step: 2 of 3 (Editor)
User original: Write a poem about moonlight
Previous (Novelist):
  Moonlight spills across the yard,
  pale light miles wide, no sleep tonight...

Complete your task based on the above content.
```

## Visual panel

While the chain runs, a live panel shows state per node.

### Node states

| State | Icon | Meaning |
|-------|------|---------|
| Waiting | Gray | Not started |
| Running | Blue animation | In progress |
| Done | Green | Output ready |
| Error | Red | Failed |

### Panel features

| Feature | Description |
|---------|-------------|
| **Progress** | Which step is active |
| **Intermediate output** | Expand a node to read full text |
| **Timing** | Per-node duration |
| **Stop** | Abort the whole chain |
| **History** | Past chain runs |

## Human in the loop

Flows are not fire-and-forget—you can step in at key points.

### Confirm before continue

```
Novelist (done) → [wait for you] → Editor → Translator
```

If the poem is wrong:

- **Edit and continue** — fix Novelist’s text, then let Editor proceed  
- **Stop** — end the chain  
- **Regenerate** — ask Novelist to rewrite  

### Edit intermediate results

```
1. Novelist finishes ✅
2. You dislike line 2 — edit it manually
3. Edited text goes to Editor
4. Editor keeps polishing
```

Design goal: **AI handles 80% of the heavy lifting; you control the key decision points.**

## Scenarios

### 1. Content pipeline

```
Chain: Novelist → Editor → Translator

You: Write an article about remote work (~800 words CN)
→ Novelist drafts
→ Editor restructures and polishes
→ Translator produces English
→ Bilingual article
```

### 2. Code review

```
Chain: Code assistant → Editor

You: Write an Express JWT auth middleware
→ Code assistant writes code + comments
→ Editor checks style and docs
```

### 3. Research brief

```
Chain: Code assistant → Translator

You: Survey top CSS frameworks in 2024
→ Code assistant searches and summarizes
→ Translator outputs English for global forums
```

### 4. Support

```
Chain: Code assistant (RAG) → Editor (tone)

Customer: How does your API paginate?
→ Code assistant pulls from KB
→ Editor turns it into a friendly reply
```

## Chain design tips

### Length

| Length | Guidance |
|--------|----------|
| 2 Agents | Most common, fast |
| 3 Agents | Good for content pipelines |
| 4+ | Each hop adds latency |

### Roles

- **First**: producer (write, retrieve, code)  
- **Middle**: processors (edit, review)  
- **Last**: publishers (translate, format)  

### Mix with manual @mention

Same group can have:

- A chain for standard flows  
- @mention for one-offs  
- Side @mentions while a chain runs  

## Workflow engine (roadmap)

A full workflow engine is on the roadmap—more powerful than linear chains:

| Capability | Chain (today) | Workflow engine (planned) |
|------------|-----------------|---------------------------|
| Topology | Linear | DAG |
| Branching | No | Yes |
| Loops | No | Retries / iterations |
| Errors | Stop | Retry / skip / rollback |
| Human approval | Simple pause | Full approval flows |
| Variables | Output → input | Structured variables |

::: info Why chains first?
Chains cover 80% of real use cases, are trivial to configure, and are easy to reason about. The workflow engine targets advanced automation after chains mature.
:::

## Setup checklist

### Step 1: Create a group

In Contacts, **New group**—e.g. “Writing studio.” If groups are new, read [Multi-agent group chat](/features/multi-agent-chat).

### Step 2: Add Agents

Add Novelist, Editor, Translator, etc.

### Step 3: Set the chain

In group settings:

```
Chain: Novelist → Editor → Translator
Leader: Novelist (default receiver)
```

### Step 4: Test

Send a message and watch the panel:

```
Panel:
├── Novelist generating (3.2s)
├── Editor   waiting
└── Translator waiting

Novelist done:
├── Novelist done (5.1s)
├── Editor   generating (1.5s)
└── Translator waiting

All done:
├── Novelist done (5.1s)
├── Editor   done (3.2s)
└── Translator done (4.8s)
Total: 13.1s
```

### Performance

Chains are serial: total time ≈ sum of steps.

| Tip | Detail |
|-----|--------|
| Fast models for non-critical hops | Editor/Translator on mini models; creator on stronger model |
| Tight SOUL.md | ~500 chars per Agent |
| Shorter intermediate outputs | Faster next hop |
| Less memory inject mid-chain | Middle steps often need no long history |

## Related docs

- [Multi-agent group chat](/features/multi-agent-chat) — groups and @mention  
- [Recipes](/guide/recipes) — writing studio, code review chains  
- [Tool Calling](/features/tool-calling)  
- [Agent persistent memory](/features/agent-memory)  
- [SOUL.md guide](/guide/soul-guide) — behavior inside chains  
- [Templates](/guide/soul-templates)  
- [Platform comparison](/guide/comparison) — Xiajiao (虾饺) vs Dify vs Coze vs FastGPT  
