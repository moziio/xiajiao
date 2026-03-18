/* M5 — 协作流可视化面板 */

var _currentFlow = null;
var _flowHistoryCache = [];

function _getFlowPanel() {
  var el = document.getElementById('collabFlowPanel');
  if (el) return el;
  var loadMoreBar = document.getElementById('loadMoreBar');
  if (!loadMoreBar) return null;
  el = document.createElement('div');
  el.id = 'collabFlowPanel';
  el.className = 'collab-flow-panel';
  loadMoreBar.parentNode.insertBefore(el, loadMoreBar.nextSibling);
  return el;
}

function handleCollabFlowUpdate(msg) {
  if (!msg.flow) return;
  var flow = msg.flow;
  if (flow.channel !== activeChannel) return;

  if (flow.status === 'completed' || flow.status === 'failed') {
    _currentFlow = null;
    _renderFlowPanel(flow);
    setTimeout(function() {
      var panel = document.getElementById('collabFlowPanel');
      if (panel) panel.classList.remove('active');
    }, 5000);
    return;
  }

  _currentFlow = flow;
  _renderFlowPanel(flow);
}

function _renderFlowPanel(flow) {
  var panel = _getFlowPanel();
  if (!panel) return;
  panel.classList.add('active');

  var doneCount = 0;
  var totalNodes = flow.nodes ? flow.nodes.length : 0;
  if (flow.nodes) {
    for (var i = 0; i < flow.nodes.length; i++) {
      if (flow.nodes[i].status === 'done') doneCount++;
    }
  }
  var pct = totalNodes > 0 ? Math.round((doneCount / totalNodes) * 100) : 0;
  var statusLabel = flow.status === 'completed' ? '\u2705 \u5b8c\u6210'
    : flow.status === 'failed' ? '\u274c \u5931\u8d25'
    : '\u{1F504} \u8fd0\u884c\u4e2d';

  var h = '<div class="collab-flow-header">';
  h += '<div class="collab-flow-title"><span class="collab-flow-title-icon">\u{1F517}</span> \u534f\u4f5c\u6d41 ' + statusLabel + '</div>';
  h += '<div class="collab-flow-controls">';
  if (flow.status === 'running') {
    h += '<button class="collab-flow-btn danger" onclick="stopCollabFlow(\'' + escJs(flow.channel) + '\')">\u23f9 \u7ec8\u6b62</button>';
  }
  h += '<button class="collab-flow-btn" onclick="toggleFlowHistory(\'' + escJs(flow.channel) + '\')">\u{1F4CB} \u5386\u53f2</button>';
  h += '<button class="collab-flow-btn" onclick="hideFlowPanel()">&times;</button>';
  h += '</div></div>';

  h += '<div class="collab-flow-pipeline">';
  if (flow.nodes) {
    for (var ni = 0; ni < flow.nodes.length; ni++) {
      var node = flow.nodes[ni];
      var statusCls = node.status || 'waiting';
      var durText = '';
      if (node.durationMs > 0) {
        durText = node.durationMs >= 1000
          ? (node.durationMs / 1000).toFixed(1) + 's'
          : node.durationMs + 'ms';
      } else if (node.status === 'running' && node.startedAt) {
        var elapsed = Date.now() - node.startedAt;
        durText = elapsed >= 1000 ? (elapsed / 1000).toFixed(0) + 's...' : '...';
      }
      h += '<div class="collab-flow-node ' + statusCls + '">';
      h += '<div class="collab-flow-avatar">' + esc(node.agentEmoji || '\u{1F916}');
      h += '<span class="flow-status-dot ' + statusCls + '"></span></div>';
      h += '<div class="collab-flow-name">' + esc(node.agentName || node.agentId) + '</div>';
      if (durText) h += '<div class="collab-flow-time">' + durText + '</div>';
      if (node.toolCalls > 0) h += '<div class="collab-flow-time">\u{1F527}' + node.toolCalls + '</div>';
      h += '</div>';

      if (ni < flow.nodes.length - 1) {
        var edge = flow.edges && flow.edges[ni] ? flow.edges[ni] : { status: 'pending' };
        h += '<div class="collab-flow-edge ' + (edge.status || 'pending') + '">';
        h += '<div class="collab-flow-edge-line"></div></div>';
      }
    }
  }
  h += '</div>';

  h += '<div class="collab-flow-progress">';
  h += '<div class="collab-flow-progress-bar"><div class="collab-flow-progress-fill" style="width:' + pct + '%"></div></div>';
  h += '<div class="collab-flow-progress-text">' + pct + '% (' + doneCount + '/' + totalNodes + ')';
  if (flow.durationMs > 0) h += ' \u00b7 ' + _formatDuration(flow.durationMs);
  h += '</div></div>';

  h += '<div id="flowHistoryContainer" class="collab-flow-history" style="display:none"></div>';

  panel.innerHTML = h;
}

