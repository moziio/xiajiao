/* OpenClaw IM — Global State & Constants (Layer 1) */

let activeSettingsTab = 'general';

const KB_TEXT_EXTS = ['.md','.txt','.json','.csv','.yaml','.yml','.xml','.html','.css','.js','.ts','.py','.java','.go','.rs','.sql','.sh','.bat','.log','.ini','.cfg','.toml','.env'];
const KB_BIN_EXTS = ['.pdf','.doc','.docx','.xls','.xlsx','.ppt','.pptx','.png','.jpg','.jpeg','.gif','.svg','.webp'];
const KB_ACCEPT = KB_TEXT_EXTS.concat(KB_BIN_EXTS).join(',');
function isKbTextFile(name) { const ext = (name || '').toLowerCase().replace(/^.*(\.\w+)$/, '$1'); return KB_TEXT_EXTS.includes(ext); }
function kbFileIcon(name) {
  const n = (name || '').toLowerCase();
  if (/\.(md|txt|log)$/.test(n)) return '\u{1F4DD}';
  if (/\.(json|yaml|yml|toml|ini|cfg|xml|env)$/.test(n)) return '\u2699\uFE0F';
  if (/\.(js|ts|py|java|go|rs|sql|sh|bat|css|html)$/.test(n)) return '\u{1F4BB}';
  if (/\.(pdf|doc|docx)$/.test(n)) return '\u{1F4C4}';
  if (/\.(xls|xlsx|csv)$/.test(n)) return '\u{1F4CA}';
  if (/\.(ppt|pptx)$/.test(n)) return '\u{1F4CA}';
  if (/\.(png|jpg|jpeg|gif|svg|webp)$/.test(n)) return '\u{1F5BC}\uFE0F';
  return '\u{1F4C4}';
}

let AGENTS = [], customGroups = [], availableModels = [], communityTopics = [], communityPosts = [], schedulesList = [], workflowDefs = [];
let activeTab = 'chats', activeChannel = null, activeCommunityTopic = null, communityUnread = 0;
let _lastChatsChannel = null;
let lastCommunityView = null;
let ws = null, me = null, _myUserId = null, isOwner = false, ownerToken = '', allMessages = [], onlineUsers = [];
let myRole = 'guest';
let _guestCanChat = true;
const _ROLE_LEVEL = { owner: 3, admin: 2, member: 1, guest: 0 };
function canManage() { return (_ROLE_LEVEL[myRole] || 0) >= 2; }
function canChat() { return (_ROLE_LEVEL[myRole] || 0) >= 1 || (myRole === 'guest' && _guestCanChat); }
let typingTimer = null, reconnectDelay = 1000, reconnectHandle = null, streamingText = new Map();
const channelDrafts = new Map();
const unreadCounts = new Map();
let renaming = false;
let trainMode = false;

const $ = s => document.querySelector(s);
const loginPage = $('#loginPage'), appPage = $('#appPage'), nameInput = $('#nameInput');
const sidebar = $('#sidebar'), panelChats = $('#panelChats'), panelContacts = $('#panelContacts'), panelCommunity = $('#panelCommunity');
const welcomeScreen = $('#welcomeScreen'), chatView = $('#chatView'), communityView = $('#communityView');
const metricsView = $('#metricsView'), scheduleView = $('#scheduleView'), settingsView = $('#settingsView'), favDetailView = $('#favDetailView');
const chatName = $('#chatName'), chatStatus = $('#chatStatus'), memberTags = $('#memberTags');
const messagesEl = $('#messages'), msgInput = $('#msgInput'), fileInput = $('#fileInput');
const composeBox = $('#composeBox'), attachStrip = $('#attachStrip');
const typingIndicator = $('#typingIndicator'), reconnectBanner = $('#reconnectBanner');
const mentionPopup = $('#mentionPopup'), manageModal = $('#manageModal');
const profileModal = $('#profileModal'), postModal = $('#postModal');
const gwDot = $('#gwDot');
const communityFeed = $('#communityFeed'), communityTabs = $('#communityTabs');
const metricsDashboard = $('#metricsDashboard'), scheduleList = $('#scheduleList');

const DE = ['\u{1F916}','\u{1F4CB}','\u{270D}\uFE0F','\u{1F680}','\u{1F50D}','\u{1F4A1}','\u{1F4CA}','\u{1F3AF}'];
const DC = ['#00d4ff','#ff8a00','#00f5a0','#8b5cf6','#ff3b5c','#0099cc','#e67e22','#2ecc71'];
const _agentDescCache = {};

