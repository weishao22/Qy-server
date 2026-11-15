'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cheerio = require('cheerio');
const blocksStore = require('./layout');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');

const SKIP_DIRS = new Set(['node_modules', '.git', '.kilo', 'data', 'site', 'server', '.vscode']);
const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'template', 'code', 'pre']);
const SHELL_IDS = ['menu-box', 'footer', 'page-loader'];

const ATTR_TARGETS = [
  { selector: 'meta[name="description"]', attr: 'content', label: 'description' },
  { selector: 'meta[name="keywords"]', attr: 'content', label: 'keywords' },
  { selector: 'meta[property="og:title"]', attr: 'content', label: 'og:title' },
  { selector: 'meta[property="og:description"]', attr: 'content', label: 'og:description' },
  { selector: 'meta[property="og:site_name"]', attr: 'content', label: 'og:site_name' },
  { selector: 'meta[http-equiv="refresh"]', attr: 'content', label: '页面跳转地址' },
  { selector: '#banner img, .carousel-item img, .welcome-image img, #content img, .content-image img, .about-content img, .gallery img, figure img', attr: 'src', label: '图片地址' },
  { selector: '#banner img, .carousel-item img, .welcome-image img, #content img, .content-image img, .about-content img, .gallery img, figure img', attr: 'alt', label: '图片说明' },
  { selector: '#content a[href], .content-box a[href]', attr: 'href', label: '链接地址' },
  { selector: 'textarea', attr: 'rows', label: '文本域行数' },
  { selector: 'textarea', attr: 'placeholder', label: '文本域提示' },
  { selector: '#content iframe, .content-box iframe', attr: 'src', label: '嵌入地址' },
  { selector: '#content iframe, .content-box iframe', attr: 'height', label: '嵌入高度' }
];

let cache = { mtime: 0, data: null };

function blankStore() {
  return { version: 2, updatedAt: null, entries: {} };
}

function loadStore() {
  let stat;
  try {
    stat = fs.statSync(CONTENT_FILE);
  } catch {
    return blankStore();
  }
  if (cache.data && cache.mtime === stat.mtimeMs) return cache.data;
  try {
    const raw = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));
    const data = { ...blankStore(), ...raw, entries: raw.entries || {} };
    cache = { mtime: stat.mtimeMs, data };
    return data;
  } catch {
    return blankStore();
  }
}

function saveStore(store) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  store.updatedAt = new Date().toISOString();
  const tmp = `${CONTENT_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(tmp, CONTENT_FILE);
  cache = { mtime: fs.statSync(CONTENT_FILE).mtimeMs, data: store };
}

function walkHtml(dir = ROOT, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      walkHtml(full, out);
    } else if (/\.html?$/i.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function toSitePath(file) {
  let rel = path.relative(ROOT, file).split(path.sep).join('/');
  if (rel.startsWith('web/')) rel = rel.slice(4);
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
}

function hashKey(value) {
  return crypto.createHash('sha1').update(value).digest('hex').slice(0, 16);
}

function shellRoot(el) {
  let cur = el;
  while (cur && cur.type === 'tag') {
    if (cur.attribs && SHELL_IDS.includes(cur.attribs.id)) return cur;
    cur = cur.parent;
  }
  return null;
}

function segment(el) {
  const tag = el.tagName.toLowerCase();
  if (el.attribs && el.attribs.id) return `${tag}#${el.attribs.id}`;
  const parent = el.parent;
  let index = 0;
  if (parent && parent.children) {
    for (const sibling of parent.children) {
      if (sibling === el) break;
      if (sibling.type === 'tag' && sibling.tagName === el.tagName) index += 1;
    }
  }
  return `${tag}[${index}]`;
}

function relPath(el, stopAt) {
  const parts = [];
  let cur = el;
  while (cur && cur.type === 'tag') {
    parts.unshift(segment(cur));
    if (cur === stopAt) break;
    if (!stopAt && cur.tagName.toLowerCase() === 'html') break;
    cur = cur.parent;
  }
  return parts.join('>');
}

function itemKey(el, sitePath, extra = '') {
  const root = shellRoot(el);
  if (root) return hashKey(`shell:${relPath(el, root)}${extra}`);
  return hashKey(`page:${sitePath}:${relPath(el, null)}${extra}`);
}

