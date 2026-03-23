const store = require('./storage');
const { createLogger } = require('../middleware/logger');
const log = createLogger('chat');

let _sendFn = null;
let _getAgentsFn = null;
let _broadcastFn = null;

function init({ sendFn, getAgentsFn, broadcastFn }) {
  _sendFn = sendFn;
  _getAgentsFn = getAgentsFn;
  _broadcastFn = broadcastFn || (() => {});
}

function _safeSend(channel, agentId, text, opts) {
  try {
    const result = _sendFn(channel, agentId, text, opts);
    if (result && typeof result.catch === 'function') {
      result.catch(err => {
        log.error(`sendFn failed for agent=${agentId} channel=${channel}:`, err.message);
        _broadcastFn({ type: 'agent_error', channel, error: `Agent 错误: ${err.message}` });
      });
    }
    return result;
  } catch (err) {
    log.error(`sendFn threw for agent=${agentId} channel=${channel}:`, err.message);
    _broadcastFn({ type: 'agent_error', channel, error: `Agent 错误: ${err.message}` });
  }
}

function getAgents() {
  if (_getAgentsFn) return _getAgentsFn();
  store.loadAgents();
  return store.localAgents.map(a => ({ id: a.id, name: a.name }));
}

function buildGroupContext(grp) {
  if (!grp) return '';
  const agents = getAgents();
  const memberAgents = (grp.members || []).map(mid => agents.find(a => a.id === mid)).filter(Boolean);
  const memberList = memberAgents.map(a => `${a.name}(${a.id})`).join(', ');
  const leaderInfo = grp.leader ? ` | 组长: ${(agents.find(a => a.id === grp.leader)?.name || grp.leader)}` : '';
  return `[群聊「${grp.name}」| 成员: ${memberList}${leaderInfo} | 注意: 你正在群聊中，请仅围绕群内成员讨论，不要提及群外的Agent]\n`;
}

async function routeGroupMessage(channel, mentions, content) {
  const grp = store.groups.find(g => g.id === channel);
  const isCustomGroup = !!grp;
  const ctx = isCustomGroup ? buildGroupContext(grp) : '';
  const agents = getAgents();

  if (mentions.includes('__all__')) {
    const members = isCustomGroup
      ? (grp.members || []).filter(mid => agents.find(a => a.id === mid))
      : agents.map(a => a.id);
    for (const mid of members) {
      _safeSend(channel, mid, ctx + content, { _skipChain: true });
      await new Promise(r => setTimeout(r, 500));
    }
    return;
  }

  if (mentions.length > 0) {
    for (const mid of mentions) { _safeSend(channel, mid, ctx + content, { _skipChain: true }); }
    return;
  }

  if (isCustomGroup) {
    const chain = grp.collabChain;
    const responderId = (chain && chain.length) ? chain[0].agentId : (grp.leader || grp.members?.[0]);
    if (responderId) _safeSend(channel, responderId, ctx + content);
    return;
  }

  if (channel === 'group') {
    const agentId = detectAgentFromText(content, agents) || agents.find(a => a.isDefault)?.id || agents[0]?.id || 'main';
    _safeSend(channel, agentId, content);
    return;
  }

  _safeSend(channel, channel, content);
}

function detectAgentFromText(text, agents) {
  const m = (text || '').match(/@(\S+)/);
  if (m) {
    const byId = agents.find(a => a.id === m[1]); if (byId) return byId.id;
    const byName = agents.find(a => a.name === m[1]); if (byName) return byName.id;
  }
  return null;
}

module.exports = { routeGroupMessage, init };
