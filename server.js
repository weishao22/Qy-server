'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');

const cms = require('./site/cms');
const data = require('./site/data');
const scripts = require('./site/scripts');
const auth = require('./site/auth');
const settings = require('./site/settings');
const widgets = require('./site/widgets');
const mcstatus = require('./site/services/mcstatus');
const danmakuService = require('./site/services/danmaku');
const commentsService = require('./site/services/comments');

const ROOT = cms.ROOT;
const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const ADMIN_DIR = path.join(__dirname, 'site', 'admin');

const RESERVED = new Set(['data', 'site', 'server', 'node_modules', '.git', '.kilo', 'test']);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json'
};

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '3mb' }));

const server = http.createServer(app);
const mc = mcstatus.mount(app);
const danmaku = danmakuService.mount(server, app);
const commentsApi = commentsService.mount(app);

function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return out;
}

function getSessionToken(req) {
  return parseCookies(req).qy_admin || '';
}

function requireAuth(req, res, next) {
  if (!auth.validateSession(getSessionToken(req))) {
    res.status(401).json({ error: '未登录或登录已过期' });
    return;
  }
  req.adminToken = getSessionToken(req);
  next();
}

function setSessionCookie(res, token, maxAgeSeconds) {
  res.setHeader('Set-Cookie', `qy_admin=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAgeSeconds}`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'qy_admin=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');
}

/* ---------------- 认证 ---------------- */

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (typeof password !== 'string' || !password) {
    res.status(400).json({ error: '请输入密码' });
    return;
  }
  if (!auth.verifyPassword(password)) {
    res.status(401).json({ error: '密码错误' });
    return;
  }
  auth.pruneSessions();
  const token = auth.createSession();
  setSessionCookie(res, token, Math.floor(auth.SESSION_TTL / 1000));
  res.json({ ok: true, mustChange: auth.mustChangePassword() });
});

app.post('/api/admin/logout', requireAuth, (req, res) => {
  auth.destroySession(req.adminToken);
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/admin/session', (req, res) => {
  const authenticated = auth.validateSession(getSessionToken(req));
  res.json({
    authenticated,
    mustChange: authenticated ? auth.mustChangePassword() : false
  });
});

app.post('/api/admin/password', requireAuth, (req, res) => {
  const { current, next } = req.body || {};
  const result = auth.changePassword(current, next);
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  auth.destroySession(req.adminToken);
  clearSessionCookie(res);
  res.json({ ok: true, relogin: true });
});

/* ---------------- 内容管理 ---------------- */

app.get('/api/admin/pages', requireAuth, (req, res) => {
  const store = cms.loadStore();
  res.json({
    pages: cms.listPages(),
    sources: [...data.listSources(store), ...scripts.listSources(store)],
    stats: cms.stats()
  });
});

app.get('/api/admin/entries', requireAuth, (req, res) => {
  const page = typeof req.query.page === 'string' ? req.query.page : undefined;
  const source = typeof req.query.source === 'string' ? req.query.source : undefined;
  const query = typeof req.query.q === 'string' && req.query.q ? req.query.q : undefined;
  const store = cms.loadStore();
  if (source) {
    const entries = data.listEntries(source, store, query);
    if (entries.length) {
      res.json({ entries, stats: cms.stats() });
      return;
    }
    res.json({ entries: scripts.listEntries(source, store, query), stats: cms.stats() });
    return;
  }
  let entries;
  if (query && !page) {
    entries = cms.listEntries({ query });
    for (const sourceMeta of data.allSources()) {
      entries = entries.concat(data.listEntries(sourceMeta.route, store, query));
    }
    for (const route of scripts.allRoutes()) {
      entries = entries.concat(scripts.listEntries(route, store, query));
    }
  } else {
    entries = cms.listEntries({ page, query });
  }
  res.json({ entries, stats: cms.stats() });
});

app.post('/api/admin/save', requireAuth, (req, res) => {
  const { changes } = req.body || {};
  if (!Array.isArray(changes)) {
    res.status(400).json({ error: 'changes 必须是数组' });
    return;
  }
  res.json({ ok: true, ...cms.saveEntries(changes) });
});

app.post('/api/admin/inline-save', requireAuth, (req, res) => {
  const { changes } = req.body || {};
  if (!Array.isArray(changes)) {
    res.status(400).json({ error: 'changes 必须是数组' });
    return;
  }
  res.json({ ok: true, ...cms.saveEntries(changes) });
});

/* ---------------- 控制台小组件 ---------------- */

app.get('/api/admin/dashboard', requireAuth, (req, res) => {
  res.json({ widgets: widgets.load().widgets, types: widgets.TYPES });
});

app.put('/api/admin/dashboard', requireAuth, (req, res) => {
  const { widgets: items } = req.body || {};
  if (!Array.isArray(items)) {
    res.status(400).json({ error: 'widgets 必须是数组' });
    return;
  }
  if (items.length > 40) {
    res.status(400).json({ error: '小组件数量过多' });
    return;
  }
  res.json({ ok: true, ...widgets.save({ widgets: items }) });
});

