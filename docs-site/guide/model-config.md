---
title: Model configuration — Xiajiao IM
description: "LLM setup for OpenAI, Claude, Qwen, DeepSeek, Ollama, and more: base URLs, API types, and troubleshooting."
---

# Model configuration

Xiajiao supports any OpenAI-compatible API. This page covers major providers. If you have not run the app yet, start with [Quick start](/guide/quick-start). After models work, tune personas and tokens with the [SOUL.md guide](/guide/soul-guide).

<div style="text-align: center; margin: 1.5rem 0;">
  <img src="/images/settings-panel.png" alt="Global settings—theme, language, default LLM" style="max-width: 480px; width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
  <p style="color: var(--vp-c-text-2); font-size: 0.85rem; margin-top: 0.5rem;">Global settings—theme, language, and default LLM model</p>
</div>

<div style="text-align: center; margin: 1.5rem 0;">
  <img src="/images/agent-profile.png" alt="Agent card—per-agent model selector" style="max-width: 480px; width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
  <p style="color: var(--vp-c-text-2); font-size: 0.85rem; margin-top: 0.5rem;">Agent card—dropdown to assign a model per agent</p>
</div>

## Where to configure

After login:

```
Settings → Model management → Add configuration
```

Each provider needs:

| Field | Notes |
|-------|--------|
| **Name** | Any label (e.g. “Qwen”) |
| **API base URL** | Provider endpoint |
| **API key** | Secret from vendor |
| **API type** | `openai-completions` or `anthropic-messages` |
| **Default model** | Default model id for that provider |

## OpenAI

| Field | Value |
|-------|--------|
| API base URL | `https://api.openai.com/v1` |
| API type | `openai-completions` |
| Keys | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |

### Suggested models

| Model | Notes | Price |
|-------|--------|-------|
| `gpt-4o` | Flagship, multimodal | $5/M in, $15/M out |
| `gpt-4o-mini` | Lightweight, good value | $0.15/M in, $0.6/M out |
| `gpt-4-turbo` | Previous flagship | $10/M in, $30/M out |
| `o1` | Reasoning-focused | $15/M in, $60/M out |

### Practices

- Daily chat: `gpt-4o-mini`
- Hard tasks: `gpt-4o`
- Code: `gpt-4o`

## Anthropic (Claude)

