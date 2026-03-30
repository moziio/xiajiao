---
title: 渠道接入 — 虾饺 IM
description: 虾饺 IM 的多渠道接入能力——飞书、钉钉、企业微信、Telegram，把 Agent 带到你的工作平台。
---

# 渠道接入

虾饺不只是一个独立的 Web 应用——它可以把 Agent 接入你日常使用的工作平台。

<p align="center">
  <img src="/images/demo.png" alt="虾饺管家管理渠道连接" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>
<p align="center" style="color: var(--vp-c-text-2);">
  <em>通过虾饺管家 Agent 对话式管理渠道接入 — 自动调用 manage_channel 工具。</em>
</p>

## 架构概览

```
飞书 / 钉钉 / 企微 / Telegram
       ↕ Webhook / WebSocket
  ┌────────────────┐
  │   虾饺 IM 服务   │
  │                │
  │  消息路由 → Agent → LLM API
  │                │
  │  消息写入 SQLite │
  └────────────────┘
```

**核心思路**：外部平台的消息进来后，虾饺把它当作一条普通消息处理——路由到对应 Agent，调用 LLM，把回复发回外部平台。Agent 的 SOUL.md、记忆、RAG、Tool Calling 全部生效。

## 支持的渠道

| 渠道 | 协议 | 状态 | 说明 |
|------|------|------|------|
| **飞书** | WebSocket | ✅ 已支持 | 长连接，无需公网 IP |
| **钉钉** | Webhook | 🚧 开发中 | 需要公网回调地址 |
| **企业微信** | Webhook | 🚧 开发中 | 需要公网回调地址 |
| **Telegram** | Bot API | 🚧 开发中 | 需要公网或代理 |
| **Slack** | Bot API | 📋 计划中 | — |
| **Discord** | Bot API | 📋 计划中 | — |

## 飞书接入（详细教程）

飞书是目前最成熟的接入渠道，使用 WebSocket 长连接，**不需要公网 IP**。

### 步骤 1：创建飞书应用

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 创建"企业自建应用"
3. 获取 `App ID` 和 `App Secret`

### 步骤 2：配置权限

在应用的"权限管理"中开启：

| 权限 | 说明 |
|------|------|
| `im:message` | 获取和发送消息 |
| `im:message:send_as_bot` | 以机器人身份发送消息 |
| `im:chat` | 获取群聊信息 |
| `contact:user.id:readonly` | 获取用户 ID |

### 步骤 3：启用事件订阅

1. 在"事件订阅"中启用"使用长连接接收事件"
2. 添加事件：`im.message.receive_v1`（接收消息）

### 步骤 4：在虾饺中配置

在虾饺设置中添加飞书渠道：

```json
{
  "type": "feishu",
  "appId": "cli_xxxxxxxx",
  "appSecret": "xxxxxxxxxxxxxxxxxxxxxxxx",
  "agentId": "agent_xxx"
}
```

| 字段 | 说明 |
|------|------|
| `appId` | 飞书应用的 App ID |
| `appSecret` | 飞书应用的 App Secret |
| `agentId` | 接收消息的虾饺 Agent ID |

### 步骤 5：测试

1. 在飞书中搜索你创建的应用
2. 发送消息给机器人
3. 虾饺 Agent 回复应该出现在飞书对话中

### 飞书注意事项

- **WebSocket 长连接**：飞书的 WebSocket 连接由 SDK 维护，自动重连。不需要配置公网地址
- **消息格式**：虾饺自动将 Markdown 转换为飞书的富文本格式
- **群聊支持**：机器人可以加入飞书群聊，@mention 触发
- **一对多**：一个飞书应用可以关联一个虾饺 Agent

## 钉钉接入（预览）

::: warning 开发中
钉钉接入正在开发中，以下是计划的配置方式。
:::

### 创建钉钉机器人

