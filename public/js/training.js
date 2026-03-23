/* 虾饺 (Xiajiao) — Training Toolbar (Layer 2) */

function updateTrainToolbar(chId) {
  const tb = document.getElementById('trainToolbar'); if (!tb) return;
  if (!isOwner || !isDirectAgent(chId)) { tb.classList.add('hidden'); tb.innerHTML = ''; trainMode = false; return; }
  tb.classList.remove('hidden');
  tb.innerHTML = `<div class="train-tb-inner"><span class="train-tb-label">${t('train.toolbarLabel')}</span><div class="train-tb-actions"><button class="train-tb-btn" onclick="document.getElementById('kbFileInput').click()" title="${t('train.uploadKb')}">${t('train.uploadKb')}</button><button class="train-tb-btn" onclick="trainRememberConversation()" title="${t('train.rememberChat')}">${t('train.rememberChat')}</button><button class="train-tb-btn" onclick="trainEditSoul()" title="${t('train.editSoul')}">${t('train.editSoul')}</button></div><div class="train-tb-hint">${t('train.toolbarHint')}</div></div>`;
}
document.getElementById('kbFileInput')?.addEventListener('change', async function() {
  const file = this.files[0]; if (!file || !activeChannel) return;
  const agentId = activeChannel;
  if (!isDirectAgent(agentId)) { showToastMsg(t('train.onlyDirectChat'), 'error'); this.value = ''; return; }
  const v = validateKbFile(file);
  if (!v.ok) { showToastMsg(v.msg, 'error'); this.value = ''; return; }
  try { const r = await uploadKbFile(agentId, file); if (r.ok) showToastMsg(t('train.savedToKb', {name: file.name})); else showToastMsg((r.error || r.reason || t('profile.saveFail')), 'error'); } catch (e) { showToastMsg(t('profile.saveFail') + ': ' + e.message, 'error'); }
  this.value = '';
});
async function uploadKbFile(agentId, file) {
  if (isKbTextFile(file.name)) { const content = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsText(file); }); return (await authFetch('/api/agents/' + agentId + '/files/' + encodeURIComponent(file.name), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) })).json(); }
  const fd = new FormData(); fd.append('file', file); return (await authFetch('/api/agents/' + agentId + '/upload', { method: 'POST', body: fd })).json();
}
async function trainRememberConversation() {
  if (!activeChannel || !isDirectAgent(activeChannel)) return;
  const msgs = filterMessages().slice(-20); if (msgs.length === 0) { showToastMsg(t('train.noConversation'), 'error'); return; }
  let md = (_lang==='zh'?'# 对话记录':'# Conversation Log') + '\n\n> ' + (_lang==='zh'?'导出时间':'Exported at') + ': ' + new Date().toLocaleString() + '\n\n';
  for (const m of msgs) { const who = m.type === 'agent' ? (AGENTS.find(a => a.id === m.agent)?.name || 'Agent') : (m.userName || t('profile.user')); md += `**${who}**: ${m.text || ''}\n\n`; }
  const fn = 'conversation-' + new Date().toISOString().slice(0, 10) + '-' + Date.now().toString(36) + '.md';
  try { const r = await (await authFetch('/api/agents/' + activeChannel + '/files/' + encodeURIComponent(fn), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: md }) })).json(); if (r.ok) showToastMsg(t('train.conversationSaved', {name: fn})); else showToastMsg(t('profile.saveFail'), 'error'); } catch (e) { showToastMsg(t('profile.saveFail') + ': ' + e.message, 'error'); }
}
async function trainEditSoul() { if (!activeChannel || !isDirectAgent(activeChannel)) return; manageModal.classList.remove('hidden'); openAgentDetail(activeChannel); }
async function trainRememberMsg(ts, agent, userId, text) {
  if (!activeChannel || !isDirectAgent(activeChannel)) return; const agentId = activeChannel; const fn = 'notes.md'; let existing = '';
  try { existing = (await (await authFetch('/api/agents/' + agentId + '/files/' + encodeURIComponent(fn))).json()).content || ''; } catch {}
  const who = agent ? (AGENTS.find(a => a.id === agent)?.name || 'Agent') : t('profile.user'); const timeStr = new Date(ts).toLocaleString();
  const newEntry = `\n\n---\n**${who}** (${timeStr}):\n${text}\n`; const content = existing ? existing + newEntry : (_lang==='zh'?'# 记忆笔记':'# Memory Notes') + '\n' + newEntry;
  try { const r = await (await authFetch('/api/agents/' + agentId + '/files/' + encodeURIComponent(fn), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) })).json(); if (r.ok) showToastMsg(t('train.msgRemembered')); else showToastMsg(t('profile.saveFail'), 'error'); } catch (e) { showToastMsg(t('profile.saveFail') + ': ' + e.message, 'error'); }
}
async function trainSaveFileToKB(fileUrl, fileName) {
  if (!activeChannel || !isDirectAgent(activeChannel)) return;
  try { const resp = await fetch(fileUrl); const text = await resp.text(); const r = await (await authFetch('/api/agents/' + activeChannel + '/files/' + encodeURIComponent(fileName), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: text }) })).json(); if (r.ok) showToastMsg(t('train.fileSavedToKb', {name: fileName})); else showToastMsg(t('profile.saveFail'), 'error'); } catch (e) { showToastMsg(t('profile.saveFail') + ': ' + e.message, 'error'); }
}
