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

function serialize(r) {
  let value = r.value;
  if (r.type === 'faq_content' && value.startsWith('{')) {
    // Older versions accidentally stored the Markdown editor form as JSON.
    try {
      const legacy = JSON.parse(value);
      if (typeof legacy.content === 'string' && Object.keys(legacy).every((key) => key === 'title' || key === 'content')) {
        value = legacy.content;
      }
    } catch { /* Raw Markdown. */ }
  }
  return {
    id: r.id,
    type: r.type,
    key: r.key,
    title: r.title,
    description: r.description,
    value,
    route: r.route,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

function list(type) {
  return db.prepare('SELECT * FROM content WHERE type = ? ORDER BY sort_order ASC, id ASC').all(type).map(serialize);
}

function get(id) {
  const row = db.prepare('SELECT * FROM content WHERE id = ?').get(id);
  return row ? serialize(row) : null;
}

function insert(item) {
  const ts = now();
  return db.prepare(`
    INSERT INTO content (type, key, title, description, value, route, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(item.type, item.key, item.title, item.description, item.value, item.route, item.sortOrder, ts, ts).lastInsertRowid;
}

function update(id, item) {
  db.prepare(`
    UPDATE content SET key = ?, title = ?, description = ?, value = ?, route = ?, sort_order = ?, updated_at = ?
    WHERE id = ?
  `).run(item.key, item.title, item.description, item.value, item.route, item.sortOrder, now(), id);
}

function remove(id) {
  return db.prepare('DELETE FROM content WHERE id = ?').run(id).changes > 0;
}

function removeByTypeAndKey(type, key) {
  db.prepare('DELETE FROM content WHERE type = ? AND key = ?').run(type, key);
}

function seedFromJson() {
  const seedDir = path.join(__dirname, '.seed');
  const files = [
    { file: 'images.json', type: 'gallery_image' },
    { file: 'updata.json', type: 'changelog_entry' },
    { file: 'timeline.json', type: 'timeline_entry' },
    { file: 'nav.json', type: 'nav_item' },
    { file: 'commands.json', type: 'command' },
    { file: 'dontShowPopup.json', type: 'popup_announcement' }
  ];

  const insert = db.prepare(`
    INSERT INTO content (type, key, title, description, value, route, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(type, key) DO NOTHING
  `);
  return db.transaction(() => {
    const ts = now();
    let inserted = 0;
    const add = (type, key, title, description, value, route, sortOrder) => {
      inserted += insert.run(type, key, title, description, value, route, sortOrder, ts, ts).changes;
    };

    for (const { file, type } of files) {
      const data = JSON.parse(fs.readFileSync(path.join(seedDir, file), 'utf8'));
      let items = [];
      let single = false;
      if (Array.isArray(data)) {
        items = data;
      } else if (Array.isArray(data.items)) {
        items = data.items;
      } else if (Array.isArray(data.categories)) {
        items = data.categories.flatMap((cat) => cat.items || cat.commands || []);
      } else if (Array.isArray(data.timeline)) {
        items = data.timeline;
      } else {
        single = true;
        items = [data];
      }
      items.forEach((item, i) => {
        add(
          type,
          single ? 'main' : `${type}-${i}`,
          item.title || item.name || '',
          item.description || item.desc || item.text || '',
          JSON.stringify(item),
          `/Configs/${file}`,
          i
        );
      });
    }

    const faqDir = path.join(seedDir, 'faq');
    const mdDir = path.join(faqDir, 'md');
    const problems = parseJsArray(fs.readFileSync(path.join(faqDir, 'faqList.js'), 'utf8'), 'problems');
    if (!Array.isArray(problems)) throw new Error('Invalid FAQ seed: faqList.js');

    const referenced = new Set();
    problems.forEach((problem, i) => {
      const key = problem.id || `faq-${i}`;
      const title = problem.title || '';
      add('faq_item', key, title, problem.summary || '', JSON.stringify(problem), '/Configs/faq/faqList.js', i);
      if (problem.file) {
        const name = path.basename(problem.file);
        referenced.add(name);
        add('faq_content', key, title, '', fs.readFileSync(path.join(mdDir, name), 'utf8'), problem.file, i);
      }
    });

    // FAQ detail pages look up Markdown by question ID; import only unlinked files here.
    fs.readdirSync(mdDir).filter((name) => /\.md$/i.test(name)).sort().forEach((name, i) => {
      if (referenced.has(name)) return;
      add('faq_content', `md-${name.replace(/\.md$/i, '')}`, name, '',
        fs.readFileSync(path.join(mdDir, name), 'utf8'), `/Configs/faq/md/${name}`, 1000 + i);
    });
    return inserted;
  })();
}

module.exports = { db, list, get, insert, update, remove, removeByTypeAndKey, seedFromJson };
