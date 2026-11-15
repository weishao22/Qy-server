'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cheerio = require('cheerio');
const cms = require('./cms');
const layout = require('./layout');

const ROOT = path.resolve(__dirname, '..');

const SKIP_TAGS = ['script', 'style', 'link', 'meta', 'noscript', 'template'];

function blockId() {
  return `b-${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
}

function buildBlocksFromHtml(html) {
  const $ = cheerio.load(html);
  const body = $('body');
  const blocks = [];
  if (!body.length) return blocks;
  body.children().each((_, el) => {
    const tag = String(el.tagName || '').toLowerCase();
    if (SKIP_TAGS.indexOf(tag) >= 0) return;
    const $el = $(el);
    $el.find('script').remove();
    const out = $.html(el);
    if (!out || !out.trim()) return;
    blocks.push({ id: blockId(), type: 'raw', props: { html: out } });
  });
  return blocks;
}

function fileForSitePath(sitePath) {
  let p = String(sitePath || '/').split('?')[0];
  if (!p.startsWith('/')) p = '/' + p;
  const candidates = [];
  if (p === '/') {
    candidates.push(path.join(ROOT, 'index.html'));
  } else if (p.endsWith('/')) {
    candidates.push(path.join(ROOT, p.slice(1), 'index.html'));
    candidates.push(path.join(ROOT, p.slice(1, -1)));
  } else {
    candidates.push(path.join(ROOT, p.slice(1)));
  }
  for (const file of candidates) {
    if (!file.startsWith(ROOT)) continue;
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  }
  return null;
}

function importStatic(sitePath) {
  const file = fileForSitePath(sitePath);
  if (!file) return null;
  const html = fs.readFileSync(file, 'utf8');
  const blocks = buildBlocksFromHtml(html);
  layout.setLayout(sitePath, blocks);
  return blocks;
}

function migrateAll(options) {
  const force = Boolean(options && options.force);
  const report = [];
  for (const file of cms.walkHtml()) {
    const sitePath = cms.toSitePath(file);
    const existing = layout.getLayout(sitePath);
    if (!force && Array.isArray(existing) && existing.length) {
      report.push({ sitePath, skipped: true });
      continue;
    }
    let html;
    try {
      html = fs.readFileSync(file, 'utf8');
    } catch (error) {
      continue;
    }
    const blocks = buildBlocksFromHtml(html);
    layout.setLayout(sitePath, blocks);
    report.push({ sitePath, blocks: blocks.length });
  }
  return report;
}

module.exports = { migrateAll, importStatic, buildBlocksFromHtml, fileForSitePath };
