'use strict';

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const express = require('express');
const cors = require('cors');
const { WebSocketServer, WebSocket } = require('ws');

const apiHost = process.env.HOST || '0.0.0.0';
const apiPort = Number(process.env.PORT) || 3002;
const healthPath = '/health';
const healthAliasPath = '/api/danmaku/health';
const wsPath = '/ws';
const wsProxyPath = '/danmaku/ws';
const wsApiPath = '/api/danmaku/ws';
const MAX_TEXT_LENGTH = Number(process.env.MAX_TEXT_LENGTH) || 80;
const MESSAGE_COOLDOWN_MS = Number(process.env.MESSAGE_COOLDOWN_MS) || 1200;
const RATE_WINDOW_MS = Number(process.env.RATE_WINDOW_MS) || 10000;
const RATE_WINDOW_LIMIT = Number(process.env.RATE_WINDOW_LIMIT) || 8;
const HEARTBEAT_INTERVAL_MS = Number(process.env.HEARTBEAT_INTERVAL_MS) || 30000;
const MAX_PAYLOAD_BYTES = Number(process.env.MAX_PAYLOAD_BYTES) || 4096;
const BANNED_WORDS_FILE = path.resolve(
  __dirname,
  process.env.BANNED_WORDS_FILE || 'banned-words.json'
);

const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

