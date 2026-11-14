(function () {
    'use strict';
    if (window.__qyInlineEditor) return;
    window.__qyInlineEditor = true;

    var state = { editing: false, dirty: {}, bar: null, toastTimer: null };
    var PAGE = location.pathname;

    var css = [
        '#qy-edit-bar{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:2147483000;',
        'display:flex;align-items:center;gap:14px;background:#3c3c3c;color:#fff;border-radius:14px;',
        'padding:10px 12px 10px 20px;font-size:13px;box-shadow:0 12px 32px rgba(0,0,0,.28);',
        'font-family:"微软雅黑","Microsoft YaHei",Roboto,Arial,sans-serif;max-width:calc(100vw - 32px);}',
        '#qy-edit-bar button{border:none;border-radius:9px;padding:8px 15px;font-size:13px;cursor:pointer;',
        'font-family:inherit;transition:.15s;}',
        '#qy-edit-bar .qy-save{background:linear-gradient(135deg,#f8a5c2,#f0789d);color:#fff;font-weight:600;}',
        '#qy-edit-bar .qy-save:disabled{opacity:.55;cursor:default;}',
        '#qy-edit-bar .qy-ghost{background:transparent;border:1px solid rgba(255,255,255,.3);color:#f4eff7;}',
        '#qy-edit-bar .qy-ghost:hover{border-color:#fff;color:#fff;}',
        '#qy-edit-bar .qy-count{font-size:12px;color:#f0eaf3;}',
        'body.qy-edit-mode [data-qy-key]:not([data-qy-active]){outline:1px dashed rgba(240,120,157,.55);',
        'outline-offset:3px;border-radius:4px;cursor:pointer;transition:outline-color .15s,background .15s;}',
        'body.qy-edit-mode [data-qy-key]:not([data-qy-active]):hover{outline:2px solid #f0789d;',
        'background:rgba(248,165,194,.16);}',
        '[data-qy-active]{outline:2px solid #f0789d !important;outline-offset:3px;border-radius:4px;',
        'background:rgba(248,165,194,.12);cursor:text;}',
        'body.qy-edit-mode [data-qy-active]:empty::before{content:"（空文字）";color:#c9a7b8;font-size:12px;}',
        '#qy-hint{position:fixed;right:18px;bottom:18px;z-index:2147482999;background:rgba(60,60,60,.92);',
        'color:#f7f2f9;font-size:12px;padding:9px 14px;border-radius:10px;line-height:1.6;',
        'font-family:"微软雅黑","Microsoft YaHei",sans-serif;max-width:260px;box-shadow:0 8px 22px rgba(0,0,0,.2);}',
        '#qy-hint b{color:#f8a5c2;}'
    ].join('');

    function ensureStyle() {
        if (document.getElementById('qy-edit-style')) return;
        var style = document.createElement('style');
        style.id = 'qy-edit-style';
        style.textContent = css;
        document.head.appendChild(style);
    }

    function toast(message, isError) {
        var node = document.getElementById('qy-toast');
        if (!node) {
            node = document.createElement('div');
            node.id = 'qy-toast';
            node.style.cssText = 'position:fixed;top:78px;left:50%;transform:translateX(-50%);z-index:2147483001;' +
                'background:rgba(60,60,60,.94);color:#fff;padding:9px 18px;border-radius:999px;font-size:13px;' +
                'box-shadow:0 8px 24px rgba(0,0,0,.18);font-family:"微软雅黑",sans-serif;';
            document.body.appendChild(node);
        }
        node.textContent = message;
        node.style.background = isError ? 'rgba(224,86,111,.96)' : 'rgba(60,60,60,.94)';
        node.style.display = 'block';
        clearTimeout(state.toastTimer);
        state.toastTimer = setTimeout(function () {
            node.style.display = 'none';
        }, 2600);
    }

    function dirtyCount() {
        return Object.keys(state.dirty).length;
    }

    function updateBar() {
        if (!state.bar) return;
        var count = state.bar.querySelector('.qy-count');
        var save = state.bar.querySelector('.qy-save');
        if (count) count.textContent = state.editing ? '点击文字即可修改' : '已退出编辑';
        if (save) {
            save.textContent = dirtyCount() ? '保存 ' + dirtyCount() + ' 处' : '保存';
            save.disabled = dirtyCount() === 0;
        }
    }

    function targetOf(el) {
        while (el && el.nodeType === 1) {
            if (el.hasAttribute && el.hasAttribute('data-qy-key')) return el;
            el = el.parentElement;
        }
        return null;
    }

    function currentText(el) {
        if (el.hasAttribute('data-qy-attr')) {
            return el.getAttribute(el.getAttribute('data-qy-attr')) || '';
        }
        return el.textContent;
    }

    function setText(el, value) {
        if (el.hasAttribute('data-qy-attr')) {
            el.setAttribute(el.getAttribute('data-qy-attr'), value);
            return;
        }
        el.textContent = value;
    }

    function activate(el) {
        if (el.querySelector('[data-qy-key]')) {
            toast('这里包含多段文字，请在后台左侧逐条修改', true);
            return;
        }
        el.setAttribute('data-qy-active', '');
        el.setAttribute('contenteditable', 'true');
        el.spellcheck = false;
        el.focus();
        var range = document.createRange();
        range.selectNodeContents(el);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function deactivate(el) {
        if (!el) return;
        el.removeAttribute('contenteditable');
        el.removeAttribute('data-qy-active');
        var key = el.getAttribute('data-qy-key');
        var source = el.getAttribute('data-qy-source') || '';
        var value = currentText(el).replace(/\u00a0/g, ' ').trim();
        if (!key) return;
        if (value === source) delete state.dirty[key];
        else state.dirty[key] = { key: key, source: source, value: value, pages: [PAGE] };
        updateBar();
    }

    function save() {
        var changes = Object.keys(state.dirty).map(function (key) {
            return state.dirty[key];
        });
        if (!changes.length) return;
        var button = state.bar.querySelector('.qy-save');
        button.disabled = true;
        button.textContent = '保存中…';
        fetch('/api/admin/inline-save', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ page: PAGE, changes: changes })
        }).then(function (response) {
            if (response.status === 401) throw new Error('登录已过期，请重新登录');
            if (!response.ok) throw new Error('保存失败');
            return response.json();
        }).then(function (result) {
            state.dirty = {};
            document.querySelectorAll('[data-qy-key]').forEach(function (node) {
                var key = node.getAttribute('data-qy-key');
                node.setAttribute('data-qy-source', currentText(node).trim());
            });
            toast('已保存 ' + (result.updated || 0) + ' 处修改');
            updateBar();
        }).catch(function (error) {
            toast(error.message, true);
            button.disabled = false;
            updateBar();
        });
    }

    function buildBar() {
        var bar = document.createElement('div');
        bar.id = 'qy-edit-bar';
        bar.innerHTML =
            '<span class="qy-count"></span>' +
            '<button type="button" class="qy-save" disabled>保存</button>' +
            '<button type="button" class="qy-ghost qy-exit">退出编辑</button>' +
            '<a class="qy-ghost" style="color:#f4eff7;text-decoration:none;" href="/admin">后台管理</a>';
        document.body.appendChild(bar);
        bar.querySelector('.qy-save').addEventListener('click', save);
        bar.querySelector('.qy-exit').addEventListener('click', function () {
            if (dirtyCount() && !confirm('还有未保存的修改，确定退出编辑模式？')) return;
            var url = new URL(location.href);
            url.searchParams.delete('edit');
            location.href = url.toString();
        });
        state.bar = bar;

        var hint = document.createElement('div');
        hint.id = 'qy-hint';
        hint.innerHTML = '编辑模式：<br>点击任意<b>高亮文字</b>直接修改，改完点底部保存。';
        document.body.appendChild(hint);
        updateBar();
    }

    function attach() {
        if (!location.search.includes('edit=1')) {
            return;
        }
        ensureStyle();
        document.body.classList.add('qy-edit-mode');
        buildBar();

        document.addEventListener('click', function (event) {
            if (state.bar && state.bar.contains(event.target)) return;
            if (event.target.closest('#qy-hint')) return;
            var active = document.querySelector('[data-qy-active]');
            var target = targetOf(event.target);
            if (active && active !== target) deactivate(active);
            if (target) {
                event.preventDefault();
                event.stopPropagation();
                if (!target.hasAttribute('data-qy-active')) activate(target);
            }
        }, true);

        document.addEventListener('keydown', function (event) {
            var active = document.querySelector('[data-qy-active]');
            if (!active) return;
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                deactivate(active);
            } else if (event.key === 'Escape') {
                active.textContent = active.getAttribute('data-qy-source') || '';
                deactivate(active);
            }
        });

        document.addEventListener('focusout', function (event) {
            var active = document.querySelector('[data-qy-active]');
            if (active && event.target === active) deactivate(active);
        });

        window.addEventListener('beforeunload', function (event) {
            if (dirtyCount()) {
                event.preventDefault();
                event.returnValue = '';
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attach);
    } else {
        attach();
    }
})();
