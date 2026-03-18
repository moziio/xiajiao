const collabFlow = require('../services/collab-flow');
const { jsonRes } = require('../middleware/auth');

async function handle(req, res, urlPath, query) {
  if (req.method === 'GET' && urlPath === '/api/collab-flows') {
    const channel = query ? query.get('channel') : null;
    const flows = channel
      ? collabFlow.getFlowHistory(channel, 20)
      : collabFlow.getAllFlowHistory(50);
    return jsonRes(res, 200, { ok: true, flows });
  }

  if (req.method === 'GET' && urlPath === '/api/collab-flows/active') {
    const channel = query ? query.get('channel') : null;
    if (!channel) return jsonRes(res, 400, { error: 'channel required' });
    const flow = collabFlow.getActiveFlow(channel);
    return jsonRes(res, 200, { ok: true, flow });
  }

  return false;
}

module.exports = { handle };
