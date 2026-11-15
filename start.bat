@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   QYServer 一键启动
echo ========================================

where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 Node.js，请先安装 Node.js 18 或更高版本。
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [提示] 首次运行，正在安装依赖...
  call npm install
  if errorlevel 1 (
    echo [错误] 依赖安装失败。
    pause
    exit /b 1
  )
)

echo [启动] 正在启动服务器...
echo.
node server.js

echo.
echo [已停止] 服务器已退出。
pause
