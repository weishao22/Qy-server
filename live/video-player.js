// video-player.js - 增强版（含详细错误日志）
(function () {
  'use strict';

  function init() {
    const video = document.getElementById('qyVideo');
    if (!video) return;

    // 直播源：默认频道，可通过网址参数指定
    // 例：/live/?=666daf90f2b4 或 /live/?id=666daf90f2b4 或 /live/?src=https://...m3u8
    const DEFAULT_STREAM_ID = '666daf90f2b4';

    // 直播节点：支持播放器内手动切换，当前节点网络异常时自动切换到备用节点
    // 也可通过网址参数指定：/live/?id=xxx&node=2
    const LIVE_NODES = [
      { name: '主节点', base: 'https://tv.qyserver.top/live/' },
      { name: '备用1', base: 'https://live-aliyun.qyserver.top/live/' }
    ];

    function getStreamParam() {
      const params = new URLSearchParams(window.location.search);
      const named = params.get('id');
      if (named && named.trim()) return named.trim();
      // 支持 ?=666daf90f2b4 这种空参数名的写法
      const bare = params.get('');
      if (bare && bare.trim()) return bare.trim();
      // 兜底：取第一个非空的查询值（跳过节点参数）
      for (const [key, value] of params.entries()) {
        if (key === 'node') continue;
        if (value && value.trim()) return value.trim();
      }
      return '';
    }

    function getNodeParam() {
      let raw = '';
      try {
        raw = (new URLSearchParams(window.location.search).get('node') || '').trim().toLowerCase();
      } catch (e) { /* 参数解析异常时使用默认节点 */ }
      if (!raw) return 0;
      if (raw === 'aliyun' || raw === 'live-aliyun') return 1;
      if (raw === 'tv' || raw === 'main') return 0;
      const index = parseInt(raw, 10);
      if (index >= 1 && index <= LIVE_NODES.length) return index - 1;
      return 0;
    }

    const rawStream = getStreamParam();
    const customSrc = /^https?:\/\//i.test(rawStream) ? rawStream : '';

    // 从完整地址中提取频道 ID，切换节点时继续播放同一个频道
    function getChannelId() {
      const value = rawStream || DEFAULT_STREAM_ID;
      if (/^https?:\/\//i.test(value)) {
        try {
          const url = new URL(value);
          const matched = url.pathname.match(/([^/]+?)(?:\.m3u8)?$/i);
          if (matched && matched[1]) return decodeURIComponent(matched[1]);
        } catch (e) { /* 解析失败时回退到默认频道 */ }
        return DEFAULT_STREAM_ID;
      }
      return value;
    }

    const channelId = getChannelId();
    let nodeIndex = getNodeParam();
    let useCustomSrc = !!customSrc;

    function buildNodeSrc(index) {
      return LIVE_NODES[index].base + encodeURIComponent(channelId) + '.m3u8';
    }

    // 直接传入完整地址时原样使用，否则按频道 ID 拼接
    let liveSrc = useCustomSrc ? customSrc : buildNodeSrc(nodeIndex);

    console.log('🎬 初始化播放器，流地址：', liveSrc);

    // 给清单地址加时间戳，强制拉到最新清单，避免命中浏览器/CDN 的过期缓存
    function withCacheBust(url) {
      const sep = url.indexOf('?') === -1 ? '?' : '&';
      return url + sep + '_live=' + Date.now();
    }

    // 1. 初始化 Plyr（单码率直播流不提供画质菜单，保留进度条；音量/静音改为弹层控制）
    const player = new Plyr(video, {
      controls: ['play-large', 'play', 'current-time', 'pip', 'fullscreen'],
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

    // 3. 弹出式子容器（节点菜单 / 音量面板）
    const popoverHost = player.elements.container || wrapper;
    let openPopover = null;
    let openTrigger = null;

    function positionPopover(pop, trigger) {
      const hostRect = popoverHost.getBoundingClientRect();
      const triggerRect = trigger.getBoundingClientRect();
      const margin = 8;

      // 先显示再测量，避免隐藏状态宽度为 0
      pop.style.visibility = 'hidden';
      pop.hidden = false;
      const popRect = pop.getBoundingClientRect();

      let left = triggerRect.left - hostRect.left + (triggerRect.width - popRect.width) / 2;
      left = Math.max(margin, Math.min(left, hostRect.width - popRect.width - margin));
      pop.style.left = left + 'px';
      pop.style.bottom = (hostRect.bottom - triggerRect.top + margin) + 'px';
      pop.style.visibility = '';
    }

    function closePopover() {
      if (!openPopover) return;
      openPopover.hidden = true;
      if (openTrigger) openTrigger.setAttribute('aria-expanded', 'false');
      popoverHost.classList.remove('plyr--menu-open');
      openPopover = null;
      openTrigger = null;
    }

    function togglePopover(pop, trigger) {
      if (openPopover === pop) {
        closePopover();
        return;
      }
      closePopover();
      openPopover = pop;
      openTrigger = trigger;
      trigger.setAttribute('aria-expanded', 'true');
      popoverHost.classList.add('plyr--menu-open');
      positionPopover(pop, trigger);
    }

    function createPopover(className) {
      const pop = document.createElement('div');
      pop.className = 'qy-popover ' + className;
      pop.hidden = true;
      pop.setAttribute('role', 'dialog');
      popoverHost.appendChild(pop);
      return pop;
    }

    document.addEventListener('click', function (e) {
      if (!openPopover) return;
      if (openPopover.contains(e.target)) return;
      if (openTrigger && openTrigger.contains(e.target)) return;
      closePopover();
    });

    window.addEventListener('resize', function () {
      if (openPopover && openTrigger) positionPopover(openPopover, openTrigger);
    });

    // 4. 节点切换按钮：点击弹出节点列表
    const nodeBtn = document.createElement('button');
    nodeBtn.type = 'button';
    nodeBtn.className = 'plyr__control plyr__controls__item qy-node-btn';
    nodeBtn.setAttribute('aria-haspopup', 'true');
    nodeBtn.setAttribute('aria-expanded', 'false');
    nodeBtn.innerHTML =
      '<svg role="presentation" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18"></path>' +
      '<path d="M12 3c2.5 2.4 4 5.6 4 9s-1.5 6.6-4 9c-2.5-2.4-4-5.6-4-9s1.5-6.6 4-9z"></path></svg>' +
      '<span class="qy-node-label">主节点</span>' +
      '<span class="plyr__tooltip" role="tooltip">选择节点</span>';

    const nodePop = createPopover('qy-node-menu');
    const nodePopTitle = document.createElement('div');
    nodePopTitle.className = 'qy-popover__title';
    nodePopTitle.textContent = '选择直播节点';
    const nodeList = document.createElement('div');
    nodeList.className = 'qy-node-list';
    nodePop.appendChild(nodePopTitle);
    nodePop.appendChild(nodeList);

    let switchNodeHandler = null;

    function renderNodeMenu() {
      nodeList.innerHTML = '';
      LIVE_NODES.forEach(function (node, index) {
        const active = !useCustomSrc && index === nodeIndex;
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'qy-node-item';
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', active ? 'true' : 'false');

        const name = document.createElement('span');
        name.className = 'qy-node-item__name';
        name.textContent = node.name;

        item.appendChild(name);
        item.addEventListener('click', function () {
          closePopover();
          if (active) return;
          if (switchNodeHandler) switchNodeHandler(index);
        });
        nodeList.appendChild(item);
      });
    }

    function updateNodeButton() {
      const label = nodeBtn.querySelector('.qy-node-label');
      if (label) label.textContent = useCustomSrc ? '自定义' : LIVE_NODES[nodeIndex].name;

      const tipText = useCustomSrc
        ? '当前：自定义地址，点击选择节点'
        : '当前：' + LIVE_NODES[nodeIndex].name + '，点击选择节点';
      const tip = nodeBtn.querySelector('.plyr__tooltip');
      if (tip) tip.textContent = tipText;
      nodeBtn.setAttribute('aria-label', tipText);
      nodeBtn.hidden = LIVE_NODES.length < 2;
      renderNodeMenu();
    }

    nodeBtn.addEventListener('click', function () {
      if (!switchNodeHandler) return;
      togglePopover(nodePop, nodeBtn);
    });

    updateNodeButton();

    // 5. 音量按钮：点击弹出音量面板
    const volumeBtn = document.createElement('button');
    volumeBtn.type = 'button';
    volumeBtn.className = 'plyr__control plyr__controls__item qy-volume-btn';
    volumeBtn.setAttribute('aria-haspopup', 'true');
    volumeBtn.setAttribute('aria-expanded', 'false');
    volumeBtn.setAttribute('aria-label', '音量');
    volumeBtn.innerHTML =
      '<svg class="qy-vol-icon qy-vol-icon--on" role="presentation" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M11 5 6 9H3v6h3l5 4V5z"></path><path d="M15.5 8.5a5 5 0 0 1 0 7"></path><path d="M18.5 5.5a9 9 0 0 1 0 13"></path></svg>' +
      '<svg class="qy-vol-icon qy-vol-icon--muted" role="presentation" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M11 5 6 9H3v6h3l5 4V5z"></path><path d="m16 9 5 6"></path><path d="m21 9-5 6"></path></svg>' +
      '<span class="plyr__tooltip" role="tooltip">音量</span>';

    const volumePop = createPopover('qy-volume-panel');
    const volumeHeader = document.createElement('div');
    volumeHeader.className = 'qy-popover__head';
    const volumeTitle = document.createElement('div');
    volumeTitle.className = 'qy-popover__title';
    volumeTitle.textContent = '音量';
    const muteToggle = document.createElement('button');
    muteToggle.type = 'button';
    muteToggle.className = 'qy-mute-toggle';
    muteToggle.textContent = '静音';
    volumeHeader.appendChild(volumeTitle);
    volumeHeader.appendChild(muteToggle);
    const volumeRow = document.createElement('div');
    volumeRow.className = 'qy-volume-row';
    const volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.className = 'qy-volume-slider';
    volumeSlider.min = '0';
    volumeSlider.max = '100';
    volumeSlider.step = '1';
    volumeSlider.setAttribute('aria-label', '音量');
    const volumeValue = document.createElement('span');
    volumeValue.className = 'qy-volume-value';
    volumeRow.appendChild(volumeSlider);
    volumeRow.appendChild(volumeValue);
    volumePop.appendChild(volumeHeader);
    volumePop.appendChild(volumeRow);

    function syncVolumeUI() {
      const level = video.muted ? 0 : Math.round(video.volume * 100);
      volumeSlider.value = String(level);
      volumeSlider.style.setProperty('--value', level + '%');
      volumeValue.textContent = level + '%';
      volumeBtn.classList.toggle('is-muted', level === 0);
      muteToggle.textContent = level === 0 ? '取消静音' : '静音';
      muteToggle.setAttribute('aria-pressed', level === 0 ? 'true' : 'false');
      const tipText = level === 0 ? '音量（已静音）' : '音量 ' + level + '%';
      volumeBtn.setAttribute('aria-label', tipText);
      const tip = volumeBtn.querySelector('.plyr__tooltip');
      if (tip) tip.textContent = tipText;
    }

    volumeSlider.addEventListener('input', function () {
      const level = Number(volumeSlider.value);
      video.muted = level === 0;
      video.volume = level / 100;
      syncVolumeUI();
    });

    muteToggle.addEventListener('click', function () {
      if (video.muted || video.volume === 0) {
        if (video.volume === 0) video.volume = 0.5;
        video.muted = false;
      } else {
        video.muted = true;
      }
      syncVolumeUI();
    });

    video.addEventListener('volumechange', syncVolumeUI);

    volumeBtn.addEventListener('click', function () {
      togglePopover(volumePop, volumeBtn);
    });

    syncVolumeUI();

    if (player.elements.controls) {
      const pipControl = player.elements.controls.querySelector('[data-plyr="pip"]');
      if (pipControl) {
        pipControl.insertAdjacentElement('beforebegin', volumeBtn);
        volumeBtn.insertAdjacentElement('afterend', nodeBtn);
      } else {
        player.elements.controls.appendChild(volumeBtn);
        player.elements.controls.appendChild(nodeBtn);
      }
      player.elements.controls.appendChild(webFsBtn);
    }

    // 进入系统全屏时退出网页全屏，避免两种模式叠加
    player.on('enterfullscreen', function () {
      setWebFullscreen(false);
      closePopover();
    });

    // 控件栏自动隐藏时同步收起弹层
    player.on('controlshidden', closePopover);

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (openPopover) {
        closePopover();
        return;
      }
      if (isWebFullscreen()) setWebFullscreen(false);
    });

    // 4. HLS.js 支持检测
    if (window.Hls && Hls.isSupported()) {
      console.log('✅ HLS.js 已支持，开始加载流...');

      // 直播优化：根据清单分片长度自动选择延迟目标，开启服务端低延迟后无需再改代码
      const BASE_HLS_OPTIONS = {
        autoStartLoad: false,             // 不自动从默认位置加载，改为解析完清单后手动从直播边缘加载
        startPosition: -1,                // -1：直播时从最新位置开始
        maxLiveSyncPlaybackRate: 1.5,     // 小幅落后时加速播放以追赶直播
        backBufferLength: 300,            // 保留最近 5 分钟已播放缓冲
        lowLatencyMode: true,
        enableWorker: true,
        debug: false,
      };

      function buildHlsOptions(manifestText) {
        const targetMatch = manifestText.match(/#EXT-X-TARGETDURATION:\s*([\d.]+)/i);
        const headerDuration = targetMatch ? Number(targetMatch[1]) : 0;
        const segmentDurations = [];
        const extinfRegex = /#EXTINF:\s*([\d.]+)/gi;
        let extinfMatch;
        while ((extinfMatch = extinfRegex.exec(manifestText))) {
          const duration = Number(extinfMatch[1]);
          if (Number.isFinite(duration)) segmentDurations.push(duration);
        }
        const segmentDuration = segmentDurations.length
          ? Math.max.apply(null, segmentDurations)
          : headerDuration;
        const isLowLatency = /#EXT-X-PART|CAN-BLOCK-RELOAD=YES/i.test(manifestText);

        if (isLowLatency) {
          return Object.assign({}, BASE_HLS_OPTIONS, {
            liveSyncDuration: 4,
            liveMaxLatencyDuration: 12,
            maxBufferLength: 20,
            maxMaxBufferLength: 40
          });
        }

        if (segmentDuration > 0 && segmentDuration <= 5) {
          return Object.assign({}, BASE_HLS_OPTIONS, {
            liveSyncDuration: Math.max(6, segmentDuration * 2),
            liveMaxLatencyDuration: 30,
            maxBufferLength: 30,
            maxMaxBufferLength: 60
          });
        }

        if (segmentDuration > 0 && segmentDuration <= 10) {
          return Object.assign({}, BASE_HLS_OPTIONS, {
            liveSyncDuration: Math.max(12, segmentDuration * 1.5),
            liveMaxLatencyDuration: 45,
            maxBufferLength: 45,
            maxMaxBufferLength: 90
          });
        }

        return Object.assign({}, BASE_HLS_OPTIONS, {
          liveSyncDuration: segmentDuration > 0 ? Math.max(20, segmentDuration + 3) : 20,
          liveMaxLatencyDuration: 60,
          maxBufferLength: 60,
          maxMaxBufferLength: 120
        });
      }

      async function getHlsOptions(url) {
        let timer = null;
        try {
          const controller = new AbortController();
          timer = window.setTimeout(function () { controller.abort(); }, 3000);
          const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
          if (!res.ok) return buildHlsOptions('');
          return buildHlsOptions(await res.text());
        } catch (err) {
          return buildHlsOptions('');
        } finally {
          if (timer) window.clearTimeout(timer);
        }
      }

      const MAX_FRESH_RETRIES = 3;
      let hls = null;
      let loadToken = 0;
      let retries = 0;
      let snapped = false;
      let autoFailoverCount = 0;

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
          // 当前节点多次失败：依次自动尝试其余节点
          if (autoFailoverCount < LIVE_NODES.length - 1) {
            autoFailoverCount++;
            const fallbackIndex = useCustomSrc ? 0 : (nodeIndex + 1) % LIVE_NODES.length;
            const currentName = useCustomSrc ? '自定义地址' : LIVE_NODES[nodeIndex].name;
            console.warn('⚠️ ' + currentName + ' 无法播放，自动切换到' + LIVE_NODES[fallbackIndex].name + '...');
            switchNode(fallbackIndex, true);
            return;
          }
          console.error('💥 多次重试仍无法播放，请检查流地址或服务器状态');
          return;
        }
        retries++;
        console.log(`🔄 直播数据可能已过期，重新拉取最新数据（第 ${retries} 次）...`);
        try { hls.destroy(); } catch (e) { }
        loadHls(withCacheBust(liveSrc));
      }

      function switchNode(index, isAuto) {
        if (index === nodeIndex && !useCustomSrc) return;
        nodeIndex = index;
        useCustomSrc = false;
        liveSrc = buildNodeSrc(nodeIndex);
        retries = 0;
        if (!isAuto) autoFailoverCount = 0;
        updateNodeButton();
        console.log('🔀 切换到' + LIVE_NODES[nodeIndex].name + '：', liveSrc);
        try { hls.destroy(); } catch (e) { }
        loadHls(withCacheBust(liveSrc));
      }

      switchNodeHandler = switchNode;

      async function loadHls(url) {
        const token = ++loadToken;
        snapped = false;
        const options = await getHlsOptions(url);
        if (token !== loadToken) return;
        hls = new Hls(options);
        window.hls = hls;
        hls.attachMedia(video);
        hls.loadSource(url);

        hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
          console.log('📋 清单解析成功，可用清晰度：', data.levels.map(l => `${l.height || 'auto'}p @ ${l.bitrate/1000}kbps`));
          retries = 0;
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
      let nativeFailoverCount = 0;

      function playNative() {
        // 带时间戳强制拉取最新清单，原生播放器会自动从直播边缘开始
        video.src = withCacheBust(liveSrc);
        video.play().catch(e => console.warn('自动播放被阻止'));
      }

      switchNodeHandler = function (index, isAuto) {
        if (index === nodeIndex && !useCustomSrc) return;
        nodeIndex = index;
        useCustomSrc = false;
        liveSrc = buildNodeSrc(nodeIndex);
        if (!isAuto) nativeFailoverCount = 0;
        updateNodeButton();
        console.log('🔀 切换到' + LIVE_NODES[nodeIndex].name + '：', liveSrc);
        playNative();
      };

      // 原生播放失败时依次自动尝试其余节点
      video.addEventListener('error', function () {
        if (nativeFailoverCount >= LIVE_NODES.length - 1) return;
        nativeFailoverCount++;
        const fallbackIndex = useCustomSrc ? 0 : (nodeIndex + 1) % LIVE_NODES.length;
        const currentName = useCustomSrc ? '自定义地址' : LIVE_NODES[nodeIndex].name;
        console.warn('⚠️ ' + currentName + ' 无法播放，自动切换到' + LIVE_NODES[fallbackIndex].name + '...');
        switchNodeHandler(fallbackIndex, true);
      });

      playNative();
    } else {
      console.error('❌ 当前浏览器不支持 HLS 播放，请升级浏览器或使用 Safari/Chrome');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
