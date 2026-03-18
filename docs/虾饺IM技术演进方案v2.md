# 虾饺 IM 技术演进方案 v3.2

> 版本：v3.2 | 更新：2026-03-18  
> 核心变更：Channel 系统从"平台驱动（每平台写代码）"重构为"协议驱动 + 配置化（加平台只加 JSON）"  
> 借鉴来源：OpenClaw Agentspace Channel 插件（连接机制）+ 通用集成平台思路（配置化）  
> 关联文档：`MILESTONES.md`（M0~M7 执行记录）

---

## 一、演进全景

```
已完成 ████████████████████████████████████████████████████ 80%
待执行 ░░░░░░░░░░░░░░ 20%

P1~P3  基础建设                 ✅ 全部完成（模块化 + 直连 LLM + RAG + 工作流 + SQLite）
P4     可靠性与工程化            ✅ 大部分完成（7 项中完成 5 项，余 2 项可选）
P5     Channel 系统              ⬜ 核心待建（协议引擎 + 配置预设 + 自定义 Channel）
P6     企业级就绪                ⬜ 远期（进程拆分 / PWA / 多租户）
```

---

## 二、P4 完成盘点

### 已完成项（对应 MILESTONES M0~M7）

| 原方案编号 | 改造项 | 对应里程碑 | 完成状态 | 实际实现 |
|-----------|--------|-----------|---------|---------|
| P4.1 | 消息可靠性层 | M1.3 | ✅ 已实现 | 消息状态指示器（sending/queued/failed）、工具调用重试、LLM 错误恢复 |
| P4.3 | 低频 JSON → SQLite | M6.3 | ✅ 已实现 | `groups_v2` / `workflows_v2` / `schedules_v2` 表，JSON 自动迁移 + 事务写入 |
| P4.4 | Agent 间直连通信 | M4.1~M4.4 | ✅ 已实现 | `call_agent` 工具（3 层嵌套限制）+ 协作链 + 协作流可视化面板 |
| P4.6 | Agent Tool Calling | M1.1~M1.7 | ✅ 已实现 | 统一 Tool Event 协议 + ToolRegistry + 多厂商适配 + 实时时间线 UI |
| P4.7 | Agent 持久记忆 | M2.1~M2.5 | ✅ 已实现 | SQLite `agent_memories` 表、三分类、embedding 去重、混合搜索、Prompt 自动注入 |

### 已超出原方案的额外完成项

| 改造项 | 对应里程碑 | 说明 |
|--------|-----------|------|
| RAG 质量提升 | M3.1~M3.4 | BM25 混合检索 + RRF 融合 + LLM 重排序 + 分层分块 + 元数据过滤 |
| 社区降级为事件流 | M0.1~M0.4 | "虾区"从 SNS 降级为只读 Agent 事件流 + 成长看板迁入 Settings |
| 协作流可视化 | M5.1~M5.3 | 实时协作流面板 + 状态机 + 历史回放 |
| Workflow 条件分支 | M6.1~M6.2 | 条件节点 + 错误处理（retry/skip/rollback） |
| Web Search 6 引擎 | M7.1~M7.3 | auto/DuckDuckGo/Kimi/Brave/Perplexity/Grok + 15 分钟缓存 + LLM 总结 |

### 仍可推进项（非必须）

| 原方案编号 | 改造项 | 状态 | 建议 |
|-----------|--------|------|------|
| P4.2 | 前端 Vite 工程化 | ⬜ 未做 | **建议降级**：当前 20+ 散装 JS 运行良好，优先做 Channel |
| P4.5 | Agent Workspace 协议完善 | ⬜ 部分 | **建议简化**：SOUL.md 已覆盖核心需求 |

---

## 三、当前技术栈（已演进后）

```
前端：Vanilla JS（20+ 模块），CSS3，marked + highlight.js + mermaid
后端：Node.js 24+，原生 http，ws，node:sqlite（DatabaseSync）
存储：SQLite（messages/groups/workflows/schedules/memories/collab_flows + FTS5 + WAL）
      + JSON（agents/models/settings — 低频配置）
LLM：直连 OpenAI 兼容 API（可选 Gateway 模式），支持 Tool Calling 循环
工具：5 个内置工具（rag_query / web_search / memory_write / memory_search / call_agent）
      + 图片生成拦截（image_gen）
依赖：ws、formidable、node-cron、pdf-parse（共 4 个）
```

---

## 四、P5 Channel 系统（核心里程碑）

