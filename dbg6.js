const { JSDOM, VirtualConsole } = require('jsdom');
const BASE = 'http://localhost:8080';
(async () => {
  process.on('unhandledRejection', (r) => console.log('[rej]', r && r.stack || r));
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => console.log('[jsdomError]', e.stack ? e.stack.split('\n').slice(0,4).join(' | ') : e.message));
  const dom = await JSDOM.fromURL(BASE + '/', {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(window) {
      window.fetch = (i, o) => fetch(typeof i === 'string' ? new URL(i, BASE).href : i, o);
      window.Response = Response; window.Headers = Headers; window.Request = Request;
      window.scrollTo = () => {};
    }
  });
  const w = dom.window;
  await new Promise((r) => w.addEventListener('load', r));
  await new Promise((r) => setTimeout(r, 1500));
  const d = w.document;
  const t = d.getElementById('tcomment');
  console.log('tcomment?', Boolean(t), 'class:', t && t.className);
  console.log('shim?', w.__qyCommentsShim, 'init:', w.twikoo && String(w.twikoo.init).slice(0, 60));
  console.log('all.js loaded?', Array.from(d.scripts).some((s) => s.src.includes('/lib/all.js')));
  console.log('twikoo script in doc:', Array.from(d.scripts).map(s=>s.src).filter(Boolean).filter(s=>/twikoo/i.test(s)));
  console.log('nav count:', d.querySelectorAll('#menu-box').length);
  w.close(); process.exit(0);
})();
