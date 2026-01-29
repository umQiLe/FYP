@echo off
echo ==========================================
echo      Running PTT_AP2 Test Suite
echo ==========================================

echo.
echo [1/2] Running Backend Tests (Jest)...
cd ptt-backend
call npm test
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Backend tests failed!
    pause
    exit /b %ERRORLEVEL%
)
cd ..

echo.
echo [2/2] Running Frontend Tests (Vitest)...
cd ptt-frontend
call npm test
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend tests failed!
    pause
    exit /b %ERRORLEVEL%
)
cd ..

echo.
echo ==========================================
echo        ALL TESTS PASSED SUCCESSFULLY
echo ==========================================
pause
