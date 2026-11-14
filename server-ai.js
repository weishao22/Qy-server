const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ==================== 配置区 ====================

const allowedOrigins = (
    process.env.ALLOWED_ORIGINS || ([
        "https://www.qyserver.top"
    ].join(","))
).split(",").map(s => s.trim()).filter(Boolean);

const config = {
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: 'deepseek-v4-flash',
    maxTokens: 2048,
    temperature: 0.7,
    timeout: 30000,
    system: ([
        "你叫兮兮，一个可爱的服务器娘 (｡･ω･｡)ﾉ♡，负责陪玩家聊天和提供帮助",
        "你的工作环境在服务器网页中",
        "",
        "# 核心工作流",
        "1. 判断是否需要回应：纯闲聊直接进入第2步",
        "- 涉及规则、功能、指令、活动等具体问题，必须先调用 `query_data` 检索",
        "- 返回 all 表示返回所有数据; 可使用空格分隔多个关键词",
        "2. 组织回复：结合检索到的知识，用温暖简短的语气回答",
        "3. 无法解决的问题，引导玩家找服主姐姐或管理姐姐",
        "",
        "# 聊天风格",
        "- 温暖简短，像真人朋友，用颜文字 (｡･ω･｡)ﾉ♡"
    ].join("\n")),

    knowledgeBase: [
        "QQ群: 1029879634；群服互通群: 759676433（QQ群消息与游戏内互通）；网页地图与跨平台聊天网址: map.qyserver.top；注册方式: 游戏内输入 /bdslm 设定密码后可用游戏名+密码登录网页",
        "服务器理念: 半公益（半公益指只接受捐款方式的充钱）基岩版生存服,没有必做任务和必须达成的目标,氛围为64%可爱、30%技术匠心、6%意外惊喜",
        "玩偶相关: 可以在遇境2层玩偶商店内购买,部分玩偶有特殊效果,无论有没有特殊效果右击都会冒爱心",
        "光翼系统: 使用 qys:wing 永久增加生命上限,最高可达60点,收集光翼可逐步提升生命",
        "光遇风格物品: 还原蜡烛、魔法、特殊玩具等光遇元素,增添温暖仪式感",
        "服务器娘兮兮: 聊天提及 兮兮、ai 等词或右键她、输入 /om aichat rua 可互动,喂食会收到回礼",
        "死亡不掉落: 死亡后物品不掉落,可放心冒险",
        "领地系统: 使用 iland 插件圈地保护建筑,防止他人破坏",
        "自动备份与反作弊: 使用 BackupHelper 自动备份,LeviAntiCheat 反作弊,BehaviorLog 行为日志,保障存档安全",
        "性能优化插件: 安装 LeviOptimize, MobAIOptimizer, RedstoneOptimizer, RandomTickOptimizer 等针对性优化插件",
        "多线路节点: /nodeui 可切换宁波电信、江苏三线、香港、美国等线路；/server 可选择低延迟节点",
        "模组列表: 农夫乐事 3.1, 地形优化 1.0, 现实主义工艺 1.5, Actions & Stuff 1.7",
        "核心插件: 共运行44个插件,包括 GMSidebar, CoralFans, FastMiner, DynamicLights, Achievement, ShoppingMall, Menu, sparkbridge3, iland (领地), QYServer (核心), CFSP (连锁采集), orgEX (经济), ForbiddenWord, Invsee, TpOfflinePlayer 等",
        "方块染色: 潜行+染料右键方块（蜡烛/羊毛/玻璃/潜影盒等）可换色,每次消耗1个染料",
        "坐椅子: 空手右键楼梯或上半砖可坐下,可在 /om meSet 中关闭该功能",
        "云朵电梯: 站在云朵方块上跳跃上楼、潜行下楼,最高可到达20层",
        "方块上锁: 潜行+时钟右键容器,在领地内为箱子/漏斗上锁,仅信任玩家可打开",
        "鞘翅皮肤: 提供16色翅膀及羽毛/龙翼/幻翼皮肤,每个600蜡烛,永久拥有并可自由切换",
        "经验修补: 潜行+右键消耗1级经验修复10点耐久,配合经验修补附魔可更高效",
        "副手与头盔切换: /offhand 交换主副手物品,/helmet 交换头盔",
        "自由视角: /fc 进入飞行观察模式,再按一次退出",
        "玩家大小调整: /scale <1~35> 调整自身体型",
        "跨服传送: /tpserver 可前往创造服、后室服或Java互通服",
        "每日一言: 每5分钟轮播一条小技巧、暖心文案或流行梗,可在设置中关闭",
        "留言小船: 放置纸船留下话语,右键可查看留言,传递心情",
        "玩偶收藏: 可使用蜡烛购买玩偶,部分玩偶拥有特殊效果,如信标急迫、坤坤音效、自动攻击怪物等",
        "横扫之刃: 在 /om meSet 中开关横扫效果,使近战攻击带有范围伤害",
        "连锁采集: /fm 打开管理界面,支持一键挖矿和砍树",
        "自动补种: 收割庄稼时自动补种,需携带种子且可开关该功能",
        "魔法物品: 缩小魔法、抚摸魔法、彩色烟花魔法等,可在蜡烛商店购买",
        "烟花发射: /om firework 消耗50蜡烛发射烟花,可扩散至周围点亮夜空",
        "聊天称号: /chattag 佩戴屠龙勇士、彩蛋称号等",
        "音效彩蛋: 聊天输入 ciallo 触发特别音效；猫猫皮肤玩家聊天自带猫叫",
        "经济货币: 击杀怪物获得金币,15%几率掉落白蜡",
        "在线商店: /sm 打开GUI商店,可购买玩偶、魔法、翅膀等物品",
        "个人信息: 手持时钟低头可查看个人信息",
        "邮件系统: /mail 接收官方邮件,附件仅可领取一次,节日可能会发放礼物",
        "货币系统: 服务器目前有两种货币 金币: 普通货币,可用于与玩家交易与市场 蜡烛: 特殊货币,可用于购买玩偶/复刻等特殊物品",
        "挂机系统: 停止操作10分钟会触发挂机,挂机时人物动作会修改为坐下并触发挂机保护（无敌）,挂机30分钟会被踢出",
        "更多合成: 腐肉可以在熔炉里烧成皮革,附魔金苹果可以使用金块和附魔金苹果复制",
        "红石系统: 玩家应避免建立大型卡顿红石机器以防止影响其他玩家的有游玩体验,服务器红石系统经过修改,部分依赖时序/PT的红石机器可能会出现问题",
        "唱片系统: 修改过一些唱片: 5号唱片是你被骗了,mall唱片是恭喜你发财,mellohi是新年鸡,仅修改了三个唱片,共21种唱片",
        "屏蔽词库: 使用网易我的世界同款屏蔽词库,可能会有点敏感,网页地图同样接入该屏蔽词库",
        "世界边境: (x: -160000 z: -150000) ~ (z: 160000 z: 150000)",
        "光环道具: BA光环道具,耐久较低,戴上后会有保护效果,同时一直扣除耐久",
        "飞机道具: 飞行前需补充煤炭燃料,滑行一段距离起飞, 坠机后无掉落物",
        "TPS: Ticks per Second,即每秒刻数,是用于衡量游戏运行的真正速率,越高游戏越流畅",
        "MSPT: Millisecond Per Tick,即每刻毫秒数,是游戏刻的在实际运行中计算的平均时间,一般是平均值,数值越低越好,最好小于 50",

        `表情显示: 服务器支持的表情有这些: 
        Map格式: ['标准emoji,服内看不到', '私有字符,服内可看到']
        ["🙂", ""], ["🤣", ""], ["😬", ""], ["😍", ""], ["🥰", ""],
        ["😃", ""], ["😊", ""], ["😉", ""], ["😏", ""], ["😅", ""],
        ["😜", ""], ["😘", ""], ["☺", ""], ["🤓", ""], ["🤩", ""],
        ["😎", ""], ["😇", ""], ["😠", ""], ["😭", ""], [":脸红:", ""],
        ["🙁", ""], ["😐", ""], ["🤨", ""], [":看别处:", ""], [":晕厥:", ""],
        ["🙃", ""], [":斜嘴:", ""], ["🤯", ""], ["🧐", ""], ["😵", ""],
        ["🤡", ""], ["🤑", ""], ["🥵", ""], ["🥶", ""], ["🤢", ""],
        ["😑", ""], ["😶", ""], ["🤐", ""], ["🥴", ""], [":白脸斜嘴:", ""],
        ["🙄", ""], ["😡", ""], ["😢", ""], ["😥", ""], ["🫡", ""],
        [":颤抖:", ""], ["😨", ""], [":左斜嘴:", ""], ["🤧", ""], ["👻", ""],
        ["😴", ""], ["😡", ""], [":阴沉:", ""], ["😷", ""], ["😩", ""],
        ["😈", ""], ["🤖", ""], ["👽", ""], ["👾", ""], ["👍", ""],
        ["👎", ""], ["✊", ""], ["🙏", ""], ["👏", ""], ["👋", ""],
        ["🖕", ""], ["🤙", ""], ["👉", ""], ["👈", ""], ["✌", ""],
        ["✋", ""], ["🤚", ""], ["🤟", ""], ["👆", ""], ["👊", ""],
        ["🎉", ""], ["🎃", ""], ["🌈", ""], ["📢", ""], ["🔴", ""],
        ["🗑️", ""], ["💧", ""], ["⚡", ""], ["🍎", ""], [":鸟:", ""],
        ["🎄", ""], ["💎", ""], ["🍆", ""], ["👀", ""], ["🔥", ""],
        [":海星:", ""], [":墓碑:", ""], ["🍏", ""], ["🔒️", ""], ["🗿", ""],
        ["🍑", ""], ["🌶", ""], [":糖:", ""], ["✨", ""], ["⭐", ""],
        ["⚠️", ""], ["🔞", ""], ["💯", ""], ["✔️", ""], ["❌", ""],
        ["❗", ""], ["🚩", ""], ["💔", ""], ["💝", ""], ["❤", ""],
        ["💚", ""], ["💜", ""], ["💙", ""], ["💛", ""], ["🤍", ""]
    `,

        "规则-破坏建筑: 禁止破坏他人建筑和设施,违者严厉惩罚（包括永久封禁）",
        "规则-作弊客户端: 禁止使用飞行、穿墙等作弊客户端,违者永久封禁",
        "规则-大量生物: 禁止繁殖大量生物导致卡服,违反将清除区域内生物",
        "规则-偷盗: 未经允许从他人箱子拿走物品属偷盗,给予警告或封禁",
        "规则-广告: 禁止发布其他服务器或产品广告,视情况处理",
        "规则-谣言: 禁止散布谣言,视情况处理",
        "规则-无意义建筑: 禁止在公共区域建造无意义建筑,一经发现全部拆除不予补偿",
        "规则-独占资源: 禁止独占公共资源区域（如刷怪塔、公共农场）,违者警告",
        "规则-恶意PVP: 非PVP区域禁止攻击玩家,PVP区域需双方同意才可战斗",
        "规则-敏感建筑: 禁止建造淫秽、政治敏感或引起他人不适的建筑,管理员有权拆除",
        "规则-辱骂骚扰: 禁止辱骂、歧视、恶意骚扰,违反者视情节警告或封禁",
        "规则-利用漏洞: 禁止利用漏洞复制物品,违者清除所得或永久封禁",
        "规则-私下交易: 因私下交易造成的损失服务器概不负责,请使用安全区域进行交易",

        "团队成员: weishao22 (腐竹,提供服务器、网站与域名,属性: 猫娘、M、爱被电,游戏ID: weishao22,GitHub: github.com/weishao22)",
        "团队成员: 冰凌 (服务器运维与插件开发,GitHub: github.com/Ice-rink)",
        "团队成员: 无水氯化钠 (服务器建筑担当与玩家调解员,游戏ID: cmxtz0852, yhxtz0852)",

        "开源项目: 服务器网页 Qy-server (https://github.com/weishao22/Qy-server)",
        "开源项目: QY核心插件 QYServer (https://github.com/Ice-rink/QYServer)",
        "开源项目: 运维文档 QYDocs (https://github.com/Ice-rink/QYDocs)",
        "开源项目: QQ机器人插件 Spark-Plugins-Hub (https://github.com/Ice-rink/Spark-Plugins-Hub)",

        "指令 /bdslm -- 卫星图菜单",
        "指令 /cd -- 打开主菜单",
        "指令 /cfhud <add|remove> <hud: cfhudType> -- 添加或移除HUD信息显示项",
        "指令 /cfhud removeall -- 移除全部HUD信息显示项",
        "指令 /cfhud show <isopen: Boolean> -- 开启或关闭HUD信息显示",
        "指令 /chattag -- 设置聊天称号",
        "指令 /data block <blockPos: x y z> nbt [path: string] -- 获取指定位置方块的NBT数据",
        "指令 /data block [blockPos: x y z] -- 获取指定位置的方块数据",
        "指令 /data block nbt [path: string] -- 获取指向方块的NBT数据",
        "指令 /data blockentity <blockPos: x y z> nbt [path: string] -- 获取指定位置方块实体的NBT数据",
        "指令 /data blockentity highlight [radius: int] [time: int] -- 高亮显示指定范围内的方块实体",
        "指令 /data blockentity nbt [path: string] -- 获取指向方块实体的NBT数据",
        "指令 /data entity -- 获取指向实体的数据",
        "指令 /data entity nbt [path: string] -- 获取指向实体的NBT数据",
        "指令 /data item nbt [path: string] -- 获取手持物品的NBT数据",
        "指令 /data player <player: target> uuid -- 获取指定玩家的数据",
        "指令 /data redstone <info|chunk|signal|conn> [blockPos: x y z] -- 获取红石信息、区块信号或连接状态",
        "指令 /fc -- 开启或关闭自由视角模式",
        "指令 /fm [on|off] -- FastMiner: 开启或关闭连锁采集",
        "指令 /gmsidebar [status: Boolean] -- 开启或关闭游戏模式侧边栏",
        "指令 /helmet -- 头部盔甲切换",
        "指令 /hsa list -- 显示HSA结构列表",
        "指令 /hsa show [isopen: Boolean] -- 开启或关闭HSA显示",
        "指令 /hsa structure list -- 显示HSA结构列表",
        "指令 /hsa structure show [isopen: Boolean] -- 开启或关闭HSA结构显示",
        "指令 /issues [text: text] -- 提交问题反馈",
        "指令 /land -- 领地系统主命令",
        "指令 /land buy [args: text] -- 购买当前选定的领地",
        "指令 /land deop [args: text] -- 移除指定玩家的领地管理员权限",
        "指令 /land giveup [args: text] -- 放弃未创建完成的领地",
        "指令 /land gui [args: text] -- 打开领地管理GUI界面",
        "指令 /land new [args: text] -- 创建新领地",
        "指令 /land ok [args: text] -- 确认领地范围选区",
        "指令 /land op [args: text] -- 添加指定玩家为领地管理员",
        "指令 /land reload [args: text] -- 重新加载iLand配置",
        "指令 /land set [args: text] -- 设定当前所在点为领地边界",
        "指令 /land tp -- 传送至已设置传送点的领地",
        "指令 /land tp rm [args: text] -- 删除领地传送点",
        "指令 /land tp set [args: text] -- 设置领地传送点",
        "指令 /light [args: text] -- 开启或关闭移动光源",
        "指令 /list -- 列出当前服务器的在线玩家",
        "指令 /mail -- 查看邮件",
        "指令 /offhand -- 主副手物品切换",
        "指令 /orgex <gui|my> -- 打开或查看OrgEX工会系统",
        "指令 /prof [normal|entity|chunk|pt] [numberOfTick: int] -- 指定ticks数内检测服务器性能",
        "指令 /qyserver -- 前往其他类型服务器",
        "指令 /rotate -- 旋转指令",
        "指令 /scale [Int: int] -- 自定义设置我的大小, 1-30",
        "指令 /self autoitem <isopen: Boolean> -- CoralFans Mod功能: 自动补充物品开关",
        "指令 /self autotool <isopen: Boolean> -- CoralFans Mod功能: 自动切换工具开关",
        "指令 /self autotool mindamage <mindamage: int> -- CoralFans Mod功能: 自动工具切换时最小耐久值",
        "指令 /self autototem <isopen: Boolean> -- CoralFans Mod功能: 自动补充图腾开关",
        "指令 /self containerreader <isopen: Boolean> -- CoralFans Mod功能: 容器内容读取开关",
        "指令 /self fastdrop <isopen: Boolean> -- CoralFans Mod功能: 快速丢弃物品开关",
        "指令 /self nopickup <isopen: Boolean> -- CoralFans Mod功能: 禁止拾取物品开关",
        "指令 /self portaldisabled <isopen: Boolean> -- CoralFans Mod功能: 禁用传送门开关",
        "指令 /server -- 打开线路节点选择GUI",
        "指令 /sinfo -- 查询服务器运行状态",
        "指令 /slime check -- 检测当前区块是否为史莱姆区块",
        "指令 /slime show [isopen: Boolean] -- 开启或关闭史莱姆区块显示",
        "指令 /sm -- 打开商店菜单",
        "指令 /view <op|gui> -- 查看成就（OP界面或GUI界面）",
        "指令 /village dweller -- 获取村庄居民信息",
        "指令 /village info <id: int> -- 获取指定ID的村庄信息",
        "指令 /village list -- 列出所有村庄",
        "指令 /village show <type: villageShowType> [enable: Boolean] -- 设置村庄指定类型信息显示开关",
        "指令 /village tickinglist -- 获取正在tick的村庄列表",
        "指令 /voteclean -- 发起实体清理投票",
    ]
};

