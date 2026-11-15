'use strict';

const fs = require('fs');
const path = require('path');
const { statusBedrock, status: statusJava } = require('minecraft-server-util');
const settings = require('../settings');

const HISTORY_FILE = path.join(settings.DATA_DIR, 'status-history.json');
const RETENTION_MS = 2 * 60 * 60 * 1000;
const MAX_RECORDS = 1000;
const CACHE_TTL = 5000;

let history = [];
let saveQueue = Promise.resolve();
let saveTimer = null;
let cache = null;
let cacheTime = 0;

function loadHistory() {
  try {
    const raw = fs.readFileSync(HISTORY_FILE, 'utf8').replace(/^\uFEFF/, '');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      history = parsed
        .filter((item) => item && typeof item.time === 'string' && Number.isFinite(Date.parse(item.time)))
        .map((item) => ({
          time: item.time,
          online: Number(item.online) || 0,
          max: Number(item.max) || 0,
          status: item.status ? 1 : 0
        }))
        .sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
      prune();
    }
  } catch {
    history = [];
  }
}

function prune() {
  const cutoff = Date.now() - RETENTION_MS;
  history = history.filter((item) => Date.parse(item.time) >= cutoff);
  if (history.length > MAX_RECORDS) history = history.slice(-MAX_RECORDS);
}

function saveHistory() {
  const snapshot = JSON.stringify(history, null, 2);
  saveQueue = saveQueue
    .then(() => fs.promises.mkdir(path.dirname(HISTORY_FILE), { recursive: true }))
    .then(() => fs.promises.writeFile(`${HISTORY_FILE}.tmp`, snapshot, 'utf8'))
    .then(() => fs.promises.rename(`${HISTORY_FILE}.tmp`, HISTORY_FILE))
    .catch((error) => {
      console.error('[status] 保存历史记录失败:', error.message);
    });
  return saveQueue;
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveHistory();
  }, 1500);
}

async function queryBedrock(host, port, srv) {
  return statusBedrock(host, port, { timeout: 8000, enableSRV: srv !== false });
}

async function queryJava(host, port) {
  return statusJava(host, port, { timeout: 8000 });
}

async function checkServer(host, port, srv, type) {
  const tasks = [];
  const proto = String(type || '').toLowerCase();
  if (proto === 'java') {
    tasks.push(() => queryJava(host, port));
  } else if (proto === 'bedrock') {
    tasks.push(() => queryBedrock(host, port, srv));
  } else {
    // 未指定类型：按端口猜测，失败再换另一种协议
    const n = Number(port) || 0;
    const javaFirst = n === 25565 || n === 25564;
    const first = javaFirst ? () => queryJava(host, port) : () => queryBedrock(host, port, srv);
    const second = javaFirst ? () => queryBedrock(host, port, srv) : () => queryJava(host, port);
    tasks.push(first, second);
  }
  let lastError = null;
  for (const task of tasks) {
    try {
      return { success: true, data: await task() };
    } catch (error) {
      lastError = error;
    }
  }
  return { success: false, error: lastError ? lastError.message : 'unknown' };
}

async function fetchStatus() {
  const config = settings.mc();
  const result = await checkServer(config.host, config.port, config.srv, 'bedrock');
  if (!result.success) {
    return { online: false, error: result.error, updatedAt: new Date().toISOString() };
  }
  const data = result.data;
  return {
    online: true,
    players: {
      online: (data.players && data.players.online) || 0,
      max: (data.players && data.players.max) || 0
    },
    motd: (data.motd && data.motd.clean) || 'Unknown',
    version: data.version,
    host: config.host,
    port: config.port,
    updatedAt: new Date().toISOString()
  };
}

async function record() {
  const config = settings.mc();
  const result = await checkServer(config.host, config.port, config.srv, 'bedrock');
  const time = new Date().toISOString();
  history.push(
    result.success
      ? {
          time,
          online: (result.data.players && result.data.players.online) || 0,
          max: (result.data.players && result.data.players.max) || 0,
          status: 1
        }
      : { time, online: 0, max: 0, status: 0 }
  );
  prune();
  scheduleSave();
}

async function cluster() {
  const config = settings.mc();
  const servers = [
    { name: config.host, host: config.host, port: config.port, srv: config.srv, type: 'bedrock' },
    ...(Array.isArray(config.extraServers) ? config.extraServers : [])
  ].slice(0, 12);
  const results = await Promise.all(
    servers.map(async (server) => {
      const result = await checkServer(server.host, server.port, server.srv, server.type);
      if (!result.success) {
        return {
          server: server.name || `${server.host}:${server.port}`,
          status: 'offline',
          error: result.error,
          last_updated: new Date().toISOString()
        };
      }
      return {
        server: server.name || `${server.host}:${server.port}`,
        status: 'online',
        online_players: (result.data.players && result.data.players.online) || 0,
        max_players: (result.data.players && result.data.players.max) || 0,
        motd: (result.data.motd && result.data.motd.clean) || '',
        version: result.data.version,
        last_updated: new Date().toISOString()
      };
    })
  );
  return { servers: results };
}

function mount(app) {
  loadHistory();

  app.get('/api/status', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const now = Date.now();
    if (cache && now - cacheTime < CACHE_TTL) {
      res.json(cache);
      return;
    }
    const data = await fetchStatus();
    if (data.online) {
      cache = data;
      cacheTime = now;
    }
    res.json(data);
  });

  app.get('/api/history', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    prune();
    res.json(
      history
        .slice()
        .sort((a, b) => Date.parse(b.time) - Date.parse(a.time))
        .map((item) => ({ time: item.time, online: item.online, status: item.status }))
    );
  });

  app.get('/api/all', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    try {
      res.json(await cluster());
    } catch (error) {
      res.status(500).json({ error: error.message, servers: [] });
    }
  });

  let interval = null;
  const tick = () => {
    const minutes = Math.max(1, Number(settings.mc().recordCronMinutes) || 2);
    if (interval) clearInterval(interval);
    interval = setInterval(() => {
      record().catch((error) => console.error('[status] 记录失败:', error.message));
    }, minutes * 60 * 1000);
    if (typeof interval.unref === 'function') interval.unref();
  };
  tick();
  record().catch(() => {});
  return {
    getHistory: () => history.slice(),
    record,
    refreshInterval: tick
  };
}

module.exports = { mount, fetchStatus, record };
