/**
 * 内置工具：manage_schedule — 对话式定时任务管理（M13）
 * 全局注册 + defaultDeny：仅授权 Agent（虾饺管家）可用
 */
const { createLogger } = require('../../middleware/logger');
const log = createLogger('tool:manage-schedule');

const schema = {
  description: '管理定时任务（查看、创建、启停、删除）。用户说"每天X点让Agent做Y"、"定时运行工作流"、"X分钟后提醒我"时调用。',
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['list', 'create', 'update', 'enable', 'disable', 'run_now', 'delete', 'status'],
        description: '操作类型：list=列出任务, create=创建, update=修改, enable/disable=启停, run_now=立即执行, delete=删除, status=查看详情',
      },
      type: {
        type: 'string',
        enum: ['agent-prompt', 'group-prompt', 'workflow-run'],
        description: '任务类型（create 时必需）',
      },
      targetId: {
        type: 'string',
        description: '目标 ID：Agent ID / 群组 ID / 工作流 ID（create 时必需）',
      },
      name: {
        type: 'string',
        description: '任务名称（create 时使用）',
      },
      cron: {
        type: 'string',
        description: 'Cron 表达式，如 "0 8 * * *"=每天8点, "0 17 * * 5"=每周五17点（create 时使用）',
      },
      prompt: {
        type: 'string',
        description: '执行时发送的提示词（create 时使用，支持 {{date}} {{weekday}} 等变量）',
      },
      once: {
        type: 'string',
        description: '一次性执行时间（ISO 8601 格式，如 "2026-03-15T10:00:00"），与 cron/interval 互斥',
      },
      intervalMinutes: {
        type: 'number',
        description: '间隔执行（分钟），最小 1 分钟，与 cron/once 互斥',
      },
      taskId: {
        type: 'string',
        description: '目标任务 ID（enable/disable/run_now/delete/status 时使用）',
      },
    },
    required: ['action'],
  },
};

