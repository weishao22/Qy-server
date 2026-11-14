const fs = require('fs');
const cheerio = require('cheerio');
const pages = ['tools/ai/index.html', 'live/index.html', 'updatelog/index.html', 'index.html', 'about/index.html', 'search/index.html', 'gallery/detail.html', 'nav/index.html', '404.html', 'command/index.html', 'faq/index.html', 'faq/problem.html', 'tools/csvlog.html'];
for (const f of pages) {
  const $ = cheerio.load(fs.readFileSync(f, 'utf8'));
  const arr = $('script').toArray().filter((e) => !e.attribs.src);
  console.log('\n========', f, 'inline count', arr.length);
  arr.forEach((e, i) => console.log(`--- inline ${i} ---\n` + ($(e).html() || '').slice(0, 260)));
}
console.log('\n=== lib/special files ===');
try {
  console.log(fs.readdirSync('lib/special').join(', '));
} catch (e) {
  console.log('no lib/special dir');
}
