const { JSDOM } = require('jsdom');
(async () => {
  const dom = await JSDOM.fromURL('http://localhost:8080/', { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true });
  await new Promise((r) => dom.window.addEventListener('load', r));
  await new Promise((r) => setTimeout(r, 800));
  const d = dom.window.document;
  console.log('content html len:', d.getElementById('content').innerHTML.length);
  console.log('tcomment in body html:', d.body.innerHTML.includes('tcomment'));
  console.log('content first child:', d.getElementById('content').children[0] && d.getElementById('content').children[0].outerHTML.slice(0, 200));
  console.log('content-box children:', d.querySelector('.content-box') ? Array.from(d.querySelector('.content-box').children).map((e) => e.tagName + '.' + (e.className || '')).join(' | ') : 'no content-box');
  console.log('comments wrapper exists:', Boolean(d.querySelector('.comments-wrapper')));
  console.log('site widgets:', Boolean(d.getElementById('qy-site-widgets')));
  console.log('html tail:', d.body.innerHTML.slice(-400));
  dom.window.close();
  process.exit(0);
})();