app.use(cors({
  origin: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : true,
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

const rooms = new Map();

function getRoom(channel) {
  let room = rooms.get(channel);
  if (!room) {
    room = new Set();
    rooms.set(channel, room);
  }
  return room;
}

function send(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcast(channel, payload) {
  const room = rooms.get(channel);
  if (!room) return;
  const data = JSON.stringify(payload);
  room.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

function normalizeChannel(value) {
  const channel = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 64);
  return channel || 'default';
}

function normalizeText(value) {
  let text = String(value == null ? '' : value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  const chars = Array.from(text);
  if (chars.length > MAX_TEXT_LENGTH) {
    text = chars.slice(0, MAX_TEXT_LENGTH).join('');
  }
  return text;
}

function normalizeForMatch(value) {
  return String(value == null ? '' : value)
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '');
}

function addBannedWord(target, word) {
  if (typeof word !== 'string') return;
  const normalized = normalizeForMatch(word);
  if (normalized) target.add(normalized);
}

function loadBannedWords() {
  const words = new Set();

  try {
    const raw = fs.readFileSync(BANNED_WORDS_FILE, 'utf8').replace(/^\uFEFF/, '');
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : parsed && parsed.words;
    if (Array.isArray(list)) {
      list.forEach((word) => addBannedWord(words, word));
    }
  } catch (err) {
    console.warn('读取违禁词文件失败：' + err.message);
  }

  String(process.env.BANNED_WORDS || '')
    .split(/[,，]/)
    .forEach((word) => addBannedWord(words, word));

  const result = Array.from(words).sort((a, b) => b.length - a.length);
  console.log('已加载违禁词数量：' + result.length);
  return result;
}

const BANNED_WORDS = loadBannedWords();

function findBannedWord(text) {
  if (!BANNED_WORDS.length) return '';
  const normalized = normalizeForMatch(text);
  for (const word of BANNED_WORDS) {
    if (normalized.indexOf(word) !== -1) return word;
  }
  return '';
}

function checkRate(ws) {
  const now = Date.now();
  if (now - ws.lastMessageAt < MESSAGE_COOLDOWN_MS) {
    return '发送太快了，请稍后再试';
  }
  if (now - ws.rateWindowStart >= RATE_WINDOW_MS) {
    ws.rateWindowStart = now;
    ws.rateCount = 0;
  }
  if (ws.rateCount >= RATE_WINDOW_LIMIT) {
    return '弹幕发送过于频繁，请稍后再试';
  }
  ws.lastMessageAt = now;
  ws.rateCount += 1;
  return '';
}

function isOriginAllowed(origin) {
  if (!ALLOWED_ORIGINS.length || ALLOWED_ORIGINS.includes('*')) return true;
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD_BYTES });

function rejectUpgrade(socket, status, message) {
  socket.write('HTTP/1.1 ' + status + ' ' + message + '\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
  socket.destroy();
}

server.on('upgrade', (request, socket, head) => {
  let pathname = '';
  try {
    pathname = new URL(request.url, 'http://localhost').pathname;
  } catch (err) {
    rejectUpgrade(socket, 400, 'Bad Request');
    return;
  }

  if (pathname !== wsPath && pathname !== wsProxyPath && pathname !== wsApiPath) {
    rejectUpgrade(socket, 404, 'Not Found');
    return;
  }

  if (!isOriginAllowed(request.headers.origin)) {
    rejectUpgrade(socket, 403, 'Forbidden');
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws, request) => {
  let channel = 'default';
  try {
    const url = new URL(request.url, 'http://localhost');
    channel = normalizeChannel(url.searchParams.get('channel'));
  } catch (err) {
    channel = 'default';
  }

  const room = getRoom(channel);
  room.add(ws);

  ws.channel = channel;
  ws.isAlive = true;
  ws.lastMessageAt = 0;
  ws.rateWindowStart = Date.now();
  ws.rateCount = 0;

  send(ws, {
    type: 'welcome',
    channel: channel,
    online: room.size,
    maxLength: MAX_TEXT_LENGTH
  });
  broadcast(channel, { type: 'online', count: room.size });

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (raw) => {
    let payload;
    try {
      payload = JSON.parse(raw.toString());
    } catch (err) {
      send(ws, { type: 'error', message: '弹幕格式不正确' });
      return;
    }

    if (!payload || typeof payload !== 'object') {
      send(ws, { type: 'error', message: '弹幕格式不正确' });
      return;
    }

    if (payload.type === 'ping') {
      send(ws, { type: 'pong', at: Date.now() });
      return;
    }

    if (payload.type !== 'danmaku') return;

    const text = normalizeText(payload.text);
    if (!text) {
      send(ws, { type: 'error', message: '弹幕内容不能为空' });
      return;
    }

    const rateError = checkRate(ws);
    if (rateError) {
      send(ws, { type: 'error', message: rateError });
      return;
    }

    if (findBannedWord(text)) {
      send(ws, { type: 'error', message: '弹幕包含违禁词，请修改后重试' });
      return;
    }

    broadcast(channel, {
      type: 'danmaku',
      id: crypto.randomUUID(),
      channel: channel,
      text: text,
      at: Date.now()
    });
  });

  ws.on('close', () => {
    const currentRoom = rooms.get(channel);
    if (!currentRoom) return;
    currentRoom.delete(ws);
    if (currentRoom.size === 0) {
      rooms.delete(channel);
      return;
    }
    broadcast(channel, { type: 'online', count: currentRoom.size });
  });

  ws.on('error', () => {});
});

const heartbeatTimer = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL_MS);

if (typeof heartbeatTimer.unref === 'function') {
  heartbeatTimer.unref();
}

app.get([healthPath, healthAliasPath], (req, res) => {
  res.json({
    ok: true,
    uptime: Math.round(process.uptime()),
    rooms: rooms.size,
    clients: wss.clients.size,
    bannedWords: BANNED_WORDS.length
  });
});

app.get('/', (req, res) => {
  res.json({
    service: 'qy-live-danmaku',
    websocket: wsApiPath,
    health: healthPath
  });
});

wss.on('close', () => {
  clearInterval(heartbeatTimer);
});

let shuttingDown = false;

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(heartbeatTimer);
  wss.clients.forEach((client) => {
    try {
      client.close(1001, 'Server shutting down');
    } catch (err) {
      client.terminate();
    }
  });
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(apiPort, apiHost, () => {
  const address = apiHost === '0.0.0.0' ? 'localhost' : apiHost;
  console.log('弹幕服务已启动：http://' + address + ':' + apiPort + '  WebSocket: ' + wsApiPath);
});
