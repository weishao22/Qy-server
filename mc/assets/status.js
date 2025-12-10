const serverHost = 'qymc.fucku.top';
const serverPort = 41657; 
const statusUrl = 'http://103.205.253.104:59528/api/status';
const historyUrl = `http://103.205.253.104:59528/api/history`;

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

fetchStatus();
fetchHistory();
