// video-player.js - 增强版（含详细错误日志）
(function () {
  'use strict';

  function init() {
    const video = document.getElementById('qyVideo');
    if (!video) return;

    const liveSrc = "https://tv.qyserver.top/live/666daf90f2b4.m3u8";

    console.log('🎬 初始化播放器，流地址：', liveSrc);

    // 1. 初始化 Plyr（单码率直播流不提供画质菜单）
    const player = new Plyr(video, {
      controls: ['play', 'mute', 'volume', 'fullscreen']
    });

    // 2. HLS.js 支持检测
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