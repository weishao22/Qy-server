'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cheerio = require('cheerio');

const ROOT = path.resolve(__dirname, '..');

const HTML_TEMPLATES = [
  { file: 'lib/AllComponents.js', label: '全站外壳（导航栏 / 页脚 / 加载动画）', templates: ['navbarHTML', 'footerHTML', 'loaderHTML', 'musicHTML'] }
];

const SCRIPT_FILES = [
  { file: 'lib/all.js', label: '全站脚本提示文字' },
  { file: 'live/danmaku.js', label: '直播间弹幕提示文字' },
  { file: 'live/video-player.js', label: '直播播放器界面文字' },
  { file: 'search/assets/status.js', label: '状态查询界面文字' },
  { file: 'updatelog/main.js', label: '更新日志界面文字' },
  { file: 'tools/ai/ai.js', label: 'AI 助手界面文字' },
  { file: 'lib/easter-eggs.js', label: '彩蛋文字' }
];

function hashKey(value) {
  return crypto.createHash('sha1').update(value).digest('hex').slice(0, 16);
}

function safeFile(relFile) {
  const normalized = path.posix.normalize(relFile).replace(/^\/+/, '');
  if (normalized.includes('..') || normalized.startsWith('/')) return null;
  if (!/^(lib|live|search|updatelog|tools)\//.test(normalized)) return null;
  const full = path.join(ROOT, normalized.split('/').join(path.sep));
  if (!full.startsWith(ROOT)) return null;
  return full;
}

/* ---------- 模板字符串（lib/AllComponents.js） ---------- */

function findTemplate(source, name) {
  const re = new RegExp(`(?:const|let|var)\\s+${name}\\s*=\\s*\``);
  const match = re.exec(source);
  if (!match) return null;
  const start = match.index + match[0].length;
  let i = start;
  while (i < source.length) {
    if (source[i] === '\\') {
      i += 2;
      continue;
    }
    if (source[i] === '`') break;
    i += 1;
  }
  if (i >= source.length) return null;
  return { contentStart: start, contentEnd: i, content: source.slice(start, i) };
}

function templateTextNodes(content) {
  const $ = cheerio.load(content, { sourceCodeLocationInfo: true });
  const nodes = [];
  const walk = (node) => {
    if (node.type === 'text' && node.sourceCodeLocation) {
      const value = node.data;
      const start = (/^\s*/.exec(value) || [''])[0].length;
      const end = value.length - (/\s*$/.exec(value) || [''])[0].length;
      if (end > start) {
        nodes.push({
          source: value.slice(start, end),
          start: node.sourceCodeLocation.startOffset + start,
          end: node.sourceCodeLocation.startOffset + end,
          tag: (node.parent && node.parent.tagName ? node.parent.tagName : 'text').toLowerCase()
        });
      }
    }
    if (node.children) node.children.forEach(walk);
  };
  walk($.root()[0]);
  return nodes;
}

function tplEntries(meta, store) {
  const full = safeFile(meta.file);
  if (!full || !fs.existsSync(full)) return [];
  const source = fs.readFileSync(full, 'utf8');
  const out = [];
  for (const name of meta.templates) {
    const tpl = findTemplate(source, name);
    if (!tpl) continue;
    const nodes = templateTextNodes(tpl.content);
    nodes.forEach((node, index) => {
      const key = hashKey(`tpl:${meta.file}:${name}:${index}`);
      const entry = store.entries[key];
      let value = node.source;
      let overridden = false;
      let stale = false;
      let stored;
      if (entry) {
        if (!entry.force && entry.source !== node.source) {
          stale = true;
          stored = entry.value;
        } else {
          value = entry.value;
          overridden = true;
        }
      }
      out.push({
        id: `/${meta.file}#${key}`,
        key,
        type: 'template',
        tag: `${name} · ${node.tag}`,
        source: node.source,
        value,
        overridden,
        stale,
        stored,
        shared: true,
        pages: ['全站所有页面'],
        file: meta.file,
        template: name,
        index,
        offset: node.start,
        offsetEnd: node.end
      });
    });
  }
  return out;
}

function patchTemplates(meta, store, source) {
  const splices = [];
  for (const name of meta.templates) {
    const tpl = findTemplate(source, name);
    if (!tpl) continue;
    const nodes = templateTextNodes(tpl.content);
    nodes.forEach((node, index) => {
      const key = hashKey(`tpl:${meta.file}:${name}:${index}`);
      const entry = store.entries[key];
      if (!entry) return;
      if (!entry.force && entry.source !== node.source) return;
      splices.push({
        start: tpl.contentStart + node.start,
        end: tpl.contentStart + node.end,
        text: String(entry.value)
      });
    });
  }
  if (!splices.length) return source;
  splices.sort((a, b) => b.start - a.start);
  let output = source;
  for (const splice of splices) {
    output = output.slice(0, splice.start) + splice.text + output.slice(splice.end);
  }
  return output;
}

/* ---------- 普通 JS 字符串字面量 ---------- */

function stringNodes(source) {
  const nodes = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    const prev = source[i - 1];
    const isQuote = ch === "'" || ch === '"' || ch === '`';
    const isEscaped = prev === '\\';
    if (!isQuote || isEscaped) {
      i += 1;
      continue;
    }
    const quote = ch;
    const start = i + 1;
    let j = start;
    let escaped = false;
    while (j < source.length) {
      if (escaped) {
        escaped = false;
        j += 1;
        continue;
      }
      if (source[j] === '\\') {
        escaped = true;
        j += 1;
        continue;
      }
      if (source[j] === quote) break;
      if (quote !== '`' && source[j] === '\n') break;
      j += 1;
    }
    if (source[j] !== quote) {
      i += 1;
      continue;
    }
    const value = source.slice(start, j);
    nodes.push({ start, end: j, value, quote });
    i = j + 1;
  }
  return nodes;
}