const EMOJI_PICKS = ['\u{1F916}','\u{1F4CB}','\u270D\uFE0F','\u{1F680}','\u{1F50D}','\u{1F4A1}','\u{1F4CA}','\u{1F3AF}','\u{1F9E0}','\u{1F4BB}','\u{1F4DD}','\u{1F3A8}','\u{1F527}','\u26A1','\u{1F31F}','\u{1F3AD}','\u{1F4F1}','\u{1F3C6}','\u{1F52C}','\u{1F4DA}','\u{1F3AC}','\u{1F3B5}','\u{1F308}','\u{1F431}','\u{1F436}','\u{1F98A}','\u{1F43C}','\u{1F428}','\u{1F981}','\u{1F42F}','\u{1F438}','\u{1F419}','\u{1F98B}','\u{1F338}','\u{1F33A}','\u{1F340}','\u{1F525}','\u2744\uFE0F','\u2B50','\u{1F48E}','\u{1F465}','\u{1F46B}','\u{1F468}\u200D\u{1F4BB}','\u{1F469}\u200D\u{1F52C}','\u{1F9D1}\u200D\u{1F3A8}','\u{1F47E}','\u{1F5A5}\uFE0F','\u{1F4E1}','\u{1F6E0}\uFE0F','\u{1F9F2}'];

// ── Theme ──
function initTheme() { applyTheme(storageGet('im-theme') || 'dark'); }
function applyTheme(th) {
  document.documentElement.setAttribute('data-theme', th); storageSet('im-theme', th);
  const hljsLink = document.getElementById('hljsTheme');
  if (hljsLink) hljsLink.href = th === 'light' ? '/css/highlight-light.min.css' : '/css/highlight-dark.min.css';
  const sc = document.getElementById('settingsContent');
  if (sc && activeSettingsTab === 'general' && typeof renderSettingsNav === 'function') { renderSettingsNav(); renderSettingsGeneral(sc); }
}
function toggleTheme() { applyTheme((document.documentElement.getAttribute('data-theme') || 'dark') === 'dark' ? 'light' : 'dark'); }
initTheme();

// ── View ──
function hideAllViews() { [welcomeScreen, chatView, communityView, metricsView, scheduleView, settingsView, favDetailView].forEach(v => { if (v) { v.classList.add('hidden'); v.style.display = 'none'; } }); }

// ── Entity Resolution ──
function resolveChannelInfo(c) {
  if (c === 'group') return { id: 'group', name: storageGet('im-group-name') || t('contacts.defaultGroup'), emoji: storageGet('im-emoji-group') || '\u{1F465}', type: 'group' };
  if (c && c.startsWith('wf_')) {
    const wfId = c.slice(3);
    const w = workflowDefs.find(x => x.id === wfId);
    if (w) return { id: c, name: w.name, emoji: w.emoji || '⚙️', type: 'workflow', steps: w.steps };
    return { id: c, name: t('workflow.section'), emoji: '⚙️', type: 'workflow' };
  }
  const g = customGroups.find(x => x.id === c); if (g) return { id: g.id, name: g.name, emoji: g.emoji || '\u{1F465}', type: 'custom-group', members: g.members };
  const a = AGENTS.find(x => x.id === c); if (a) return { id: a.id, name: a.name, emoji: a.emoji, type: 'direct' };
  return null;
}
function resolveAuthor(type, id) {
  if (type === 'system') return { name: t('profile.system'), emoji: '\u{1F4E2}', color: '#ff8a00', badge: t('profile.system') };
  if (type === 'agent') { const a = AGENTS.find(x => x.id === id); return a ? { name: a.name, emoji: a.emoji, color: a.color, badge: t('profile.agent') } : { name: id, emoji: '\u{1F916}', color: '#00d4ff', badge: t('profile.agent') }; }
  if (type === 'group') { const g = customGroups.find(x => x.id === id); return g ? { name: g.name, emoji: g.emoji || '\u{1F465}', color: '#8b5cf6', badge: t('profile.group') } : { name: id, emoji: '\u{1F465}', color: '#8b5cf6', badge: t('profile.group') }; }
  return { name: me?.name || id, emoji: (me?.name || '?')[0], color: me?.color || '#00d4ff', badge: t('role.' + myRole) || myRole };
}
function topicName(id) { return communityTopics.find(t => t.id === id)?.name || id || ''; }
