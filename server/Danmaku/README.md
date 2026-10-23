# 直播实时弹幕服务

QYServer 直播页的弹幕后端，基于 Node.js、Express 与 `ws`。弹幕按直播频道隔离，使用 WebSocket 实时广播。

## 功能

- 按 `channel` 分房间，不同直播频道的弹幕互不影响
- WebSocket 实时收发，内置心跳保活
- 单条弹幕最多 80 字，服务端会清理控制字符
- 单连接发送冷却与频率限制，防止刷屏
- 支持违禁词过滤，命中后拒绝发送
- 断线自动重连（前端实现）
- 内存态服务，不保存历史弹幕，重启即清空

## 启动

```bash
cd server/Danmaku
npm install
npm start
```

默认监听 `0.0.0.0:3002`，WebSocket 地址为 `ws://服务器:3002/ws`，健康检查为 `GET /health`（别名 `GET /api/danmaku/health`）。需要 Node.js 18 及以上版本。

## 使用 .env 配置

复制模板并修改：

```powershell
cd server/Danmaku
Copy-Item .env.example .env
notepad .env
npm start
```

`server.js` 启动时会自动读取同目录下的 `.env`。`.env` 已被 `.gitignore` 忽略，不会提交；`.env.example` 是配置模板。系统环境变量优先级高于 `.env` 中的同名配置。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `HOST` | `0.0.0.0` | HTTP / WebSocket 监听地址 |
| `PORT` | `3002` | HTTP / WebSocket 端口 |
| `ALLOWED_ORIGINS` | 空（允许所有） | 允许的网页来源，逗号分隔 |
| `MAX_TEXT_LENGTH` | `80` | 单条弹幕最大字符数 |
| `MESSAGE_COOLDOWN_MS` | `1200` | 同一连接两次发送的最小间隔 |
| `RATE_WINDOW_MS` | `10000` | 频率限制统计窗口 |
| `RATE_WINDOW_LIMIT` | `8` | 统计窗口内最多发送条数 |
| `HEARTBEAT_INTERVAL_MS` | `30000` | WebSocket 心跳间隔 |
| `MAX_PAYLOAD_BYTES` | `4096` | 单条 WebSocket 消息最大字节数 |
| `BANNED_WORDS` | 空 | 额外违禁词，逗号分隔，会与配置文件合并 |
| `BANNED_WORDS_FILE` | `banned-words.json` | 违禁词配置文件路径，相对路径以 `server/Danmaku` 为基准 |

PowerShell 启动示例：

```powershell
$env:PORT = "3002"
$env:ALLOWED_ORIGINS = "https://www.qyserver.top"
$env:BANNED_WORDS = "违规词1,违规词2"
npm start
```

## 违禁词配置

默认从 `banned-words.json` 读取，格式如下：

```json
{
  "words": ["广告", "加群", "代练", "赌博"]
}
```

匹配时会忽略大小写、空格、标点与符号，例如 `加 群`、`加-群` 都会被识别。命中后服务端返回：

```json
{ "type": "error", "message": "弹幕包含违禁词，请修改后重试" }
```

修改配置文件后需要重启服务，也可以通过 `BANNED_WORDS` 环境变量临时追加。健康检查 `GET /health` 或 `GET /api/danmaku/health` 会返回当前加载的违禁词数量。

## 前端连接地址

前端默认连接同源地址 `/danmaku/ws`：

- HTTPS 页面使用 `wss://当前域名/danmaku/ws`
- `localhost` / `127.0.0.1` 页面自动连接 `ws://localhost:3002/ws`
- 可在加载 `danmaku.js` 之前设置 `window.LIVE_DANMAKU_WS` 覆盖，例如：

```html
<script>window.LIVE_DANMAKU_WS = 'wss://your-domain.com/danmaku/ws';</script>
```

## Nginx 反向代理

把同源的 `/danmaku/ws` 转发到弹幕服务：

```nginx
location /danmaku/ws {
    proxy_pass http://127.0.0.1:3002;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
}
```

后端同时接受 `/ws` 与 `/danmaku/ws` 两个路径。

## WebSocket 协议

连接：

```text
ws://host:3002/ws?channel=666daf90f2b4
```

客户端发送弹幕：

```json
{ "type": "danmaku", "text": "你好" }
```

客户端保活：

```json
{ "type": "ping" }
```

服务端消息：

```json
{ "type": "welcome", "channel": "666daf90f2b4", "online": 3, "maxLength": 80 }
{ "type": "online", "count": 4 }
{ "type": "danmaku", "id": "uuid", "channel": "666daf90f2b4", "text": "你好", "at": 1730000000000 }
{ "type": "pong", "at": 1730000000000 }
{ "type": "error", "message": "发送太快了，请稍后再试" }
```
