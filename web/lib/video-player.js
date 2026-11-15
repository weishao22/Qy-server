(function () {
  'use strict';

  function getQueryParam(key) {
    try { return new URLSearchParams(window.location.search).get(key); } catch (e) { return null; }
  }

  function init() {
    const video = document.getElementById('qyVideo');
    if (!video) return;

    // 初始化 Plyr（提供更友好的控件 UI）
    var player = new Plyr(video, {
      controls: ['play', 'progress', 'current-time', 'mute', 'volume', 'settings', 'fullscreen'],
      settings: ['quality', 'speed']
    });

    var hls = null;

    function isHls(url) { return /\.m3u8(\?|$)/i.test(url); }

    // 装载视频源（支持 HLS 与普通视频），并尽量保持播放进度与播放状态
    function loadSrc(url) {
      if (!url) return;
      url = decodeURIComponent(url);
      var wasPlaying = !video.paused && !video.ended;
      var currentTime = video.currentTime || 0;

      if (hls) { try { hls.destroy(); } catch (e) {} hls = null; }

      if (isHls(url)) {
        if (window.Hls && Hls.isSupported()) {
          hls = new Hls();
          hls.loadSource(url);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, function() {
            try { if (currentTime && video.duration && currentTime < video.duration) video.currentTime = currentTime; } catch (e) {}
            if (wasPlaying) player.play().catch(function(){});
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = url;
          video.addEventListener('loadedmetadata', function onm(){ video.removeEventListener('loadedmetadata', onm); try { if (currentTime && video.duration && currentTime < video.duration) video.currentTime = currentTime; } catch(e){} if (wasPlaying) player.play().catch(function(){}); });
        } else {
          video.src = url;
          if (wasPlaying) player.play().catch(function(){});
        }
      } else {
        video.src = url;
        video.load();
        video.addEventListener('loadedmetadata', function onm(){ video.removeEventListener('loadedmetadata', onm); try { if (currentTime && video.duration && currentTime < video.duration) video.currentTime = currentTime; } catch(e){} if (wasPlaying) player.play().catch(function(){}); });
      }
    }

    // 初始加载：优先使用 video 内的 <source>，否则尝试从查询参数读取 src 或 vid
    var s = video.querySelector('source');
    if (s && s.src) loadSrc(s.src);
    else {
      var srcParam = getQueryParam('src') || getQueryParam('vid');
      if (srcParam) loadSrc(srcParam);
    }

    // 键盘快捷键（与原逻辑一致）：f 全屏，空格播放/暂停，左右快进/后退
    window.addEventListener('keydown', function(e){
      if (!video) return;
      if (e.key === 'f') {
        if (player && player.fullscreen) {
          if (player.fullscreen.active) player.fullscreen.exit(); else player.fullscreen.enter();
        } else {
          if (!document.fullscreenElement) video.requestFullscreen && video.requestFullscreen(); else document.exitFullscreen && document.exitFullscreen();
        }
      }
      if (e.key === ' ') { if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return; e.preventDefault(); if (video.paused) player.play(); else player.pause(); }
      if (e.key === 'ArrowRight') video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
      if (e.key === 'ArrowLeft') video.currentTime = Math.max(0, video.currentTime - 5);
    });
  }

  document.addEventListener('DOMContentLoaded', init);

})();