> **目标**：虾饺 IM 能对接任意外部平台，且**增加新平台不写代码，只加一份 JSON 配置**  
> **设计基准**：OpenClaw 的连接机制（心跳/重连/设备注册）+ 通用集成平台的配置化思路

### 4.1 核心设计理念：协议驱动，不是平台驱动

```
❌ 旧思路（平台驱动 — 每个平台写一个适配器 JS 文件）：
  channels/
  ├── wecom/index.js      ← 企微写一个
  ├── feishu/index.js     ← 飞书写一个
  ├── dingtalk/index.js   ← 钉钉写一个
  ├── telegram/index.js   ← TG 写一个
  └── ...无限膨胀

✅ 新思路（协议驱动 — 核心引擎 + JSON 配置）：
  server/services/
  ├── channel-engine.js          ← 核心引擎（只写一次）
  ├── connectors/
  │   ├── websocket.js           ← WebSocket 连接器（通用）
  │   ├── webhook.js             ← Webhook 接收器（通用）
  │   └── polling.js             ← 轮询器（通用）
  ├── middleware/
  │   ├── xml-parser.js          ← XML 解析（微信系平台）
  │   ├── aes-crypto.js          ← AES 加解密（企微/飞书）
  │   ├── hmac-verify.js         ← HMAC 签名验证
  │   └── oauth-token.js         ← OAuth Token 获取+刷新+缓存
  data/channel-presets/
  │   ├── wecom.json             ← 企微预设（纯配置，不是代码）
  │   ├── feishu.json            ← 飞书预设
  │   ├── dingtalk.json          ← 钉钉预设
  │   └── telegram.json          ← TG 预设

  增加一个新平台 = 增加一份 JSON 文件（或在 UI 里直接填字段映射）
```

### 4.2 三层架构

```
┌─────────────────────────────────────────────────────────┐
│                     Layer 1: 协议连接层                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  WebSocket    │  │   Webhook    │  │   Polling    │  │
│  │  Connector    │  │   Receiver   │  │   Engine     │  │
│  │  (心跳/重连)  │  │  (路由挂载)  │  │  (定时拉取)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                  │          │
├─────────┼─────────────────┼──────────────────┼──────────┤
│         ▼                 ▼                  ▼          │
│                   Layer 2: 消息映射层                     │
│  ┌─────────────────────────────────────────────────────┐│
│  │  入站：用 JSONPath 从原始消息中提取                    ││
│  │    userId  ← config.inbound.userIdPath              ││
│  │    text    ← config.inbound.textPath                ││
│  │    msgId   ← config.inbound.msgIdPath               ││
│  │                                                      ││
│  │  出站：用模板渲染回复消息                              ││
│  │    URL     ← config.outbound.url（支持 {{token}} 变量）││
│  │    Body    ← config.outbound.body（支持 {{userId}} 等）││
│  └─────────────────────────────────────────────────────┘│
│                          │                              │
├──────────────────────────┼──────────────────────────────┤
│                          ▼                              │
│                   Layer 3: 中间件层                       │
│  ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌───────────┐ │
│  │xml-parse│ │aes-crypto│ │hmac-verify│ │oauth-token│ │
│  └─────────┘ └──────────┘ └───────────┘ └───────────┘ │
│  按需组合，JSON 配置中声明 "middleware": ["oauth-token"] │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
                   ctx.inbound → Agent → send
```

### 4.3 平台预设 = 一份 JSON 配置

以企业微信为例：

