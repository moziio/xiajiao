const store = require('../services/storage');
const gw = require('../services/gateway');
const { guardRole, jsonRes, readBody } = require('../middleware/auth');
const guardAdmin = guardRole('admin');

function _sanitizeChain(chain) {
  if (!Array.isArray(chain)) return [];
  return chain.filter(n => n && typeof n.agentId === 'string' && n.agentId).map(n => ({
    agentId: n.agentId,
    role: String(n.role || ''),
    autoTrigger: n.autoTrigger !== false,
  }));
}

function createGroup({ name, emoji, members, leader, reviewCron, collabChain }) {
  if (!name) throw new Error('name required');
  const group = { id: 'grp-' + Date.now().toString(36), name, emoji: emoji || '\u{1F465}', members: members || [], leader: leader || '', reviewCron: reviewCron || '', createdAt: Date.now() };
  if (Array.isArray(collabChain)) group.collabChain = _sanitizeChain(collabChain);
  store.groups.push(group); store.saveGroups();
  gw.broadcast({ type: 'groups_update', groups: store.groups });
  if (global.scheduler) global.scheduler.reloadSupervision();
  return { ok: true, group };
}

function updateGroup(id, { name, emoji, members, leader, reviewCron, collabChain }) {
  const group = store.groups.find(g => g.id === id);
  if (!group) throw new Error('group not found');
  if (name !== undefined) group.name = name;
  if (emoji !== undefined) group.emoji = emoji;
  if (members !== undefined) group.members = members;
  if (leader !== undefined) group.leader = leader;
  if (reviewCron !== undefined) group.reviewCron = reviewCron;
  if (collabChain !== undefined) group.collabChain = _sanitizeChain(collabChain);
  store.saveGroups(); gw.broadcast({ type: 'groups_update', groups: store.groups });
  if (global.scheduler) global.scheduler.reloadSupervision();
  return { ok: true, group };
}

function deleteGroup(id) {
  const idx = store.groups.findIndex(g => g.id === id);
  if (idx < 0) throw new Error('group not found');
  store.groups.splice(idx, 1); store.saveGroups(); gw.broadcast({ type: 'groups_update', groups: store.groups });
  return { ok: true };
}

async function handle(req, res, urlPath) {
  if (urlPath === '/api/groups' && req.method === 'GET') return jsonRes(res, 200, { groups: store.groups });
  if (urlPath === '/api/groups' && req.method === 'POST') { if (!guardAdmin(req, res)) return; return jsonRes(res, 200, createGroup(await readBody(req))); }
  const groupMatch = urlPath.match(/^\/api\/groups\/([^/]+)$/);
  if (groupMatch && req.method === 'PUT') { if (!guardAdmin(req, res)) return; return jsonRes(res, 200, updateGroup(groupMatch[1], await readBody(req))); }
  if (groupMatch && req.method === 'DELETE') { if (!guardAdmin(req, res)) return; return jsonRes(res, 200, deleteGroup(groupMatch[1])); }
  return false;
}

module.exports = { handle };
