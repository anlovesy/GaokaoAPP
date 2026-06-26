@echo off
setlocal
cd /d %~dp0
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\startup-doctor.ps1"
pause
endlocal
