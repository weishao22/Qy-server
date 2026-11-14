'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const settings = require('./settings');

const FILE = path.join(settings.DATA_DIR, 'widgets.json');

const TYPES = [
  { type: 'status', label: 'MC 服务器状态', size: 1, site: true },
  { type: 'history', label: '在线人数趋势', size: 2, site: false },
  { type: 'danmaku', label: '直播间弹幕', size: 2, site: false },
  { type: 'comments', label: '最新评论', size: 1, site: false },
  { type: 'visits', label: '访问量统计', size: 2, site: false },
  { type: 'content', label: '内容统计', size: 1, site: false },
  { type: 'note', label: '自定义文本', size: 1, site: true },
  { type: 'links', label: '快捷链接', size: 1, site: true },
  { type: 'html', label: '自定义 HTML', size: 2, site: true },
  { type: 'iframe', label: '嵌入页面（如 MCSM 面板）', size: 3, site: true }
];

function defaults() {
  return [
    { id: 'w-status', type: 'status', title: '服务器状态', size: 1, visible: true, onSite: false, config: {} },
    { id: 'w-history', type: 'history', title: '在线人数趋势', size: 2, visible: true, onSite: false, config: {} },
    { id: 'w-danmaku', type: 'danmaku', title: '直播弹幕', size: 2, visible: true, onSite: false, config: { channel: 'default' } },
    { id: 'w-comments', type: 'comments', title: '最新评论', size: 1, visible: true, onSite: false, config: {} },
    { id: 'w-visits', type: 'visits', title: '访问量统计', size: 2, visible: true, onSite: false, config: {} },
    { id: 'w-content', type: 'content', title: '内容统计', size: 1, visible: true, onSite: false, config: {} },
    { id: 'w-note', type: 'note', title: '公告', size: 1, visible: true, onSite: false, config: { text: '欢迎使用 QYServer 控制台，可在右侧添加或拖动小组件。' } }
  ];
}

let cache = { mtime: 0, data: null };

function load() {
  let stat;
  try {
    stat = fs.statSync(FILE);
  } catch {
    const data = { widgets: defaults() };
    save(data);
    return data;
  }
  if (cache.data && cache.mtime === stat.mtimeMs) return cache.data;
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    const widgets = Array.isArray(raw.widgets) ? raw.widgets : defaults();
    const data = { widgets: widgets.filter((item) => item && item.type).map(normalizeWidget) };
    cache = { mtime: stat.mtimeMs, data };
    return data;
  } catch {
    return { widgets: defaults() };
  }
}

function normalizeWidget(item) {
  return {
    id: String(item.id || `w-${crypto.randomBytes(4).toString('hex')}`),
    type: String(item.type),
    title: String(item.title || ''),
    size: Math.min(3, Math.max(1, Number(item.size) || 1)),
    visible: item.visible !== false,
    onSite: Boolean(item.onSite),
    config: item.config && typeof item.config === 'object' ? item.config : {}
  };
}

function save(data) {
  fs.mkdirSync(settings.DATA_DIR, { recursive: true });
  const payload = { widgets: (data.widgets || []).map(normalizeWidget) };
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
  fs.renameSync(tmp, FILE);
  cache = { mtime: fs.statSync(FILE).mtimeMs, data: payload };
  return payload;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderSiteWidget(widget) {
  const title = widget.title ? `<h3 class="qy-site-widget-title">${escapeHtml(widget.title)}</h3>` : '';
  if (widget.type === 'note') {
    const text = escapeHtml(widget.config.text || '').replace(/\r?\n/g, '<br>');
    return `<div class="qy-site-widget" data-qy-widget-card="${widget.id}">${title}<div class="qy-site-widget-body">${text}</div></div>`;
  }
  if (widget.type === 'html') {
    return `<div class="qy-site-widget" data-qy-widget-card="${widget.id}">${title}<div class="qy-site-widget-body">${widget.config.html || ''}</div></div>`;
  }
  if (widget.type === 'links') {
    const links = Array.isArray(widget.config.links) ? widget.config.links : [];
    const items = links
      .filter((link) => link && link.url)
      .map((link) => `<a class="qy-site-widget-link" href="${escapeHtml(link.url)}"><i class="fas fa-arrow-right"></i> ${escapeHtml(link.label || link.url)}</a>`)
      .join('');
    return `<div class="qy-site-widget" data-qy-widget-card="${widget.id}">${title}<div class="qy-site-widget-body">${items || '<span class="qy-site-widget-empty">暂无链接</span>'}</div></div>`;
  }
  if (widget.type === 'iframe') {
    const height = Math.max(160, Math.min(1200, Number(widget.config.height) || 420));
    return `<div class="qy-site-widget qy-site-widget-wide" data-qy-widget-card="${widget.id}">${title}<iframe class="qy-site-widget-iframe" src="${escapeHtml(widget.config.url || '')}" loading="lazy" style="height:${height}px"></iframe></div>`;
  }
  if (widget.type === 'status') {
    return `<div class="qy-site-widget" data-qy-widget-card="${widget.id}">${title}<div class="qy-site-widget-body qy-widget-status" data-qy-widget="status"><span class="qy-site-widget-empty">服务器状态加载中…</span></div></div>`;
  }
  return '';
}

function siteHtml() {
  const data = load();
  const widgets = data.widgets.filter((widget) => widget.visible && widget.onSite);
  if (!widgets.length) return '';
  const cards = widgets.map(renderSiteWidget).filter(Boolean).join('');
  if (!cards) return '';
  return `<section id="qy-site-widgets"><div class="qy-site-widgets-grid">${cards}</div></section>`;
}

module.exports = { load, save, defaults, siteHtml, TYPES };
