@echo off
echo ==========================================
echo   News & Weather App - Local Launcher
echo ==========================================
echo.
echo [1/2] Building optimized app...
call npm run build
echo.
echo [2/2] Launching local server...
echo       Your browser should open automatically.
echo       Press Ctrl+C to stop the server.
echo.
call npm run preview
pause
