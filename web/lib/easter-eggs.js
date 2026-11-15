/* ========================================
    QYServer 彩蛋合集（修复版）
    修复：Toast 动画、透明度、堆叠问题
   ======================================== */

(function () {
    'use strict';
    injectStyles();

    // ========== 🥚1: Konami Code ===========
    (function () {
        const konamiCode = [// 上上下下左右左右BA
            'ArrowUp',
            'ArrowUp',
            'ArrowDown',
            'ArrowDown',
            'ArrowLeft',
            'ArrowRight',
            'ArrowLeft',
            'ArrowRight',
            'b', 'a'
        ];
        let konamiIndex = 0;

        document.addEventListener('keydown', function (e) {
            if (e.key === konamiCode[konamiIndex]) {
                konamiIndex++;
                if (konamiIndex === konamiCode.length) {
                    activateRainbowMode();
                    konamiIndex = 0;
                }
            } else {
                konamiIndex = 0;
            }
        });

        function activateRainbowMode() {
            // 创建彩虹遮罩
            const overlay = document.createElement('div');
            overlay.id = 'rainbow-overlay';
            overlay.style.cssText = `
                    position: fixed;
                    inset: 0;
                    z-index: 99999;
                    pointer-events: none;
                    background: linear-gradient(
                        90deg,
                        rgba(255,0,0,0.15),
                        rgba(255,127,0,0.15),
                        rgba(255,255,0,0.15),
                        rgba(0,255,0,0.15),
                        rgba(0,0,255,0.15),
                        rgba(75,0,130,0.15),
                        rgba(143,0,255,0.15)
                    );
                    animation: rainbowMove 3s linear infinite;
                `;
            document.body.appendChild(overlay);

            // 添加动画样式
            const style = document.createElement('style');
            style.textContent = `
                    @keyframes rainbowMove {
                        0% { filter: hue-rotate(0deg); }
                        100% { filter: hue-rotate(360deg); }
                    }
                `;
            document.head.appendChild(style);
            showToast("↑↑↓↓←→←→ba！")

            // 5秒后自动移除
            /*setTimeout(() => {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.remove();
                    style.remove();
                }, 500);
            }, 5000);*/
        }
    })();

    (function () {
        const konamiCode = [ // 大写的BA
            'ArrowUp', 'ArrowUp',
            'ArrowDown', 'ArrowDown',
            'ArrowLeft', 'ArrowRight',
            'ArrowLeft', 'ArrowRight',
            'B', 'A'
        ];
        let konamiIndex = 0;

        document.addEventListener('keydown', function (e) {
            if (e.key === konamiCode[konamiIndex]) {
                konamiIndex++;
                if (konamiIndex === konamiCode.length) {
                    activateKonami();
                    konamiIndex = 0;
                }
            } else {
                konamiIndex = 0;
            }
        });

        function activateKonami() {
            // 创建覆盖层
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                inset: 0;
                z-index: 99999;
                pointer-events: none;
                background: linear-gradient(45deg, 
                    rgba(255,0,0,0.05), rgba(255,165,0,0.05), 
                    rgba(255,255,0,0.05), rgba(0,255,0,0.05), 
                    rgba(0,0,255,0.05), rgba(75,0,130,0.05), 
                    rgba(238,130,238,0.05));
                background-size: 400% 400%;
                animation: konamiRainbow 1s ease infinite;
            `;
            document.body.appendChild(overlay);

            // 添加旋转动画
            const styleEl = document.createElement('style');
            styleEl.textContent = `
                @keyframes konamiRainbow {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                @keyframes konamiShake {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(-2deg); }
                    75% { transform: rotate(2deg); }
                }
                body.konami-active {
                    animation: konamiShake 0.3s ease infinite !important;
                }
            `;
            document.head.appendChild(styleEl);
            document.body.classList.add('konami-active');

            // 显示提示
            showToast('🎮 Konami Code 已激活！服务器娘很开心~');

            // 5秒后移除
            setTimeout(function () {
                overlay.remove();
                document.body.classList.remove('konami-active');
                styleEl.remove();
                showToast('💫 效果已消失');
            }, 5000);
        }
    })();

    // ========== 🥚3: 隐藏成就 ==========
    (function () {
        let input = '';
        const word = 'qyserver';
        document.addEventListener('keydown', function (e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
            if (e.key.length === 1) {
                input += e.key.toLowerCase();
                if (input.length > word.length) input = input.slice(-word.length);
                if (input === word) {
                    input = '';
                    showAchievement('🔍 发现彩蛋', '你在页面空白处输入了服务器的名字！');
                    activateEmojiRain();
                }
            }
        });
        
        function activateEmojiRain() {
            const emojis = ['🎮', '⛏️', '💎', '🌟', '🐱', '🎉', '✨', '💖', '🌈', '🍀', '🏰', '⚔️', '🛡️', '🔥', '❄️', '🎵', '🏆', '🤖', '👑'];
            const container = document.createElement('div');
            container.style.cssText = 'position:fixed;inset:0;z-index:99;pointer-events:none;overflow:hidden;';
            document.body.appendChild(container);
            for (let i = 0; i < 500; i++) {
                setTimeout(function () {
                    const emoji = document.createElement('span');
                    emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
                    emoji.style.cssText = `position:absolute;top:-50px;left:${Math.random() * 100}%;font-size:${20 + Math.random() * 40}px;animation:emojiFall ${2 + Math.random() * 3}s linear forwards;opacity:0.9;`;
                    container.appendChild(emoji);
                    emoji.addEventListener('animationend', function () { emoji.remove(); });
                }, i * 80);
            }
            setTimeout(function () { container.remove(); }, 50000);
        }
    })();

    // ========== 🥚4: 关于页隐藏时间线 ==========
    (function () {
        if (!location.pathname.includes('/about/')) return;
        let clicks = 0, ons = false;
        setTimeout(function () {
            const last = document.querySelector('.timeline-item:last-child');
            if (!last) return;
            last.style.cursor = 'pointer';
            last.addEventListener('click', function () {
                if (ons) return;
                clicks++;
                if (clicks >= 3) {
                    ons = true;
                    clicks = 0;
                    const timeline = document.querySelector('.timeline');
                    if (!timeline) return;
                    const item = document.createElement('div');
                    item.className = 'timeline-item';
                    item.innerHTML = `<div class="timeline-content" style="background:linear-gradient(135deg,rgba(248,165,194,.1),rgba(165,109,226,.1));border:2px dashed #f8a5c2;"><div class="timeline-date">????年??月</div><p>嘘~ 你发现了隐藏的时间线！</p><p style="font-size:.8rem;color:#999;">「每一个玩家都是QYServer故事的一部分」</p></div>`;
                    timeline.appendChild(item);
                    showToast('🔮 隐藏时间线已解锁！');
                    item.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }, 1000);
    })();

    // ========== 🥚5: 标题双击粒子 ==========
    // ========== 🥚5: 标题双击烟花特效 ==========
    (function () {
        if (location.pathname !== '/' && location.pathname !== '') return;

        setTimeout(function () {
            const h2 = document.querySelector('.join-item h2');
            if (!h2) return;

            h2.style.cursor = 'default';
            h2.title = '双击放烟花~';

            h2.addEventListener('dblclick', function (e) {
                // 标题抖动
                h2.style.animation = 'titleShake 0.5s ease';
                setTimeout(function () { h2.style.animation = ''; }, 500);

                // 在标题文字区域内随机选择发射位置
                const rect = h2.getBoundingClientRect();

                // 随机偏移范围：在标题宽度的 10%~90% 之间，高度的 10%~80% 之间
                const randomOffsetX = (0.1 + Math.random() * 0.8) * rect.width;
                const randomOffsetY = (0.1 + Math.random() * 0.7) * rect.height;

                const cx = rect.left + randomOffsetX;
                const cy = rect.top + randomOffsetY;

                launchFirework(cx, cy);
            });
        }, 1000);

        function launchFirework(cx, cy) {
            // 烟花颜色主题
            const colorSets = [
                ['#f8a5c2', '#ff6b9d', '#ff85a2', '#ffd1dc', '#ffe0e6'],  // 粉色系
                ['#a56de2', '#b388ff', '#7c3aed', '#d4b8ff', '#ede0ff'],  // 紫色系
                ['#ffd700', '#ffab00', '#ffc400', '#ffe57f', '#fff8e1'],  // 金色系
                ['#00e5ff', '#00b0ff', '#40c4ff', '#80d8ff', '#e0f7fa'],  // 蓝色系
                ['#69f0ae', '#00e676', '#b9f6ca', '#00c853', '#e8f5e9'],  // 绿色系
            ];

            // 随机选一组颜色
            const colors = colorSets[Math.floor(Math.random() * colorSets.length)];

            // 第一阶段：升空粒子（从标题位置向上发射）
            const launchParticles = [];
            const launchCount = 15;

            for (let i = 0; i < launchCount; i++) {
                const particle = document.createElement('div');
                const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.4; // 基本向上，略有偏移
                const speed = 3 + Math.random() * 5;
                const size = 3 + Math.random() * 3;
                const delay = Math.random() * 0.3;

                particle.style.cssText = `
                position: fixed;
                left: ${cx}px;
                top: ${cy}px;
                width: ${size}px;
                height: ${size * 3}px;
                border-radius: ${size / 2}px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                z-index: 99999;
                pointer-events: none;
                animation: fireworkRise ${0.6 + Math.random() * 0.4}s ease-out ${delay}s forwards;
                box-shadow: 0 0 ${size * 2}px ${colors[0]};
            `;
                document.body.appendChild(particle);
                launchParticles.push(particle);
            }

            // 第二阶段：爆炸粒子（在升空结束后触发）
            setTimeout(function () {
                // 清理升空粒子
                launchParticles.forEach(function (p) { p.remove(); });

                // 爆炸位置（在标题上方 100-200px 处）
                const burstY = cy - (100 + Math.random() * 100);
                const burstX = cx + (Math.random() - 0.5) * 60;

                // 创建爆炸粒子
                const particleCount = 80; // 粒子数量
                const maxDistance = 80 + Math.random() * 120; // 最大爆炸半径

                for (let i = 0; i < particleCount; i++) {
                    const particle = document.createElement('div');
                    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.3;
                    const distance = maxDistance * (0.4 + Math.random() * 0.6); // 不同距离
                    const size = 2 + Math.random() * 6;
                    const color = colors[Math.floor(Math.random() * colors.length)];
                    const duration = 0.8 + Math.random() * 1.2;
                    const delay = Math.random() * 0.15;

                    // 圆形粒子或星形粒子
                    const shape = Math.random() > 0.3 ? '50%' : '0%';
                    const rotation = Math.random() * 360;

                    particle.style.cssText = `
                    position: fixed;
                    left: ${burstX}px;
                    top: ${burstY}px;
                    width: ${size}px;
                    height: ${size}px;
                    border-radius: ${shape};
                    background: ${color};
                    z-index: 99999;
                    pointer-events: none;
                    animation: fireworkBurst ${duration}s ease-out ${delay}s forwards;
                    --dx: ${Math.cos(angle) * distance}px;
                    --dy: ${Math.sin(angle) * distance}px;
                    --rotation: ${rotation}deg;
                    --scale: ${0.8 + Math.random() * 0.4};
                    box-shadow: 0 0 ${size * 2}px ${color}, 0 0 ${size * 4}px ${color};
                `;
                    document.body.appendChild(particle);

                    // 动画结束后移除
                    particle.addEventListener('animationend', function () {
                        particle.remove();
                    });
                }

                // 闪烁光点（拖尾效果）
                for (let i = 0; i < 30; i++) {
                    const spark = document.createElement('div');
                    const angle = Math.random() * Math.PI * 2;
                    const distance = maxDistance * (0.6 + Math.random() * 0.4);

                    spark.style.cssText = `
                    position: fixed;
                    left: ${burstX + Math.cos(angle) * distance * 0.3}px;
                    top: ${burstY + Math.sin(angle) * distance * 0.3}px;
                    width: ${1 + Math.random() * 2}px;
                    height: ${1 + Math.random() * 2}px;
                    border-radius: 50%;
                    background: #fff;
                    z-index: 99998;
                    pointer-events: none;
                    animation: sparkle ${0.3 + Math.random() * 0.5}s ease-out ${Math.random() * 0.3}s forwards;
                    box-shadow: 0 0 4px #fff, 0 0 8px ${colors[0]};
                `;
                    document.body.appendChild(spark);

                    spark.addEventListener('animationend', function () {
                        spark.remove();
                    });
                }

                // 中央闪光
                const flash = document.createElement('div');
                flash.style.cssText = `
                position: fixed;
                left: ${burstX - 40}px;
                top: ${burstY - 40}px;
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%);
                z-index: 99997;
                pointer-events: none;
                animation: fireworkFlash 0.5s ease-out forwards;
            `;
                document.body.appendChild(flash);

                flash.addEventListener('animationend', function () {
                    flash.remove();
                });

            }, 700); // 升空后 700ms 爆炸
        }
    })();

    // ========== 🥚6: Ctrl+Shift+Q ==========
    (function () {
        document.addEventListener('keydown', function (e) {
            if (e.ctrlKey && e.shiftKey && e.key === 'Q') {
                e.preventDefault();
                const dialogs = [
                    { text: '哼！又偷偷按快捷键！', emoji: '(￣^￣)' },
                    { text: '服务器娘今天也很努力呢~', emoji: '✨' },
                    { text: '不要在控制台里乱翻啦！', emoji: '(╯°□°）╯' },
                    { text: '有什么问题可以去FAQ看看哦', emoji: '📖' },
                    { text: '你找到我啦~ 这是第几个彩蛋呢？', emoji: '🥚' },
                    { text: '悄悄告诉你：输入 qyserver 有惊喜', emoji: '🤫' }
                ];
                const d = dialogs[Math.floor(Math.random() * dialogs.length)];
                const b = document.createElement('div');
                b.style.cssText = 'position:fixed;bottom:100px;right:30px;z-index:99999;background:rgba(0, 0, 0, 0.23);color:#fff;padding:20px 25px;border-radius:20px;max-width:300px;animation:achievementSlide .5s ease forwards;box-shadow:0 8px 30px rgba(0,0,0,.4);border:2px solid #f8a5c2;';
                b.innerHTML = `<div style="font-size:2rem;margin-bottom:10px;">${d.emoji}</div><div style="font-size:1rem;line-height:1.5;">${d.text}</div><div style="font-size:.8rem;color:#f8a5c2;margin-top:10px;">—— 服务器娘</div>`;
                document.body.appendChild(b);
                setTimeout(function () {
                    b.style.animation = 'achievementFadeOut .4s ease forwards';
                    b.addEventListener('animationend', function h() { if (b.parentNode) b.remove(); b.removeEventListener('animationend', h); });
                }, 4000);
            }
        });
    })();

    // ========== 🥚7: FAQ 搜索 42 ==========
    (function () {
        if (!location.pathname.includes('/faq/')) return;
        setTimeout(function () {
            const inp = document.getElementById('search');
            if (!inp) return;
            inp.addEventListener('input', function () {
                if (this.value.trim() === '42') {
                    setTimeout(function () {
                        const list = document.getElementById('problem-list');
                        if (!list) return;
                        const item = document.createElement('li');
                        item.style.cssText = 'background:linear-gradient(135deg,rgba(248,165,194,.1),rgba(165,109,226,.1))!important;border-left:4px solid #ffd700!important;animation:achievementSlide .5s ease;';
                        item.innerHTML = '<a href="javascript:void(0)" style="font-size:1.5rem!important;cursor:default;">🐬 42 —— 生命、宇宙以及一切的答案</a><small>——道格拉斯·亚当斯《银河系漫游指南》</small><span><mark>彩蛋</mark></span>';
                        if (list.firstChild) list.insertBefore(item, list.firstChild); else list.appendChild(item);
                        setTimeout(function () { item.remove(); }, 8000);
                    }, 100);
                }
            });
        }, 1000);
    })();

    // ========== 🥚8: 闲置标题 ==========
    (function () {
        const orig = document.title;
        const idle = '💤 等你回来~ —— QYServer';
        let timer = null;
        function reset() {
            if (timer) clearTimeout(timer);
            document.title = orig;
            if (document._idleInterval) { clearInterval(document._idleInterval); document._idleInterval = null; }
            timer = setTimeout(function () {
                let offset = 0;
                document._idleInterval = setInterval(function () {
                    offset = (offset + 1) % idle.length;
                    document.title = idle.substring(offset) + ' ' + idle.substring(0, offset);
                }, 200);
            }, 120000);
        }
        ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(function (ev) {
            document.addEventListener(ev, reset);
        });
        reset();
    })();





    // ========== 注入动画样式（仅一次） ==========
    function injectStyles() {
        if (document.getElementById('easterEgg-animations')) return;
        const styleEl = document.createElement('style');
        styleEl.id = 'easterEgg-animations';
        styleEl.textContent = `
        /* Toast 动画 */
        @keyframes toastSlideIn {
            from { transform: translateX(-50%) translateY(100px); opacity: 0; }
            to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        @keyframes toastFadeOut {
            from { opacity: 1; transform: translateX(-50%) translateY(0); }
            to { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        }
        /* 成就滑入 */
        @keyframes achievementSlide {
            from { transform: translateX(120%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes achievementFadeOut {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(-20px); }
        }
        /* Konami */
        @keyframes konamiRainbow {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        @keyframes konamiShake {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(-2deg); }
            75% { transform: rotate(2deg); }
        }
        body.konami-active { animation: konamiShake 0.3s ease infinite !important; }
        /* 表情雨 */
        @keyframes emojiFall {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        /* 标题抖动 */
        @keyframes titleShake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px) rotate(-2deg); }
            75% { transform: translateX(10px) rotate(2deg); }
        }
        /* 粒子爆发 */
        @keyframes particleBurst {
            0% { transform: translate(0,0) scale(1); opacity: 1; }
            100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
        /* ===== 烟花动画 ===== */
        @keyframes fireworkRise {
            0% { transform: translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(0, -250px) scale(0.2); opacity: 0; }
        }
        @keyframes fireworkBurst {
            0% { transform: translate(0, 0) rotate(var(--rotation)) scale(var(--scale)); opacity: 1; }
            60% { opacity: 0.8; }
            100% { transform: translate(var(--dx), calc(var(--dy) + 40px)) rotate(calc(var(--rotation) + 180deg)) scale(0); opacity: 0; }
        }
        @keyframes sparkle {
            0% { transform: scale(0); opacity: 0; }
            50% { transform: scale(2.5); opacity: 1; }
            100% { transform: scale(0); opacity: 0; }
        }
        @keyframes fireworkFlash {
            0% { transform: scale(0.2); opacity: 0; }
            40% { transform: scale(1.5); opacity: 1; }
            100% { transform: scale(3); opacity: 0; }
        }
    `;
        document.head.appendChild(styleEl);
    }


    // ========== Toast 函数（修复版） ==========
    function showToast(message) {
        // 移除旧的
        const old = document.querySelector('.easter-egg-toast');
        if (old) old.remove();

        const toast = document.createElement('div');
        toast.className = 'easter-egg-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 40px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.50);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            color: #fff;
            padding: 14px 28px;
            border-radius: 50px;
            font-size: 15px;
            font-weight: 500;
            letter-spacing: 0.5px;
            z-index: 100000;
            pointer-events: none;
            white-space: nowrap;
            box-shadow: 0 8px 30px rgba(0,0,0,0.4), 0 0 0 1px rgba(248,165,194,0.3);
            animation: toastSlideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(function () {
            toast.style.animation = 'toastFadeOut 0.4s ease forwards';
            toast.addEventListener('animationend', function handler() {
                if (toast.parentNode) toast.remove();
                toast.removeEventListener('animationend', handler);
            });
        }, 2500);
    }

    // ========== 显示成就 ==========
    function showAchievement(title, desc) {
        const old = document.querySelector('.easter-egg-achievement');
        if (old) old.remove();

        const achievement = document.createElement('div');
        achievement.className = 'easter-egg-achievement';
        achievement.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 99999;
            background: rgba(0,0,0,0.50);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            color: #fff;
            padding: 20px;
            border-radius: 12px;
            border-left: 4px solid #f8a5c2;
            animation: achievementSlide 0.5s ease forwards;
            max-width: 300px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.4);
        `;
        achievement.innerHTML = `
            <div style="font-size:1.2rem;font-weight:bold;margin-bottom:8px;">
                <i class="fas fa-trophy" style="color:#ffd700;"></i> ${title}
            </div>
            <div style="font-size:0.9rem;color:#ddd;line-height:1.5;">${desc}</div>
        `;
        document.body.appendChild(achievement);

        setTimeout(function () {
            achievement.style.animation = 'achievementFadeOut 0.4s ease forwards';
            achievement.addEventListener('animationend', function handler() {
                if (achievement.parentNode) achievement.remove();
                achievement.removeEventListener('animationend', handler);
            });
        }, 4000);
    }

    // 暴露到全局
    window.easterEggToast = showToast;
})();