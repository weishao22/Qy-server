const http = require('http');

function fetch(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:8080${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function test() {
  try {
    console.log('=== /api/status ===');
    const status = await fetch('/api/status');
    console.log(status);
    
    console.log('\n=== /api/history ===');
    const history = await fetch('/api/history');
    console.log(history);
    
    console.log('\n=== /api/all ===');
    const all = await fetch('/api/all');
    console.log(all);
    
    console.log('\n=== /api/comments?path=/ ===');
    const comments = await fetch('/api/comments?path=/');
    console.log(comments);
    
    console.log('\n=== /api/views?path=/ ===');
    const views = await fetch('/api/views?path=/');
    console.log(views);
  } catch (e) {
    console.error('Error:', e.message);
  }
}

test();