| Field | Value |
|-------|--------|
| API base URL | `https://api.anthropic.com` |
| API type | `anthropic-messages` |
| Keys | [console.anthropic.com](https://console.anthropic.com/) |

::: warning API type
Claude must use `anthropic-messages`, not `openai-completions`.
:::

### Suggested models

| Model | Notes | Price |
|-------|--------|-------|
| `claude-sonnet-4-20250514` | Strong code and reasoning | $3/M in, $15/M out |
| `claude-3-5-haiku-20241022` | Fast, smaller | $1/M in, $5/M out |
| `claude-opus-4-20250514` | Maximum reasoning | $15/M in, $75/M out |

### Practices

- Code: Claude Sonnet
- Long writing: Sonnet (large context)
- Budget: Haiku

## Qwen (Alibaba DashScope)

| Field | Value |
|-------|--------|
| API base URL | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| API type | `openai-completions` |
| Keys | [dashscope.console.aliyun.com](https://dashscope.console.aliyun.com/) |

### Suggested models

| Model | Notes | Price |
|-------|--------|-------|
| `qwen-max` | Flagship | CN¥20/M in, CN¥60/M out |
| `qwen-plus` | Balanced | CN¥0.8/M in, CN¥2/M out |
| `qwen-turbo` | Fast, cheap | CN¥0.3/M in, CN¥0.6/M out |
| `qwen-long` | Long context | CN¥0.5/M in, CN¥2/M out |

### Practices

- Daily: `qwen-turbo`
- Harder work: `qwen-plus`
- Best quality: `qwen-max`

::: tip New accounts
Qwen often offers free credits for new signups—check the vendor site.
:::

## DeepSeek

| Field | Value |
|-------|--------|
| API base URL | `https://api.deepseek.com` |
| API type | `openai-completions` |
| Keys | [platform.deepseek.com](https://platform.deepseek.com/) |

### Suggested models

| Model | Notes | Price |
|-------|--------|-------|
| `deepseek-chat` | General chat | CN¥1/M in, CN¥2/M out |
| `deepseek-coder` | Code | CN¥1/M in, CN¥2/M out |
| `deepseek-reasoner` | Reasoning | CN¥4/M in, CN¥16/M out |

### Practices

- Strong price/performance vs flagship Western models
- Code: `deepseek-coder`
- Chat: `deepseek-chat`

## Kimi (Moonshot)

| Field | Value |
|-------|--------|
| API base URL | `https://api.moonshot.cn/v1` |
| API type | `openai-completions` |
| Keys | [platform.moonshot.cn](https://platform.moonshot.cn/) |

### Suggested models

| Model | Notes | Price |
|-------|--------|-------|
| `moonshot-v1-8k` | 8K context | CN¥12 / M tokens |
| `moonshot-v1-32k` | 32K | CN¥24 / M tokens |
| `moonshot-v1-128k` | 128K | CN¥60 / M tokens |

### Practices

- Default: 8K
- Long docs: 128K

## GLM (Zhipu)

| Field | Value |
|-------|--------|
| API base URL | `https://open.bigmodel.cn/api/paas/v4` |
| API type | `openai-completions` |
| Keys | [open.bigmodel.cn](https://open.bigmodel.cn/) |

### Suggested models

| Model | Notes | Price |
|-------|--------|-------|
| `glm-4-plus` | Flagship | CN¥50 / M tokens |
| `glm-4-flash` | Fast | **Free** |
| `glm-4-long` | Long text | CN¥1 / M tokens |

::: tip Free tier
`glm-4-flash` is free—good for experiments and light use.
:::

## Ollama (local)

| Field | Value |
|-------|--------|
| API base URL | `http://localhost:11434/v1` |
| API type | `openai-completions` |
| API key | Omit or use a placeholder like `ollama` |

### Install Ollama

```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows: installer from https://ollama.com/download
```

### Pull models

```bash
ollama pull llama3.1          # Llama 3.1 8B
ollama pull qwen2.5           # Qwen 2.5
ollama pull mistral           # Mistral 7B
ollama pull codellama         # Code-focused
ollama pull deepseek-coder-v2
```

### Hardware

| Size | Min VRAM | Comfortable VRAM |
|------|----------|------------------|
| 7B | 4GB | 8GB |
| 13B | 8GB | 16GB |
| 70B | 40GB | 48GB+ |

CPU-only works but is slow.

### Practices

- Free, private, offline-friendly
- Privacy-sensitive workloads
- ~8B models run well on consumer GPUs
- Chinese: `qwen2.5` is a solid default

## OpenRouter

| Field | Value |
|-------|--------|
| API base URL | `https://openrouter.ai/api/v1` |
| API type | `openai-completions` |
| Keys | [openrouter.ai/keys](https://openrouter.ai/keys) |

One key routes to many models—handy if you switch often.

### Example model ids

```
openai/gpt-4o
anthropic/claude-3.5-sonnet
google/gemini-pro-1.5
meta-llama/llama-3.1-70b-instruct
```

## Multiple providers

Xiajiao can keep several providers and assign different models per agent.

### Example mix

| Agent | Provider | Model | Rationale |
|-------|----------|-------|-----------|
| 🤖 Xiajiao steward | Qwen | qwen-turbo | Simple ops, low cost |
| ✍️ Novelist | Claude | claude-sonnet | Quality writing |
| 📝 Editor | DeepSeek | deepseek-chat | Cheap text work |
| 🌐 Translator | OpenAI | gpt-4o | Strong multilingual |
| 💻 Coding assistant | Claude | claude-sonnet | Strong code |

### Budget-first

| Agent | Provider | Model | Rough monthly |
|-------|----------|-------|---------------|
| All | Qwen | qwen-turbo | < CN¥5 |

### Quality-first

| Role | Provider | Model | Rough monthly |
|------|----------|-------|---------------|
| Creative | Claude | claude-sonnet | ~$10 |
| Tools | OpenAI | gpt-4o | ~$10 |

### Free stack

| Agent | Provider | Model |
|-------|----------|-------|
| All | Ollama | qwen2.5 / llama3.1 |

## Cost tips

### Principles

1. Match model to task—not everything needs GPT-4o or Claude Opus
2. Cheap models for translation, summary, format tweaks; premium for creation, code, hard reasoning
3. Tighter [SOUL.md](/guide/soul-guide) → fewer prompt tokens each call

### Example cost for one “500-word tech post” prompt

| Model | Input tok | Output tok | Rough cost |
|-------|-----------|------------|------------|
| GPT-4o | ~800 | ~600 | ~$0.012 |
| Claude Sonnet | ~800 | ~600 | ~$0.009 |
| DeepSeek Chat | ~800 | ~600 | ~CN¥0.004 |
| Qwen Turbo | ~800 | ~600 | ~CN¥0.003 |
| Ollama | ~800 | ~600 | CN¥0 |

### Example routing

```
Steward (ops) → Qwen Turbo
Translator → DeepSeek Chat
Coding assistant → Claude Sonnet
Casual agent → Ollama qwen2.5
```

### Reduce token usage

1. Shorten [SOUL.md](/guide/soul-guide)—roughly ~1 token per word saved
2. Limit memory injection: e.g. `AUTO_MEMORY_TOP_K=3`
3. Disable unused tools—each tool adds ~100–200 tokens in definitions
4. Start fresh threads when history grows too long

## Troubleshooting

### Invalid API key

**Symptom**: `401 Unauthorized`

**Fix**: Re-copy the key (no spaces), confirm it is active.

### Wrong base URL

**Symptom**: `ECONNREFUSED` or `404`

**Fix**: Check trailing paths:

- Wrong: `https://api.openai.com` (missing `/v1`)
- Right: `https://api.openai.com/v1`
- Wrong: `http://localhost:11434` (Ollama needs `/v1`)
- Right: `http://localhost:11434/v1`

### Wrong model name

**Symptom**: `model not found`

**Fix**: Match vendor spelling exactly—case-sensitive.

### Claude fails

**Symptom**: errors from Anthropic

**Fix**: Type must be `anthropic-messages`, not `openai-completions`.

### Ollama connection refused

**Symptom**: `ECONNREFUSED`

**Fix**:

1. `ollama list` — daemon running
2. Default port 11434
3. Remote Ollama: bind `0.0.0.0` if Xiajiao runs on another host

### Quick verification checklist

```
✅ OpenAI-compatible URLs end with /v1 where required
✅ API key has no spaces or line breaks
✅ Model id matches provider docs
✅ API type correct (Anthropic → anthropic-messages, else openai-completions)
✅ Test agent sends one message successfully
```

## Related docs

- [Quick start](/guide/quick-start) — install to first reply
- [SOUL.md guide](/guide/soul-guide) — personas and token use
- [Multi-agent chat](/features/multi-agent-chat)
- [Performance](/guide/performance)
- [Glossary](/guide/glossary)
- [FAQ](/guide/faq)
