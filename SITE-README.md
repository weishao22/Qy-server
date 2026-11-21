# QYServer 官网（Node 后端 + 内容管理）

原静态站已改为 Node.js 服务运行，并新增登录后台：登录后可以在后台修改可编辑的官网文字和内容库数据。

## 启动

```bash
npm install
npm start
```

- 官网：http://localhost:5000/
- 管理后台：http://localhost:5000/admin

可用环境变量：`PORT`（默认 5000）、`HOST`（默认 0.0.0.0）、`ADMIN_PASSWORD`（首次设置或替换旧默认密码时使用，至少 12 个字符）。HTTPS 代理部署请设置 `NODE_ENV=production` 或 `ADMIN_COOKIE_SECURE=1`，并仅通过 HTTPS 访问后台。

## 登录与密码

首次启动不会创建默认密码。未设置有效的 `ADMIN_PASSWORD` 且没有已更改过的旧密码时，官网仍可访问，但后台登录不可用。设置初始密码后重启，登录时必须先更换密码，才能执行管理操作。改密后所有现有会话都需要重新登录。

登录后点右上角「修改密码」即可更换；密码以 scrypt 加盐哈希保存在 `data/admin.json`，请勿提交该目录（已在 `.gitignore`）。

## 编辑方式

### 1. 后台列表编辑（/admin）

- 左侧是页面列表（首页、关于、规则、FAQ 等）与数据/文档列表（指令、导航、更新日志、图廊、时间线、弹窗、FAQ 列表与 Markdown）
- 点击任意条目右侧的输入框改文字，底部「保存修改」一次性提交
- 支持全站搜索、恢复原文、显示「共享于 N 个页面」的公共文字

### 2. 内容库（/admin）

内容库用于编辑指令、导航、更新日志、图廊、时间线、弹窗和 FAQ 等数据。全新空数据库会从 `site/.seed/` 初始化；已有数据库不会被自动补齐。需要恢复缺失的初始条目时，使用「补齐初始内容」，已有同名条目不会被覆盖。

区块布局编辑暂不可用，已有布局仍保留，但不发布到官网。

## 可编辑范围

| 类型 | 位置 |
| --- | --- |
| 页面文字 | 各 `*.html` 的正文、标题、`meta description`/`keywords` |
| 导航栏 / 页脚 / 加载动画 | `lib/AllComponents.js` 内的模板字符串 |
| 站点数据 | `data/content.db`（指令、导航、更新日志、图廊、时间线、弹窗） |
| FAQ 列表与正文 | `data/content.db`，正文以 Markdown 存储 |
| 前端脚本提示文字 | `lib/all.js`、`live/*.js`、`search/assets/status.js`、`updatelog/main.js`、`tools/ai/ai.js` |

## 工作原理

- 页面和脚本的文字覆盖保存在 `data/content.json`，不直接改源文件
- 请求 HTML 或可编辑 JS 时，服务端应用文字覆盖；内容库由公开 API 读取数据库
- 每条记录带原始文字；源文件文字改动后，旧记录会被标记为「源文字已变更」，可选择强制沿用或改成新文字
- 删除 `data/content.json` 即恢复全部原文

## 目录

```
server.js          入口：路由、鉴权、静态托管
site/cms.js        HTML 文字提取与替换
site/db.js         内容库与初始数据导入
site/scripts.js    前端脚本与导航页脚模板文字提取与替换
site/auth.js       密码与会话
site/admin/        后台页面（/admin）
data/              运行数据（已 gitignore）
```
