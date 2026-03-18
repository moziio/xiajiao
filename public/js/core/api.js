/* OpenClaw IM — Auth & Data Loaders (Layer 0) */

function authHeaders(extra) { const h = Object.assign({ 'Content-Type': 'application/json' }, extra || {}); if (ownerToken) h['Authorization'] = 'Bearer ' + ownerToken; return h; }
function authFetch(url, opts) { if (!opts) opts = {}; if (ownerToken) { if (!opts.headers) opts.headers = {}; opts.headers['Authorization'] = 'Bearer ' + ownerToken; } return fetch(url, opts); }

async function loadModels() { try { availableModels = (await (await authFetch('/api/models')).json()).models || []; } catch {} }
async function loadTopics() { try { communityTopics = (await (await authFetch('/api/community/topics')).json()).topics || []; } catch {} }
async function loadPosts(topic) {
  try {
    const url = topic ? `/api/community/posts?topic=${topic}` : '/api/community/posts';
    communityPosts = (await (await fetch(url)).json()).posts || [];
  } catch {}
}
async function loadSchedules() { try { schedulesList = (await (await authFetch('/api/schedules')).json()).schedules || []; } catch {} }