```json
{
  "id": "wecom",
  "name": "企业微信",
  "icon": "🏢",

  "protocol": "websocket",
  "modes": ["connect", "webhook"],
  "defaultMode": "connect",

  "connect": {
    "urlTemplate": "wss://open.weixin.qq.com/connect/ws?token={{accessToken}}",
    "initPayload": {
      "type": "register",
      "device_uuid": "{{deviceId}}",
      "device_name": "虾饺IM"
    }
  },

  "heartbeat": {
    "intervalMs": 30000,
    "payload": { "type": "ping", "device_uuid": "{{deviceId}}" }
  },

  "reconnect": {
    "intervalMs": 20000,
    "maxWindowMs": 600000,
    "backoff": true
  },

  "auth": {
    "type": "oauth-token",
    "tokenUrl": "https://qyapi.weixin.qq.com/cgi-bin/gettoken",
    "tokenParams": { "corpid": "{{corpId}}", "corpsecret": "{{secret}}" },
    "tokenPath": "access_token",
    "expiresPath": "expires_in",
    "cacheKey": "wecom:{{corpId}}"
  },

  "inbound": {
    "format": "json",
    "userIdPath": "data.FromUserName",
    "userNamePath": "data.FromUserName",
    "textPath": "data.Content",
    "msgIdPath": "data.MsgId",
    "msgTypePath": "data.MsgType",
    "typeFilter": { "field": "data.MsgType", "accept": ["text", "image"] }
  },

  "outbound": {
    "url": "https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token={{accessToken}}",
    "method": "POST",
    "headers": { "Content-Type": "application/json" },
    "bodyTemplate": {
      "touser": "{{userId}}",
      "msgtype": "markdown",
      "agentid": "{{agentId}}",
      "markdown": { "content": "{{text}}" }
    }
  },

  "webhook": {
    "path": "/channel/wecom/{{channelId}}/callback",
    "verifyMethod": "GET",
    "verifyResponse": "echostr",
    "middleware": ["aes-crypto", "xml-parser"]
  },

  "configFields": [
    { "key": "corpId",    "label": "企业 ID",      "type": "text",     "required": true,
      "help": "企业微信管理后台 → 我的企业 → 底部" },
    { "key": "secret",    "label": "应用 Secret",   "type": "password", "required": true,
      "help": "应用管理 → 自建应用 → Secret" },
    { "key": "agentId",   "label": "应用 AgentID",  "type": "text",     "required": true,
      "help": "应用详情页顶部数字" },
    { "key": "imAgentId", "label": "响应的 IM Agent","type": "agent",    "required": true }
  ],

  "guide": {
    "title": "连接企业微信（3 步完成）",
    "steps": [
      { "text": "登录企业微信管理后台", "url": "https://work.weixin.qq.com" },
      { "text": "进入「应用管理」→「自建」→ 创建应用" },
      { "text": "复制 CorpID、AgentID、Secret 填入下方" }
    ]
  },

  "test": {
    "type": "auth-check",
    "successMessage": "连接成功，Access Token 已获取",
    "failMessage": "连接失败，请检查 CorpID 和 Secret"
  }
}
```

**增加飞书？增加钉钉？都是同样的一份 JSON：**

```json
// channel-presets/feishu.json — 飞书
{
  "id": "feishu",
  "name": "飞书",
  "icon": "📱",
  "protocol": "websocket",
  "connect": {
    "urlTemplate": "wss://open.feishu.cn/ws/v2/..."
  },
  "auth": {
    "type": "oauth-token",
    "tokenUrl": "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    "tokenParams": { "app_id": "{{appId}}", "app_secret": "{{appSecret}}" },
    "tokenPath": "tenant_access_token"
  },
  "inbound": {
    "userIdPath": "event.sender.sender_id.open_id",
    "textPath": "event.message.content"
  },
  "outbound": {
    "url": "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id",
    "bodyTemplate": {
      "receive_id": "{{userId}}",
      "msg_type": "text",
      "content": "{\"text\":\"{{text}}\"}"
    }
  },
  "configFields": [
    { "key": "appId",     "label": "App ID",     "required": true },
    { "key": "appSecret", "label": "App Secret", "required": true, "type": "password" },
    { "key": "imAgentId", "label": "响应 Agent",  "required": true, "type": "agent" }
  ]
}
```

### 4.4 用户自定义 Channel（UI 中填配置，零代码）

对于预设列表之外的平台，用户可以在 UI 中直接创建"自定义 Channel"：

```
设置 → Channel → 添加 → 自定义

┌─────────────────────────────────────────────────────┐
│  🔧 自定义 Channel                                   │
│                                                      │
│  名称:  [我的客服系统                ]               │
│  图标:  [🔗 ▼]                                      │
│                                                      │
│  ──── 连接方式 ────                                  │
│  ● WebSocket（主动连接，无需公网 IP）                  │
│  ○ Webhook（被动接收，需要公网 IP）                    │
│  ○ 轮询（定时拉取消息）                               │
│                                                      │
│  连接地址:                                           │
│  [wss://api.my-system.com/ws          ]              │
│                                                      │
│  认证方式:  [▼ Header]                               │
│  Header 名: [Authorization                ]          │
│  Header 值: [Bearer {{token}}             ]          │
│                                                      │
│  ──── 入站消息映射 ────                               │
│  用户 ID 字段路径:  [data.from_user_id    ]          │
│  消息内容字段路径:  [data.content         ]          │
│  消息 ID 字段路径:  [data.msg_id          ]          │
│                                                      │
│  ──── 出站回复配置 ────                               │
│  推送 API 地址:                                      │
│  [https://api.my-system.com/send      ]              │
│                                                      │
│  请求 Body 模板 (JSON):                              │
│  ┌────────────────────────────────────┐              │
│  │ {                                  │              │
│  │   "to": "{{userId}}",             │              │
│  │   "content": "{{text}}"           │              │
│  │ }                                  │              │
│  └────────────────────────────────────┘              │
│                                                      │
│  响应 Agent:  [▼ 客服助手            ]               │
│                                                      │
│  [🔌 测试连接]    [✅ 保存并启用]                     │
└─────────────────────────────────────────────────────┘
```