app.post('/api/admin/dashboard/reset', requireAuth, (req, res) => {
  res.json({ ok: true, ...widgets.save({ widgets: widgets.defaults() }) });
});

/* ---------------- 设置 ---------------- */

function pickSettings(body) {
  const out = {};
  const src = body || {};
  if (src.mc && typeof src.mc === 'object') {
    const mc = {};
    if (typeof src.mc.host === 'string') mc.host = src.mc.host.trim().slice(0, 120);
    if (src.mc.port !== undefined) mc.port = Math.max(1, Math.min(65535, Number(src.mc.port) || 41657));
    if (src.mc.srv !== undefined) mc.srv = Boolean(src.mc.srv);
    if (src.mc.recordCronMinutes !== undefined) mc.recordCronMinutes = Math.max(1, Math.min(120, Number(src.mc.recordCronMinutes) || 2));
    if (Array.isArray(src.mc.extraServers)) {
      mc.extraServers = src.mc.extraServers.slice(0, 12).map((item) => ({
        name: String((item && item.name) || '').slice(0, 60),
        host: String((item && item.host) || '').slice(0, 120),
        port: Math.max(1, Math.min(65535, Number(item && item.port) || 19132)),
        srv: !(item && item.srv === false)
      })).filter((item) => item.host);
    }
    out.mc = mc;
  }
  if (src.danmaku && typeof src.danmaku === 'object') {
    const dm = {};
    if (src.danmaku.maxTextLength !== undefined) dm.maxTextLength = Math.max(1, Math.min(200, Number(src.danmaku.maxTextLength) || 80));
    if (src.danmaku.cooldownMs !== undefined) dm.cooldownMs = Math.max(0, Math.min(60000, Number(src.danmaku.cooldownMs) || 1200));
    if (src.danmaku.rateWindowMs !== undefined) dm.rateWindowMs = Math.max(1000, Math.min(120000, Number(src.danmaku.rateWindowMs) || 10000));
    if (src.danmaku.rateWindowLimit !== undefined) dm.rateWindowLimit = Math.max(1, Math.min(100, Number(src.danmaku.rateWindowLimit) || 8));
    if (Array.isArray(src.danmaku.bannedWords)) dm.bannedWords = src.danmaku.bannedWords.map((w) => String(w).slice(0, 60)).filter(Boolean).slice(0, 1000);
    out.danmaku = dm;
  }
  if (src.comments && typeof src.comments === 'object') {
    const cm = {};
    if (src.comments.enabled !== undefined) cm.enabled = Boolean(src.comments.enabled);
    if (src.comments.requireEmail !== undefined) cm.requireEmail = Boolean(src.comments.requireEmail);
    if (src.comments.cooldownMs !== undefined) cm.cooldownMs = Math.max(0, Math.min(600000, Number(src.comments.cooldownMs) || 20000));
    if (src.comments.maxLength !== undefined) cm.maxLength = Math.max(10, Math.min(5000, Number(src.comments.maxLength) || 600));
    if (src.comments.maxNick !== undefined) cm.maxNick = Math.max(2, Math.min(60, Number(src.comments.maxNick) || 24));
    if (src.comments.pageSize !== undefined) cm.pageSize = Math.max(1, Math.min(200, Number(src.comments.pageSize) || 50));
    out.comments = cm;
  }
  if (src.views && typeof src.views === 'object') {
    const vw = {};
    if (src.views.cooldownMs !== undefined) vw.cooldownMs = Math.max(0, Math.min(86400000, Number(src.views.cooldownMs) || 60000));
    out.views = vw;
  }
  return out;
}

app.get('/api/admin/settings', requireAuth, (req, res) => {
  res.json(settings.load());
});

app.put('/api/admin/settings', requireAuth, (req, res) => {
  settings.update(pickSettings(req.body));
  mc.refreshInterval();
  res.json({ ok: true, settings: settings.load() });
});

/* ---------------- 服务状态 ---------------- */

app.get('/api/admin/danmaku/state', requireAuth, (req, res) => {
  res.json(danmaku.state());
});

app.post('/api/admin/danmaku/send', requireAuth, (req, res) => {
  const { channel, text } = req.body || {};
  const result = danmaku.sendSystem(channel, text);
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }
  res.json({ ok: true, message: result.message });
});

app.get('/api/admin/comments', requireAuth, (req, res) => {
  const pagePath = typeof req.query.path === 'string' && req.query.path ? req.query.path : undefined;
  const rows = commentsApi.list(pagePath).slice().reverse().slice(0, 500);
  res.json({ comments: rows, stats: commentsApi.counts() });
});

app.delete('/api/admin/comments/:id', requireAuth, (req, res) => {
  const ok = commentsApi.remove(req.params.id);
  res.json({ ok });
});

app.get('/api/admin/views', requireAuth, (req, res) => {
  res.json({ pages: commentsApi.counts() });
});