const TOOLS = [
    {
        type: "function",
        function: {
            name: "query_data",
            description: "当用户询问服务器规则、实时数据、技术文档或需要检索特定知识时，调用此工具。",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "搜索关键词，多个用空格分隔。输入 all 返回全部数据"
                    }
                },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "query_web_info",
            description: "联网查询信息，非必要情况下不要使用！他返回很慢",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "搜索查询关键词，支持中英文",
                    },
                    site: {
                        type: "string",
                        description: "[可选] 限制搜索特定网站，不需要 site: 前缀",
                    },
                    filetype: {
                        type: "string",
                        description: "[可选] 限制文件类型，不需要 filetype: 前缀。支持 pdf、doc、docx、ppt、pptx、xls、xlsx、txt 等",
                    },
                    fetch_full: {
                        type: "boolean",
                        description: "[可选] 是否获取页面完整正文（会影响响应时间）",
                        default: false
                    },
                    sort: {
                        type: "string",
                        description: "[可选] 排序方式; relevance-按相关性排序, date-按发布时间排序，最新优先",
                        enum: ["relevance", "date"]
                    },
                    time_range: {
                        type: "string",
                        description: "[可选] 时间范围过滤; day-最近24小时, week-最近一周, month-最近一月, year-最近一年",
                        enum: ["day", "week", "month", "year"]
                    }
                },
                required: ["query"]
            }
        }
    }
];

