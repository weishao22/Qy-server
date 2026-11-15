(function () {
    'use strict';
    if (window.__qyNav) return;
    window.__qyNav = true;

    var GLOBAL_SCRIPT = [/\/lib\/all\.js(?:\?|$)/, /\/lib\/AllComponents\.js(?:\?|$)/, /\/lib\/qy-nav\.js(?:\?|$)/, /\/lib\/comments-widget\.js(?:\?|$)/, /twikoo(?:\.min)?\.js/i];
    var ONCE_SCRIPT = [
        /\/lib\/marked\.min\.js(?:\?|$)/,
        /\/lib\/chart\.min\.js(?:\?|$)/,
        /\/Configs\/faq\/faqList\.js(?:\?|$)/,
        /\/lib\/special\//,
        /cdn\.jsdelivr\.net\/npm\/hls\.js/,
        /cdn\.jsdelivr\.net\/npm\/plyr/,
        /cdn\.jsdelivr\.net\/npm\/papaparse/,
        /cdn\.jsdelivr\.net\/npm\/clusterize/
    ];
    var GLOBAL_CSS = [/\/lib\/all\.css(?:\?|$)/, /fontawesome-free/];
    var PERMANENT = '#menu-box, #footer, #musicControl, #bgMusic, #page-loader, #qy-scrollbar, #qy-toast, #qy-nav-progress, #qy-edit-bar, #qy-hint, [data-qy-global]';

    var state = {
        contentNodes: [],
        pageStyles: [],
        pageLinks: [],
        timers: new Set(),
        listeners: [],
        loadedScripts: new Set(),
        navigating: false,
        queued: null,
        initialized: false
    };

    function isPermanent(node) {
        if (!node) return true;
        if (node.nodeType === 1) {
            if (node.tagName === 'SCRIPT') return true;
            if (node.matches && node.matches(PERMANENT)) return true;
            return false;
        }
        if (node.nodeType === 8) return true;
        return false;
    }

    function ensureProgress() {
        var bar = document.getElementById('qy-nav-progress');
        if (bar) return bar;
        bar = document.createElement('div');
        bar.id = 'qy-nav-progress';
        bar.setAttribute('data-qy-global', '1');
        bar.innerHTML = '<span></span>';
        document.body.appendChild(bar);
        return bar;
    }

    function startProgress() {
        var bar = ensureProgress();
        bar.classList.remove('done');
        bar.classList.add('active');
        var span = bar.firstElementChild;
        span.style.transition = 'none';
        span.style.width = '12%';
        requestAnimationFrame(function () {
            span.style.transition = 'width .35s ease';
            span.style.width = '72%';
        });
    }

    function endProgress() {
        var bar = document.getElementById('qy-nav-progress');
        if (!bar) return;
        var span = bar.firstElementChild;
        span.style.width = '100%';
        bar.classList.add('done');
        setTimeout(function () {
            bar.classList.remove('active', 'done');
            span.style.transition = 'none';
            span.style.width = '0';
        }, 320);
    }

    function ensureProgressStyle() {
        if (document.getElementById('qy-nav-progress-css')) return;
        var style = document.createElement('style');
        style.id = 'qy-nav-progress-css';
        style.setAttribute('data-qy-global', '1');
        style.textContent =
            '#qy-nav-progress{position:fixed;top:0;left:0;right:0;height:3px;z-index:2147483002;pointer-events:none;opacity:0;transition:opacity .2s}' +
            '#qy-nav-progress.active{opacity:1}' +
            '#qy-nav-progress>span{display:block;height:100%;width:0;background:linear-gradient(90deg,#f8a5c2,#d7c2f0);box-shadow:0 0 8px rgba(240,120,157,.6)}';
        document.head.appendChild(style);
    }

    function captureInitial() {
        state.contentNodes = Array.prototype.slice.call(document.body.childNodes).filter(function (node) {
            return !isPermanent(node);
        });
        state.pageStyles = Array.prototype.slice.call(document.head.querySelectorAll('style')).filter(function (node) {
            return !node.hasAttribute('data-qy-global');
        });
        state.pageLinks = Array.prototype.slice.call(document.head.querySelectorAll('link[rel="stylesheet"]')).filter(function (node) {
            return !GLOBAL_CSS.some(function (re) { return re.test(node.href); });
        });
        state.loadedScripts = new Set();
        document.querySelectorAll('script[src]').forEach(function (node) {
            state.loadedScripts.add(node.src);
        });
    }

    function trackedSetTimeout(fn, delay) {
        var id = window.setTimeout(function () {
            state.timers.delete(id);
            try { fn(); } catch (error) { console.warn('[qy-nav]', error); }
        }, delay);
        state.timers.add(id);
        return id;
    }

    function trackedSetInterval(fn, delay) {
        var id = window.setInterval(function () {
            try { fn(); } catch (error) { console.warn('[qy-nav]', error); }
        }, delay);
        state.timers.add(id);
        return id;
    }

    function trackedAddEventListener(target, type, listener, options) {
        target.addEventListener(type, listener, options);
        state.listeners.push([target, type, listener, options]);
    }

    function withScope(run) {
        var originalTimeout = window.setTimeout;
        var originalInterval = window.setInterval;
        var originalDocAdd = document.addEventListener;
        var originalWinAdd = window.addEventListener;
        window.setTimeout = trackedSetTimeout;
        window.setInterval = trackedSetInterval;
        document.addEventListener = function (type, listener, options) {
            if (type === 'DOMContentLoaded') {
                deferHandler(listener, document);
                return;
            }
            trackedAddEventListener(document, type, listener, options);
        };
        window.addEventListener = function (type, listener, options) {
            if (type === 'load') {
                deferHandler(listener, window);
                return;
            }
            trackedAddEventListener(window, type, listener, options);
        };
        try {
            run();
        } finally {
            window.setTimeout = originalTimeout;
            window.setInterval = originalInterval;
            document.addEventListener = originalDocAdd;
            window.addEventListener = originalWinAdd;
        }
    }

    function deferHandler(listener, target) {
        trackedSetTimeout(function () {
            try {
                var event = new Event(target === window ? 'load' : 'DOMContentLoaded', { bubbles: true });
                if (typeof listener === 'function') listener.call(target, event);
                else if (listener && typeof listener.handleEvent === 'function') listener.handleEvent(event);
            } catch (error) {
                console.warn('[qy-nav] 页面初始化回调失败:', error);
            }
        }, 0);
    }

    function cleanupPage() {
        state.timers.forEach(function (id) {
            clearInterval(id);
            clearTimeout(id);
        });
        state.timers.clear();
        state.listeners.splice(0).forEach(function (entry) {
            try { entry[0].removeEventListener(entry[1], entry[2], entry[3]); } catch (e) {}
        });
        Array.prototype.slice.call(document.body.childNodes).forEach(function (node) {
            if (!isPermanent(node)) document.body.removeChild(node);
        });
        state.contentNodes = [];
        state.pageStyles.forEach(function (node) {
            if (node.parentNode) node.parentNode.removeChild(node);
        });
        state.pageStyles = [];
        state.pageLinks.forEach(function (node) {
            if (node.parentNode) node.parentNode.removeChild(node);
        });
        state.pageLinks = [];
    }

    function applyHead(doc) {
        var title = doc.querySelector('title');
        if (title) document.title = title.textContent;
        ['description', 'keywords'].forEach(function (name) {
            var next = doc.querySelector('meta[name="' + name + '"]');
            var current = document.querySelector('meta[name="' + name + '"]');
            if (next && current) {
                current.setAttribute('content', next.getAttribute('content') || '');
            } else if (next && !current) {
                document.head.appendChild(document.importNode(next, true));
            }
        });

        var styles = doc.head.querySelectorAll('style');
        for (var i = 0; i < styles.length; i += 1) {
            var node = document.createElement('style');
            node.textContent = styles[i].textContent;
            document.head.appendChild(node);
            state.pageStyles.push(node);
        }
        var links = doc.head.querySelectorAll('link[rel="stylesheet"]');
        for (var j = 0; j < links.length; j += 1) {
            var href = links[j].getAttribute('href') || '';
            var resolved = new URL(href, location.origin + doc.__qyPath).href;
            if (GLOBAL_CSS.some(function (re) { return re.test(resolved); })) continue;
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = resolved;
            document.head.appendChild(link);
            state.pageLinks.push(link);
        }
    }

    function insertContent(doc) {
        var footer = document.getElementById('footer');
        var target = footer && footer.parentNode === document.body ? footer : null;
        var nodes = Array.prototype.slice.call(doc.body.childNodes);
        nodes.forEach(function (node) {
            if (node.nodeType === 1 && node.tagName === 'SCRIPT') return;
            if (node.nodeType === 1 && node.hasAttribute('data-qy-global')) return;
            if (node.nodeType === 8) return;
            var imported = document.importNode(node, true);
            if (target) document.body.insertBefore(imported, target);
            else document.body.appendChild(imported);
            state.contentNodes.push(imported);
        });
    }

    function loadScriptElement(src) {
        return new Promise(function (resolve) {
            var script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = resolve;
            document.head.appendChild(script);
            state.loadedScripts.add(new URL(src, location.href).href);
        });
    }

    function runScriptSource(source, label) {
        try {
            var fn = new Function(source + '\n//# sourceURL=' + label);
            fn.call(window);
        } catch (error) {
            console.warn('[qy-nav] 脚本执行失败:', label, error);
        }
    }

    // SPA 场景下 DOMContentLoaded / load 已触发过，页面脚本里的
    // document.addEventListener('DOMContentLoaded', fn) / window.addEventListener('load', fn)
    // 不会再次触发，导致数据列表一直卡在“加载中”。
    // 执行页面脚本时临时把这两类监听改为立即执行，执行完立即恢复。
    function runScriptWithReadyShim(source, label) {
        var docAdd = document.addEventListener;
        var winAdd = window.addEventListener;
        var restored = false;
        function restore() {
            if (restored) return;
            restored = true;
            document.addEventListener = docAdd;
            window.addEventListener = winAdd;
        }
        document.addEventListener = function (type, listener, opts) {
            if ((type === 'DOMContentLoaded' || type === 'load') && typeof listener === 'function' && document.readyState !== 'loading') {
                try { listener.call(document, new Event(type)); } catch (e) { console.warn(e); }
                return;
            }
            return docAdd.call(document, type, listener, opts);
        };
        window.addEventListener = function (type, listener, opts) {
            if ((type === 'load' || type === 'DOMContentLoaded') && typeof listener === 'function') {
                try { listener.call(window, new Event(type)); } catch (e) { console.warn(e); }
                return;
            }
            return winAdd.call(window, type, listener, opts);
        };
        try {
            runScriptSource(source, label);
        } finally {
            restore();
        }
    }

    function fetchScriptText(src) {
        return fetch(src, { credentials: 'same-origin' }).then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.text();
        });
    }

    async function executeScripts(doc, pageUrl) {
        var scripts = Array.prototype.slice.call(doc.querySelectorAll('script'));
        for (var i = 0; i < scripts.length; i += 1) {
            var node = scripts[i];
            var type = (node.getAttribute('type') || '').toLowerCase();
            if (type && !/javascript|ecmascript|module/.test(type)) continue;

            var rawSrc = node.getAttribute('src');
            if (rawSrc) {
                var absolute = new URL(rawSrc, location.origin + doc.__qyPath).href;
                if (GLOBAL_SCRIPT.some(function (re) { return re.test(absolute); })) continue;
                if (ONCE_SCRIPT.some(function (re) { return re.test(absolute); })) {
                    if (state.loadedScripts.has(absolute)) continue;
                    await loadScriptElement(absolute);
                    continue;
                }
                try {
                    var source = await fetchScriptText(absolute);
                    withScope(function () {
                        runScriptWithReadyShim(source, absolute);
                    });
                } catch (error) {
                    console.warn('[qy-nav] 加载脚本失败:', absolute, error);
                }
                continue;
            }

            var code = node.textContent || '';
            if (!code.trim()) continue;
            withScope(function () {
                runScriptWithReadyShim(code, pageUrl + '#inline-' + i);
            });
        }
    }

    function shouldHandle(anchor) {
        if (!anchor || anchor.tagName !== 'A') return false;
        if (anchor.hasAttribute('download')) return false;
        if (anchor.hasAttribute('data-no-spa')) return false;
        var target = anchor.getAttribute('target');
        if (target && target !== '_self') return false;
        var href = anchor.getAttribute('href');
        if (!href || href.charAt(0) === '#') return false;
        if (/^(mailto|tel|javascript|blob|data):/i.test(href)) return false;
        var url;
        try {
            url = new URL(anchor.href, location.href);
        } catch (e) {
            return false;
        }
        if (url.origin !== location.origin) return false;
        if (/^\/(admin|admin-assets|api|site)(\/|$)/.test(url.pathname)) return false;
        if (/\.(json|md|txt|xml|zip|png|jpe?g|webp|gif|svg|mp3|mp4|webm|ico)$/i.test(url.pathname)) return false;
        if (url.searchParams.get('edit') === '1') return false;
        if (document.body.classList.contains('qy-edit-mode')) return false;
        return true;
    }

    async function navigate(href, options) {
        options = options || {};
        var url = new URL(href, location.href);
        if (!options.force && url.pathname === location.pathname && url.search === location.search) return;

        if (state.navigating) {
            state.queued = { href: url.href, options: options };
            return;
        }
        state.navigating = true;
        startProgress();

        try {
            var response = await fetch(url.href, {
                credentials: 'same-origin',
                headers: { 'X-QY-Navigate': '1' }
            });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            var htmlText = await response.text();
            var doc = new DOMParser().parseFromString(htmlText, 'text/html');
            doc.__qyPath = url.pathname + url.search;

            cleanupPage();
            applyHead(doc);
            insertContent(doc);

            if (options.push !== false) {
                history.pushState({ qy: 1 }, '', url.href);
            }

            window.__twikoo_custom_init = false;
            window.__twikoo_initialized = false;
            await executeScripts(doc, url.href);

            if (window.QYComments) {
                window.QYComments.initPage();
                window.QYComments.recordView(url.pathname);
            }
            if (window.QYWidgets && typeof window.QYWidgets.refresh === 'function') {
                window.QYWidgets.refresh();
            }
            if (window.QYBlocks && typeof window.QYBlocks.refresh === 'function') {
                window.QYBlocks.refresh();
            }

            window.scrollTo({ top: 0, behavior: 'auto' });
        } catch (error) {
            console.warn('[qy-nav] 切换失败，使用整页跳转:', error);
            location.href = url.href;
            return;
        } finally {
            state.navigating = false;
            endProgress();
            if (state.queued) {
                var next = state.queued;
                state.queued = null;
                navigate(next.href, next.options);
            }
        }
    }

    function init() {
        if (state.initialized) return;
        state.initialized = true;
        ensureProgressStyle();
        captureInitial();

        document.addEventListener('click', function (event) {
            if (event.defaultPrevented) return;
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            var anchor = event.target && event.target.closest ? event.target.closest('a') : null;
            if (!shouldHandle(anchor)) return;
            event.preventDefault();
            navigate(anchor.href, { push: true });
        });

        window.addEventListener('popstate', function () {
            navigate(location.href, { push: false, force: true });
        });

        if (window.QYComments) {
            window.QYComments.recordView(location.pathname);
        }
    }

    window.QYNav = { navigate: navigate, init: init };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
