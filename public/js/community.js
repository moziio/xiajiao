/* 虾饺 (Xiajiao) — Activity Feed Module (Layer 2)
 * Replaces the former "Community/虾区" SNS module with a read-only
 * Agent event timeline: task completions, alerts, meeting summaries, system events.
 */

let _activityFilter = null;

function updateCommunityBadge() {
  const tab = $('#tabCommunity'); if (!tab) return;
  let badge = tab.querySelector('.unread-badge');
  if (communityUnread > 0) {
    if (!badge) { badge = document.createElement('span'); badge.className = 'unread-badge'; tab.appendChild(badge); }
    badge.textContent = communityUnread > 99 ? '99+' : communityUnread;
  } else { if (badge) badge.remove(); }
}

function showPostToast(post) {
  const author = resolveAuthor(post.authorType, post.authorId);
  const toast = document.createElement('div');
  toast.className = 'toast-notify';
  toast.innerHTML = '<div class="toast-label">' + t('activity.newEvent') + '</div>'
    + '<div><strong>' + esc(author.name) + '</strong></div>'
    + '<div class="toast-body">' + esc(post.title || post.content?.slice(0, 60) || '') + '</div>';
  toast.onclick = () => { toast.remove(); switchTab('community'); showActivityFeed(); };
  document.body.appendChild(toast);
  requestAnimationFrame(() => { requestAnimationFrame(() => toast.classList.add('show')); });
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => { if (toast.parentNode) toast.remove(); }, 350); }, 5000);
}

function renderCommunityNav() {
  const v = lastCommunityView || 'plaza';
  let h = `<div class="community-nav-item${v === 'plaza' ? ' active' : ''}" onclick="showActivityFeed()"><span class="community-nav-icon">\u{1F4CB}</span><span class="community-nav-label">${t('activity.title')}</span></div>`;
  if (canManage()) h += `<div class="community-nav-item${v === 'schedules' ? ' active' : ''}" onclick="showSchedules()"><span class="community-nav-icon">\u{23F0}</span><span class="community-nav-label">${t('activity.schedules')}</span></div>`;
  panelCommunity.innerHTML = h;
}

function showActivityFeed() {
  saveDraft(); activeChannel = null; lastCommunityView = 'plaza'; renderCommunityNav();
  hideAllViews(); communityView.classList.remove('hidden'); communityView.style.display = 'flex';
  $('#communityTitle').textContent = t('activity.title');
  $('#communitySubtitle').textContent = t('activity.subtitle');
  refreshActivityFeed();
}

function showCommunityPlaza() { showActivityFeed(); }
function showCommunityTopic() { showActivityFeed(); }

function showMetrics() { activeSettingsTab = 'metrics'; openSettings(); }

async function showSchedules() {
  saveDraft(); activeChannel = null; lastCommunityView = 'schedules'; renderCommunityNav();
  hideAllViews(); scheduleView.classList.remove('hidden'); scheduleView.style.display = 'flex';
  const btn = $('#createSchedBtn'); if (btn) btn.classList.toggle('hidden', !canManage());
  await loadSchedules(); renderScheduleList();
}

async function refreshActivityFeed() {
  await loadPosts(null);
  renderActivityTabs();
  renderActivityEvents();
}
async function refreshCommunityFeed() { await refreshActivityFeed(); }

const _EVENT_TYPES = [
  { id: null,        icon: '\u{1F4CB}', labelKey: 'activity.allEvents' },
  { id: 'log',       icon: '\u2705',    labelKey: 'activity.tasks' },
  { id: 'announce',  icon: '\u26A0\uFE0F', labelKey: 'activity.alerts' },
  { id: 'meeting',   icon: '\u{1F4DD}', labelKey: 'activity.meetings' },
];

function renderActivityTabs() {
  communityTabs.innerHTML = _EVENT_TYPES.map(et =>
    `<button class="community-tab${_activityFilter === et.id ? ' active' : ''}" onclick="_activityFilter=${et.id === null ? 'null' : "'" + et.id + "'"};refreshActivityFeed()">${et.icon} ${t(et.labelKey)}</button>`
  ).join('');
}

