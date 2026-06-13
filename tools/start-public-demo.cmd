@echo off
setlocal
cd /d D:\agent\study\GaokaoApp

if not exist "tools\cloudflared.exe" (
  echo [ERROR] Missing tools\cloudflared.exe
  echo Please prepare Cloudflare Tunnel first.
  pause
  exit /b 1
)

if "%GAOKAO_DEMO_ADMIN_USERNAME%"=="" (
  set "GAOKAO_DEMO_ADMIN_USERNAME=LYYzhiyuan"
)

if "%GAOKAO_DEMO_ADMIN_PASSWORD%"=="" (
  set /p GAOKAO_DEMO_ADMIN_PASSWORD=Enter admin password for this demo, min 8 chars: 
)

if "%GAOKAO_DEMO_ADMIN_PASSWORD%"=="" (
  echo [ERROR] Admin password cannot be empty.
  pause
  exit /b 1
)

node tools\public-demo-launcher.js start
set EXIT_CODE=%ERRORLEVEL%
if not "%EXIT_CODE%"=="0" (
  pause
  exit /b %EXIT_CODE%
)

echo.
echo Press any key to close this window. Background services will keep running.
pause >nul
