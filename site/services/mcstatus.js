'use strict';

const fs = require('fs');
const path = require('path');
const { statusBedrock } = require('minecraft-server-util');
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

async function queryServer(host, port, srv) {
  const result = await statusBedrock(host, port, { timeout: 8000, enableSRV: srv !== false });
  return result;
}

async function checkServer(host, port, srv) {
  try {
    const data = await queryServer(host, port, srv);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function fetchStatus() {
  const config = settings.mc();
  const result = await checkServer(config.host, config.port, config.srv);
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
  const result = await checkServer(config.host, config.port, config.srv);
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
    { name: config.host, host: config.host, port: config.port, srv: config.srv },
    ...(Array.isArray(config.extraServers) ? config.extraServers : [])
  ].slice(0, 12);
  const results = await Promise.all(
    servers.map(async (server) => {
      const result = await checkServer(server.host, server.port, server.srv);
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
    prune();
    res.json(
      history
        .slice()
        .sort((a, b) => Date.parse(b.time) - Date.parse(a.time))
        .map((item) => ({ time: item.time, online: item.online, status: item.status }))
    );
  });

  app.get('/api/all', async (req, res) => {
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