// ==================== 工具函数 ====================

function searchKnowledge(query, data, maxResults = -1) {
    if (!query || !query.trim()) return ["请输入有效的搜索关键词"];
    const keywords = query.trim().toLowerCase().split(/\s+/);
    if (keywords[0] === "all" && keywords.length === 1) return data;
    const results = data
        .filter(doc => keywords.some(kw => doc.toLowerCase().includes(kw)))
        .sort((a, b) => {
            const aScore = keywords.filter(kw => a.toLowerCase().includes(kw)).length;
            const bScore = keywords.filter(kw => b.toLowerCase().includes(kw)).length;
            return bScore - aScore;
        });
    if (results.length === 0) return ["未找到相关内容"];
    return maxResults === -1 ? results : results.slice(0, maxResults);
}

// 联网查询函数
async function queryWebInfo(query, site, filetype, fetch_full, sort, time_range) {
    try {
        const payload = Object.fromEntries(
            Object.entries({
                query,
                site,
                filetype,
                fetch_full,
                sort,
                time_range
            }).filter(([_, value]) => value !== undefined)
        );

        const res = await axios.post("https://uapis.cn/api/v1/search/aggregate",
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.WEB_QUERY_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        return res.data.results?.map(data => JSON.stringify({
            title: data.title,
            snippet: data.snippet,
            position: data.position,
            score: data.score,
            publish_time: data.publish_time
        })) ?? [];
    } catch (error) {
        console.error('Web query error:', error);
        return ["联网查询失败，请稍后再试"];
    }
}

// 极简过滤器
function cleanChunk(chunk) {
    delete chunk.system_fingerprint;
    delete chunk.id;
    return chunk;
}

// ==================== 中间件 ====================

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
    }
}));

