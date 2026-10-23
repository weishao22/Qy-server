const statusUrl = 'https://api.qyserver.top/api/status';
const historyUrl = `https://api.qyserver.top/api/history`;
const clusterUrl = 'https://api.qyserver.top/api/all';

function fetchStatus() {
  fetch(statusUrl)
    .then(r => r.json())
    .then(data => {
      const statusDiv = document.getElementById('server-status');
      if (data.online) {
        let versionInfo = data.version && data.version.name ? `<br>服务器版本: <b>${data.version.name}</b>` : '';
        let motdInfo = data.motd ? `<br>MOTD: <span>${data.motd}</span>` : '';
        statusDiv.innerHTML = `<span style='color:green;'>在线</span> | 当前人数: <b>${data.players.online}</b> / ${data.players.max}${versionInfo}${motdInfo}`;
      } else {
        statusDiv.innerHTML = `<span style='color:red;'>离线 服务器娘生气了  >_< </span>`;
      }
    })
    .catch(() => {
      document.getElementById('server-status').innerHTML = '状态获取失败';
    });
}

function fetchHistory() {
  fetch(historyUrl)
    .then(r => r.json())
    .then(list => {
      const tbody = document.querySelector('#history-table tbody');
      tbody.innerHTML = '';
      if (Array.isArray(list) && list.length > 0) {
        list.forEach(item => {
          const tr = document.createElement('tr');
          // 格式化时间
          const timeStr = new Date(item.time).toLocaleString();
          tr.innerHTML = `<td>${timeStr}</td><td>${item.online}</td><td>${item.status ? '在线' : '离线'}</td>`;
          tbody.appendChild(tr);
        });
      } else {
        tbody.innerHTML = '<tr><td colspan="3">无历史记录</td></tr>';
      }
    })
    .catch(() => {
      document.querySelector('#history-table tbody').innerHTML = '<tr><td colspan="3">历史记录获取失败</td></tr>';
    });
}

function fetchClusterStatus() {
  fetch(clusterUrl)
    .then(r => r.json())
    .then(data => {
      const container = document.getElementById('cluster-status');
      const servers = data.servers;
      if (!Array.isArray(servers) || servers.length === 0) {
        container.innerHTML = '暂无服务器数据';
        return;
      }
      let html = '<div class="cluster-grid">';
      servers.forEach(s => {
        const isOnline = s.status === 'online';
        const cardClass = isOnline ? 'online' : 'offline';
        const statusText = isOnline ? '<span style="color:green;">在线</span>' : '<span style="color:red;">离线</span>';
        const playersInfo = isOnline ? `<div class="server-players">在线人数: <b>${s.online_players}</b> / ${s.max_players}</div>` : '';
        const motdInfo = (isOnline && s.motd) ? `<div class="server-motd">${s.motd}</div>` : '';
        const errorInfo = (!isOnline && s.error) ? `<div class="server-error">${s.error}</div>` : '';
        const timeStr = s.last_updated ? new Date(s.last_updated).toLocaleString() : '';
        html += `
          <div class="cluster-card ${cardClass}">
            <div class="server-name">${s.server}</div>
            <div class="server-status">${statusText}</div>
            ${playersInfo}
            ${motdInfo}
            ${errorInfo}
            <div class="server-time">${timeStr}</div>
          </div>`;
      });
      html += '</div>';
      container.innerHTML = html;
    })
    .catch(() => {
      document.getElementById('cluster-status').innerHTML = '集群状态获取失败';
    });
}

fetchStatus();
fetchHistory();
fetchClusterStatus();
// 每60秒重新请求状态与历史数据，避免整页刷新
setInterval(function() {
  fetchStatus();
  fetchHistory();
  fetchClusterStatus();
}, 60000);
