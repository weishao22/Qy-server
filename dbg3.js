const cheerio = require('cheerio');
(async () => {
  const html = await (await fetch('http://localhost:8080/')).text();
  const $ = cheerio.load(html);
  console.log('tcomment in served html:', $('#tcomment').length);
  console.log('comments-wrapper:', $('.comments-wrapper').length);
  console.log('content children:', $('#content').children().map((i,e)=>e.tagName+(e.attribs.class?'.'+e.attribs.class.split(' ')[0]:'')).get().join(' | '));
  console.log('body children:', $('body').children().map((i,e)=>e.tagName+(e.attribs.id?'#'+e.attribs.id:'')).get().join(' | '));
  console.log('site widgets:', $('#qy-site-widgets').length);
  const idx = html.indexOf('tcomment');
  console.log('snippet around tcomment:', idx > 0 ? html.slice(idx-200, idx+120) : 'NOT FOUND');
})();
