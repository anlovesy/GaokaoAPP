@echo off
setlocal
cd /d %~dp0

where node >nul 2>nul
if errorlevel 1 goto :missing_node

where npm.cmd >nul 2>nul
if errorlevel 1 goto :missing_npm

if not exist dist\index.html (
  echo.
  echo [GaokaoApp] dist\index.html was not found.
  echo [GaokaoApp] Run "npm.cmd run build" before starting the production server.
  echo.
  pause
  goto :end
)

echo [GaokaoApp] Starting production server...
npm.cmd start
goto :end

:missing_node
echo.
echo [GaokaoApp] Unable to start: Node.js is not installed or not added to PATH.
echo [GaokaoApp] Install Node.js 20+ first, then run this script again.
echo.
pause
goto :end

:missing_npm
echo.
echo [GaokaoApp] Unable to start: npm.cmd is not available in PATH.
echo [GaokaoApp] Reinstall Node.js or repair the PATH configuration, then try again.
echo.
pause

:end
endlocal
