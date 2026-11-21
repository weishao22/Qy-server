# 📦 服务器插件总列表

## 🛡️ 身份验证 / 皮肤系统

### **AuthMe Reloaded**

* 功能：离线模式登录验证、密码系统
* 官网：https://www.spigotmc.org/resources/authmereloaded.6269/

### **SkinsRestorer**

* 功能：离线玩家使用正版皮肤
* 官网：https://www.spigotmc.org/resources/skinsrestorer.2124/

## 🌉 基岩版支持（Geyser 系列）

### **Geyser-Spigot**

* 功能：基岩版玩家加入 Java 服务器
* 官网：https://geysermc.org/download/

### **Floodgate**

* 功能：基岩版免验证登录（与 Geyser 配套）
* 官网：https://geysermc.org/download/?project=floodgate

## 🔄 版本兼容（Via 系列）

### **ViaVersion**

* 功能：高版本客户端进入低版本服务器
* 官网：https://modrinth.com/plugin/viaversion/version/latest

### **ViaBackwards**

* 功能：低版本客户端进入高版本服务器
* 官网：https://modrinth.com/plugin/viabackwards

### **ViaRewind**

* 功能：支持更老版本客户端
* 官网：https://modrinth.com/plugin/viarewind/version/4.0.13

## 🏰 领地系统

### **Dominion**

* 功能：新一代领地系统，平替 Residence，支持 Folia
* 官网：https://www.minebbs.com/resources/dominion-res-folia.7933/

## 🎮 玩家动作 / 交互

### **GSit**

* 功能：坐下、躺下、爬行等动作
* 官网：https://hangar.papermc.io/Gecolay/GSit

## 💬 聊天与提示

### **JoinMessage**

* 功能：自定义进服提示、一言问候、整点报时
* 官网：https://www.minebbs.com/resources/joinmessage.12670/

## 🔧 工具类插件

### **SeeMore**

* 功能：根据服务器性能动态调整玩家渲染距离
* 官网：https://www.himcbbs.com/resources/seemore-folia.152/

### **EasyBackUp**

* 功能：自动备份世界与文件
* 官网：https://www.minebbs.com/resources/easybackup-spigot-bukkit.12791/

### **killme**

* 功能：简单自杀命令插件
* 官网：https://www.minebbs.com/resources/killme.10296/

### 实体优化

