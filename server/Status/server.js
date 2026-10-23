// Node.js 后端示例：基岩版服务器状态记录与查询
// 依赖：express、node-cron、minecraft-server-util、cors
// 安装：npm install express node-cron minecraft-server-util cors

const fs = require('fs');
const path = require('path');
const express = require('express');
const cron = require('node-cron');
const cors = require('cors');
const { statusBedrock } = require('minecraft-server-util');

// ================== 配置区域 ==================
const apiHost = process.env.HOST || '0.0.0.0';
const apiPort = Number(process.env.PORT) || 3000;
const statusPath = '/api/status';
const historyPath = '/api/history';
const historyFile = path.resolve(
  process.env.HISTORY_FILE || path.join(__dirname, 'status-history.json')
);
const historyRetentionMs = 2 * 60 * 60 * 1000;
const historyMaxRecords = Number(process.env.HISTORY_MAX_RECORDS) || 1000;
const recordCron = process.env.RECORD_CRON || '*/2 * * * *';

// 服务器信息
const serverHost = process.env.MC_HOST || 'mc.qyserver.top';
const serverPort = Number(process.env.MC_PORT) || 41657;
// =================================================

// 创建 Express 应用
const app = express();

// 启用 CORS（网页跨域访问 API 必须）
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// ========== 服务器状态检查函数 ==========
async function checkServerStatus() {
  try {
    const result = await statusBedrock(serverHost, serverPort, {
      timeout: 10000,
      enableSRV: true
    });
    return { success: true, data: result };
  } catch (err) {
    console.error('服务器状态检查失败:', err.message);
    return { success: false, error: err.message };
  }
}

// ========== 本地历史记录 ==========
let history = [];
let saveQueue = Promise.resolve();

function createRecord(statusResult) {
  const time = new Date().toISOString();
  if (statusResult.success) {
    return {
      time: time,
      online: statusResult.data.players?.online || 0,
      max: statusResult.data.players?.max || 0,
      status: 1
    };
  }
  return {
    time: time,
    online: 0,
    max: 0,
    status: 0
  };
}

function pruneHistory() {
  const cutoff = Date.now() - historyRetentionMs;
  history = history.filter((item) => {
    const time = Date.parse(item.time);
    return Number.isFinite(time) && time >= cutoff;
  });
  if (history.length > historyMaxRecords) {
    history = history.slice(-historyMaxRecords);
  }
}

function loadHistory() {
  try {
    const raw = fs.readFileSync(historyFile, 'utf8').replace(/^\uFEFF/, '');
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
      pruneHistory();
      console.log('已加载历史记录:', history.length);
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn('读取历史记录失败:', err.message);
    }
  }
}

function saveHistory() {
  const snapshot = JSON.stringify(history, null, 2);
  saveQueue = saveQueue
    .then(() => fs.promises.mkdir(path.dirname(historyFile), { recursive: true }))
    .then(() => fs.promises.writeFile(historyFile + '.tmp', snapshot, 'utf8'))
    .then(() => fs.promises.rename(historyFile + '.tmp', historyFile))
    .catch((err) => {
      console.error('保存历史记录失败:', err.message);
    });
  return saveQueue;
}

async function recordStatus() {
  const statusResult = await checkServerStatus();
  const record = createRecord(statusResult);
  history.push(record);
  pruneHistory();
  await saveHistory();

  if (statusResult.success) {
    console.log('记录成功:', record.time, `在线 ${record.online}/${record.max}`);
  } else {
    console.error('记录失败:', record.time, statusResult.error);
  }
}

function start() {
  loadHistory();

  // ========== 定时任务：每 2 分钟记录一次状态并清理过期记录 ==========
  cron.schedule(recordCron, () => {
    recordStatus().catch((err) => {
      console.error('记录任务失败:', err);
    });
  });

  // ========== API：获取最近 2 小时记录 ==========
  app.get(historyPath, (req, res) => {
    pruneHistory();
    const rows = history
      .slice()
      .sort((a, b) => Date.parse(b.time) - Date.parse(a.time))
      .map((item) => ({
        time: item.time,
        online: item.online,
        status: item.status
      }));
    res.json(rows);
  });

  // ========== 缓存：5秒内复用上次查询结果 ==========
  let statusCache = null;
  let cacheTime = 0;
  const CACHE_TTL = 5000;

  // ========== API：实时获取服务器状态（带 5 秒缓存） ==========
  app.get(statusPath, async (req, res) => {
    const now = Date.now();
    if (statusCache && (now - cacheTime) < CACHE_TTL) {
      return res.json(statusCache);
    }

    const statusResult = await checkServerStatus();

    if (statusResult.success) {
      statusCache = {
        online: true,
        players: {
          online: statusResult.data.players?.online || 0,
          max: statusResult.data.players?.max || 0
        },
        motd: statusResult.data.motd?.clean || 'Unknown',
        version: statusResult.data.version
      };
      cacheTime = now;
      res.json(statusCache);
    } else {
      res.json({
        online: false,
        error: statusResult.error
      });
    }
  });

  // ========== 启动服务 ==========
  app.listen(apiPort, apiHost, () => {
    console.log(`MC 状态服务已启动: http://${apiHost}:${apiPort}`);
    console.log('历史记录文件:', historyFile);
  });
}

start();
