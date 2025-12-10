// Node.js s
// 依赖：express、mysql2、node-fetch、node-cron
// 安装：npm install express mysql2 node-fetch node-cron

const express = require('express');
const mysql = require('mysql2/promise');
const cron = require('node-cron');
const { statusBedrock } = require('minecraft-server-util');
async function checkServerStatus() {
  try {
    const result = await statusBedrock(serverHost, serverPort, { 
      timeout: 10000, // 增加超时时间
      enableSRV: true 
    });
    return { success: true, data: result };
  } catch (err) {
    console.error('服务器状态检查失败:', err.message);
    return { success: false, error: err.message };
  }
}

const app = express();
// 添加跨域支持
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});
const port = 3000;

// MySQL 配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '123456789',
  database: 'mc_status_db'
};

// 服务器信息
const serverHost = '103.40.14.14';
const serverPort = 41657;
const statusUrl = `http://localhost:${port}/api/status`;

// 然后你还需要修改定时任务和API路由来使用这个新函数：

// 定时任务：每2分钟记录一次状态
cron.schedule('*/2 * * * *', async () => {
  const statusResult = await checkServerStatus();
  
  try {
    const conn = await mysql.createConnection(dbConfig);
    if (statusResult.success) {
      await conn.execute(
        'INSERT INTO mc_status (time, online, max, status) VALUES (?, ?, ?, ?)',
        [new Date(), statusResult.data.players?.online || 0, statusResult.data.players?.max || 0, 1]
      );
      console.log('记录成功:', new Date());
    } else {
      await conn.execute(
        'INSERT INTO mc_status (time, online, max, status) VALUES (?, ?, ?, ?)',
        [new Date(), 0, 0, 0]
      );
      console.error('记录失败:', statusResult.error);
    }
    await conn.end();
  } catch (dbErr) {
    console.error('数据库操作失败:', dbErr);
  }
});

// 查询最近2小时记录
app.get('/api/history', async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      'SELECT time, online, status FROM mc_status WHERE time > DATE_SUB(NOW(), INTERVAL 2 HOUR) ORDER BY time DESC'
    );
    await conn.end();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: '数据库查询失败' });
  }
});

// 添加定时任务：每2分钟清除2小时前的记录
cron.schedule('*/2 * * * *', async () => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [result] = await conn.execute(
      'DELETE FROM mc_status WHERE time < DATE_SUB(NOW(), INTERVAL 2 HOUR)'
    );
    await conn.end();
    console.log('已清除2小时前的记录，删除行数:', result.affectedRows, '时间:', new Date());
  } catch (err) {
    console.error('清除记录失败:', err);
  }
});

// 启动服务
app.listen(port, () => {
  console.log(`MC状态服务已启动: http://localhost:${port}`);
});

// 实时获取基岩版服务器状态
app.get('/api/status', async (req, res) => {
  const statusResult = await checkServerStatus();
  
  if (statusResult.success) {
    res.json({
      online: true,
      players: {
        online: statusResult.data.players?.online || 0,
        max: statusResult.data.players?.max || 0
      },
      motd: statusResult.data.motd?.clean || 'Unknown',
      version: statusResult.data.version
    });
  } else {
    res.json({ 
      online: false,
      error: statusResult.error 
    });
  }
});