app.get('/api/admin/overview', requireAuth, (req, res) => {
  const stats = cms.stats();
  const pages = cms.listPages();
  const texts = pages.reduce((sum, page) => sum + page.count, 0);
  const all = commentsApi.counts();
  res.json({
    pages: pages.length,
    texts,
    overrides: stats.overrides,
    updatedAt: stats.updatedAt,
    comments: commentsApi.list().length,
    views: all.reduce((sum, item) => sum + item.views, 0),
    sources: data.allSources().length + scripts.allRoutes().length
  });
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

/* ---------------- 后台页面 ---------------- */

app.get(['/admin', '/admin/'], (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(ADMIN_DIR, 'index.html'));
});

app.use('/admin-assets', express.static(ADMIN_DIR, { index: false, maxAge: '1h' }));

/* ---------------- 站点页面 ---------------- */

function safeJoin(urlPath) {
  const decoded = decodeURIComponent(String(urlPath).split('?')[0]);
  const normalized = path.posix.normalize(decoded).replace(/^\/+/, '');
  if (normalized.includes('..')) return null;
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length && RESERVED.has(segments[0])) return null;
  if (segments.length && /^(\package(-lock)?\.json|\.env.*)$/i.test(segments[0])) return null;
  return path.join(ROOT, segments.join(path.sep));
}

function resolveHtmlFile(urlPath) {
  const target = safeJoin(urlPath);
  if (!target) return null;
  const candidates = [];
  if (urlPath.endsWith('/')) {
    candidates.push(path.join(target, 'index.html'));
  } else {
    candidates.push(target);
    candidates.push(`${target}.html`);
    candidates.push(path.join(target, 'index.html'));
  }
  for (const candidate of candidates) {
    try {
      const stat = fs.statSync(candidate);
      if (stat.isFile() && /\.html?$/i.test(candidate)) return candidate;
    } catch {
      /* continue */
    }
  }
  return null;
}

app.use((req, res, next) => {
  if (/^\/(data|site|server|node_modules)(\/|$)/i.test(req.path) || /^\/\./.test(req.path)) {
    res.status(404).type('text/plain').send('404 Not Found');
    return;
  }
  if (/^\/(server\.js|package(-lock)?\.json|README\.md|AGENTS\.md|SITE-README\.md)$/i.test(req.path)) {
    res.status(404).type('text/plain').send('404 Not Found');
    return;
  }
  next();
});

app.get(/^\/(?!api\/|admin\/?$|admin-assets\/).*/, (req, res, next) => {
  if (req.path.endsWith('/index.html')) {
    res.redirect(301, req.path.slice(0, -'index.html'.length) || '/');
    return;
  }
  const urlPath = req.path;
  const file = resolveHtmlFile(urlPath);
  if (!file) {
    next();
    return;
  }
  if (!urlPath.endsWith('/') && path.basename(file) === 'index.html' && urlPath !== '/') {
    const query = req.url.slice(req.path.length);
    res.redirect(301, `${urlPath}/${query}`);
    return;
  }
  try {
    const editor = String(req.query.edit) === '1' && auth.validateSession(getSessionToken(req));
    const html = cms.renderPage(file, { editor });
    res.setHeader('Content-Type', MIME['.html']);
    res.setHeader('Cache-Control', 'no-cache');
    res.send(html);
  } catch (error) {
    next(error);
  }
});

/* ---------------- 可编辑数据文件 ---------------- */

app.get(/^\/Configs\/.+/, (req, res, next) => {
  if (!data.routeInfo(req.path)) {
    next();
    return;
  }
  try {
    const body = data.patchRoute(req.path, cms.loadStore());
    if (body === null) {
      next();
      return;
    }
    const ext = path.extname(req.path).toLowerCase();
    res.setHeader('Content-Type', MIME[ext] || 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(body);
  } catch (error) {
    next(error);
  }
});

app.get(/^\/(lib|live|search|updatelog|tools)\/.+\.js$/, (req, res, next) => {
  if (!scripts.routeInfo(req.path)) {
    next();
    return;
  }
  try {
    const body = scripts.patchRoute(req.path, cms.loadStore());
    if (body === null) {
      next();
      return;
    }
    res.setHeader('Content-Type', MIME['.js']);
    res.setHeader('Cache-Control', 'no-cache');
    res.send(body);
  } catch (error) {
    next(error);
  }
});

app.use(
  express.static(ROOT, {
    index: false,
    setHeaders(res, filePath) {
      if (/\.(woff2?|ttf|svg|png|jpe?g|webp|gif|ico|mp3|mp4|webm)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=604800');
      }
    }
  })
);

app.use((req, res) => {
  const file = path.join(ROOT, '404.html');
  res.status(404);
  if (fs.existsSync(file)) {
    const html = cms.renderPage(file);
    res.setHeader('Content-Type', MIME['.html']);
    res.send(html);
    return;
  }
  res.type('text/plain').send('404 Not Found');
});

app.use((error, req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: '服务器内部错误' });
});

server.listen(PORT, HOST, () => {
  console.log(`QYServer 站点已启动: http://localhost:${PORT}/`);
  console.log(`管理后台: http://localhost:${PORT}/admin`);
  console.log(`MC 状态接口: /api/status  |  弹幕 WebSocket: /api/danmaku/ws`);
  if (auth.mustChangePassword()) {
    console.log('首次使用请用默认密码 admin123 登录，并立即修改密码。');
  }
});