function isSkipped(el) {
  let cur = el;
  while (cur && cur.type === 'tag') {
    if (SKIP_TAGS.has(cur.tagName.toLowerCase())) return true;
    if (cur.attribs && cur.attribs['data-no-edit'] !== undefined) return true;
    cur = cur.parent;
  }
  return false;
}

function trimmedRange(text) {
  const start = (/^\s*/.exec(text) || [''])[0].length;
  const end = text.length - (/\s*$/.exec(text) || [''])[0].length;
  return { start, end, value: text.slice(start, end) };
}

function textKeyFor(node, parent, sitePath) {
  const textSiblings = (parent.children || []).filter((child) => child.type === 'text');
  const order = textSiblings.indexOf(node);
  const extra = textSiblings.length > 1 ? `::text${order}` : '::text';
  return itemKey(parent, sitePath, extra);
}

function collectPage(file, store) {
  const html = fs.readFileSync(file, 'utf8');
  const sitePath = toSitePath(file);
  const $ = cheerio.load(html, { sourceCodeLocationInfo: true });
  const items = [];

  const walk = (node) => {
    if (node.type === 'text') {
      const parent = node.parent;
      if (!parent || parent.type !== 'tag' || isSkipped(parent)) return;
      const range = trimmedRange(node.data || '');
      if (!range.value || !node.sourceCodeLocation) return;
      items.push({
        type: 'text',
        key: textKeyFor(node, parent, sitePath),
        tag: parent.tagName.toLowerCase(),
        scope: shellRoot(parent) ? 'shell' : 'page',
        source: range.value
      });
      return;
    }
    if (node.children) for (const child of node.children) walk(child);
  };
  walk($.root()[0]);

  for (const target of ATTR_TARGETS) {
    $(target.selector).each((_, el) => {
      if (!el.attribs || typeof el.attribs[target.attr] !== 'string') return;
      const value = el.attribs[target.attr].trim();
      if (!value) return;
      items.push({
        type: 'attr',
        attr: target.attr,
        key: itemKey(el, sitePath, `@${target.attr}`),
        tag: target.label,
        scope: 'page',
        source: value
      });
    });
  }

  return { file, sitePath, html, items, store };
}

function effectiveValue(entry, source) {
  if (!entry) return { value: source, overridden: false };
  if (!entry.force && entry.source !== source) {
    return { value: source, overridden: false, stale: true, stored: entry.value };
  }
  return { value: entry.value, overridden: true };
}

function listPages() {
  const store = loadStore();
  return walkHtml()
    .map((file) => {
      const page = collectPage(file, store);
      return {
        sitePath: page.sitePath,
        file: path.relative(ROOT, file).split(path.sep).join('/'),
        count: page.items.length,
        editable: page.items.filter((item) => !effectiveValue(store.entries[item.key], item.source).overridden).length
      };
    })
    .sort((a, b) => a.sitePath.localeCompare(b.sitePath));
}

function listEntries({ page, query } = {}) {
  const store = loadStore();
  const scanned = walkHtml().map((file) => collectPage(file, store));

  const usage = new Map();
  const pagesOf = new Map();
  for (const parsed of scanned) {
    for (const item of parsed.items) {
      usage.set(item.key, (usage.get(item.key) || 0) + 1);
      if (!pagesOf.has(item.key)) pagesOf.set(item.key, new Set());
      pagesOf.get(item.key).add(parsed.sitePath);
    }
  }

  const result = [];
  for (const parsed of scanned) {
    if (page && parsed.sitePath !== page) continue;
    parsed.items.forEach((item, index) => {
      const state = effectiveValue(store.entries[item.key], item.source);
      const entry = {
        id: `${parsed.sitePath}#${item.key}`,
        key: item.key,
        type: item.type,
        tag: item.tag,
        scope: item.scope,
        source: item.source,
        value: state.value,
        overridden: state.overridden,
        stale: Boolean(state.stale),
        stored: state.stored,
        shared: (usage.get(item.key) || 1) > 1,
        pages: Array.from(pagesOf.get(item.key) || []),
        index
      };
      if (query) {
        const needle = String(query).toLowerCase();
        const hay = `${entry.source} ${entry.value} ${entry.tag}`.toLowerCase();
        if (!hay.includes(needle)) return;
      }
      result.push(entry);
    });
  }
  return result;
}

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