1. 在 [钉钉开放平台](https://open.dingtalk.com/) 创建应用
2. 启用"机器人"功能
3. 设置消息接收地址（需要公网 IP）

### 配置

```json
{
  "type": "dingtalk",
  "appKey": "dingxxxxxxxx",
  "appSecret": "xxxxxxxxxxxxxxxxxxxxxxxx",
  "agentId": "agent_xxx",
  "callbackUrl": "https://your-domain.com/webhook/dingtalk"
}
```

### 公网地址要求

钉钉使用 Webhook 回调，需要虾饺服务有公网可访问的 URL。推荐方案：

| 方案 | 适用场景 |
|------|---------|
| 云服务器 + Nginx | 生产环境 |
| ngrok / frp | 本地开发测试 |
| Cloudflare Tunnel | 免费公网穿透 |

## 企业微信接入（预览）

::: warning 开发中
企业微信接入正在开发中。
:::

### 创建企微应用

1. 在 [企业微信管理后台](https://work.weixin.qq.com/) 创建应用
2. 设置"接收消息"的 URL
3. 获取 `CorpID`、`AgentId`、`Secret`

### 配置

```json
{
  "type": "wecom",
  "corpId": "wxxxxxxxxx",
  "agentId": "1000002",
  "secret": "xxxxxxxxxxxxxxxxxxxxxxxx",
  "token": "your-token",
  "encodingAESKey": "xxxxxxxxxxxxxxxxxxxxxxxx",
  "xiajiaoAgentId": "agent_xxx"
}
```

## Telegram 接入（预览）

::: warning 开发中
Telegram Bot 接入正在开发中。
:::

### 创建 Telegram Bot

1. 在 Telegram 中搜索 `@BotFather`
2. 发送 `/newbot` 创建新机器人
3. 获取 Bot Token

### 配置

```json
{
  "type": "telegram",
  "botToken": "123456:ABC-DEF...",
  "agentId": "agent_xxx"
}
```

### 网络要求

Telegram API 在中国大陆无法直接访问，需要：
- 海外服务器部署虾饺
- 或配置代理（HTTP_PROXY 环境变量）

## 自定义渠道开发

如果你需要接入其他平台，可以自己开发渠道适配器。

### 适配器接口

每个渠道适配器需要实现两个核心方法：

```javascript
class MyChannelAdapter {
  async onMessage(externalMessage) {
    const message = this.convertToXiajiaoMessage(externalMessage);
    await this.forwardToAgent(message);
  }

  async sendMessage(xiajiaoMessage) {
    const formatted = this.convertToExternalFormat(xiajiaoMessage);
    await this.externalAPI.send(formatted);
  }
}
```

### 消息格式转换

虾饺内部消息格式 → 外部平台格式的映射：

| 虾饺格式 | 飞书 | 钉钉 | 企微 | Telegram |
|---------|------|------|------|----------|
| 纯文本 | text | text | text | text |
| Markdown | post（富文本） | markdown | markdown | MarkdownV2 |
| 图片 | image | image | image | photo |
| 文件 | file | file | file | document |
| 代码块 | post（代码节点） | markdown | markdown | pre |

### 文件位置

渠道相关代码在 `server/services/connectors/` 目录：

```
server/services/connectors/
├── feishu-ws.js       # 飞书 WebSocket 长连接
├── webhook.js         # 通用 Webhook（钉钉 / 企微等）
├── websocket.js       # 通用 WebSocket
├── polling.js         # 轮询型
└── _template.js.example  # 新连接器模板
```

## 多渠道联动

一个 Agent 可以同时接入多个渠道。用户在飞书问的问题，Agent 的记忆会保留——下次在 Web 端继续对话时，Agent 仍然记得之前的上下文。

```
飞书用户问：我们的部署流程是什么？
  → Agent 回答 + memory_write（"用户问过部署流程"）

Web 端用户问：刚才说的部署流程，第三步详细说说
  → Agent memory_search → 找到之前的记忆 → 继续详细解答
```

## 渠道接入 FAQ

### 飞书 Bot 收不到消息

1. 确认"事件订阅"已启用 `im.message.receive_v1`
2. 确认已选择"使用长连接接收事件"
3. 确认应用已发布（草稿状态无法收消息）
4. 检查虾饺终端日志是否有 WebSocket 连接信息

### 一个 Agent 能同时接多个渠道吗？

可以。同一个 Agent 可以同时服务 Web 端 + 飞书 + 钉钉。Agent 的记忆在所有渠道间共享——在飞书问的问题，Agent 在 Web 端也记得。

### 渠道接入会影响 Web 端使用吗？

不会。渠道接入是附加功能，Web 端的所有功能不受影响。

### 渠道消息的 Tool Calling 怎么显示？

在外部渠道（如飞书）中，Tool Calling 的中间过程不会实时显示（受限于平台消息格式）。Agent 会等工具调用完成后，一次性发送最终回复。如果需要查看完整的 Tool Calling 过程，可以在虾饺 Web 端查看同一条消息。

## 相关文档

- [Tool Calling](/zh/features/tool-calling) — `manage_channel` 工具详解
- [快速开始](/zh/guide/quick-start) — 先在 Web 端跑起来
- [云服务器部署](/zh/deployment/cloud) — 渠道接入需要服务在线
- [安全与隐私](/zh/guide/security) — 渠道 Token 安全
- [故障排查](/zh/guide/troubleshooting) — 连接问题排查
