'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const settings = require('./settings');

const FILE = path.join(settings.DATA_DIR, 'pages-layout.json');
let cache = { mtime: 0, data: null };

/* ---------------- 模块库定义（后台编辑菜单使用） ---------------- */

const TYPES = [
  {
    type: 'hero',
    label: '顶部横幅',
    group: '布局',
    defaults: {
      title: 'QYServer',
      subtitle: '生存 · 养老 · 基岩版',
      bg: 'linear-gradient(135deg,#f8a5c2 0%,#a56de2 100%)',
      image: '',
      buttons: [{ label: '加入我们', url: '/' }, { label: '在线查询', url: '/search/' }]
    },
    fields: [
      { key: 'title', label: '主标题', type: 'text' },
      { key: 'subtitle', label: '副标题', type: 'textarea' },
      { key: 'bg', label: '背景（CSS 渐变或颜色）', type: 'text' },
      { key: 'image', label: '背景图片地址', type: 'url' },
      { key: 'buttons', label: '按钮（每行：文字|链接）', type: 'buttons' }
    ]
  },
  {
    type: 'heading',
    label: '标题',
    group: '文本',
    defaults: { text: '新的标题', level: 2 },
    fields: [
      { key: 'text', label: '标题文字', type: 'text' },
      { key: 'level', label: '级别', type: 'select', options: [{ value: 1, label: 'H1' }, { value: 2, label: 'H2' }, { value: 3, label: 'H3' }] }
    ]
  },
  {
    type: 'text',
    label: '富文本',
    group: '文本',
    defaults: { html: '<p>在这里输入内容，支持 HTML。</p>' },
    fields: [{ key: 'html', label: 'HTML 内容', type: 'textarea', rows: 8 }]
  },
  {
    type: 'markdown',
    label: 'Markdown',
    group: '文本',
    defaults: { text: '## 标题\n\n支持 **Markdown** 语法。' },
    fields: [{ key: 'text', label: 'Markdown 内容', type: 'textarea', rows: 8 }]
  },
  {
    type: 'quote',
    label: '引用',
    group: '文本',
    defaults: { text: '一句话，温暖一整天。', cite: '' },
    fields: [
      { key: 'text', label: '引用内容', type: 'textarea' },
      { key: 'cite', label: '出处', type: 'text' }
    ]
  },
  {
    type: 'notice',
    label: '公告条',
    group: '文本',
    defaults: { title: '公告', text: '这里是一条公告内容。', tone: 'pink' },
    fields: [
      { key: 'title', label: '标题', type: 'text' },
      { key: 'text', label: '内容', type: 'textarea' },
      { key: 'tone', label: '风格', type: 'select', options: [{ value: 'pink', label: '粉色' }, { value: 'warn', label: '警示' }, { value: 'plain', label: '朴素' }] }
    ]
  },
  {
    type: 'image',
    label: '图片',
    group: '媒体',
    defaults: { src: '', alt: '', caption: '', width: '100%' },
    fields: [
      { key: 'src', label: '图片地址', type: 'url' },
      { key: 'alt', label: '替代文字', type: 'text' },
      { key: 'caption', label: '图片说明', type: 'text' },
      { key: 'width', label: '宽度（如 100% / 520px）', type: 'text' }
    ]
  },
  {
    type: 'carousel',
    label: '图片轮播',
    group: '媒体',
    defaults: { images: [] },
    fields: [{ key: 'images', label: '图片（每行：地址|说明）', type: 'images' }]
  },
  {
    type: 'gallery',
    label: '图片墙',
    group: '媒体',
    defaults: { images: [] },
    fields: [{ key: 'images', label: '图片（每行：地址|说明）', type: 'images' }]
  },
  {
    type: 'video',
    label: '视频',
    group: '媒体',
    defaults: { url: '', poster: '', height: 420 },
    fields: [
      { key: 'url', label: '视频地址（mp4 或嵌入页）', type: 'url' },
      { key: 'poster', label: '封面图', type: 'url' },
      { key: 'height', label: '高度（像素）', type: 'number' }
    ]
  },
  {
    type: 'card',
    label: '信息卡片',
    group: '内容',
    defaults: { title: '卡片标题', text: '卡片内容说明。', buttonLabel: '', buttonUrl: '' },
    fields: [
      { key: 'title', label: '标题', type: 'text' },
      { key: 'text', label: '内容', type: 'textarea' },
      { key: 'buttonLabel', label: '按钮文字', type: 'text' },
      { key: 'buttonUrl', label: '按钮链接', type: 'url' }
    ]
  },
  {
    type: 'cards',
    label: '卡片网格',
    group: '内容',
    defaults: { items: [] },
    fields: [{ key: 'items', label: '卡片（每行：图标类|标题|描述|链接）', type: 'lines', columns: 4 }]
  },
  {
    type: 'list',
    label: '列表',
    group: '内容',
    defaults: { title: '', items: [] },
    fields: [
      { key: 'title', label: '标题', type: 'text' },
      { key: 'items', label: '列表项（每行一条）', type: 'lines', columns: 1 }
    ]
  },
  {
    type: 'stats',
    label: '数据统计',
    group: '内容',
    defaults: { items: [] },
    fields: [{ key: 'items', label: '统计（每行：标签|数值）', type: 'lines', columns: 2 }]
  },
  {
    type: 'timeline',
    label: '时间线',
    group: '内容',
    defaults: { items: [] },
    fields: [{ key: 'items', label: '节点（每行：日期|标题|描述）', type: 'lines', columns: 3 }]
  },
  {
    type: 'links',
    label: '快捷链接',
    group: '导航',
    defaults: { title: '快捷链接', links: [] },
    fields: [
      { key: 'title', label: '标题', type: 'text' },
      { key: 'links', label: '链接（每行：文字|地址|图标类）', type: 'links' }
    ]
  },
  {
    type: 'status',
    label: 'MC 服务器状态',
    group: '动态',
    defaults: { title: '服务器状态' },
    fields: [{ key: 'title', label: '标题', type: 'text' }]
  },
  {
    type: 'chart',
    label: '在线人数图表',
    group: '动态',
    defaults: { title: '服务器在线人数', hours: 2 },
    fields: [
      { key: 'title', label: '标题', type: 'text' },
      { key: 'hours', label: '显示小时数（1~24）', type: 'number' }
    ]
  },
  {
    type: 'comments',
    label: '评论区',
    group: '动态',
    defaults: { title: '玩家评论' },
    fields: [
      { key: 'title', label: '标题', type: 'text' },
      { key: 'path', label: '评论路径（留空=当前页面）', type: 'text' }
    ]
  },
  {
    type: 'changelog',
    label: '更新日志',
    group: '动态',
    defaults: { title: '更新日志', limit: 0 },
    fields: [
      { key: 'title', label: '标题', type: 'text' },
      { key: 'limit', label: '显示条数（0=全部）', type: 'number' }
    ]
  },
  {
    type: 'commands',
    label: '服务器指令',
    group: '动态',
    defaults: { title: '服务器指令' },
    fields: [{ key: 'title', label: '标题', type: 'text' }]
  },
  {
    type: 'navdata',
    label: '导航（数据库）',
    group: '导航',
    defaults: { title: '快速导航' },
    fields: [{ key: 'title', label: '标题', type: 'text' }]
  },
  {
    type: 'timelineData',
    label: '发展历程（数据库）',
    group: '内容',
    defaults: { title: '发展历程' },
    fields: [{ key: 'title', label: '标题', type: 'text' }]
  },
  {
    type: 'galleryData',
    label: '图廊（数据库）',
    group: '媒体',
    defaults: { title: '图廊', limit: 0 },
    fields: [
      { key: 'title', label: '标题', type: 'text' },
      { key: 'limit', label: '显示数量（0=全部）', type: 'number' }
    ]
  },
  {
    type: 'iframe',
    label: '嵌入网页',
    group: '动态',
    defaults: { url: '', height: 460 },
    fields: [
      { key: 'url', label: '地址', type: 'url' },
      { key: 'height', label: '高度（像素）', type: 'number' }
    ]
  },
  {
    type: 'html',
    label: '自定义 HTML',
    group: '高级',
    defaults: { html: '' },
    fields: [{ key: 'html', label: 'HTML', type: 'textarea', rows: 10 }]
  },
  {
    type: 'raw',
    label: '原页面内容',
    group: '高级',
    defaults: { html: '' },
    fields: [{ key: 'html', label: 'HTML', type: 'textarea', rows: 12 }]
  },
  {
    type: 'divider',
    label: '分割线',
    group: '布局',
    defaults: {},
    fields: []
  },
  {
    type: 'spacer',
    label: '间距',
    group: '布局',
    defaults: { height: 40 },
    fields: [{ key: 'height', label: '高度（像素）', type: 'number' }]
  }
];