function hasChinese(text) {
  return /[\u4e00-\u9fa5]/.test(text);
}

function isCodeLike(text) {
  if (!text.trim()) return true;
  if (/[<>{}$`]/.test(text) && /[\u4e00-\u9fa5]/.test(text)) {
    return false;
  }
  if (/^[a-zA-Z0-9_\-\/\.:#$@!%^&*()+=\[\]{}|\\;,'"<>?~\s]+$/.test(text)) return true;
  return false;
}

function scriptEntries(meta, store) {
  const full = safeFile(meta.file);
  if (!full || !fs.existsSync(full)) return [];
  const source = fs.readFileSync(full, 'utf8');
  const nodes = stringNodes(source);
  const out = [];
  nodes.forEach((node, index) => {
    if (!hasChinese(node.value)) return;
    if (isCodeLike(node.value)) return;
    if (node.value.length > 400) return;
    const key = hashKey(`str:${meta.file}:${index}`);
    const entry = store.entries[key];
    let value = node.value;
    let overridden = false;
    let stale = false;
    let stored;
    if (entry) {
      if (!entry.force && entry.source !== node.value) {
        stale = true;
        stored = entry.value;
      } else {
        value = entry.value;
        overridden = true;
      }
    }
    out.push({
      id: `/${meta.file}#${key}`,
      key,
      type: 'string',
      tag: `字符串 #${index + 1}`,
      source: node.value,
      value,
      overridden,
      stale,
      stored,
      shared: true,
      pages: ['全站所有页面'],
      file: meta.file,
      index,
      start: node.start,
      end: node.end
    });
  });
  return out;
}

function escapeForQuote(value, quote) {
  let out = String(value);
  if (quote === '`') {
    out = out.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
    return out;
  }
  out = out.replace(/\\/g, '\\\\');
  if (quote === "'") out = out.replace(/'/g, "\\'");
  if (quote === '"') out = out.replace(/"/g, '\\"');
  out = out.replace(/\r?\n/g, '\\n');
  return out;
}

function patchStrings(meta, store, source) {
  const nodes = stringNodes(source);
  const splices = [];
  nodes.forEach((node, index) => {
    if (!hasChinese(node.value)) return;
    const key = hashKey(`str:${meta.file}:${index}`);
    const entry = store.entries[key];
    if (!entry) return;
    if (!entry.force && entry.source !== node.value) return;
    splices.push({ start: node.start, end: node.end, text: escapeForQuote(entry.value, node.quote) });
  });
  if (!splices.length) return source;
  splices.sort((a, b) => b.start - a.start);
  let output = source;
  for (const splice of splices) {
    output = output.slice(0, splice.start) + splice.text + output.slice(splice.end);
  }
  return output;
}

/* ---------- 对外 ---------- */

function listSources(store) {
  const out = [];
  for (const meta of HTML_TEMPLATES) {
    const entries = tplEntries(meta, store);
    if (!entries.length) continue;
    out.push({
      route: `/${meta.file}`,
      file: meta.file,
      label: meta.label,
      kind: 'template',
      count: entries.length,
      overrides: entries.filter((entry) => entry.overridden).length
    });
  }
  for (const meta of SCRIPT_FILES) {
    const entries = scriptEntries(meta, store);
    if (!entries.length) continue;
    out.push({
      route: `/${meta.file}`,
      file: meta.file,
      label: meta.label,
      kind: 'script',
      count: entries.length,
      overrides: entries.filter((entry) => entry.overridden).length
    });
  }
  return out;
}

function listEntries(route, store, query) {
  const tpl = HTML_TEMPLATES.find((meta) => `/${meta.file}` === route);
  const scr = SCRIPT_FILES.find((meta) => `/${meta.file}` === route);
  let entries = [];
  if (tpl) entries = tplEntries(tpl, store);
  else if (scr) entries = scriptEntries(scr, store);
  else return [];
  if (!query) return entries;
  const needle = String(query).toLowerCase();
  return entries.filter((entry) => `${entry.source} ${entry.value} ${entry.tag}`.toLowerCase().includes(needle));
}

function allRoutes() {
  return [
    ...HTML_TEMPLATES.map((meta) => `/${meta.file}`),
    ...SCRIPT_FILES.map((meta) => `/${meta.file}`)
  ];
}

function patchRoute(route, store) {
  const tpl = HTML_TEMPLATES.find((meta) => `/${meta.file}` === route);
  const scr = SCRIPT_FILES.find((meta) => `/${meta.file}` === route);
  const meta = tpl || scr;
  if (!meta) return null;
  const full = safeFile(meta.file);
  if (!full || !fs.existsSync(full)) return null;
  const source = fs.readFileSync(full, 'utf8');
  return tpl ? patchTemplates(meta, store, source) : patchStrings(meta, store, source);
}

function routeInfo(route) {
  const tpl = HTML_TEMPLATES.find((meta) => `/${meta.file}` === route);
  if (tpl) return { ...tpl, kind: 'template' };
  const scr = SCRIPT_FILES.find((meta) => `/${meta.file}` === route);
  if (scr) return { ...scr, kind: 'script' };
  return null;
}

module.exports = {
  listSources,
  listEntries,
  patchRoute,
  routeInfo,
  allRoutes
};