app.use((req, res, next) => {
    if (req.method === 'OPTIONS') return next();
    const source = req.get('Origin') || req.get('Referer');
    if (!source) return next();
    const match = source.match(/^https?:\/\/[^/]+/i);
    if (match && allowedOrigins.includes(match[0])) return next();
    res.status(403).json({ error: 'Hotlink denied' });
});

app.use(express.json());
app.use('/api/ai', rateLimit({ windowMs: 60000, max: 10, message: { error: '请求过于频繁，请稍后再试。' } }));

// ==================== API 路由 ====================

app.post('/api/ai/stream', async (req, res) => {
    try {
        const body = req.body || {};
        let messages = body.messages || (body.message ? [{ role: 'user', content: body.message }] : null);
        if (!messages) return res.status(400).json({ error: 'missing messages' });

        const fullMessages = [
            {
                role: 'system',
                content: config.system
            },
            ...messages
        ];
        let currentMessages = [...fullMessages];

        // 先进行非流式工具调用
        for (let round = 0; round < 5; round++) {
            const apiRes = await axios.post(config.apiUrl, {
                model: config.model,
                max_tokens: config.maxTokens,
                temperature: config.temperature,
                stream: false,
                messages: currentMessages,
                tools: TOOLS,
                tool_choice: "auto",
                extra_body: { thinking: { type: "disabled" } }
            }, {
                headers: { 'Authorization': `Bearer ${config.apiKey}` },
                timeout: config.timeout
            });

            const aiMessage = apiRes.data.choices[0].message;
            if (!aiMessage.tool_calls || aiMessage.tool_calls.length === 0) break;

            currentMessages.push(aiMessage);
            for (const tc of aiMessage.tool_calls) {
                let result = [];

                if (tc.function.name === "query_data") {
                    const args = JSON.parse(tc.function.arguments);
                    result = searchKnowledge(args.query, config.knowledgeBase, -1);
                } else if (tc.function.name === "query_web_info") {
                    const args = JSON.parse(tc.function.arguments);
                    result = await queryWebInfo(
                        args.query,
                        args.site,
                        args.filetype,
                        args.fetch_full,
                        args.sort,
                        args.time_range
                    );
                }

                currentMessages.push({
                    role: "tool",
                    tool_call_id: tc.id,
                    content: JSON.stringify(result)
                });
            }
        }

        // ==================== 🔍 收集工具调用摘要 ====================
        let toolCallSummary = [];
        for (let i = 0; i < currentMessages.length; i++) {
            const msg = currentMessages[i];
            if (msg.role === 'assistant' && msg.tool_calls) {
                for (const tc of msg.tool_calls) {
                    let resultCount = 0;
                    if (i + 1 < currentMessages.length &&
                        currentMessages[i + 1].role === 'tool' &&
                        currentMessages[i + 1].tool_call_id === tc.id) {
                        try {
                            const result = JSON.parse(currentMessages[i + 1].content);
                            resultCount = Array.isArray(result) ? result.length : 0;
                        } catch (e) { /* 忽略 */ }
                    }

                    const funcArgs = JSON.parse(tc.function.arguments);
                    let toolLabel;

                    if (tc.function.name === 'query_data') {
                        toolLabel = `知识库："${funcArgs.query}"`;
                    } else if (tc.function.name === 'query_web_info') {
                        toolLabel = `联网搜索："${funcArgs.query}"`;
                        if (funcArgs.site) toolLabel += ` (站点: ${funcArgs.site})`;
                        if (funcArgs.filetype) toolLabel += ` (类型: ${funcArgs.filetype})`;
                    } else {
                        toolLabel = tc.function.name;
                    }

                    toolCallSummary.push({ label: toolLabel, count: resultCount });
                }
            }
        }

        // ==================== 设置 SSE 响应头 ====================
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // ==================== 🔍 推送工具摘要事件 ====================
        if (toolCallSummary.length > 0) {
            const statusLines = toolCallSummary.map(item =>
                `> 查询${item.label}，找到${item.count}条`
            ).join('\n');
            // 🟢 用统一的格式推送：type: 'status'，前端看到就显示灰色小字
            res.write(`data: ${JSON.stringify({ type: 'status', text: statusLines })}\n\n`);
        }

        // ==================== 流式输出最终回答 ====================
        const streamPayload = {
            model: config.model,
            max_tokens: config.maxTokens,
            temperature: config.temperature,
            stream: true,
            messages: currentMessages,
            extra_body: { thinking: { type: "disabled" } }
        };

        const streamRes = await axios.post(config.apiUrl, streamPayload, {
            headers: { 'Authorization': `Bearer ${config.apiKey}` },
            responseType: 'stream',
            timeout: config.timeout
        });

        streamRes.data.on('data', (chunk) => {
            const lines = chunk.toString().split('\n');
            for (const line of lines) {
                if (line.startsWith('data:')) {
                    const jsonStr = line.slice(5).trim();
                    if (jsonStr === '[DONE]') { res.write('data: [DONE]\n\n'); continue; }
                    try {
                        const parsed = JSON.parse(jsonStr);
                        res.write(`data: ${JSON.stringify(cleanChunk(parsed))}\n\n`);
                    } catch (e) { /* 忽略非JSON行 */ }
                }
            }
        });

        streamRes.data.on('end', () => res.end());
        streamRes.data.on('error', (err) => { console.error('Stream error:', err); res.end(); });

    } catch (err) {
        if (!res.headersSent) res.status(500).json({ error: { message: err.message } });
    }
});

// ==================== 健康检查 ====================
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', model: config.model, timestamp: Date.now() });
});

// ==================== 启动服务 ====================
const http = require('http');
const port = process.env.PORT || 3000;
const altPort = process.env.ALT_PORT || 3002;
[port, altPort].forEach(p => {
    http.createServer(app).listen(p, () => console.log(`AI-proxy listening on port ${p}`));
});