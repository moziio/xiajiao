---
title: 模型配置 — 虾饺 IM
description: 详细的 LLM 模型配置教程，涵盖 OpenAI、Claude、通义千问、DeepSeek、Ollama 等。
---

# 模型配置大全

虾饺支持所有 OpenAI 兼容 API 的模型。本页提供每个主流 Provider 的详细配置方法。若尚未本地跑通服务，请先 [快速开始](/guide/quick-start)。配好模型后若要精简人格与省 token，可配合 [SOUL.md 编写指南](/guide/soul-guide) 调整各 Agent 的 `SOUL.md`。

<div style="text-align: center; margin: 1.5rem 0;">
  <img src="/images/settings-panel.png" alt="全局设置面板 — 主题、语言与默认 LLM 模型" style="max-width: 480px; width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
  <p style="color: var(--vp-c-text-2); font-size: 0.85rem; margin-top: 0.5rem;">全局设置面板 — 可切换主题、语言，并选择默认 LLM 模型</p>
</div>

<div style="text-align: center; margin: 1.5rem 0;">
  <img src="/images/agent-profile.png" alt="Agent 名片 — 模型选择器为每个 Agent 指定独立模型" style="max-width: 480px; width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
  <p style="color: var(--vp-c-text-2); font-size: 0.85rem; margin-top: 0.5rem;">Agent 名片 — 模型选择器下拉菜单支持为每个 Agent 指定独立模型</p>
</div>

## 配置入口

登录虾饺后，进入：

```
设置 → 模型管理 → 添加配置
```

每个 Provider 需要填写：

| 字段 | 说明 |
|------|------|
| **名称** | 随便取，方便识别（如"通义千问"） |
| **API Base URL** | Provider 的 API 地址 |
| **API Key** | 认证密钥 |
| **API 类型** | `openai-completions` 或 `anthropic-messages` |
| **默认模型** | 该 Provider 下的默认模型名 |

## OpenAI

| 字段 | 值 |
|------|------|
| API Base URL | `https://api.openai.com/v1` |
| API 类型 | `openai-completions` |
| 获取 Key | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |

### 推荐模型

| 模型 | 特点 | 价格 |
|------|------|------|
| `gpt-4o` | 最新旗舰，多模态 | $5/M input, $15/M output |
| `gpt-4o-mini` | 轻量版，性价比高 | $0.15/M input, $0.6/M output |
| `gpt-4-turbo` | 上一代旗舰 | $10/M input, $30/M output |
| `o1` | 推理增强 | $15/M input, $60/M output |

### 最佳实践

- 日常聊天：`gpt-4o-mini`（便宜够用）
- 复杂任务：`gpt-4o`
- 代码生成：`gpt-4o`（代码能力强）

## Anthropic（Claude）

