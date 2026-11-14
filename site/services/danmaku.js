'use strict';

const crypto = require('crypto');
const { WebSocketServer, WebSocket } = require('ws');
const settings = require('../settings');

const WS_PATHS = new Set(['/api/danmaku/ws', '/ws', '/danmaku/ws']);
const MAX_RECENT = 80;

const rooms = new Map();
const recent = [];
const clients = new Set();

function getRoom(channel) {
  let room = rooms.get(channel);
  if (!room) {
    room = new Set();
    rooms.set(channel, room);
  }
  return room;
}

function send(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}

function broadcast(channel, payload) {
  const room = rooms.get(channel);
  if (!room) return;
  const data = JSON.stringify(payload);
  room.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  });
}

function normalizeChannel(value) {
  const channel = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 64);
  return channel || 'default';
}

function normalizeText(value, maxLength) {
  let text = String(value == null ? '' : value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  const chars = Array.from(text);
  if (chars.length > maxLength) text = chars.slice(0, maxLength).join('');
  return text;
}

function normalizeForMatch(value) {
  return String(value == null ? '' : value)
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '');
}

function findBannedWord(text, words) {
  if (!Array.isArray(words) || !words.length) return '';
  const normalized = normalizeForMatch(text);
  for (const word of words) {
    const needle = normalizeForMatch(word);
    if (needle && normalized.includes(needle)) return word;
  }
  return '';
}

function pushRecent(message) {
  recent.push(message);
  if (recent.length > MAX_RECENT) recent.splice(0, recent.length - MAX_RECENT);
}

function mount(httpServer, app) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });

  function reject(socket, status, message) {
    socket.write(`HTTP/1.1 ${status} ${message}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
    socket.destroy();
  }

  httpServer.on('upgrade', (request, socket, head) => {
    let pathname = '';
    try {
      pathname = new URL(request.url, 'http://localhost').pathname;
    } catch {
      reject(socket, 400, 'Bad Request');
      return;
    }
    if (!WS_PATHS.has(pathname)) {
      reject(socket, 404, 'Not Found');
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws, request) => {
    const config = settings.danmaku();
    let channel = 'default';
    try {
      const url = new URL(request.url, 'http://localhost');
      channel = normalizeChannel(url.searchParams.get('channel'));
    } catch {
      channel = 'default';
    }

    const room = getRoom(channel);
    room.add(ws);
    clients.add(ws);

    ws.channel = channel;
    ws.isAlive = true;
    ws.lastMessageAt = 0;
    ws.rateWindowStart = Date.now();
    ws.rateCount = 0;

    send(ws, { type: 'welcome', channel, online: room.size, maxLength: config.maxTextLength });
    if (recent.length) {
      send(ws, { type: 'history', messages: recent.filter((item) => item.channel === channel).slice(-30) });
    }
    broadcast(channel, { type: 'online', count: room.size });

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (raw) => {
      let payload;
      try {
        payload = JSON.parse(raw.toString());
      } catch {
        send(ws, { type: 'error', message: '弹幕格式不正确' });
        return;
      }
      if (!payload || typeof payload !== 'object') return;

      if (payload.type === 'ping') {
        send(ws, { type: 'pong', at: Date.now() });
        return;
      }
      if (payload.type !== 'danmaku') return;

      const live = settings.danmaku();
      const text = normalizeText(payload.text, Math.max(1, Number(live.maxTextLength) || 80));
      if (!text) {
        send(ws, { type: 'error', message: '弹幕内容不能为空' });
        return;
      }

      const now = Date.now();
      if (now - ws.lastMessageAt < (Number(live.cooldownMs) || 1200)) {
        send(ws, { type: 'error', message: '发送太快了，请稍后再试' });
        return;
      }
      if (now - ws.rateWindowStart >= (Number(live.rateWindowMs) || 10000)) {
        ws.rateWindowStart = now;
        ws.rateCount = 0;
      }
      if (ws.rateCount >= (Number(live.rateWindowLimit) || 8)) {
        send(ws, { type: 'error', message: '弹幕发送过于频繁，请稍后再试' });
        return;
      }
      ws.lastMessageAt = now;
      ws.rateCount += 1;

      if (findBannedWord(text, live.bannedWords)) {
        send(ws, { type: 'error', message: '弹幕包含违禁词，请修改后重试' });
        return;
      }

      const message = {
        type: 'danmaku',
        id: crypto.randomUUID(),
        channel,
        text,
        at: now,
        from: 'viewer'
      };
      pushRecent(message);
      broadcast(channel, message);
    });

    ws.on('close', () => {
      clients.delete(ws);
      const current = rooms.get(channel);
      if (!current) return;
      current.delete(ws);
      if (current.size === 0) {
        rooms.delete(channel);
        return;
      }
      broadcast(channel, { type: 'online', count: current.size });
    });

    ws.on('error', () => {});
  });

  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  if (typeof heartbeat.unref === 'function') heartbeat.unref();

  app.get(['/health', '/api/danmaku/health'], (req, res) => {
    res.json({ ok: true, rooms: rooms.size, clients: wss.clients.size, uptime: Math.round(process.uptime()) });
  });

  return {
    state() {
      const online = {};
      rooms.forEach((room, channel) => {
        online[channel] = room.size;
      });
      return {
        rooms: rooms.size,
        clients: wss.clients.size,
        online,
        recent: recent.slice(-30).reverse()
      };
    },
    sendSystem(channelValue, textValue) {
      const config = settings.danmaku();
      const channel = normalizeChannel(channelValue);
      const text = normalizeText(textValue, Math.max(1, Number(config.maxTextLength) || 80));
      if (!text) return { ok: false, error: '内容不能为空' };
      const message = {
        type: 'danmaku',
        id: crypto.randomUUID(),
        channel,
        text,
        at: Date.now(),
        from: 'system'
      };
      pushRecent(message);
      broadcast(channel, message);
      return { ok: true, message };
    }
  };
}

module.exports = { mount };
