# QYServer 官网（Node 后端 + 内容管理）

原静态站已改为 Node.js 服务运行，并新增登录后台：登录后可以在网页上直接修改官网上所有文字。

## 启动

```bash
npm install
npm start
```

- 官网：http://localhost:8080/
- 管理后台：http://localhost:8080/admin

可用环境变量：`PORT`（默认 8080）、`HOST`（默认 0.0.0.0）、`ADMIN_PASSWORD`（仅首次初始化时作为初始密码）。

## 登录与密码

首次启动会自动生成管理账号，默认密码 `admin123`，并标记为「需修改」。

登录后点右上角「修改密码」即可更换；密码以 scrypt 加盐哈希保存在 `data/admin.json`，请勿提交该目录（已在 `.gitignore`）。

## 两种改文字方式

### 1. 后台列表编辑（/admin）

- 左侧是页面列表（首页、关于、规则、FAQ 等）与数据/文档列表（指令、导航、更新日志、图廊、时间线、弹窗、FAQ 列表与 Markdown）
- 点击任意条目右侧的输入框改文字，底部「保存修改」一次性提交
- 支持全站搜索、恢复原文、显示「共享于 N 个页面」的公共文字

### 2. 在网页上直接改

后台选中页面后点「页面上直接改」，或在页面 URL 后加 `?edit=1`（需已登录）。

进入后会进入编辑模式，所有可改文字带虚线高亮，点击即可直接输入，回车确认、Esc 取消，底部保存。

## 可编辑范围

| 类型 | 位置 |
| --- | --- |
| 页面文字 | 各 `*.html` 的正文、标题、`meta description`/`keywords` |
| 导航栏 / 页脚 / 加载动画 | `lib/AllComponents.js` 内的模板字符串 |
| 站点数据 | `Configs/*.json`（指令、导航、更新日志、图廊、时间线、弹窗） |
| FAQ 列表与文档 | `Configs/faq/faqList.js`、`Configs/faq/md/*.md` |
| 前端脚本提示文字 | `lib/all.js`、`live/*.js`、`search/assets/status.js`、`updatelog/main.js`、`tools/ai/ai.js` |

## 工作原理

- 修改内容保存在 `data/content.json`，不直接改源文件
- 请求 HTML 或上述 JS/JSON/MD 时，服务端按保存的记录实时替换后返回
- 每条记录带原始文字；源文件文字改动后，旧记录会被标记为「源文字已变更」，可选择强制沿用或改成新文字
- 删除 `data/content.json` 即恢复全部原文

## 目录

```
server.js          入口：路由、鉴权、静态托管
site/cms.js        HTML 文字提取与替换
site/data.js       Configs 下 JSON / JS / Markdown 文字提取与替换
site/scripts.js    前端脚本与导航页脚模板文字提取与替换
site/auth.js       密码与会话
site/admin/        后台页面（/admin）
data/              运行数据（已 gitignore）
```
