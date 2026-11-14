(function () {
    'use strict';
    if (window.__qyWidgets) return;
    window.__qyWidgets = true;

    var CSS = [
        '#qy-site-widgets{max-width:1200px;margin:36px auto 0;padding:0 20px;}',
        '.qy-site-widgets-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;}',
        '.qy-site-widget{background:#fff;border-radius:14px;padding:18px 20px;box-shadow:0 8px 24px rgba(190,160,200,.14);',
        'border:1px solid #f2ebf4;}',
        '.qy-site-widget-wide{grid-column:1/-1;}',
        '.qy-site-widget-title{margin:0 0 12px;font-size:16px;color:#4a4a4a;display:flex;align-items:center;gap:8px;}',
        '.qy-site-widget-title::before{content:"";width:4px;height:16px;border-radius:2px;',
        'background:linear-gradient(180deg,#f8a5c2,#d7c2f0);}',
        '.qy-site-widget-body{font-size:13.5px;line-height:1.75;color:#666;}',
        '.qy-site-widget-link{display:flex;align-items:center;gap:8px;padding:7px 2px;color:#666;text-decoration:none;',
        'border-bottom:1px dashed #f2ebf4;transition:.15s;}',
        '.qy-site-widget-link:last-child{border-bottom:none;}',
        '.qy-site-widget-link:hover{color:#f0789d;transform:translateX(2px);}',
        '.qy-site-widget-link i{color:#f8a5c2;font-size:12px;}',
        '.qy-site-widget-empty{color:#b3abb9;font-size:13px;}',
        '.qy-site-widget-iframe{width:100%;border:none;border-radius:10px;background:#faf7fb;}',
        '.qy-widget-status .qy-status-line{display:flex;align-items:baseline;gap:8px;margin-bottom:6px;}',
        '.qy-widget-status .qy-status-dot{width:9px;height:9px;border-radius:50%;background:#bbb;flex:none;}',
        '.qy-widget-status .qy-status-dot.online{background:#4caf8a;box-shadow:0 0 0 4px rgba(76,175,138,.16);}',
        '.qy-widget-status .qy-status-dot.offline{background:#e0566f;box-shadow:0 0 0 4px rgba(224,86,111,.14);}',
        '.qy-widget-status .qy-status-main{font-size:14px;color:#4a4a4a;font-weight:600;}',
        '.qy-widget-status .qy-status-sub{font-size:12px;color:#a09aa6;word-break:break-word;}'
    ].join('');

    function ensureStyle() {
        if (document.getElementById('qy-widgets-css')) return;
        var style = document.createElement('style');
        style.id = 'qy-widgets-css';
        style.setAttribute('data-qy-global', '1');
        style.textContent = CSS;
        document.head.appendChild(style);
    }

    function refreshStatus() {
        var targets = document.querySelectorAll('[data-qy-widget="status"]');
        if (!targets.length) return;
        fetch('/api/status', { credentials: 'same-origin' })
            .then(function (response) { return response.json(); })
            .then(function (data) {
                targets.forEach(function (node) {
                    node.textContent = '';
                    var line = document.createElement('div');
                    line.className = 'qy-status-line';
                    var dot = document.createElement('span');
                    dot.className = 'qy-status-dot ' + (data.online ? 'online' : 'offline');
                    var main = document.createElement('span');
                    main.className = 'qy-status-main';
                    main.textContent = data.online ? '在线' : '离线';
                    var sub = document.createElement('span');
                    sub.className = 'qy-status-sub';
                    sub.textContent = data.online
                        ? data.players.online + ' / ' + data.players.max + ' 人'
                        : (data.error || '服务器暂时不可用');
                    line.appendChild(dot);
                    line.appendChild(main);
                    line.appendChild(sub);
                    node.appendChild(line);
                    if (data.online) {
                        var info = document.createElement('div');
                        info.className = 'qy-status-sub';
                        info.textContent = (data.version && data.version.name ? data.version.name + ' · ' : '') + (data.motd || '');
                        node.appendChild(info);
                    }
                });
            })
            .catch(function () {});
    }

    function init() {
        ensureStyle();
        refreshStatus();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    document.addEventListener('DOMContentLoaded', function () {
        setTimeout(refreshStatus, 0);
    });
    setInterval(refreshStatus, 60000);
})();
