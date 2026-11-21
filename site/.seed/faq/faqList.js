// FAQ 问题列表数据
const problems = [
    {
        id: '001',
        title: 'MC账户丢失了怎么办？',
        tags: ['账号', '安全'],
        summary: '尝试使用绑定的邮箱找回密码，若邮箱无法访问，请联系管理员验证身份后重置账号。',
        file: '/Configs/faq/md/001.md'
    },
    {
        id: '002',
        title: '连不上服务器，一直显示"无法连接"',
        tags: ['连接', '故障排查'],
        summary: '检查服务器IP是否正确、确认是否在维护时段、排查防火墙或杀毒软件是否拦截连接。',
        file: '/Configs/faq/md/002.md'
    },
    {
        id: '003',
        title: '延迟很高/经常掉线怎么办？',
        tags: ['连接', '网络优化'],
        summary: '尝试切换有线/WiFi网络、关闭后台下载或视频流、使用游戏加速器降低延迟。',
        file: '/Configs/faq/md/003.md'
    },
    {
        id: '004',
        title: '我的东西丢了/被偷了能找回吗？',
        tags: ['游戏', '物品保护'],
        summary: '有领地保护的区域会自动记录日志，管理员可尝试回滚；没圈地的公共区域物品无法追回。',
        file: '/Configs/faq/md/004.md'
    },
    {
        id: '005',
        title: '怎么圈地保护自己的家？',
        tags: ['游戏', '领地'],
        summary: '手持木锄头选择两个对角点，输入/claim 即可创建领地，支持设置成员权限和传送点。',
        file: '/Configs/faq/md/005.md'
    },
    {
        id: '006',
        title: '别人拆我家怎么办？怎么举报？',
        tags: ['游戏', '举报'],
        summary: '立即截图并开启F3记录坐标，在QQ群@管理员或在论坛发帖附上证据和作案时间。',
        file: '/Configs/faq/md/006.md'
    },
    {
        id: '007',
        title: '进服需要装哪些模组/材质包？',
        tags: ['技术', '客户端'],
        summary: '本服为纯净服，无需额外模组；推荐材质包进服时会自动下载，也可手动安装低配优化模组。',
        file: '/Configs/faq/md/007.md'
    },
    {
        id: '008',
        title: 'Java/基岩版分别要用什么版本进入？',
        tags: ['技术', '跨平台'],
        summary: 'Java版需使用1.20.x版本，基岩版需保持最新正式版（无需退出Beta版）。',
        file: '/Configs/faq/md/008.md'
    },
    {
        id: '009',
        title: '游戏闪退/崩溃怎么解决？',
        tags: ['技术', '性能'],
        summary: '尝试更新显卡驱动、在启动器中分配4G以上内存、关闭光影或降低渲染距离。',
        file: '/Configs/faq/md/009.md'
    },
    {
        id: '010',
        title: '服务器有什么禁止行为？',
        tags: ['规则', '封禁'],
        summary: '严禁外挂、刷物品、恶意破坏、高频红石、刷屏辱骂，违者视情节警告或永久封禁。',
        file: '/Configs/faq/md/010.md'
    },
    {
        id: '011',
        title: '可以建红石机器/刷怪塔吗？',
        tags: ['规则', '红石'],
        summary: '允许建造，但高频红石必须加装关闭开关；大型刷怪塔需提前申请，避免造成服务器卡顿。',
        file: '/Configs/faq/md/011.md'
    },
    {
        id: '012',
        title: '互通服-操作文档',
        tags: ['互通服', '教程'],
        summary: '详细介绍Java版与基岩版互通服的基础操作、聊天互通、物品同步及常见问题。',
        file: '/Configs/faq/md/012.md'
    },
    {
        id: '013',
        title: '互通服-指令',
        tags: ['互通服', '指令'],
        summary: '列出互通服常用指令清单，包括跨平台私聊、玩家传送、数据查询等管理指令。',
        file: '/Configs/faq/md/013.md'
    },
    {
        id: '014',
        title: '如何获取并查看行为日志？',
        tags: ['日志', '排查'],
        summary: '在QQ群发送 /getlog 获取指定日期的 .csv 日志文件，并可用 Excel/WPS 或在线日志查看页面快速筛选和取证。',
        file: '/Configs/faq/md/014.md'
    }
];