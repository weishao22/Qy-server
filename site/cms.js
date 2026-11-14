'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cheerio = require('cheerio');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');

const SKIP_DIRS = new Set(['node_modules', '.git', '.kilo', 'data', 'site', 'server', 'test', '.vscode']);
const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'template', 'code', 'pre']);
const SHELL_IDS = ['menu-box', 'footer', 'page-loader'];

const ATTR_TARGETS = [
  { selector: 'meta[name="description"]', attr: 'content', label: 'description' },
  { selector: 'meta[name="keywords"]', attr: 'content', label: 'keywords' },
  { selector: 'meta[property="og:title"]', attr: 'content', label: 'og:title' },
  { selector: 'meta[property="og:description"]', attr: 'content', label: 'og:description' },
  { selector: 'meta[property="og:site_name"]', attr: 'content', label: 'og:site_name' }
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
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
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
    '<script src="/lib/comments-widget.js" data-qy-global="1"></script>',
    '<script src="/lib/qy-widgets.js" data-qy-global="1"></script>',
    '<script src="/lib/qy-nav.js" data-qy-global="1"></script>'
  ].join('\n');
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${tags}\n</head>`);
  return tags + html;
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

function renderPage(file, options = {}) {
  const html = stripTwikooCdn(fs.readFileSync(file, 'utf8'));
  const store = loadStore();
  const sitePath = toSitePath(file);
  let output = applyOverrides(html, sitePath, store, options);
  output = injectClientRuntime(output);
  output = injectSiteWidgets(output, sitePath);
  if (options.editor) output = injectEditor(output);
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
