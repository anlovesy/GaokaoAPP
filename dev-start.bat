@echo off
setlocal
cd /d %~dp0

where node >nul 2>nul
if errorlevel 1 goto :missing_node

where npm.cmd >nul 2>nul
if errorlevel 1 goto :missing_npm

echo [GaokaoApp] Starting development environment...
npm.cmd run dev
goto :end

:missing_node
echo.
echo [GaokaoApp] Unable to start: Node.js is not installed or not added to PATH.
echo [GaokaoApp] Install Node.js 20+ first, then run this script again.
echo [GaokaoApp] Quick checks:
echo   1. Open a new terminal after installation
echo   2. Run: node -v
echo   3. Run: npm -v
echo.
pause
goto :end

:missing_npm
echo.
echo [GaokaoApp] Unable to start: npm.cmd is not available in PATH.
echo [GaokaoApp] Reinstall Node.js or repair the PATH configuration, then try again.
echo [GaokaoApp] Quick checks:
echo   1. Run: where node
echo   2. Run: where npm
echo.
pause

:end
endlocal
