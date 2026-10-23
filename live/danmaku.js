(function () {
  'use strict';

  const DEFAULT_STREAM_ID = '666daf90f2b4';
  const ENABLED_STORAGE_KEY = 'qy-live-danmaku-enabled';
  const WS_OVERRIDE_KEY = 'qy-live-danmaku-ws';
  const SEND_COOLDOWN_MS = 1200;
  const KEEPALIVE_INTERVAL_MS = 25000;
  const MAX_BULLETS = 80;
  const MAX_PENDING_BULLETS = 20;
  const LANE_HEIGHT = 32;
  const LANE_GAP = 16;
  const LANE_TOP = 8;

  function channelKey(value) {
    if (/^https?:\/\//i.test(value)) {
      try {
        const url = new URL(value);
        const matched = url.pathname.match(/([^/]+?)(?:\.m3u8)?$/i);
        value = matched ? matched[1] : url.pathname;
      } catch (err) {}
    }
    const key = String(value).replace(/[^a-zA-Z0-9_-]/g, '_');
    return key || 'default';
  }

  function getLiveId() {
    let value = '';
    try {
      const params = new URLSearchParams(window.location.search);
      value = params.get('') || params.get('id') || '';
      if (!value || !value.trim()) {
        for (const [key, item] of params.entries()) {
          if (key === 'node') continue;
          if (item && item.trim()) {
            value = item;
            break;
          }
        }
      }
    } catch (err) {}
    value = value && value.trim() ? value.trim() : DEFAULT_STREAM_ID;
    return channelKey(value);
  }

  function getWsUrl() {
    let override = '';
    if (typeof window.LIVE_DANMAKU_WS === 'string') {
      override = window.LIVE_DANMAKU_WS.trim();
    }
    if (!override) {
      try {
        override = (window.localStorage.getItem(WS_OVERRIDE_KEY) || '').trim();
      } catch (err) {}
    }
    if (override) return override;

    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      const address = host === '::1' ? '[::1]' : host;
      return 'ws://' + address + ':3002/ws';
    }
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    return protocol + window.location.host + '/danmaku/ws';
  }

  function init() {
    const video = document.getElementById('qyVideo');
    const form = document.getElementById('danmakuForm');
    const input = document.getElementById('danmakuInput');
    const sendBtn = document.getElementById('danmakuSend');
    const toggle = document.getElementById('danmakuToggle');
    const statusEl = document.getElementById('danmakuStatus');
    const wrapper = document.querySelector('.video-wrapper');

    if (!video || !form || !input || !sendBtn || !toggle || !statusEl || !wrapper) {
      return;
    }

    const layer = document.createElement('div');
    layer.className = 'danmaku-layer';
    layer.setAttribute('aria-hidden', 'true');
    const overlayHost = wrapper.querySelector('.plyr__video-wrapper') || wrapper;
    overlayHost.appendChild(layer);

    const channel = getLiveId();
    let enabled = true;
    try {
      enabled = window.localStorage.getItem(ENABLED_STORAGE_KEY) !== '0';
    } catch (err) {}
    toggle.checked = enabled;
    layer.hidden = !enabled;

    let socket = null;
    let reconnectTimer = null;
    let reconnectAttempt = 0;
    let onlineCount = 0;
    let lastSentAt = 0;
    let statusResetTimer = null;
    let laneReadyAt = [];
    const pendingBullets = [];

    function setStatus(state, text) {
      statusEl.dataset.state = state;
      statusEl.textContent = text;
      sendBtn.disabled = state !== 'online';
    }

    function updateStatus() {
      if (socket && socket.readyState === WebSocket.CONNECTING) {
        setStatus('connecting', '连接弹幕中...');
        return;
      }
      if (socket && socket.readyState === WebSocket.OPEN) {
        const online = onlineCount > 0 ? ' · ' + onlineCount + ' 人在线' : '';
        setStatus('online', '弹幕已连接' + online);
        return;
      }
      setStatus('offline', '弹幕未连接，正在重连...');
    }

    function flashError(message) {
      window.clearTimeout(statusResetTimer);
      statusEl.dataset.state = 'error';
      statusEl.textContent = message;
      sendBtn.disabled = !(socket && socket.readyState === WebSocket.OPEN);
      statusResetTimer = window.setTimeout(updateStatus, 2600);
    }

    function applyEnabled() {
      enabled = toggle.checked;
      layer.hidden = !enabled;
      try {
        window.localStorage.setItem(ENABLED_STORAGE_KEY, enabled ? '1' : '0');
      } catch (err) {}
    }

    toggle.addEventListener('change', applyEnabled);

    function addBullet(text) {
      if (!enabled || !text) return;

      const layerWidth = layer.clientWidth;
      const layerHeight = layer.clientHeight;
      if (!layerWidth || !layerHeight) {
        if (pendingBullets.length >= MAX_PENDING_BULLETS) pendingBullets.shift();
        pendingBullets.push(text);
        return;
      }

      while (layer.childElementCount >= MAX_BULLETS) {
        const oldest = layer.firstElementChild;
        if (!oldest) break;
        if (oldest.qyAnimation) oldest.qyAnimation.cancel();
        oldest.remove();
      }

      const item = document.createElement('span');
      item.className = 'danmaku-item';
      item.textContent = text;
      item.style.top = '0px';
      item.style.visibility = 'hidden';
      layer.appendChild(item);

      const itemWidth = item.offsetWidth || 0;
      const laneCount = Math.max(1, Math.floor((layerHeight - LANE_GAP) / LANE_HEIGHT));
      if (laneReadyAt.length !== laneCount) {
        const next = new Array(laneCount).fill(0);
        for (let i = 0; i < Math.min(laneCount, laneReadyAt.length); i += 1) {
          next[i] = laneReadyAt[i];
        }
        laneReadyAt = next;
      }

      const now = Date.now();
      let lane = 0;
      for (let i = 1; i < laneCount; i += 1) {
        if (laneReadyAt[i] < laneReadyAt[lane]) lane = i;
      }

      const speed = Math.max(90, Math.min(180, layerWidth / 7));
      const wait = Math.max(0, laneReadyAt[lane] - now);
      const delay = Math.min(wait, 600);
      laneReadyAt[lane] = now + delay + ((itemWidth + 24) / speed) * 1000;

      item.style.top = (LANE_TOP + lane * LANE_HEIGHT) + 'px';
      item.style.visibility = '';

      if (typeof item.animate !== 'function') {
        item.remove();
        return;
      }

      const distance = layerWidth + itemWidth;
      const animation = item.animate(
        [
          { transform: 'translate3d(' + layerWidth + 'px, 0, 0)' },
          { transform: 'translate3d(' + (-itemWidth) + 'px, 0, 0)' }
        ],
        {
          duration: Math.max(4000, (distance / speed) * 1000),
          delay: delay,
          easing: 'linear',
          fill: 'both'
        }
      );

      item.qyAnimation = animation;
      animation.onfinish = function () { item.remove(); };
      animation.oncancel = function () { item.remove(); };
    }

    function flushPending() {
      if (!pendingBullets.length) return;
      if (!layer.clientWidth || !layer.clientHeight) return;
      const items = pendingBullets.splice(0, pendingBullets.length);
      items.forEach(function (text) { addBullet(text); });
    }

    if (typeof window.ResizeObserver === 'function') {
      const layerObserver = new window.ResizeObserver(flushPending);
      layerObserver.observe(layer);
    } else {
      window.addEventListener('resize', flushPending);
    }

    function scheduleReconnect() {
      if (reconnectTimer) return;
      const attempt = Math.min(reconnectAttempt, 5);
      const delay = Math.min(30000, 1000 * Math.pow(2, attempt)) + Math.floor(Math.random() * 400);
      reconnectAttempt += 1;
      setStatus('offline', Math.ceil(delay / 1000) + ' 秒后重连弹幕...');
      reconnectTimer = window.setTimeout(function () {
        reconnectTimer = null;
        connect();
      }, delay);
    }

    function connect() {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;

      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return;
      }

      const baseUrl = getWsUrl();
      const separator = baseUrl.indexOf('?') === -1 ? '?' : '&';
      let ws;
      try {
        ws = new WebSocket(baseUrl + separator + 'channel=' + encodeURIComponent(channel));
      } catch (err) {
        scheduleReconnect();
        return;
      }

      socket = ws;
      setStatus('connecting', '连接弹幕中...');

      ws.addEventListener('open', function () {
        if (socket !== ws) return;
        reconnectAttempt = 0;
        updateStatus();
      });

      ws.addEventListener('message', function (event) {
        let payload;
        try {
          payload = JSON.parse(event.data);
        } catch (err) {
          return;
        }
        if (!payload || typeof payload !== 'object') return;

        if (payload.type === 'danmaku' && typeof payload.text === 'string') {
          addBullet(payload.text);
        } else if (payload.type === 'welcome') {
          if (typeof payload.online === 'number') onlineCount = payload.online;
          updateStatus();
        } else if (payload.type === 'online') {
          if (typeof payload.count === 'number') onlineCount = payload.count;
          updateStatus();
        } else if (payload.type === 'error' && typeof payload.message === 'string') {
          flashError(payload.message);
        }
      });

      ws.addEventListener('close', function () {
        if (socket !== ws) return;
        socket = null;
        onlineCount = 0;
        if (statusResetTimer) {
          window.clearTimeout(statusResetTimer);
          statusResetTimer = null;
        }
        updateStatus();
        scheduleReconnect();
      });

      ws.addEventListener('error', function () {
        try {
          ws.close();
        } catch (err) {}
      });
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const text = input.value.replace(/\s+/g, ' ').trim();
      if (!text) return;

      if (!socket || socket.readyState !== WebSocket.OPEN) {
        flashError('弹幕服务未连接，请稍后再试');
        return;
      }

      const now = Date.now();
      if (now - lastSentAt < SEND_COOLDOWN_MS) {
        flashError('发送太快了，请稍后再试');
        return;
      }

      try {
        socket.send(JSON.stringify({ type: 'danmaku', text: text }));
        lastSentAt = now;
        input.value = '';
      } catch (err) {
        flashError('弹幕发送失败，请稍后再试');
      }
      input.focus();
    });

    window.setInterval(function () {
      if (socket && socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(JSON.stringify({ type: 'ping' }));
        } catch (err) {}
      }
    }, KEEPALIVE_INTERVAL_MS);

    updateStatus();
    connect();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
