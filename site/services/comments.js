'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const settings = require('../settings');

const COMMENTS_FILE = path.join(settings.DATA_DIR, 'comments.json');
const VIEWS_FILE = path.join(settings.DATA_DIR, 'views.json');

let comments = [];
let views = {};
let loaded = false;
const cooldown = new Map();
let saveQueue = Promise.resolve();

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = JSON.parse(fs.readFileSync(COMMENTS_FILE, 'utf8'));
    comments = Array.isArray(raw.comments) ? raw.comments : [];
  } catch {
    comments = [];
  }
  try {
    const raw = JSON.parse(fs.readFileSync(VIEWS_FILE, 'utf8'));
    views = raw && typeof raw === 'object' ? raw : {};
  } catch {
    views = {};
  }
}

function persist() {
  const commentsSnapshot = JSON.stringify({ comments }, null, 2);
  const viewsSnapshot = JSON.stringify(views, null, 2);
  saveQueue = saveQueue
    .then(() => fs.promises.mkdir(settings.DATA_DIR, { recursive: true }))
    .then(() => fs.promises.writeFile(`${COMMENTS_FILE}.tmp`, commentsSnapshot, 'utf8'))
    .then(() => fs.promises.rename(`${COMMENTS_FILE}.tmp`, COMMENTS_FILE))
    .then(() => fs.promises.writeFile(`${VIEWS_FILE}.tmp`, viewsSnapshot, 'utf8'))
    .then(() => fs.promises.rename(`${VIEWS_FILE}.tmp`, VIEWS_FILE))
    .catch((error) => console.error('[comments] 保存失败:', error.message));
  return saveQueue;
}

function normalizePath(value) {
  let p = String(value || '/').trim();
  if (!p.startsWith('/')) p = `/${p}`;
  return p.slice(0, 300);
}

function escapeText(value, max) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket.remoteAddress || 'unknown';
}

function checkCooldown(key, ms) {
  const now = Date.now();
  const last = cooldown.get(key) || 0;
  if (now - last < ms) return Math.ceil((ms - (now - last)) / 1000);
  cooldown.set(key, now);
  if (cooldown.size > 5000) {
    for (const [k, t] of cooldown) {
      if (now - t > 30 * 60 * 1000) cooldown.delete(k);
    }
  }
  return 0;
}

function listByPath(pagePath, limit) {
  load();
  const rows = comments.filter((item) => item.path === pagePath);
  return rows.slice(Math.max(0, rows.length - limit));
}

function counts() {
  load();
  const map = new Map();
  for (const item of comments) {
    map.set(item.path, (map.get(item.path) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([pagePath, count]) => ({ path: pagePath, comments: count, views: views[pagePath] || 0 }))
    .sort((a, b) => b.views - a.views);
}

function mount(app) {
  load();

  app.get('/api/comments', (req, res) => {
    const config = settings.comments();
    if (!config.enabled) {
      res.status(403).json({ error: '评论功能已关闭', comments: [] });
      return;
    }
    const pagePath = normalizePath(req.query.path);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || config.pageSize || 50));
    res.json({ path: pagePath, comments: listByPath(pagePath, limit), enabled: true });
  });

  app.post('/api/comments', (req, res) => {
    const config = settings.comments();
    if (!config.enabled) {
      res.status(403).json({ error: '评论功能已关闭' });
      return;
    }
    const body = req.body || {};
    const pagePath = normalizePath(body.path);
    const nick = escapeText(body.nick, config.maxNick || 24) || '匿名玩家';
    const email = escapeText(body.email, 120);
    const website = escapeText(body.website, 200);
    const content = escapeText(body.content, config.maxLength || 600);
    if (!content) {
      res.status(400).json({ error: '评论内容不能为空' });
      return;
    }
    if (config.requireEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: '请填写有效邮箱' });
      return;
    }
    const wait = checkCooldown(`${clientIp(req)}|${pagePath}`, Number(config.cooldownMs) || 20000);
    if (wait > 0) {
      res.status(429).json({ error: `发言太快，请 ${wait} 秒后再试` });
      return;
    }
    const item = {
      id: crypto.randomUUID(),
      path: pagePath,
      nick,
      email,
      website,
      content,
      createdAt: new Date().toISOString()
    };
    comments.push(item);
    if (comments.length > 20000) comments = comments.slice(-20000);
    persist();
    res.json({ ok: true, comment: item });
  });

  app.get('/api/views', (req, res) => {
    load();
    const pagePath = normalizePath(req.query.path);
    res.json({ path: pagePath, count: views[pagePath] || 0 });
  });

  app.post('/api/views', (req, res) => {
    load();
    const pagePath = normalizePath((req.body || {}).path || req.query.path);
    const config = settings.views();
    const wait = checkCooldown(`view|${clientIp(req)}|${pagePath}`, Number(config.cooldownMs) || 60000);
    if (wait === 0) {
      views[pagePath] = (views[pagePath] || 0) + 1;
      persist();
    }
    res.json({ path: pagePath, count: views[pagePath] || 0 });
  });

  return {
    counts,
    list(pagePath) {
      load();
      return comments.filter((item) => !pagePath || item.path === pagePath);
    },
    recent(limit = 8) {
      load();
      return comments.slice(-limit).reverse();
    },
    remove(id) {
      load();
      const before = comments.length;
      comments = comments.filter((item) => item.id !== id);
      if (comments.length !== before) persist();
      return comments.length !== before;
    },
    viewsSnapshot() {
      load();
      return views;
    }
  };
}

module.exports = { mount };
