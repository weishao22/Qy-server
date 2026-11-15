/* ========================================
    QYServer 全站公共 JS
    包含：导航栏滚动、音乐控制、弹窗、平滑滚动、动态加载 Twikoo 评论等
   ======================================== */

(function () {
    'use strict';
    // 页面加载完成后隐藏动画，并恢复页面滚动
    window.addEventListener('load', function () {
        const loader = document.getElementById('page-loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.remove();
                document.documentElement.classList.remove('qy-no-scroll');
            }, 400);
        } else {
            // 确保在没有 loader 的情况下也恢复滚动
            document.documentElement.classList.remove('qy-no-scroll');
        }
    });

    // ---------- 导航栏滚动效果 ----------
    function initNavbarScroll() {
        const menuBox = document.getElementById('menu-box');
        const banner = document.getElementById('banner');
        if (!menuBox || !banner) return;

        window.addEventListener('scroll', function () {
            const bannerHeight = banner.offsetHeight;
            if (window.scrollY > bannerHeight * 0.2) {
                menuBox.classList.add('scrolled');
            } else {
                menuBox.classList.remove('scrolled');
            }
        });
    }

    // ---------- 音乐播放控制 ----------
    function initMusicControl() {
        const bgMusic = document.getElementById('bgMusic');
        const musicControl = document.getElementById('musicControl');
        const musicIcon = document.getElementById('musicIcon');
        if (!bgMusic || !musicControl || !musicIcon) return;

        const PLAY_ICON = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZiI+PHBhdGggZD0iTTggNXYxNGwxMS03eiIvPjwvc3ZnPg==";
        const PAUSE_ICON = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZiI+PHBhdGggZD0iTTYgMTloNFY1SDZ2MTR6bTgtMTR2MTRoNFY1aC00eiIvPjwvc3ZnPg==";

        musicControl.addEventListener('click', function () {
            if (bgMusic.paused) {
                bgMusic.play().then(() => {
                    musicIcon.src = PAUSE_ICON;
                }).catch(e => console.log("播放失败:", e));
            } else {
                bgMusic.pause();
                musicIcon.src = PLAY_ICON;
            }
        });

        // 同步图标状态
        bgMusic.addEventListener('play', () => { musicIcon.src = PAUSE_ICON; });
        bgMusic.addEventListener('pause', () => { musicIcon.src = PLAY_ICON; });
    }

    // ---------- 平滑滚动 ----------
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    // ---------- 重置弹窗按钮 ----------
    function initResetPopup() {
        const resetBtn = document.getElementById('resetPopup');
        if (!resetBtn) return;

        resetBtn.addEventListener('click', function (e) {
            e.preventDefault();
            localStorage.removeItem('dontShowPopu');
            alert('弹窗设置已重置，下次访问时将再次显示提示');
        });
    }

    // ---------- 动态加载 Twikoo 并初始化 ----------
    function loadTwikoo() {
        // 【核心修复】：如果是图片详情页，或者页面声明了自定义初始化，则全局脚本退出，不执行初始化
        if (window.location.pathname.includes('detail.html') || window.__twikoo_custom_init) {
            return;
        }

        if (typeof twikoo !== 'undefined') {
            initTwikoo();
            return;
        }
        var script = document.createElement('script');
        script.src = 'https://s4.zstatic.net/npm/twikoo@1.7.11/dist/twikoo.min.js';
        script.onload = function () {
            initTwikoo();
        };
        script.onerror = function () {
            console.error('Twikoo 脚本加载失败，请检查网络或链接');
        };
        document.head.appendChild(script);
    }

    function initTwikoo() {
        if (typeof twikoo !== 'undefined') {
            twikoo.init({
                el: '#tcomment',
                envId: 'https://plapi.qyserver.cc',
                path: window.location.pathname,
                pageview: true
            });
        } else {
            console.warn('Twikoo 未能正确加载，无法初始化评论');
        }
    }


    // ---------- 首页轮播图自动切换 ----------
    function initHeroCarousel() {
        const carousel = document.getElementById('heroCarousel');
        if (!carousel) return;
        const track = carousel.querySelector('.carousel-track');
        const items = track ? Array.from(track.querySelectorAll('.carousel-item')) : [];
        const dotsContainer = carousel.querySelector('.carousel-dots');
        const prevBtn = carousel.querySelector('.carousel-prev');
        const nextBtn = carousel.querySelector('.carousel-next');
        if (items.length <= 1) return;
        let index = 0;
        let timer = null;

        function renderDots() {
            if (!dotsContainer) return;
            dotsContainer.textContent = '';
            items.forEach((_, i) => {
                const dot = document.createElement('span');
                dot.className = 'carousel-dot' + (i === index ? ' active' : '');
                dot.addEventListener('click', () => { goTo(i); resetTimer(); });
                dotsContainer.appendChild(dot);
            });
        }

        function goTo(i) {
            index = ((i % items.length) + items.length) % items.length;
            track.style.transform = `translateX(-${index * 100}%)`;
            renderDots();
        }

        function next() { goTo(index + 1); }
        function prev() { goTo(index - 1); }

        function resetTimer() {
            if (timer) clearInterval(timer);
            timer = setInterval(next, 4000);
        }

        prevBtn.addEventListener('click', () => { prev(); resetTimer(); });
        nextBtn.addEventListener('click', () => { next(); resetTimer(); });
        carousel.addEventListener('mouseenter', () => { if (timer) clearInterval(timer); });
        carousel.addEventListener('mouseleave', resetTimer);

        renderDots();
        resetTimer();
    }
    document.addEventListener('DOMContentLoaded', function () {
        try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) { }
        try { window.scrollTo(0, 0); } catch (e) { }
        initNavbarScroll();
        initMusicControl();
        initSmoothScroll();
        initResetPopup();
        loadTwikoo();
        initHeroCarousel();
    });

})();