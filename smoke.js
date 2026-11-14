(async () => {
  const base = 'http://localhost:8080';
  const login = await fetch(base + '/api/admin/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({password:'admin123'})});
  const cookie = login.headers.getSetCookie()[0].split(';')[0];
  const H = {'Content-Type':'application/json', cookie};
  const checks = [];
  for (const p of ['/', '/about/', '/download/', '/rules/', '/command/', '/faq/', '/faq/problem.html', '/gallery/', '/gallery/detail.html', '/nav/', '/search/', '/tools/ai/', '/tools/csvlog.html', '/updatelog/', '/live/', '/404.html']) {
    const res = await fetch(base + p);
    const html = await res.text();
    checks.push([p, res.status, html.length, html.includes('/lib/qy-nav.js'), html.includes('/lib/comments-widget.js')]);
  }
  checks.forEach((c) => console.log(c.join('  ')));
  const admin = await fetch(base + '/admin');
  const adminHtml = await admin.text();
  console.log('admin:', admin.status, adminHtml.includes('/admin-assets/dashboard.js'), adminHtml.includes('view-dashboard'));
  for (const p of ['/admin-assets/app.js','/admin-assets/dashboard.js','/lib/qy-nav.js','/lib/comments-widget.js','/lib/qy-widgets.js','/Configs/commands.json','/lib/AllComponents.js']) {
    const res = await fetch(base + p);
    console.log(p, res.status, res.headers.get('content-type'));
  }
  const home = await (await fetch(base + '/')).text();
  console.log('site widget present:', home.includes('qy-site-widgets'));
  const dash = await (await fetch(base + '/api/admin/dashboard', {headers:H})).json();
  console.log('widget note onSite:', dash.widgets.find(w=>w.type==='note').onSite);
})();
