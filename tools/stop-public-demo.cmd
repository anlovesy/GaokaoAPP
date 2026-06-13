@echo off
setlocal
cd /d D:\agent\study\GaokaoApp

node tools\public-demo-launcher.js stop
set EXIT_CODE=%ERRORLEVEL%
if not "%EXIT_CODE%"=="0" (
  pause
  exit /b %EXIT_CODE%
)

echo.
echo Press any key to close this window.
pause >nul