async function handler(args, context) {
  const scheduler = global.taskScheduler;
  if (!scheduler) return { ok: false, error: '定时任务引擎未初始化' };

  try {
    switch (args.action) {

      case 'list': {
        const tasks = scheduler.listTasks(args.type ? { type: args.type } : undefined);
        if (!tasks.length) return { ok: true, tasks: [], message: '暂无定时任务，可用 create 创建' };
        return {
          ok: true,
          tasks: tasks.map(t => ({
            id: t.id,
            name: t.name,
            type: t.type,
            schedule: `${t.schedule_kind}: ${t.schedule_expr}`,
            targetId: t.target_id,
            enabled: !!t.enabled,
            lastRun: t.last_run ? new Date(t.last_run).toLocaleString('zh-CN') : null,
            lastStatus: t.last_status,
            runCount: t.run_count,
          })),
        };
      }

      case 'create': {
        if (!args.type) return { ok: false, error: '需要 type 参数（agent-prompt / group-prompt / workflow-run）' };
        if (!args.targetId) return { ok: false, error: '需要 targetId 参数（目标 Agent/群组/工作流 ID）' };

        let scheduleKind, scheduleExpr;
        if (args.once) {
          scheduleKind = 'once';
          scheduleExpr = args.once;
        } else if (args.intervalMinutes) {
          scheduleKind = 'interval';
          scheduleExpr = String(Math.max(args.intervalMinutes, 1) * 60000);
        } else {
          scheduleKind = 'cron';
          scheduleExpr = args.cron || '0 9 * * *';
        }

        const task = scheduler.createTask({
          name: args.name || '定时任务',
          type: args.type,
          scheduleKind,
          scheduleExpr,
          targetId: args.targetId,
          payload: { prompt: args.prompt || '' },
          createdBy: context?.agentId || 'agent',
          deleteAfterRun: scheduleKind === 'once',
        });

        const typeLabel = { 'agent-prompt': 'Agent 任务', 'group-prompt': '群聊任务', 'workflow-run': '工作流触发' }[args.type] || args.type;
        return {
          ok: true,
          taskId: task.id,
          message: `✅ 定时任务「${task.name}」已创建并启动`,
          detail: {
            type: typeLabel,
            schedule: _humanReadableSchedule(scheduleKind, scheduleExpr),
            targetId: args.targetId,
          },
        };
      }

      case 'update': {
        if (!args.taskId) return { ok: false, error: '需要 taskId 参数，可先 list 查看' };
        const updateData = {};
        if (args.name) updateData.name = args.name;
        if (args.prompt) updateData.payload = { prompt: args.prompt };
        if (args.targetId) updateData.targetId = args.targetId;
        if (args.cron) { updateData.scheduleKind = 'cron'; updateData.scheduleExpr = args.cron; }
        else if (args.once) { updateData.scheduleKind = 'once'; updateData.scheduleExpr = args.once; }
        else if (args.intervalMinutes) { updateData.scheduleKind = 'interval'; updateData.scheduleExpr = String(Math.max(args.intervalMinutes, 1) * 60000); }
        const updated = scheduler.updateTask(args.taskId, updateData);
        return { ok: true, message: `任务「${updated.name}」已更新`, taskId: args.taskId };
      }

      case 'enable': {
        if (!args.taskId) return { ok: false, error: '需要 taskId 参数，可先 list 查看' };
        scheduler.enableTask(args.taskId);
        return { ok: true, message: `任务 ${args.taskId} 已启用` };
      }

      case 'disable': {
        if (!args.taskId) return { ok: false, error: '需要 taskId 参数' };
        scheduler.disableTask(args.taskId);
        return { ok: true, message: `任务 ${args.taskId} 已暂停` };
      }

      case 'run_now': {
        if (!args.taskId) return { ok: false, error: '需要 taskId 参数' };
        scheduler.runNow(args.taskId);
        return { ok: true, message: `任务 ${args.taskId} 已触发执行` };
      }

      case 'delete': {
        if (!args.taskId) return { ok: false, error: '需要 taskId 参数' };
        scheduler.deleteTask(args.taskId);
        return { ok: true, message: `任务 ${args.taskId} 已删除` };
      }

      case 'status': {
        if (!args.taskId) return { ok: false, error: '需要 taskId 参数' };
        const info = scheduler.getTaskStatus(args.taskId);
        if (!info) return { ok: false, error: '任务不存在' };
        return {
          ok: true,
          task: {
            id: info.id,
            name: info.name,
            type: info.type,
            schedule: `${info.schedule_kind}: ${info.schedule_expr}`,
            enabled: !!info.enabled,
            runCount: info.run_count,
            lastRun: info.last_run ? new Date(info.last_run).toLocaleString('zh-CN') : null,
            lastStatus: info.last_status,
            lastError: info.last_error,
          },
          recentRuns: (info.recentRuns || []).map(r => ({
            status: r.status,
            time: new Date(r.started).toLocaleString('zh-CN'),
            duration: r.duration ? `${r.duration}ms` : null,
            error: r.error || null,
          })),
        };
      }

      default:
        return { ok: false, error: `未知操作: ${args.action}，可用: list, create, enable, disable, run_now, delete, status` };
    }
  } catch (e) {
    log.error(`manage_schedule ${args.action} failed:`, e.message);
    return { ok: false, error: e.message };
  }
}

function _humanReadableSchedule(kind, expr) {
  if (kind === 'once') return `一次性: ${new Date(expr).toLocaleString('zh-CN')}`;
  if (kind === 'interval') return `每 ${Math.round(parseInt(expr, 10) / 60000)} 分钟`;
  return `cron: ${expr}`;
}

const meta = {
  icon: '⏰',
  risk: 'medium',
  category: 'admin',
  defaultDeny: true,
};

module.exports = { schema, handler, meta };