**任何人都可以在 UI 里接入一个全新平台，不需要改代码，不需要开发者参与。**

### 4.5 Channel Engine 核心实现

Channel Engine = 核心引擎，只写一次，处理所有平台：

```javascript
// server/services/channel-engine.js

class ChannelEngine {
  _presets = new Map();       // 预设模板 (type → preset JSON)
  _instances = new Map();     // 运行中实例 (channelId → runtime)
  _connectors = {             // 3 种协议连接器
    websocket: new WsConnector(),
    webhook:   new WebhookReceiver(),
    polling:   new PollingEngine(),
  };
  _middleware = {              // 可组合中间件
    'xml-parser':  xmlParser,
    'aes-crypto':  aesCrypto,
    'hmac-verify': hmacVerify,
    'oauth-token': oauthToken,
  };

  // 启动时加载预设
  loadPresets() {
    // 扫描 data/channel-presets/*.json
    // 每个 JSON 注册为一个可用的 Channel 类型
  }

  // 创建并启动 Channel 实例
  async startInstance(channelId) {
    const channel = db.getChannel(channelId);
    // 配置 = 预设 + 用户填写的参数（merge）
    const config = this._mergeConfig(channel);

    // 解析中间件链
    const mwChain = (config.middleware || [])
      .map(name => this._middleware[name])
      .filter(Boolean);

    // 构建统一 ctx
    const ctx = this._buildCtx(channel, config, mwChain);

    // 根据协议类型，调用对应连接器
    const connector = this._connectors[config.protocol];
    await connector.start(ctx, config);

    this._instances.set(channelId, { ctx, connector, config });
  }

  // 统一入站处理（所有协议/平台共用）
  _handleInbound(channel, config, rawMessage) {
    // 1. 用 JSONPath 从原始消息中提取字段
    const userId = getByPath(rawMessage, config.inbound.userIdPath);
    const text   = getByPath(rawMessage, config.inbound.textPath);
    const msgId  = getByPath(rawMessage, config.inbound.msgIdPath);

    // 2. 类型过滤
    if (config.inbound.typeFilter) {
      const msgType = getByPath(rawMessage, config.inbound.typeFilter.field);
      if (!config.inbound.typeFilter.accept.includes(msgType)) return;
    }

    // 3. 路由到 Agent
    this._routeToAgent(channel, { userId, text, msgId });
  }

  // 统一出站处理（所有协议/平台共用）
  async _handleOutbound(channel, config, userId, text) {
    // 1. 解析变量
    const vars = { ...channel.config, userId, text, accessToken: await this._getToken(config) };

    // 2. 渲染 URL
    const url = renderTemplate(config.outbound.url, vars);

    // 3. 渲染 Body
    const body = renderTemplate(JSON.stringify(config.outbound.bodyTemplate), vars);

    // 4. 发送
    await fetch(url, {
      method: config.outbound.method || 'POST',
      headers: config.outbound.headers || { 'Content-Type': 'application/json' },
      body,
    });
  }
}
```

#### WebSocket 连接器（通用，借鉴 OpenClaw）

```javascript
// server/services/connectors/websocket.js

class WsConnector {
  async start(ctx, config) {
    const vars = { ...ctx.config, deviceId: ctx.deviceId, accessToken: await ctx.getToken() };
    const url = renderTemplate(config.connect.urlTemplate, vars);

    const ws = new WebSocket(url);

    ws.on('open', () => {
      ctx.log.info('WebSocket 已连接');
      // 发送 init payload（借鉴 OpenClaw sendInit）
      if (config.connect.initPayload) {
        ws.send(JSON.stringify(renderTemplate(config.connect.initPayload, vars)));
      }
      // 启动心跳（借鉴 OpenClaw startAgentspaceHeartbeat）
      ctx.heartbeat.start(() => {
        const ping = renderTemplate(config.heartbeat.payload, vars);
        ws.send(JSON.stringify(ping));
      });
      ctx.updateStatus('connected');
    });

    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      ctx.onInbound(msg);  // → ChannelEngine._handleInbound
    });

    ws.on('close', (code) => {
      ctx.heartbeat.stop();
      ctx.updateStatus('disconnected');
      // 自动重连（借鉴 OpenClaw scheduleReconnect）
      ctx.scheduleReconnect(() => this.start(ctx, config));
    });

    ws.on('error', (err) => {
      ctx.log.error('WebSocket 错误:', err.message);
    });

    ctx.abort.addEventListener('abort', () => {
      ctx.heartbeat.stop();
      ws.close();
    }, { once: true });
  }
}
```