function renderActivityEvents() {
  let events = communityPosts;
  if (_activityFilter) {
    events = events.filter(p => {
      if (_activityFilter === 'log') return p.type === 'log' || p.type === 'showcase';
      if (_activityFilter === 'announce') return p.type === 'announce';
      if (_activityFilter === 'meeting') return (p.tags || []).some(tg => tg === '例会' || tg === 'meeting' || tg === 'Meeting');
      return true;
    });
  }
  if (!events.length) {
    communityFeed.innerHTML = '<div class="activity-empty"><div class="activity-empty-icon">\u{1F4ED}</div><div class="activity-empty-text">' + t('activity.noEvents') + '</div></div>';
    return;
  }
  communityFeed.innerHTML = events.map(renderEventCard).join('');
}

function _eventMeta(p) {
  if (p.type === 'announce' && (p.tags || []).some(tg => tg === '告警' || tg === 'Alert'))
    return { icon: '\u26A0\uFE0F', cls: 'icon-alert' };
  if (p.type === 'announce')
    return { icon: '\u{1F4E2}', cls: 'icon-alert' };
  if ((p.tags || []).some(tg => tg === '例会' || tg === 'meeting' || tg === 'Meeting'))
    return { icon: '\u{1F4DD}', cls: 'icon-meeting' };
  if (p.type === 'log' || p.type === 'showcase')
    return { icon: '\u2705', cls: 'icon-task' };
  return { icon: '\u{1F4CB}', cls: 'icon-system' };
}

function renderEventCard(p) {
  const author = resolveAuthor(p.authorType, p.authorId);
  const timeStr = formatTime(p.ts);
  const meta = _eventMeta(p);
  const hpid = escH(p.id); const spid = escJs(p.id);
  const tags = (p.tags || []).map(tg => `<span class="post-tag${tg === '系统' || tg === '告警' || tg === 'System' || tg === 'Alert' ? ' system-tag' : ''}">${esc(tg)}</span>`).join('');
  const hasLongContent = p.content && p.content.length > 120;
  const expandLabel = t('activity.viewDetail');

  return `<div class="post-card event-card" id="post-${hpid}">
    <div class="post-author">
      <div class="event-icon ${meta.cls}">${meta.icon}</div>
      <div>
        <div class="post-author-name">${esc(author.name)} <span class="post-tags">${tags}</span></div>
        <div style="font-size:11px;color:var(--text3)">${timeStr}</div>
      </div>
      ${canManage() ? `<button class="post-action-btn event-del-btn" onclick="deleteEvent('${spid}')" title="${t('common.delete')}">&times;</button>` : ''}
    </div>
    ${p.title ? `<div class="post-title">${esc(p.title)}</div>` : ''}
    <div class="post-expand-wrap" id="pew-${hpid}">
      <div class="post-content md-content${hasLongContent ? '' : ' expanded'}">${renderMarkdown(p.content)}</div>
      ${hasLongContent ? `<button class="post-expand-btn" onclick="togglePostExpand('${spid}')">${expandLabel}</button>` : ''}
    </div>
  </div>`;
}

function togglePostExpand(postId) {
  const wrap = document.getElementById('pew-' + postId);
  if (!wrap) return;
  const content = wrap.querySelector('.post-content');
  const btn = wrap.querySelector('.post-expand-btn');
  if (!content || !btn) return;
  const expanded = content.classList.toggle('expanded');
  btn.textContent = expanded ? t('activity.collapse') : t('activity.viewDetail');
}

async function deleteEvent(postId) {
  if (!await appConfirm(t('activity.deleteConfirm'))) return;
  try { await authFetch('/api/community/posts/' + postId, { method: 'DELETE' }); refreshActivityFeed(); } catch {}
}
function deletePost(id) { return deleteEvent(id); }
