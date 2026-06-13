@echo off
setlocal

echo 正在停止本地演示服务和 Cloudflare 隧道...
taskkill /FI "WINDOWTITLE eq gaokao-app-demo" /T /F >nul 2>nul
taskkill /FI "WINDOWTITLE eq gaokao-tunnel-demo" /T /F >nul 2>nul

echo 已执行停止命令。
echo 如果仍有残留进程，可手动关闭 cmd 窗口或在任务管理器结束相关进程。
pause