#### Webhook 接收器（通用）

```javascript
// server/services/connectors/webhook.js

class WebhookReceiver {
  async start(ctx, config) {
    const path = renderTemplate(config.webhook.path, { channelId: ctx.channelId });

    // 挂载路由到主 HTTP 服务器
    ctx.mountRoute('POST', path, async (req, res, body) => {
      // 通过中间件链处理（签名验证 → 解密 → XML 解析）
      let processed = body;
      for (const mw of ctx.middlewareChain) {
        processed = await mw.process(processed, ctx);
      }
      ctx.onInbound(processed);
      res.writeHead(200).end('ok');
    });

    // Webhook 验证路由（如微信的 echostr 验证）
    if (config.webhook.verifyMethod === 'GET') {
      ctx.mountRoute('GET', path, (req, res, query) => {
        res.end(query[config.webhook.verifyResponse] || '');
      });
    }

    ctx.updateStatus('connected');
  }
}
```

#### Polling 轮询器（通用）

```javascript
// server/services/connectors/polling.js

class PollingEngine {
  async start(ctx, config) {
    const intervalMs = config.polling?.intervalMs || 5000;
    let offset = 0;

    const poll = async () => {
      if (ctx.abort.aborted) return;
      try {
        const vars = { ...ctx.config, offset, accessToken: await ctx.getToken() };
        const url = renderTemplate(config.polling.url, vars);
        const res = await fetch(url);
        const data = await res.json();

        const messages = getByPath(data, config.polling.messagesPath) || [];
        for (const msg of messages) {
          ctx.onInbound(msg);
          const id = getByPath(msg, config.polling.updateIdPath);
          if (id) offset = id + 1;
        }
        ctx.updateStatus('connected');
      } catch (err) {
        ctx.log.error('轮询错误:', err.message);
        ctx.updateStatus('error');
      }
    };

    const timer = setInterval(poll, intervalMs);
    ctx.abort.addEventListener('abort', () => clearInterval(timer), { once: true });
    await poll(); // 立即拉一次
  }
}
```

### 4.6 中间件（协议级，可复用，不是平台级）

```javascript
// server/services/middleware/oauth-token.js
// 通用 OAuth Token 管理器 — 所有需要 Token 的平台共用

const tokenCache = new Map();

async function getToken(config, userConfig) {
  const cacheKey = renderTemplate(config.auth.cacheKey, userConfig);
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const params = renderTemplate(config.auth.tokenParams, userConfig);
  const url = new URL(config.auth.tokenUrl);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url);
  const data = await res.json();
  const token = getByPath(data, config.auth.tokenPath);
  const expiresIn = getByPath(data, config.auth.expiresPath) || 7200;

  tokenCache.set(cacheKey, { token, expiresAt: Date.now() + (expiresIn - 300) * 1000 });
  return token;
}
```

```javascript
// server/services/middleware/xml-parser.js
// XML → JSON 转换器 — 微信系平台共用

function process(rawBody, ctx) {
  if (typeof rawBody === 'string' && rawBody.trim().startsWith('<')) {
    return parseXmlToJson(rawBody);
  }
  return rawBody;
}
```

中间件数量极少（4-5 个），但覆盖所有平台的特殊需求：

| 中间件 | 作用 | 哪些平台用 |
|--------|------|-----------|
| `oauth-token` | Token 获取 + 缓存 + 自动刷新 | 企微、飞书、钉钉、Telegram |
| `xml-parser` | XML 消息 → JSON | 微信公众号、企微（webhook 模式） |
| `aes-crypto` | AES-256-CBC 消息加解密 | 企微（webhook 模式）、飞书 |
| `hmac-verify` | HMAC/SHA 签名验证 | 钉钉、通用 Webhook |

### 4.7 消息流转全链路

