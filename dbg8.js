const { JSDOM, VirtualConsole } = require('jsdom');
const BASE='http://localhost:8080';
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  process.on('unhandledRejection',(r)=>console.log('[rej]', r&&r.message||r));
  const vc=new VirtualConsole();
  vc.on('jsdomError',(e)=>console.log('[err]', (e.stack||e.message).split('\n').slice(0,3).join(' | ')));
  const dom=await JSDOM.fromURL(BASE+'/',{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){w.fetch=(i,o)=>fetch(typeof i==='string'?new URL(i,BASE).href:i,o);w.Response=Response;w.Headers=Headers;w.Request=Request;w.scrollTo=()=>{};}});
  const w=dom.window,d=w.document;
  await new Promise(r=>w.addEventListener('load',r)); await wait(1000);
  async function go(p){w.__done='pending';w.eval(`window.QYNav.navigate(${JSON.stringify(p)},{push:true}).then(()=>{window.__done='ok'}).catch(e=>{window.__done='err:'+(e&&e.message||e)})`);for(let i=0;i<80&&w.__done==='pending';i++)await wait(100);return w.__done;}
  await go('/about/'); await wait(1600);
  const t=d.getElementById('tcomment');
  console.log('ABOUT tcomment:', Boolean(t), t&&t.className, 'html len:', t&&t.innerHTML.length);
  console.log('ABOUT twikoo calls?', typeof w.twikoo.init);
  await go('/command/'); await wait(2000);
  const cc=d.querySelector('.command-container');
  console.log('COMMAND container:', Boolean(cc), 'len:', cc&&cc.innerHTML.length, 'text:', cc&&cc.textContent.trim().slice(0,80));
  await go('/nav/'); await wait(2000);
  const nc=d.getElementById('nav-container');
  console.log('NAV container:', Boolean(nc), 'len:', nc&&nc.innerHTML.length, 'text:', nc&&nc.textContent.trim().slice(0,80));
  console.log('NAV classes:', nc?Array.from(nc.children).map(e=>e.tagName+'.'+e.className).join(' | '):'none');
  w.close();process.exit(0);
})();