const TYPE_MAP = new Map(TYPES.map((item) => [item.type, item]));

/* ---------------- 存储 ---------------- */

function blank() {
  return { version: 1, pages: {} };
}

function normalizeBlock(block) {
  const meta = TYPE_MAP.get(block && block.type);
  return {
    id: String((block && block.id) || `b-${crypto.randomBytes(4).toString('hex')}`),
    type: String((block && block.type) || 'text'),
    props: Object.assign({}, meta ? meta.defaults : {}, (block && block.props && typeof block.props === 'object') ? block.props : {})
  };
}

function normalizePath(p) {
  let value = String(p || '/').split('?')[0];
  if (!value.startsWith('/')) value = '/' + value;
  if (value.length > 1 && !value.endsWith('/')) value += '/';
  return value;
}

function load() {
  let stat;
  try {
    stat = fs.statSync(FILE);
  } catch {
    return blank();
  }
  if (cache.data && cache.mtime === stat.mtimeMs) return cache.data;
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    const pages = {};
    if (raw && raw.pages && typeof raw.pages === 'object') {
      for (const key of Object.keys(raw.pages)) {
        const list = Array.isArray(raw.pages[key]) ? raw.pages[key] : [];
        pages[normalizePath(key)] = list.filter((b) => b && b.type).map(normalizeBlock);
      }
    }
    const data = { version: 1, pages };
    cache = { mtime: stat.mtimeMs, data };
    return data;
  } catch {
    return blank();
  }
}

