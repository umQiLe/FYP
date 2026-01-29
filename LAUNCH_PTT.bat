@echo off
SETLOCAL EnableDelayedExpansion

TITLE PTT Application Launcher
COLOR 0A

REM --- CONFIGURATION ---
SET "NODE_BIN=bin\node.exe"
SET "BACKEND_DIR=ptt-backend"

REM --- 1. Check for Portable Node ---
IF EXIST "%~dp0%NODE_BIN%" (
    ECHO [INFO] Portable Node environment detected.
    SET "PATH=%~dp0bin;%PATH%"
) ELSE (
    ECHO [INFO] Portable Node not found. Using system Node.js...
    where node >nul 2>nul
    IF %ERRORLEVEL% NEQ 0 (
        COLOR 0C
        ECHO [ERROR] Node.js is NOT installed and 'bin\node.exe' is missing.
        ECHO.
        ECHO To run in Portable Mode:
        ECHO 1. Download node.exe (Windows Binary)
        ECHO 2. Download mkcert.exe
        ECHO 3. Put BOTH inside the 'bin' folder
        ECHO.
        PAUSE
        EXIT /B 1
    )
)

REM --- 2. Launch Backend ---
CD /D "%~dp0%BACKEND_DIR%"

ECHO.
ECHO [START] Launching PTT Server...
ECHO.

CMD /C "node serve_prod.js"

IF %ERRORLEVEL% NEQ 0 (
    COLOR 0C
    ECHO.
    ECHO [ERROR] Server crashed or failed to start.
    PAUSE
)
