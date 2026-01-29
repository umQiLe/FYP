@echo off
TITLE PTT Production Deployment
COLOR 0A

echo ==========================================
echo      PTT PRODUCTION BUILD & DEPLOY
echo ==========================================
echo.

echo [1/3] Building Frontend...
cd ptt-frontend
call npm install
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend build failed!
    pause
    exit /b %ERRORLEVEL%
)
cd ..

echo.
echo [2/3] Preparing Backend...
cd ptt-backend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Backend install failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] Launching Production Server...
echo.
call node serve_prod.js

pause
