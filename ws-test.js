const WebSocket = require('ws');
(async () => {
  const ws = new WebSocket('ws://localhost:8080/api/danmaku/ws?channel=default');
  const seen = [];
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    seen.push(msg.type + (msg.text ? ':' + msg.text : ''));
    if (msg.type === 'welcome') {
      ws.send(JSON.stringify({ type: 'danmaku', text: 'hello from test' }));
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 1200));
  console.log('messages:', seen.join(' | '));
  ws.close();
  process.exit(0);
})();
