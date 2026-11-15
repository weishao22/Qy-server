(function () {
    'use strict';
    if (window.__qyBlocks) return;
    window.__qyBlocks = true;

    var EDIT_CSS = [
        '#qy-blocks-editorbar{position:fixed;top:0;left:0;right:0;height:52px;z-index:4000;display:flex;align-items:center;gap:10px;',
        'padding:0 16px;background:rgba(255,255,255,.97);border-bottom:1px solid #f1dbe6;box-shadow:0 6px 20px rgba(180,140,170,.16);',
        'font-family:"微软雅黑","Microsoft YaHei",sans-serif;font-size:13px;color:#6a5f6d;}',
        '#qy-blocks-editorbar .qy-eb-path{font-weight:700;color:#c25a7f;}',
        '#qy-blocks-editorbar .qy-eb-tip{color:#a99fae;font-size:12px;}',
        '#qy-blocks-editorbar .qy-eb-actions{margin-left:auto;display:flex;gap:8px;}',
        '#qy-blocks-editorbar button{border:none;border-radius:8px;padding:7px 14px;cursor:pointer;font-family:inherit;font-size:12.5px;}',
        '#qy-blocks-editorbar .qy-primary{background:linear-gradient(135deg,#f8a5c2,#f0789d);color:#fff;}',
        '#qy-blocks-editorbar .qy-ghost{background:#f7eef3;color:#a15a78;}',
        '#qy-blocks-editorbar .qy-danger{background:#fdecef;color:#d9536f;}',
        '#qy-blocks-library{position:fixed;top:64px;left:16px;width:260px;max-height:calc(100vh - 84px);overflow:auto;z-index:3900;',
        'background:rgba(255,255,255,.98);border:1px solid #f1dbe6;border-radius:14px;box-shadow:0 16px 40px rgba(180,140,170,.22);',
        'padding:12px;font-family:"微软雅黑","Microsoft YaHei",sans-serif;font-size:12.5px;color:#5b5560;}',
        '#qy-blocks-library h4{margin:0 0 8px;font-size:14px;color:#c25a7f;}',
        '#qy-blocks-library .qy-lib-group{margin-bottom:10px;}',
        '#qy-blocks-library .qy-lib-group>span{display:block;font-size:11.5px;color:#b3a7bb;margin:6px 0 5px;}',
        '#qy-blocks-library .qy-lib-item{display:flex;align-items:center;gap:8px;padding:7px 9px;margin-bottom:5px;border-radius:9px;',
        'background:#faf4f8;border:1px solid #f2e2eb;cursor:grab;transition:.15s;}',
        '#qy-blocks-library .qy-lib-item:hover{background:#f8dbe8;border-color:#efb9d0;}',
        '#qy-blocks-library .qy-lib-item i{color:#e08aad;width:14px;text-align:center;}',
        '#qy-blocks-library .qy-lib-hint{font-size:11.5px;color:#b3a7bb;line-height:1.6;}',
        'body.qy-block-editing{padding-top:52px;}',
        'body.qy-block-editing #qy-blocks-page{padding-top:24px;}',
        '.qy-block-edit-wrap{position:relative;}',
        '.qy-block-tools{position:absolute;top:8px;right:8px;z-index:300;display:flex;gap:5px;opacity:.92;transition:.15s;}',
        '.qy-block-edit-wrap:hover>.qy-block-tools{opacity:1;}',
        '.qy-block-tools button{border:none;border-radius:7px;padding:4px 8px;font-size:11.5px;cursor:pointer;',
        'background:rgba(255,255,255,.94);color:#a15a78;box-shadow:0 3px 10px rgba(160,120,150,.22);font-family:inherit;}',
        '.qy-block-tools button:hover{background:#f8a5c2;color:#fff;}',
        '.qy-block-edit-wrap.qy-block-drag{outline:2px dashed #f8a5c2;outline-offset:4px;}',
        '.qy-block-edit-wrap.qy-drop-before::before,.qy-block-edit-wrap.qy-drop-after::after{content:"";display:block;height:4px;',
        'border-radius:2px;background:#f0789d;margin:4px 0;}',
        '#qy-blocks-empty-canvas{border:2px dashed #efb9d0;border-radius:16px;padding:40px;text-align:center;color:#a15a78;',
        'background:#fdf7fa;margin:20px 0;}',
        '#qy-blocks-empty-canvas button{margin-top:12px;border:none;border-radius:9px;padding:9px 18px;cursor:pointer;',
        'background:linear-gradient(135deg,#f8a5c2,#f0789d);color:#fff;font-family:inherit;}',
        '#qy-block-modal{position:fixed;inset:0;z-index:5000;background:rgba(40,25,40,.42);display:flex;align-items:center;justify-content:center;padding:20px;}',
        '#qy-block-modal .qy-modal-card{background:#fff;border-radius:16px;width:100%;max-width:560px;max-height:86vh;overflow:auto;',
        'padding:22px;font-family:"微软雅黑","Microsoft YaHei",sans-serif;color:#5b5560;}',
        '#qy-block-modal h3{margin:0 0 6px;color:#c25a7f;font-size:16px;}',
        '#qy-block-modal .qy-modal-sub{font-size:12px;color:#a99fae;margin:0 0 16px;}',
        '#qy-block-modal label{display:block;margin-bottom:12px;}',
        '#qy-block-modal label>span{display:block;font-size:12.5px;color:#8a8190;margin-bottom:5px;}',
        '#qy-block-modal input,#qy-block-modal textarea,#qy-block-modal select{width:100%;padding:9px 11px;border:1px solid #f0dce7;',
        'border-radius:9px;font-family:inherit;font-size:13px;color:#4a4450;outline:none;background:#fdfbfd;}',
        '#qy-block-modal input:focus,#qy-block-modal textarea:focus{border-color:#f8a5c2;background:#fff;}',
        '#qy-block-modal textarea{resize:vertical;line-height:1.6;}',
        '#qy-block-modal .qy-upload-btn{margin-top:6px;border:none;border-radius:8px;padding:6px 12px;cursor:pointer;',
        'background:#fbe9f1;color:#c25a7f;font-family:inherit;font-size:12px;}',
        '#qy-block-modal .qy-modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:8px;}',
        '#qy-block-modal button{border:none;border-radius:9px;padding:9px 18px;cursor:pointer;font-family:inherit;font-size:13px;}',
        '#qy-block-modal .qy-primary{background:linear-gradient(135deg,#f8a5c2,#f0789d);color:#fff;}',
        '#qy-block-modal .qy-ghost{background:#f6eef3;color:#a15a78;}',
        '#qy-block-modal .qy-live-tip{font-size:11.5px;color:#b3a7bb;margin-top:6px;}',
        '@media(max-width:900px){#qy-blocks-library{display:none}}'
    ].join('');

    function ensureEditorStyle() {
        if (document.getElementById('qy-blocks-editor-css')) return;
        var style = document.createElement('style');
        style.id = 'qy-blocks-editor-css';
        style.setAttribute('data-qy-global', '1');
        style.textContent = EDIT_CSS;
        document.head.appendChild(style);
    }

    function currentPath() {
        var p = location.pathname || '/';
        if (p.length > 1 && p.endsWith('/')) return p;
        if (p.length > 1 && !p.endsWith('/')) return p + '/';
        return '/';
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

    function esc(value) {
        return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function toast(message, isError) {
        var node = document.getElementById('qy-blocks-toast');
        if (!node) {
            node = document.createElement('div');
            node.id = 'qy-blocks-toast';
            node.style.cssText = 'position:fixed;top:64px;left:50%;transform:translateX(-50%);z-index:6000;' +
                'background:rgba(60,60,60,.94);color:#fff;padding:9px 18px;border-radius:999px;font-size:13px;' +
                'font-family:"微软雅黑",sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.18);transition:.2s;';
            document.body.appendChild(node);
        }
        node.textContent = message;
        node.style.background = isError ? 'rgba(224,86,111,.96)' : 'rgba(60,60,60,.94)';
        node.style.opacity = '1';
        clearTimeout(toast.timer);
        toast.timer = setTimeout(function () { node.style.opacity = '0'; }, 2400);
    }

    function removeOldEditor() {
        ['qy-edit-bar', 'qy-hint', 'qy-edit-style'].forEach(function (id) {
            var node = document.getElementById(id);
            if (node && node.parentNode) node.parentNode.removeChild(node);
        });
        document.body.classList.remove('qy-edit-mode');
    }

    /* ---------------- 数据区块（更新日志 / 指令 / 导航 / 历程 / 图廊） ---------------- */

    var dataCache = {};

    function fetchJson(url) {
        if (!dataCache[url]) {
            dataCache[url] = fetch(url + '?t=' + Date.now(), { credentials: 'same-origin' })
                .then(function (r) { return r.json(); });
        }
        return dataCache[url];
    }

    function dataDone(node, html) {
        node.innerHTML = html;
        node.setAttribute('data-qy-data-done', '1');
    }

    function dataFail(node, message) {
        dataDone(node, '<div class="qy-data-empty">' + esc(message) + '</div>');
    }

    function renderChangelog(node, limit) {
        fetchJson('/api/content/changelog_entry').then(function (data) {
            var list = (data.items || []).map(function (item) {
                try { return JSON.parse(item.value || '{}'); } catch { return {}; }
            }).filter(function (item) { return item.date || item.title || item.content; });
            if (!list.length) return dataFail(node, '暂无更新日志');
            var rows = limit > 0 ? list.slice(0, limit) : list;
            dataDone(node, '<div class="qy-changelog">' + rows.map(function (item) {
                var content = Array.isArray(item.content) ? item.content.join('\n') : String(item.content || '');
                var html = content.replace(/\n/g, '<br>');
                return '<div class="qy-changelog-item">' +
                    '<div class="qy-changelog-date">' + esc(item.date || '') + '</div>' +
                    '<div class="qy-changelog-title">' + esc(item.title || '') + '</div>' +
                    '<div class="qy-changelog-content">' + html + '</div></div>';
            }).join('') + '</div>');
        }).catch(function () { dataFail(node, '无法加载更新日志'); });
    }

    function renderCommands(node) {
        fetchJson('/api/content/command').then(function (data) {
            var raw = {};
            if (data.items && data.items.length) {
                try { raw = JSON.parse(data.items[0].value || '{}'); } catch { raw = {}; }
            }
            var categories = (raw && raw.categories) || [];
            if (!categories.length) return dataFail(node, '暂无指令数据');
            dataDone(node, categories.map(function (cat) {
                return '<div class="qy-cmd-group"><h4>' + esc(cat.name || '') + '</h4><ul>' +
                    (cat.commands || []).map(function (cmd) {
                        return '<li><code>' + esc(cmd.name || '') + '</code>' +
                            '<span>' + esc(cmd.description || '') + '</span>' +
                            (cmd.usage ? '<em>' + esc(cmd.usage) + '</em>' : '') + '</li>';
                    }).join('') + '</ul></div>';
            }).join(''));
        }).catch(function () { dataFail(node, '无法加载指令数据'); });
    }

    function renderNavData(node) {
        fetchJson('/api/content/nav_item').then(function (data) {
            var raw = {};
            if (data.items && data.items.length) {
                try { raw = JSON.parse(data.items[0].value || '{}'); } catch { raw = {}; }
            }
            var categories = (raw && raw.categories) || [];
            if (!categories.length) return dataFail(node, '暂无导航数据');
            dataDone(node, categories.map(function (cat) {
                return '<div class="qy-navdata-group"><h4>' + esc(cat.name || '') + '</h4>' +
                    (cat.subtitle ? '<p>' + esc(cat.subtitle) + '</p>' : '') +
                    '<div class="qy-navdata-grid">' + (cat.items || []).map(function (item) {
                        return '<a class="qy-navdata-item" href="' + esc(item.url || '#') + '">' +
                            '<i class="' + esc(item.icon || 'fas fa-link') + '"></i>' +
                            '<strong>' + esc(item.title || '') + '</strong>' +
                            '<span>' + esc(item.description || '') + '</span></a>';
                    }).join('') + '</div></div>';
            }).join(''));
        }).catch(function () { dataFail(node, '无法加载导航数据'); });
    }

    function renderTimelineData(node) {
        fetchJson('/api/content/timeline_entry').then(function (data) {
            var items = (data.items || []).map(function (item) {
                try { return JSON.parse(item.value || '{}'); } catch { return {}; }
            }).filter(function (item) { return item.date || item.description || item.title; });
            if (!items.length) return dataFail(node, '暂无历程数据');
            dataDone(node, '<div class="qy-timeline">' + items.map(function (item) {
                return '<div class="qy-timeline-item"><div class="qy-timeline-date">' + esc(item.date || '') + '</div>' +
                    '<div class="qy-timeline-body">' + (item.title ? '<h3>' + esc(item.title) + '</h3>' : '') +
                    '<p>' + esc(item.description || item.text || '') + '</p></div></div>';
            }).join('') + '</div>');
        }).catch(function () { dataFail(node, '无法加载历程数据'); });
    }

    function renderGalleryData(node, limit) {
        fetchJson('/api/content/gallery_image').then(function (data) {
            var list = (data.items || []).map(function (item) {
                try { return JSON.parse(item.value || '{}'); } catch { return {}; }
            }).filter(function (img) { return img.imageUrl || img.thumbnailUrl; });
            if (!list.length) return dataFail(node, '暂无图片');
            var rows = limit > 0 ? list.slice(0, limit) : list;
            dataDone(node, '<div class="qy-gallery">' + rows.map(function (img) {
                var src = img.thumbnailUrl || img.imageUrl || '';
                if (!src) return '';
                return '<figure><a href="' + esc(img.imageUrl || src) + '" target="_blank" rel="noopener">' +
                    '<img src="' + esc(src) + '" alt="' + esc(img.title || '') + '" loading="lazy"></a>' +
                    (img.title ? '<figcaption>' + esc(img.title) + '</figcaption>' : '') + '</figure>';
            }).join('') + '</div>');
        }).catch(function () { dataFail(node, '无法加载图片'); });
    }

    /* ---------------- 在线人数图表 ---------------- */

    var chartCache = {};

    function renderChart(node) {
        if (node.getAttribute('data-qy-chart-done') === '1') return;
        var hours = Number(node.getAttribute('data-hours')) || 2;
        node.setAttribute('data-qy-chart-done', '1');
        if (!window.Chart) {
            var script = document.createElement('script');
            script.src = '/lib/chart.min.js';
            script.onload = function () { renderChart(node); };
            script.onerror = function () { dataFail(node, '图表库加载失败'); };
            document.head.appendChild(script);
            return;
        }
        fetchJson('/api/history?t=' + Date.now()).then(function (rows) {
            if (!Array.isArray(rows) || !rows.length) {
                dataFail(node, '暂无历史记录');
                return;
            }
            var list = rows.slice(-hours * 30);
            var ctx = node.getContext('2d');
            var dpr = window.devicePixelRatio || 1;
            var rect = node.getBoundingClientRect();
            node.width = Math.max(200, rect.width * dpr);
            node.height = Math.max(80, rect.height * dpr);
            ctx.scale(dpr, dpr);
            ctx.clearRect(0, 0, node.width / dpr, node.height / dpr);
            var labels = list.map(function (r) { return r.time ? r.time.slice(11, 16) : ''; });
            var values = list.map(function (r) { return Number(r.online) || 0; });
            var max = Math.max(1, Math.max.apply(null, values));
            new Chart(ctx, {
                type: 'line',
                data: { labels: labels, datasets: [{ label: '在线人数', data: values, borderColor: '#f0789d', backgroundColor: 'rgba(248,165,194,0.15)', fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: false } }, scales: { x: { display: false }, y: { beginAtZero: true, max: max, ticks: { stepSize: Math.max(1, Math.round(max / 5)) }, grid: { display: false } } } }
            });
            node.setAttribute('data-qy-chart-done', '1');
        }).catch(function () { dataFail(node, '无法加载在线人数'); });
    }

    function enhanceDataBlocks() {
        Array.prototype.forEach.call(document.querySelectorAll('[data-qy-data]'), function (node) {
            if (node.getAttribute('data-qy-data-done') === '1') return;
            var type = node.getAttribute('data-qy-data');
            var limit = Number(node.getAttribute('data-limit')) || 0;
            if (type === 'changelog') renderChangelog(node, limit);
            else if (type === 'commands') renderCommands(node);
            else if (type === 'nav') renderNavData(node);
            else if (type === 'timeline') renderTimelineData(node);
            else if (type === 'gallery') renderGalleryData(node, limit);
        });
        Array.prototype.forEach.call(document.querySelectorAll('[data-qy-chart]'), function (node) {
            renderChart(node);
        });
    }

    /* ---------------- 非编辑时的增强 ---------------- */

    function enhanceContent() {
        Array.prototype.forEach.call(document.querySelectorAll('[data-qy-md]'), function (node) {
            if (node.getAttribute('data-qy-md-done') === '1') return;
            node.setAttribute('data-qy-md-done', '1');
            if (window.marked && typeof window.marked.parse === 'function') {
                var text = node.textContent || '';
                try { node.innerHTML = window.marked.parse(text); } catch (e) {}
            }
        });
        enhanceDataBlocks();
    }

    /* ---------------- 编辑器 ---------------- */

    var editor = null;

    function fieldValue(block, field) {
        var props = block.props || {};
        var value = props[field.key];
        if (field.type === 'buttons') {
            return (Array.isArray(value) ? value : []).map(function (b) { return (b.label || '') + '|' + (b.url || ''); }).join('\n');
        }
        if (field.type === 'links') {
            return (Array.isArray(value) ? value : []).map(function (b) { return (b.label || '') + '|' + (b.url || '') + '|' + (b.icon || ''); }).join('\n');
        }
        if (field.type === 'images') {
            return (Array.isArray(value) ? value : []).map(function (b) { return (b.src || '') + '|' + (b.alt || ''); }).join('\n');
        }
        if (field.type === 'lines') {
            var cols = field.columns || 1;
            return (Array.isArray(value) ? value : []).map(function (item) {
                if (typeof item === 'string') return item;
                if (cols === 1) return item.text || item.title || '';
                if (cols === 2) return (item.label || '') + '|' + (item.value || '');
                if (cols === 3) return (item.date || '') + '|' + (item.title || '') + '|' + (item.text || item.desc || '');
                return (item.icon || '') + '|' + (item.title || '') + '|' + (item.text || item.desc || '') + '|' + (item.link || item.url || '');
            }).join('\n');
        }
        return value == null ? '' : String(value);
    }

    function parseLines(text, cols) {
        var rows = String(text || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
        return rows.map(function (line) {
            var parts = line.split('|').map(function (x) { return x.trim(); });
            if (cols === 1) return { text: parts[0] || '' };
            if (cols === 2) return { label: parts[0] || '', value: parts[1] || '' };
            if (cols === 3) return { date: parts[0] || '', title: parts[1] || '', text: parts[2] || '' };
            return { icon: parts[0] || '', title: parts[1] || '', text: parts[2] || '', link: parts[3] || '' };
        });
    }

    function parseFieldValue(field, text) {
        if (field.type === 'buttons') {
            return String(text || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean).map(function (line) {
                var parts = line.split('|');
                return { label: (parts[0] || '').trim(), url: (parts[1] || '').trim() };
            });
        }
        if (field.type === 'links') {
            return String(text || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean).map(function (line) {
                var parts = line.split('|');
                return { label: (parts[0] || '').trim(), url: (parts[1] || '').trim(), icon: (parts[2] || '').trim() };
            }).filter(function (l) { return l.url; });
        }
        if (field.type === 'images') {
            return String(text || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean).map(function (line) {
                var parts = line.split('|');
                return { src: (parts[0] || '').trim(), alt: (parts[1] || '').trim() };
            }).filter(function (i) { return i.src; });
        }
        if (field.type === 'lines') return parseLines(text, field.columns || 1);
        if (field.type === 'number') return Number(text) || 0;
        return text;
    }

    function blockLabel(type) {
        var meta = editor.types.find(function (t) { return t.type === type; });
        return meta ? meta.label : type;
    }

    function canvas() {
        return document.getElementById('qy-blocks-page') || document.getElementById('qy-blocks-canvas');
    }

    function previewHtml(block) {
        return api('/api/admin/block-preview', {
            method: 'POST',
            body: JSON.stringify({ path: editor.path, block: block })
        }).then(function (data) { return data.html || ''; });
    }

    function placeholderHtml(block) {
        return '<section class="qy-block qy-block-empty" data-block-id="' + esc(block.id) +
            '" data-block-type="' + esc(block.type) + '">正在预览：' + esc(blockLabel(block.type)) + '</section>';
    }

    function fillWrap(wrap, html) {
        var tools = wrap.querySelector('.qy-block-tools');
        if (tools) tools.parentNode.removeChild(tools);
        wrap.innerHTML = html || '';
        if (tools) wrap.appendChild(tools);
        else addTools(wrap, wrap.dataset.blockId);
        enhanceContent();
    }

    function refreshBlockNode(block) {
        var wrap = document.querySelector('.qy-block-edit-wrap[data-block-id="' + block.id + '"]');
        if (!wrap) return Promise.resolve();
        return previewHtml(block).then(function (html) {
            fillWrap(wrap, html || placeholderHtml(block));
        }).catch(function (error) {
            toast(error.message, true);
        });
    }

    function makeWrap(block, html) {
        var wrap = document.createElement('div');
        wrap.className = 'qy-block-edit-wrap';
        wrap.dataset.blockId = block.id;
        wrap.draggable = true;
        wrap.innerHTML = html || placeholderHtml(block);
        addTools(wrap, block.id);
        bindDrag(wrap);
        return wrap;
    }

    function openModal(block) {
        var type = editor.types.find(function (t) { return t.type === block.type; });
        if (!type) return;
        var overlay = document.createElement('div');
        overlay.id = 'qy-block-modal';
        var card = document.createElement('div');
        card.className = 'qy-modal-card';
        var h = document.createElement('h3');
        h.textContent = '编辑：' + type.label;
        var sub = document.createElement('p');
        sub.className = 'qy-modal-sub';
        sub.textContent = '此区块只保存在当前页面：' + editor.path;
        card.appendChild(h);
        card.appendChild(sub);

        var inputs = {};
        var previewTimer = null;

        function collect() {
            var props = JSON.parse(JSON.stringify(block.props || {}));
            Object.keys(inputs).forEach(function (key) {
                props[key] = parseFieldValue(inputs[key].field, inputs[key].input.value);
            });
            return props;
        }

        function schedulePreview() {
            clearTimeout(previewTimer);
            previewTimer = setTimeout(function () {
                var temp = { id: block.id, type: block.type, props: collect() };
                var wrap = document.querySelector('.qy-block-edit-wrap[data-block-id="' + block.id + '"]');
                if (!wrap) return;
                previewHtml(temp).then(function (html) {
                    fillWrap(wrap, html || placeholderHtml(block));
                }).catch(function () {});
            }, 320);
        }

        (type.fields || []).forEach(function (field) {
            var label = document.createElement('label');
            var span = document.createElement('span');
            span.textContent = field.label;
            label.appendChild(span);
            var input;
            if (field.type === 'textarea' || field.type === 'buttons' || field.type === 'links' || field.type === 'images' || field.type === 'lines') {
                input = document.createElement('textarea');
                input.rows = field.rows || (field.type === 'lines' ? 5 : 3);
                input.value = fieldValue(block, field);
            } else if (field.type === 'select') {
                input = document.createElement('select');
                (field.options || []).forEach(function (opt) {
                    var o = document.createElement('option');
                    o.value = String(opt.value);
                    o.textContent = opt.label;
                    input.appendChild(o);
                });
                input.value = String(block.props[field.key] != null ? block.props[field.key] : (field.options && field.options[0] ? field.options[0].value : ''));
            } else {
                input = document.createElement('input');
                input.type = field.type === 'number' ? 'number' : (field.type === 'url' ? 'url' : 'text');
                input.value = fieldValue(block, field);
            }
            input.addEventListener('input', schedulePreview);
            input.addEventListener('change', schedulePreview);
            label.appendChild(input);
            inputs[field.key] = { field: field, input: input };

            if (field.type === 'url' || field.type === 'images') {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'qy-upload-btn';
                btn.textContent = '上传图片';
                var file = document.createElement('input');
                file.type = 'file';
                file.accept = 'image/*';
                file.style.display = 'none';
                btn.addEventListener('click', function () { file.click(); });
                file.addEventListener('change', function () {
                    var selected = file.files && file.files[0];
                    if (!selected) return;
                    var reader = new FileReader();
                    reader.onload = function () {
                        btn.textContent = '上传中…';
                        api('/api/admin/upload', {
                            method: 'POST',
                            body: JSON.stringify({ name: selected.name, data: reader.result })
                        }).then(function (data) {
                            if (field.type === 'url') {
                                input.value = data.url;
                            } else {
                                var current = input.value.replace(/\s*$/, '');
                                input.value = (current ? current + '\n' : '') + data.url + '|';
                            }
                            btn.textContent = '上传图片';
                            schedulePreview();
                            toast('图片已上传');
                        }).catch(function (error) {
                            btn.textContent = '上传图片';
                            toast(error.message, true);
                        });
                    };
                    reader.readAsDataURL(selected);
                });
                label.appendChild(btn);
                label.appendChild(file);
            }

            card.appendChild(label);
        });

        var liveTip = document.createElement('p');
        liveTip.className = 'qy-live-tip';
        liveTip.textContent = '修改时会实时更新页面预览（点“确定”后可继续编辑，最后点顶部“保存”写入）';
        card.appendChild(liveTip);

        var actions = document.createElement('div');
        actions.className = 'qy-modal-actions';
        var cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'qy-ghost';
        cancel.textContent = '取消';
        cancel.addEventListener('click', function () {
            clearTimeout(previewTimer);
            overlay.remove();
            refreshBlockNode(block);
        });
        var save = document.createElement('button');
        save.type = 'button';
        save.className = 'qy-primary';
        save.textContent = '确定';
        save.addEventListener('click', function () {
            clearTimeout(previewTimer);
            Object.keys(inputs).forEach(function (key) {
                var item = inputs[key];
                block.props[key] = parseFieldValue(item.field, item.input.value);
            });
            overlay.remove();
            markDirty();
            refreshBlockNode(block);
            toast('已应用到页面，记得点顶部“保存”');
        });
        actions.appendChild(cancel);
        actions.appendChild(save);
        card.appendChild(actions);
        overlay.appendChild(card);
        overlay.addEventListener('click', function (e) { if (e.target === overlay) { overlay.remove(); refreshBlockNode(block); } });
        document.body.appendChild(overlay);
    }

    function createPlaceholder(block) {
        return makeWrap(block, placeholderHtml(block));
    }

    function markDirty() {
        var saveBtn = document.querySelector('#qy-blocks-editorbar [data-act="save"]');
        if (saveBtn) saveBtn.textContent = '保存 *';
    }

    function makeBlock(type) {
        var meta = editor.types.find(function (t) { return t.type === type; });
        return {
            id: 'b-' + Math.random().toString(16).slice(2, 10),
            type: type,
            props: JSON.parse(JSON.stringify((meta && meta.defaults) || {}))
        };
    }

    function wrapExistingBlocks() {
        var root = canvas();
        if (!root) return;
        Array.prototype.slice.call(root.children).forEach(function (blockNode) {
            if (!blockNode.dataset || !blockNode.dataset.blockId) return;
            if (blockNode.parentNode !== root) return;
            var wrap = document.createElement('div');
            wrap.className = 'qy-block-edit-wrap';
            wrap.dataset.blockId = blockNode.dataset.blockId;
            wrap.draggable = true;
            root.insertBefore(wrap, blockNode);
            wrap.appendChild(blockNode);
            addTools(wrap, blockNode.dataset.blockId);
            bindDrag(wrap);
        });
    }

    function addTools(wrap, id) {
        for (var i = 0; i < wrap.children.length; i += 1) {
            if (wrap.children[i].classList && wrap.children[i].classList.contains('qy-block-tools')) return;
        }
        var tools = document.createElement('div');
        tools.className = 'qy-block-tools';
        [['edit', '编辑'], ['up', '↑'], ['down', '↓'], ['dup', '复制'], ['del', '删除']].forEach(function (pair) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = pair[1];
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                handleTool(pair[0], id, wrap);
            });
            tools.appendChild(btn);
        });
        wrap.appendChild(tools);
    }

    function handleTool(action, id, wrap) {
        var block = editor.blocks.find(function (b) { return b.id === id; });
        if (!block) return;
        if (action === 'edit') openModal(block);
        else if (action === 'up') {
            var prev = wrap.previousElementSibling;
            if (prev) { wrap.parentNode.insertBefore(wrap, prev); markDirty(); }
        } else if (action === 'down') {
            var next = wrap.nextElementSibling;
            if (next) { wrap.parentNode.insertBefore(next, wrap); markDirty(); }
        } else if (action === 'dup') {
            var clone = makeBlock(block.type);
            clone.props = JSON.parse(JSON.stringify(block.props));
            editor.blocks.splice(editor.blocks.indexOf(block) + 1, 0, clone);
            var node = createPlaceholder(clone);
            wrap.parentNode.insertBefore(node, wrap.nextSibling);
            markDirty();
            previewHtml(clone).then(function (html) { fillWrap(node, html || placeholderHtml(clone)); }).catch(function () {});
        } else if (action === 'del') {
            editor.blocks = editor.blocks.filter(function (b) { return b.id !== id; });
            wrap.remove();
            markDirty();
            toast('已删除，记得点“保存”');
        }
    }

    function bindDrag(wrap) {
        wrap.addEventListener('dragstart', function (e) {
            editor.dragFrom = 'canvas';
            editor.dragId = wrap.dataset.blockId;
            try { e.dataTransfer.setData('text/plain', wrap.dataset.blockId); } catch (err) {}
            e.dataTransfer.effectAllowed = 'move';
            wrap.classList.add('qy-block-drag');
        });
        wrap.addEventListener('dragend', function () { wrap.classList.remove('qy-block-drag'); });
        wrap.addEventListener('dragover', function (e) {
            if (editor.dragFrom !== 'canvas') return;
            e.preventDefault();
            var rect = wrap.getBoundingClientRect();
            var before = (e.clientY - rect.top) < rect.height / 2;
            wrap.classList.toggle('qy-drop-before', before);
            wrap.classList.toggle('qy-drop-after', !before);
        });
        wrap.addEventListener('dragleave', function () {
            wrap.classList.remove('qy-drop-before', 'qy-drop-after');
        });
        wrap.addEventListener('drop', function (e) {
            e.preventDefault();
            wrap.classList.remove('qy-drop-before', 'qy-drop-after');
            var dragging = document.querySelector('.qy-block-drag');
            if (!dragging || dragging === wrap) return;
            var rect = wrap.getBoundingClientRect();
            var before = (e.clientY - rect.top) < rect.height / 2;
            wrap.parentNode.insertBefore(dragging, before ? wrap : wrap.nextSibling);
            markDirty();
        });
    }

    function renderLibrary() {
        ensureEditorStyle();
        var old = document.getElementById('qy-blocks-library');
        if (old) old.remove();
        var panel = document.createElement('div');
        panel.id = 'qy-blocks-library';
        var h = document.createElement('h4');
        h.textContent = '模块库';
        panel.appendChild(h);
        var hint = document.createElement('p');
        hint.className = 'qy-lib-hint';
        hint.textContent = '点击或拖到页面即可加入，按页面独立保存。';
        panel.appendChild(hint);

        var groups = {};
        editor.types.forEach(function (type) {
            (groups[type.group] = groups[type.group] || []).push(type);
        });
        Object.keys(groups).forEach(function (name) {
            var group = document.createElement('div');
            group.className = 'qy-lib-group';
            var title = document.createElement('span');
            title.textContent = name;
            group.appendChild(title);
            groups[name].forEach(function (type) {
                var item = document.createElement('div');
                item.className = 'qy-lib-item';
                item.draggable = true;
                item.innerHTML = '<i class="fas fa-cube"></i><span>' + esc(type.label) + '</span>';
                item.addEventListener('click', function () { addBlockToCanvas(type.type); });
                item.addEventListener('dragstart', function (e) {
                    editor.dragFrom = 'library';
                    editor.dragType = type.type;
                    try { e.dataTransfer.setData('text/plain', type.type); } catch (err) {}
                    e.dataTransfer.effectAllowed = 'copy';
                });
                group.appendChild(item);
            });
            panel.appendChild(group);
        });
        document.body.appendChild(panel);
    }

    function startBlank() {
        var root = document.getElementById('qy-blocks-page');
        if (!root) {
            var keep = ['menu-box', 'footer', 'page-loader', 'qy-scrollbar', 'musicControl', 'qy-toast', 'qy-nav-progress',
                'qy-blocks-editorbar', 'qy-blocks-library', 'qy-blocks-empty-canvas'];
            root = document.createElement('main');
            root.id = 'qy-blocks-page';
            root.className = 'qy-blocks-page';
            Array.prototype.slice.call(document.body.children).forEach(function (node) {
                if (node === root || node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return;
                if (node.id && keep.indexOf(node.id) >= 0) return;
                if (node.id && node.id.indexOf('qy-block') === 0) return;
                node.style.display = 'none';
            });
            var footer = document.getElementById('footer');
            if (footer && footer.parentNode) footer.parentNode.insertBefore(root, footer);
            else document.body.appendChild(root);
        }
        var empty = document.getElementById('qy-blocks-empty-canvas');
        if (empty) empty.remove();
        bindCanvasDrop();
        if (editor) editor.exists = true;
        return root;
    }

    function addBlockToCanvas(type, beforeWrap) {
        var block = makeBlock(type);
        editor.blocks.push(block);
        var root = canvas();
        if (!root) root = startBlank();
        if (!root) return;
        var wrap = createPlaceholder(block);
        if (beforeWrap && beforeWrap.parentNode === root) root.insertBefore(wrap, beforeWrap);
        else root.appendChild(wrap);
        markDirty();
        previewHtml(block).then(function (html) {
            fillWrap(wrap, html || placeholderHtml(block));
        }).catch(function (error) {
            toast(error.message, true);
        });
    }

    function bindCanvasDrop() {
        var root = canvas();
        if (!root) return;
        root.addEventListener('dragover', function (e) {
            if (editor.dragFrom === 'library') e.preventDefault();
        });
        root.addEventListener('drop', function (e) {
            if (editor.dragFrom !== 'library' || !editor.dragType) return;
            e.preventDefault();
            var target = e.target.closest ? e.target.closest('.qy-block-edit-wrap') : null;
            addBlockToCanvas(editor.dragType, target);
            editor.dragFrom = null;
            editor.dragType = null;
        });
    }

    function buildEditorBar() {
        var old = document.getElementById('qy-blocks-editorbar');
        if (old) old.remove();
        var bar = document.createElement('div');
        bar.id = 'qy-blocks-editorbar';
        var pathEl = document.createElement('span');
        pathEl.className = 'qy-eb-path';
        pathEl.textContent = editor.path;
        var tip = document.createElement('span');
        tip.className = 'qy-eb-tip';
        tip.textContent = '仅此页面生效 · 实时预览';
        var actions = document.createElement('div');
        actions.className = 'qy-eb-actions';

        var importBtn = document.createElement('button');
        importBtn.type = 'button';
        importBtn.className = 'qy-ghost';
        importBtn.textContent = '导入当前页面内容';
        importBtn.addEventListener('click', importCurrent);

        var resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'qy-danger';
        resetBtn.textContent = '还原为原页面';
        resetBtn.addEventListener('click', function () {
            if (!confirm('删除此页面的模块布局，恢复原始页面？')) return;
            api('/api/site/layout?path=' + encodeURIComponent(editor.path), { method: 'DELETE' })
                .then(function () { location.reload(); })
                .catch(function (e) { toast(e.message, true); });
        });

        var saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'qy-primary';
        saveBtn.dataset.act = 'save';
        saveBtn.textContent = '保存';
        saveBtn.addEventListener('click', saveLayout);

        actions.appendChild(importBtn);
        actions.appendChild(resetBtn);
        actions.appendChild(saveBtn);
        bar.appendChild(pathEl);
        bar.appendChild(tip);
        bar.appendChild(actions);
        document.body.appendChild(bar);
        document.body.classList.add('qy-block-editing');
    }

    function saveLayout() {
        var root = canvas();
        var ordered = [];
        if (root) {
            Array.prototype.slice.call(root.children).forEach(function (wrap) {
                if (!wrap.classList || !wrap.classList.contains('qy-block-edit-wrap')) return;
                var block = editor.blocks.find(function (b) { return b.id === wrap.dataset.blockId; });
                if (block) ordered.push(block);
            });
        }
        editor.blocks.forEach(function (b) { if (ordered.indexOf(b) < 0) ordered.push(b); });
        var btn = document.querySelector('#qy-blocks-editorbar [data-act="save"]');
        if (btn) { btn.disabled = true; btn.textContent = '保存中…'; }
        api('/api/site/layout', {
            method: 'PUT',
            body: JSON.stringify({ path: editor.path, blocks: ordered })
        }).then(function () {
            editor.exists = true;
            editor.blocks = ordered;
            if (btn) { btn.disabled = false; btn.textContent = '保存'; }
            toast('已保存，当前页面已更新');
        }).catch(function (e) {
            if (btn) { btn.disabled = false; btn.textContent = '保存 *'; }
            toast(e.message, true);
        });
    }

    function importCurrent() {
        if (!confirm('从原始静态页面重新导入内容并按区块拆分？这会覆盖当前页面的区块布局。')) return;
        api('/api/admin/layout/import-static', {
            method: 'POST',
            body: JSON.stringify({ path: editor.path })
        }).then(function (result) {
            if (!result.blocks || !result.blocks.length) {
                toast('原页面没有可导入内容', true);
                return;
            }
            location.reload();
        }).catch(function (error) {
            toast(error.message, true);
        });
    }

    function startEditor() {
        api('/api/admin/session').then(function (session) {
            if (!session || !session.authenticated) {
                console.warn('[QYBlocks] 未登录管理后台，无法编辑');
                return;
            }
            return Promise.all([
                api('/api/admin/block-types'),
                api('/api/site/layout?path=' + encodeURIComponent(currentPath()))
            ]).then(function (results) {
                try {
                    document.documentElement.classList.remove('qy-no-scroll');
                    document.body.classList.remove('qy-no-scroll', 'no-scroll');
                } catch (e) {}
                removeOldEditor();
                editor = {
                    types: results[0].types || [],
                    path: results[1].path || currentPath(),
                    exists: Boolean(results[1].exists) && (results[1].blocks || []).length > 0,
                    blocks: (results[1].blocks || []).slice(),
                    dragFrom: null,
                    dragId: null,
                    dragType: null
                };
                ensureEditorStyle();
                buildEditorBar();
                renderLibrary();
                if (!window.__qyBlocksDocDrop) {
                    window.__qyBlocksDocDrop = true;
                    document.addEventListener('dragover', function (e) {
                        if (editor && editor.dragFrom === 'library' && !canvas()) e.preventDefault();
                    });
                    document.addEventListener('drop', function (e) {
                        if (!editor || editor.dragFrom !== 'library' || canvas()) return;
                        e.preventDefault();
                        var type = editor.dragType;
                        editor.dragFrom = null;
                        editor.dragType = null;
                        if (type) addBlockToCanvas(type);
                    });
                }
                if (!editor.exists) {
                    var root = document.getElementById('content') || document.body;
                    var empty = document.createElement('div');
                    empty.id = 'qy-blocks-empty-canvas';
                    empty.innerHTML = '此页面还没有模块布局。可以导入现有内容拆分，或从空白开始搭建。' +
                        '<div style="margin-top:12px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">' +
                        '<button type="button" data-act="import">导入当前页面内容</button>' +
                        '<button type="button" data-act="blank" style="background:#f6eef3;color:#a15a78;">从空白开始搭建</button>' +
                        '</div>';
                    empty.querySelector('[data-act="import"]').addEventListener('click', importCurrent);
                    empty.querySelector('[data-act="blank"]').addEventListener('click', startBlank);
                    root.appendChild(empty);
                } else {
                    wrapExistingBlocks();
                    bindCanvasDrop();
                    enhanceContent();
                }
            });
        }).catch(function (error) {
            console.warn('[QYBlocks] 初始化失败：', error);
        });
    }

    function init() {
        removeOldEditor();
        enhanceContent();
        try {
            var edit = new URLSearchParams(location.search).get('edit') === '1';
            if (edit) startEditor();
        } catch (e) {}
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.QYBlocks = { refresh: init };
})();
