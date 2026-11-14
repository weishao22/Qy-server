const { JSDOM, VirtualConsole } = require('jsdom');

const BASE = 'http://localhost:8080';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  process.on('unhandledRejection', (reason) => console.log('[rejection]', reason && reason.message ? reason.message : reason));

  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => {
    if (!/Could not load|not implemented/i.test(error.message)) console.log('[jsdomError]', error.message.slice(0, 120));
  });

  const dom = await JSDOM.fromURL(BASE + '/', {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      window.fetch = (input, init) => fetch(typeof input === 'string' ? new URL(input, BASE).href : input, init);
      window.Response = Response;
      window.Headers = Headers;
      window.Request = Request;
      window.scrollTo = () => {};
    }
  });

  const { window } = dom;
  const document = window.document;
  await new Promise((resolve) => window.addEventListener('load', resolve));
  await wait(1200);

  const nav = document.getElementById('menu-box');
  const footer = document.getElementById('footer');
  const tcomment = document.getElementById('tcomment');
  console.log('initial title:', document.title);
  console.log('nav/footer:', Boolean(nav), Boolean(footer));
  console.log('local comments mounted:', Boolean(tcomment && tcomment.classList.contains('qy-comments')));
  console.log('comment form:', document.querySelectorAll('#tcomment .qy-comment-form').length);
  console.log('visitors:', (document.getElementById('twikoo_visitors') || {}).textContent);

  async function go(path) {
    window.__navDone = 'pending';
    window.eval(`window.QYNav.navigate(${JSON.stringify(path)}, {push:true}).then(function(){window.__navDone='ok'}).catch(function(e){window.__navDone='err:' + (e && e.message || e)})`);
    for (let i = 0; i < 80 && window.__navDone === 'pending'; i += 1) await wait(100);
    return window.__navDone;
  }

  console.log('\n-> /about/', await go('/about/'));
  await wait(1200);
  console.log('title:', document.title, '| url:', window.location.pathname);
  console.log('same nav:', document.getElementById('menu-box') === nav, '| nav count:', document.querySelectorAll('#menu-box').length);
  console.log('about content:', document.body.textContent.includes('发展历程'));
  console.log('comments mounted:', Boolean(document.getElementById('tcomment') && document.getElementById('tcomment').classList.contains('qy-comments')));
  console.log('visitors:', (document.getElementById('twikoo_visitors') || {}).textContent);

  console.log('\n-> /command/', await go('/command/'));
  await wait(1500);
  console.log('title:', document.title, '| command cards:', document.querySelectorAll('.command-container *').length);
  console.log('same nav:', document.getElementById('menu-box') === nav);

  console.log('\n-> /search/', await go('/search/'));
  await wait(2500);
  console.log('title:', document.title, '| status:', (document.getElementById('server-status') || {}).textContent.slice(0, 40));
  console.log('history rows:', document.querySelectorAll('#history-table tbody tr').length);

  console.log('\n-> /nav/', await go('/nav/'));
  await wait(1500);
  console.log('title:', document.title, '| nav cards:', document.querySelectorAll('#nav-container .nav-item, #nav-container a').length);

  console.log('\n-> back');
  window.history.back();
  await wait(2200);
  console.log('title:', document.title, '| url:', window.location.pathname, '| same nav:', document.getElementById('menu-box') === nav);

  dom.window.close();
  process.exit(0);
})().catch((error) => {
  console.error('TEST FAILED', error);
  process.exit(1);
});
