const { JSDOM } = require('jsdom');
(async () => {
  const dom = await JSDOM.fromURL('http://localhost:8080/', { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true });
  await new Promise((r) => dom.window.addEventListener('load', r));
  await new Promise((r) => setTimeout(r, 800));
  const d = dom.window.document;
  console.log('title', d.title);
  console.log('tcomment', Boolean(d.getElementById('tcomment')));
  console.log('content', Boolean(d.getElementById('content')));
  console.log('body children:', Array.from(d.body.children).map((e) => e.tagName + (e.id ? '#' + e.id : '')).join(' '));
  console.log('ids count', d.querySelectorAll('[id]').length);
  console.log('twikoo', typeof dom.window.twikoo);
  console.log('QYComments', typeof dom.window.QYComments);
  dom.window.close();
  process.exit(0);
})();
