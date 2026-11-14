'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const BANNED_WORDS_FILE = path.join(ROOT, 'server', 'Danmaku', 'banned-words.json');

const DEFAULTS = {
  mc: {
    host: 'mc.qyserver.top',
    port: 41657,
    srv: true,
    recordCronMinutes: 2,
    extraServers: []
  },
  danmaku: {
    maxTextLength: 80,
    cooldownMs: 1200,
    rateWindowMs: 10000,
    rateWindowLimit: 8,
    bannedWords: []
  },
  comments: {
    enabled: true,
    requireEmail: false,
    cooldownMs: 20000,
    maxLength: 600,
    maxNick: 24,
    pageSize: 50
  },
  views: {
    cooldownMs: 60000
  },
  site: {
    name: 'QYServer'
  }
};

let cache = { mtime: 0, data: null };

function readBannedWords() {
  try {
    const raw = fs.readFileSync(BANNED_WORDS_FILE, 'utf8').replace(/^\uFEFF/, '');
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : parsed && parsed.words;
    return Array.isArray(list) ? list.filter((word) => typeof word === 'string') : [];
  } catch {
    return [];
  }
}

function deepMerge(base, override) {
  if (!override || typeof override !== 'object') return base;
  const out = Array.isArray(base) ? base.slice() : { ...base };
  for (const key of Object.keys(override)) {
    const value = override[key];
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      base[key] &&
      typeof base[key] === 'object' &&
      !Array.isArray(base[key])
    ) {
      out[key] = deepMerge(base[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function defaults() {
  const data = JSON.parse(JSON.stringify(DEFAULTS));
  data.danmaku.bannedWords = readBannedWords();
  return data;
}

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function load() {
  let stat;
  try {
    stat = fs.statSync(SETTINGS_FILE);
  } catch {
    const data = defaults();
    save(data);
    return data;
  }
  if (cache.data && cache.mtime === stat.mtimeMs) return cache.data;
  try {
    const raw = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    const data = deepMerge(defaults(), raw);
    cache = { mtime: stat.mtimeMs, data };
    return data;
  } catch {
    return defaults();
  }
}

function save(data) {
  ensureDir();
  const merged = deepMerge(defaults(), data || {});
  const tmp = `${SETTINGS_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(merged, null, 2), 'utf8');
  fs.renameSync(tmp, SETTINGS_FILE);
  cache = { mtime: fs.statSync(SETTINGS_FILE).mtimeMs, data: merged };
  return merged;
}

function update(partial) {
  return save(deepMerge(load(), partial || {}));
}

function mc() {
  return load().mc;
}

function danmaku() {
  return load().danmaku;
}

function comments() {
  return load().comments;
}

function views() {
  return load().views;
}

module.exports = {
  load,
  save,
  update,
  defaults,
  mc,
  danmaku,
  comments,
  views,
  DATA_DIR,
  SETTINGS_FILE
};
