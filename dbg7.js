(async () => {
  const html = await (await fetch('http://localhost:8080/')).text();
  const idx = html.indexOf('twikoo');
  console.log('twikoo occurrences:', (html.match(/twikoo/gi) || []).length);
  console.log(html.slice(idx - 160, idx + 200));
})();