```
任意外部平台用户发消息
  │
  ▼
┌────────────────────────────────────────┐
│         协议连接层（自动选择）           │
│  WebSocket? → WsConnector             │
│  Webhook?   → WebhookReceiver         │
│  Polling?   → PollingEngine           │
└────────────┬───────────────────────────┘
             │ 原始消息（JSON/XML）
             ▼
┌────────────────────────────────────────┐
│         中间件链（按 JSON 配置组合）     │
│  xml-parser → aes-crypto → ...        │
└────────────┬───────────────────────────┘
             │ 标准 JSON
             ▼
┌────────────────────────────────────────┐
│         消息映射层                      │
│  userIdPath → 提取 userId              │
│  textPath   → 提取 text               │
│  msgIdPath  → 提取 msgId              │
└────────────┬───────────────────────────┘
             │ { userId, text, msgId }
             ▼
┌────────────────────────────────────────┐
│         虾饺 IM 核心                    │
│  1. 查找/创建 channel_session          │
│  2. 记录到 messages 表                 │
│  3. 路由到绑定的 Agent → sendToLLM     │
│     └→ Agent 回复（带 Tool Calling）   │
│          │                             │
│          ▼                             │
│  4. 出站映射层                          │
│     outbound.url      → 渲染 URL      │
│     outbound.body     → 渲染 Body     │
│     → fetch() 推送到外部平台           │
│                                        │
│  5. 消息同步显示在 IM 界面（管理员可见） │
└────────────────────────────────────────┘
```

### 4.8 数据库扩展

```sql
CREATE TABLE channels (
  id        TEXT PRIMARY KEY,
  type      TEXT NOT NULL,         -- 预设类型 'wecom' / 'feishu' / 'custom'
  name      TEXT,
  preset    TEXT,                  -- 预设 JSON（来自预设文件 或 用户自定义）
  config    TEXT,                  -- 用户填写的参数 JSON（corpId, secret 等，敏感字段 AES 加密）
  mode      TEXT DEFAULT 'connect',
  enabled   INTEGER DEFAULT 1,
  status    TEXT DEFAULT 'idle',   -- idle / connecting / connected / disconnected / error
  device_id TEXT,
  stats     TEXT DEFAULT '{}',
  created   INTEGER
);

CREATE TABLE channel_sessions (
  id               TEXT PRIMARY KEY,
  channel_id       TEXT NOT NULL,
  external_user_id TEXT NOT NULL,
  external_name    TEXT,
  agent_id         TEXT NOT NULL,
  im_channel       TEXT,
  last_active      INTEGER,
  metadata         TEXT,
  UNIQUE(channel_id, external_user_id)
);
CREATE INDEX idx_cs_channel ON channel_sessions(channel_id);
```

### 4.9 Channel 管理 UI

```
设置 → 🔗 Channel

┌─────────────────────────────────────────────────────┐
│  🔗 外部平台对接                                     │
│                                                      │
│  已连接的 Channel                                    │
│  ┌───────────────────────────────────────┐           │
│  │ 🏢 企业微信 · 客服                    │           │
│  │ 模式: 🟢 WebSocket 主动连接           │           │
│  │ Agent: 客服助手                       │           │
│  │ 状态: ● 已连接  ↕ 心跳正常            │           │
│  │ 今日: 收到 238 / 回复 235             │           │
│  │ [配置] [会话] [停用]                  │           │
│  └───────────────────────────────────────┘           │
│                                                      │
│  添加 Channel:                                       │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │
│  │🏢    │ │📱    │ │🤖    │ │✈️    │ │🔧    │     │
│  │企微  │ │飞书  │ │钉钉  │ │TG   │ │自定义│     │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘     │
│                                                      │
│  选择预设或自定义 — 所有配置在这里完成，无需写代码      │
└─────────────────────────────────────────────────────┘
```

选预设 = 自动填充 JSON 配置，用户只需填 2-3 个参数  
选自定义 = 用户手动填写协议、URL、字段映射（高级用户）

### 4.10 安全设计

| 安全点 | 措施 |
|--------|------|
| 密钥存储 | `config` JSON 中 password 类型字段 AES-256 加密后存入 SQLite |
| Webhook 鉴权 | 通过 `hmac-verify` 中间件统一处理，算法和密钥在 JSON 中配置 |
| 消息防护 | 入站映射层统一做 XSS 过滤 + text 长度限制（10000 字） |
| 路由隔离 | Channel Webhook 路由在 `/channel/` 前缀下 |
| 速率限制 | 每个 Channel 实例每分钟 100 条上限 |
| 设备安全 | deviceId 持久化到 DB，不暴露给前端 |

### 4.11 OpenClaw 核心借鉴清单

从 OpenClaw Agentspace 源码中直接借鉴的机制（嵌入到协议连接层中）：

