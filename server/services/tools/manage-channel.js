/**
 * 内置工具：manage_channel — 对话式 Channel 管理（M12.6）
 * 全局注册 + defaultDeny：仅授权 Agent 可用
 */
const { createLogger } = require('../../middleware/logger');
const log = createLogger('tool:manage-channel');

let _engine = null;

function _getEngine() {
  if (!_engine) _engine = require('../channel-engine');
  return _engine;
}

const schema = {
  description: '管理外部平台 Channel（查看预设、创建、启动、停止、查看状态）。用户说"接入飞书/钉钉/企微"、"查看 Channel 状态"、"停用某个 Channel"时调用。',
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['list_presets', 'list', 'status', 'create', 'start', 'stop', 'delete'],
        description: '操作类型：list_presets=查看可用平台预设, list=列出已创建的Channel, status=查看状态, create=创建并启动, start=启动, stop=停用, delete=删除',
      },
      type: {
        type: 'string',
        description: '预设类型（create 时必需）：feishu / dingtalk / wecom / telegram / generic-webhook',
      },
      name: {
        type: 'string',
        description: 'Channel 显示名称（create 时使用，如"飞书客服"）',
      },
      config: {
        type: 'object',
        description: '配置参数（create 时必需），包含平台凭证和绑定的 Agent ID。具体字段通过 list_presets 查看。',
      },
      channelId: {
        type: 'string',
        description: '目标 Channel ID（start/stop/delete/status 时使用）',
      },
    },
    required: ['action'],
  },
};

async function handler(args, context) {
  const engine = _getEngine();
  const { action } = args;

  try {
    switch (action) {

      case 'list_presets': {
        const presets = engine.getPresets();
        const result = presets.map(p => ({
          id: p.id, name: p.name || p.id, icon: p.icon || '',
          protocol: p.protocol || 'webhook',
          modes: p.modes || [p.protocol || 'webhook'],
          configFields: (p.configFields || []).map(f => ({
            key: f.key, label: f.label, type: f.type || 'text', required: !!f.required, help: f.help || '',
          })),
          guide: p.guide || null,
        }));
        return { ok: true, presets: result, hint: '使用 create 操作创建 Channel，config 中需填写对应预设的 configFields 字段' };
      }

      case 'list': {
        const channels = engine.getAllChannels();
        if (!channels.length) return { ok: true, channels: [], message: '暂无 Channel，可通过 list_presets 查看支持的平台' };
        return {
          ok: true,
          channels: channels.map(ch => ({
            id: ch.id, name: ch.name || '', type: ch.type || '',
            enabled: !!ch.enabled, status: ch.status || 'idle',
            stats: ch.stats || {},
          })),
        };
      }

      case 'status': {
        const chId = args.channelId;
        if (!chId) return { ok: false, error: '需要 channelId 参数，可先调用 list 获取' };
        const ch = engine.getChannel(chId);
        if (!ch) return { ok: false, error: `Channel ${chId} 不存在` };
        const running = engine.isRunning(chId);
        return {
          ok: true,
          channel: {
            id: ch.id, name: ch.name, type: ch.type,
            enabled: !!ch.enabled, status: ch.status,
            running,
            stats: ch.stats || {},
            config: { imAgentId: ch.config?.imAgentId || '' },
          },
        };
      }

      case 'create': {
        if (!args.type) return { ok: false, error: '需要 type 参数（预设类型），可先调用 list_presets 查看' };
        if (!args.config) return { ok: false, error: '需要 config 参数（平台配置），可先调用 list_presets 查看所需字段' };

        const preset = engine.getPreset(args.type);
        if (!preset) return { ok: false, error: `未知预设类型 "${args.type}"，可用：${engine.getPresets().map(p => p.id).join(', ')}` };

        const requiredFields = (preset.configFields || []).filter(f => f.required).map(f => f.key);
        const missing = requiredFields.filter(k => !args.config[k]);
        if (missing.length) {
          return { ok: false, error: `缺少必填配置: ${missing.join(', ')}`, requiredFields: (preset.configFields || []).filter(f => f.required) };
        }

        const ch = engine.createChannel({
          type: args.type,
          name: args.name || preset.name || args.type,
          config: args.config,
          mode: preset.defaultMode || preset.protocol || 'webhook',
        });

        try {
          await engine.startInstance(ch.id);
          const updated = engine.getChannel(ch.id);
          return {
            ok: true,
            message: `${ch.name} Channel 已创建并启动`,
            channel: { id: ch.id, name: ch.name, type: ch.type, status: updated?.status || 'connected' },
          };
        } catch (e) {
          return {
            ok: true,
            message: `${ch.name} Channel 已创建，但启动失败: ${e.message}。请检查配置后重试 start`,
            channel: { id: ch.id, name: ch.name, type: ch.type, status: 'error' },
          };
        }
      }

      case 'start': {
        if (!args.channelId) return { ok: false, error: '需要 channelId 参数' };
        if (!engine.getChannel(args.channelId)) return { ok: false, error: `Channel ${args.channelId} 不存在` };
        await engine.startInstance(args.channelId);
        return { ok: true, message: `Channel ${args.channelId} 已启动` };
      }

      case 'stop': {
        if (!args.channelId) return { ok: false, error: '需要 channelId 参数' };
        if (!engine.getChannel(args.channelId)) return { ok: false, error: `Channel ${args.channelId} 不存在` };
        engine.stopInstance(args.channelId);
        return { ok: true, message: `Channel ${args.channelId} 已停用` };
      }

      case 'delete': {
        if (!args.channelId) return { ok: false, error: '需要 channelId 参数' };
        const ch = engine.getChannel(args.channelId);
        if (!ch) return { ok: false, error: `Channel ${args.channelId} 不存在` };
        engine.deleteChannel(args.channelId);
        return { ok: true, message: `Channel "${ch.name || args.channelId}" 已删除` };
      }

      default:
        return { ok: false, error: `未知操作: ${action}，可用: list_presets, list, status, create, start, stop, delete` };
    }
  } catch (e) {
    log.error(`manage_channel ${action} failed:`, e.message);
    return { ok: false, error: e.message };
  }
}

const meta = {
  icon: '🔗',
  risk: 'high',
  category: 'admin',
  defaultDeny: true,
};

module.exports = { schema, handler, meta };
