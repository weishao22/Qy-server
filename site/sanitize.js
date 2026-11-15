'use strict';

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const ALLOWED_TAGS = new Set([
  'a', 'abbr', 'b', 'blockquote', 'br', 'caption', 'cite', 'code', 'col', 'colgroup', 'dd', 'del', 'dfn', 'div', 'dl', 'dt', 'em',
  'figcaption', 'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'ins', 'kbd', 'li', 'mark', 'ol', 'p', 'pre', 'q',
  'rp', 'rt', 'ruby', 's', 'samp', 'section', 'small', 'span', 'strike', 'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 'td',
  'tfoot', 'th', 'thead', 'time', 'tr', 'tt', 'u', 'ul', 'var', 'wbr'
]);
const ALLOWED_ATTRS = {
  a: ['href', 'title', 'target', 'rel'],
  abbr: ['title'],
  b: [],
  blockquote: ['cite'],
  br: [],
  caption: [],
  cite: [],
  code: [],
  col: ['span'],
  colgroup: ['span'],
  dd: [],
  del: ['datetime'],
  dfn: [],
  div: ['align', 'class'],
  dl: [],
  dt: [],
  em: [],
  figcaption: [],
  figure: [],
  h1: ['align'], h2: ['align'], h3: ['align'], h4: ['align'], h5: ['align'], h6: ['align'],
  hr: [],
  i: [],
  img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
  ins: ['datetime'],
  kbd: [],
  li: [],
  mark: [],
  ol: ['start', 'reversed', 'type'],
  p: ['align'],
  pre: [],
  q: ['cite'],
  rp: [], rt: [], ruby: [],
  s: [], samp: [], section: [], small: [], span: ['class'],
  strike: [], strong: [], sub: [], summary: [], sup: [],
  table: ['align', 'border', 'cellpadding', 'cellspacing', 'width'],
  tbody: [], td: ['colspan', 'rowspan', 'headers', 'width', 'height', 'align', 'valign'],
  tfoot: [], th: ['colspan', 'rowspan', 'headers', 'width', 'height', 'align', 'valign', 'scope', 'abbr'],
  thead: [], time: ['datetime'], tr: ['align', 'valign'],
  tt: [], u: [], ul: [], var: [], wbr: []
};

const EVENT_HANDLER_RE = /^on[a-z]+$/i;
const JS_PROTOCOL_RE = /^\s*(javascript|vbscript|data|file):/i;

function escAttr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';
  // Remove script tags and contents
  let out = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  // Remove style tags and contents
  out = out.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  // Remove event handler attributes
  out = out.replace(/\s+on[a-zA-Z]+=["'][^"']*["']/gi, '');
  out = out.replace(/\s+on[a-zA-Z]+=[^>\s]+/gi, '');
  // Strip javascript: / vbscript: / data: / file: URLs from href/src
  out = out.replace(/\s+(href|src)=(["'])(javascript|vbscript|data|file):[^"']*\2/gi, (m, attr, quote) => ` ${attr}=${quote}${quote}`);
  out = out.replace(/\s+(href|src)=(javascript|vbscript|data|file):[^>\s]+/gi, (m, attr) => ` ${attr}=""`);

  const result = [];
  let i = 0;
  while (i < out.length) {
    const lt = out.indexOf('<', i);
    if (lt < 0) {
      result.push(out.slice(i));
      break;
    }
    result.push(out.slice(i, lt));
    const gt = out.indexOf('>', lt + 1);
    if (gt < 0) {
      result.push('&lt;');
      i = lt + 1;
      continue;
    }
    const tagContent = out.slice(lt + 1, gt);
    const isClosing = tagContent.startsWith('/');
    const isDeclaration = tagContent.startsWith('!') || tagContent.startsWith('?');
    const trimmed = isClosing ? tagContent.slice(1) : tagContent;
    const tagMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9]*)/);
    const tagName = tagMatch ? tagMatch[1].toLowerCase() : '';
    if (isDeclaration || !tagName) {
      result.push('&lt;' + tagContent.slice(0, 1) + '&gt;');
      i = gt + 1;
      continue;
    }
    if (isClosing) {
      if (ALLOWED_TAGS.has(tagName)) result.push(`</${tagName}>`);
      else result.push('&lt;/&gt;');
      i = gt + 1;
      continue;
    }
    if (!ALLOWED_TAGS.has(tagName)) {
      result.push('&lt;&gt;');
      i = gt + 1;
      continue;
    }
    // Parse attributes
    const rest = trimmed.slice(tagName.length).trim();
    let attrsHtml = '';
    if (rest) {
      const attrRegex = /([a-zA-Z][a-zA-Z0-9:-]*)\s*=\s*(?:(["'])([^\2]*?)\2|([^\s>]+))/g;
      let lastIdx = 0;
      let m;
      while ((m = attrRegex.exec(rest)) !== null) {
        if (m.index > lastIdx) lastIdx = attrRegex.lastIndex;
        const attrName = m[1].toLowerCase();
        if (EVENT_HANDLER_RE.test(attrName)) continue;
        const allowed = ALLOWED_ATTRS[tagName];
        if (!allowed || !allowed.includes(attrName)) continue;
        let attrValue = m[3] !== undefined ? m[3] : (m[4] || '');
        if (attrName === 'href' || attrName === 'src') {
          if (JS_PROTOCOL_RE.test(attrValue)) attrValue = '';
        }
        attrsHtml += ` ${attrName}="${escAttr(attrValue)}"`;
      }
    }
    const selfClosing = rest.endsWith('/') || VOID_TAGS.has(tagName);
    if (selfClosing || VOID_TAGS.has(tagName)) {
      result.push(`<${tagName}${attrsHtml}>`);
    } else {
      result.push(`<${tagName}${attrsHtml}>`);
    }
    i = gt + 1;
  }
  return result.join('');
}

module.exports = { sanitizeHtml };