| 字段 | 值 |
|------|------|
| API Base URL | `https://api.anthropic.com` |
| API 类型 | `anthropic-messages` |
| 获取 Key | [console.anthropic.com](https://console.anthropic.com/) |

::: warning API 类型
Claude 必须选择 `anthropic-messages` 类型，不是 `openai-completions`。
:::

### 推荐模型

| 模型 | 特点 | 价格 |
|------|------|------|
| `claude-sonnet-4-20250514` | 旗舰模型，代码和推理极强 | $3/M input, $15/M output |
| `claude-3-5-haiku-20241022` | 轻量快速 | $1/M input, $5/M output |
| `claude-opus-4-20250514` | 最强推理 | $15/M input, $75/M output |

### 最佳实践

- 代码生成：Claude Sonnet（公认代码能力最强的模型之一）
- 长文写作：Claude Sonnet（200K 上下文窗口）
- 省钱：Claude Haiku

## 通义千问（阿里云）

| 字段 | 值 |
|------|------|
| API Base URL | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| API 类型 | `openai-completions` |
| 获取 Key | [dashscope.console.aliyun.com](https://dashscope.console.aliyun.com/) |

### 推荐模型

| 模型 | 特点 | 价格 |
|------|------|------|
| `qwen-max` | 旗舰 | ¥20/M input, ¥60/M output |
| `qwen-plus` | 平衡 | ¥0.8/M input, ¥2/M output |
| `qwen-turbo` | 快速便宜 | ¥0.3/M input, ¥0.6/M output |
| `qwen-long` | 长文本 | ¥0.5/M input, ¥2/M output |

### 最佳实践

- 日常使用：`qwen-turbo`（几分钱一天）
- 复杂任务：`qwen-plus`（性价比最高）
- 最高质量：`qwen-max`

::: tip 新用户福利
通义千问新注册用户通常有免费额度，具体以官网为准。
:::

## DeepSeek

| 字段 | 值 |
|------|------|
| API Base URL | `https://api.deepseek.com` |
| API 类型 | `openai-completions` |
| 获取 Key | [platform.deepseek.com](https://platform.deepseek.com/) |

### 推荐模型

| 模型 | 特点 | 价格 |
|------|------|------|
| `deepseek-chat` | 通用对话 | ¥1/M input, ¥2/M output |
| `deepseek-coder` | 代码专精 | ¥1/M input, ¥2/M output |
| `deepseek-reasoner` | 推理增强 | ¥4/M input, ¥16/M output |

### 最佳实践

- **性价比之王**：DeepSeek 的价格只有 GPT-4o 的 1/10，但质量接近
- 代码任务用 `deepseek-coder`
- 日常聊天用 `deepseek-chat`

## Kimi（月之暗面）

| 字段 | 值 |
|------|------|
| API Base URL | `https://api.moonshot.cn/v1` |
| API 类型 | `openai-completions` |
| 获取 Key | [platform.moonshot.cn](https://platform.moonshot.cn/) |

### 推荐模型

| 模型 | 特点 | 价格 |
|------|------|------|
| `moonshot-v1-8k` | 8K 上下文 | ¥12/M tokens |
| `moonshot-v1-32k` | 32K 上下文 | ¥24/M tokens |
| `moonshot-v1-128k` | 128K 上下文 | ¥60/M tokens |

### 最佳实践

- 日常使用 8K 版本
- 长文档处理用 128K 版本

## GLM（智谱）

| 字段 | 值 |
|------|------|
| API Base URL | `https://open.bigmodel.cn/api/paas/v4` |
| API 类型 | `openai-completions` |
| 获取 Key | [open.bigmodel.cn](https://open.bigmodel.cn/) |

### 推荐模型

| 模型 | 特点 | 价格 |
|------|------|------|
| `glm-4-plus` | 旗舰 | ¥50/M tokens |
| `glm-4-flash` | 快速免费 | **免费** |
| `glm-4-long` | 长文本 | ¥1/M tokens |

::: tip 免费模型
`glm-4-flash` 完全免费，适合尝试和轻度使用。
:::

## Ollama（本地模型）

| 字段 | 值 |
|------|------|
| API Base URL | `http://localhost:11434/v1` |
| API 类型 | `openai-completions` |
| API Key | 不需要（留空或填 `ollama`） |

### 安装 Ollama

```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows
# 从 https://ollama.com/download 下载安装包
```

### 下载模型

```bash
ollama pull llama3.1         # Meta Llama 3.1（8B）
ollama pull qwen2.5          # 通义千问 2.5
ollama pull mistral          # Mistral 7B
ollama pull codellama        # 代码专精
ollama pull deepseek-coder-v2 # DeepSeek Coder V2
```

### 硬件要求

| 模型大小 | 最低显存 | 推荐显存 |
|----------|---------|---------|
| 7B | 4GB | 8GB |
| 13B | 8GB | 16GB |
| 70B | 40GB | 48GB+ |

没有显卡也能跑（用 CPU），但会很慢。

### 最佳实践

- **完全免费**、**完全私有**、**完全离线**
- 适合对隐私敏感的场景
- 推荐 8B 级别的模型（7B-8B），在消费级 GPU 上运行流畅
- 中文推荐 `qwen2.5`

## OpenRouter（聚合平台）

| 字段 | 值 |
|------|------|
| API Base URL | `https://openrouter.ai/api/v1` |
| API 类型 | `openai-completions` |
| 获取 Key | [openrouter.ai/keys](https://openrouter.ai/keys) |

OpenRouter 聚合了 100+ 模型，通过一个 API Key 访问所有模型。适合想要灵活切换模型的用户。

### 常用模型

```
openai/gpt-4o
anthropic/claude-3.5-sonnet
google/gemini-pro-1.5
meta-llama/llama-3.1-70b-instruct
```

## 多 Provider 混合配置

虾饺支持同时配置多个 Provider，为不同 Agent 分配不同模型。

### 推荐配置方案

| Agent | 推荐 Provider | 推荐模型 | 理由 |
|-------|-------------|---------|------|
| 🤖 虾饺管家 | 通义千问 | qwen-turbo | 系统任务简单，省钱 |
| ✍️ 小说家 | Claude | claude-sonnet | 创作质量高 |
| 📝 编辑 | DeepSeek | deepseek-chat | 文字处理够用，便宜 |
| 🌐 翻译官 | OpenAI | gpt-4o | 多语言能力最强 |
| 💻 代码助手 | Claude | claude-sonnet | 代码能力最强 |

### 纯省钱方案

| Agent | Provider | 模型 | 月费估算 |
|-------|---------|------|---------|
| 所有 Agent | 通义千问 | qwen-turbo | < ¥5/月 |

### 最佳体验方案

| Agent | Provider | 模型 | 月费估算 |
|-------|---------|------|---------|
| 创作类 | Claude | claude-sonnet | ~$10/月 |
| 工具类 | OpenAI | gpt-4o | ~$10/月 |

### 完全免费方案

| Agent | Provider | 模型 |
|-------|---------|------|
| 所有 Agent | Ollama | qwen2.5 / llama3.1 |

## 省钱攻略

### 原则

1. **按任务匹配模型**：不是所有任务都需要 GPT-4o / Claude Opus
2. **翻译、总结、格式转换**用便宜模型；**创作、代码、推理**用贵模型
3. **[SOUL.md](/guide/soul-guide) 越精准，prompt token 越少**，每次调用省几百 token

### 成本对比实测

以一条"写 500 字技术博客"为例，不同模型的成本：

| 模型 | Input tokens | Output tokens | 单次成本 |
|------|-------------|---------------|---------|
| GPT-4o | ~800 | ~600 | ~$0.012 |
| Claude Sonnet | ~800 | ~600 | ~$0.009 |
| DeepSeek Chat | ~800 | ~600 | ~¥0.004 |
| Qwen Turbo | ~800 | ~600 | ~¥0.003 |
| Ollama (本地) | ~800 | ~600 | ¥0 |

### 省钱配置示例

```
虾饺管家（系统管理）→ Qwen Turbo（¥0.003/千tokens，够用）
翻译官（翻译任务）→ DeepSeek Chat（便宜且翻译质量不错）
代码助手（代码生成）→ Claude Sonnet（代码质量高，值得花钱）
日常闲聊 Agent → Ollama qwen2.5（免费）
```

### 控制 token 消耗的技巧

1. **精简 [SOUL.md](/guide/soul-guide)**：去掉冗余描述，每少 100 字 = 每次调用省 ~100 tokens
2. **限制记忆注入数量**：`AUTO_MEMORY_TOP_K=3`，只注入最相关的 3 条
3. **关闭不需要的工具**：每个工具定义约 100-200 tokens
4. **短对话多开新会话**：避免历史消息累积拉高 input token

## 配置排错

### API Key 无效

**症状**：Agent 回复报错 "401 Unauthorized"

**解决**：检查 API Key 是否正确复制（前后不要有空格），确认 Key 没有过期。

### API Base URL 错误

**症状**：Agent 回复报错 "ECONNREFUSED" 或 "404"

**解决**：确认 URL 格式正确。常见错误：

- ❌ `https://api.openai.com`（缺少 `/v1`）
- ✅ `https://api.openai.com/v1`
- ❌ `http://localhost:11434`（Ollama 缺少 `/v1`）
- ✅ `http://localhost:11434/v1`

### 模型名称错误

**症状**：Agent 回复报错 "model not found"

**解决**：确认模型名称拼写正确。模型名称区分大小写。

### Claude API 不工作

**症状**：调用 Claude 报错

**解决**：确认 API 类型选择了 `anthropic-messages`（不是 `openai-completions`）。

### Ollama 连接失败

**症状**：调用 Ollama 报错 "ECONNREFUSED"

**解决**：
1. 确认 Ollama 正在运行：`ollama list`
2. 确认端口正确：默认 11434
3. 如果虾饺和 Ollama 在不同机器上，确认 Ollama 绑定了 `0.0.0.0`

### 配置验证清单

配完一个 Provider 后，快速验证：

```
✅ API Base URL 末尾带 /v1（OpenAI 兼容协议）
✅ API Key 无空格、无换行
✅ 模型名称与 Provider 文档一致
✅ API 类型正确（Anthropic 选 anthropic-messages，其他选 openai-completions）
✅ 创建一个测试 Agent，发一条消息验证回复
```

## 相关文档

- [快速开始](/guide/quick-start) — 从安装到第一次对话
- [SOUL.md 编写指南](/guide/soul-guide) — 控制人格与输出以节省 token
- [多 Agent 群聊](/features/multi-agent-chat) — 体验多 Agent 协作
- [性能调优](/guide/performance) — 优化 LLM 调用性能
- [术语表](/guide/glossary) — 不懂的术语看这里
- [常见问题](/guide/faq) — 其他常见问题
