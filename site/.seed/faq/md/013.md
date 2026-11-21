# 🎮 玩家可用命令总表

## 🛡️ AuthMe

| 命令                        | 功能   |
| ------------------------- | ---- |
| /register \<密码> \<确认>     | 注册   |
| /login \<密码>              | 登录   |
| /changepassword \<旧> \<新> | 修改密码 |
| /logout                   | 登出   |

## 🎨 SkinsRestorer

在这里上传皮肤复制指令到游戏输入别人就可以看见了
[SkinsRestorer - Minecraft Skin Plugin](https://skinsrestorer.net/upload)

## 🧍 GSit

| 命令     | 功能 |
| ------ | -- |
| /sit   | 坐下 |
| /lay   | 躺下 |
| /crawl | 匍匐 |
| /spin  | 旋转 |

## 🏰 Dominion（领地）

### **手动创建领地**

1. 左键点击第一个角点
2. 右键点击第二个角点
3. 输入：`/dominion create <领地名称>`

### **自动创建领地**

1. 输入 `/dominion`
2. 打开主菜单
3. 点击“创建领地”

点击“创建领地”

[玩家手册（主页） | DominionDocs](https://dominion.lunadeer.cn/notes/doc/player/)

## 💬 JoinMessage

| 命令         | 功能        |
| ---------- | --------- |
| /jm reload | 重载配置（管理员） |
| 玩家无命令      | 自动显示提示    |

## 🔧 killme

| 命令      | 功能 |
| ------- | -- |
| /killme | 自杀 |

## 🧭 PlayerWarps（玩家公共传送点）

* `/warp` `/w` `/warps` `/warpmenu` → 打开传送菜单
* `/warp 创建 <名称>`
* `/warp 移除 <名称>`
* `/warp 地标列表`
* `/warp 描述 <增加/移除> <名称> <描述>`
* `/warp 设置 费用 <点券/金币> <名称> <数值>`
* `/warp 重命名 <名称> <新名称>`
* `/warp 设置图标 <名称> <图标名称>`

## 🔁 SimpleTpa（玩家互相传送）

* `/tpa <玩家>` → 请求传送到对方
* `/tpahere <玩家>` → 请求对方传送到你
* `/back` → 返回死亡地点

## 🔧 killme

* `/killme`

## Lswk —— 连锁挖矿

* `/lswk` 连锁开关
* `/lswk list` 查看可连锁方块的列表
* `/lswk gl` 打开方块过滤器
* 详细查看[原创 - 工具 - Lswk —— 连锁挖矿｜一款简单而不简单的连锁采集插件 | MineBBS 我的世界中文论坛](https://www.minebbs.com/resources/lswk.11971/)

## 假人

| 命令            | 作用        | 权限                           | 备注                      |
| ------------- | --------- | ---------------------------- | ----------------------- |
| /fp spawn     | 召唤假人      | fakeplayer.command.spawn     |                         |
| /fp kill      | 杀死假人      | fakeplayer.command.kill      |                         |
| /fp select    | 选中假人      | fakeplayer.command.select    | 当玩家假人数量 >= 2 时才会出现      |
| /fp selection | 查看选中假人    | fakeplayer.command.selection | 当玩家假人数量 >= 2 时才会出现      |
| /fp list      | 查看已召唤的假人  | fakeplayer.command.list      |                         |
| /fp distance  | 查看与假人的距离  | fakeplayer.command.distance  |                         |
| /fp drop      | 丢弃手上一个物品  | fakeplayer.command.drop      |                         |
| /fp dropstack | 丢弃手上整组物品  | fakeplayer.command.dropstack |                         |
| /fp dropinv   | 丢弃背包所有物品  | fakeplayer.command.dropinv   |                         |
| /fp skin      | 复制玩家皮肤    | fakeplayer.command.skin      | 非在线玩家有 60 秒冷却           |
| /fp invsee    | 查看假人背包    | fakeplayer.command.invsee    | 玩家对假人右键同等效果             |
| /fp sleep     | 睡觉        | fakeplayer.command.sleep     |                         |
| /fp wakeup    | 起床        | fakeplayer.command.wakeup    |                         |
| /fp status    | 查看假人状态    | fakeplayer.command.status    |                         |
| /fp respawn   | 让死亡的假人复活  | fakeplayer.command.respawn   | 当服务器配置假人死亡时不踢出才会出现      |
| /fp tp        | 传送到假人身边   | fakeplayer.command.tp        |                         |
| /fp tphere    | 让假人传送到身边  | fakeplayer.command.tphere    |                         |
| /fp tps       | 与假人交换位置   | fakeplayer.command.tps       |                         |
| /fp set       | 更改假人的配置   | fakeplayer.command.set       |                         |
| /fp config    | 更改默认假人配置  | fakeplayer.command.config    |                         |
| /fp expme     | 吸收假人经验值   | fakeplayer.command.expme     |                         |
| /fp attack    | 攻击        | fakeplayer.command.attack    |                         |
| /fp mine      | 挖掘        | fakeplayer.command.mine      |                         |
| /fp use       | 使用/交互/放置  | fakeplayer.command.use       |                         |
| /fp jump      | 跳跃        | fakeplayer.command.jump      |                         |
| /fp turn      | 转身        | fakeplayer.command.turn      |                         |
| /fp look      | 看向指定位置    | fakeplayer.command.look      |                         |
| /fp move      | 移动        | fakeplayer.command.mvoe      |                         |
| /fp ride      | 骑乘        | fakeplayer.command.ride      |                         |
| /fp sneak     | 潜行        | fakeplayer.command.sneak     |                         |
| /fp swap      | 交换主副手物品   | fakeplayer.command.swap      |                         |
| /fp hold      | 手持对应快捷栏物品 | fakeplayer.command.hold      |                         |
| /fp cmd       | 让假人执行命令   | fakeplayer.command.cmd       | 不给权限的情况下，允许执行配置文件里定义的命令 |

## **Spark性能分析工具**

指令文档[Command Usage | spark docs](https://spark.lucko.me/docs/Command-Usage)

## **方块查询**
https://docs.coreprotect.net/commands/