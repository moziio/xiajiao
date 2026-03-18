const path = require('path');
const fs = require('fs');

function resolvePort() {
  if (process.env.IM_PORT) return parseInt(process.env.IM_PORT, 10);
  try {
    const s = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'im-settings.json'), 'utf8'));
    if (s.port) return parseInt(s.port, 10);
  } catch {}
  return 18800;
}
const PORT = resolvePort();
const GATEWAY_WS = process.env.GATEWAY_WS || 'ws://127.0.0.1:18789';
const GATEWAY_HTTP = process.env.GATEWAY_HTTP || 'http://127.0.0.1:18789';

const ROOT_DIR = path.join(__dirname, '..');
const AGENTS_FILE = path.join(ROOT_DIR, 'agents.json');
const MODELS_FILE = path.join(ROOT_DIR, 'models.json');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DB_FILE = path.join(DATA_DIR, 'xiajiao.db');
const HISTORY_FILE = path.join(ROOT_DIR, 'chat-history.json');
const GROUPS_FILE = path.join(ROOT_DIR, 'groups.json');
const POSTS_FILE = path.join(ROOT_DIR, 'community-posts.json');
const TOPICS_FILE = path.join(ROOT_DIR, 'community-topics.json');
const PROFILES_FILE = path.join(ROOT_DIR, 'agent-profiles.json');
const METRICS_FILE = path.join(ROOT_DIR, 'agent-metrics.json');
const SCHEDULES_FILE = path.join(ROOT_DIR, 'community-schedules.json');
const SETTINGS_FILE = path.join(ROOT_DIR, 'im-settings.json');
const WORKFLOWS_FILE = path.join(ROOT_DIR, 'workflows.json');
const UPLOADS_DIR = path.join(ROOT_DIR, 'public', 'uploads');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const OWNER_KEY = process.env.OWNER_KEY || 'xiajiao-admin';
const MAX_HISTORY = 500;

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.mp4': 'video/mp4', '.pdf': 'application/pdf',
};

const DEFAULT_TOPICS = [
  { id: 'daily', name: '每日速报', icon: '\u{1F4F0}', description: '每日工作动态与资讯' },
  { id: 'tech', name: '技术探讨', icon: '\u{1F4A1}', description: '技术话题讨论与分享' },
  { id: 'showcase', name: '成果展示', icon: '\u{1F3C6}', description: '展示工作成果与作品' },
  { id: 'announce', name: '团队公告', icon: '\u{1F4E2}', description: '重要通知与公告' },
];

function getGatewayToken() {
  return process.env.GATEWAY_TOKEN || '';
}

function getLLMMode() {
  try {
    const s = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'im-settings.json'), 'utf8'));
    if (s.llmMode) return s.llmMode;
  } catch {}
  return process.env.LLM_MODE || 'direct';
}

module.exports = {
  PORT, GATEWAY_WS, GATEWAY_HTTP,
  ROOT_DIR, AGENTS_FILE, MODELS_FILE, DATA_DIR, DB_FILE, HISTORY_FILE,
  GROUPS_FILE, POSTS_FILE, TOPICS_FILE, PROFILES_FILE,
  METRICS_FILE, SCHEDULES_FILE, SETTINGS_FILE, WORKFLOWS_FILE, UPLOADS_DIR, PUBLIC_DIR,
  OWNER_KEY, MAX_HISTORY, MIME, DEFAULT_TOPICS,
  getGatewayToken, getLLMMode,
};
