const { JSDOM } = require('jsdom');
(async () => {
  const dom = await JSDOM.fromURL('http://localhost:8080/', { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true });
  await new Promise((r) => dom.window.addEventListener('load', r));
  await new Promise((r) => setTimeout(r, 500));
  const d = dom.window.document;
  const w = d.querySelector('.comments-wrapper');
  console.log('wrapper html:', w ? w.outerHTML.slice(0, 500) : 'none');
  console.log('all ids:', Array.from(d.querySelectorAll('[id]')).map(e=>e.id).join(','));
  dom.window.close();
  process.exit(0);
})();
