/**
 * 飞书长连接 Connector
 * 通过 @larksuiteoapi/node-sdk 的 WSClient 建立 WebSocket 长连接
 * 无需公网 IP / 域名 / 内网穿透
 */
const { createLogger } = require('../../middleware/logger');

let Lark = null;

function ensureSDK() {
  if (!Lark) {
    Lark = require('@larksuiteoapi/node-sdk');
  }
  return Lark;
}

async function start(ctx, config) {
  const log = ctx.log || createLogger('feishu-ws');
  const userCfg = ctx.config || {};
  const appId = userCfg.appId;
  const appSecret = userCfg.appSecret;

  if (!appId || !appSecret) {
    throw new Error('飞书长连接需要 appId 和 appSecret');
  }

  const lark = ensureSDK();

  const client = new lark.Client({
    appId,
    appSecret,
    domain: userCfg.domain || lark.Domain.Feishu,
  });

  ctx._feishuClient = client;
  ctx._chatIdMap = new Map();
  ctx._userNameCache = new Map();

  async function getUserName(openId) {
    if (ctx._userNameCache.has(openId)) return ctx._userNameCache.get(openId);
    try {
      const res = await client.contact.v3.user.get({
        path: { user_id: openId },
        params: { user_id_type: 'open_id' },
      });
      const name = res?.data?.user?.name || '';
      if (name) {
        ctx._userNameCache.set(openId, name);
        log.info(`resolved user name: ${openId} → ${name}`);
        return name;
      }
    } catch (e) {
      log.debug(`cannot resolve user name for ${openId}: ${e.message}`);
    }
    ctx._userNameCache.set(openId, '');
    return '';
  }

  const eventDispatcher = new lark.EventDispatcher({}).register({
    'im.message.receive_v1': async (data) => {
      try {
        const sender = data.sender || {};
        const message = data.message || {};
        const senderId = sender.sender_id?.open_id || sender.sender_id?.user_id || 'unknown';
        const chatId = message.chat_id || '';
        const messageId = message.message_id || '';
        const messageType = message.message_type || 'text';

        if (chatId && senderId) {
          ctx._chatIdMap.set(senderId, chatId);
        }

        if (messageType !== 'text') {
          log.info(`skipped non-text message type: ${messageType}`);
          return;
        }

        let text = '';
        try {
          const content = JSON.parse(message.content || '{}');
          text = content.text || '';
        } catch {
          text = message.content || '';
        }

        if (!text) return;

        const senderName = await getUserName(senderId);
        log.info(`inbound from ${senderName || senderId} chat=${chatId}: "${text.slice(0, 50)}"`);

        ctx.onInbound({
          event: {
            sender: {
              sender_id: { open_id: senderId },
              sender_name: senderName,
            },
            message: {
              message_id: messageId,
              message_type: messageType,
              chat_id: chatId,
              content: JSON.stringify({ text }),
            },
          },
        });
      } catch (e) {
        log.error('event handler error:', e.message);
      }
    },
  });

  const wsClient = new lark.WSClient({
    appId,
    appSecret,
    domain: userCfg.domain || lark.Domain.Feishu,
    loggerLevel: lark.LoggerLevel.info,
  });

  ctx._wsClient = wsClient;
  ctx._eventDispatcher = eventDispatcher;

  ctx.updateStatus('connecting');

  await wsClient.start({ eventDispatcher });

  ctx.updateStatus('connected');
  log.info('feishu WebSocket long connection established');

  ctx.abort.addEventListener('abort', () => {
    log.info('stopping feishu WebSocket connection...');
    try {
      if (wsClient && typeof wsClient.close === 'function') {
        wsClient.close();
      }
    } catch (e) {
      log.warn('close error:', e.message);
    }
  }, { once: true });
}

async function sendReply(ctx, userId, text) {
  const client = ctx._feishuClient;
  if (!client) throw new Error('feishu client not initialized');

  const chatId = ctx._chatIdMap?.get(userId);
  const receiveIdType = chatId ? 'chat_id' : 'open_id';
  const receiveId = chatId || userId;

  const res = await client.im.v1.message.create({
    params: { receive_id_type: receiveIdType },
    data: {
      receive_id: receiveId,
      msg_type: 'text',
      content: JSON.stringify({ text }),
    },
  });

  if (res.code !== 0) {
    throw new Error(`feishu send failed: ${res.msg || res.code}`);
  }

  return res;
}

module.exports = { start, sendReply };
