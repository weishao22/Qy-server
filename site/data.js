'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

const JSON_FILES = [
  { file: 'Configs/commands.json', label: '服务器指令数据', route: '/Configs/commands.json' },
  { file: 'Configs/nav.json', label: '网站导航数据', route: '/Configs/nav.json' },
  { file: 'Configs/updata.json', label: '更新日志数据', route: '/Configs/updata.json' },
  { file: 'Configs/images.json', label: '游戏图廊数据', route: '/Configs/images.json' },
  { file: 'Configs/timeline.json', label: '发展历程数据', route: '/Configs/timeline.json' },
  { file: 'Configs/dontShowPopup.json', label: '弹窗公告数据', route: '/Configs/dontShowPopup.json' }
];

const JS_FILES = [
  { file: 'Configs/faq/faqList.js', label: 'FAQ 问题列表', route: '/Configs/faq/faqList.js', variable: 'problems' }
];

const MD_DIR = 'Configs/faq/md';

const TPL_FILES = [
  {
    file: 'lib/AllComponents.js',
    label: '全站外壳（导航栏 / 页脚 / 加载动画）',
    route: '/lib/AllComponents.js',
    templates: ['loaderHTML', 'navbarHTML', 'footerHTML', 'musicHTML']
  }
];

const STRING_FILES = [
  { file: 'lib/all.js', label: '全站脚本提示文字', route: '/lib/all.js' },
  { file: 'live/danmaku.js', label: '直播间弹幕提示文字', route: '/live/danmaku.js' },
  { file: 'live/video-player.js', label: '直播播放器界面文字', route: '/live/video-player.js' },
  { file: 'search/assets/status.js', label: '状态查询界面文字', route: '/search/assets/status.js' },
  { file: 'updatelog/main.js', label: '更新日志界面文字', route: '/updatelog/main.js' },
  { file: 'tools/ai/ai.js', label: 'AI 助手界面文字', route: '/tools/ai/ai.js' },
  { file: 'lib/easter-eggs.js', label: '彩蛋文字', route: '/lib/easter-eggs.js' }
];

function hashKey(value) {
  return crypto.createHash('sha1').update(value).digest('hex').slice(0, 16);
}

function safeFile(relFile) {
  const normalized = path.posix.normalize(relFile).replace(/^\/+/, '');
  if (normalized.includes('..')) return null;
  if (!normalized.startsWith('Configs/')) return null;
  const full = path.join(ROOT, normalized.split('/').join(path.sep));
  if (!full.startsWith(ROOT)) return null;
  return full;
}

function flatten(value, pointer, out) {
  if (typeof value === 'string') {
    out.push({ pointer, value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, `${pointer}/${index}`, out));
    return;
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      flatten(value[key], `${pointer}/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`, out);
    }
  }
}

function pointerParts(pointer) {
  return pointer
    .split('/')
    .slice(1)
    .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function getAt(root, pointer) {
  let cur = root;
  for (const part of pointerParts(pointer)) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = cur[part];
  }
  return cur;
}

function setAt(root, pointer, value) {
  const parts = pointerParts(pointer);
  let cur = root;
  for (let i = 0; i < parts.length - 1; i += 1) {
    cur = cur[parts[i]];
    if (cur === null || typeof cur !== 'object') return;
  }
  cur[parts[parts.length - 1]] = value;
}

function entryKey(kind, relFile, pointer) {
  return hashKey(`data:${kind}:${relFile}:${pointer}`);
}

