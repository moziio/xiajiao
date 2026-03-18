const { jsonRes } = require('./middleware/auth');
const { createLogger } = require('./middleware/logger');
const authRoute = require('./routes/auth');
const agentsRoute = require('./routes/agents');
const groupsRoute = require('./routes/groups');
const communityRoute = require('./routes/community');
const settingsRoute = require('./routes/settings');
const workflowsRoute = require('./routes/workflows');
const linkPreviewRoute = require('./routes/link-preview');
const messagesRoute = require('./routes/messages');
const userPrefsRoute = require('./routes/user-prefs');
const collabFlowRoute = require('./routes/collab-flows');

const communityHandle = (req, res, urlPath, query) => communityRoute.handle(req, res, urlPath, query);

const prefixMap = {
  'auth':           authRoute.handle,
  'agents':         agentsRoute.handle,
  'models':         agentsRoute.handle,
  'mermaid':        agentsRoute.handle,
  'groups':         groupsRoute.handle,
  'community':      communityHandle,
  'profiles':       communityHandle,
  'metrics':        communityHandle,
  'schedules':      communityHandle,
  'settings':       settingsRoute.handle,
  'workflows':      workflowsRoute.handle,
  'link-preview':   linkPreviewRoute.handle,
  'messages':       messagesRoute.handle,
  'user':           userPrefsRoute.handle,
  'tools':          agentsRoute.handle,
  'collab-flows':   collabFlowRoute.handle,
};

async function handleApi(req, res, urlPath, query) {
  try {
    const seg = urlPath.split('/')[2] || '';
    const handler = prefixMap[seg];
    if (handler) {
      const result = await handler(req, res, urlPath, query);
      if (result !== false) return;
    }
    jsonRes(res, 404, { error: 'not found' });
  } catch (e) {
    const log = req.log || createLogger('api', req.reqId);
    log.error(`${req.method} ${urlPath} error:`, e.message);
    if (!res.writableEnded) jsonRes(res, 500, { error: '服务器内部错误' });
  }
}

module.exports = { handleApi };
