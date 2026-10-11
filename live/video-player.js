// video-player.js - 增强版（含详细错误日志）
(function () {
  'use strict';

  function init() {
    const video = document.getElementById('qyVideo');
    if (!video) return;

    // 直播源：默认频道，可通过网址参数指定
    // 例：/live/?=666daf90f2b4 或 /live/?id=666daf90f2b4 或 /live/?src=https://...m3u8
    const DEFAULT_STREAM_ID = '666daf90f2b4';
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

    // 1. 初始化 Plyr（单码率直播流不提供画质菜单，保留进度条）
    const player = new Plyr(video, {
      controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'pip', 'fullscreen'],
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

      // 直播优化：进入后直接对齐“直播边缘”，只拉取最新分片，避免从头加载已过期的旧数据
      const hlsOptions = {
        autoStartLoad: false,             // 不自动从默认位置加载，改为解析完清单后手动从直播边缘加载
        startPosition: -1,                // -1：直播时从最新位置开始
        liveSyncDurationCount: 1,         // 只保留距直播边缘 1 个分片，尽快追上最新画面
        liveMaxLatencyDurationCount: 3,   // 落后超过 3 个分片时自动快进
        maxLiveSyncPlaybackRate: 1.5,     // 落后时加速播放以追赶直播
        backBufferLength: 0,              // 不保留回看缓冲
        lowLatencyMode: true,
        enableWorker: true,
        debug: false,
      };

      const MAX_FRESH_RETRIES = 3;
      let hls = null;
      let retries = 0;
      let snapped = false;

      // 给清单地址加时间戳，强制拉到最新清单，避免命中浏览器/CDN 的过期缓存
      function withCacheBust(url) {
        const sep = url.indexOf('?') === -1 ? '?' : '&';
        return url + sep + '_live=' + Date.now();
      }

      // 首个清单就绪后，把播放位置对齐到最新的直播位置
      function snapToLive() {
        if (snapped) return;
        const pos = hls.liveSyncPosition;
        if (typeof pos === 'number' && isFinite(pos) && pos > 0) {
          snapped = true;
          if (Math.abs(video.currentTime - pos) > 1) {
            try { video.currentTime = pos; } catch (e) { }
          }
        }
      }

      function startPlayback() {
        video.play().then(() => {
          console.log('▶️ 自动播放成功');
        }).catch(e => {
          console.warn('⏸️ 自动播放被浏览器阻止，请手动点击播放按钮', e);
        });
      }

      // 网络错误时，很可能是拉到了已过期的旧分片：直接把清单换成最新的重新加载
      function reloadFresh() {
        if (retries >= MAX_FRESH_RETRIES) {
          console.error('💥 多次重试仍无法播放，请检查流地址或服务器状态');
          return;
        }
        retries++;
        console.log(`🔄 直播数据可能已过期，重新拉取最新数据（第 ${retries} 次）...`);
        try { hls.destroy(); } catch (e) { }
        loadHls(withCacheBust(liveSrc));
      }

      function loadHls(url) {
        snapped = false;
        hls = new Hls(hlsOptions);
        window.hls = hls;
        hls.attachMedia(video);
        hls.loadSource(url);

        hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
          console.log('📋 清单解析成功，可用清晰度：', data.levels.map(l => `${l.height || 'auto'}p @ ${l.bitrate/1000}kbps`));
          // 从直播边缘（最新位置）开始加载，而不是从头加载
          hls.startLoad(-1);
          startPlayback();
        });

        // 分片清单载入后，对齐到最新位置
        hls.on(Hls.Events.LEVEL_LOADED, snapToLive);

        // 详细错误日志
        hls.on(Hls.Events.ERROR, function (event, data) {
          console.error('❌ HLS 错误：', data.type, data.details, data.fatal ? '[致命]' : '[可恢复]');
          if (!data.fatal) return;

          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            console.log('🔄 尝试恢复媒体错误...');
            hls.recoverMediaError();
            return;
          }

          // 网络错误：重新拉取最新数据
          reloadFresh();
        });

        // 监听片段加载失败（网络细节）
        hls.on(Hls.Events.FRAG_LOAD_EMERGENCY_ABORTED, () => {
          console.warn('⚠️ 片段加载紧急中止，可能存在网络问题');
        });
      }

      loadHls(withCacheBust(liveSrc));

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('🍎 使用原生 HLS 播放（Safari）');
      // 带时间戳强制拉取最新清单，原生播放器会自动从直播边缘开始
      const nativeSep = liveSrc.indexOf('?') === -1 ? '?' : '&';
      video.src = liveSrc + nativeSep + '_live=' + Date.now();
      video.play().catch(e => console.warn('自动播放被阻止'));
    } else {
      console.error('❌ 当前浏览器不支持 HLS 播放，请升级浏览器或使用 Safari/Chrome');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();