function applyOverrides(html, sitePath, store, options = {}) {
  const editor = Boolean(options.editor);
  if (!editor && !Object.keys(store.entries).length) return html;
  const $ = cheerio.load(html, { sourceCodeLocationInfo: true });
  const splices = [];
  const injections = [];
  const tagged = new Set();

  const resolve = (key, source) => {
    const entry = store.entries[key];
    if (!entry) return null;
    if (!entry.force && entry.source !== source) return null;
    return entry.value;
  };

  const tagElement = (parent, item) => {
    if (tagged.has(parent)) return;
    tagged.add(parent);
    const loc = parent.sourceCodeLocation && parent.sourceCodeLocation.startTag;
    if (!loc) return;
    const slice = html.slice(loc.startOffset, loc.endOffset);
    const tagName = parent.tagName.toLowerCase();
    const index = slice.toLowerCase().indexOf(tagName);
    if (index < 0) return;
    const insertAt = loc.startOffset + index + tagName.length;
    injections.push({
      at: insertAt,
      text: ` data-qy-key="${item.key}" data-qy-source="${escapeAttr(item.source)}"`
    });
  };

  const walk = (node) => {
    if (node.type === 'text') {
      const parent = node.parent;
      if (!parent || parent.type !== 'tag' || isSkipped(parent)) return;
      const range = trimmedRange(node.data || '');
      if (!range.value || !node.sourceCodeLocation) return;
      const key = textKeyFor(node, parent, sitePath);
      const value = resolve(key, range.value);
      if (value !== null) {
        const loc = node.sourceCodeLocation;
        splices.push({
          start: loc.startOffset + range.start,
          end: loc.startOffset + range.end,
          text: escapeHtml(value)
        });
      }
      if (editor) tagElement(parent, { key, source: range.value });
      return;
    }
    if (node.children) for (const child of node.children) walk(child);
  };
  walk($.root()[0]);

  for (const target of ATTR_TARGETS) {
    $(target.selector).each((_, el) => {
      if (!el.attribs || typeof el.attribs[target.attr] !== 'string') return;
      const value = el.attribs[target.attr].trim();
      if (!value) return;
      const key = itemKey(el, sitePath, `@${target.attr}`);
      if (editor) {
        const loc = el.sourceCodeLocation && el.sourceCodeLocation.startTag;
        if (loc) {
          const slice = html.slice(loc.startOffset, loc.endOffset);
          const tagName = el.tagName.toLowerCase();
          const index = slice.toLowerCase().indexOf(tagName);
          if (index >= 0) {
            injections.push({
              at: loc.startOffset + index + tagName.length,
              text: ` data-qy-attr="${target.attr}" data-qy-key="${key}" data-qy-source="${escapeAttr(value)}"`
            });
          }
        }
      }
      const loc = el.sourceCodeLocation && el.sourceCodeLocation.attrs && el.sourceCodeLocation.attrs[target.attr];
      if (!loc) return;
      const next = resolve(key, value);
      if (next === null) return;
      const slice = html.slice(loc.startOffset, loc.endOffset);
      if (!/^(["'])/.test(slice)) return;
      splices.push({
        start: loc.startOffset + 1,
        end: loc.endOffset - 1,
        text: escapeAttr(next)
      });
    });
  }

  if (!splices.length && !injections.length) return html;
  const all = [
    ...splices.map((splice) => ({ at: splice.start, removeEnd: splice.end, text: splice.text })),
    ...injections.map((injection) => ({ at: injection.at, removeEnd: injection.at, text: injection.text }))
  ];
  all.sort((a, b) => b.at - a.at);
  let output = html;
  let lastStart = Infinity;
  for (const change of all) {
    if (change.removeEnd > lastStart) continue;
    output = output.slice(0, change.at) + change.text + output.slice(change.removeEnd);
    lastStart = change.at;
  }
  return output;
}

function editorBootstrap() {
  return '<script data-turbo-eval="false" src="/admin-assets/inline.js"></script>';
}

function injectEditor(html) {
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${editorBootstrap()}\n</body>`);
  }
  return html + editorBootstrap();
}

function injectClientRuntime(html) {
  const tags = [
    '<link rel="stylesheet" href="/lib/qy-blocks.css" data-qy-global="1">',
    '<script src="/lib/marked.min.js" data-qy-global="1"></script>',
    '<script src="/lib/comments-widget.js" data-qy-global="1"></script>',
    '<script src="/lib/qy-widgets.js" data-qy-global="1"></script>',
    '<script src="/lib/qy-blocks.js" data-qy-global="1"></script>',
    '<script src="/lib/qy-nav.js" data-qy-global="1"></script>'
  ].join('\n');
  let output = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${tags}\n</head>`) : tags + html;
  const fallback = [
    '<script data-qy-global="1">',
    '(function(){',
    'function ready(fn){if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",fn,{once:true});}else{fn();}}',
    'function hideLoader(){var l=document.getElementById("page-loader");if(l&&l.style.display!=="none"){l.style.opacity="0";setTimeout(function(){if(l&&l.parentNode){l.parentNode.removeChild(l);}},260);}try{document.documentElement.classList.remove("qy-no-scroll");if(document.body)document.body.classList.remove("qy-no-scroll");}catch(e){}}',
    'function buildNav(){var n=document.getElementById("menu-box");if(n)return n;if(!document.getElementById("qy-fallback-shell-style")){var s=document.createElement("style");s.id="qy-fallback-shell-style";s.textContent=".mobile-menu-btn{display:none;color:#C6CDD4;font-size:24px;cursor:pointer;padding:8px}.mobile-nav{display:none;position:absolute;top:60px;left:0;width:100%;background:rgba(255,255,255,.95);box-shadow:0 4px 15px rgba(0,0,0,.1);flex-direction:column;padding:15px 0;z-index:99}.mobile-nav.show{display:flex}.mobile-nav a{color:#5F5F5F;padding:15px 25px;font-size:18px;text-align:center}@media(max-width:768px){#desktop-nav{display:none!important}.mobile-menu-btn{display:block!important}.menu{justify-content:space-between!important}}";document.head.appendChild(s);}var d=document.createElement("div");',
    'd.id="menu-box";d.innerHTML=\'<div class="menu"><div class="logo"><h2><a href="/"><i class="fas fa-cube"></i> QYServer</a></h2></div><div class="nav-links" id="desktop-nav"><a href="/download/"><i class="fas fa-download"></i>下载</a><a href="/search/"><i class="fas fa-search"></i>查询</a><a href="/updatelog/"><i class="fas fa-history"></i>更新</a><a href="/map/"><i class="fas fa-map"></i> 地图</a><a href="/faq/"><i class="fas fa-question-circle"></i> FAQ</a><a href="/about/"><i class="fas fa-info-circle"></i> 关于</a></div><div class="mobile-menu-btn" id="mobileMenuBtn"><i class="fas fa-bars"></i></div></div><div class="mobile-nav" id="mobileNav"><a href="/download/"><i class="fas fa-download"></i>下载</a><a href="/search/"><i class="fas fa-search"></i>查询</a><a href="/updatelog/"><i class="fas fa-history"></i>更新</a><a href="/map/"><i class="fas fa-map"></i> 地图</a><a href="/faq/"><i class="fas fa-question-circle"></i> FAQ</a><a href="/about/"><i class="fas fa-info-circle"></i> 关于</a></div>\';',
    'document.body.insertBefore(d,document.body.firstChild);return d;}',
    'function buildFooter(){var f=document.getElementById("footer");if(f)return f;var d=document.createElement("footer");d.id="footer";',
    'd.innerHTML=\'<div class="footer-content"><div class="footer-section"><h3>关于我们</h3><p>QYServer是一个专注于Minecraft基岩版的生存服务器，提供稳定、有趣的游戏环境，让玩家可以自由建造、探索和社交。</p></div><div class="footer-section"><h3>快速链接</h3><div class="footer-links"><a href="/rules/"><i class="fas fa-arrow-right"></i> 服务器规则</a><a href="/command/"><i class="fas fa-arrow-right"></i> 服务器指令</a><a href="/updatelog/"><i class="fas fa-arrow-right"></i> 更新日志</a><a href="/map/"><i class="fas fa-arrow-right"></i> 网页地图</a><a href="/faq/"><i class="fas fa-arrow-right"></i> 常见问题</a><a href="/about/"><i class="fas fa-arrow-right"></i> 关于</a></div></div><div class="footer-section"><h3>联系我们</h3><div class="footer-links"><a href="mailto:qy@qyserver.cc"><i class="fas fa-envelope"></i> qy@qyserver.cc</a><a href="https://qm.qq.com/q/Ur5Pf31XMG"><i class="fab fa-qq"></i> QQ群: 1029879634</a><a href="https://discord.gg/WGcKjt7BNG"><i class="fab fa-discord"></i> Discord</a></div></div></div><div class="footer-bottom"><a href="https://github.com/weishao22/Qy-server" target="_blank">&copy; 2025-2026 QYServer 版权所有</a></div>\';',
    'document.body.appendChild(d);return d;}',
    'ready(function(){hideLoader();setTimeout(function(){buildNav();buildFooter();},400);});',
    'window.addEventListener("load",hideLoader,{once:true});',
    'setTimeout(hideLoader,2500);',
    '})();',
    '</script>'
  ].join('');
  if (/<\/body>/i.test(output)) return output.replace(/<\/body>/i, `${fallback}\n</body>`);
  return output + fallback;
}

function injectSiteWidgets(html, sitePath) {
  if (sitePath !== '/') return html;
  let widgets = '';
  try {
    widgets = require('./widgets').siteHtml();
  } catch {
    widgets = '';
  }
  if (!widgets) return html;
  const marker = /(\s*)<div class="comments-wrapper">/i;
  if (marker.test(html)) return html.replace(marker, `$1${widgets}$1$1<div class="comments-wrapper">`);
  return html.replace(/<\/body>/i, `${widgets}\n</body>`);
}

function stripTwikooCdn(html) {
  return html.replace(/<script\b[^>]*\bsrc=["'][^"']*twikoo[^"']*["'][^>]*>\s*<\/script>/gi, '');
}

function applyLayout(html, sitePath, blocks) {
  if (!blocks || !blocks.length) return html;
  const $ = cheerio.load(html);
  const body = $('body');
  if (!body.length) return html;
  const GLOBAL_JS = /\/lib\/(AllComponents\.js|all\.js|qy-nav\.js|qy-widgets\.js|qy-blocks\.js|comments-widget\.js|marked\.min\.js)(\?|$)/;
  const keepScripts = [];
  body.find('script').each((_, el) => {
    const $el = $(el);
    if ($el.attr('data-qy-global') !== undefined) return;
    const src = $el.attr('src');
    if (src && GLOBAL_JS.test(src)) return;
    keepScripts.push($.html(el));
  });
  const content = blocksStore.renderBlocks(blocks || [], { sitePath });
  body.html(`<main id="qy-blocks-page" class="qy-blocks-page">${content}</main>`);
  if (keepScripts.length) body.append(keepScripts.join('\n'));
  return $.html();
}

const FORCE_STATIC_PATHS = new Set([
  '/gallery/detail.html',
  '/faq/', '/faq', '/faq/problem.html'
]);

function renderPage(file, options = {}) {
  const html = stripTwikooCdn(fs.readFileSync(file, 'utf8'));
  // 重要：区块覆盖会替换整页 body，并丢弃 AllComponents.js 等脚本，
  // 导致导航、轮播、弹窗、图廊详情、更新日志等原版功能全部失效。
  // 这里停用区块覆盖，直接输出原版静态页面；页面数据统一由数据库 API 提供。
  let output = injectClientRuntime(html);
  return output;
}

function saveEntries(changes) {
  const store = loadStore();
  let updated = 0;
  let removed = 0;

  for (const change of changes || []) {
    if (!change || typeof change.key !== 'string') continue;
    if (change.value === null || change.value === undefined) {
      if (store.entries[change.key]) {
        delete store.entries[change.key];
        removed += 1;
      }
      continue;
    }
    const source = typeof change.source === 'string' ? change.source : '';
    const value = String(change.value);
    if (value === source && !change.force) {
      if (store.entries[change.key]) {
        delete store.entries[change.key];
        removed += 1;
      }
      continue;
    }
    store.entries[change.key] = {
      value,
      source,
      force: Boolean(change.force),
      pages: Array.isArray(change.pages) ? change.pages.slice(0, 40) : [],
      updatedAt: new Date().toISOString()
    };
    updated += 1;
  }

  saveStore(store);
  return { updated, removed, total: Object.keys(store.entries).length };
}

function stats() {
  const store = loadStore();
  return { overrides: Object.keys(store.entries).length, updatedAt: store.updatedAt };
}

module.exports = {
  ROOT,
  DATA_DIR,
  walkHtml,
  toSitePath,
  listPages,
  listEntries,
  renderPage,
  saveEntries,
  stats,
  loadStore
};