function _formatDuration(ms) {
  if (ms < 1000) return ms + 'ms';
  if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
  return Math.floor(ms / 60000) + 'm' + Math.round((ms % 60000) / 1000) + 's';
}

function stopCollabFlow(channel) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'collab_flow_stop', channel: channel }));
  }
}

function hideFlowPanel() {
  var panel = document.getElementById('collabFlowPanel');
  if (panel) panel.classList.remove('active');
}

function showFlowPanelForChannel(channel) {
  if (!channel) return;
  authFetch('/api/collab-flows/active?channel=' + encodeURIComponent(channel))
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d.ok && d.flow) {
        _currentFlow = d.flow;
        _renderFlowPanel(d.flow);
      }
    })
    .catch(function() {});
}

function toggleFlowHistory(channel) {
  var container = document.getElementById('flowHistoryContainer');
  if (!container) return;
  if (container.style.display !== 'none') {
    container.style.display = 'none';
    return;
  }
  container.style.display = 'block';
  container.innerHTML = '<div style="text-align:center;color:var(--text3);padding:8px">\u52a0\u8f7d\u4e2d...</div>';

  authFetch('/api/collab-flows?channel=' + encodeURIComponent(channel))
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (!d.ok || !d.flows || !d.flows.length) {
        container.innerHTML = '<div style="text-align:center;color:var(--text3);padding:8px">\u6682\u65e0\u5386\u53f2\u8bb0\u5f55</div>';
        return;
      }
      _flowHistoryCache = d.flows;
      var h = '';
      for (var i = 0; i < d.flows.length; i++) {
        var f = d.flows[i];
        var agents = (f.nodes || []).map(function(n) { return (n.agentEmoji || '') + n.agentName; }).join(' \u2192 ');
        var endTs = f.endedAt ? new Date(f.endedAt).toLocaleString() : '';
        h += '<div class="collab-flow-history-item" onclick="viewFlowDetail(' + i + ')">';
        h += '<div class="collab-flow-history-status ' + (f.status || '') + '"></div>';
        h += '<div class="collab-flow-history-agents">' + esc(agents) + '</div>';
        h += '<div class="collab-flow-history-duration">' + _formatDuration(f.durationMs || 0) + '</div>';
        h += '<div class="collab-flow-history-time">' + esc(endTs) + '</div>';
        h += '</div>';
      }
      container.innerHTML = h;
    })
    .catch(function() {
      container.innerHTML = '<div style="text-align:center;color:var(--text3);padding:8px">\u52a0\u8f7d\u5931\u8d25</div>';
    });
}

function viewFlowDetail(idx) {
  var f = _flowHistoryCache[idx];
  if (!f) return;
  _renderFlowPanel(f);
}

function onChannelSwitch(channel) {
  _currentFlow = null;
  var panel = document.getElementById('collabFlowPanel');
  if (panel) panel.classList.remove('active');

  var grp = (typeof customGroups !== 'undefined' ? customGroups : []).find(function(g) { return g.id === channel; });
  if (grp && grp.collabChain && grp.collabChain.length) {
    showFlowPanelForChannel(channel);
  }
}