* 主要功能：​
* **专业实体AI优化**：针对不同实体类型（猪灵、村民、僵尸、骷髅等）实施专门的优化策略
* **高性能算法**：使用时间片轮转和散列算法，减少CPU密集型操作
* **配置化控制**：通过配置文件灵活控制不同类型实体的优化级别
* **命令接口**：提供/aioptimize和/aireload命令来控制插件
* **兼容性保证**：不影响原版游戏机制、生存/电力特性及实体功能
* 官网：[(9) 原创 - 开源 - 工具 - 实体优化 | MineBBS 我的世界中文论坛](https://www.minebbs.com/resources/14741/)

### Lswk —— 连锁挖矿

* 功能​:
* **连锁** - 支持模组工具
* **过滤** - 可使用/lswk gl打开挖矿过滤gui 根据gui中说明添加/取消过滤的方块(被过滤的方块挖掉后不会掉落)
* **操作** - 支持游戏内新增可连锁的方块（仅管理员可添加）
* **性能**- 可在配置文件中配置一次性连锁方块数量
* 官网[(9) 原创 - 工具 - Lswk —— 连锁挖矿｜一款简单而不简单的连锁采集插件 | MineBBS 我的世界中文论坛](https://www.minebbs.com/resources/lswk.11971/)

## 🧩 API / 变量系统

### **PlaceholderAPI**

* 功能：提供变量给其他插件使用
* 官网：https://www.spigotmc.org/resources/placeholderapi.6245/

## 🧭 玩家传送系统

### **PlayerWarps（玩家公共传送点）**

玩家可创建公共传送点
官网：https://www.minebbs.com/resources/folia-playerwarps-x-x.14928/

### **SimpleTpa（玩家互相传送）**

支持 `/tpa`、`/tpahere`、`/back` &#x20;
官网：https://www.minebbs.com/resources/simpletpa.5472/

## 🎤 简单语音通话

### **SimpleVoiceChat / 简单语音通话**

功能：玩家之间实时语音交流

## **Spark性能分析工具**

[火花 |SpigotMC - 高性能 Minecraft 软件](https://www.spigotmc.org/resources/spark.57242/)

指令文档[Command Usage | spark docs](https://spark.lucko.me/docs/Command-Usage)

## [**我的世界-假玩家**](https://github.com/tanyaofei/minecraft-fakeplayer)

[tanyaofei/minecraft-fakeplayer: A plugin for minecraft server to spawn fake players, inspired by Carpet Mod](https://github.com/tanyaofei/minecraft-fakeplayer)

## CommandAPI

[CommandAPI/CommandAPI: A Bukkit/Spigot API for the command UI introduced in Minecraft 1.13](https://github.com/CommandAPI/CommandAPI)

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

# 🛠️ 管理员命令总表

## AuthMe 管理命令

| 命令                              | 功能   |
| ------------------------------- | ---- |
| /authme reload                  | 重载配置 |
| /authme unregister \<玩家>        | 删除账号 |
| /authme setpassword \<玩家> \<密码> | 重设密码 |

## Dominion 管理命令

| 命令               | 功能     |
| ---------------- | ------ |
| /dominion admin  | 管理菜单   |
| /dominion reload | 重载配置   |
| /dominion bypass | 绕过领地限制 |

## GSit 管理命令

| 命令           | 功能   |
| ------------ | ---- |
| /gsit reload | 重载配置 |

## JoinMessage 管理命令

| 命令         | 功能   |
| ---------- | ---- |
| /jm reload | 重载配置 |

## EasyBackUp 管理命令

| 命令             | 功能   |
| -------------- | ---- |
| /backup now    | 立即备份 |
| /backup reload | 重载配置 |

## Lswk —— 连锁挖矿

### 命令列表​

| 指令           | 权限节点        | 描述                 |
| ------------ | ----------- | ------------------ |
| /lswk        | lswk.use    | 开/关连锁挖矿（默认玩家拥有）    |
| /lswk add    | lswk add    | 添加可连锁的方块(需op权限)    |
| /lswk remove | lswk.remove | 取消可连锁的方块(需op权限)    |
| /lswk list   | lswk.list   | 查看可连锁方块的列表(默认玩家拥有) |
| /lswk gl     | lswk.gl     | 打开方块过滤GUI(玩家默认拥有)  |
| /lswk reload | lswk.reload | 重新加载配置文件(需op权限)    |

## **Spark性能分析工具**

指令文档[Command Usage | spark docs](https://spark.lucko.me/docs/Command-Usage)

# 假人插件

### 命令​

| 命令            | 作用        | 权限                           | 备注                      |
| ------------- | --------- | ---------------------------- | ----------------------- |
| /fp spawn     | 召唤假人      | fakeplayer.command.spawn     |                         |
| /fp kill      | 杀死假人      | fakeplayer.command.kill      |                         |
| /fp killall   | 杀死服务器所有假人 | OP                           |                         |
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
| /fp reload    | 重载配置文件    | OP                           |                         |

# 🔗 插件依赖关系图（文字版）

Code

```
玩家登录系统：
AuthMe
 └─ SkinsRestorer（可选）

基岩版支持：
Geyser
 └─ Floodgate（免验证登录）

版本兼容：
ViaVersion
 ├─ ViaBackwards
 └─ ViaRewind

领地系统：
Dominion（独立）

动作系统：
GSit（独立）

聊天提示：
JoinMessage（独立）

性能优化：
SeeMore（独立）
线程优化插件（独立）

备份系统：
EasyBackUp（独立）

变量系统：
PlaceholderAPI（被其他插件调用）
```