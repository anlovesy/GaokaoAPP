@echo off
setlocal
cd /d D:\agent\study\GaokaoApp

if not exist "tools\cloudflared.exe" (
  echo [ERROR] 缺少 tools\cloudflared.exe
  echo 请先下载 Cloudflare Tunnel 工具，或者重新让 Codex 帮你准备一次。
  pause
  exit /b 1
)

if "%GAOKAO_DEMO_ADMIN_USERNAME%"=="" (
  set "GAOKAO_DEMO_ADMIN_USERNAME=LYYzhiyuan"
)

if "%GAOKAO_DEMO_ADMIN_PASSWORD%"=="" (
  set /p GAOKAO_DEMO_ADMIN_PASSWORD=请输入本次公网演示后台密码（至少 8 位）:
)

if "%GAOKAO_DEMO_ADMIN_PASSWORD%"=="" (
  echo [ERROR] 你没有输入后台密码，已取消启动。
  pause
  exit /b 1
)

echo 正在启动本地生产服务...
start "gaokao-app-demo" /min cmd /c "cd /d D:\agent\study\GaokaoApp && set PORT=3011 && set ADMIN_USERNAME=%GAOKAO_DEMO_ADMIN_USERNAME% && set ADMIN_PASSWORD=%GAOKAO_DEMO_ADMIN_PASSWORD% && npm.cmd start > tools\project-server-public.log 2>&1"

timeout /t 8 /nobreak >nul

echo 正在启动 Cloudflare 临时公网隧道...
start "gaokao-tunnel-demo" /min cmd /c "cd /d D:\agent\study\GaokaoApp && tools\cloudflared.exe tunnel --url http://127.0.0.1:3011 --logfile tools\cloudflared-public.log"

timeout /t 8 /nobreak >nul

echo.
echo 已尝试启动完成。
echo 本次演示后台账号：%GAOKAO_DEMO_ADMIN_USERNAME%
echo 你可以打开以下日志查看公网链接：
echo D:\agent\study\GaokaoApp\tools\cloudflared-public.log
echo.
echo 建议使用你自己的环境变量覆盖后台账号密码：
echo set GAOKAO_DEMO_ADMIN_USERNAME=你的账号
echo set GAOKAO_DEMO_ADMIN_PASSWORD=你的强密码
echo.
pause