| 借鉴机制 | OpenClaw 出处 | 嵌入位置 |
|---------|--------------|---------|
| WebSocket 主动连接 | `channel.ts` → `gateway.startAccount` | `WsConnector.start()` |
| 心跳保活 | `channel.ts` → `startAgentspaceHeartbeat` | `HeartbeatManager` |
| 断线重连 | `channel.ts` → `scheduleReconnect` | `ctx.scheduleReconnect()` |
| 设备 ID 注册 | `channel.ts` → `resolveDeviceUuid` | `ctx.deviceId` 持久化 |
| init 事件 | `channel.ts` → `sendInit` | `config.connect.initPayload` |
| AbortSignal 生命周期 | `channel.ts` → `ctx.abortSignal` | `ctx.abort` |

### 4.12 维护成本对比

| 操作 | 旧方案（平台驱动） | 新方案（协议驱动） |
|------|-------------------|--------------------|
| 加一个新平台 | 写一个 JS 适配器文件（100-500 行代码） | **加一份 JSON 预设**（30-50 行配置） |
| 用户对接私有系统 | 不可能（需要开发者写代码） | **在 UI 里填字段映射**（零代码） |
| 核心代码量 | 线性增长（每平台 +1 文件） | **恒定**（3 连接器 + 4 中间件 + 1 引擎） |
| 修复连接 bug | 每个适配器都要改 | **改一次连接器，所有平台受益** |

### 4.13 实施步骤

```
Phase 1 — 核心引擎（M8）：
  ① DB: channels + channel_sessions 表
  ② channel-engine.js: 预设加载 + 实例管理 + 消息映射层 + 模板渲染
  ③ connectors/webhook.js: 通用 Webhook 接收器
  ④ middleware/oauth-token.js: Token 管理中间件
  ⑤ routes/channels.js: CRUD API
  ⑥ data/channel-presets/webhook.json: 通用 Webhook 预设
  ⑦ 验证: curl POST → Agent 回复

Phase 2 — WebSocket 连接器 + 企微预设（M9）：
  ① connectors/websocket.js: 通用 WS 连接器（含心跳 + 重连）
  ② HeartbeatManager + ReconnectManager
  ③ data/channel-presets/wecom.json: 企微预设配置
  ④ 端到端验证: 企微用户发消息 → Agent 回复

Phase 3 — UI + 自定义 Channel（M10）：
  ① 设置页 Channel Tab（预设选择 + 参数填写 + 图文引导）
  ② 自定义 Channel 表单（协议 + URL + 字段映射 + Body 模板）
  ③ 测试连接按钮 + 实时状态指示
  ④ 通讯录 Channel 会话分类 + 聊天来源标记

Phase 4 — 扩展预设 + 中间件（M11）：
  ① data/channel-presets/feishu.json + dingtalk.json + telegram.json
  ② connectors/polling.js: 通用轮询器
  ③ middleware/xml-parser.js + aes-crypto.js + hmac-verify.js
```

---

## 五、P6 企业级就绪（远期）

> 优先级低，仅在 P5 稳定后按需推进。

| 子项 | 说明 | 优先级 |
|------|------|--------|
| P6.1 进程拆分 | API / WS / Worker / Scheduler 可选独立部署 | 低 |
| P6.2 状态外置 | Redis Pub/Sub + Session 外置，支持多实例 | 低 |
| P6.3 PWA | manifest.json + Service Worker，安装到桌面 | 中 |
| P6.4 多租户 | 每租户独立 SQLite + 资源限制 | 低 |

---

## 六、竞品对标（更新后）

| 能力 | 虾饺 IM 现状 | +P5 完成后 | OpenClaw | Coze | Dify |
|------|-------------|-----------|----------|------|------|
| IM 对话体验 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 多 Agent 群聊 | ✅ | ✅ | ❌ | ❌ | ❌ |
| Agent 协作链 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 协作流可视化 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 工作流编排 | ✅ 含条件分支 | ✅ | ❌ | ✅ | ✅ |
| RAG 知识库 | ✅ BM25+向量+重排 | ✅ | ❌ | ✅ | ✅ |
| Tool Calling | ✅ 5 工具 + 时间线 | ✅ | ✅ | ✅ | ✅ |
| Agent 记忆 | ✅ 三分类+混合搜索 | ✅ | ✅ 部分 | ✅ | ❌ |
| Web Search | ✅ 6 引擎 + 零配置 | ✅ | ✅ 5 引擎 | ✅ | ✅ |
| 数据持久化 | ✅ SQLite 全量 | ✅ | JSON | ✅ | ✅ |
| 消息可靠性 | ✅ 状态指示+重试 | ✅ | ❌ | ✅ | ✅ |
| **外部平台接入** | **❌** | **✅ 预设 + 自定义，零代码加平台** | ✅ 仅 Agentspace（需写 TS 插件） | ✅ | ✅ |
| **无需公网 IP** | — | **✅ WebSocket 主动连接** | ✅ | — SaaS | — |
| **零代码加新平台** | — | **✅ JSON 预设 / UI 自定义** | ❌ 需写 TypeScript | ❌ | ❌ |
| **Channel Web UI** | **❌** | **✅ 引导式 + 自定义 + 实时状态** | ❌ CLI 向导 | ✅ | ✅ |
| 私有部署成本 | ✅ 极低 | ✅ 极低 | 中 | ❌ SaaS | 中 |

