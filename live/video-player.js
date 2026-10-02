// video-player.js - 增强版（含详细错误日志）
(function () {
  'use strict';

  function init() {
    const video = document.getElementById('qyVideo');
    if (!video) return;

    // 直播源：默认频道，可通过网址参数指定
    // 例：/live/?=666daf90f2b4 或 /live/?id=666daf90f2b4 或 /live/?src=https://...m3u8
    const LIVE_BASE = 'https://tv.qyserver.top/live/';

    function getStreamParam() {
      const params = new URLSearchParams(window.location.search);
      const named = params.get('id');
      if (named && named.trim()) return named.trim();
      // 支持 ?=666daf90f2b4 这种空参数名的写法
      const bare = params.get('');
      if (bare && bare.trim()) return bare.trim();
      // 兜底：取第一个非空的查询值
      for (const value of params.values()) {
        if (value && value.trim()) return value.trim();
      }
      return '';
    }

    function resolveLiveSrc() {
      const value = getStreamParam() || DEFAULT_STREAM_ID;
      // 直接传入完整地址时原样使用，否则按频道 ID 拼接
      if (/^https?:\/\//i.test(value)) return value;
      return LIVE_BASE + encodeURIComponent(value) + '.m3u8';
    }

    let liveSrc;
    try {
      liveSrc = resolveLiveSrc();
    } catch (e) {
      // 网址参数解析异常：不播放，避免错误地回退到默认频道
      console.error('❌ 直播地址解析失败，已停止播放：', e);
      return;
    }

    console.log('🎬 初始化播放器，流地址：', liveSrc);

    // 1. 初始化 Plyr（单码率直播流不提供画质菜单）
    const player = new Plyr(video, {
      controls: ['play-large', 'play', 'mute', 'volume', 'pip', 'fullscreen'],
      i18n: { pip: '画中画（小窗口）' }
    });

    // 2. 网页全屏（填满浏览器视口，不进入系统全屏）
    const wrapper = video.closest('.video-wrapper') || video.parentElement;

    const webFsBtn = document.createElement('button');
    webFsBtn.type = 'button';
    webFsBtn.className = 'plyr__control';
    webFsBtn.setAttribute('aria-label', '网页全屏');
    webFsBtn.setAttribute('aria-pressed', 'false');
    webFsBtn.innerHTML =
      '<svg class="icon--not-pressed" role="presentation" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="2" y="4" width="20" height="15" rx="2"></rect><path d="M8 21h8"></path></svg>' +
      '<svg class="icon--pressed" role="presentation" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="2" y="4" width="20" height="15" rx="2"></rect><path d="M9 19v-4h4"></path></svg>' +
      '<span class="plyr__tooltip" role="tooltip">网页全屏</span>';

    function isWebFullscreen() {
      return wrapper.classList.contains('qy-web-fullscreen');
    }

    function setWebFullscreen(on) {
      if (on === isWebFullscreen()) return;
      wrapper.classList.toggle('qy-web-fullscreen', on);
      document.body.classList.toggle('qy-web-fullscreen-active', on);
      webFsBtn.classList.toggle('plyr__control--pressed', on);
      webFsBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      webFsBtn.setAttribute('aria-label', on ? '退出网页全屏' : '网页全屏');
      const tip = webFsBtn.querySelector('.plyr__tooltip');
      if (tip) tip.textContent = on ? '退出网页全屏' : '网页全屏';
    }

    webFsBtn.addEventListener('click', function () {
      setWebFullscreen(!isWebFullscreen());
    });

    if (player.elements.controls) {
      player.elements.controls.appendChild(webFsBtn);
    }

    // 进入系统全屏时退出网页全屏，避免两种模式叠加
    player.on('enterfullscreen', function () {
      setWebFullscreen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isWebFullscreen()) {
        setWebFullscreen(false);
      }
    });

    // 3. HLS.js 支持检测
    if (window.Hls && Hls.isSupported()) {
      console.log('✅ HLS.js 已支持，开始加载流...');

      const hls = new Hls({
        liveSyncDurationCount: 3,
        autoStartLoad: true,
        debug: false,            // 生产环境建议关闭详细调试
        enableWorker: true,
        lowLatencyMode: true,     // 低延迟模式（适合直播）
      });

      window.hls = hls;
      hls.loadSource(liveSrc);
      hls.attachMedia(video);

      // 监听清单解析
      hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
        console.log('📋 清单解析成功，可用清晰度：', data.levels.map(l => `${l.height || 'auto'}p @ ${l.bitrate/1000}kbps`));

        // 尝试自动播放
        video.play().then(() => {
          console.log('▶️ 自动播放成功');
        }).catch(e => {
          console.warn('⏸️ 自动播放被浏览器阻止，请手动点击播放按钮', e);
        });
      });

      // 详细错误日志
      hls.on(Hls.Events.ERROR, function (event, data) {
        console.error('❌ HLS 错误：', data.type, data.details, data.fatal ? '[致命]' : '[可恢复]');

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('🔄 尝试重新加载流...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('🔄 尝试恢复媒体错误...');
              hls.recoverMediaError();
              break;
            default:
              console.error('💥 无法恢复的致命错误，请检查流地址或服务器状态');
              break;
          }
        }
      });

      // 监听片段加载失败（网络细节）
      hls.on(Hls.Events.FRAG_LOAD_EMERGENCY_ABORTED, () => {
        console.warn('⚠️ 片段加载紧急中止，可能存在网络问题');
      });

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('🍎 使用原生 HLS 播放（Safari）');
      video.src = liveSrc;
      video.play().catch(e => console.warn('自动播放被阻止'));
    } else {
      console.error('❌ 当前浏览器不支持 HLS 播放，请升级浏览器或使用 Safari/Chrome');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();