function persist(data) {
  fs.mkdirSync(settings.DATA_DIR, { recursive: true });
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, FILE);
  cache = { mtime: fs.statSync(FILE).mtimeMs, data };
}

function getLayout(sitePath) {
  const data = load();
  const key = normalizePath(sitePath);
  if (!Object.prototype.hasOwnProperty.call(data.pages, key)) return null;
  return data.pages[key];
}

function setLayout(sitePath, blocks) {
  const data = load();
  const key = normalizePath(sitePath);
  data.pages[key] = (Array.isArray(blocks) ? blocks : []).filter((b) => b && b.type).map(normalizeBlock);
  persist(data);
  return data.pages[key];
}

function removeLayout(sitePath) {
  const data = load();
  const key = normalizePath(sitePath);
  if (Object.prototype.hasOwnProperty.call(data.pages, key)) {
    delete data.pages[key];
    persist(data);
    return true;
  }
  return false;
}

/* ---------------- 渲染 ---------------- */

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeImages(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => (typeof item === 'string' ? { src: item, alt: '' } : item || {}))
    .filter((item) => item.src)
    .map((item) => ({ src: String(item.src), alt: String(item.alt || ''), link: String(item.link || '') }));
}

function bodyHtml(type, props, ctx) {
  const p = props || {};
  switch (type) {
    case 'hero': {
      const style = p.image
        ? `background:linear-gradient(135deg,rgba(248,165,194,.82),rgba(165,109,226,.82)),url('${esc(p.image)}') center/cover;`
        : `background:${esc(p.bg || 'linear-gradient(135deg,#f8a5c2,#a56de2)')};`;
      const buttons = (Array.isArray(p.buttons) ? p.buttons : [])
        .filter((b) => b && (b.label || b.url))
        .map((b) => `<a class="qy-hero-btn" href="${esc(b.url || '#')}">${esc(b.label || b.url)}</a>`)
        .join('');
      return `<section class="qy-block qy-hero" style="${style}"><div class="qy-hero-inner">` +
        `<h1>${esc(p.title || '')}</h1><p>${esc(p.subtitle || '')}</p>` +
        (buttons ? `<div class="qy-hero-actions">${buttons}</div>` : '') +
        `</div></section>`;
    }
    case 'heading': {
      const level = Math.min(6, Math.max(1, Number(p.level) || 2));
      return `<section class="qy-block"><h${level} class="qy-heading">${esc(p.text || '')}</h${level}></section>`;
    }
    case 'text':
      return `<section class="qy-block qy-text">${p.html || ''}</section>`;
    case 'markdown':
      return `<section class="qy-block"><div class="qy-md" data-qy-md>${esc(p.text || '')}</div></section>`;
    case 'quote':
      return `<section class="qy-block"><blockquote class="qy-quote">${esc(p.text || '')}` +
        (p.cite ? `<cite>—— ${esc(p.cite)}</cite>` : '') + `</blockquote></section>`;
    case 'notice':
      return `<section class="qy-block"><div class="qy-notice qy-notice-${esc(p.tone || 'pink')}">` +
        (p.title ? `<strong>${esc(p.title)}</strong>` : '') + `<div>${esc(p.text || '').replace(/\r?\n/g, '<br>')}</div></div></section>`;
    case 'image':
      if (!p.src) return '';
      return `<section class="qy-block qy-figure" style="max-width:${esc(p.width || '100%')}">` +
        `<img src="${esc(p.src)}" alt="${esc(p.alt || '')}" loading="lazy">` +
        (p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : '') + `</section>`;
    case 'carousel': {
      const images = normalizeImages(p.images);
      if (!images.length) return '';
      const slides = images.map((img) => `<div class="qy-carousel-slide">` +
        (img.link ? `<a href="${esc(img.link)}">` : '') +
        `<img src="${esc(img.src)}" alt="${esc(img.alt)}" loading="lazy">` +
        (img.link ? `</a>` : '') +
        (img.alt ? `<span>${esc(img.alt)}</span>` : '') + `</div>`).join('');
      return `<section class="qy-block"><div class="qy-carousel">${slides}</div></section>`;
    }
    case 'gallery': {
      const images = normalizeImages(p.images);
      if (!images.length) return '';
      return `<section class="qy-block"><div class="qy-gallery">` + images.map((img) =>
        `<figure><img src="${esc(img.src)}" alt="${esc(img.alt)}" loading="lazy">` +
        (img.alt ? `<figcaption>${esc(img.alt)}</figcaption>` : '') + `</figure>`).join('') + `</div></section>`;
    }
    case 'video': {
      if (!p.url) return '';
      const height = Math.max(160, Math.min(1200, Number(p.height) || 420));
      if (/\.(mp4|webm|ogg)(\?|$)/i.test(p.url)) {
        return `<section class="qy-block"><video class="qy-video" controls ${p.poster ? `poster="${esc(p.poster)}"` : ''} src="${esc(p.url)}"></video></section>`;
      }
      return `<section class="qy-block"><iframe class="qy-iframe" style="height:${height}px" src="${esc(p.url)}" allowfullscreen loading="lazy"></iframe></section>`;
    }
    case 'card': {
      const button = p.buttonLabel
        ? `<a class="qy-card-btn" href="${esc(p.buttonUrl || '#')}">${esc(p.buttonLabel)}</a>`
        : '';
      return `<section class="qy-block"><div class="qy-card"><h3>${esc(p.title || '')}</h3>` +
        `<div class="qy-card-text">${esc(p.text || '').replace(/\r?\n/g, '<br>')}</div>${button}</div></section>`;
    }
    case 'cards': {
      const items = Array.isArray(p.items) ? p.items : [];
      if (!items.length) return '';
      return `<section class="qy-block"><div class="qy-cards">` + items.map((item) => {
        const icon = item.icon || item.i || '';
        const link = item.link || item.url || '';
        const inner = `${icon ? `<i class="${esc(icon)}"></i>` : ''}<h3>${esc(item.title || '')}</h3><p>${esc(item.text || item.desc || '')}</p>`;
        return link ? `<a class="qy-card-grid-item" href="${esc(link)}">${inner}</a>` : `<div class="qy-card-grid-item">${inner}</div>`;
      }).join('') + `</div></section>`;
    }
    case 'list': {
      const items = Array.isArray(p.items) ? p.items : [];
      if (!items.length) return '';
      return `<section class="qy-block"><div class="qy-list-block">` +
        (p.title ? `<h3>${esc(p.title)}</h3>` : '') +
        `<ul>` + items.map((item) => `<li>${esc(typeof item === 'string' ? item : (item.text || item.title || ''))}</li>`).join('') + `</ul></div></section>`;
    }
    case 'stats': {
      const items = Array.isArray(p.items) ? p.items : [];
      if (!items.length) return '';
      return `<section class="qy-block"><div class="qy-stats">` + items.map((item) =>
        `<div class="qy-stat"><span class="qy-stat-value">${esc(item.value || item.v || '')}</span>` +
        `<span class="qy-stat-label">${esc(item.label || item.text || '')}</span></div>`).join('') + `</div></section>`;
    }
    case 'timeline': {
      const items = Array.isArray(p.items) ? p.items : [];
      if (!items.length) return '';
      return `<section class="qy-block"><div class="qy-timeline">` + items.map((item) =>
        `<div class="qy-timeline-item"><div class="qy-timeline-date">${esc(item.date || '')}</div>` +
        `<div class="qy-timeline-body">${item.title ? `<h3>${esc(item.title)}</h3>` : ''}` +
        `<p>${esc(item.text || item.desc || '')}</p></div></div>`).join('') + `</div></section>`;
    }
    case 'links': {
      const links = Array.isArray(p.links) ? p.links : [];
      return `<section class="qy-block"><div class="qy-links-block">` +
        (p.title ? `<h3>${esc(p.title)}</h3>` : '') +
        `<div class="qy-links">` + links.filter((l) => l && l.url).map((l) =>
          `<a href="${esc(l.url)}">${l.icon ? `<i class="${esc(l.icon)}"></i>` : ''} ${esc(l.label || l.url)}</a>`).join('') +
        `</div></div></section>`;
    }
    case 'status':
      return `<section class="qy-block"><div class="qy-status-card"><h3>${esc(p.title || '服务器状态')}</h3>` +
        `<div class="qy-widget-status" data-qy-widget="status"><span class="qy-site-widget-empty">服务器状态加载中…</span></div></div></section>`;
    case 'chart': {
      const hours = Math.max(1, Math.min(24, Number(p.hours) || 2));
      return `<section class="qy-block"><div class="qy-chart-card"><h3 class="qy-chart-title">${esc(p.title || '服务器在线人数')}</h3>` +
        `<canvas class="qy-chart-canvas" data-qy-chart data-hours="${hours}"></canvas></div></section>`;
    }
    case 'comments': {
      const commentPath = p.path || (ctx && ctx.sitePath) || '/';
      return `<section class="qy-block"><div class="qy-comments-block"><h3>${esc(p.title || '玩家评论')}</h3>` +
        `<div class="qy-comments-mount" data-qy-comments data-qy-path="${esc(commentPath)}"></div></div></section>`;
    }
    case 'changelog':
      return `<section class="qy-block"><div class="qy-data-block"><h3 class="qy-data-title">${esc(p.title || '更新日志')}</h3>` +
        `<div class="qy-data" data-qy-data="changelog" data-limit="${Math.max(0, Number(p.limit) || 0)}">` +
        `<div class="qy-data-loading">加载中…</div></div></div></section>`;
    case 'commands':
      return `<section class="qy-block"><div class="qy-data-block"><h3 class="qy-data-title">${esc(p.title || '服务器指令')}</h3>` +
        `<div class="qy-data" data-qy-data="commands"><div class="qy-data-loading">加载中…</div></div></div></section>`;
    case 'navdata':
      return `<section class="qy-block"><div class="qy-data-block"><h3 class="qy-data-title">${esc(p.title || '快速导航')}</h3>` +
        `<div class="qy-data" data-qy-data="nav"><div class="qy-data-loading">加载中…</div></div></div></section>`;
    case 'timelineData':
      return `<section class="qy-block"><div class="qy-data-block"><h3 class="qy-data-title">${esc(p.title || '发展历程')}</h3>` +
        `<div class="qy-data" data-qy-data="timeline"><div class="qy-data-loading">加载中…</div></div></div></section>`;
    case 'galleryData':
      return `<section class="qy-block"><div class="qy-data-block"><h3 class="qy-data-title">${esc(p.title || '图廊')}</h3>` +
        `<div class="qy-data" data-qy-data="gallery" data-limit="${Math.max(0, Number(p.limit) || 0)}">` +
        `<div class="qy-data-loading">加载中…</div></div></div></section>`;
    case 'iframe': {
      if (!p.url) return '';
      const height = Math.max(160, Math.min(1600, Number(p.height) || 460));
      return `<section class="qy-block"><iframe class="qy-iframe" style="height:${height}px" src="${esc(p.url)}" loading="lazy"></iframe></section>`;
    }
    case 'html':
    case 'raw':
      return `<section class="qy-block qy-raw">${p.html || ''}</section>`;
    case 'divider':
      return `<section class="qy-block"><hr class="qy-divider"></section>`;
    case 'spacer':
      return `<section class="qy-block" style="height:${Math.max(0, Math.min(400, Number(p.height) || 40))}px"></section>`;
    default:
      return '';
  }
}

function emptyPlaceholder(label, type) {
  return `<section class="qy-block qy-block-empty" data-empty-type="${esc(type)}">空区块：${esc(label)}（编辑模式下可编辑或删除，正式页面不显示）</section>`;
}

function renderBlocks(blocks, ctx) {
  return (Array.isArray(blocks) ? blocks : []).map((block) => {
    const meta = TYPE_MAP.get(block.type);
    if (!meta) return '';
    let inner = bodyHtml(block.type, block.props, ctx);
    if (!inner) inner = emptyPlaceholder(meta.label, block.type);
    return inner.replace(/^<section class="qy-block/, `<section data-block-id="${esc(block.id)}" data-block-type="${esc(block.type)}" data-block-label="${esc(meta.label)}" class="qy-block`);
  }).join('');
}

module.exports = {
  TYPES,
  getLayout,
  setLayout,
  removeLayout,
  renderBlocks,
  normalizePath,
  load
};
