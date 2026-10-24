(function () {
    // ===== 无轨道悬浮滚动条 =====
    (function () {
        const root = document.documentElement;
        root.classList.add('qy-custom-scrollbar');

        function setup() {
            if (document.getElementById('qy-scrollbar')) return;

            const bar = document.createElement('div');
            bar.id = 'qy-scrollbar';
            bar.setAttribute('aria-hidden', 'true');
            bar.innerHTML = '<div id="qy-scrollbar-thumb"></div>';
            document.body.appendChild(bar);

            const thumb = document.getElementById('qy-scrollbar-thumb');
            if (!thumb) return;

            let thumbHeight = 0;
            let frame = 0;
            let dragging = false;
            let dragStartY = 0;
            let dragStartScroll = 0;
            let previousScrollBehavior = '';
            const barTop = 60;

            function pageScrollHeight() {
                return Math.max(root.scrollHeight, document.body.scrollHeight);
            }

            function trackHeight() {
                return Math.max(0, window.innerHeight - barTop);
            }

            function isScrollLocked() {
                return window.getComputedStyle(root).overflowY === 'hidden' ||
                    window.getComputedStyle(document.body).overflowY === 'hidden';
            }

            function update() {
                frame = 0;
                const viewport = window.innerHeight;
                const scrollHeight = pageScrollHeight();

                if (isScrollLocked() || scrollHeight <= viewport + 1) {
                    bar.classList.remove('qy-visible');
                    return;
                }

                bar.classList.add('qy-visible');
                const available = trackHeight();
                thumbHeight = Math.min(available, Math.max(40, Math.round(available * viewport / scrollHeight)));
                const maxScroll = scrollHeight - viewport;
                const maxTop = available - thumbHeight;
                const progress = maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;

                thumb.style.height = thumbHeight + 'px';
                thumb.style.transform = 'translateY(' + (progress * maxTop) + 'px)';
            }

            function scheduleUpdate() {
                if (!frame) frame = window.requestAnimationFrame(update);
            }

            function finishDrag(e) {
                if (!dragging) return;
                dragging = false;
                bar.classList.remove('qy-dragging');
                root.style.scrollBehavior = previousScrollBehavior;
                try { thumb.releasePointerCapture(e.pointerId); } catch (err) { }
                scheduleUpdate();
            }

            thumb.addEventListener('pointerdown', function (e) {
                if (e.button !== 0) return;
                dragging = true;
                dragStartY = e.clientY;
                dragStartScroll = window.scrollY;
                previousScrollBehavior = root.style.scrollBehavior;
                root.style.scrollBehavior = 'auto';
                bar.classList.add('qy-dragging');
                try { thumb.setPointerCapture(e.pointerId); } catch (err) { }
                e.preventDefault();
            });

            thumb.addEventListener('pointermove', function (e) {
                if (!dragging) return;
                const viewport = window.innerHeight;
                const maxScroll = pageScrollHeight() - viewport;
                const maxTop = trackHeight() - thumbHeight;
                if (maxScroll <= 0 || maxTop <= 0) return;
                const target = dragStartScroll + (e.clientY - dragStartY) * (maxScroll / maxTop);
                window.scrollTo(0, Math.max(0, Math.min(maxScroll, target)));
            });

            thumb.addEventListener('pointerup', finishDrag);
            thumb.addEventListener('pointercancel', finishDrag);

            window.addEventListener('scroll', scheduleUpdate, { passive: true });
            window.addEventListener('resize', scheduleUpdate);
            window.addEventListener('load', scheduleUpdate);

            if (window.ResizeObserver) {
                new ResizeObserver(scheduleUpdate).observe(document.body);
            }

            if (window.MutationObserver) {
                new MutationObserver(scheduleUpdate).observe(document.body, {
                    childList: true,
                    subtree: true
                });
                new MutationObserver(scheduleUpdate).observe(root, {
                    attributes: true,
                    attributeFilter: ['class', 'style']
                });
                new MutationObserver(scheduleUpdate).observe(document.body, {
                    attributes: true,
                    attributeFilter: ['class', 'style']
                });
            }

            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(scheduleUpdate).catch(function () { });
            }

            update();
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setup);
        } else {
            setup();
        }
    })();

    // 创建加载动画的 HTML
    const loaderHTML = `
        <div id="page-loader" style="
            position: fixed;
            inset: 0;
            background: rgba(255, 255, 255, 0.3);
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            transition: opacity 0.25s ease;
        ">
            <div style="text-align: center;">
                <div style="
                    width: 60px;
                    height: 60px;
                    border: 5px solid rgba(248, 165, 194, 0.3);
                    border-top-color: #f8a5c2;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                    margin: 0 auto 20px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                "></div>
                <p style="
                    color: #fff; 
                    font-size: 18px; 
                    font-weight: bold; 
                    letter-spacing: 2px;
                    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                ">加载中...</p>
                <p id="page-loader-timeout" style="display:none;color:#fff;margin-top:10px;font-size:14px;">加载超过20秒，请尝试刷新或继续等待</p>
            </div>
        </div>
    `;

    // 导航栏 HTML
    const navbarHTML = `
        <div id="menu-box">
            <div class="menu">
                <div class="logo">
                    <h2><a href="/"><i class="fas fa-cube"></i> QYServer</a></h2>
                </div>
                
                <!-- 桌面端导航 -->
                <div class="nav-links" id="desktop-nav">
                    <a href="/download/"><i class="fas fa-download"></i>下载</a>
                    <a href="/search/"><i class="fas fa-search"></i>查询</a>
                    <a href="/updatelog/"><i class="fas fa-history"></i>更新</a>
                    <a href="/map/"><i class="fas fa-map"></i> 地图</a>
                    <a href="/faq/"><i class="fas fa-question-circle"></i> FAQ</a>
                    <a href="/about/"><i class="fas fa-info-circle"></i> 关于</a>
                </div>

                <!-- 移动端汉堡按钮 -->
                <div class="mobile-menu-btn" id="mobileMenuBtn">
                    <i class="fas fa-bars"></i>
                </div>
            </div>
            
            <!-- 移动端下拉菜单 (默认隐藏) -->
            <div class="mobile-nav" id="mobileNav">
                <a href="/download/"><i class="fas fa-download"></i>下载</a>
                <a href="/search/"><i class="fas fa-search"></i>查询</a>
                <a href="/updatelog/"><i class="fas fa-history"></i>更新</a>
                <a href="/map/"><i class="fas fa-map"></i> 地图</a>
                <a href="/faq/"><i class="fas fa-question-circle"></i> FAQ</a>
                <a href="/about/"><i class="fas fa-info-circle"></i> 关于</a>
            </div>
        </div>
    `;

    // --- 添加移动端样式 (如果 /lib/all.css 没有的话) ---
    const mobileStyle = document.createElement('style');
    mobileStyle.textContent = `
        /* 移动端导航按钮 */
        .mobile-menu-btn {
            display: none;
            color: #C6CDD4;
            font-size: 24px;
            cursor: pointer;
            padding: 8px;
            transition: color 0.3s;
            z-index: 101;
        }
        .mobile-menu-btn:hover {
            color: white;
        }

        /* 移动端下拉菜单 */
        .mobile-nav {
            display: none;
            position: absolute;
            top: 60px;
            left: 0;
            width: 100%;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            flex-direction: column;
            padding: 15px 0;
            z-index: 99;
            border-bottom-left-radius: 15px;
            border-bottom-right-radius: 15px;
        }

        .mobile-nav.show {
            display: flex !important;
        }

        .mobile-nav a {
            color: #5F5F5F;
            padding: 15px 25px;
            font-size: 18px;
            border-bottom: 1px solid rgba(0,0,0,0.05);
            transition: all 0.3s;
            text-align: center;
        }

        .mobile-nav a:last-child {
            border-bottom: none;
        }

        .mobile-nav a:hover {
            background: rgba(248, 165, 194, 0.1);
            color: #f8a5c2;
            padding-left: 35px;
        }

        /* 当播放禁止动画时禁止滚动 */
        html.qy-no-scroll, body.qy-no-scroll {
            overflow: hidden !important;
            height: 100% !important;
            touch-action: none !important;
            -webkit-overflow-scrolling: auto !important;
        }

        /* 响应式控制 */
        @media (max-width: 768px) {
            #desktop-nav {
                display: none !important;
            }
            .mobile-menu-btn {
                display: block !important;
            }
            .menu {
                justify-content: space-between !important;
            }
        }
    `;
    document.head.appendChild(mobileStyle);

    // 页脚 HTML
    const footerHTML = `
        <footer id="footer">
            <div class="footer-content">
                <div class="footer-section">
                    <h3>关于我们</h3>
                    <p>QYServer是一个专注于Minecraft基岩版的生存服务器，提供稳定、有趣的游戏环境，让玩家可以自由建造、探索和社交。</p>
                </div>
                <div class="footer-section">
                    <h3>快速链接</h3>
                    <div class="footer-links">
                        <a href="/rules/"><i class="fas fa-arrow-right"></i> 服务器规则</a>
                        <a href="/command/"><i class="fas fa-arrow-right"></i> 服务器指令</a>
                        <a href="/updatelog/"><i class="fas fa-arrow-right"></i> 更新日志</a>
                        <a href="/map/"><i class="fas fa-arrow-right"></i> 网页地图</a>
                        <a href="/faq/"><i class="fas fa-arrow-right"></i> 常见问题</a>
                        <a href="/about/"><i class="fas fa-arrow-right"></i> 关于</a>
                    </div>
                </div>
                <div class="footer-section">
                    <h3>联系我们</h3>
                    <div class="footer-links">
                        <a href="mailto:qy@qyserver.cc"><i class="fas fa-envelope"></i> qy@qyserver.cc</a>
                        <a href="https://qm.qq.com/q/Ur5Pf31XMG"><i class="fab fa-qq"></i> QQ群: 1029879634</a>
                        <a href="https://qm.qq.com/q/Nf6aVSPQ0c"><i class="fab fa-qq"></i> QQ群: QY Server 4群</a>
                        <a href="https://discord.gg/WGcKjt7BNG"><i class="fab fa-discord"></i> Discord</a>
                        <a href="https://chat.qyserver.cc/app.html#invite=Pxtdagoo" target="_blank">💬 QY Chat</a>
                    </div>
                </div>
            </div>
            <div class="footer-bottom">
                <a href="https://uptime.qyserver.top/status/qy" target="_blank">Uptime Robot</a> |
                <a href="https://github.com/weishao22/Qy-server" target="blank">&copy; 2025-2026 QYServer 版权所有</a> | 
                <a>访问量: <span id="twikoo_visitors">0</span></a>
            </div>
        </footer>
    `;

    // 音乐控制 HTML
    const musicHTML = `
        <audio id="bgMusic" loop>
            <source src="https://cloudreve.qyserver.top/f/jP6Fl/monas-still-warm-364772.mp3" type="audio/mpeg">
        </audio>
        <div id="musicControl">
            <img id="musicIcon" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZiI+PHBhdGggZD0iTTMgOXY2aDNsNS41IDVWMTRsLTQuNS00LjVIM1ptMTAtMi41VjNIMTB2MTMuNWwtMi41LTIuNS0yIDIgNSA1IDUtNVY2LjV6Ii8+PC9zdmc+" alt="音乐控制">
        </div>
    `;

    // 添加旋转动画的 keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    // 在 AllComponents.js 文件开头部分，找到加载动画注入的代码段，修改为：

    // 立即注入加载动画，避免网络慢时先显示页面再显示加载动画
    // 强制历史记录不恢复滚动（每次访问从头开始）
    try {
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }
    } catch (e) { }

    // ===== 检查是否禁用了加载动画 =====
    const isLoaderDisabled = (function () {
        try {
            if (window.__disablePageLoader === true) return true;
            return localStorage.getItem('disablePageLoader') === 'true';
        } catch (e) {
            return false;
        }
    })();

    if (!isLoaderDisabled) {
        try {
            if (!document.getElementById('page-loader')) {
                // document.write 在解析阶段能保证最早插入 loader
                document.write(loaderHTML);
                // 禁止页面滚动
                document.documentElement.classList.add('qy-no-scroll');
                // 确保回到顶部
                try { window.scrollTo(0, 0); } catch (e) { }
            }
        } catch (e) {
            // 如果 document.write 不可用（例如脚本被延迟执行），回退到在 body 可用时插入
            if (document.body && !document.getElementById('page-loader')) {
                document.body.insertAdjacentHTML('afterbegin', loaderHTML);
                document.documentElement.classList.add('qy-no-scroll');
                try { window.scrollTo(0, 0); } catch (e) { }
            } else {
                document.addEventListener('readystatechange', function () {
                    if (document.body && !document.getElementById('page-loader')) {
                        document.body.insertAdjacentHTML('afterbegin', loaderHTML);
                        document.documentElement.classList.add('qy-no-scroll');
                        try { window.scrollTo(0, 0); } catch (e) { }
                    }
                });
            }
        }

        // 超时提示：加载超过 15 秒时在加载动画下方显示简短提示
        (function initLoaderTimeoutHint() {
            const TIMEOUT_MS = 15000; // 15 秒(实际会更长)
            let timer = null;

            function showHint() {
                const el = document.getElementById('page-loader-timeout');
                if (el) el.style.display = 'block';
            }

            function clearHint() {
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }
                const el = document.getElementById('page-loader-timeout');
                if (el) el.style.display = 'none';
            }

            function startWhenReady() {
                if (document.readyState === 'complete') return;
                const loader = document.getElementById('page-loader');
                if (loader) {
                    // 启动计时器
                    timer = setTimeout(function () {
                        if (document.readyState !== 'complete') showHint();
                    }, TIMEOUT_MS);
                    return;
                }

                // 如果 loader 尚未插入，监听 body 的子节点变更直到出现
                const observer = new MutationObserver((mutations, obs) => {
                    if (document.getElementById('page-loader')) {
                        obs.disconnect();
                        startWhenReady();
                    }
                });
                if (document.body) {
                    observer.observe(document.body, { childList: true, subtree: true });
                } else {
                    document.addEventListener('readystatechange', function () {
                        if (document.body) {
                            observer.observe(document.body, { childList: true, subtree: true });
                        }
                    });
                }
            }

            startWhenReady();
            window.addEventListener('load', clearHint);
            document.addEventListener('readystatechange', function () { if (document.readyState === 'complete') clearHint(); });
            window.__qy_clearLoaderTimeout = clearHint;
        })();
    } else {
        // 加载动画被禁用，确保页面可以滚动
        document.addEventListener('DOMContentLoaded', function () {
            document.documentElement.classList.remove('qy-no-scroll');
        });
    }

    // 注入到页面（导航栏与页脚在 DOMContentLoaded 时注入；加载动画已尽早插入）
    document.addEventListener('DOMContentLoaded', function () {
        // 在 body 开头插入导航栏
        document.body.insertAdjacentHTML('afterbegin', navbarHTML);
        // 在 body 结尾插入页脚和音乐控制
        document.body.insertAdjacentHTML('beforeend', footerHTML + musicHTML);
        // 加载动画已通过 document.write 注入，DOMContentLoaded 中不再重复插入

        // --- 移动端菜单交互逻辑 ---
        const menuBtn = document.getElementById('mobileMenuBtn');
        const mobileNav = document.getElementById('mobileNav');

        if (menuBtn && mobileNav) {
            // 点击按钮切换菜单
            menuBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                mobileNav.classList.toggle('show');
            });

            // 点击页面其他区域关闭菜单
            document.addEventListener('click', function (e) {
                if (!mobileNav.contains(e.target) && !menuBtn.contains(e.target)) {
                    mobileNav.classList.remove('show');
                }
            });

            // 点击菜单链接后自动关闭
            mobileNav.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', function () {
                    mobileNav.classList.remove('show');
                });
            });
        }

        // ===== 音量与播放状态控制 =====
        const bgm = document.getElementById("bgMusic");

        // 设置默认音量并恢复上次保存的音量
        bgm.volume = localStorage.getItem("bgmVolume")
            ? parseFloat(localStorage.getItem("bgmVolume"))
            : 0.3;

        // 监听音量变化并保存
        bgm.addEventListener('volumechange', function () {
            localStorage.setItem("bgmVolume", bgm.volume);
        });

        // ===== 【新增】恢复播放状态和进度 =====
        (function () {
            const wasPlaying = localStorage.getItem('bgmPlaying') === 'true';
            const savedTime = parseFloat(localStorage.getItem('bgmCurrentTime')) || 0;

            if (savedTime > 0) {
                bgm.currentTime = savedTime;
            }

            if (wasPlaying) {
                // 用户交互后才能播放，所以监听一次点击事件
                const playOnInteraction = function () {
                    bgm.play().then(() => {
                        updateMusicIcon(true);
                    }).catch(e => {
                        console.log('自动恢复播放失败:', e);
                        updateMusicIcon(false);
                    });
                    document.removeEventListener('click', playOnInteraction);
                    document.removeEventListener('touchstart', playOnInteraction);
                };

                document.addEventListener('click', playOnInteraction, { once: true });
                document.addEventListener('touchstart', playOnInteraction, { once: true });
            } else {
                updateMusicIcon(false);
            }

            // 保存播放进度（每秒更新一次）
            setInterval(() => {
                if (!bgm.paused) {
                    localStorage.setItem('bgmCurrentTime', bgm.currentTime);
                }
            }, 1000);

            // 监听播放/暂停状态变化
            bgm.addEventListener('play', function () {
                localStorage.setItem('bgmPlaying', 'true');
                updateMusicIcon(true);
            });

            bgm.addEventListener('pause', function () {
                localStorage.setItem('bgmPlaying', 'false');
                updateMusicIcon(false);
            });

            // 页面离开前保存最终状态
            window.addEventListener('beforeunload', function () {
                localStorage.setItem('bgmPlaying', bgm.paused ? 'false' : 'true');
                localStorage.setItem('bgmCurrentTime', bgm.currentTime);
            });
        })();

        // 更新音乐图标
        function updateMusicIcon(playing) {
            const musicIcon = document.getElementById('musicIcon');
            if (!musicIcon) return;

            const PLAY_ICON = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZiI+PHBhdGggZD0iTTggNXYxNGwxMS03eiIvPjwvc3ZnPg==";
            const PAUSE_ICON = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZiI+PHBhdGggZD0iTTYgMTloNFY1SDZ2MTR6bTgtMTR2MTRoNFY1aC00eiIvPjwvc3ZnPg==";

            musicIcon.src = playing ? PAUSE_ICON : PLAY_ICON;
        }

        // ===== 右击5次跳转逻辑 =====
        (function () {
            // 获取首页链接（桌面端 Logo 的链接）
            const homeLinks = document.querySelectorAll('.logo a[href="/"]');
            if (!homeLinks.length) return;

            // 右击计数器
            let rightClickCount = 0;
            let rightClickTimer = null;
            const RIGHT_CLICK_TIMEOUT = 10000; // 7秒
            const RIGHT_CLICK_TARGET = 5;     // 5次

            function resetRightClickCounter() {
                rightClickCount = 0;
                if (rightClickTimer) {
                    clearTimeout(rightClickTimer);
                    rightClickTimer = null;
                }
            }

            homeLinks.forEach(link => {
                // 监听右键点击（contextmenu 事件）
                link.addEventListener('contextmenu', function (e) {
                    e.preventDefault(); // 阻止默认右键菜单

                    rightClickCount++;

                    // 如果计时器不存在，创建一个3秒后重置的计时器
                    if (!rightClickTimer) {
                        rightClickTimer = setTimeout(() => {
                            resetRightClickCounter();
                        }, RIGHT_CLICK_TIMEOUT);
                    }

                    // 检查是否达到5次
                    if (rightClickCount >= RIGHT_CLICK_TARGET) {
                        resetRightClickCounter();
                        // 跳转到 debug
                        window.location.href = '/tools/debug.html';
                    }
                });

                // 正常左键点击：重置计数器（用户可能只是正常操作）
                link.addEventListener('click', function () {
                    resetRightClickCounter();
                });
            });
        })();

        (function () {
            const script = document.createElement('script');
            script.src = '/lib/easter-eggs.js';
            document.head.appendChild(script);
        })();
    });
})();