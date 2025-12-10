fetch('changelog.json')
  .then(res => res.json())
  .then(data => {
    const list = document.getElementById('changelog-list');
    if (!data.length) {
      list.innerHTML = '<p>暂无更新日志。</p>';
      return;
    }
    list.innerHTML = data.map(item => {
      // 支持换行和图片标签
      let html = item.content
        .replace(/\n/g, '<br>')
        // 允许插入 <img src="..." width="..." height="..."> 标签
        .replace(/&lt;img(.*?)&gt;/g, '<img$1>');
      return `
        <div class="changelog-item">
          <div class="changelog-date">${item.date}</div>
          <div class="changelog-title">${item.title}</div>
          <div class="changelog-content">${html}</div>
        </div>
      `;
    }).join('');
  })
  .catch(() => {
    document.getElementById('changelog-list').innerHTML = '<p>无法加载更新日志。</p>';
  });
