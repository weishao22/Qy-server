(function () {
    'use strict';
    if (window.__qyCommentsShim) return;
    window.__qyCommentsShim = true;

    var CSS = [
        '.qy-comments{--qy-pink:#f8a5c2;--qy-pink-deep:#f0789d;--qy-line:#f0e6ef;--qy-ink:#4a4a4a;--qy-soft:#9a929d;',
        'font-family:"微软雅黑","Microsoft YaHei",Roboto,Arial,sans-serif;color:var(--qy-ink);}',
        '.qy-comments *{box-sizing:border-box;}',
        '.qy-comments .qy-comment-form{display:flex;flex-direction:column;gap:10px;margin-bottom:22px;background:#fff;',
        'border:1px solid var(--qy-line);border-radius:12px;padding:14px;}',
        '.qy-comments .qy-row{display:flex;gap:10px;flex-wrap:wrap;}',
        '.qy-comments input,.qy-comments textarea{border:1px solid var(--qy-line);background:#fbfafc;border-radius:9px;',
        'padding:9px 11px;font-size:13.5px;font-family:inherit;color:var(--qy-ink);outline:none;transition:.15s;}',
        '.qy-comments input{flex:1 1 160px;min-width:0;}',
        '.qy-comments textarea{width:100%;min-height:86px;resize:vertical;line-height:1.6;}',
        '.qy-comments input:focus,.qy-comments textarea:focus{border-color:var(--qy-pink);background:#fff;',
        'box-shadow:0 0 0 3px rgba(248,165,194,.18);}',
        '.qy-comments .qy-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;}',
        '.qy-comments .qy-tip{font-size:12px;color:var(--qy-soft);}',
        '.qy-comments .qy-submit{border:none;border-radius:9px;padding:9px 20px;font-size:13px;cursor:pointer;',
        'color:#fff;font-weight:600;background:linear-gradient(135deg,#f8a5c2,#f0789d);',
        'box-shadow:0 6px 14px rgba(240,120,157,.26);transition:.15s;font-family:inherit;}',
        '.qy-comments .qy-submit:hover{transform:translateY(-1px);}',
        '.qy-comments .qy-submit:disabled{opacity:.55;cursor:default;transform:none;}',
        '.qy-comments .qy-list{display:flex;flex-direction:column;gap:12px;}',
        '.qy-comments .qy-item{display:flex;gap:11px;background:#fff;border:1px solid var(--qy-line);',
        'border-radius:12px;padding:12px 14px;}',
        '.qy-comments .qy-avatar{width:34px;height:34px;border-radius:50%;flex:none;display:flex;align-items:center;',
        'justify-content:center;color:#fff;font-size:14px;font-weight:600;',
        'background:linear-gradient(135deg,#f8a5c2,#d7c2f0);}',
        '.qy-comments .qy-body{min-width:0;flex:1;}',
        '.qy-comments .qy-meta{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px;}',
        '.qy-comments .qy-nick{font-size:13px;font-weight:600;color:var(--qy-pink-deep);}',
        '.qy-comments .qy-time{font-size:11.5px;color:#c0b8c4;}',
        '.qy-comments .qy-text{font-size:13.5px;line-height:1.7;color:#555;white-space:pre-wrap;word-break:break-word;}',
        '.qy-comments .qy-empty{font-size:13px;color:var(--qy-soft);background:#fff;border:1px dashed var(--qy-line);',
        'border-radius:12px;padding:18px;text-align:center;}',
        '.qy-comments .qy-error{font-size:12.5px;color:#e0566f;background:rgba(224,86,111,.08);border-radius:8px;',
        'padding:8px 10px;}',
        '.qy-comments .qy-notice{font-size:13px;color:var(--qy-soft);text-align:center;padding:16px;}'
    ].join('');

    function ensureStyle() {
        if (document.getElementById('qy-comments-css')) return;
        var style = document.createElement('style');
        style.id = 'qy-comments-css';
        style.setAttribute('data-qy-global', '1');
        style.textContent = CSS;
        document.head.appendChild(style);
    }

    function api(url, options) {
        return fetch(url, Object.assign({
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' }
        }, options || {})).then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (data) {
                if (!response.ok) throw new Error(data.error || ('请求失败 (' + response.status + ')'));
                return data;
            });
        });
    }

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = String(text);
        return node;
    }

    function formatTime(value) {
        var date = new Date(value);
        if (isNaN(date.getTime())) return '';
        function pad(n) { return n < 10 ? '0' + n : String(n); }
        return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' +
            pad(date.getHours()) + ':' + pad(date.getMinutes());
    }

    function setViewCount(count) {
        document.querySelectorAll('#twikoo_visitors').forEach(function (node) {
            node.textContent = String(count);
        });
    }

    function renderList(container, comments) {
        var list = container.querySelector('.qy-list');
        list.textContent = '';
        if (!comments.length) {
            list.appendChild(el('div', 'qy-empty', '还没有评论，来抢沙发吧~'));
            return;
        }
        comments.forEach(function (comment) {
            var item = el('div', 'qy-item');
            var avatar = el('div', 'qy-avatar', (comment.nick || '匿').slice(0, 1));
            var body = el('div', 'qy-body');
            var meta = el('div', 'qy-meta');
            meta.appendChild(el('span', 'qy-nick', comment.nick || '匿名玩家'));
            meta.appendChild(el('span', 'qy-time', formatTime(comment.createdAt)));
            var text = el('div', 'qy-text', comment.content || '');
            body.appendChild(meta);
            body.appendChild(text);
            item.appendChild(avatar);
            item.appendChild(body);
            list.appendChild(item);
        });
        list.scrollTop = list.scrollHeight;
    }

    function build(container, pagePath, onLoaded) {
        container.classList.add('qy-comments');
        container.textContent = '';

        var form = el('div', 'qy-comment-form');
        var row = el('div', 'qy-row');
        var nick = el('input');
        nick.type = 'text';
        nick.placeholder = '昵称（可留空）';
        nick.maxLength = 24;
        var email = el('input');
        email.type = 'email';
        email.placeholder = '邮箱（可选，不公开）';
        email.maxLength = 120;
        row.appendChild(nick);
        row.appendChild(email);
        var content = el('textarea');
        content.placeholder = '说点什么吧…';
        content.maxLength = 600;
        var actions = el('div', 'qy-actions');
        var tip = el('span', 'qy-tip', '文明发言，友善交流');
        var submit = el('button', 'qy-submit', '发表评论');
        submit.type = 'button';
        actions.appendChild(tip);
        actions.appendChild(submit);
        form.appendChild(row);
        form.appendChild(content);
        form.appendChild(actions);

        var list = el('div', 'qy-list');
        container.appendChild(form);
        container.appendChild(list);

        function refresh() {
            return api('/api/comments?path=' + encodeURIComponent(pagePath)).then(function (data) {
                renderList(container, data.comments || []);
                if (typeof onLoaded === 'function') onLoaded();
            }).catch(function (error) {
                list.textContent = '';
                list.appendChild(el('div', 'qy-error', error.message));
            });
        }

        submit.addEventListener('click', function () {
            var text = content.value.trim();
            if (!text) {
                tip.textContent = '评论内容不能为空';
                tip.style.color = '#e0566f';
                return;
            }
            submit.disabled = true;
            submit.textContent = '发送中…';
            tip.textContent = '文明发言，友善交流';
            tip.style.color = '';
            api('/api/comments', {
                method: 'POST',
                body: JSON.stringify({
                    path: pagePath,
                    nick: nick.value,
                    email: email.value,
                    content: text
                })
            }).then(function () {
                content.value = '';
                return refresh();
            }).catch(function (error) {
                tip.textContent = error.message;
                tip.style.color = '#e0566f';
            }).finally(function () {
                submit.disabled = false;
                submit.textContent = '发表评论';
            });
        });

        refresh();
    }

    function init(options) {
        ensureStyle();
        options = options || {};
        var target = typeof options.el === 'string' ? document.querySelector(options.el) : options.el;
        if (!target) return Promise.resolve();
        var pagePath = options.path || location.pathname;
        if (target.getAttribute('data-qy-comments-init') === '1') return Promise.resolve();
        target.setAttribute('data-qy-comments-init', '1');

        var onLoaded = options.onCommentLoaded;
        build(target, pagePath, onLoaded);

        if (options.pageview) {
            api('/api/views?path=' + encodeURIComponent(pagePath)).then(function (data) {
                setViewCount(data.count || 0);
            }).catch(function () {});
        }
        return Promise.resolve();
    }

    function recordView(pagePath) {
        pagePath = pagePath || location.pathname;
        var key = 'qy-view:' + pagePath;
        var seen = false;
        try {
            seen = sessionStorage.getItem(key) === '1';
            sessionStorage.setItem(key, '1');
        } catch (e) {}
        if (seen) {
            return api('/api/views?path=' + encodeURIComponent(pagePath)).then(function (data) {
                setViewCount(data.count || 0);
            }).catch(function () {});
        }
        return api('/api/views', {
            method: 'POST',
            body: JSON.stringify({ path: pagePath })
        }).then(function (data) {
            setViewCount(data.count || 0);
        }).catch(function () {});
    }

    function initPage() {
        if (window.__twikoo_custom_init) return;
        document.querySelectorAll('#tcomment').forEach(function (node) {
            init({ el: node, path: location.pathname, pageview: true });
        });
    }

    window.twikoo = window.twikoo || {};
    window.twikoo.init = init;
    window.QYComments = {
        init: init,
        initPage: initPage,
        recordView: recordView,
        setViewCount: setViewCount
    };
})();
