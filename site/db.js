'use strict';

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'content.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_FILE);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    key TEXT NOT NULL,
    title TEXT,
    description TEXT,
    value TEXT NOT NULL,
    route TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(type, key)
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_content_type ON content(type);
  CREATE INDEX IF NOT EXISTS idx_content_route ON content(route);
`);

const now = () => Math.floor(Date.now() / 1000);

function parseJsArray(source, variable) {
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
          return data;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function list(type) {
  const rows = db.prepare('SELECT * FROM content WHERE type = ? ORDER BY sort_order ASC, id ASC').all(type);
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    key: r.key,
    title: r.title,
    description: r.description,
    value: r.value,
    route: r.route,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }));
}

function get(id) {
  const row = db.prepare('SELECT * FROM content WHERE id = ?').get(id);
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    key: row.key,
    title: row.title,
    description: row.description,
    value: row.value,
    route: row.route,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function upsert(item) {
  const ts = now();
  const existing = db.prepare('SELECT id FROM content WHERE type = ? AND key = ?').get(item.type, item.key);
  if (existing) {
    db.prepare(`
      UPDATE content SET title = ?, description = ?, value = ?, route = ?, sort_order = ?, updated_at = ?
      WHERE id = ?
    `).run(item.title, item.description, item.value, item.route, item.sortOrder, ts, existing.id);
    return existing.id;
  } else {
    const info = db.prepare(`
      INSERT INTO content (type, key, title, description, value, route, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(item.type, item.key, item.title, item.description, item.value, item.route, item.sortOrder, ts, ts);
    return info.lastInsertRowid;
  }
}

function remove(id) {
  db.prepare('DELETE FROM content WHERE id = ?').run(id);
}

function removeByTypeAndKey(type, key) {
  db.prepare('DELETE FROM content WHERE type = ? AND key = ?').run(type, key);
}

function seedFromJson() {
  const jsonDir = path.join(ROOT, 'Configs');
  const files = [
    { file: 'images.json', type: 'gallery_image' },
    { file: 'updata.json', type: 'changelog_entry' },
    { file: 'timeline.json', type: 'timeline_entry' },
    { file: 'nav.json', type: 'nav_item' },
    { file: 'commands.json', type: 'command' },
    { file: 'dontShowPopup.json', type: 'popup_announcement' }
  ];

  for (const { file, type } of files) {
    const full = path.join(jsonDir, file);
    if (!fs.existsSync(full)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(full, 'utf8'));
      let items = [];
      if (Array.isArray(data)) {
        items = data;
      } else if (data.items) {
        items = data.items;
      } else if (data.categories && Array.isArray(data.categories)) {
        // 嵌套结构：{ categories: [{ items/commands: [...] }] }
        data.categories.forEach((cat) => {
          const catItems = cat.items || cat.commands || [];
          items.push(...catItems);
        });
      } else if (data.timeline) {
        items = data.timeline;
      }
      items.forEach((item, i) => {
        upsert({
          type,
          key: item.key || item.name || item.title || `${type}-${i}`,
          title: item.title || item.name || '',
          description: item.description || item.desc || item.text || '',
          value: JSON.stringify(item),
          route: `/Configs/${file}`,
          sortOrder: i
        });
      });
    } catch (e) {
      console.warn(`[db] skip ${file}: ${e.message}`);
    }
  }

  /* ---------------- FAQ：从 faqList.js 和 faq/md/*.md 种子 ---------------- */

  const faqListFile = path.join(jsonDir, 'faq', 'faqList.js');
  const faqMdDir = path.join(jsonDir, 'faq', 'md');
  if (fs.existsSync(faqListFile)) {
    try {
      const source = fs.readFileSync(faqListFile, 'utf8');
      const problems = parseJsArray(source, 'problems');
      if (Array.isArray(problems)) {
        problems.forEach((p, i) => {
          upsert({
            type: 'faq_item',
            key: p.id || `faq-${i}`,
            title: p.title || '',
            description: p.summary || '',
            value: JSON.stringify(p),
            route: '/Configs/faq/faqList.js',
            sortOrder: i
          });
          // 同步迁移对应的 MD 内容
          if (p.file) {
            const mdFull = path.join(ROOT, p.file.replace(/^\//, ''));
            if (fs.existsSync(mdFull)) {
              const mdContent = fs.readFileSync(mdFull, 'utf8');
              upsert({
                type: 'faq_content',
                key: p.id || `faq-${i}`,
                title: p.title || '',
                description: '',
                value: mdContent,
                route: p.file,
                sortOrder: i
              });
            }
          }
        });
      }
    } catch (e) {
      console.warn('[db] skip faqList.js: ' + e.message);
    }
  }

  /* 兜底：迁移 faq/md 下所有未被 faqList 引用的 MD 文件 */
  if (fs.existsSync(faqMdDir)) {
    try {
      fs.readdirSync(faqMdDir).filter((n) => /\.md$/i.test(n)).forEach((name, i) => {
        const full = path.join(faqMdDir, name);
        const key = 'md-' + name.replace(/\.md$/i, '');
        const existing = db.prepare('SELECT id FROM content WHERE type = ? AND key = ?').get('faq_content', key);
        if (existing) return;
        const mdContent = fs.readFileSync(full, 'utf8');
        upsert({
          type: 'faq_content',
          key,
          title: name,
          description: '',
          value: mdContent,
          route: `/Configs/faq/md/${name}`,
          sortOrder: 1000 + i
        });
      });
    } catch (e) {
      console.warn('[db] skip faq/md: ' + e.message);
    }
  }
}

module.exports = { db, list, get, upsert, remove, removeByTypeAndKey, seedFromJson };
