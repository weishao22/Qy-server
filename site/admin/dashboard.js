(function () {
    'use strict';

    const app = window.AdminApp;
    if (!app) return;
    const { api, showToast, el } = app;

    const store = {
        widgets: [],
        types: [],
        loaded: false,
        timers: [],
        dragId: null
    };

    function h(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = String(text);
        return node;
    }

    function clearTimers() {
        store.timers.forEach((id) => clearInterval(id));
        store.timers = [];
    }

    function every(ms, fn) {
        fn();
        const id = setInterval(fn, ms);
        store.timers.push(id);
    }

    function typeMeta(type) {
        return store.types.find((item) => item.type === type) || { type, label: type, size: 1, site: false };
    }

    function save(silent) {
        const payload = store.widgets.map((widget) => ({
            id: widget.id,
            type: widget.type,
            title: widget.title,
            size: widget.size,
            visible: widget.visible,
            onSite: widget.onSite,
            config: widget.config
        }));
        return api('/api/admin/dashboard', { method: 'PUT', body: JSON.stringify({ widgets: payload }) })
            .then(() => {
                if (!silent) showToast('布局已保存', 'ok');
            })
            .catch((error) => showToast(error.message, 'error'));
    }

    async function init() {
        if (!store.loaded) {
            try {
                const data = await api('/api/admin/dashboard');
                store.widgets = data.widgets || [];
                store.types = data.types || [];
                store.loaded = true;
                renderTypeSelect();
            } catch (error) {
                showToast(error.message, 'error');
                return;
            }
        }
        render();
    }

    function renderTypeSelect() {
        const select = el('widget-type');
        if (!select || select.options.length) return;
        store.types.forEach((type) => {
            const option = document.createElement('option');
            option.value = type.type;
            option.textContent = type.label;
            select.appendChild(option);
        });
    }

    function render() {
        clearTimers();
        const grid = el('widget-grid');
        if (!grid) return;
        grid.textContent = '';
        if (!store.widgets.length) {
            const empty = h('div', 'empty-state', '还没有小组件，点击右上角「添加小组件」。');
            empty.style.gridColumn = '1 / -1';
            grid.appendChild(empty);
            return;
        }
        store.widgets.forEach((widget, index) => grid.appendChild(buildCard(widget, index)));
    }

    function buildCard(widget, index) {
        const meta = typeMeta(widget.type);
        const card = h('article', `w-card size-${widget.size}`);
        card.dataset.id = widget.id;
        card.draggable = true;
        if (meta.site && !widget.onSite) card.classList.add('offsite');

        const head = h('header', 'w-head');
        const drag = h('span', 'w-drag', '⣿');
        drag.title = '拖动排序';
        const title = h('h3', 'w-title', widget.title || meta.label);
        const tools = h('div', 'w-tools');

        const sizeBtn = h('button', 'w-btn', `宽 ${widget.size}`);
        sizeBtn.type = 'button';
        sizeBtn.title = '切换宽度';
        sizeBtn.addEventListener('click', () => {
            widget.size = widget.size >= 3 ? 1 : widget.size + 1;
            save(true).then(render);
        });

        if (meta.site) {
            const siteBtn = h('button', `w-btn${widget.onSite ? ' active' : ''}`, widget.onSite ? '已在官网' : '显示到官网');
            siteBtn.type = 'button';
            siteBtn.addEventListener('click', () => {
                widget.onSite = !widget.onSite;
                save(true).then(render);
            });
            tools.appendChild(siteBtn);
        }

        const delBtn = h('button', 'w-btn danger', '删除');
        delBtn.type = 'button';
        delBtn.addEventListener('click', () => {
            store.widgets = store.widgets.filter((item) => item.id !== widget.id);
            save(true).then(render);
        });

        tools.append(sizeBtn, delBtn);
        head.append(drag, title, tools);

        const body = h('div', 'w-body');
        card.append(head, body);

        card.addEventListener('dragstart', (event) => {
            store.dragId = widget.id;
            card.classList.add('dragging');
            event.dataTransfer.effectAllowed = 'move';
            try { event.dataTransfer.setData('text/plain', widget.id); } catch (e) {}
        });
        card.addEventListener('dragend', () => {
            store.dragId = null;
            card.classList.remove('dragging');
            document.querySelectorAll('.w-card.drop-target').forEach((node) => node.classList.remove('drop-target'));
        });
        card.addEventListener('dragover', (event) => {
            if (!store.dragId || store.dragId === widget.id) return;
            event.preventDefault();
            card.classList.add('drop-target');
        });
        card.addEventListener('dragleave', () => card.classList.remove('drop-target'));
        card.addEventListener('drop', (event) => {
            event.preventDefault();
            card.classList.remove('drop-target');
            const from = store.widgets.findIndex((item) => item.id === store.dragId);
            const to = store.widgets.findIndex((item) => item.id === widget.id);
            if (from < 0 || to < 0 || from === to) return;
            const [moved] = store.widgets.splice(from, 1);
            store.widgets.splice(to, 0, moved);
            save(true).then(render);
        });

        renderBody(body, widget, index);
        return card;
    }

    function renderBody(body, widget, index) {
        switch (widget.type) {
            case 'status':
                renderStatus(body);
                break;
            case 'history':
                renderHistory(body);
                break;
            case 'danmaku':
                renderDanmaku(body, widget);
                break;
            case 'comments':
                renderComments(body);
                break;
            case 'visits':
                renderVisits(body);
                break;
            case 'content':
                renderContent(body);
                break;
            case 'note':
                renderNote(body, widget);
                break;
            case 'links':
                renderLinks(body, widget);
                break;
            case 'html':
                renderHtml(body, widget);
                break;
            case 'iframe':
                renderIframe(body, widget);
                break;
            default:
                body.textContent = '未知小组件类型';
        }
    }

    function renderStatus(body) {
        const line = h('div', 'w-line');
        const dot = h('span', 'w-dot');
        const main = h('strong', null, '检测中…');
        line.append(dot, main);
        const sub = h('div', 'w-muted', '');
        body.append(line, sub);
        every(30000, () => {
            fetch('/api/status', { credentials: 'same-origin' })
                .then((response) => response.json())
                .then((data) => {
                    dot.className = 'w-dot ' + (data.online ? 'online' : 'offline');
                    main.textContent = data.online ? '在线' : '离线';
                    if (data.online) {
                        sub.textContent = `${data.players.online} / ${data.players.max} 人 · ${(data.version && data.version.name) || ''} · ${data.motd || ''}`;
                    } else {
                        sub.textContent = data.error || '无法获取状态';
                    }
                })
                .catch(() => {
                    dot.className = 'w-dot offline';
                    main.textContent = '请求失败';
                });
        });
    }

    function renderHistory(body) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'w-chart');
        svg.setAttribute('viewBox', '0 0 300 90');
        svg.setAttribute('preserveAspectRatio', 'none');
        const note = h('div', 'w-muted', '最近 2 小时在线人数');
        body.append(svg, note);

        every(60000, () => {
            fetch('/api/history', { credentials: 'same-origin' })
                .then((response) => response.json())
                .then((rows) => {
                    const list = (rows || []).slice(0, 90).reverse();
                    svg.textContent = '';
                    if (!list.length) {
                        note.textContent = '暂无记录';
                        return;
                    }
                    const max = Math.max(1, ...list.map((row) => Number(row.online) || 0));
                    const step = list.length > 1 ? 300 / (list.length - 1) : 300;
                    const points = list.map((row, i) => `${(i * step).toFixed(1)},${(85 - ((Number(row.online) || 0) / max) * 75).toFixed(1)}`);
                    const area = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                    area.setAttribute('points', `0,90 ${points.join(' ')} 300,90`);
                    area.setAttribute('fill', 'rgba(248,165,194,0.22)');
                    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
                    poly.setAttribute('points', points.join(' '));
                    poly.setAttribute('fill', 'none');
                    poly.setAttribute('stroke', '#f0789d');
                    poly.setAttribute('stroke-width', '2');
                    poly.setAttribute('stroke-linejoin', 'round');
                    svg.append(area, poly);
                    note.textContent = `最近 2 小时在线人数 · 峰值 ${max}`;
                })
                .catch(() => {
                    note.textContent = '历史记录获取失败';
                });
        });
    }

    function renderDanmaku(body, widget) {
        const stateBox = h('div', 'w-list');
        const form = h('div', 'w-form');
        const input = h('input');
        input.placeholder = '以管理员身份发送一条弹幕';
        input.maxLength = 80;
        const actions = h('div', 'w-actions');
        const send = h('button', 'w-btn', '发送');
        send.type = 'button';
        actions.appendChild(send);
        form.append(input, actions);
        body.append(stateBox, form);

        send.addEventListener('click', () => {
            const text = input.value.trim();
            if (!text) return;
            api('/api/admin/danmaku/send', {
                method: 'POST',
                body: JSON.stringify({ channel: widget.config.channel || 'default', text })
            }).then(() => {
                input.value = '';
                refresh();
            }).catch((error) => showToast(error.message, 'error'));
        });

        function refresh() {
            fetch('/api/admin/danmaku/state', { credentials: 'same-origin' })
                .then((response) => response.json())
                .then((data) => {
                    stateBox.textContent = '';
                    const rooms = Object.entries(data.online || {});
                    const summary = h('div', 'w-muted', `连接 ${data.clients} 个 · 房间 ${data.rooms} 个` + (rooms.length ? ` · ${rooms.map(([name, count]) => `${name}:${count}`).join('，')}` : ''));
                    stateBox.appendChild(summary);
                    (data.recent || []).slice(0, 8).forEach((message) => {
                        const item = h('div', 'w-list-item');
                        const meta = h('span', 'meta', new Date(message.at).toLocaleTimeString() + (message.from === 'system' ? ' · 系统' : ''));
                        item.append(meta, document.createTextNode(message.text));
                        stateBox.appendChild(item);
                    });
                })
                .catch(() => {});
        }

        every(8000, refresh);
    }

    function renderComments(body) {
        const list = h('div', 'w-list');
        body.appendChild(list);
        every(30000, () => {
            fetch('/api/admin/comments', { credentials: 'same-origin' })
                .then((response) => response.json())
                .then((data) => {
                    list.textContent = '';
                    const rows = (data.comments || []).slice(0, 6);
                    if (!rows.length) {
                        list.appendChild(h('div', 'w-muted', '暂无评论'));
                        return;
                    }
                    rows.forEach((row) => {
                        const item = h('div', 'w-list-item');
                        item.append(h('span', 'meta', (row.nick || '匿名') + ' · ' + row.path), document.createTextNode(row.content || ''));
                        list.appendChild(item);
                    });
                })
                .catch(() => {});
        });
    }

    function renderVisits(body) {
        const table = h('table', 'w-table');
        const head = document.createElement('thead');
        const headRow = document.createElement('tr');
        ['页面', '访问', '评论'].forEach((text) => headRow.appendChild(h('th', null, text)));
        head.appendChild(headRow);
        const tbody = document.createElement('tbody');
        table.append(head, tbody);
        body.appendChild(table);
        every(45000, () => {
            fetch('/api/admin/views', { credentials: 'same-origin' })
                .then((response) => response.json())
                .then((data) => {
                    tbody.textContent = '';
                    const rows = (data.pages || []).slice(0, 8);
                    if (!rows.length) {
                        const tr = document.createElement('tr');
                        const td = h('td', null, '暂无访问记录');
                        td.colSpan = 3;
                        tr.appendChild(td);
                        tbody.appendChild(tr);
                        return;
                    }
                    rows.forEach((row) => {
                        const tr = document.createElement('tr');
                        tr.append(h('td', null, row.path), h('td', null, String(row.views)), h('td', null, String(row.comments)));
                        tbody.appendChild(tr);
                    });
                })
                .catch(() => {});
        });
    }

    function renderContent(body) {
        const grid = h('div', 'w-stat-grid');
        body.appendChild(grid);
        every(45000, () => {
            fetch('/api/admin/overview', { credentials: 'same-origin' })
                .then((response) => response.json())
                .then((data) => {
                    grid.textContent = '';
                    [
                        ['页面', data.pages],
                        ['可改文字', data.texts],
                        ['已修改', data.overrides],
                        ['评论区', data.comments]
                    ].forEach(([label, value]) => {
                        const box = h('div', 'w-stat');
                        box.append(h('b', null, value), h('span', null, label));
                        grid.appendChild(box);
                    });
                })
                .catch(() => {});
        });
    }

    function configShell(body, widget, fields, onApply) {
        const form = h('div', 'w-form');
        fields.forEach((field) => {
            let input;
            if (field.type === 'textarea') {
                input = h('textarea');
                input.rows = field.rows || 4;
            } else {
                input = h('input');
                if (field.type === 'number') input.type = 'number';
            }
            input.placeholder = field.placeholder || '';
            input.value = field.value === undefined || field.value === null ? '' : field.value;
            if (field.name) input.dataset.field = field.name;
            form.appendChild(input);
        });
        const actions = h('div', 'w-actions');
        const apply = h('button', 'w-btn active', '应用');
        apply.type = 'button';
        actions.appendChild(apply);
        form.appendChild(actions);
        body.appendChild(form);
        apply.addEventListener('click', () => {
            const values = {};
            form.querySelectorAll('[data-field]').forEach((input) => {
                values[input.dataset.field] = input.value;
            });
            onApply(values);
        });
    }

    function renderNote(body, widget) {
        configShell(body, widget, [
            { name: 'title', value: widget.title, placeholder: '小组件标题' },
            { name: 'text', type: 'textarea', rows: 4, value: widget.config.text || '', placeholder: '文本内容，支持换行' }
        ], (values) => {
            widget.title = values.title;
            widget.config.text = values.text;
            save().then(render);
        });
    }

    function renderLinks(body, widget) {
        const lines = (widget.config.links || []).map((link) => `${link.label || ''}|${link.url || ''}`).join('\n');
        configShell(body, widget, [
            { name: 'title', value: widget.title, placeholder: '小组件标题' },
            { name: 'links', type: 'textarea', rows: 4, value: lines, placeholder: '每行一条：名称|链接' }
        ], (values) => {
            widget.title = values.title;
            widget.config.links = values.links.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
                const parts = line.split('|');
                return { label: (parts[0] || '').trim(), url: (parts[1] || '').trim() };
            }).filter((link) => link.url);
            save().then(render);
        });
    }

    function renderHtml(body, widget) {
        configShell(body, widget, [
            { name: 'title', value: widget.title, placeholder: '小组件标题' },
            { name: 'html', type: 'textarea', rows: 5, value: widget.config.html || '', placeholder: '任意 HTML，会原样显示在官网上' }
        ], (values) => {
            widget.title = values.title;
            widget.config.html = values.html;
            save().then(render);
        });
    }

    function renderIframe(body, widget) {
        configShell(body, widget, [
            { name: 'title', value: widget.title, placeholder: '小组件标题' },
            { name: 'url', value: widget.config.url || '', placeholder: '要嵌入的地址，例如 MCSM 面板 URL' },
            { name: 'height', type: 'number', value: widget.config.height || 420, placeholder: '高度（像素）' }
        ], (values) => {
            widget.title = values.title;
            widget.config.url = values.url;
            widget.config.height = Number(values.height) || 420;
            save().then(render);
        });
    }

    el('widget-add').addEventListener('click', () => {
        const type = el('widget-type').value;
        const meta = typeMeta(type);
        const id = 'w-' + Math.random().toString(16).slice(2, 10);
        store.widgets.push({
            id,
            type,
            title: meta.label,
            size: meta.size || 1,
            visible: true,
            onSite: false,
            config: type === 'note' ? { text: '' } : type === 'links' ? { links: [] } : {}
        });
        save(true).then(render);
    });

    el('widget-reset').addEventListener('click', async () => {
        if (!confirm('恢复默认小组件布局？')) return;
        try {
            const data = await api('/api/admin/dashboard/reset', { method: 'POST' });
            store.widgets = data.widgets || [];
            store.loaded = true;
            render();
            showToast('已恢复默认布局', 'ok');
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    window.QYDashboard = { init };
})();
