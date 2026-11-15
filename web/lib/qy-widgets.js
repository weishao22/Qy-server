(function () {
    'use strict';
    if (window.__qyWidgets) return;
    window.__qyWidgets = true;

    var CSS = [
        '#qy-site-widgets{max-width:1200px;margin:36px auto 0;padding:0 20px;}',
        '.qy-site-widgets-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;}',
        '.qy-site-widget{background:#fff;border-radius:14px;padding:18px 20px;box-shadow:0 8px 24px rgba(190,160,200,.14);',
        'border:1px solid #f2ebf4;position:relative;}',
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
        '.qy-widget-status .qy-status-sub{font-size:12px;color:#a09aa6;word-break:break-word;}',
        'body.qy-widget-edit #qy-site-widgets{padding-top:8px;}',
        'body.qy-widget-edit .qy-site-widget.outline{outline:2px dashed #f8a5c2;outline-offset:2px;}',
        '.qy-widget-toolbar{display:flex;gap:6px;margin-left:auto;}',
        '.qy-widget-toolbar button{border:none;background:#fbe9f1;color:#c25a7f;border-radius:7px;font-size:12px;',
        'padding:4px 8px;cursor:pointer;font-family:inherit;}',
        '.qy-widget-toolbar button:hover{background:#f8a5c2;color:#fff;}',
        '.qy-widget-drop{border:2px dashed #f0b7cd;border-radius:14px;min-height:80px;grid-column:1/-1;',
        'display:flex;align-items:center;justify-content:center;color:#c25a7f;font-size:13px;background:rgba(248,165,194,.06);}',
        '#qy-widget-panel{position:fixed;top:72px;right:16px;width:300px;max-height:calc(100vh - 100px);overflow:auto;',
        'background:rgba(255,255,255,.97);border:1px solid #f0d9e5;border-radius:14px;box-shadow:0 16px 40px rgba(180,140,170,.25);',
        'z-index:3000;padding:14px;font-size:13px;color:#5b5560;}',
        '#qy-widget-panel h4{margin:0 0 8px;font-size:15px;color:#c25a7f;display:flex;align-items:center;justify-content:space-between;}',
        '#qy-widget-panel .qy-hint{font-size:12px;color:#a99fae;line-height:1.6;margin:0 0 10px;}',
        '#qy-widget-panel .qy-row{display:flex;gap:6px;margin-bottom:10px;}',
        '#qy-widget-panel select{flex:1;min-width:0;padding:6px 8px;border:1px solid #f0d9e5;border-radius:8px;font-family:inherit;}',
        '#qy-widget-panel button{border:none;border-radius:8px;padding:6px 10px;cursor:pointer;font-family:inherit;font-size:12px;}',
        '#qy-widget-panel .qy-primary{background:linear-gradient(135deg,#f8a5c2,#f0789d);color:#fff;}',
        '#qy-widget-panel .qy-ghost{background:#f6eef3;color:#a15a78;}',
        '#qy-widget-panel .qy-chip{display:flex;align-items:center;justify-content:space-between;gap:6px;background:#faf4f8;',
        'border:1px solid #f2e2eb;border-radius:9px;padding:6px 8px;margin-bottom:6px;cursor:grab;}',
        '#qy-widget-panel .qy-chip small{color:#b3a7bb;}',
        '#qy-widget-panel .qy-actions{display:flex;gap:6px;margin-top:12px;}',
        '@media(max-width:768px){#qy-widget-panel{left:12px;right:12px;width:auto;top:auto;bottom:12px;max-height:50vh;}}'
    ].join('');

    function ensureStyle() {
        if (document.getElementById('qy-widgets-css')) return;
        var style = document.createElement('style');
        style.id = 'qy-widgets-css';
        style.setAttribute('data-qy-global', '1');
        style.textContent = CSS;
        document.head.appendChild(style);
    }

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
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

    /* ---------------- 官网内编辑（管理员登录后 ?edit=1 生效） ---------------- */

    var editor = null;

    function isEditRequested() {
        try {
            return new URLSearchParams(location.search).get('edit') === '1';
        } catch (e) { return false; }
    }

    function api(url, options) {
        return fetch(url, Object.assign({ credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } }, options || {}))
            .then(function (r) {
                return r.json().catch(function () { return {}; }).then(function (data) {
                    if (!r.ok) throw new Error(data.error || ('请求失败 ' + r.status));
                    return data;
                });
            });
    }

    function ensureGrid() {
        var section = document.getElementById('qy-site-widgets');
        if (!section) {
            section = document.createElement('section');
            section.id = 'qy-site-widgets';
            section.innerHTML = '<div class="qy-site-widgets-grid"></div>';
            var anchor = document.querySelector('#content .content-box') || document.querySelector('#content');
            if (anchor) anchor.appendChild(section);
            else document.body.insertBefore(section, document.body.firstChild);
        }
        var grid = section.querySelector('.qy-site-widgets-grid');
        if (!grid) {
            grid = document.createElement('div');
            grid.className = 'qy-site-widgets-grid';
            section.appendChild(grid);
        }
        return grid;
    }

    function widgetBodyHtml(widget) {
        if (widget.type === 'status') {
            return '<div class="qy-site-widget-body qy-widget-status" data-qy-widget="status"><span class="qy-site-widget-empty">服务器状态加载中…</span></div>';
        }
        if (widget.type === 'note') {
            var text = esc(widget.config.text || '').replace(/\r?\n/g, '<br>');
            return '<div class="qy-site-widget-body">' + text + '</div>';
        }
        if (widget.type === 'html') {
            return '<div class="qy-site-widget-body">' + (widget.config.html || '') + '</div>';
        }
        if (widget.type === 'links') {
            var links = Array.isArray(widget.config.links) ? widget.config.links : [];
            var items = links.filter(function (link) { return link && link.url; }).map(function (link) {
                return '<a class="qy-site-widget-link" href="' + esc(link.url) + '"><i class="fas fa-arrow-right"></i> ' + esc(link.label || link.url) + '</a>';
            }).join('');
            return '<div class="qy-site-widget-body">' + (items || '<span class="qy-site-widget-empty">暂无链接</span>') + '</div>';
        }
        if (widget.type === 'iframe') {
            var height = Math.max(160, Math.min(1200, Number(widget.config.height) || 420));
            return '<iframe class="qy-site-widget-iframe" src="' + esc(widget.config.url || '') + '" loading="lazy" style="height:' + height + 'px"></iframe>';
        }
        return '<div class="qy-site-widget-body"><span class="qy-site-widget-empty">该组件暂不支持官网展示</span></div>';
    }

    function renderCard(widget) {
        var card = document.createElement('div');
        card.className = 'qy-site-widget' + (widget.type === 'iframe' ? ' qy-site-widget-wide' : '') + ' outline';
        card.dataset.qyWidgetCard = widget.id;
        card.draggable = true;
        var title = document.createElement('h3');
        title.className = 'qy-site-widget-title';
        title.textContent = widget.title || '未命名组件';
        var bar = document.createElement('span');
        bar.className = 'qy-widget-toolbar';
        var edit = document.createElement('button');
        edit.type = 'button';
        edit.textContent = '编辑';
        edit.addEventListener('click', function () { editWidget(widget); });
        var remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = '移出官网';
        remove.addEventListener('click', function () {
            widget.onSite = false;
            card.remove();
            renderPanel();
        });
        bar.appendChild(edit);
        bar.appendChild(remove);
        title.appendChild(bar);
        card.appendChild(title);
        var holder = document.createElement('div');
        holder.className = 'qy-widget-render';
        holder.innerHTML = widgetBodyHtml(widget);
        card.appendChild(holder);

        card.addEventListener('dragstart', function (e) {
            editor.dragId = widget.id;
            editor.dragFrom = 'grid';
            try { e.dataTransfer.setData('text/plain', widget.id); } catch (err) {}
            e.dataTransfer.effectAllowed = 'move';
        });
        card.addEventListener('dragover', function (e) {
            if (editor.dragFrom !== 'grid') return;
            e.preventDefault();
            var target = e.currentTarget;
            if (target === card) return;
            var rect = target.getBoundingClientRect();
            var before = (e.clientY - rect.top) < rect.height / 2;
            var grid = target.parentNode;
            if (before) grid.insertBefore(card, target);
            else grid.insertBefore(card, target.nextSibling);
        });
        return card;
    }

    function editWidget(widget) {
        var nextTitle = prompt('组件标题', widget.title || '');
        if (nextTitle === null) return;
        widget.title = nextTitle;
        if (widget.type === 'note') {
            var text = prompt('文本内容（可多行）', widget.config.text || '');
            if (text !== null) widget.config.text = text;
        } else if (widget.type === 'html') {
            var html = prompt('自定义 HTML', widget.config.html || '');
            if (html !== null) widget.config.html = html;
        } else if (widget.type === 'links') {
            var lines = (widget.config.links || []).map(function (l) { return (l.label || '') + '|' + (l.url || ''); }).join('\n');
            var next = prompt('每行一个链接：名称|地址', lines);
            if (next !== null) {
                widget.config.links = next.split(/\r?\n/).map(function (line) {
                    var parts = line.split('|');
                    return { label: (parts[0] || '').trim(), url: (parts[1] || '').trim() };
                }).filter(function (l) { return l.url; });
            }
        } else if (widget.type === 'iframe') {
            var url = prompt('嵌入地址 URL', widget.config.url || '');
            if (url !== null) widget.config.url = url;
            var h = prompt('高度（像素）', String(widget.config.height || 420));
            if (h !== null) widget.config.height = Number(h) || 420;
        }
        renderGrid();
        renderPanel();
    }

    function renderGrid() {
        var grid = ensureGrid();
        grid.textContent = '';
        var cards = editor.widgets.filter(function (w) { return w.onSite; });
        cards.forEach(function (widget) { grid.appendChild(renderCard(widget)); });
        if (!cards.length) {
            var drop = document.createElement('div');
            drop.className = 'qy-widget-drop';
            drop.textContent = '把右侧组件拖到这里即可添加到官网';
            grid.appendChild(drop);
        }
        grid.addEventListener('dragover', function (e) { e.preventDefault(); });
        grid.addEventListener('drop', function (e) {
            e.preventDefault();
            if (editor.dragFrom === 'panel' && editor.dragId) {
                var widget = editor.widgets.find(function (w) { return w.id === editor.dragId; });
                if (widget && !widget.onSite) { widget.onSite = true; renderGrid(); renderPanel(); }
            }
            editor.dragId = null;
            editor.dragFrom = null;
        });
    }

    function renderPanel() {
        var panel = document.getElementById('qy-widget-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'qy-widget-panel';
            document.body.appendChild(panel);
        }
        panel.textContent = '';

        var h = document.createElement('h4');
        h.textContent = '网站组件编辑';
        var close = document.createElement('button');
        close.className = 'qy-ghost';
        close.textContent = '关闭';
        close.type = 'button';
        close.addEventListener('click', function () { panel.remove(); });
        h.appendChild(close);
        panel.appendChild(h);

        var hint = document.createElement('p');
        hint.className = 'qy-hint';
        hint.textContent = '拖动卡片可排序；把下方组件拖到页面区域即可加入官网，点“移出官网”可移除。';
        panel.appendChild(hint);

        var row = document.createElement('div');
        row.className = 'qy-row';
        var select = document.createElement('select');
        editor.types.filter(function (t) { return t.site; }).forEach(function (t) {
            var opt = document.createElement('option');
            opt.value = t.type;
            opt.textContent = t.label;
            select.appendChild(opt);
        });
        var add = document.createElement('button');
        add.className = 'qy-primary';
        add.type = 'button';
        add.textContent = '添加';
        add.addEventListener('click', function () {
            var type = select.value;
            var meta = editor.types.find(function (t) { return t.type === type; }) || { label: type, size: 1 };
            var widget = {
                id: 'w-' + Math.random().toString(16).slice(2, 10),
                type: type,
                title: meta.label,
                size: meta.size || 1,
                visible: true,
                onSite: true,
                config: type === 'links' ? { links: [] } : {}
            };
            editor.widgets.push(widget);
            renderGrid();
            renderPanel();
        });
        row.appendChild(select);
        row.appendChild(add);
        panel.appendChild(row);

        var title = document.createElement('p');
        title.className = 'qy-hint';
        title.textContent = '未显示在官网的组件：';
        panel.appendChild(title);

        editor.widgets.filter(function (w) { return !w.onSite; }).forEach(function (widget) {
            var chip = document.createElement('div');
            chip.className = 'qy-chip';
            chip.draggable = true;
            var label = document.createElement('span');
            label.textContent = widget.title || widget.type;
            var small = document.createElement('small');
            small.textContent = widget.type;
            label.appendChild(small);
            chip.appendChild(label);
            var show = document.createElement('button');
            show.className = 'qy-ghost';
            show.type = 'button';
            show.textContent = '加入';
            show.addEventListener('click', function () { widget.onSite = true; renderGrid(); renderPanel(); });
            chip.appendChild(show);
            chip.addEventListener('dragstart', function (e) {
                editor.dragId = widget.id;
                editor.dragFrom = 'panel';
                try { e.dataTransfer.setData('text/plain', widget.id); } catch (err) {}
                e.dataTransfer.effectAllowed = 'copy';
            });
            panel.appendChild(chip);
        });

        var actions = document.createElement('div');
        actions.className = 'qy-actions';
        var save = document.createElement('button');
        save.className = 'qy-primary';
        save.type = 'button';
        save.textContent = '保存并刷新';
        save.addEventListener('click', function () {
            save.className = 'qy-primary';
            save.disabled = true;
            save.textContent = '保存中…';
            var ordered = [];
            var grid = ensureGrid();
            Array.prototype.forEach.call(grid.querySelectorAll('[data-qy-widget-card]'), function (node) {
                var widget = editor.widgets.find(function (w) { return w.id === node.dataset.qyWidgetCard; });
                if (widget) ordered.push(widget);
            });
            editor.widgets.forEach(function (w) { if (!w.onSite && ordered.indexOf(w) < 0) ordered.push(w); });
            api('/api/admin/dashboard', { method: 'PUT', body: JSON.stringify({ widgets: ordered }) })
                .then(function () { location.reload(); })
                .catch(function (error) { alert(error.message); save.disabled = false; save.textContent = '保存并刷新'; });
        });
        actions.appendChild(save);
        panel.appendChild(actions);
    }

    function startEditor() {
        api('/api/admin/session').then(function (session) {
            if (!session || !session.authenticated) {
                console.warn('[QYWidgets] 未登录管理后台，无法启用组件编辑');
                return;
            }
            return api('/api/admin/dashboard').then(function (data) {
                document.body.classList.add('qy-widget-edit');
                editor = { widgets: (data.widgets || []).slice(), types: data.types || [], dragId: null, dragFrom: null };
                renderGrid();
                renderPanel();
            });
        }).catch(function (error) {
            console.warn('[QYWidgets] 组件编辑初始化失败：', error);
        });
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

    window.QYWidgets = { refresh: init };
})();