function jsonEntries(meta, store) {
  const full = safeFile(meta.file);
  if (!full || !fs.existsSync(full)) return [];
  const raw = fs.readFileSync(full, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  const leaves = [];
  flatten(data, '', leaves);
  return leaves.map((leaf) => {
    const key = entryKey('json', meta.file, leaf.pointer);
    const entry = store.entries[key];
    let value = leaf.value;
    let overridden = false;
    let stale = false;
    let stored = undefined;
    if (entry) {
      if (!entry.force && entry.source !== leaf.value) {
        stale = true;
        stored = entry.value;
      } else {
        value = entry.value;
        overridden = true;
      }
    }
    return {
      id: `${meta.route}#${key}`,
      key,
      type: 'json',
      tag: pointerLabel(leaf.pointer),
      source: leaf.value,
      value,
      overridden,
      stale,
      stored,
      shared: false,
      pages: [meta.route],
      file: meta.file,
      pointer: leaf.pointer
    };
  });
}

function pointerLabel(pointer) {
  const parts = pointerParts(pointer);
  if (!parts.length) return 'root';
  return parts
    .map((part) => (/^\d+$/.test(part) ? `[${part}]` : part))
    .join('.')
    .replace(/\.\[/g, '[');
}

function parseJsArray(file, variable) {
  const source = fs.readFileSync(file, 'utf8');
  const pattern = new RegExp(`(?:const|let|var)\\s+${variable}\\s*=\\s*`);
  const match = pattern.exec(source);
  if (!match) return null;
  const start = source.indexOf('[', match.index + match[0].length);
  if (start < 0) return null;
  let depth = 0;
  let inString = null;
  let escaped = false;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === inString) inString = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      inString = char;
      continue;
    }
    if (char === '[') depth += 1;
    else if (char === ']') {
      depth -= 1;
      if (depth === 0) {
        const literal = source.slice(start, i + 1);
        try {
          const data = new Function(`return (${literal});`)();
          return { data, prefix: source.slice(0, start), literal };
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function jsEntries(meta, store) {
  const full = safeFile(meta.file);
  if (!full || !fs.existsSync(full)) return [];
  const parsed = parseJsArray(full, meta.variable);
  if (!parsed) return [];
  const leaves = [];
  flatten(parsed.data, '', leaves);
  return leaves.map((leaf) => {
    const key = entryKey('js', meta.file, leaf.pointer);
    const entry = store.entries[key];
    let value = leaf.value;
    let overridden = false;
    let stale = false;
    let stored = undefined;
    if (entry) {
      if (!entry.force && entry.source !== leaf.value) {
        stale = true;
        stored = entry.value;
      } else {
        value = entry.value;
        overridden = true;
      }
    }
    return {
      id: `${meta.route}#${key}`,
      key,
      type: 'js',
      tag: pointerLabel(leaf.pointer),
      source: leaf.value,
      value,
      overridden,
      stale,
      stored,
      shared: false,
      pages: [meta.route],
      file: meta.file,
      pointer: leaf.pointer
    };
  });
}

function mdFiles() {
  const dir = path.join(ROOT, MD_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => /\.md$/i.test(name))
    .sort()
    .map((name) => {
      const rel = `${MD_DIR}/${name}`;
      return { file: rel, label: `FAQ 文档 ${name}`, route: `/${rel}` };
    });
}

function mdEntries(meta, store) {
  const full = safeFile(meta.file);
  if (!full || !fs.existsSync(full)) return [];
  const content = fs.readFileSync(full, 'utf8');
  const key = entryKey('md', meta.file, '');
  const entry = store.entries[key];
  let value = content;
  let overridden = false;
  let stale = false;
  let stored = undefined;
  if (entry) {
    if (!entry.force && entry.source !== content) {
      stale = true;
      stored = entry.value;
    } else {
      value = entry.value;
      overridden = true;
    }
  }
  return [
    {
      id: `${meta.route}#${key}`,
      key,
      type: 'md',
      tag: '整篇文档',
      source: content,
      value,
      overridden,
      stale,
      stored,
      shared: false,
      pages: [meta.route],
      file: meta.file,
      pointer: ''
    }
  ];
}

function allSources() {
  const json = JSON_FILES.map((item) => ({ ...item, kind: 'json' }));
  const js = JS_FILES.map((item) => ({ ...item, kind: 'js' }));
  const md = mdFiles().map((item) => ({ ...item, kind: 'md' }));
  return [...json, ...js, ...md];
}

function listSources(store) {
  return allSources()
    .map((meta) => {
      let entries = [];
      if (meta.kind === 'json') entries = jsonEntries(meta, store);
      else if (meta.kind === 'js') entries = jsEntries(meta, store);
      else entries = mdEntries(meta, store);
      return {
        route: meta.route,
        file: meta.file,
        label: meta.label,
        kind: meta.kind,
        count: entries.length,
        overrides: entries.filter((entry) => entry.overridden).length
      };
    })
    .filter((source) => source.count > 0);
}

function listEntries(route, store, query) {
  const meta = allSources().find((item) => item.route === route);
  if (!meta) return [];
  let entries;
  if (meta.kind === 'json') entries = jsonEntries(meta, store);
  else if (meta.kind === 'js') entries = jsEntries(meta, store);
  else entries = mdEntries(meta, store);
  if (!query) return entries;
  const needle = String(query).toLowerCase();
  return entries.filter((entry) => {
    const hay = `${entry.source} ${entry.value} ${entry.tag}`.toLowerCase();
    return hay.includes(needle);
  });
}

function patchJson(meta, store) {
  const full = safeFile(meta.file);
  if (!full || !fs.existsSync(full)) return null;
  const raw = fs.readFileSync(full, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return raw;
  }
  let changed = false;
  const leaves = [];
  flatten(data, '', leaves);
  for (const leaf of leaves) {
    const key = entryKey('json', meta.file, leaf.pointer);
    const entry = store.entries[key];
    if (!entry) continue;
    if (!entry.force && entry.source !== leaf.value) continue;
    setAt(data, leaf.pointer, entry.value);
    changed = true;
  }
  if (!changed) return raw;
  return JSON.stringify(data, null, 4);
}

function patchJs(meta, store) {
  const full = safeFile(meta.file);
  if (!full || !fs.existsSync(full)) return null;
  const raw = fs.readFileSync(full, 'utf8');
  const parsed = parseJsArray(full, meta.variable);
  if (!parsed) return raw;
  let changed = false;
  const leaves = [];
  flatten(parsed.data, '', leaves);
  for (const leaf of leaves) {
    const key = entryKey('js', meta.file, leaf.pointer);
    const entry = store.entries[key];
    if (!entry) continue;
    if (!entry.force && entry.source !== leaf.value) continue;
    setAt(parsed.data, leaf.pointer, entry.value);
    changed = true;
  }
  if (!changed) return raw;
  const tail = raw.slice(raw.indexOf(parsed.literal) + parsed.literal.length).replace(/^\s*;?/, ';');
  return `${parsed.prefix}${JSON.stringify(parsed.data, null, 4)}${tail}`;
}

function patchMd(meta, store) {
  const full = safeFile(meta.file);
  if (!full || !fs.existsSync(full)) return null;
  const content = fs.readFileSync(full, 'utf8');
  const key = entryKey('md', meta.file, '');
  const entry = store.entries[key];
  if (!entry) return content;
  if (!entry.force && entry.source !== content) return content;
  return entry.value;
}

function routeInfo(route) {
  return allSources().find((item) => item.route === route) || null;
}

function patchRoute(route, store) {
  const meta = routeInfo(route);
  if (!meta) return null;
  if (meta.kind === 'json') return patchJson(meta, store);
  if (meta.kind === 'js') return patchJs(meta, store);
  return patchMd(meta, store);
}

module.exports = {
  listSources,
  listEntries,
  patchRoute,
  routeInfo,
  allSources
};
