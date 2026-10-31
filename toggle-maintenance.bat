@echo off
setlocal
echo ============================================================
echo  IEI STUDENT CHAPTER - SITE MODE SWITCHER
echo ============================================================
echo.
echo Choose an option:
echo   [1] Move site to MAINTENANCE Mode
echo   [2] Restore site to LIVE Mode
echo   [3] Check current mode status
echo.
set /p choice="Enter choice [1, 2, or 3]: "
if "%choice%"=="1" (
  node switch-mode.js --maintenance
) else if "%choice%"=="2" (
  node switch-mode.js --live
) else if "%choice%"=="3" (
  node switch-mode.js --status
) else (
  echo Invalid selection.
)
pause
