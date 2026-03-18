/* OpenClaw IM — @Mention Popup (Layer 2) */

msgInput.addEventListener('keydown', e => {
  if (mentionPopup.classList.contains('hidden')) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }
  else { if (e.key === 'ArrowDown'||e.key === 'ArrowUp') { e.preventDefault(); navigateMention(e.key==='ArrowDown'?1:-1); } else if (e.key==='Enter'||e.key==='Tab') { e.preventDefault(); selectHighlightedMention(); } else if (e.key==='Escape') { e.preventDefault(); hideMentionPopup(); } }
});
msgInput.addEventListener('input', () => { msgInput.style.height = 'auto'; msgInput.style.height = Math.min(msgInput.scrollHeight, 160)+'px'; checkMentionTrigger(); clearTimeout(typingTimer); if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'typing' })); });
chatName.addEventListener('click', () => { if (chatName.classList.contains('editable') && activeChannel && !renaming) startRenameChannel(); });

function insertMention(id) {
  if (id === '__all__') { const c = msgInput.value; msgInput.value = (c && !c.endsWith(' ') ? c+' ' : c) + '@' + t('chat.mentionAll') + ' '; msgInput.focus(); hideMentionPopup(); return; }
  const ag = AGENTS.find(a => a.id === id); if (!ag) return; const c = msgInput.value; msgInput.value = (c && !c.endsWith(' ') ? c+' ' : c) + '@'+ag.name+' '; msgInput.focus(); hideMentionPopup();
}
let mentionStart = -1, mentionHighlight = 0;
function checkMentionTrigger() {
  const val = msgInput.value, cur = msgInput.selectionStart; let at = -1;
  if (isDirectAgent(activeChannel)) { hideMentionPopup(); return; }
  for (let i = cur-1; i >= 0; i--) { if (val[i]==='@' && (i===0||val[i-1]===' '||val[i-1]==='\n')) { at = i; break; } if (val[i]===' '||val[i]==='\n') break; }
  if (at === -1) { hideMentionPopup(); return; }
  mentionStart = at; const q = val.substring(at+1, cur).toLowerCase();
  const grp = customGroups.find(g => g.id === activeChannel);
  const pool = grp ? (grp.members || []).map(mid => AGENTS.find(a => a.id === mid)).filter(Boolean) : AGENTS;
  const f = pool.filter(a => a.id.toLowerCase().includes(q)||a.name.toLowerCase().includes(q));
  const allLabel = t('chat.mentionAll'); const showAll = allLabel.toLowerCase().includes(q) || q === '';
  if (!f.length && !showAll) { hideMentionPopup(); return; }
  const items = []; if (showAll) items.push({ id: '__all__', name: allLabel, emoji: '\uD83D\uDCE2', _isAll: true }); items.push(...f);
  mentionHighlight = Math.min(mentionHighlight, items.length-1); showMentionPopup(items);
}
function showMentionPopup(agents) {
  mentionPopup._agents = agents;
  mentionPopup.innerHTML = agents.map((a, i) => `<div class="mention-item ${i===mentionHighlight?'highlighted':''}" onmousedown="selectMention('${escJs(a.id)}')" onmouseenter="mentionHighlight=${i};showMentionPopup(mentionPopup._agents)"><span class="mention-emoji">${esc(a.emoji)}</span><span class="mention-name">${esc(a.name)}</span><span class="mention-id">${esc(a.id)}</span></div>`).join('');
  mentionPopup.classList.remove('hidden');
}
function hideMentionPopup() { mentionPopup.classList.add('hidden'); mentionStart = -1; mentionHighlight = 0; }
function navigateMention(d) { const a = mentionPopup._agents; if (!a?.length) return; mentionHighlight = (mentionHighlight+d+a.length)%a.length; showMentionPopup(a); }
function selectHighlightedMention() { const a = mentionPopup._agents; if (a?.length) selectMention(a[mentionHighlight].id); }
function selectMention(id) { if (mentionStart<0) return; const isAll = id === '__all__'; const n = isAll ? t('chat.mentionAll') : (AGENTS.find(a => a.id===id)?.name || id); const v = msgInput.value, c = msgInput.selectionStart; msgInput.value = v.substring(0,mentionStart)+'@'+n+' '+v.substring(c); const np = mentionStart+n.length+2; msgInput.setSelectionRange(np,np); msgInput.focus(); hideMentionPopup(); }