> **独特定位**：虾饺 IM 将是唯一同时具备 **IM 范式 + Agent 协作链 + 零代码 Channel 配置** 的极轻量私有部署方案。  
> 加新平台不写代码，这一点超越 OpenClaw（需写 TS 插件）、Coze（SaaS 平台绑定）和 Dify（需开发集成）。

---

## 七、里程碑检查点（更新后）

| 检查点 | 完成标志 | 状态 |
|--------|---------|------|
| M0 | 社区降级为事件流 | ✅ |
| M1 | Tool Calling 框架（5 内置工具 + 时间线 UI） | ✅ |
| M2 | Agent Memory Phase 1（三分类 + 混合搜索 + Prompt 注入） | ✅ |
| M3 | RAG 质量（BM25 + 重排序 + 分层分块） | ✅ |
| M4 | Agent 间协作（call_agent + 协作链） | ✅ |
| M5 | 协作流可视化（实时面板 + 历史回放） | ✅ |
| M6 | Workflow 增强 + JSON→SQLite 迁移 + 单元测试 | ✅ |
| M7 | Web Search 增强（6 引擎 + auto 零配置 + 缓存） | ✅ |
| **M8** | **Channel 核心引擎 + Webhook 连接器 + 通用预设** | ⬜ |
| **M9** | **WebSocket 连接器 + 企微预设：长连接收发消息** | ⬜ |
| **M10** | **Channel Web UI：预设选择 + 自定义 Channel + 测试连接** | ⬜ |
| **M11** | **飞书/钉钉/TG 预设 + Polling 连接器 + 中间件补全** | ⬜ |
| M2-P2 | Agent Memory Phase 2（自动捕获 + 整合 + memory_forget） | ⬜ 可选 |

---

## 八、执行建议

```
推荐执行顺序：
  M8（引擎 + Webhook）→ M9（WS 连接器 + 企微预设）→ M10（UI + 自定义）→ M11（扩展预设）

预估工时：
  M8：2-3 天（Engine + WebhookReceiver + 映射层 + API）
  M9：2-3 天（WsConnector + 心跳/重连 + oauth-token + 企微预设）
  M10：2-3 天（UI + 自定义 Channel 表单 + 测试连接 + 通讯录）
  M11：2-3 天（3 个预设 JSON + PollingEngine + 3 个中间件）
  合计：8-12 天
```

**核心原则**：
1. **加平台不写代码** — 核心引擎只写一次，新平台 = 新 JSON
2. **3 种协议覆盖一切** — WebSocket / Webhook / Polling，没有第四种
3. **中间件可复用** — 4 个中间件覆盖所有平台的特殊协议需求
4. **用户可自定义** — 在 UI 中填字段映射，接入任何系统
5. **借鉴 OpenClaw 连接机制** — 心跳 + 重连 + 设备注册 + AbortSignal
6. **所有消息在 IM 中可见** — 管理员实时监控所有 Channel 的对话

---

## 九、OpenClaw 源码参考索引

| OpenClaw 源文件 | 行数 | 虾饺 IM 借鉴点 |
|----------------|------|---------------|
| `extensions/agentspace/src/channel.ts` | 557 | 主动 WS 连接、心跳、重连、设备 ID、入站消息处理 → 嵌入到通用 `WsConnector` 中 |
| `extensions/agentspace/src/config.ts` | 100 | 账号配置解析 → 简化为 JSON 预设的 `configFields` 声明 |
| `extensions/agentspace/src/onboarding.ts` | 281 | CLI 配置向导 → 替换为 Web UI 引导式表单 |
| `extensions/agentspace/src/auth.ts` | 357 | OAuth Token 获取 → 抽象为通用 `oauth-token` 中间件 |
| `extensions/agentspace/src/client.ts` | 67 | 设备名/设备 ID 管理 → 嵌入到 `ChannelEngine._resolveDeviceId` |
