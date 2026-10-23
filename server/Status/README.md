# MC 服务器状态服务

QYServer 基岩版服务器的在线状态查询与最近 2 小时历史记录服务，基于 Node.js、Express 与 `minecraft-server-util`。

历史记录保存在本地 JSON 文件，不依赖 MySQL 或其他外部数据库。

## 功能

- `GET /api/status` 查询实时在线人数、MOTD 与版本，自带 5 秒缓存
- 每 2 分钟自动检测并记录一次服务器状态
- 仅保留最近 2 小时的记录，自动清理过期数据
- 历史记录写入本地 JSON 文件，重启后仍可读取
- 离线时同样记录一条 `status: 0` 的数据，便于前端绘制状态曲线

## 启动

```bash
cd server/Status
npm install
npm start
```

默认监听 `0.0.0.0:3000`。需要 Node.js 18 及以上版本。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `HOST` | `0.0.0.0` | HTTP 服务监听地址 |
| `PORT` | `3000` | HTTP 服务端口 |
| `MC_HOST` | `mc.qyserver.top` | 要检测的 Minecraft 服务器地址 |
| `MC_PORT` | `41657` | 要检测的 Minecraft 服务器端口 |
| `HISTORY_FILE` | `status-history.json` | 历史记录 JSON 文件路径 |
| `HISTORY_MAX_RECORDS` | `1000` | 历史记录最大条数 |
| `RECORD_CRON` | `*/2 * * * *` | 状态记录定时表达式 |

PowerShell 示例：

```powershell
$env:PORT = "3000"
$env:MC_HOST = "mc.qyserver.top"
$env:MC_PORT = "41657"
npm start
```

## API

### GET /api/status

在线时返回：

```json
{
  "online": true,
  "players": { "online": 12, "max": 100 },
  "motd": "QYServer",
  "version": { "name": "1.21.130", "protocol": 800 }
}
```

离线或检测失败时返回：

```json
{
  "online": false,
  "error": "连接超时"
}
```

### GET /api/history

返回最近 2 小时的记录，按时间倒序排列：

```json
[
  { "time": "2026-10-23T13:00:00.000Z", "online": 12, "status": 1 },
  { "time": "2026-10-23T12:58:00.000Z", "online": 0, "status": 0 }
]
```

`status` 为 `1` 表示在线，`0` 表示离线。`time` 为 ISO 8601 UTC 时间。

## 本地存储

默认历史文件为 `server/Status/status-history.json`，内部保存 `time`、`online`、`max`、`status` 字段。写入时先生成 `.tmp` 文件再替换原文件，避免进程中断导致文件损坏。

该文件属于运行时数据，已加入 `.gitignore`，不会提交到仓库。删除该文件即可清空历史记录。

## Nginx 反向代理

前端通过 `https://api.qyserver.top/api/...` 访问时，可这样转发：

```nginx
location ~ ^/api/(status|history)$ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

本服务提供 `/api/status` 与 `/api/history` 两个接口。

## 从 MySQL 迁移

当前版本已移除 MySQL 依赖，启动时不再需要数据库。原有 MySQL 中的历史记录不会自动导入，新服务会从本地 JSON 文件重新开始记录。
